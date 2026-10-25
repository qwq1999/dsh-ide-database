/**
 * One table's data in its own right Sidebar tab, IDEA style: a WHERE box, an
 * ORDER BY box, a result grid, and a pager under it.
 *
 * Double-clicking a table in the data tree opens this page with the table's
 * coordinates as navigation parameters. The first read opens the connection when
 * it is closed; a restored tab carries no parameters, so it reports that the
 * table has to be opened again instead of guessing.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import type { CellValue, ClientConnection, ColumnInfo, QueryResult, Row } from '../shared/types'
import { ApiError, api } from './api'
import { DataGrid, type CellMenuTarget } from './DataGrid'
import { formatCell, formatCount, formatMs } from './format'
import { DownloadIcon, FilterIcon, PlayIcon, RefreshIcon, TableIcon, TerminalIcon } from './icons'
import { downloadText, exportFilename, renderExport, toMarkdown, type ExportFormat } from './export'
import { openConsoleTab, readTableTabParams, type TableTabParams } from './tab-open'
import { copyText, columnValues, type ColumnMenuItem } from './colmenu'
import { cellCopyText, rowToTsv } from './cellmenu'
import { columnSignature, identityOrder, moveColumn, orderColumns, orderRows } from './columnOrder'
import { hideColumns, pruneHidden, readHidden, toggleHidden, writeHidden } from './columnhide'
import { collectRows } from './pagedrows'
import { nextOrderBy, parseOrderBy, quoteSortColumn } from './sorting'
import { cellWhere, composeWhere, insertStatement, pageClause, qualifiedName, selectColumnsSql, stripKeyword, tableSelectSql, type ColumnFilter, type ColumnFilters } from './tablesql'
import { usePopoverDismiss } from './popover'
import { Banner, EmptyState, Spinner, Tag } from './ui'
import { CellValueModal } from './CellValueModal'
import { cellValueView, type CellValueView } from './cellvalue'
import { tableDumpText } from './tabledump'

/** What the tab body receives: the framework's tab reader. */
export interface TableTabProps {
  useTabInfo?: () => { tab?: { navigation?: { params?: unknown } } } | undefined
}

interface Failure {
  message: string
  detail?: string
}

const PAGE_SIZES = [100, 200, 500, 1000, 2000, 5000]

const noTabInfo = (): undefined => undefined

function failureText(error: unknown): Failure {
  if (error instanceof ApiError) return { message: error.message, ...(error.detail ? { detail: error.detail } : {}) }
  return { message: error instanceof Error ? error.message : String(error) }
}

/**
 * A column filter: `like` is the text typed into the filter row, `eq` is an
 * exact value picked from a cell, `isnull` comes from clicking a NULL cell.
 */
async function runSql(id: string, sql: string, maxRows: number): Promise<QueryResult> {
  try {
    return await api.query({ id, sql, maxRows })
  } catch (error) {
    // A tab opened from a cold app has no bridge connection yet; open it once.
    if (error instanceof ApiError && error.code === 'not-connected') {
      await api.connect(id)
      return await api.query({ id, sql, maxRows })
    }
    throw error
  }
}

function PagerButton({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string
  title: string
  onClick: () => void
  disabled: boolean
}): ReactElement {
  return (
    <button type="button" className="dshdb-pager-btn" title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

function TableGrid({ params }: { params: TableTabParams }): ReactElement {
  const [connection, setConnection] = useState<ClientConnection | null>(null)
  const [columns, setColumns] = useState<ColumnInfo[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [elapsed, setElapsed] = useState<number | undefined>(undefined)
  const [sqlText, setSqlText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Failure | null>(null)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(500)
  const [pageDraft, setPageDraft] = useState('1')
  const [whereText, setWhereText] = useState('')
  const [orderText, setOrderText] = useState('')
  const [filters, setFilters] = useState<ColumnFilters>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [order, setOrder] = useState<number[] | null>(null)
  const [hiddenColumns, setHiddenColumns] = useState<string[] | null>(() => readHidden(`table:${params.schema}.${params.table}`))
  const [cellView, setCellView] = useState<CellValueView | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportNote, setExportNote] = useState('')
  const exportAnchor = useRef<HTMLSpanElement>(null)
  const closeExport = useCallback(() => setExportOpen(false), [])
  usePopoverDismiss(exportOpen, closeExport, exportAnchor)
  const applyRef = useRef<(next: { page?: number; size?: number; where?: string; orderBy?: string }, override?: ColumnFilters) => void>(() => undefined)

  // Column drag order is display-only; reset it when the result set changes shape.
  const signature = columnSignature(columns)
  useEffect(() => {
    setOrder(null)
    setHiddenColumns((current) => pruneHidden(current, columns))
  }, [signature, columns])
  useEffect(() => {
    writeHidden(`table:${params.schema}.${params.table}`, hiddenColumns)
  }, [hiddenColumns, params.schema, params.table])
  const displayColumns = useMemo(() => orderColumns(columns, order), [columns, order])
  const displayRows = useMemo(() => orderRows(rows, order), [rows, order])
  // Hiding only narrows what the grid renders; positions map back for drag order.
  const hiddenView = useMemo(() => hideColumns(displayColumns, displayRows, hiddenColumns), [displayColumns, displayRows, hiddenColumns])
  const shownColumns = hiddenView.columns
  const shownRows = hiddenView.rows
  const hiddenCount = displayColumns.length - shownColumns.length

  const load = useCallback(
    async (found: ClientConnection, target: { page: number; size: number; where: string; orderBy: string; recount: boolean }): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        const dialect = found.dialect
        const from = qualifiedName(dialect, params.schema, params.table)
        const where = stripKeyword(target.where, 'WHERE')
        const orderBy = stripKeyword(target.orderBy, 'ORDER\\s+BY')
        const whereSql = where === '' ? '' : ` WHERE ${where}`
        const orderSql = orderBy === '' ? '' : ` ORDER BY ${orderBy}`
        const offset = target.page * target.size
        const pageSql = `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, target.size, offset)}`
        // The total is only a pager label, so it runs alongside the page instead of after it.
        const countPromise = target.recount
          ? runSql(params.connectionId, `SELECT COUNT(*) FROM ${from}${whereSql}`, 1).then(
              (counted) => {
                const first = counted.rows[0]?.[0]
                const value = typeof first === 'number' ? first : Number(first)
                return Number.isFinite(value) ? value : undefined
              },
              () => undefined,
            )
          : undefined
        const result = await runSql(params.connectionId, pageSql, target.size)
        setColumns(result.columns)
        setRows(result.rows)
        setElapsed(result.elapsedMs)
        setSqlText(result.sql === '' ? pageSql : result.sql)
        setPage(target.page)
        if (countPromise !== undefined) {
          // Already running alongside the page query; a failed count just hides the total.
          setTotal(await countPromise)
        }
      } catch (caught) {
        setError(failureText(caught))
      } finally {
        setLoading(false)
      }
    },
    [params.connectionId, params.schema, params.table],
  )

  useEffect(() => {
    let cancelled = false
    setConnection(null)
    setRows([])
    setColumns([])
    setTotal(undefined)
    setPage(0)
    setWhereText('')
    setOrderText('')
    setError(null)
    void (async () => {
      try {
        const status = await api.status()
        const found = status.config.connections.find((item) => item.id === params.connectionId)
        if (found === undefined) throw new ApiError('not-found', '该数据源已不存在，请重新连接后再打开数据表')
        if (found.dialect === 'redis') throw new ApiError('unsupported', '数据表只能在关系型数据源中打开')
        if (cancelled) return
        setConnection(found)
        await load(found, { page: 0, size: 500, where: '', orderBy: '', recount: true })
      } catch (caught) {
        if (!cancelled) setError(failureText(caught))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [load, params.connectionId])

  const offset = page * pageSize
  const activeSort = useMemo(() => parseOrderBy(stripKeyword(orderText, 'ORDER\\s+BY')), [orderText])

  const apply = useCallback(
    (next: { page?: number; size?: number; where?: string; orderBy?: string }, override?: ColumnFilters): void => {
      if (connection === null) return
      const manualWhere = next.where ?? whereText
      void load(connection, {
        page: next.page ?? page,
        size: next.size ?? pageSize,
        where: composeWhere(connection.dialect, manualWhere, columns, override ?? filters),
        orderBy: next.orderBy ?? orderText,
        recount: next.where !== undefined || next.size !== undefined || next.page === 0,
      })
    },
    [columns, connection, filters, load, orderText, page, pageSize, whereText],
  )
  applyRef.current = apply
  const orderTextRef = useRef(orderText)
  orderTextRef.current = orderText

  // Stable grid callbacks: typing into the WHERE / ORDER BY boxes must not
  // repaint the whole result grid on every keystroke.
  const sortTable = useCallback(
    (column: ColumnInfo): void => {
      const dialect = connection?.dialect ?? 'mysql'
      const next = nextOrderBy(stripKeyword(orderTextRef.current, 'ORDER\\s+BY'), column.name, quoteSortColumn(dialect, column.name))
      setOrderText(next)
      applyRef.current({ orderBy: next, page: 0 })
    },
    [connection?.dialect],
  )
  const sortBy = useCallback(
    (column: ColumnInfo, direction: 'asc' | 'desc'): void => {
      const dialect = connection?.dialect ?? 'mysql'
      const next = `${quoteSortColumn(dialect, column.name)} ${direction.toUpperCase()}`
      setOrderText(next)
      applyRef.current({ orderBy: next, page: 0 })
    },
    [connection?.dialect],
  )
  const clearSort = useCallback((): void => {
    setOrderText('')
    applyRef.current({ orderBy: '', page: 0 })
  }, [])
  const columnMenu = useCallback(
    (column: ColumnInfo): ColumnMenuItem[] => {
      const active = activeSort?.column === column.name ? activeSort.direction : null
      const index = columns.findIndex((item) => item.name === column.name)
      return [
        { label: '按此列升序', disabled: active === 'asc', run: () => sortBy(column, 'asc') },
        { label: '按此列降序', disabled: active === 'desc', run: () => sortBy(column, 'desc') },
        { label: '清除排序', disabled: activeSort === undefined, run: clearSort },
        { label: `复制列名「${column.name}」`, run: () => void copyText(column.name) },
        {
          label: `复制本列值（${rows.length} 行）`,
          disabled: rows.length === 0 || index < 0,
          run: () => void copyText(columnValues(rows, index)),
        },
        {
          label: `复制查询语句（${displayColumns.length} 列）`,
          disabled: displayColumns.length === 0,
          run: () => void copyText(selectColumnsSql(connection?.dialect ?? 'mysql', params.schema, params.table, displayColumns)),
        },
        {
          label: `隐藏列「${column.name}」`,
          disabled: shownColumns.length <= 1,
          run: () => setHiddenColumns((current) => toggleHidden(current, column.name)),
        },
        {
          label: hiddenCount === 0 ? '显示全部列' : `显示全部列（已隐藏 ${hiddenCount} 列）`,
          disabled: hiddenCount === 0,
          run: () => setHiddenColumns(null),
        },
      ]
    },
    [activeSort, clearSort, columns, displayColumns, hiddenCount, rows, shownColumns.length, sortBy],
  )
  const gridReorder = useCallback(
    (from: number, to: number): void => {
      const positions = hiddenView.positions
      const source = positions[from] ?? from
      const target = positions[to] ?? to
      setOrder((current) => moveColumn(current ?? identityOrder(displayColumns.length), source, target))
    },
    [displayColumns.length, hiddenView.positions],
  )
  const gridCellOpen = useCallback((column: ColumnInfo, value: CellValue): void => {
    setCellView(cellValueView(column.name, value))
  }, [])
  const gridCellClass = useCallback(
    (): string | undefined => (filtersOpen ? 'dshdb-cell-filterable' : undefined),
    [filtersOpen],
  )
  const gridCellMenu = useCallback(
    (cell: CellMenuTarget): ColumnMenuItem[] => [
            {
              label: '查看完整值',
              run: () => setCellView(cellValueView(cell.column.name, cell.value)),
            },
            {
              label: '复制单元格值',
              run: () => void copyText(cellCopyText(cell.value)),
            },
            {
              label: `复制整行（${displayColumns.length} 列，制表符分隔）`,
              run: () => void copyText(rowToTsv(displayColumns, cell.row)),
            },
            {
              label: '复制 INSERT 语句',
              run: () => {
                if (connection === null) return
                void copyText(insertStatement(connection.dialect, params.schema, params.table, displayColumns, cell.row))
              },
            },
            {
              label: '在控制台按该值查询',
              run: () => {
                if (connection === null) return
                const where = cellWhere(connection.dialect, cell.column, cell.value)
                openConsoleTab({
                  connectionId: params.connectionId,
                  sql: tableSelectSql(connection.dialect, params.schema, params.table, where, '', pageSize),
                })
              },
            },
            {
              label: '按此值筛选',
              run: () => {
                setFiltersOpen(true)
                setColumnFilter(
                  cell.column,
                  cell.value === null ? { text: '', op: 'isnull' } : { text: formatCell(cell.value), op: 'eq' },
                )
              },
            },
            {
              label: `取消「${cell.column.name}」列的筛选`,
              disabled: filters[cell.column.name] === undefined,
              run: () => {
                setColumnFilter(cell.column, undefined)
                apply({ page: 0 })
              },
            },],
    [connection, displayColumns, displayRows, filters, pageSize, params.schema, params.table],
  )
  const hasPrevious = page > 0
  const lastPage = total === undefined ? undefined : Math.max(Math.ceil(total / pageSize) - 1, 0)
  useEffect(() => {
    setPageDraft(String(page + 1))
  }, [page])
  const jumpToPage = useCallback((): void => {
    const wanted = Number.parseInt(pageDraft, 10)
    const target = Number.isFinite(wanted) && wanted >= 1 ? wanted - 1 : page
    const bounded = lastPage === undefined ? target : Math.min(target, lastPage)
    if (bounded === page) {
      setPageDraft(String(page + 1))
      return
    }
    apply({ page: bounded })
  }, [apply, lastPage, page, pageDraft])
  const hasNext = lastPage === undefined ? rows.length >= pageSize : page < lastPage
  const rangeStart = rows.length === 0 ? 0 : offset + 1
  const rangeEnd = offset + rows.length
  const totalText = total !== undefined ? `/${formatCount(total)}` : hasNext ? `/${formatCount(offset + pageSize)}+` : ''

  // Typing in a column filter re-queries on a short delay so each keystroke does
  // not hit the server. Emptying the last filter re-queries at once, otherwise
  // the grid would keep showing the narrowed rows.
  //
  // `columns` is deliberately read through a ref: every successful query stores
  // a fresh columns array, so depending on it here made the effect re-run after
  // each load and schedule the next query forever (a filter would poll).
  const columnsRef = useRef<ColumnInfo[]>([])
  columnsRef.current = columns
  const previousActive = useRef(0)
  useEffect(() => {
    if (!filtersOpen || connection === null) return
    const active = columnsRef.current.filter((column) => filters[column.name] !== undefined).length
    const hadFilters = previousActive.current > 0
    previousActive.current = active
    if (active === 0) {
      if (hadFilters) applyRef.current({ page: 0 }, {})
      return
    }
    const timer = setTimeout(() => applyRef.current({ page: 0 }), 400)
    return () => clearTimeout(timer)
  }, [filters, filtersOpen, connection])

  const activeFilterCount = columns.filter((column) => filters[column.name] !== undefined).length
  const setColumnFilter = (column: ColumnInfo, filter: ColumnFilter | undefined): void => {
    setFilters((previous) => {
      const next: ColumnFilters = { ...previous }
      if (filter === undefined) delete next[column.name]
      else next[column.name] = filter
      return next
    })
  }
  const clearFilters = (): void => {
    setFilters({})
    previousActive.current = 0
    applyRef.current({ page: 0, where: whereText }, {})
  }

  /**
   * Export what the grid currently shows ("page") or page through the whole
   * filtered result set, capped so a huge table cannot freeze the browser.
   */
  const EXPORT_LIMIT = 50000
  /** Read every row of the current filtered result, capped like the exports. */
  const collectAllRows = async (label: string): Promise<{ columns: ColumnInfo[]; rows: Row[] }> => {
    if (connection === null) return { columns: displayColumns, rows: [] }
    const dialect = connection.dialect
    const from = qualifiedName(dialect, params.schema, params.table)
    const where = composeWhere(dialect, whereText, columns, filters)
    const whereSql = where === '' ? '' : ` WHERE ${where}`
    const orderBy = stripKeyword(orderText, 'ORDER\s+BY')
    const orderSql = orderBy === '' ? '' : ` ORDER BY ${orderBy}`
    const batch = 2000
    let seeded = false
    let collectedColumns = displayColumns
    const collected = await collectRows({
      limit: EXPORT_LIMIT,
      batch,
      onProgress: (count) => setExportNote(`${label} 正在取 ${formatCount(count)} 行…`),
      fetch: async ({ offset }) => {
        const sql = `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, batch, offset)}`
        const result = await runSql(params.connectionId, sql, batch)
        if (!seeded) {
          collectedColumns = result.columns
          seeded = true
        }
        return result.rows
      },
    })
    return { columns: collectedColumns, rows: collected }
  }

  const exportRows = async (format: ExportFormat, scope: 'page' | 'all'): Promise<void> => {
    if (connection === null) return
    setExporting(true)
    setExportOpen(false)
    try {
      const dialect = connection.dialect
      let exportColumns = displayColumns
      let exportData = displayRows
      if (scope === 'all') {
        const collected = await collectAllRows(format.toUpperCase())
        exportData = orderRows(collected.rows, order)
        exportColumns = orderColumns(collected.columns, order)
      }
      const payload = renderExport(format, {
        dialect,
        schema: params.schema,
        table: params.table,
        columns: exportColumns,
        rows: exportData,
      })
      downloadText(exportFilename(params.schema, params.table, format), payload.mime, payload.text)
      setExportNote(`${format.toUpperCase()} 已导出 ${formatCount(exportData.length)} 行`)
      setTimeout(() => setExportNote(''), 5000)
    } catch (caught) {
      setError(failureText(caught))
    } finally {
      setExporting(false)
    }
  }

  /** The whole table as a runnable script: CREATE plus one INSERT per row. */
  const exportDump = async (): Promise<void> => {
    if (connection === null) return
    setExporting(true)
    setExportOpen(false)
    try {
      const collected = await collectAllRows('脚本')
      const ddl = await api
        .ddl(params.connectionId, params.schema, params.table, 'table')
        .then((result) => result.ddl)
        .catch(() => null)
      const text = tableDumpText({
        dialect: connection.dialect,
        schema: params.schema,
        table: params.table,
        ddl,
        columns: orderColumns(collected.columns, order),
        rows: orderRows(collected.rows, order),
      })
      downloadText(exportFilename(params.schema, params.table, 'sql'), 'application/sql', text)
      setExportNote(`SQL 已导出 ${formatCount(collected.rows.length)} 行`)
      setTimeout(() => setExportNote(''), 5000)
    } catch (caught) {
      setError(failureText(caught))
    } finally {
      setExporting(false)
    }
  }

  if (error !== null && rows.length === 0) {
    return (
      <div className="dshdb-qtab">
        <Banner tone="error" onClose={() => setError(null)}>
          {error.message}
          {error.detail ? `\n${error.detail}` : ''}
        </Banner>
      </div>
    )
  }

  return (
    <div className="dshdb-qtab">
      <div className="dshdb-qbar">
        <span className="dshdb-qtable" title={`${params.schema}.${params.table}`}>
          <TableIcon size={13} />
          {params.table}
        </span>
        <span className="dshdb-qbar-spacer" />
        {loading ? <Spinner /> : null}
        {elapsed !== undefined && !loading ? <span className="dshdb-qmeta">{formatMs(elapsed)}</span> : null}
        {exportNote !== '' ? <Tag tone="business">{exportNote}</Tag> : null}
        <span className="dshdb-menu-wrap" ref={exportAnchor}>
          <button
            type="button"
            className={`dshdb-pager-btn${exportOpen ? ' dshdb-pager-btn-active' : ''}`}
            title="导出结果"
            aria-label="导出结果"
            aria-expanded={exportOpen}
            onClick={() => setExportOpen((open) => !open)}
            disabled={loading || exporting || rows.length === 0}
          >
            {exporting ? <Spinner /> : <DownloadIcon size={13} />}
          </button>
          {exportOpen ? (
            <span className="dshdb-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => void exportRows('csv', 'page')}>
                当前页 CSV（{formatCount(rows.length)} 行）
              </button>
              <button type="button" role="menuitem" onClick={() => void exportRows('json', 'page')}>
                当前页 JSON（{formatCount(rows.length)} 行）
              </button>
              <button type="button" role="menuitem" onClick={() => void exportRows('sql', 'page')}>
                当前页 SQL（{formatCount(rows.length)} 行）
              </button>
              <button type="button" role="menuitem" onClick={() => void exportRows('md', 'page')}>
                当前页 Markdown（{formatCount(rows.length)} 行）
              </button>
              <button type="button" role="menuitem" onClick={() => void copyText(toMarkdown(displayColumns, rows))}>
                复制当前页 Markdown
              </button>
              <button type="button" role="menuitem" onClick={() => void exportRows('csv', 'all')}>
                全部 CSV
              </button>
              <button type="button" role="menuitem" onClick={() => void exportRows('json', 'all')}>
                全部 JSON
              </button>
              <button type="button" role="menuitem" onClick={() => void exportRows('sql', 'all')}>
                全部 SQL
              </button>
              <button type="button" role="menuitem" onClick={() => void exportRows('md', 'all')}>
                全部 Markdown
              </button>
              <button type="button" role="menuitem" onClick={() => void exportDump()}>
                整表脚本（建表 + 数据）
              </button>
            </span>
          ) : null}
        </span>
        <button
          type="button"
          className={`dshdb-pager-btn${filtersOpen ? ' dshdb-pager-btn-active' : ''}`}
          title={filtersOpen ? '关闭列筛选' : '按列筛选（也可点击单元格按值筛选）'}
          aria-label="列筛选"
          aria-pressed={filtersOpen}
          onClick={() => {
            setFiltersOpen((open) => !open)
          }}
          disabled={loading}
        >
          <FilterIcon size={13} />
          {activeFilterCount > 0 ? <span className="dshdb-filter-count">{activeFilterCount}</span> : null}
        </button>
        <button
          type="button"
          className="dshdb-pager-btn"
          title="在查询控制台打开这个表"
          aria-label="在查询控制台打开"
          onClick={() => {
            const target = connection
            if (target === null) return
            const where = composeWhere(target.dialect, whereText, columns, filters)
            const orderBy = stripKeyword(orderText, 'ORDER\\s+BY')
            openConsoleTab({
              connectionId: params.connectionId,
              sql: tableSelectSql(target.dialect, params.schema, params.table, where, orderBy, pageSize),
            })
          }}
          disabled={loading}
        >
          <TerminalIcon size={13} />
        </button>
        <button
          type="button"
          className="dshdb-pager-btn"
          title="刷新"
          aria-label="刷新"
          onClick={() => apply({})}
          disabled={loading}
        >
          <RefreshIcon size={13} />
        </button>
      </div>

      <div className="dshdb-qfilter">
        <span className="dshdb-qfilter-label">WHERE</span>
        <input
          className="dshdb-input dshdb-qfilter-input"
          placeholder="过滤条件，例如 ID > 10 AND BCH = '6084'"
          value={whereText}
          spellCheck={false}
          onChange={(event) => setWhereText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') apply({ where: whereText, page: 0 })
          }}
        />
        <span className="dshdb-qfilter-label">ORDER BY</span>
        <input
          className="dshdb-input dshdb-qfilter-input dshdb-qfilter-order"
          placeholder="排序列，例如 ID DESC"
          value={orderText}
          spellCheck={false}
          onChange={(event) => setOrderText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') apply({ orderBy: orderText, page: 0 })
          }}
        />
        <button
          type="button"
          className="dshdb-pager-btn"
          title="应用查询条件"
          aria-label="应用查询条件"
          onClick={() => apply({ where: whereText, orderBy: orderText, page: 0 })}
          disabled={loading}
        >
          <PlayIcon size={13} />
        </button>
      </div>

      {error !== null ? (
        <Banner tone="error" onClose={() => setError(null)}>
          {error.message}
          {error.detail ? `\n${error.detail}` : ''}
        </Banner>
      ) : null}

      {rows.length === 0 && !loading ? (
        <div className="dshdb-grid-wrap">
          <EmptyState icon={<TableIcon size={22} />} title="没有匹配的行" description={sqlText} />
        </div>
      ) : (
        <DataGrid
          columns={shownColumns}
          rows={shownRows}
          offset={offset}
          storageKey={`table:${params.schema}.${params.table}`}
          sort={activeSort ?? null}
          headerMenu={columnMenu}
          onSort={sortTable}
          onReorderColumns={gridReorder}
          headerExtra={filtersOpen ?               <tr className="dshdb-filter-row">
                <th className="dshdb-num" />
                {shownColumns.map((column, index) => {
                  const filter = filters[column.name]
                  const cleared = filter === undefined || (filter.op !== 'isnull' && filter.text.trim() === '')
                  return (
                    <th key={`filter-${column.name}-${index}`}>
                      <span className={`dshdb-filter-box${cleared ? '' : ' dshdb-filter-box-active'}`}>
                        <input
                          className="dshdb-filter-input"
                          placeholder={filter?.op === 'isnull' ? 'NULL' : '包含…'}
                          aria-label={`筛选 ${column.name}`}
                          title={filter?.op === 'isnull' ? '等于 NULL' : `按 ${column.name} 筛选（包含匹配）`}
                          value={filter?.op === 'isnull' ? '' : filter?.text ?? ''}
                          spellCheck={false}
                          onChange={(event) => {
                            const text = event.target.value
                            setColumnFilter(column, text === '' ? undefined : { text, op: 'like' })
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') applyRef.current({ page: 0 })
                          }}
                        />
                        {cleared ? null : (
                          <button
                            type="button"
                            className="dshdb-filter-clear"
                            aria-label={`清除 ${column.name} 的筛选`}
                            onClick={() => {
                              setColumnFilter(column, undefined)
                              const next: ColumnFilters = { ...filters }
                              delete next[column.name]
                              applyRef.current({ page: 0 }, next)
                            }}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    </th>
                  )
                })}
              </tr> : null}
          cellClass={gridCellClass}
          cellMenu={gridCellMenu}
          onCellOpen={gridCellOpen}
          onCellClick={
            filtersOpen
              ? (column, value) => {
                  setColumnFilter(column, value === null ? { text: '', op: 'isnull' } : { text: formatCell(value), op: 'eq' })
                }
              : undefined
          }
        />
      )}

      <div className="dshdb-pager">
        {loading ? <Tag tone="business">查询中</Tag> : null}
        {sqlText !== '' ? (
          <span className="dshdb-pager-sql" title={sqlText}>
            {sqlText}
          </span>
        ) : null}
        <span className="dshdb-pager-spacer" />
        <button
          type="button"
          className="dshdb-pager-btn"
          title="第一页"
          aria-label="第一页"
          onClick={() => apply({ page: 0 })}
          disabled={!hasPrevious || loading}
        >
          |◀
        </button>
        <button
          type="button"
          className="dshdb-pager-btn"
          title="上一页"
          aria-label="上一页"
          onClick={() => apply({ page: Math.max(page - 1, 0) })}
          disabled={!hasPrevious || loading}
        >
          ◀
        </button>
        <span className="dshdb-pager-range" title={`${formatCount(rangeStart)}-${formatCount(rangeEnd)}`}>
          {formatCount(rangeStart)}-{formatCount(rangeEnd)}
        </span>
        <span className="dshdb-pager-jump">
          <input
            className="dshdb-input dshdb-pager-input"
            type="number"
            min={1}
            inputMode="numeric"
            aria-label="页码"
            title="输入页码后回车跳到该页"
            value={pageDraft}
            disabled={loading}
            onChange={(event) => setPageDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              jumpToPage()
            }}
            onBlur={jumpToPage}
          />
        </span>
        <select
          className="dshdb-select dshdb-select-inline dshdb-pager-size"
          aria-label="每页行数"
          value={String(pageSize)}
          disabled={loading}
          onChange={(event) => {
            const size = Number(event.target.value)
            setPageSize(size)
            apply({ size, page: 0 })
          }}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {formatCount(size)}
            </option>
          ))}
        </select>
        <span className="dshdb-pager-total">{totalText}</span>
        <button
          type="button"
          className="dshdb-pager-btn"
          title="下一页"
          aria-label="下一页"
          onClick={() => apply({ page: page + 1 })}
          disabled={!hasNext || loading}
        >
          ▶
        </button>
        <button
          type="button"
          className="dshdb-pager-btn"
          title="最后一页"
          aria-label="最后一页"
          onClick={() => apply({ page: lastPage ?? page })}
          disabled={lastPage === undefined || loading || page >= lastPage}
        >
          ▶|
        </button>
      </div>

      <CellValueModal view={cellView} onClose={() => setCellView(null)} />
    </div>
  )
}

/** Render the table tab named by this tab's navigation parameters. */
export function TableTab(props: TableTabProps): ReactElement {
  const info = (props.useTabInfo ?? noTabInfo)()
  const params = readTableTabParams(info?.tab?.navigation?.params)
  if (params === undefined) {
    return (
      <EmptyState
        icon={<TableIcon size={22} />}
        title="数据表已关闭"
        description="这个标签页没有记录数据表位置，请在数据树中双击数据表重新打开。"
      />
    )
  }
  return <TableGrid params={params} />
}

/** The chip text of a table tab: the table's name, or nothing to name. */
export function TableTabTitle(props: TableTabProps): ReactElement {
  const info = (props.useTabInfo ?? noTabInfo)()
  const params = readTableTabParams(info?.tab?.navigation?.params)
  if (params === undefined) return <span>数据表</span>
  // The chip is narrow: name the table, keep the qualified name in the tip and
  // in the body header.
  const label = params.table
  const qualified = params.schema === '' ? params.table : `${params.schema}.${params.table}`
  return (
    <span className="dshdb-tabtitle" title={qualified}>
      <TableIcon size={12} />
      {label}
    </span>
  )
}

/**
 * One table's data in its own right Sidebar tab, IDEA style: a WHERE box, an
 * ORDER BY box, a result grid, and a pager under it.
 *
 * Double-clicking a table in the data tree opens this page with the table's
 * coordinates as navigation parameters. The first read opens the connection when
 * it is closed; a restored tab carries no parameters, so it reports that the
 * table has to be opened again instead of guessing.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import type { CellValue, ClientConnection, ColumnInfo, QueryResult, Row } from '../shared/types'
import { ApiError, api } from './api'
import { DataGrid } from './DataGrid'
import { formatCell, formatMs } from './format'
import { DownloadIcon, FilterIcon, PlayIcon, RefreshIcon, TableIcon } from './icons'
import { downloadText, exportFilename, toCsv, toJson, type ExportFormat } from './export'
import { readTableTabParams, type TableTabParams } from './tab-open'
import { copyText, columnValues, type ColumnMenuItem } from './colmenu'
import { cellCopyText, rowToTsv } from './cellmenu'
import { nextOrderBy, parseOrderBy, quoteSortColumn } from './sorting'
import { composeWhere, pageClause, qualifiedName, stripKeyword, type ColumnFilter, type ColumnFilters } from './tablesql'
import { Banner, EmptyState, Spinner, Tag } from './ui'

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

function formatCount(value: number): string {
  return value.toLocaleString('en-US')
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
  const [whereText, setWhereText] = useState('')
  const [orderText, setOrderText] = useState('')
  const [filters, setFilters] = useState<ColumnFilters>({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportNote, setExportNote] = useState('')
  const applyRef = useRef<(next: { page?: number; size?: number; where?: string; orderBy?: string }, override?: ColumnFilters) => void>(() => undefined)

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
        const result = await runSql(params.connectionId, pageSql, target.size)
        setColumns(result.columns)
        setRows(result.rows)
        setElapsed(result.elapsedMs)
        setSqlText(result.sql === '' ? pageSql : result.sql)
        setPage(target.page)
        if (target.recount) {
          try {
            const counted = await runSql(params.connectionId, `SELECT COUNT(*) FROM ${from}${whereSql}`, 1)
            const first = counted.rows[0]?.[0]
            const value = typeof first === 'number' ? first : Number(first)
            setTotal(Number.isFinite(value) ? value : undefined)
          } catch {
            // Counting is best effort: a pager without a total still pages.
            setTotal(undefined)
          }
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
  const activeSort = parseOrderBy(stripKeyword(orderText, 'ORDER\\s+BY'))
  const sortTable = (column: ColumnInfo): void => {
    const dialect = connection?.dialect ?? 'mysql'
    const next = nextOrderBy(stripKeyword(orderText, 'ORDER\\s+BY'), column.name, quoteSortColumn(dialect, column.name))
    setOrderText(next)
    apply({ orderBy: next, page: 0 })
  }
  const sortBy = (column: ColumnInfo, direction: 'asc' | 'desc'): void => {
    const dialect = connection?.dialect ?? 'mysql'
    const next = `${quoteSortColumn(dialect, column.name)} ${direction.toUpperCase()}`
    setOrderText(next)
    apply({ orderBy: next, page: 0 })
  }
  const clearSort = (): void => {
    setOrderText('')
    apply({ orderBy: '', page: 0 })
  }
  const columnMenu = (column: ColumnInfo): ColumnMenuItem[] => {
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
    ]
  }
  const hasPrevious = page > 0
  const lastPage = total === undefined ? undefined : Math.max(Math.ceil(total / pageSize) - 1, 0)
  const hasNext = lastPage === undefined ? rows.length >= pageSize : page < lastPage
  const rangeStart = rows.length === 0 ? 0 : offset + 1
  const rangeEnd = offset + rows.length
  const totalText = total !== undefined ? `/${formatCount(total)}` : hasNext ? `/${formatCount(offset + pageSize)}+` : ''

  const apply = (next: { page?: number; size?: number; where?: string; orderBy?: string }, override?: ColumnFilters): void => {
    if (connection === null) return
    const manualWhere = next.where ?? whereText
    void load(connection, {
      page: next.page ?? page,
      size: next.size ?? pageSize,
      where: composeWhere(connection.dialect, manualWhere, columns, override ?? filters),
      orderBy: next.orderBy ?? orderText,
      recount: next.where !== undefined || next.size !== undefined || next.page === 0,
    })
  }
  applyRef.current = apply

  // Typing in a column filter re-queries on a short delay so each keystroke does
  // not hit the server. Emptying the last filter re-queries at once, otherwise
  // the grid would keep showing the narrowed rows.
  const previousActive = useRef(0)
  useEffect(() => {
    if (!filtersOpen || connection === null) return
    const active = columns.filter((column) => filters[column.name] !== undefined).length
    const hadFilters = previousActive.current > 0
    previousActive.current = active
    if (active === 0) {
      if (hadFilters) applyRef.current({ page: 0 }, {})
      return
    }
    const timer = setTimeout(() => applyRef.current({ page: 0 }), 400)
    return () => clearTimeout(timer)
  }, [filters, filtersOpen, connection, columns])

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
  const exportRows = async (format: ExportFormat, scope: 'page' | 'all'): Promise<void> => {
    if (connection === null) return
    setExporting(true)
    setExportOpen(false)
    try {
      const dialect = connection.dialect
      let exportColumns = columns
      let exportData = rows
      if (scope === 'all') {
        const from = qualifiedName(dialect, params.schema, params.table)
        const where = composeWhere(dialect, whereText, columns, filters)
        const orderBy = stripKeyword(orderText, 'ORDER\s+BY')
        const whereSql = where === '' ? '' : ` WHERE ${where}`
        const orderSql = orderBy === '' ? '' : ` ORDER BY ${orderBy}`
        const batch = 2000
        const collected: Row[] = []
        let offset = 0
        for (;;) {
          const sql = `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, batch, offset)}`
          const result = await runSql(params.connectionId, sql, batch)
          if (collected.length === 0) exportColumns = result.columns
          collected.push(...result.rows)
          if (result.rows.length < batch || collected.length >= EXPORT_LIMIT) break
          offset += batch
        }
        exportData = collected.slice(0, EXPORT_LIMIT)
      }
      const text = format === 'csv' ? toCsv(exportColumns, exportData) : toJson(exportColumns, exportData)
      downloadText(exportFilename(params.schema, params.table, format), format === 'csv' ? 'text/csv' : 'application/json', text)
      setExportNote(`${format.toUpperCase()} 已导出 ${formatCount(exportData.length)} 行`)
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
        <span className="dshdb-menu-wrap">
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
              <button type="button" role="menuitem" onClick={() => void exportRows('csv', 'all')}>
                全部 CSV
              </button>
              <button type="button" role="menuitem" onClick={() => void exportRows('json', 'all')}>
                全部 JSON
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
          columns={columns}
          rows={rows}
          offset={offset}
          storageKey={`table:${params.schema}.${params.table}`}
          sort={activeSort ?? null}
          headerMenu={columnMenu}
          onSort={sortTable}
          headerExtra={filtersOpen ?               <tr className="dshdb-filter-row">
                <th className="dshdb-num" />
                {columns.map((column, index) => {
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
          cellClass={() => (filtersOpen ? 'dshdb-cell-filterable' : undefined)}
          cellMenu={(cell) => [
            {
              label: '复制单元格值',
              run: () => void copyText(cellCopyText(cell.value)),
            },
            {
              label: `复制整行（${columns.length} 列，制表符分隔）`,
              run: () => void copyText(rowToTsv(columns, cell.row)),
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
            },
          ]}
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

/**
 * Query console in its own right Sidebar tab, opened from the toolbar button.
 *
 * A relational data source gets an SQL editor with paging over the statement
 * that was executed; a Redis data source gets the same split view (a grid of
 * keys on top, the selected value below) plus a command box, which is how IDEA
 * presents Redis.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import type {
  CellValue,
  ClientConnection,
  ColumnInfo,
  DbSettings,
  ExplainResult,
  QueryResult,
  RedisCommandResult,
  RedisKeyInfo,
  RedisScanResult,
  RedisValue,
  Row,
  SchemaInfo,
} from '../shared/types'
import { ApiError, api } from './api'
import { DataGrid, type CellMenuTarget } from './DataGrid'
import { formatCell, formatMs, looksLikeDdl, looksLikeRedisWrite, looksLikeWrite } from './format'
import { clearHistory, pushHistory, readHistory, readPins, togglePin, type HistoryEntry } from './history'
import { formatSql } from './sqlformat'
import { copyText, columnValues, type ColumnMenuItem } from './colmenu'
import { cellCopyText, rowToTsv } from './cellmenu'
import { columnSignature, identityOrder, moveColumn, orderColumns, orderRows } from './columnOrder'
import { hideColumns, onlyColumn, pruneHidden, readHidden, toggleHidden, writeHidden } from './columnhide'
import { RedisValuePanel } from './redisview'
import { usePopoverDismiss } from './popover'
import { txButtonDisabled, type TxAction, type TxState } from './transaction'
import { nextRowSort, sortRows, type RowSort } from './rowsort'
import { filterRowIndexes } from './rowfilter'
import { pageable, wrapPage } from './pagesql'
import { pickStatement } from './sqlselection'
import { splitStatements } from './multistatement'
import { downloadText, exportFilename, renderExport, toMarkdown, type ExportFormat } from './export'
import { insertStatement, selectColumnsSql, tableFromStatement } from './tablesql'
import {
  applyCompletion,
  completionCandidates,
  keywordCompletions,
  qualifierBefore,
  wordAtCaret,
  type Completion,
} from './complete'
import { collectRows } from './pagedrows'
import { planTextOf } from './plan'
import { MAX_SQL_IMPORT_BYTES, mergeSqlFile, scriptFileText } from './sqlfile'
import { toggleSqlComment } from './sqlcomment'
import { ClockIcon, DatabaseIcon, DownloadIcon, PlayIcon, StopIcon, TerminalIcon } from './icons'
import { readConsoleTabParams } from './tab-open'
import { Banner, Button, ConfirmDialog, EmptyState, Spinner, Tag, type ConfirmRequest } from './ui'
import { HistoryPanel, KeyGrid, PagerButton, formatCount } from './console-view'
import { redisValueText } from './redisvalue'
import { CellValueModal } from './CellValueModal'
import { cellValueView, type CellValueView } from './cellvalue'

/** What the tab body receives: the framework's tab reader. */
export interface ConsoleTabProps {
  useTabInfo?: () => { tab?: { navigation?: { params?: unknown } } } | undefined
}

interface Failure {
  message: string
  detail?: string
}

const PAGE_SIZES = [200, 500, 1000, 2000, 5000]
/** Pseudo page size meaning "run the statement once and show everything". */
const ALL_PAGE_SIZE = 0
/** The host caps one response at 5,000 rows; "全部" takes that whole ceiling. */
const ALL_ROWS = 5000

const noTabInfo = (): undefined => undefined

// Stable stand-ins so the memoized projections below keep their identity when a
// run returns no rows (or has not run yet).
const EMPTY_COLUMNS: ColumnInfo[] = []
const EMPTY_ROWS: Row[] = []

function failureText(error: unknown): Failure {
  if (error instanceof ApiError) return { message: error.message, ...(error.detail ? { detail: error.detail } : {}) }
  return { message: error instanceof Error ? error.message : String(error) }
}

/** Batches pulled for a full export, and the ceiling that protects memory. */
const EXPORT_BATCH = 2000
const EXPORT_LIMIT = 50000

/**
 * Run one call that needs an open connection, opening it once when the tab was
 * created before a connection existed (a cold app has no live connection).
 */
async function withConnection<T>(id: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof ApiError && error.code === 'not-connected') {
      await api.connect(id)
      return await action()
    }
    throw error
  }
}

async function queryWithRetry(id: string, sql: string, maxRows: number, allowWrite: boolean, stmtKey: string, schema = ''): Promise<QueryResult> {
  return withConnection(id, () =>
    api.query({ id, sql, maxRows, allowWrite, stmtKey, ...(schema === '' ? {} : { schema }) }),
  )
}

/** One console body: SQL editor + pager, or Redis key grid + command box. */
function ConsoleBody({ initialConnectionId, initialSql }: { initialConnectionId?: string; initialSql?: string }): ReactElement {
  const [connections, setConnections] = useState<ClientConnection[]>([])
  const [settings, setSettings] = useState<DbSettings | null>(null)
  const [selectedId, setSelectedId] = useState(initialConnectionId ?? '')
  const [loadError, setLoadError] = useState('')

  /** The SQL schema (MySQL database) the console runs in; '' keeps the login default. */
  const [schema, setSchema] = useState('')
  const [schemas, setSchemas] = useState<SchemaInfo[]>([])
  /** Redis logical database; null keeps the data source's configured db. */
  const [redisDb, setRedisDb] = useState<number | null>(null)
  const [redisDatabases, setRedisDatabases] = useState<number | null>(null)

  const [statement, setStatement] = useState(initialSql ?? '')
  /** Seeded text survives the first "source switch" reset below; later switches clear it. */
  const seededStatement = useRef(initialSql !== undefined && initialSql !== '')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [running, setRunning] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(500)
  const [pageDraft, setPageDraft] = useState('1')
  const [rowFilter, setRowFilter] = useState('')
  const [base, setBase] = useState('')
  const [sourceSql, setSourceSql] = useState('')
  const [rowSort, setRowSort] = useState<RowSort | null>(null)
  const [columnOrder, setColumnOrder] = useState<number[] | null>(null)
  const [hiddenColumns, setHiddenColumns] = useState<string[] | null>(() => readHidden('console:sql'))
  const [cellView, setCellView] = useState<CellValueView | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportNote, setExportNote] = useState('')
  const exportCancelled = useRef(false)
  const [exporting, setExporting] = useState(false)
  const exportAnchor = useRef<HTMLSpanElement>(null)
  const closeExport = useCallback(() => setExportOpen(false), [])
  usePopoverDismiss(exportOpen, closeExport, exportAnchor)
  const [multiProgress, setMultiProgress] = useState<{ index: number; total: number } | null>(null)
  const [multiNote, setMultiNote] = useState('')
  const [scriptResults, setScriptResults] = useState<QueryResult[]>([])
  const [scriptIndex, setScriptIndex] = useState(0)

  const [pattern, setPattern] = useState('*')
  const [scanType, setScanType] = useState('')
  const [scan, setScan] = useState<RedisScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [selectedKey, setSelectedKey] = useState('')
  const [value, setValue] = useState<RedisValue | null>(null)
  const [valueError, setValueError] = useState<Failure | null>(null)
  const [command, setCommand] = useState('')
  const [commandRunning, setCommandRunning] = useState(false)
  const [commandResult, setCommandResult] = useState<RedisCommandResult | null>(null)

  const [confirm, setConfirm] = useState<{ request: ConfirmRequest; resolve: (ok: boolean) => void } | null>(null)

  const [history, setHistory] = useState<HistoryEntry[]>(() => readHistory('sql'))
  const [pins, setPins] = useState<HistoryEntry[]>(() => readPins('sql'))
  const [historyKindSeen, setHistoryKindSeen] = useState('sql')
  const [historyOpen, setHistoryOpen] = useState(false)

  const stmtRef = useRef('')
  /** Bumped whenever a request must no longer touch the UI (source/schema switch). */
  const runToken = useRef(0)
  /** Plans are invalidated by the same switching actions as query results. */
  const planToken = useRef(0)
  /** The grid the plan replaced, so closing the plan can bring the rows back. */
  const resultBeforePlan = useRef<QueryResult | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedRun, setSelectedRun] = useState(false)
  const [planRunning, setPlanRunning] = useState(false)
  const [plan, setPlan] = useState<ExplainResult | null>(null)
  const [tx, setTx] = useState<TxState>('idle')
  const [txBusy, setTxBusy] = useState(false)
  const [txNote, setTxNote] = useState('')
  const scanCursorRef = useRef('0')
  const redisDatabasesLoaded = useRef(false)
  const recallRef = useRef(-1)
  const recallDraft = useRef('')

  const connection = connections.find((item) => item.id === selectedId)
  const isRedis = connection?.dialect === 'redis'
  const historyKind = isRedis ? 'redis' : 'sql'

  // History is per console kind and must be right in the render that adopts the
  // source: loading it in an effect would leave the first ↑/↓ of a freshly opened
  // Redis console looking at the SQL history for one frame.
  if (historyKindSeen !== historyKind) {
    setHistoryKindSeen(historyKind)
    setHistory(readHistory(historyKind))
    setPins(readPins(historyKind))
    setHistoryOpen(false)
    recallRef.current = -1
  }
  /** The logical database every Redis call in this console targets. */
  const activeRedisDb = redisDb ?? connection?.redisDb ?? 0
  /** The schema SQL runs in when the user has not picked another one. */
  const defaultSchema =
    connection === undefined
      ? ''
      : connection.dialect === 'mysql' || connection.dialect === 'generic'
        ? connection.database
        : connection.user

  const askConfirm = useCallback((message: string, detail?: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirm({
        request: { title: '确认执行', message, detail, danger: true, confirmLabel: '执行' },
        resolve,
      })
    })
  }, [])

  const resolveConfirm = (ok: boolean): void => {
    confirm?.resolve(ok)
    setConfirm(null)
  }

  // Connections + settings on mount; keep the initial selection when it exists.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const status = await api.status()
        if (!alive) return
        setConnections(status.config.connections)
        setSettings(status.config.settings)
        setSelectedId((previous) => {
          if (previous !== '' && status.config.connections.some((item) => item.id === previous)) return previous
          return status.config.connections[0]?.id ?? ''
        })
      } catch (error) {
        if (alive) setLoadError(failureText(error).message)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const toggleStatementPin = useCallback((entry: HistoryEntry): void => {
    togglePin(historyKind, entry.statement)
    setPins(readPins(historyKind))
  }, [historyKind])

  const clearStatementHistory = useCallback((): void => {
    setHistory(clearHistory('sql'))
    recallRef.current = -1
  }, [])

  const clearCommandHistory = useCallback((): void => {
    setHistory(clearHistory('redis'))
    recallRef.current = -1
  }, [])

  // Database/Schema choices come from the host cache when the source is offline,
  // and from a live listing once it is connected.
  const loadSchemaList = useCallback(async (id: string): Promise<void> => {
    if (id === '') return
    try {
      const list = await api.schemas(id)
      setSchemas(list.schemas)
    } catch {
      // Keep the login default; the list retries after the first successful query.
    }
  }, [])

  useEffect(() => {
    if (selectedId === '' || isRedis) return
    void loadSchemaList(selectedId)
  }, [isRedis, loadSchemaList, selectedId])

  /* -- Ctrl+Space table completion ------------------------------------------
   * Suggestions come from the object list of the schema the console runs in;
   * the list is cached per schema so reopening the popup never refetches. */
  const [caretPos, setCaretPos] = useState(0)
  const [suggestions, setSuggestions] = useState<Completion[] | null>(null)
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const completionAnchor = useRef<HTMLSpanElement>(null)
  const completionCache = useRef(new Map<string, Completion[]>())
  const closeSuggestions = useCallback(() => setSuggestions(null), [])
  usePopoverDismiss(suggestions !== null, closeSuggestions, completionAnchor)

  const suggestionPrefix = wordAtCaret(statement, caretPos).prefix
  const suggestionItems = suggestions === null ? [] : completionCandidates(suggestionPrefix, suggestions)

  const loadSchemaCompletions = useCallback(
    async (target: string): Promise<Completion[] | null> => {
      const connectionId = connection?.id ?? ''
      const cacheKey = `${connectionId}:${target}`
      const cached = completionCache.current.get(cacheKey)
      if (cached !== undefined) return cached
      if (target === '') {
        setFailure({ message: '先选择要查询的数据库，再补全表名' })
        return null
      }
      try {
        const listed = await api.objects(connectionId, target)
        const items: Completion[] = [
          ...listed.objects
            .filter((item) => item.kind === 'table' || item.kind === 'view')
            .map((item) => ({ name: item.name, kind: 'table' as const })),
          ...schemas.map((item) => ({ name: item.name, kind: 'schema' as const })),
        ]
        completionCache.current.set(cacheKey, items)
        return items
      } catch (error) {
        setFailure(failureText(error))
        return null
      }
    },
    [connection, schemas],
  )

  const openSuggestions = useCallback(async (): Promise<void> => {
    if (connection === undefined || connection.dialect === 'redis') return
    const target = schema !== '' ? schema : defaultSchema
    const qualifier = qualifierBefore(statement, caretPos)
    if (qualifier.length > 0) {
      const name = qualifier[qualifier.length - 1] ?? ''
      const hinted = qualifier.length > 1 ? qualifier[qualifier.length - 2] ?? '' : ''
      const columnsSchema = hinted !== '' ? hinted : target
      const columnsKey = `${connection.id}:columns:${columnsSchema}.${name}`
      const cached = completionCache.current.get(columnsKey)
      if (cached !== undefined) {
        setSuggestionIndex(0)
        setSuggestions(cached)
        return
      }
      if (columnsSchema !== '') {
        try {
          const described = await api.describe(connection.id, columnsSchema, name, 'table')
          if (described.columns.length > 0) {
            const items: Completion[] = described.columns.map((column) => ({
              name: column.name,
              kind: 'column' as const,
            }))
            completionCache.current.set(columnsKey, items)
            setSuggestionIndex(0)
            setSuggestions(items)
            return
          }
        } catch {
          // The qualifier may be a schema rather than a table; list its relations below.
        }
      }
      try {
        const listed = await api.objects(connection.id, name)
        const items: Completion[] = listed.objects
          .filter((item) => item.kind === 'table' || item.kind === 'view')
          .map((item) => ({ name: item.name, kind: 'table' as const }))
        if (items.length > 0) {
          setSuggestionIndex(0)
          setSuggestions(items)
          return
        }
      } catch {
        // Fall through to the hint below.
      }
      setFailure({ message: `没有找到 ${name} 的列或表` })
      return
    }
    const items = await loadSchemaCompletions(target)
    if (items === null) return
    setSuggestionIndex(0)
    setSuggestions([...items, ...keywordCompletions()])
  }, [caretPos, connection, defaultSchema, loadSchemaCompletions, schema, statement])

  const insertSuggestion = useCallback(
    (name: string): void => {
      const next = applyCompletion(statement, caretPos, name, connection?.dialect ?? 'mysql')
      setSelectedRun(false)
      setStatement(next.statement)
      setSuggestions(null)
      setCaretPos(next.caret)
      setTimeout(() => {
        const area = inputRef.current
        if (area === null) return
        area.focus()
        area.setSelectionRange(next.caret, next.caret)
      }, 0)
    },
    [caretPos, connection, statement],
  )

  /** Run the console statement; `page`/`size` wrap a bare SELECT into one page. */
  const execute = useCallback(
    async (target: { statement: string; page: number; size: number; allowWrite: boolean }): Promise<void> => {
      setRowSort(null)
      setRowFilter('')
      setScriptResults([])
      resultBeforePlan.current = null
      const text = target.statement.trim()
      if (text === '' || selectedId === '') return
      const token = ++runToken.current
      const stmtKey = `console-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      stmtRef.current = stmtKey
      setRunning(true)
      setPlan(null)
      setFailure(null)
      setMultiNote('')
      try {
        const paged = pageable(text)
        const showAll = target.size === ALL_PAGE_SIZE
        const sqlText = paged && !showAll ? wrapPage(connection?.dialect ?? 'mysql', text, target.size, target.page) : text
        const maxRows = showAll ? ALL_ROWS : target.size
        const next = await queryWithRetry(selectedId, sqlText, maxRows, target.allowWrite, stmtKey, schema)
        if (token !== runToken.current) return
        setResult(next)
        setPage(paged && !showAll ? target.page : 0)
        setBase(paged ? text : '')
        setSourceSql(text)
        if (looksLikeDdl(text)) void loadSchemaList(selectedId)
      } catch (error) {
        if (token !== runToken.current) return
        setResult(null)
        setFailure(failureText(error))
      } finally {
        if (token === runToken.current) setRunning(false)
      }
    },
    [connection?.dialect, loadSchemaList, schema, selectedId],
  )

  /** Run several statements in order; every result is kept so the grid can flip between them. */
  const executeScript = async (parts: string[]): Promise<void> => {
    setRowSort(null)
    setRowFilter('')
    setScriptResults([])
    if (selectedId === '') return
    const token = ++runToken.current
    setRunning(true)
    setPlan(null)
    setFailure(null)
    setMultiNote('')
    setExportOpen(false)
    const collected: QueryResult[] = []
    let last: QueryResult | null = null
    try {
      for (const [index, part] of parts.entries()) {
        if (token !== runToken.current) return
        setMultiProgress({ index: index + 1, total: parts.length })
        const stmtKey = `console-${Date.now().toString(36)}-${index}`
        stmtRef.current = stmtKey
        try {
          last = await queryWithRetry(
            selectedId,
            part,
            pageSize === ALL_PAGE_SIZE ? ALL_ROWS : pageSize,
            looksLikeWrite(part),
            stmtKey,
            schema,
          )
          if (token !== runToken.current) return
          collected.push(last)
        } catch (error) {
          if (token !== runToken.current) return
          setScriptResults(collected)
          setScriptIndex(Math.max(0, collected.length - 1))
          const failure = failureText(error)
          setFailure({ message: `第 ${index + 1}/${parts.length} 条语句执行失败：${failure.message}`, detail: failure.detail ?? part })
          if (last !== null) {
            setResult(last)
            setPage(0)
            setBase('')
          }
          return
        }
      }
      if (token !== runToken.current) return
      setResult(last)
      setScriptResults(collected)
      setScriptIndex(Math.max(0, collected.length - 1))
      setPage(0)
      setBase('')
      setSourceSql(parts[parts.length - 1] ?? '')
      setMultiNote(`已顺序执行 ${parts.length} 条语句`)
      setHistory(pushHistory('sql', parts.join(';\n')))
      if (parts.some(looksLikeDdl)) void loadSchemaList(selectedId)
    } finally {
      setMultiProgress(null)
      if (token === runToken.current) setRunning(false)
    }
  }

  /** Read a `.sql` file into the editor at the caret: a script never replaces what is there. */
  const importSqlFile = async (file: File | undefined): Promise<void> => {
    if (file === undefined) return
    if (file.size > MAX_SQL_IMPORT_BYTES) {
      setFailure({ message: `文件过大：${file.name}（上限 ${String(MAX_SQL_IMPORT_BYTES / 1024 / 1024)} MB）` })
      return
    }
    try {
      const imported = await file.text()
      const area = inputRef.current
      const merged = mergeSqlFile(statement, imported, area?.selectionStart ?? statement.length)
      if (merged.text === statement) {
        setFailure({ message: `文件里没有可导入的 SQL：${file.name}` })
        return
      }
      setSelectedRun(false)
      setFailure(null)
      setStatement(merged.text)
      window.setTimeout(() => {
        area?.focus()
        area?.setSelectionRange(merged.caret, merged.caret)
      }, 0)
    } catch (error) {
      setFailure(failureText(error))
    }
  }

  /** Write the editor to a `.sql` file, so a script typed here can be kept or versioned. */
  const saveSqlFile = (): void => {
    const script = scriptFileText(statement)
    if (script === '') return
    setFailure(null)
    downloadText(exportFilename('', 'console', 'sql'), 'application/sql', script)
  }

  const run = async (): Promise<void> => {
    setExportOpen(false)
    const area = inputRef.current
    const picked = area === null ? { statement, selected: false } : pickStatement(statement, area.selectionStart, area.selectionEnd)
    const text = picked.statement.trim()
    if (text === '') return
    setSelectedRun(picked.selected)
    const parts = splitStatements(text)
    if (parts.length === 0) return
    const isWrite = parts.some((part) => looksLikeWrite(part))
    if (isWrite && settings?.confirmDestructive === true) {
      const ok = await askConfirm(parts.length > 1 ? `即将顺序执行 ${parts.length} 条语句（含写语句），可能修改或删除数据。` : '即将执行写语句，可能修改或删除数据。', text)
      if (!ok) return
    }
    if (parts.length > 1) {
      await executeScript(parts)
      return
    }
    setMultiNote('')
    setHistory(pushHistory('sql', text))
    await execute({ statement: text, page: 0, size: pageSize, allowWrite: isWrite })
  }

  /** 开始 / 提交 / 回滚事务；驱动层切换 auto-commit，Oracle 也适用。 */
  useEffect(
    () => () => {
      if (tx !== 'open' || selectedId === '') return
      void api.tx(selectedId, 'rollback').catch(() => undefined)
    },
    [tx, selectedId],
  )

  const runTx = async (action: TxAction): Promise<void> => {
    if (selectedId === '' || txBusy) return
    setTxBusy(true)
    setFailure(null)
    try {
      await withConnection(selectedId, () => api.tx(selectedId, action))
      setTx(action === 'start' ? 'open' : 'idle')
      setPlan(null)
      setResult(null)
      setBase('')
      setTxNote(action === 'start' ? '事务已开始，提交前可回滚' : action === 'commit' ? '事务已提交' : '事务已回滚')
    } catch (error) {
      setFailure(failureText(error))
    } finally {
      setTxBusy(false)
    }
  }

  /** Show the execution plan of the current (or selected) statement without running it. */
  const explainPlan = async (): Promise<void> => {
    const area = inputRef.current
    const picked = area === null ? { statement, selected: false } : pickStatement(statement, area.selectionStart, area.selectionEnd)
    const text = picked.statement.trim()
    if (text === '' || selectedId === '' || running) return
    const token = ++planToken.current
    setPlanRunning(true)
    setFailure(null)
    setMultiNote('')
    try {
      const next = await api.explain(selectedId, text, schema === '' ? undefined : schema)
      if (token !== planToken.current) return
      if (plan === null) resultBeforePlan.current = result
      setPlan(next)
      setResult(next.plan ?? null)
      setPage(0)
      setBase('')
      if (next.plan === undefined) {
        setFailure({ message: next.warnings.join('；') || '没有返回执行计划', detail: next.statements.join('\n') })
      }
    } catch (error) {
      if (token !== planToken.current) return
      setPlan(null)
      setResult(resultBeforePlan.current)
      resultBeforePlan.current = null
      setFailure(failureText(error))
    } finally {
      if (token === planToken.current) setPlanRunning(false)
    }
  }

  /** Ctrl/⌘ + ↑ recalls older statements, ↓ newer ones.
   *  Execution reuses the shared console runner. */
  const recallHistory = (delta: 1 | -1): void => {
    if (history.length === 0) return
    const next = Math.min(history.length - 1, Math.max(0, recallRef.current + delta))
    recallRef.current = next
    setStatement(history[next]!.statement)
  }

  const pickHistory = useCallback((entry: HistoryEntry): void => {
    setStatement(entry.statement)
    setHistoryOpen(false)
  }, [])

  const pickCommandHistory = useCallback((entry: HistoryEntry): void => {
    setCommand(entry.statement)
    setHistoryOpen(false)
  }, [])

  const cancel = async (): Promise<void> => {
    if (stmtRef.current === '') return
    try {
      await api.cancel(stmtRef.current)
    } catch {
      // Cancelling is best effort; the timeout still applies.
    }
  }

  const goPage = (next: number): void => {
    if (base === '') return
    void execute({ statement: base, page: next, size: pageSize, allowWrite: false })
  }

  /**
   * Load one page of Redis keys; `append` continues from the last cursor.
   * `overrideType` lets the type picker rescan right away instead of waiting
   * for the next render to pick the state up.
   */
  const loadKeys = useCallback(
    async (append: boolean, overrideType?: string): Promise<void> => {
      if (selectedId === '') return
      const token = runToken.current
      setScanning(true)
      setValueError(null)
      const type = overrideType ?? scanType
      try {
        const cursor = append ? scanCursorRef.current : '0'
        const next = await withConnection(selectedId, () =>
          api.redisScan({
            id: selectedId,
            db: activeRedisDb,
            cursor,
            pattern: pattern.trim() === '' ? '*' : pattern.trim(),
            ...(type === '' ? {} : { type }),
          }),
        )
        if (token !== runToken.current) return
        if (!redisDatabasesLoaded.current) {
          void api.redisDatabases(selectedId)
            .then((info) => {
              redisDatabasesLoaded.current = true
              setRedisDatabases(info.databases)
            })
            .catch(() => undefined)
        }
        scanCursorRef.current = next.cursor
        setScan((previous) => {
          if (!append || previous === null) return next
          // SCAN may hand out the same key twice across cursor rounds, and the
          // final round ends with cursor 0: keep what was already listed.
          const seen = new Set(previous.keys.map((info) => info.key))
          const fresh = next.keys.filter((info) => !seen.has(info.key))
          return { ...next, keys: [...previous.keys, ...fresh] }
        })
      } catch (error) {
        if (token !== runToken.current) return
        setValueError(failureText(error))
      } finally {
        if (token === runToken.current) setScanning(false)
      }
    },
    [activeRedisDb, pattern, scanType, selectedId],
  )

  /** Any queued request (SQL, command, scan, plan) belongs to the old source after a switch. */
  const invalidateRun = useCallback((): void => {
    runToken.current += 1
    planToken.current += 1
    setRunning(false)
    setPlanRunning(false)
    setCommandRunning(false)
    setScanning(false)
    void cancel()
  }, [])

  const runCommand = async (): Promise<void> => {
    const text = command.trim()
    if (text === '' || selectedId === '') return
    const isWrite = looksLikeRedisWrite(text)
    if (isWrite && settings?.confirmDestructive === true) {
      const ok = await askConfirm('即将执行会修改 Redis 数据的命令。', text)
      if (!ok) return
    }
    recallRef.current = -1
    recallDraft.current = ''
    setHistory(pushHistory('redis', text))
    const token = runToken.current
    setCommandRunning(true)
    setValueError(null)
    try {
      const next = await withConnection(selectedId, () =>
        api.redisCommand(selectedId, text, isWrite && connection?.readOnly !== true, activeRedisDb),
      )
      if (token !== runToken.current) return
      setCommandResult(next)
      if (isWrite) await loadKeys(false)
    } catch (error) {
      if (token !== runToken.current) return
      setValueError(failureText(error))
    } finally {
      if (token === runToken.current) setCommandRunning(false)
    }
  }

  /** ↑ / ↓ in the command box walk the command history, ↓ past the newest returns to the draft. */
  const recallCommand = (delta: 1 | -1): void => {
    if (history.length === 0) return
    const current = recallRef.current
    const next = Math.min(history.length - 1, Math.max(-1, current + delta))
    if (next === current) return
    if (current === -1) recallDraft.current = command
    recallRef.current = next
    setCommand(next === -1 ? recallDraft.current : history[next]!.statement)
  }

  const selectKey = useCallback(
    async (key: RedisKeyInfo): Promise<void> => {
      setSelectedKey(key.key)
      setValue(null)
      setValueError(null)
      if (selectedId === '') return
      const token = runToken.current
      try {
        const next = await withConnection(selectedId, () => api.redisKey(selectedId, key.key, activeRedisDb))
        if (token !== runToken.current) return
        setValue(next)
      } catch (error) {
        if (token !== runToken.current) return
        setValueError(failureText(error))
      }
    },
    [activeRedisDb, selectedId],
  )

  const [valueRefreshing, setValueRefreshing] = useState(false)

  /** Re-read the selected key so a TTL countdown or a changed payload can be picked up. */
  const refreshValue = useCallback(async (): Promise<void> => {
    if (selectedId === '' || selectedKey === '') return
    const token = runToken.current
    setValueRefreshing(true)
    try {
      const next = await withConnection(selectedId, () => api.redisKey(selectedId, selectedKey, activeRedisDb))
      if (token !== runToken.current) return
      setValue(next)
      setValueError(null)
    } catch (error) {
      if (token !== runToken.current) return
      setValueError(failureText(error))
    } finally {
      if (token === runToken.current) setValueRefreshing(false)
    }
  }, [activeRedisDb, selectedId, selectedKey])

  /** Stable for the memoised key rows: only a different key starts a new request. */
  const pickKey = useCallback(
    (key: RedisKeyInfo): void => {
      void selectKey(key)
    },
    [selectKey],
  )

  // Switching data source resets both modes, so results never look like another source's.
  useEffect(() => {
    setResult(null)
    setScriptResults([])
    setRowFilter('')
    setFailure(null)
    // A statement handed over by a table tab is the reason this tab was opened.
    if (seededStatement.current) seededStatement.current = false
    else setStatement('')
    setBase('')
    setPage(0)
    setScan(null)
    setSelectedKey('')
    setValue(null)
    setValueError(null)
    setCommandResult(null)
    setSchema(
      connection === undefined
        ? ''
        : connection.dialect === 'mysql' || connection.dialect === 'generic'
          ? connection.database
          : connection.user,
    )
    setSchemas([])
    setRedisDb(null)
    setRedisDatabases(null)
    redisDatabasesLoaded.current = false
    scanCursorRef.current = '0'
    // Only a source switch resets the chosen schema; a background status refresh must keep it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    if (selectedId === '' || !isRedis) return
    setScan(null)
    setSelectedKey('')
    setValue(null)
    setCommandResult(null)
    scanCursorRef.current = '0'
    void loadKeys(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isRedis, activeRedisDb])

  // Derived values and the column-reorder hooks must stay above the early
  // returns below, otherwise the hook order changes once a data source loads.
  // Keep the jump box in step with the arrows: both ways of moving share one page state.
  useEffect(() => {
    setPageDraft(String(page + 1))
  }, [page])

  /** Jump straight to a page the arrows would take a long time to reach. */
  const jumpToPage = (): void => {
    const wanted = Number.parseInt(pageDraft, 10)
    if (!Number.isFinite(wanted) || wanted < 1 || wanted - 1 === page) {
      setPageDraft(String(page + 1))
      return
    }
    goPage(wanted - 1)
  }

  const offset = page * pageSize
  const columns = result?.columns ?? EMPTY_COLUMNS
  const rows = result?.rows ?? EMPTY_ROWS
  // Sorting only reshapes the current page; a new query or page resets it.
  const visibleRows = useMemo(() => sortRows(columns, rows, rowSort), [columns, rows, rowSort])
  // The text filter is a view over the page: exports of "current page" follow it.
  const filteredIndexes = useMemo(() => filterRowIndexes(visibleRows, rowFilter), [visibleRows, rowFilter])
  const filteredRows = useMemo(() => filteredIndexes.map((index) => visibleRows[index] as Row), [filteredIndexes, visibleRows])

  /** `EXPLAIN FORMAT=TREE` style plans: one text column, rendered as preformatted text. */
  const planText = useMemo(() => planTextOf(plan?.plan), [plan])
  const displayColumns = useMemo(() => orderColumns(columns, columnOrder), [columns, columnOrder])
  const displayRows = useMemo(() => orderRows(filteredRows, columnOrder), [filteredRows, columnOrder])
  // Hiding is display-only: positions map back into the displayed columns, so
  // reordering and row copying keep addressing the full result.
  const hiddenView = useMemo(() => hideColumns(displayColumns, displayRows, hiddenColumns), [displayColumns, displayRows, hiddenColumns])
  const shownColumns = hiddenView.columns
  const shownRows = hiddenView.rows
  const hiddenCount = displayColumns.length - shownColumns.length
  const signature = columnSignature(columns)
  useEffect(() => {
    setColumnOrder(null)
    setHiddenColumns((current) => pruneHidden(current, columns))
  }, [signature, columns])
  useEffect(() => {
    writeHidden('console:sql', hiddenColumns)
  }, [hiddenColumns])
  const columnMenu = useCallback((column: ColumnInfo): ColumnMenuItem[] => {
    const active = rowSort?.column === column.name ? rowSort.direction : null
    const index = columns.findIndex((item) => item.name === column.name)
    return [
      { label: '按此列升序', disabled: active === 'asc', run: () => setRowSort({ column: column.name, direction: 'asc' }) },
      { label: '按此列降序', disabled: active === 'desc', run: () => setRowSort({ column: column.name, direction: 'desc' }) },
      { label: '清除排序', disabled: rowSort === null, run: () => setRowSort(null) },
      { label: `复制列名「${column.name}」`, run: () => void copyText(column.name) },
      {
        label: `复制本列值（${filteredRows.length} 行）`,
        disabled: filteredRows.length === 0 || index < 0,
        run: () => void copyText(columnValues(filteredRows, index)),
      },
      {
        label: `复制查询语句（${displayColumns.length} 列）`,
        disabled: displayColumns.length === 0 || tableTarget() === null,
        run: () => {
          const target = tableTarget()
          if (target === null) return
          void copyText(selectColumnsSql(connection?.dialect ?? 'mysql', target.schema, target.table, displayColumns))
        },
      },
      {
        label: `隐藏列「${column.name}」`,
        disabled: shownColumns.length <= 1,
        run: () => setHiddenColumns((current) => toggleHidden(current, column.name)),
      },
      {
        label: '只看这一列',
        disabled: displayColumns.length <= 1,
        run: () => setHiddenColumns(onlyColumn(displayColumns, column.name)),
      },
      {
        label: hiddenCount === 0 ? '显示全部列' : `显示全部列（已隐藏 ${hiddenCount} 列）`,
        disabled: hiddenCount === 0,
        run: () => setHiddenColumns(null),
      },
    ]
  }, [columns, displayColumns, filteredRows, hiddenCount, rowSort, shownColumns.length])

  /** Stable grid callbacks so typing in the editor does not re-render the whole result grid. */
  const gridSort = useCallback((column: ColumnInfo): void => {
    setRowSort((current) => nextRowSort(current, column.name))
  }, [])
  const gridReorder = useCallback(
    (from: number, to: number): void => {
      // The grid reorders the columns it renders; translate back to display slots.
      const positions = hiddenView.positions
      const source = positions[from] ?? from
      const target = positions[to] ?? to
      setColumnOrder((current) => moveColumn(current ?? identityOrder(displayColumns.length), source, target))
    },
    [displayColumns.length, hiddenView.positions],
  )
  const gridCellMenu = useCallback(
    (cell: CellMenuTarget): ColumnMenuItem[] => [
      { label: '查看完整值', run: () => setCellView(cellValueView(cell.column.name, cell.value)) },
      { label: '复制单元格值', run: () => void copyText(cellCopyText(cell.value)) },
      {
        label: '复制 INSERT 语句',
        disabled: tableTarget() === null,
        run: () => {
          const target = tableTarget()
          if (target === null) return
          void copyText(
            insertStatement(connection?.dialect ?? 'mysql', target.schema, target.table, displayColumns, cell.row),
          )
        },
      },
      { label: `复制整行（${displayColumns.length} 列，制表符分隔）`, run: () => void copyText(rowToTsv(displayColumns, cell.row)) },
    ],
    [base, connection?.dialect, displayColumns, schema, sourceSql],
  )
  const gridCellOpen = useCallback((column: ColumnInfo, value: CellValue): void => {
    setCellView(cellValueView(column.name, value))
  }, [])

  if (loadError !== '') {
    return (
      <div className="dshdb-qtab">
        <Banner tone="error">{loadError}</Banner>
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="dshdb-qtab">
        <EmptyState
          icon={<DatabaseIcon size={22} />}
          title="还没有数据源"
          description="先在「数据库」标签页中新增数据源，再回来执行查询。"
        />
      </div>
    )
  }

  /** The table the console statement targets, for INSERT export. */
  const tableTarget = (): { schema: string; table: string } | null => {
    const parsed = tableFromStatement(sourceSql !== '' ? sourceSql : base)
    if (parsed === null) return null
    return parsed.schema === '' ? { schema, table: parsed.table } : parsed
  }
  const noTableNote = (): void => {
    setExportNote('当前语句没有目标表，无法导出 SQL')
    setTimeout(() => setExportNote(''), 5000)
  }
  /** Save the rows the grid is showing; the console keeps no cursor, so only the page. */
  const exportPage = (format: ExportFormat): void => {
    setExportOpen(false)
    if (displayRows.length === 0) return
    const target = format === 'sql' ? tableTarget() : null
    if (format === 'sql' && target === null) {
      noTableNote()
      return
    }
    const payload = renderExport(format, {
      dialect: connection?.dialect ?? 'mysql',
      schema: target?.schema ?? '',
      table: target?.table ?? 'console',
      columns: displayColumns,
      rows: displayRows,
    })
    downloadText(exportFilename(target?.schema ?? '', target?.table ?? 'console', format), payload.mime, payload.text)
    setExportNote(`${format.toUpperCase()} 已导出 ${displayRows.length} 行`)
    setTimeout(() => setExportNote(''), 5000)
  }
  /** Export every row of the paged statement, not just the current page. */
  const exportAll = async (format: ExportFormat): Promise<void> => {
    setExportOpen(false)
    if (base === '' || selectedId === '' || exporting) return
    const target = format === 'sql' ? tableTarget() : null
    if (format === 'sql' && target === null) {
      noTableNote()
      return
    }
    setExporting(true)
    setFailure(null)
    exportCancelled.current = false
    try {
      const collected = await collectRows({
        limit: EXPORT_LIMIT,
        batch: EXPORT_BATCH,
        cancelled: () => exportCancelled.current,
        onProgress: (count) => setExportNote(`${format.toUpperCase()} 正在取 ${formatCount(count)} 行…`),
        fetch: async ({ page: sourcePage }) => {
          const sqlText = wrapPage(connection?.dialect ?? 'mysql', base, EXPORT_BATCH, sourcePage)
          const next = await queryWithRetry(
            selectedId,
            sqlText,
            EXPORT_BATCH,
            false,
            `console-export-${Date.now().toString(36)}-${sourcePage}`,
            schema,
          )
          return next.rows
        },
      })
      if (exportCancelled.current) {
        setExportNote(`${format.toUpperCase()} 导出已取消`)
        setTimeout(() => setExportNote(''), 5000)
        return
      }
      const data = orderRows(collected, columnOrder)
      const cols = orderColumns(columns, columnOrder)
      const payload = renderExport(format, {
        dialect: connection?.dialect ?? 'mysql',
        schema: target?.schema ?? '',
        table: target?.table ?? 'console',
        columns: cols,
        rows: data,
      })
      downloadText(exportFilename(target?.schema ?? '', target?.table ?? 'console', format), payload.mime, payload.text)
      setExportNote(`${format.toUpperCase()} 已导出 ${data.length} 行`)
      setTimeout(() => setExportNote(''), 5000)
    } catch (error) {
      setFailure(failureText(error))
    } finally {
      setExporting(false)
    }
  }

  const allRows = pageSize === ALL_PAGE_SIZE
  const hasPrevious = page > 0
  const hasNext = !allRows && result !== null && rows.length >= pageSize
  const rangeStart = rows.length === 0 ? 0 : offset + 1
  const rangeEnd = offset + rows.length

  return (
    <div className="dshdb-qtab">
      <div className="dshdb-qbar">
        <select
          className="dshdb-select dshdb-select-inline dshdb-console-select"
          aria-label="数据源"
          value={selectedId}
          onChange={(event) => {
            const next = event.target.value
            // Drop whatever the old source is still running; its result is not this source's.
            invalidateRun()
            if (tx === 'open' && selectedId !== '') {
              void api.tx(selectedId, 'rollback').catch(() => undefined)
            }
            setTx('idle')
            setTxNote('')
            setSelectedId(next)
          }}
        >
          {connections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.dialect}
            </option>
          ))}
        </select>
        {connection === undefined ? null : isRedis ? (
          <select
            className="dshdb-select dshdb-select-inline dshdb-console-select"
            aria-label="Redis 逻辑库"
            title="控制台扫描键和执行命令所用的逻辑库"
            value={activeRedisDb}
            onChange={(event) => {
              invalidateRun()
              setRedisDb(Number(event.target.value))
            }}
          >
            {Array.from({ length: Math.max(1, redisDatabases ?? 16) }, (_, index) => (
              <option key={index} value={index}>
                db{index}
                {index === connection.redisDb ? '（默认）' : ''}
              </option>
            ))}
          </select>
        ) : (
          <select
            className="dshdb-select dshdb-select-inline dshdb-console-select"
            aria-label="数据库"
            title="控制台执行的默认数据库/Schema；选了它就不用给表名加库名前缀"
            value={schema}
            onChange={(event) => {
              invalidateRun()
              setSchema(event.target.value)
            }}
          >
            <option value={defaultSchema}>默认{defaultSchema === '' ? '' : `（${defaultSchema}）`}</option>
            {schemas
              .filter((item) => item.name !== defaultSchema)
              .map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name}
                  {item.system === true ? '（系统）' : ''}
                </option>
              ))}
          </select>
        )}
        <span className="dshdb-qbar-spacer" />
        {running || scanning || commandRunning ? <Spinner /> : null}
        {result !== null && !running ? <span className="dshdb-qmeta">{formatMs(result.elapsedMs)}</span> : null}
      </div>

      {isRedis ? (
        <>
          {historyOpen ? (
            <HistoryPanel
              entries={history}
              pins={pins}
              onPick={pickCommandHistory}
              onTogglePin={toggleStatementPin}
              onClear={clearCommandHistory}
            />
          ) : null}
          <div className="dshdb-qfilter">
            <span className="dshdb-qfilter-label">MATCH</span>
            <input
              className="dshdb-input dshdb-qfilter-input dshdb-pattern-input"
              placeholder="键模式，例如 shop:*"
              value={pattern}
              spellCheck={false}
              onChange={(event) => setPattern(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void loadKeys(false)
              }}
            />
            <select
              className="dshdb-input dshdb-qfilter-input"
              aria-label="键类型"
              value={scanType}
              onChange={(event) => {
                setScanType(event.target.value)
                scanCursorRef.current = '0'
                void loadKeys(false, event.target.value)
              }}
            >
              <option value="">全部类型</option>
              <option value="string">string</option>
              <option value="list">list</option>
              <option value="set">set</option>
              <option value="hash">hash</option>
              <option value="zset">zset</option>
              <option value="stream">stream</option>
            </select>
            <Button size="sm" onClick={() => void loadKeys(false)} loading={scanning}>
              扫描
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void loadKeys(true)}
              disabled={scan === null || scan.cursor === '0' || scanning}
            >
              继续
            </Button>
            <span className="dshdb-qmeta">
              {scan === null ? '' : `${formatCount(scan.keys.length)} 个键`}
            </span>
          </div>

          {valueError !== null ? (
            <Banner tone="error" onClose={() => setValueError(null)}>
              {valueError.message}
              {valueError.detail ? `\n${valueError.detail}` : ''}
            </Banner>
          ) : null}

          <div className={value === null ? 'dshdb-grid-wrap' : 'dshdb-grid-wrap dshdb-redis-keys'}>
            {scan === null || scan.keys.length === 0 ? (
              scanning ? (
                <div className="dshdb-empty">
                  <Spinner size={16} />
                  <span className="dshdb-muted">正在扫描键…</span>
                </div>
              ) : (
                <EmptyState icon={<DatabaseIcon size={22} />} title="没有匹配的键" description={scanType === '' ? pattern : `${pattern} · 类型 ${scanType}`} />
              )
            ) : (
              <KeyGrid keys={scan.keys} selectedKey={selectedKey} onSelect={pickKey} />
            )}
          </div>

          {value !== null ? (
            <RedisValuePanel value={value} onRefresh={() => void refreshValue()} refreshing={valueRefreshing} />
          ) : null}

          <div className="dshdb-qfilter">
            <span className="dshdb-qfilter-label">命令</span>
            <input
              className="dshdb-input dshdb-qfilter-input dshdb-command-input"
              placeholder="例如 GET shop:customer:42"
              value={command}
              spellCheck={false}
              onChange={(event) => {
                recallRef.current = -1
                setCommand(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void runCommand()
                if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  recallCommand(1)
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  recallCommand(-1)
                }
              }}
            />
            <Button size="sm" variant="ghost" icon={<ClockIcon size={12} />} onClick={() => setHistoryOpen((open) => !open)} disabled={history.length === 0}>
              历史
            </Button>
            <Button size="sm" variant="primary" onClick={() => void runCommand()} loading={commandRunning}>
              执行
            </Button>
          </div>

          {commandResult !== null ? (
            <pre className="dshdb-console-value" title={commandResult.command}>
              {redisValueText(commandResult.value)}
            </pre>
          ) : null}

        </>
      ) : (
        <>
          <span className="dshdb-complete-anchor" ref={completionAnchor}>
            <textarea
              className="dshdb-input dshdb-console-input"
              placeholder="输入 SQL，Ctrl/⌘ + Enter 执行（有选中内容时只执行选中部分），Ctrl/⌘ + Space 补全表名和列名（`表.` 后补全列名），Ctrl/⌘ + S 存成 .sql，Ctrl/⌘ + / 注释，Ctrl/⌘ + Shift + F 格式化，Ctrl/⌘ + ↑↓ 切换历史"
              ref={inputRef}
              value={statement}
              spellCheck={false}
              onChange={(event) => {
                setSelectedRun(false)
                setCaretPos(event.target.selectionStart)
                setStatement(event.target.value)
              }}
              onSelect={(event) => setCaretPos(event.currentTarget.selectionStart)}
              onKeyUp={(event) => setCaretPos(event.currentTarget.selectionStart)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === ' ') {
                  event.preventDefault()
                  void openSuggestions()
                  return
                }
                if (suggestions !== null && suggestionItems.length > 0) {
                  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                    event.preventDefault()
                    const step = event.key === 'ArrowDown' ? 1 : -1
                    setSuggestionIndex((previous) => (previous + step + suggestionItems.length) % suggestionItems.length)
                    return
                  }
                  if (event.key === 'Enter' || event.key === 'Tab') {
                    const picked = suggestionItems[suggestionIndex]
                    if (picked !== undefined) {
                      event.preventDefault()
                      insertSuggestion(picked.name)
                      return
                    }
                  }
                }
                if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
                  event.preventDefault()
                  saveSqlFile()
                  return
                }
                if ((event.ctrlKey || event.metaKey) && event.key === '/') {
                  event.preventDefault()
                  const area = inputRef.current
                  const next = toggleSqlComment(
                    statement,
                    area?.selectionStart ?? caretPos,
                    area?.selectionEnd ?? caretPos,
                  )
                  if (next.text !== statement) {
                    setSelectedRun(false)
                    setStatement(next.text)
                    setCaretPos(next.selectionEnd)
                    setTimeout(() => {
                      area?.focus()
                      area?.setSelectionRange(next.selectionStart, next.selectionEnd)
                    })
                  }
                  return
                }
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault()
                  void run()
                  return
                }
                if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === 'F' || event.key === 'f')) {
                  event.preventDefault()
                  setStatement((prev) => formatSql(prev))
                  return
                }
                if ((event.ctrlKey || event.metaKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                  event.preventDefault()
                  recallHistory(event.key === 'ArrowUp' ? 1 : -1)
                }
              }}
            />
            {suggestions !== null ? (
              <div className="dshdb-complete" role="listbox" aria-label="补全候选">
                {suggestionItems.length === 0 ? (
                  <span className="dshdb-complete-empty">没有匹配的表</span>
                ) : (
                  suggestionItems.map((item, index) => (
                    <button
                      key={`${item.kind}:${item.name}`}
                      type="button"
                      role="option"
                      aria-selected={index === suggestionIndex}
                      className={index === suggestionIndex ? 'dshdb-complete-item dshdb-complete-active' : 'dshdb-complete-item'}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        insertSuggestion(item.name)
                      }}
                    >
                      <span className="dshdb-complete-name">{item.name}</span>
                      <span className="dshdb-complete-kind">
                        {item.kind === 'column'
                          ? '列'
                          : item.kind === 'table'
                            ? '表'
                            : item.kind === 'schema'
                              ? '库'
                              : '关键字'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
          </span>

          <div className="dshdb-qbar">
            <Button size="sm" variant="primary" icon={<PlayIcon size={12} />} onClick={() => void run()} loading={running} title="有选中内容时只执行选中部分">
              执行
            </Button>
            <Button size="sm" variant="ghost" icon={<StopIcon size={12} />} onClick={() => void cancel()} disabled={!running}>
              取消
            </Button>
            <Button size="sm" variant="ghost" icon={<ClockIcon size={12} />} onClick={() => setHistoryOpen((open) => !open)} disabled={history.length === 0}>
              历史
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStatement((prev) => formatSql(prev))}
              disabled={statement.trim() === ''}
              title="整理关键字大小写与换行（Ctrl/⌘ + Shift + F）"
            >
              格式化
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              title={`从 .sql 文件读取脚本并插入到光标处（上限 ${String(MAX_SQL_IMPORT_BYTES / 1024 / 1024)} MB）`}
            >
              导入
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".sql,.txt,text/plain"
              hidden
              aria-label="导入 SQL 文件"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                void importSqlFile(file)
              }}
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={saveSqlFile}
              disabled={statement.trim() === ''}
              title="把编辑器里的 SQL 保存为 .sql 文件"
            >
              保存
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void explainPlan()}
              loading={planRunning}
              disabled={statement.trim() === '' || running}
              title="查看当前语句的执行计划（不会真正执行语句）"
            >
              执行计划
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void runTx('start')}
              disabled={txButtonDisabled(tx, 'start') || txBusy || selectedId === ''}
              title="发送 BEGIN，开启手动事务"
            >
              事务
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void runTx('commit')}
              disabled={txButtonDisabled(tx, 'commit') || txBusy}
              title="提交当前事务"
            >
              提交
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void runTx('rollback')}
              disabled={txButtonDisabled(tx, 'rollback') || txBusy}
              title="回滚当前事务"
            >
              回滚
            </Button>
            <span className="dshdb-menu-wrap" ref={exportAnchor}>
              <button
                type="button"
                className={`dshdb-pager-btn${exportOpen ? ' dshdb-pager-btn-active' : ''}`}
                title={exporting ? '正在导出…' : '导出结果'}
                aria-label="导出结果"
                aria-expanded={exportOpen}
                onClick={() => setExportOpen((open) => !open)}
                disabled={running || exporting || rows.length === 0}
              >
                <DownloadIcon size={13} />
              </button>
              {exportOpen ? (
                <span className="dshdb-menu" role="menu">
                  <button type="button" role="menuitem" onClick={() => exportPage('csv')}>
                    当前页 CSV（{filteredRows.length} 行）
                  </button>
                  <button type="button" role="menuitem" onClick={() => exportPage('json')}>
                    当前页 JSON（{filteredRows.length} 行）
                  </button>
                  <button type="button" role="menuitem" onClick={() => exportPage('sql')}>
                    当前页 SQL（{filteredRows.length} 行）
                  </button>
                  <button type="button" role="menuitem" onClick={() => exportPage('md')}>
                    当前页 Markdown（{filteredRows.length} 行）
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void copyText(toMarkdown(displayColumns, filteredRows))}
                  >
                    复制当前页 Markdown
                  </button>
                  {base !== '' ? (
                    <>
                      <button type="button" role="menuitem" onClick={() => void exportAll('csv')} disabled={exporting}>
                        全部 CSV（最多 {EXPORT_LIMIT} 行）
                      </button>
                      <button type="button" role="menuitem" onClick={() => void exportAll('json')} disabled={exporting}>
                        全部 JSON（最多 {EXPORT_LIMIT} 行）
                      </button>
                      <button type="button" role="menuitem" onClick={() => void exportAll('sql')} disabled={exporting}>
                        全部 SQL（最多 {EXPORT_LIMIT} 行）
                      </button>
                      <button type="button" role="menuitem" onClick={() => void exportAll('md')} disabled={exporting}>
                        全部 Markdown（最多 {EXPORT_LIMIT} 行）
                      </button>
                    </>
                  ) : null}
                </span>
              ) : null}
            </span>
            {scriptResults.length > 1 ? (
              <select
                className="dshdb-input dshdb-console-select"
                aria-label="语句结果"
                value={scriptIndex}
                onChange={(event) => {
                  const index = Number(event.target.value)
                  const picked = scriptResults[index]
                  if (picked === undefined) return
                  setScriptIndex(index)
                  setResult(picked)
                  setRowFilter('')
                  setPage(0)
                  setBase('')
                }}
              >
                {scriptResults.map((_, index) => (
                  <option key={index} value={index}>
                    第 {index + 1} 条
                  </option>
                ))}
              </select>
            ) : null}
            <span className="dshdb-qbar-spacer" />
            {exportNote !== '' ? <Tag tone="business">{exportNote}</Tag> : null}
            {exporting ? (
              <button
                type="button"
                className="dshdb-pager-btn"
                title="停止导出，已取到的行不会写入文件"
                onClick={() => {
                  exportCancelled.current = true
                }}
              >
                取消
              </button>
            ) : null}
            {multiProgress !== null ? (
              <span className="dshdb-qmeta">
                正在执行 {multiProgress.index}/{multiProgress.total}…
              </span>
            ) : null}
            {multiNote !== '' ? <Tag tone="business">{multiNote}</Tag> : null}
            {selectedRun ? <span className="dshdb-qmeta">已执行选中内容</span> : null}
            {tx === 'open' ? <Tag tone="warn">事务进行中</Tag> : null}
            {txNote !== '' ? <Tag tone="business">{txNote}</Tag> : null}
            {base !== '' && !allRows ? <span className="dshdb-qmeta">可分页查询</span> : null}
            {result !== null && result.truncated ? (
              <Tag tone="warn" title="还有更多行没有取回：调大行数上限，或用导出的「全部」">
                结果已截断，仅取回 {formatCount(rows.length)} 行
              </Tag>
            ) : null}
          </div>

          {historyOpen ? (
            <HistoryPanel
              entries={history}
              pins={pins}
              onPick={pickHistory}
              onTogglePin={toggleStatementPin}
              onClear={clearStatementHistory}
            />
          ) : null}

          {failure !== null ? (
            <Banner tone="error" onClose={() => setFailure(null)}>
              {failure.message}
              {failure.detail ? `\n${failure.detail}` : ''}
            </Banner>
          ) : null}

          <CellValueModal view={cellView} onClose={() => setCellView(null)} />

          {result !== null && rows.length > 0 ? (
            planText !== null ? (
              <pre className="dshdb-plan-text" aria-label="执行计划文本">
                {planText}
              </pre>
            ) : (
              <DataGrid
                columns={shownColumns}
                rows={shownRows}
                offset={offset}
                rowNumbers={filteredIndexes.map((index) => offset + index + 1)}
                storageKey="console:sql"
                sort={rowSort}
                onSort={gridSort}
                onReorderColumns={gridReorder}
                headerMenu={columnMenu}
                cellMenu={gridCellMenu}
                onCellOpen={gridCellOpen}
                emptyText="这条语句没有返回任何行"
              />
            )
          ) : (
            <div className="dshdb-grid-wrap">
              {result === null ? (
                <EmptyState
                  icon={<TerminalIcon size={22} />}
                  title="等待执行"
                  description="上面的语句会在当前数据源上运行，结果按页展示。"
                />
              ) : (
                <EmptyState
                  icon={<TerminalIcon size={22} />}
                  title={typeof result.updateCount === 'number' ? '影响行数' : '没有返回行'}
                  description={typeof result.updateCount === 'number' ? `${formatCount(result.updateCount)} 行受影响` : result.sql}
                />
              )}
            </div>
          )}

          {result !== null && rows.length > 0 ? (
            plan === null ? (
              <div className="dshdb-pager">
                {running ? <Tag tone="business">查询中</Tag> : null}
                <span className="dshdb-pager-sql" title={result.sql}>
                  {result.sql}
                </span>
                <span className="dshdb-pager-spacer" />
                <span className="dshdb-pager-filter" title="按任意列在网格里显示的文字过滤当前页（Esc 清空）">
                  <input
                    className="dshdb-input dshdb-qfilter-input"
                    aria-label="筛选结果"
                    placeholder="筛选结果"
                    value={rowFilter}
                    disabled={running}
                    onChange={(event) => setRowFilter(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Escape') return
                      event.stopPropagation()
                      setRowFilter('')
                    }}
                  />
                </span>
                {rowFilter.trim() !== '' ? (
                  <span className="dshdb-qmeta">
                    {formatCount(filteredRows.length)} / {formatCount(visibleRows.length)} 行
                  </span>
                ) : null}
                <PagerButton
                  label="|◀"
                  title="第一页"
                  onClick={() => goPage(0)}
                  disabled={!hasPrevious || running || allRows}
                />
                <PagerButton
                  label="◀"
                  title="上一页"
                  onClick={() => goPage(Math.max(page - 1, 0))}
                  disabled={!hasPrevious || running || allRows}
                />
                <span className="dshdb-pager-range">
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
                    disabled={running || allRows}
                    onChange={(event) => setPageDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        jumpToPage()
                      }
                    }}
                    onBlur={jumpToPage}
                  />
                </span>
                <select
                  className="dshdb-select dshdb-select-inline dshdb-pager-size"
                  aria-label="每页行数"
                  value={String(pageSize)}
                  disabled={running}
                  onChange={(event) => {
                    const size = Number(event.target.value)
                    setPageSize(size)
                    if (base !== '') void execute({ statement: base, page: 0, size, allowWrite: false })
                  }}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {formatCount(size)}
                    </option>
                  ))}
                  <option value={ALL_PAGE_SIZE} title={`一次取回全部结果（最多 ${formatCount(ALL_ROWS)} 行）`}>
                    全部
                  </option>
                </select>
                {allRows ? <span className="dshdb-qmeta">上限 {formatCount(ALL_ROWS)} 行</span> : null}
                <PagerButton
                  label="▶"
                  title="下一页"
                  onClick={() => goPage(page + 1)}
                  disabled={!hasNext || running || allRows}
                />
              </div>
            ) : (
              <div className="dshdb-pager">
                <Tag tone="business">执行计划</Tag>
                <span className="dshdb-pager-sql" title={plan.statements.join('\n')}>
                  {plan.statements[plan.statements.length - 1] ?? result.sql}
                </span>
                <span className="dshdb-pager-spacer" />
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={planText === null}
                  onClick={() => {
                    if (planText !== null) void copyText(planText)
                  }}
                >
                  复制计划
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPlan(null)
                    setResult(resultBeforePlan.current)
                    resultBeforePlan.current = null
                  }}
                >
                  关闭计划
                </Button>
              </div>
            )
          ) : null}
        </>
      )}

      <ConfirmDialog request={confirm?.request ?? null} onConfirm={() => resolveConfirm(true)} onCancel={() => resolveConfirm(false)} />
    </div>
  )
}

/** Render the console tab named by this tab's navigation parameters. */
export function ConsoleTab(props: ConsoleTabProps): ReactElement {
  const info = (props.useTabInfo ?? noTabInfo)()
  const params = readConsoleTabParams(info?.tab?.navigation?.params) ?? {}
  return <ConsoleBody initialConnectionId={params.connectionId} initialSql={params.sql} />
}

/** The chip text of a console tab. */
export function ConsoleTabTitle(): ReactElement {
  return (
    <span className="dshdb-tabtitle" title="查询控制台">
      <TerminalIcon size={12} />
      控制台
    </span>
  )
}

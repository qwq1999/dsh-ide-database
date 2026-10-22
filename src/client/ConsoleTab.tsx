/**
 * Query console in its own right Sidebar tab, opened from the toolbar button.
 *
 * A relational data source gets an SQL editor with paging over the statement
 * that was executed; a Redis data source gets the same split view (a grid of
 * keys on top, the selected value below) plus a command box, which is how IDEA
 * presents Redis.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import type {
  CellValue,
  ClientConnection,
  ColumnInfo,
  DbSettings,
  QueryResult,
  RedisCommandResult,
  RedisKeyInfo,
  RedisScanResult,
  RedisValue,
  Row,
} from '../shared/types'
import { ApiError, api } from './api'
import { formatCell, formatMs, looksLikeRedisWrite, looksLikeWrite, stringifyJson } from './format'
import { clearHistory, historyAgo, pushHistory, readHistory, type HistoryEntry } from './history'
import { ClockIcon, ClearIcon, DatabaseIcon, PlayIcon, StopIcon, TerminalIcon } from './icons'
import { readConsoleTabParams } from './tab-open'
import { Banner, Button, ConfirmDialog, EmptyState, Spinner, Tag, type ConfirmRequest } from './ui'

/** What the tab body receives: the framework's tab reader. */
export interface ConsoleTabProps {
  useTabInfo?: () => { tab?: { navigation?: { params?: unknown } } } | undefined
}

interface Failure {
  message: string
  detail?: string
}

const PAGE_SIZES = [200, 500, 1000, 2000, 5000]

const noTabInfo = (): undefined => undefined

/** Fold a statement onto one line for the history rows. */
function oneLine(statement: string): string {
  return statement.replace(/\s+/gu, ' ').trim()
}

function HistoryPanel(props: { entries: HistoryEntry[]; onPick: (entry: HistoryEntry) => void; onClear: () => void }): ReactElement {
  return (
    <div className="dshdb-history">
      <div className="dshdb-history-head">
        <span className="dshdb-history-title">最近执行 · {props.entries.length}</span>
        <Button size="sm" variant="ghost" icon={<ClearIcon size={12} />} onClick={props.onClear}>
          清空
        </Button>
      </div>
      <div className="dshdb-history-list">
        {props.entries.map((entry, index) => (
          <button
            key={`${entry.at}-${index}`}
            type="button"
            className="dshdb-history-row"
            title={entry.statement}
            onClick={() => props.onPick(entry)}
          >
            <span className="dshdb-history-sql">{oneLine(entry.statement)}</span>
            <span className="dshdb-history-time">{historyAgo(entry.at)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function failureText(error: unknown): Failure {
  if (error instanceof ApiError) return { message: error.message, ...(error.detail ? { detail: error.detail } : {}) }
  return { message: error instanceof Error ? error.message : String(error) }
}

function formatCount(value: number): string {
  return value.toLocaleString('en-US')
}

/** A bare single SELECT can be wrapped into a page; anything else runs whole. */
function pageable(statement: string): boolean {
  const text = statement.trim().replace(/;+\s*$/u, '')
  if (!/^select\b/iu.test(text)) return false
  if (/;\s*select/iu.test(text)) return false
  if (/\blimit\b/iu.test(text) || /\brownum\b/iu.test(text) || /\bfetch\s+(first|next)\b/iu.test(text)) return false
  return true
}

function wrapPage(dialect: ClientConnection['dialect'], statement: string, size: number, page: number): string {
  const text = statement.trim().replace(/;+\s*$/u, '')
  const offset = page * size
  if (dialect === 'oracle' || dialect === 'oceanbase-oracle' || dialect === 'dameng') {
    return `SELECT * FROM (${text}) dshdb_page OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`
  }
  return `SELECT * FROM (${text}) dshdb_page LIMIT ${size} OFFSET ${offset}`
}

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

async function queryWithRetry(id: string, sql: string, maxRows: number, allowWrite: boolean, stmtKey: string): Promise<QueryResult> {
  return withConnection(id, () => api.query({ id, sql, maxRows, allowWrite, stmtKey }))
}

function Grid({ columns, rows, offset }: { columns: ColumnInfo[]; rows: Row[]; offset: number }): ReactElement {
  return (
    <table className="dshdb-grid">
      <thead>
        <tr>
          <th className="dshdb-num">#</th>
          {columns.map((column, index) => (
            <th key={`${column.name}-${index}`} title={`${column.name} ${column.typeName}`}>
              {column.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            <td className="dshdb-num">{offset + rowIndex + 1}</td>
            {columns.map((column, columnIndex) => {
              const value: CellValue = row[columnIndex] ?? null
              return (
                <td key={`${column.name}-${columnIndex}`} title={formatCell(value)}>
                  <span className={value === null ? 'dshdb-null' : undefined}>{formatCell(value)}</span>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function KeyGrid({
  keys,
  selectedKey,
  onSelect,
}: {
  keys: RedisKeyInfo[]
  selectedKey: string
  onSelect: (key: RedisKeyInfo) => void
}): ReactElement {
  return (
    <table className="dshdb-grid">
      <thead>
        <tr>
          <th className="dshdb-num">#</th>
          <th>键</th>
          <th>类型</th>
          <th>TTL</th>
          <th>长度</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key, index) => (
          <tr
            key={key.key}
            data-active={key.key === selectedKey}
            onClick={() => onSelect(key)}
            style={{ cursor: 'pointer' }}
          >
            <td className="dshdb-num">{index + 1}</td>
            <td title={key.key}>
              <span className="dshdb-mono">{key.key}</span>
            </td>
            <td>
              <Tag>{key.type}</Tag>
            </td>
            <td className="dshdb-num">{key.ttl < 0 ? '永久' : `${key.ttl}s`}</td>
            <td className="dshdb-num">{key.size === undefined ? '' : formatCount(key.size)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
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

/** One console body: SQL editor + pager, or Redis key grid + command box. */
function ConsoleBody({ initialConnectionId }: { initialConnectionId?: string }): ReactElement {
  const [connections, setConnections] = useState<ClientConnection[]>([])
  const [settings, setSettings] = useState<DbSettings | null>(null)
  const [selectedId, setSelectedId] = useState(initialConnectionId ?? '')
  const [loadError, setLoadError] = useState('')

  const [statement, setStatement] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  const [running, setRunning] = useState(false)
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(500)
  const [base, setBase] = useState('')

  const [pattern, setPattern] = useState('*')
  const [scan, setScan] = useState<RedisScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [selectedKey, setSelectedKey] = useState('')
  const [value, setValue] = useState<RedisValue | null>(null)
  const [valueError, setValueError] = useState<Failure | null>(null)
  const [command, setCommand] = useState('')
  const [commandRunning, setCommandRunning] = useState(false)
  const [commandResult, setCommandResult] = useState<RedisCommandResult | null>(null)

  const [confirm, setConfirm] = useState<{ request: ConfirmRequest; resolve: (ok: boolean) => void } | null>(null)

  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  const stmtRef = useRef('')
  const scanCursorRef = useRef('0')
  const recallRef = useRef(-1)

  const connection = connections.find((item) => item.id === selectedId)
  const isRedis = connection?.dialect === 'redis'
  const historyKind = isRedis ? 'redis' : 'sql'

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

  // History is per console kind: switching between SQL and Redis swaps it.
  useEffect(() => {
    setHistory(readHistory(historyKind))
    setHistoryOpen(false)
    recallRef.current = -1
  }, [historyKind])

  /** Run the console statement; `page`/`size` wrap a bare SELECT into one page. */
  const execute = useCallback(
    async (target: { statement: string; page: number; size: number; allowWrite: boolean }): Promise<void> => {
      const text = target.statement.trim()
      if (text === '' || selectedId === '') return
      const stmtKey = `console-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
      stmtRef.current = stmtKey
      setRunning(true)
      setFailure(null)
      try {
        const paged = pageable(text)
        const sqlText = paged ? wrapPage(connection?.dialect ?? 'mysql', text, target.size, target.page) : text
        const next = await queryWithRetry(selectedId, sqlText, target.size, target.allowWrite, stmtKey)
        setResult(next)
        setPage(paged ? target.page : 0)
        setBase(paged ? text : '')
      } catch (error) {
        setResult(null)
        setFailure(failureText(error))
      } finally {
        setRunning(false)
      }
    },
    [connection?.dialect, selectedId],
  )

  const run = async (): Promise<void> => {
    const text = statement.trim()
    if (text === '') return
    const isWrite = looksLikeWrite(text)
    if (isWrite && settings?.confirmDestructive === true) {
      const ok = await askConfirm('即将执行写语句，可能修改或删除数据。', text)
      if (!ok) return
    }
    setHistory(pushHistory('sql', text))
    await execute({ statement: text, page: 0, size: pageSize, allowWrite: isWrite })
  }

  /** Ctrl/⌘ + ↑ recalls older statements, ↓ newer ones. */
  const recallHistory = (delta: 1 | -1): void => {
    if (history.length === 0) return
    const next = Math.min(history.length - 1, Math.max(0, recallRef.current + delta))
    recallRef.current = next
    setStatement(history[next]!.statement)
  }

  const pickHistory = (entry: HistoryEntry): void => {
    setStatement(entry.statement)
    setHistoryOpen(false)
  }

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

  /** Load one page of Redis keys; `append` continues from the last cursor. */
  const loadKeys = useCallback(
    async (append: boolean): Promise<void> => {
      if (selectedId === '') return
      setScanning(true)
      setValueError(null)
      try {
        const cursor = append ? scanCursorRef.current : '0'
        const next = await withConnection(selectedId, () =>
          api.redisScan({ id: selectedId, cursor, pattern: pattern.trim() === '' ? '*' : pattern.trim() }),
        )
        scanCursorRef.current = next.cursor
        setScan((previous) =>
          append && previous !== null && next.cursor !== '0'
            ? { ...next, keys: [...previous.keys, ...next.keys] }
            : next,
        )
      } catch (error) {
        setValueError(failureText(error))
      } finally {
        setScanning(false)
      }
    },
    [pattern, selectedId],
  )

  const runCommand = async (): Promise<void> => {
    const text = command.trim()
    if (text === '' || selectedId === '') return
    const isWrite = looksLikeRedisWrite(text)
    if (isWrite && settings?.confirmDestructive === true) {
      const ok = await askConfirm('即将执行会修改 Redis 数据的命令。', text)
      if (!ok) return
    }
    setHistory(pushHistory('redis', text))
    setCommandRunning(true)
    setValueError(null)
    try {
      const next = await withConnection(selectedId, () => api.redisCommand(selectedId, text, isWrite && connection?.readOnly !== true))
      setCommandResult(next)
      if (isWrite) await loadKeys(false)
    } catch (error) {
      setValueError(failureText(error))
    } finally {
      setCommandRunning(false)
    }
  }

  /** ↑ / ↓ in the command box walk the command history. */
  const recallCommand = (delta: 1 | -1): void => {
    if (history.length === 0) return
    const next = Math.min(history.length - 1, Math.max(0, recallRef.current + delta))
    recallRef.current = next
    setCommand(history[next]!.statement)
  }

  const selectKey = async (key: RedisKeyInfo): Promise<void> => {
    setSelectedKey(key.key)
    setValue(null)
    setValueError(null)
    if (selectedId === '') return
    try {
      const next = await withConnection(selectedId, () => api.redisKey(selectedId, key.key))
      setValue(next)
    } catch (error) {
      setValueError(failureText(error))
    }
  }

  // Switching data source resets both modes, so results never look like another source's.
  useEffect(() => {
    setResult(null)
    setFailure(null)
    setStatement('')
    setBase('')
    setPage(0)
    setScan(null)
    setSelectedKey('')
    setValue(null)
    setValueError(null)
    setCommandResult(null)
    scanCursorRef.current = '0'
  }, [selectedId])

  useEffect(() => {
    if (selectedId === '' || !isRedis) return
    void loadKeys(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, isRedis])

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

  const offset = page * pageSize
  const columns = result?.columns ?? []
  const rows = result?.rows ?? []
  const hasPrevious = page > 0
  const hasNext = result !== null && rows.length >= pageSize
  const rangeStart = rows.length === 0 ? 0 : offset + 1
  const rangeEnd = offset + rows.length

  return (
    <div className="dshdb-qtab">
      <div className="dshdb-qbar">
        <select
          className="dshdb-select dshdb-select-inline dshdb-console-select"
          aria-label="数据源"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {connections.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.dialect}
            </option>
          ))}
        </select>
        <span className="dshdb-qbar-spacer" />
        {running || scanning || commandRunning ? <Spinner /> : null}
        {result !== null && !running ? <span className="dshdb-qmeta">{formatMs(result.elapsedMs)}</span> : null}
      </div>

      {isRedis ? (
        <>
          {historyOpen ? (
            <HistoryPanel
              entries={history}
              onPick={(entry) => {
                setCommand(entry.statement)
                setHistoryOpen(false)
              }}
              onClear={() => {
                setHistory(clearHistory('redis'))
                recallRef.current = -1
              }}
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

          <div className="dshdb-grid-wrap">
            {scan === null || scan.keys.length === 0 ? (
              scanning ? (
                <div className="dshdb-empty">
                  <Spinner size={16} />
                  <span className="dshdb-muted">正在扫描键…</span>
                </div>
              ) : (
                <EmptyState icon={<DatabaseIcon size={22} />} title="没有匹配的键" description={pattern} />
              )
            ) : (
              <KeyGrid keys={scan.keys} selectedKey={selectedKey} onSelect={(key) => void selectKey(key)} />
            )}
          </div>

          {value !== null ? (
            <pre className="dshdb-console-value" title={value.key}>
              {stringifyJson(value.value)}
            </pre>
          ) : null}

          <div className="dshdb-qfilter">
            <span className="dshdb-qfilter-label">命令</span>
            <input
              className="dshdb-input dshdb-qfilter-input dshdb-command-input"
              placeholder="例如 GET shop:customer:42"
              value={command}
              spellCheck={false}
              onChange={(event) => setCommand(event.target.value)}
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
              {stringifyJson(commandResult.value)}
            </pre>
          ) : null}

        </>
      ) : (
        <>
          <textarea
            className="dshdb-input dshdb-console-input"
            placeholder="输入 SQL，Ctrl/⌘ + Enter 执行，Ctrl/⌘ + ↑↓ 切换历史"
            value={statement}
            spellCheck={false}
            onChange={(event) => setStatement(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault()
                void run()
                return
              }
              if ((event.ctrlKey || event.metaKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
                event.preventDefault()
                recallHistory(event.key === 'ArrowUp' ? 1 : -1)
              }
            }}
          />

          <div className="dshdb-qbar">
            <Button size="sm" variant="primary" icon={<PlayIcon size={12} />} onClick={() => void run()} loading={running}>
              执行
            </Button>
            <Button size="sm" variant="ghost" icon={<StopIcon size={12} />} onClick={() => void cancel()} disabled={!running}>
              取消
            </Button>
            <Button size="sm" variant="ghost" icon={<ClockIcon size={12} />} onClick={() => setHistoryOpen((open) => !open)} disabled={history.length === 0}>
              历史
            </Button>
            <span className="dshdb-qbar-spacer" />
            {base !== '' ? <span className="dshdb-qmeta">可分页查询</span> : null}
          </div>

          {historyOpen ? (
            <HistoryPanel
              entries={history}
              onPick={pickHistory}
              onClear={() => {
                setHistory(clearHistory('sql'))
                recallRef.current = -1
              }}
            />
          ) : null}

          {failure !== null ? (
            <Banner tone="error" onClose={() => setFailure(null)}>
              {failure.message}
              {failure.detail ? `\n${failure.detail}` : ''}
            </Banner>
          ) : null}

          <div className="dshdb-grid-wrap">
            {result === null ? (
              <EmptyState
                icon={<TerminalIcon size={22} />}
                title="等待执行"
                description="上面的语句会在当前数据源上运行，结果按页展示。"
              />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={<TerminalIcon size={22} />}
                title={typeof result.updateCount === 'number' ? '影响行数' : '没有返回行'}
                description={typeof result.updateCount === 'number' ? `${formatCount(result.updateCount)} 行受影响` : result.sql}
              />
            ) : (
              <Grid columns={columns} rows={rows} offset={offset} />
            )}
          </div>

          {result !== null && rows.length > 0 ? (
            <div className="dshdb-pager">
              {running ? <Tag tone="business">查询中</Tag> : null}
              <span className="dshdb-pager-sql" title={result.sql}>
                {result.sql}
              </span>
              <span className="dshdb-pager-spacer" />
              <PagerButton
                label="|◀"
                title="第一页"
                onClick={() => goPage(0)}
                disabled={!hasPrevious || running}
              />
              <PagerButton
                label="◀"
                title="上一页"
                onClick={() => goPage(Math.max(page - 1, 0))}
                disabled={!hasPrevious || running}
              />
              <span className="dshdb-pager-range">
                {formatCount(rangeStart)}-{formatCount(rangeEnd)}
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
              </select>
              <PagerButton label="▶" title="下一页" onClick={() => goPage(page + 1)} disabled={!hasNext || running} />
            </div>
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
  return <ConsoleBody initialConnectionId={params.connectionId} />
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

import { type ReactElement } from 'react'
import type { ClientConnection, QueryResult, ServerInfo } from '../../shared/types'
import { formatCell, formatMs } from '../format'
import { DatabaseIcon, PlayIcon, StopIcon } from '../icons'
import { Banner, Button, EmptyState, Panel, Select, Spinner, Tag, TextArea } from '../ui'

export interface SqlViewProps {
  connection?: ClientConnection
  server?: ServerInfo
  sql: string
  onSqlChange: (value: string) => void
  running: boolean
  result: QueryResult | null
  error: { message: string; detail?: string } | null
  elapsedMs?: number
  rows: number
  onRowsChange: (rows: number) => void
  onRun: () => void
  onCancel: () => void
  onConnect: () => void
  onClear: () => void
}

const ROW_OPTIONS = [50, 100, 200, 500, 1000].map((value) => ({ value: String(value), label: `${value} 行` }))

export function SqlView(props: SqlViewProps): ReactElement {
  const { connection, server, sql, running, result, error } = props

  if (!connection) {
    return (
      <EmptyState
        icon={<DatabaseIcon size={28} />}
        title="没有可用的 SQL 连接"
        description="先添加一个 MySQL、Oracle、达梦或 OceanBase 数据源。"
      />
    )
  }

  if (connection.dialect === 'redis') {
    return <EmptyState icon={<DatabaseIcon size={28} />} title="当前选择的是 Redis 连接" description="SQL 控制台仅支持关系型数据源。" />
  }

  const connected = server !== undefined

  const showGrid = result !== null && result.columns.length > 0 && result.rows.length > 0
  const showEmptyResult = result !== null && result.columns.length > 0 && result.rows.length === 0

  return (
    <div className="dshdb-view">
      <div className="dshdb-toolbar">
        {connected ? (
          running ? (
            <Button variant="danger" icon={<StopIcon size={12} />} onClick={props.onCancel}>
              取消
            </Button>
          ) : (
            <Button variant="primary" icon={<PlayIcon size={12} />} onClick={props.onRun}>
              执行
            </Button>
          )
        ) : (
          <Button variant="primary" onClick={props.onConnect}>
            连接
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={props.onClear}>
          清空
        </Button>
        <span className="dshdb-toolbar-spacer" />
        <span className="dshdb-muted dshdb-nowrap" style={{ fontSize: 11 }}>
          行数上限
        </span>
        <Select
          inline
          aria-label="返回行数上限"
          options={ROW_OPTIONS}
          value={String(props.rows)}
          disabled={running}
          onValueChange={(value) => props.onRowsChange(Number(value))}
        />
        {connection.readOnly ? <Tag tone="warn">只读</Tag> : null}
      </div>

      {!connected ? (
        <Banner tone="info">
          尚未连接 {connection.host}:{connection.port}，连接后可执行 SQL（面板与 Agent 工具共用同一连接）。
        </Banner>
      ) : null}

      <div className="dshdb-editor-wrap">
        <TextArea
          className="dshdb-editor"
          value={sql}
          spellCheck={false}
          placeholder="输入 SQL，Ctrl+Enter 执行"
          onChange={(event) => props.onSqlChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              props.onRun()
            }
          }}
        />
        <div className="dshdb-toolbar">
          <span className="dshdb-muted" style={{ fontSize: 11 }}>
            Ctrl+Enter 执行 · 写语句执行前会二次确认
          </span>
          <span className="dshdb-toolbar-spacer" />
          {running ? (
            <span className="dshdb-muted dshdb-inline" style={{ fontSize: 11 }}>
              <Spinner /> 执行中…
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <Banner tone="error">
          {error.message}
          {error.detail ? `\n${error.detail}` : ''}
        </Banner>
      ) : null}

      {result ? (
        <div className="dshdb-view" style={{ minHeight: 0, gap: 4 }}>
          <div className="dshdb-toolbar">
            <span className="dshdb-muted" style={{ fontSize: 11 }}>
              {result.updateCount !== undefined
                ? `影响 ${result.updateCount} 行`
                : `${result.rowCount} 行`}
              {' · '}
              {formatMs(result.elapsedMs ?? props.elapsedMs)}
            </span>
            <span className="dshdb-toolbar-spacer" />
            {result.truncated ? <Tag tone="warn">已截断</Tag> : null}
          </div>
          {result.warnings.length > 0 ? (
            <Banner tone="warn">{result.warnings.join('\n')}</Banner>
          ) : null}
          {showGrid ? (
            <div className="dshdb-grid-wrap">
              <table className="dshdb-grid">
                <thead>
                  <tr>
                    <th className="dshdb-num">#</th>
                    {result.columns.map((column, index) => (
                      <th key={`${column.name}-${index}`} title={`${column.name} ${column.typeName}`}>
                        {column.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="dshdb-num">{rowIndex + 1}</td>
                      {result.columns.map((column, columnIndex) => {
                        const value = row[columnIndex] ?? null
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
            </div>
          ) : null}
          {showEmptyResult ? (
            <Panel title="结果集为空" bodyClassName="dshdb-panel-body-pad">
              <span className="dshdb-muted" style={{ fontSize: 11 }}>
                查询成功，没有返回任何行。
              </span>
            </Panel>
          ) : null}
          {result.columns.length === 0 && result.updateCount === undefined ? (
            <Panel title="执行结果" bodyClassName="dshdb-panel-body-pad">
              <span className="dshdb-mono" style={{ fontSize: 11 }}>
                语句执行成功。
              </span>
            </Panel>
          ) : null}
          <span className="dshdb-muted dshdb-mono" style={{ fontSize: 10.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={result.sql}>
            {result.sql}
          </span>
        </div>
      ) : null}
    </div>
  )
}

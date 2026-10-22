import { useEffect, useState, type ReactElement } from 'react'
import type { ClientConnection, RedisCommandResult, RedisKeyInfo, RedisScanResult, RedisValue, ServerInfo } from '../../shared/types'
import { api } from '../api'
import { formatMs, looksLikeRedisWrite, redisCommandName, redisValuePreview, stringifyJson } from '../format'
import { KeyIcon, PlayIcon, RefreshIcon, RedisIcon, TerminalIcon } from '../icons'
import { Banner, Button, EmptyState, Panel, Select, Spinner, Tag, TextInput } from '../ui'

export interface RedisViewProps {
  connection?: ClientConnection
  server?: ServerInfo
  connecting: boolean
  onConnect: () => void
  askConfirm: (message: string, detail?: string) => Promise<boolean>
  notify: (text: string, tone?: 'info' | 'success' | 'error') => void
}

const TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'string', label: 'string' },
  { value: 'hash', label: 'hash' },
  { value: 'list', label: 'list' },
  { value: 'set', label: 'set' },
  { value: 'zset', label: 'zset' },
  { value: 'stream', label: 'stream' },
]

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function RedisView(props: RedisViewProps): ReactElement {
  const { connection, server, connecting } = props
  const [pattern, setPattern] = useState('*')
  const [type, setType] = useState('')
  const [keys, setKeys] = useState<RedisKeyInfo[]>([])
  const [cursor, setCursor] = useState('0')
  const [done, setDone] = useState(true)
  const [scanned, setScanned] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const [activeKey, setActiveKey] = useState('')
  const [value, setValue] = useState<RedisValue | null>(null)
  const [valueLoading, setValueLoading] = useState(false)

  const [command, setCommand] = useState('PING')
  const [commandResult, setCommandResult] = useState<RedisCommandResult | null>(null)
  const [commandError, setCommandError] = useState<string | null>(null)
  const [commandRunning, setCommandRunning] = useState(false)

  async function runScan(reset: boolean): Promise<void> {
    if (!connection || connection.dialect !== 'redis') return
    setScanning(true)
    setScanError(null)
    try {
      const result: RedisScanResult = await api.redisScan({
        id: connection.id,
        cursor: reset ? '0' : cursor,
        pattern: pattern || '*',
        type: type || undefined,
        count: 200,
      })
      setKeys((previous) => (reset ? result.keys : [...previous, ...result.keys]))
      setCursor(result.cursor)
      setDone(result.done)
      setScanned((previous) => (reset ? result.scanned : previous + result.scanned))
    } catch (error) {
      setScanError(errorText(error))
    } finally {
      setScanning(false)
    }
  }

  async function loadKey(key: string): Promise<void> {
    if (!connection) return
    setActiveKey(key)
    setValueLoading(true)
    try {
      setValue(await api.redisKey(connection.id, key))
    } catch (error) {
      props.notify(`读取键失败：${errorText(error)}`, 'error')
      setValue(null)
    } finally {
      setValueLoading(false)
    }
  }

  async function runCommand(): Promise<void> {
    if (!connection || command.trim() === '') return
    const isWrite = looksLikeRedisWrite(command)
    if (isWrite) {
      const ok = await props.askConfirm(
        `即将执行 Redis 命令 ${redisCommandName(command).toUpperCase()}，该命令可能修改数据。`,
        command.trim(),
      )
      if (!ok) return
    }
    setCommandRunning(true)
    setCommandError(null)
    try {
      setCommandResult(await api.redisCommand(connection.id, command.trim(), isWrite))
    } catch (error) {
      setCommandResult(null)
      setCommandError(errorText(error))
    } finally {
      setCommandRunning(false)
    }
  }

  useEffect(() => {
    setKeys([])
    setValue(null)
    setActiveKey('')
    setCommandResult(null)
    setCommandError(null)
    setScanError(null)
    setCursor('0')
    setDone(true)
    setScanned(0)
    if (connection && server && connection.dialect === 'redis') void runScan(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection?.id, server])

  if (!connection) {
    return (
      <EmptyState
        icon={<RedisIcon size={28} />}
        title="没有可用的 Redis 连接"
        description="在数据源管理中新建一个 Redis 连接（默认端口 6379），保存后即可扫描键与执行命令。"
      />
    )
  }

  if (connection.dialect !== 'redis') {
    return <EmptyState icon={<RedisIcon size={28} />} title="当前选择的是关系型数据源" description="Redis 控制台仅适用于 Redis 连接。" />
  }

  if (!server) {
    return (
      <EmptyState
        icon={<RedisIcon size={28} />}
        title={connecting ? '正在连接…' : '尚未连接'}
        description={`连接到 ${connection.host}:${connection.port} 后即可浏览键空间。`}
        actions={
          connecting ? <Spinner size={16} /> : <Button variant="primary" onClick={props.onConnect}>连接</Button>
        }
      />
    )
  }

  return (
    <div className="dshdb-view">
      <div className="dshdb-redis-bar">
        <TextInput
          value={pattern}
          onChange={(event) => setPattern(event.target.value)}
          placeholder="键模式，如 user:*"
          aria-label="键模式"
          onKeyDown={(event) => {
            if (event.key === 'Enter') void runScan(true)
          }}
        />
        <Select
          inline
          aria-label="键类型"
          options={TYPE_OPTIONS}
          value={type}
          onValueChange={setType}
        />
        <Button
          size="sm"
          icon={<RefreshIcon size={12} />}
          loading={scanning}
          onClick={() => void runScan(true)}
        >
          扫描
        </Button>
      </div>

      {scanError ? <Banner tone="error">{scanError}</Banner> : null}

      <Panel
        title={
          <span className="dshdb-inline">
            <KeyIcon size={13} /> 键
            <Tag>{keys.length}</Tag>
            {scanning ? <Spinner /> : null}
          </span>
        }
        bodyClassName="dshdb-panel-body-pad"
      >
        <div className="dshdb-keys dshdb-scroll-thin">
          {keys.length === 0 ? (
            <div className="dshdb-muted" style={{ padding: '6px 4px' }}>
              {scanning ? '正在扫描…' : scanned > 0 ? '没有匹配的键' : '点击扫描以加载键'}
            </div>
          ) : (
            keys.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className="dshdb-key-row"
                data-active={activeKey === entry.key}
                title={entry.key}
                onClick={() => void loadKey(entry.key)}
              >
                <span className="dshdb-row-label">{entry.key}</span>
                <Tag>{entry.type}</Tag>
                {entry.ttl >= 0 ? <span className="dshdb-row-meta">TTL {entry.ttl}s</span> : <span className="dshdb-row-meta">持久</span>}
              </button>
            ))
          )}
        </div>
        {!done ? (
          <div style={{ paddingTop: 6 }}>
            <Button size="sm" variant="ghost" onClick={() => void runScan(false)} disabled={scanning}>
              加载更多
            </Button>
            <span className="dshdb-muted" style={{ fontSize: 11, marginLeft: 6 }}>
              cursor {cursor}
            </span>
          </div>
        ) : null}
      </Panel>

      <Panel
        title={
          <span className="dshdb-inline">
            <RedisIcon size={13} /> 值
            {value ? (
              <>
                <Tag tone="business">{value.type}</Tag>
                <span className="dshdb-muted dshdb-mono">{activeKey}</span>
              </>
            ) : null}
          </span>
        }
        actions={value ? <span className="dshdb-muted" style={{ fontSize: 11 }}>{value.truncated ? '已截断' : `${value.size ?? '?'} 字节`}</span> : null}
        bodyClassName="dshdb-panel-body-pad"
      >
        {valueLoading ? (
          <div className="dshdb-muted dshdb-inline" style={{ padding: 6 }}>
            <Spinner /> 读取中…
          </div>
        ) : value ? (
          <>
            <div className="dshdb-toolbar" style={{ marginBottom: 6 }}>
              <Tag>{value.type}</Tag>
              <span className="dshdb-muted" style={{ fontSize: 11 }}>
                TTL {value.ttl >= 0 ? `${value.ttl}s` : '持久'}
              </span>
            </div>
            <pre className="dshdb-json">
              {typeof value.value === 'string' ? value.value : stringifyJson(value.value)}
            </pre>
            {value.preview && typeof value.value !== 'string' && value.preview !== redisValuePreview(value.value) ? (
              <div className="dshdb-muted" style={{ fontSize: 11, marginTop: 4 }}>
                {value.preview}
              </div>
            ) : null}
          </>
        ) : (
          <div className="dshdb-muted" style={{ padding: 6 }}>
            选择一个键查看内容。
          </div>
        )}
      </Panel>

      <Panel
        title={
          <span className="dshdb-inline">
            <TerminalIcon size={13} /> 命令
          </span>
        }
        actions={commandResult ? <span className="dshdb-muted" style={{ fontSize: 11 }}>{formatMs(commandResult.elapsedMs)}{commandResult.readOnly ? ' · 只读' : ' · 写命令'}</span> : null}
        bodyClassName="dshdb-panel-body-pad"
      >
        <div className="dshdb-command-row">
          <TextInput
            value={command}
            spellCheck={false}
            aria-label="Redis 命令"
            placeholder="例如 GET user:1 或 KEYS user:*"
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void runCommand()
            }}
          />
          <Button variant="primary" icon={<PlayIcon size={12} />} loading={commandRunning} onClick={() => void runCommand()}>
            执行
          </Button>
        </div>
        <div className="dshdb-muted" style={{ fontSize: 11, marginTop: 4 }}>
          只读命令直接执行；写命令需要二次确认，且只读连接会拒绝。
        </div>
        {commandError ? (
          <div style={{ marginTop: 6 }}>
            <Banner tone="error">{commandError}</Banner>
          </div>
        ) : null}
        {commandResult ? (
          <pre className="dshdb-json" style={{ marginTop: 6 }}>
            {typeof commandResult.value === 'string' ? commandResult.value : stringifyJson(commandResult.value)}
          </pre>
        ) : null}
      </Panel>
    </div>
  )
}

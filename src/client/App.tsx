import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { ROUTE_PREFIX } from '../shared/presets'
import type {
  ClientConnection,
  DbSettings,
  DriverStatus,
  EnvStatus,
  QueryResult,
  SchemaInfo,
  SchemaObject,
  ServerInfo,
  StructureSnapshot,
  TableDescription,
} from '../shared/types'
import { api } from './api'
import { looksLikeWrite } from './format'
import { PlusIcon, RefreshIcon, SettingsIcon, TrashIcon } from './icons'
import { ConnectionModal } from './modals/ConnectionModal'
import { DriverModal } from './modals/DriverModal'
import { SettingsModal } from './modals/SettingsModal'
import { DataView } from './views/DataView'
import { RedisView } from './views/RedisView'
import { SqlView } from './views/SqlView'
import { openTableTab } from './tab-open'
import {
  Banner,
  Button,
  ConfirmDialog,
  Spinner,
  StateDot,
  Toast,
  type ConfirmRequest,
  type ToastState,
} from './ui'

type ViewKey = 'data' | 'sql' | 'redis'

interface Snapshot {
  connections: ClientConnection[]
  drivers: DriverStatus[]
  settings: DbSettings
  env: EnvStatus
}

interface QueryState {
  running: boolean
  result: QueryResult | null
  error: { message: string; detail?: string } | null
}

export interface AppProps {
  useTabInfo?: () => { tab?: { visible?: boolean } } | undefined
  sessionId?: string
}

const noopTabInfo = (): undefined => undefined

const VIEW_LABELS: [ViewKey, string][] = [
  ['data', '数据'],
  ['sql', 'SQL'],
  ['redis', 'Redis'],
]

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function qualifiedName(dialect: ClientConnection['dialect'], schema: string, table: string): string {
  if (dialect === 'mysql') return `\`${schema}\`.\`${table}\``
  return `"${schema}"."${table}"`
}

function ToolButton({
  icon,
  children,
  title,
  onClick,
  disabled,
}: {
  icon: ReactNode
  children: ReactNode
  title: string
  onClick: () => void
  disabled?: boolean
}): ReactElement {
  return (
    <button type="button" className="dshdb-toolbtn" title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      {icon}
      <span>{children}</span>
    </button>
  )
}

export function App(props: AppProps): ReactElement {
  const info = (props.useTabInfo ?? noopTabInfo)()
  const hidden = info?.tab?.visible === false

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [servers, setServers] = useState<Record<string, ServerInfo>>({})
  const [connectingId, setConnectingId] = useState('')
  const [view, setView] = useState<ViewKey>('data')

  const [schemas, setSchemas] = useState<Record<string, SchemaInfo[]>>({})
  const [objects, setObjects] = useState<Record<string, SchemaObject[]>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loadingSchemas, setLoadingSchemas] = useState<Record<string, boolean>>({})
  const [loadingObjects, setLoadingObjects] = useState<Record<string, boolean>>({})
  const [cachedAt, setCachedAt] = useState<Record<string, string>>({})
  const [descriptions, setDescriptions] = useState<Record<string, TableDescription>>({})
  const [loadingDescriptions, setLoadingDescriptions] = useState<Record<string, boolean>>({})
  const [detail, setDetail] = useState<TableDescription | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedKey, setSelectedKey] = useState('')

  const [sql, setSql] = useState('SELECT 1')
  const [rows, setRows] = useState(200)
  const [query, setQuery] = useState<QueryState>({ running: false, result: null, error: null })
  const stmtRef = useRef('')

  const [toast, setToast] = useState<ToastState | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [downloading, setDownloading] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [confirm, setConfirm] = useState<{ request: ConfirmRequest; resolve: (ok: boolean) => void } | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [connModal, setConnModal] = useState<{ open: boolean; editing: ClientConnection | null }>({
    open: false,
    editing: null,
  })
  const [driverModal, setDriverModal] = useState<{ open: boolean; editing: DriverStatus | null }>({
    open: false,
    editing: null,
  })

  const notify = useCallback((text: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast({ text, tone, seq: Date.now() })
  }, [])

  const askConfirm = useCallback((message: string, detail?: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirm({
        request: { title: '确认操作', message, detail, danger: true, confirmLabel: '继续' },
        resolve,
      })
    })
  }, [])

  const resolveConfirm = (ok: boolean) => {
    confirm?.resolve(ok)
    setConfirm(null)
  }

  const refresh = useCallback(async () => {
    try {
      const data = await api.status()
      setSnapshot({ connections: data.config.connections, drivers: data.drivers, settings: data.config.settings, env: data.env })
      setLoadError('')
    } catch (error) {
      setLoadError(errorText(error))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Cached structure lets the tree render before (or without) a connection.
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const { structures } = await api.structure()
        if (!alive) return
        applyStructures(structures)
      } catch {
        // A missing cache only means an empty tree until the first connect.
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyStructures(structures: StructureSnapshot): void {
    const nextSchemas: Record<string, SchemaInfo[]> = {}
    const nextObjects: Record<string, SchemaObject[]> = {}
    const nextCached: Record<string, string> = {}
    const nextDescriptions: Record<string, TableDescription> = {}
    for (const [connectionId, entry] of Object.entries(structures)) {
      if (entry.schemas.length > 0) nextSchemas[connectionId] = entry.schemas
      for (const [schema, list] of Object.entries(entry.objects)) {
        nextObjects[`${connectionId}:${schema}`] = list
      }
      for (const [key, description] of Object.entries(entry.descriptions ?? {})) {
        nextDescriptions[`${connectionId}|${key}`] = description
      }
      nextCached[connectionId] = entry.fetchedAt
    }
    setSchemas((previous) => ({ ...nextSchemas, ...previous }))
    setObjects((previous) => ({ ...nextObjects, ...previous }))
    setDescriptions((previous) => ({ ...nextDescriptions, ...previous }))
    setCachedAt((previous) => ({ ...nextCached, ...previous }))
  }

  useEffect(() => {
    if (!snapshot) return
    const exists = snapshot.connections.some((connection) => connection.id === selectedId)
    if (!exists) {
      // Keep cached structures: they are keyed by connection id and the tree
      // filters by `snapshot.connections`, so stale entries are harmless.
      setSelectedId(snapshot.connections[0]?.id ?? '')
      setServers({})
      setDetail(null)
      setSelectedKey('')
    }
  }, [snapshot, selectedId])

  useEffect(() => {
    setDetail(null)
    setSelectedKey('')
  }, [selectedId])

  const connections = snapshot?.connections ?? []
  const selected = connections.find((connection) => connection.id === selectedId)
  const server = selected ? servers[selected.id] : undefined

  async function loadSchemas(connectionId: string): Promise<void> {
    setLoadingSchemas((previous) => ({ ...previous, [connectionId]: true }))
    try {
      const result = await api.schemas(connectionId)
      setSchemas((previous) => ({ ...previous, [connectionId]: result.schemas }))
      if (result.fetchedAt !== undefined) {
        const stamp = result.fetchedAt
        setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }))
      }
      setObjects((previous) => {
        const next = { ...previous }
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${connectionId}:`)) delete next[key]
        }
        return next
      })
      setDescriptions((previous) => {
        const next = { ...previous }
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${connectionId}|`)) delete next[key]
        }
        return next
      })
      setExpanded((previous) => {
        const next = { ...previous }
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${connectionId}:`)) delete next[key]
        }
        return next
      })
    } catch (error) {
      notify(`加载 schema 失败：${errorText(error)}`, 'error')
    } finally {
      setLoadingSchemas((previous) => ({ ...previous, [connectionId]: false }))
    }
  }

  async function connect(connectionId: string): Promise<void> {
    const connection = connections.find((item) => item.id === connectionId)
    if (!connection) return
    setConnectingId(connectionId)
    setQuery({ running: false, result: null, error: null })
    try {
      const connected = await api.connect(connectionId)
      setServers((previous) => ({ ...previous, [connectionId]: connected }))
      notify('连接成功', 'success')
      if (connection.dialect === 'redis') {
        setView('redis')
      } else {
        await loadSchemas(connectionId)
      }
    } catch (error) {
      notify(`连接失败：${errorText(error)}`, 'error')
    } finally {
      setConnectingId('')
    }
  }

  async function disconnect(connectionId: string): Promise<void> {
    try {
      await api.disconnect(connectionId)
      setServers((previous) => {
        const next = { ...previous }
        delete next[connectionId]
        return next
      })
      setDetail(null)
      setSelectedKey('')
      notify('已断开', 'info')
    } catch (error) {
      notify(`断开失败：${errorText(error)}`, 'error')
    }
  }

  function selectConnection(id: string): void {
    setSelectedId(id)
    const connection = connections.find((item) => item.id === id)
    if (connection?.dialect === 'redis') setView('redis')
    else if (view === 'redis') setView('data')
  }

  function toggleConnection(id: string): void {
    const isExpanded = expanded[id] === true
    setExpanded((previous) => ({ ...previous, [id]: !isExpanded }))
  }

  function toggleFolder(connectionId: string, schema: string, folder: string): void {
    const key = `${connectionId}:${schema}#${folder}`
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  }

  async function toggleSchema(connectionId: string, schema: string): Promise<void> {
    const key = `${connectionId}:${schema}`
    const isExpanded = expanded[key] === true
    setExpanded((previous) => ({ ...previous, [key]: !isExpanded }))
    if (isExpanded || objects[key] !== undefined) return
    setLoadingObjects((previous) => ({ ...previous, [key]: true }))
    try {
      const result = await api.objects(connectionId, schema)
      setObjects((previous) => ({ ...previous, [key]: result.objects }))
      if (result.fetchedAt !== undefined) {
        const stamp = result.fetchedAt
        setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }))
      }
    } catch (error) {
      notify(`加载对象失败：${errorText(error)}`, 'error')
    } finally {
      setLoadingObjects((previous) => ({ ...previous, [key]: false }))
    }
  }

  async function selectObject(connectionId: string, schema: string, object: SchemaObject): Promise<void> {
    const key = `${connectionId}|${schema}.${object.name}`
    setSelectedId(connectionId)
    setSelectedKey(key)
    // Routines, sequences and triggers have no column structure of their own.
    if (object.kind !== 'table' && object.kind !== 'view') {
      setDetailLoading(false)
      setDetail({ schema, table: object.name, kind: object.kind, columns: [], indexes: [] })
      return
    }
    const known = descriptions[key]
    if (known !== undefined) {
      setDetailLoading(false)
      setDetail(known)
      return
    }
    if (!servers[connectionId]) {
      setDetailLoading(false)
      setDetail(null)
      notify('数据源未连接，连接后可查看表结构', 'info')
      return
    }
    setDetailLoading(true)
    setLoadingDescriptions((previous) => ({ ...previous, [key]: true }))
    try {
      const description = await api.describe(connectionId, schema, object.name, object.kind)
      setDescriptions((previous) => ({ ...previous, [key]: description }))
      setDetail(description)
    } catch (error) {
      setDetail(null)
      notify(`读取表结构失败：${errorText(error)}`, 'error')
    } finally {
      setDetailLoading(false)
      setLoadingDescriptions((previous) => ({ ...previous, [key]: false }))
    }
  }

  function toggleKey(key: string): void {
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  }

  function queryObject(connectionId: string, schema: string, object: { name: string; kind: string }): void {
    const connection = connections.find((item) => item.id === connectionId)
    if (!connection) return
    setSelectedId(connectionId)
    setSql(`SELECT * FROM ${qualifiedName(connection.dialect, schema, object.name)}`)
    setView('sql')
  }

  /** Toolbar 刷新：重读选中数据源（未连接则连接，已连接则刷新库表结构）。 */
  async function refreshSelected(): Promise<void> {
    setDetail(null)
    setSelectedKey('')
    if (!selected) {
      await refresh()
      return
    }
    if (!servers[selected.id] || selected.dialect === 'redis') {
      await connect(selected.id)
      await refresh()
      return
    }
    await loadSchemas(selected.id)
    await refresh()
    notify('已刷新数据源', 'success')
  }

  async function runSql(): Promise<void> {
    if (!selected || !server) {
      notify('请先连接数据源', 'error')
      return
    }
    const text = sql.trim()
    if (text === '') return
    const isWrite = looksLikeWrite(text)
    if (isWrite && snapshot?.settings.confirmDestructive) {
      const ok = await askConfirm('即将执行写语句，可能修改或删除数据。', text)
      if (!ok) return
    }
    const stmtKey = `panel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    stmtRef.current = stmtKey
    setQuery({ running: true, result: null, error: null })
    try {
      const result = await api.query({
        id: selected.id,
        sql: text,
        maxRows: rows,
        stmtKey,
        allowWrite: isWrite,
      })
      setQuery({ running: false, result, error: null })
    } catch (error) {
      setQuery({ running: false, result: null, error: { message: errorText(error) } })
    }
  }

  async function cancelQuery(): Promise<void> {
    if (stmtRef.current === '') return
    try {
      await api.cancel(stmtRef.current)
      notify('已请求取消', 'info')
    } catch (error) {
      notify(`取消失败：${errorText(error)}`, 'error')
    }
  }

  async function saveSettings(next: DbSettings): Promise<void> {
    setSavingSettings(true)
    try {
      const result = await api.updateSettings(next)
      setSnapshot((previous) =>
        previous ? { ...previous, settings: result.settings, env: result.env } : previous,
      )
      notify('设置已保存', 'success')
      void refresh()
    } catch (error) {
      notify(`保存设置失败：${errorText(error)}`, 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  async function downloadDriver(driverId: string): Promise<void> {
    setDownloading(driverId)
    try {
      const status = await api.downloadDriver(driverId)
      setSnapshot((previous) =>
        previous
          ? { ...previous, drivers: previous.drivers.map((driver) => (driver.id === status.id ? status : driver)) }
          : previous,
      )
      notify('驱动依赖已就绪', 'success')
    } catch (error) {
      notify(`下载失败：${errorText(error)}`, 'error')
    } finally {
      setDownloading('')
    }
  }

  async function deleteCustomDriver(driver: DriverStatus): Promise<void> {
    const ok = await askConfirm(`删除自定义驱动「${driver.name}」？使用它的连接将无法连接。`)
    if (!ok) return
    try {
      const result = await api.deleteCustomDriver(driver.id)
      setSnapshot((previous) => (previous ? { ...previous, drivers: result.drivers } : previous))
      notify('自定义驱动已删除', 'success')
    } catch (error) {
      notify(`删除失败：${errorText(error)}`, 'error')
    }
  }

  async function deleteConnection(connection: ClientConnection): Promise<void> {
    const ok = await askConfirm(`删除连接「${connection.name}」？保存的密码也会一并删除。`)
    if (!ok) return
    setDeleting(true)
    try {
      await api.deleteConnection(connection.id)
      setConnModal({ open: false, editing: null })
      notify('连接已删除', 'success')
      await refresh()
    } catch (error) {
      notify(`删除失败：${errorText(error)}`, 'error')
    } finally {
      setDeleting(false)
    }
  }

  const rootStyle: CSSProperties = {
    display: hidden ? 'none' : 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  }

  return (
    <div className="dshdb-root" style={rootStyle} data-plugin-route={ROUTE_PREFIX}>
      {/* IDEA 风格工具窗口：工具栏左对齐，下面是数据源列表 */}
      <div className="dshdb-toolbar dshdb-toolbar-top" role="toolbar" aria-label="数据库工具栏">
        <ToolButton
          title="新增数据源"
          icon={<PlusIcon size={14} />}
          onClick={() => setConnModal({ open: true, editing: null })}
        >
          新增
        </ToolButton>
        <ToolButton
          title="刷新选中的数据源"
          icon={<RefreshIcon size={14} />}
          onClick={() => void refreshSelected()}
          disabled={connectingId !== ''}
        >
          刷新
        </ToolButton>
        <ToolButton
          title="删除选中的数据源"
          icon={<TrashIcon size={14} />}
          onClick={() => {
            if (selected) void deleteConnection(selected)
          }}
          disabled={!selected || deleting}
        >
          删除
        </ToolButton>
        <ToolButton title="设置" icon={<SettingsIcon size={14} />} onClick={() => setSettingsOpen(true)}>
          设置
        </ToolButton>
        <span className="dshdb-toolbar-spacer" />
        <div className="dshdb-seg" role="tablist" aria-label="视图">
          {VIEW_LABELS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              className="dshdb-tab"
              data-active={view === key}
              onClick={() => setView(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="dshdb-main">
        {loadError ? (
          <div className="dshdb-scroll">
            <Banner tone="error">加载插件状态失败：{loadError}</Banner>
          </div>
        ) : null}

        {!snapshot && !loadError ? (
          <div className="dshdb-empty">
            <Spinner size={18} />
            <span className="dshdb-muted">正在加载数据源…</span>
          </div>
        ) : null}

        {snapshot ? (
          <>
            <div
              className="dshdb-view"
              style={{ display: view === 'data' ? 'flex' : 'none', padding: '8px 10px 12px', minHeight: 0 }}
            >
              <DataView
                connections={connections}
                selectedId={selectedId}
                servers={servers}
                connectingId={connectingId}
                schemas={schemas}
                objects={objects}
                expanded={expanded}
                loadingSchemas={loadingSchemas}
                loadingObjects={loadingObjects}
                cachedAt={cachedAt}
                descriptions={descriptions}
                loadingDescriptions={loadingDescriptions}
                detail={detail}
                detailLoading={detailLoading}
                selectedKey={selectedKey}
                onAddConnection={() => setConnModal({ open: true, editing: null })}
                onSelectConnection={selectConnection}
                onToggleConnection={toggleConnection}
                onConnect={(id) => void connect(id)}
                onToggleSchema={(connectionId, schema) => void toggleSchema(connectionId, schema)}
                onToggleFolder={toggleFolder}
                onToggleKey={toggleKey}
                onSelectObject={(connectionId, schema, object) => void selectObject(connectionId, schema, object)}
                onQueryObject={(connectionId, schema, object) => queryObject(connectionId, schema, object)}
                onOpenTable={(connectionId, schema, object) => {
                  setSelectedId(connectionId)
                  openTableTab({ connectionId, schema, table: object.name })
                }}
                onOpenRedis={(id) => {
                  selectConnection(id)
                  setView('redis')
                }}
              />
            </div>

            <div
              className="dshdb-view"
              style={{ display: view === 'sql' ? 'flex' : 'none', padding: '8px 10px 12px', minHeight: 0 }}
            >
              <SqlView
                connection={selected}
                server={server}
                sql={sql}
                onSqlChange={setSql}
                running={query.running}
                result={query.result}
                error={query.error}
                elapsedMs={query.result?.elapsedMs}
                rows={rows}
                onRowsChange={setRows}
                onRun={() => void runSql()}
                onCancel={() => void cancelQuery()}
                onConnect={() => {
                  if (selected) void connect(selected.id)
                }}
                onClear={() => setSql('')}
              />
            </div>

            <div
              className="dshdb-view"
              style={{ display: view === 'redis' ? 'flex' : 'none', padding: '8px 10px 12px', minHeight: 0 }}
            >
              <RedisView
                connection={selected}
                server={server}
                connecting={connectingId === selectedId}
                onConnect={() => {
                  if (selected) void connect(selected.id)
                }}
                askConfirm={askConfirm}
                notify={notify}
              />
            </div>
          </>
        ) : null}
      </main>

      <footer className="dshdb-statusbar">
        {selected ? (
          <>
            <StateDot tone={server ? 'success' : connectingId === selectedId ? 'warn' : 'idle'} />
            <span title={selected.name}>{selected.name}</span>
            <span>·</span>
            <span className="dshdb-mono">
              {selected.host}:{selected.port}
            </span>
            {selected.database ? <span className="dshdb-mono">/{selected.database}</span> : null}
            {server ? (
              <Button size="sm" variant="ghost" onClick={() => void disconnect(selected.id)}>
                断开
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                loading={connectingId === selected.id}
                onClick={() => void connect(selected.id)}
              >
                连接
              </Button>
            )}
          </>
        ) : (
          <span>尚未选择数据源</span>
        )}
        <span className="dshdb-statusbar-spacer" />
        {snapshot ? (
          <span title={snapshot.env.configPath}>
            Java {snapshot.env.java.available ? snapshot.env.java.version ?? '可用' : '未找到'} · v{snapshot.env.pluginVersion}
          </span>
        ) : null}
      </footer>

      <ConnectionModal
        open={connModal.open}
        editing={connModal.editing}
        drivers={snapshot?.drivers ?? []}
        onClose={() => setConnModal({ open: false, editing: null })}
        onSaved={() => void refresh()}
        onDelete={(connection) => void deleteConnection(connection)}
        notify={notify}
      />
      <DriverModal
        open={driverModal.open}
        editing={driverModal.editing}
        onClose={() => setDriverModal({ open: false, editing: null })}
        onSaved={(drivers) => setSnapshot((previous) => (previous ? { ...previous, drivers } : previous))}
        notify={notify}
      />
      {snapshot ? (
        <SettingsModal
          open={settingsOpen}
          settings={snapshot.settings}
          env={snapshot.env}
          drivers={snapshot.drivers}
          saving={savingSettings}
          downloading={downloading}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => void saveSettings(next)}
          onRefresh={() => void refresh()}
          onDownload={(driverId) => void downloadDriver(driverId)}
          onAddCustomDriver={() => setDriverModal({ open: true, editing: null })}
          onEditCustomDriver={(driver) => setDriverModal({ open: true, editing: driver })}
          onDeleteCustomDriver={(driver) => void deleteCustomDriver(driver)}
        />
      ) : null}
      <ConfirmDialog request={confirm?.request ?? null} onConfirm={() => resolveConfirm(true)} onCancel={() => resolveConfirm(false)} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

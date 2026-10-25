import { useCallback, useState, type CSSProperties, type ReactElement } from 'react'
import { ROUTE_PREFIX } from '../shared/presets'
import type { ClientConnection, DbSettings, DriverStatus } from '../shared/types'
import { api } from './api'
import { useDataSources } from './hooks/useDataSources'
import { copyText } from './colmenu'
import { EditIcon, PlusIcon, RefreshIcon, SettingsIcon, TerminalIcon, TrashIcon } from './icons'
import { ConnectionModal } from './modals/ConnectionModal'
import { DriverModal } from './modals/DriverModal'
import { SettingsModal } from './modals/SettingsModal'
import { DataView } from './views/DataView'
import { openConsoleTab, openTableTab } from './tab-open'
import { tableSelectSql } from './tablesql'
import {
  Banner,
  Button,
  ConfirmDialog,
  Modal,
  Spinner,
  StateDot,
  Toast,
  nextToast,
  type ConfirmRequest,
  type ToastState,
} from './ui'

export interface AppProps {
  useTabInfo?: () => { tab?: { visible?: boolean } } | undefined
  sessionId?: string
}

const noopTabInfo = (): undefined => undefined

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function ToolButton({
  title,
  icon,
  onClick,
  disabled,
  children,
}: {
  title: string
  icon: ReactElement
  onClick: () => void
  disabled?: boolean
  children: string
}): ReactElement {
  return (
    <button
      type="button"
      className="dshdb-toolbtn"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

export function App(props: AppProps): ReactElement {
  const info = (props.useTabInfo ?? noopTabInfo)()
  const hidden = info?.tab?.visible === false

  const [toast, setToast] = useState<ToastState | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [downloading, setDownloading] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
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
  const [ddlModal, setDdlModal] = useState<{
    open: boolean
    title: string
    text: string
    loading: boolean
    source: string
    warnings: string[]
  }>({
    open: false,
    title: '',
    text: '',
    loading: false,
    source: '',
    warnings: [],
  })

  const notify = useCallback((text: string, tone: 'info' | 'success' | 'error' = 'info') => {
    setToast((previous) => nextToast(previous, text, tone))
  }, [])

  const {
    snapshot,
    loadError,
    selectedId,
    selectConnection,
    selected,
    server,
    servers,
    connectingId,
    connections,
    schemas,
    objects,
    expanded,
    loadingSchemas,
    loadingObjects,
    cachedAt,
    descriptions,
    loadingDescriptions,
    detail,
    detailLoading,
    selectedKey,
    redisKeys,
    redisCursor,
    loadingRedisKeys,
    redisDatabases,
    redisDbs,
    visibleSchemas,
    redisDetail,
    redisDetailDb,
    redisDetailLoading,
    refresh,
    connect,
    disconnect,
    refreshSelected,
    toggleConnection,
    toggleFolder,
    toggleSchema,
    loadObjects,
    loadRedisKeys,
    toggleRedisDb,
    toggleKey,
    selectObject,
    selectSchema,
    selectFolder,
    selectRedisDb,
    selectRedisKey,
    toggleSchemaVisible,
    toggleAllSchemasVisible,
    toggleRedisDbVisible,
    toggleAllRedisDbsVisible,
    updateDrivers,
    applySettings,
  } = useDataSources(notify)

  const askConfirm = useCallback((message: string, detail?: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirm({
        request: { title: '确认操作', message, detail, danger: true, confirmLabel: '继续' },
        resolve,
      })
    })
  }, [])

  const resolveConfirm = (ok: boolean): void => {
    confirm?.resolve(ok)
    setConfirm(null)
  }

  /** 双击表 / DDL 按钮：读取表或视图的建表语句。 */
  async function showDdl(connectionId: string, schema: string, table: string, kind: string): Promise<void> {
    const title = `${schema}.${table} · DDL`
    setDdlModal({ open: true, title, text: '', loading: true, source: '', warnings: [] })
    try {
      const result = await api.ddl(connectionId, schema, table, kind)
      setDdlModal({ open: true, title, text: result.ddl, loading: false, source: result.source, warnings: result.warnings })
    } catch (error) {
      setDdlModal({ open: false, title: '', text: '', loading: false, source: '', warnings: [] })
      notify(`读取 DDL 失败：${errorText(error)}`, 'error')
    }
  }

  async function copyDdl(): Promise<void> {
    const copied = await copyText(ddlModal.text)
    notify(copied ? 'DDL 已复制' : '复制失败：这个环境不允许访问剪贴板', copied ? 'success' : 'error')
  }

  async function saveSettings(next: DbSettings): Promise<void> {
    setSavingSettings(true)
    try {
      const result = await api.updateSettings(next)
      applySettings(result.settings, result.env)
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
      updateDrivers((snapshot?.drivers ?? []).map((driver) => (driver.id === status.id ? status : driver)))
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
      updateDrivers(result.drivers)
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
          title="编辑选中的数据源"
          icon={<EditIcon size={14} />}
          onClick={() => {
            if (selected) setConnModal({ open: true, editing: selected })
          }}
          disabled={!selected || deleting}
        >
          编辑
        </ToolButton>
        <ToolButton
          title="刷新选中的数据源"
          icon={<RefreshIcon size={14} />}
          onClick={() => {
            if (refreshing) return
            setRefreshing(true)
            void refreshSelected().finally(() => setRefreshing(false))
          }}
          disabled={connectingId !== '' || refreshing}
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
        <ToolButton
          title="查询控制台"
          icon={<TerminalIcon size={14} />}
          onClick={() => openConsoleTab({ connectionId: selected?.id })}
        >
          控制台
        </ToolButton>
        <ToolButton title="设置" icon={<SettingsIcon size={14} />} onClick={() => setSettingsOpen(true)}>
          设置
        </ToolButton>
        <span className="dshdb-toolbar-spacer" />
      </div>

      <main className="dshdb-main">
        {loadError ? (
          <div className="dshdb-scroll">
            <Banner
              tone="error"
              actions={
                <Button
                  size="sm"
                  variant="ghost"
                  title="复制错误信息"
                  onClick={() => void copyText('加载插件状态失败：' + loadError)}
                >
                  复制
                </Button>
              }
            >
              加载插件状态失败：{loadError}
            </Banner>
          </div>
        ) : null}

        {!snapshot && !loadError ? (
          <div className="dshdb-empty">
            <Spinner size={18} />
            <span className="dshdb-muted">正在加载数据源…</span>
          </div>
        ) : null}

        {snapshot ? (
          <div className="dshdb-view" style={{ padding: '8px 10px 12px', minHeight: 0 }}>
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
              redisKeys={redisKeys}
              redisCursor={redisCursor}
              loadingRedisKeys={loadingRedisKeys}
              redisDatabases={redisDatabases}
              redisDbs={redisDbs}
              visibleSchemas={visibleSchemas}
              redisDetail={redisDetail}
              redisDetailDb={redisDetailDb}
              redisDetailLoading={redisDetailLoading}
              onAddConnection={() => setConnModal({ open: true, editing: null })}
              onSelectConnection={selectConnection}
              onToggleConnection={toggleConnection}
              onConnect={(id) => void connect(id)}
              onRefresh={() => void refreshSelected()}
              onToggleSchema={(connectionId, schema) => void toggleSchema(connectionId, schema)}
              onLoadObjects={(connectionId, schema) => void loadObjects(connectionId, schema)}
              onToggleFolder={toggleFolder}
              onToggleKey={toggleKey}
              onSelectObject={(connectionId, schema, object) => void selectObject(connectionId, schema, object)}
              onSelectSchema={selectSchema}
              onSelectFolder={selectFolder}
              onSelectRedisDb={selectRedisDb}
              onSelectRedisKey={(connectionId, db, key) => void selectRedisKey(connectionId, db, key)}
              onToggleRedisDb={toggleRedisDb}
              onLoadRedisKeys={(connectionId, db, more) => void loadRedisKeys(connectionId, db, more)}
              onToggleSchemaVisible={toggleSchemaVisible}
              onToggleAllSchemasVisible={toggleAllSchemasVisible}
              onToggleRedisDbVisible={toggleRedisDbVisible}
              onToggleAllRedisDbsVisible={toggleAllRedisDbsVisible}
              onShowDdl={(connectionId, schema, table, kind) => void showDdl(connectionId, schema, table, kind)}
              onOpenTable={(connectionId, schema, object) => {
                selectConnection(connectionId)
                openTableTab({ connectionId, schema, table: object.name, kind: object.kind === 'view' ? 'view' : 'table' })
              }}
              onOpenConsole={(connectionId, schema, table) => {
                const connection = connections.find((item) => item.id === connectionId)
                if (connection === undefined) return
                selectConnection(connectionId)
                openConsoleTab({ connectionId, sql: tableSelectSql(connection.dialect, schema, table, '', '', 500) })
              }}
            />
          </div>
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
            {selected.dialect === 'redis' ? (
              <span className="dshdb-mono">/db{selected.redisDb}</span>
            ) : selected.database ? (
              <span className="dshdb-mono">/{selected.database}</span>
            ) : null}
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
        onSaved={updateDrivers}
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
      <Modal
        open={ddlModal.open}
        title={ddlModal.title}
        width={760}
        onClose={() => setDdlModal({ open: false, title: '', text: '', loading: false, source: '', warnings: [] })}
        footer={
          <>
            <span className="dshdb-muted">
              {ddlModal.source === 'generated' ? '按结构重建的 DDL' : ddlModal.source === 'server' ? '服务器返回的 DDL' : ''}
            </span>
            <span className="dshdb-toolbar-spacer" />
            <Button size="sm" onClick={() => void copyDdl()} disabled={ddlModal.text === ''}>
              复制
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setDdlModal({ open: false, title: '', text: '', loading: false, source: '', warnings: [] })}
            >
              关闭
            </Button>
          </>
        }
      >
        {ddlModal.loading ? (
          <div className="dshdb-empty">
            <Spinner size={16} />
            <span className="dshdb-muted">正在读取 DDL…</span>
          </div>
        ) : (
          <>
            {ddlModal.warnings.length > 0 ? (
              <Banner tone="warn">{ddlModal.warnings.join('；')}</Banner>
            ) : null}
            <pre className="dshdb-ddl">{ddlModal.text}</pre>
          </>
        )}
      </Modal>
      <ConfirmDialog request={confirm?.request ?? null} onConfirm={() => resolveConfirm(true)} onCancel={() => resolveConfirm(false)} />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  )
}

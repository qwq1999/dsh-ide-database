import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from 'react'
import { ROUTE_PREFIX } from '../shared/presets'
import type { ClientConnection, ClientTrashedConnection, DbSettings, DriverStatus } from '../shared/types'
import { api } from './api'
import { downloadText } from './export'
import { useDataSources } from './hooks/useDataSources'
import { setKeybindings } from './keymap'
import { setConsoleActionOrder } from './consoleactions'
import { setConsoleAutoComplete } from './consoleprefs'
import {
  setToolbarActionOrder,
  toolbarActionIcon,
  useToolbarActionOrder,
} from './toolbaractions'
import { fitActionCount } from './toolbaroverflow'
import { usePopoverDismiss } from './popover'
import type { ToolbarActionId } from '../shared/toolbaractions'
import { copyText } from './colmenu'
import { MoreIcon } from './icons'
import { ConnectionModal } from './modals/ConnectionModal'
import { DriverModal } from './modals/DriverModal'
import { SettingsModal } from './modals/SettingsModal'
import { TrashModal, type TrashBusy } from './modals/TrashModal'
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
  const [downloadingJava, setDownloadingJava] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [trashBusy, setTrashBusy] = useState<TrashBusy | null>(null)
  const [emptyingTrash, setEmptyingTrash] = useState(false)
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
    trash,
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
    selectedSchema,
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
    reorderConnections,
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
    setupError,
    dismissSetupError,
  } = useDataSources(notify)

  // 快捷键处理函数在下面的各个组件里，绑定统一在这里发布一次，
  // 免得为了一个 Record 把每一层组件的 props 都改一遍。
  useEffect(() => {
    setKeybindings(snapshot?.settings.keybindings)
  }, [snapshot?.settings.keybindings])

  // 控制台工具栏的顺序存在设置里，和快捷键一样统一发布给控制台标签页。
  useEffect(() => {
    setConsoleActionOrder(snapshot?.settings.consoleActions)
  }, [snapshot?.settings.consoleActions])

  // 控制台「输入时自动展开补全」开关同样从设置发布给控制台标签页。
  useEffect(() => {
    setConsoleAutoComplete(snapshot?.settings.consoleAutoComplete !== false)
  }, [snapshot?.settings.consoleAutoComplete])

  // 数据源工具栏的顺序也存在设置里：本组件既发布它，也按它渲染按钮。
  useEffect(() => {
    setToolbarActionOrder(snapshot?.settings.toolbarActions)
  }, [snapshot?.settings.toolbarActions])

  const toolbarOrder = useToolbarActionOrder()
  const [visibleToolbarActions, setVisibleToolbarActions] = useState(toolbarOrder.length)
  const [toolbarOverflowOpen, setToolbarOverflowOpen] = useState(false)
  const toolbarActionsRef = useRef<HTMLSpanElement | null>(null)
  const toolbarOverflowRef = useRef<HTMLSpanElement | null>(null)

  const closeToolbarOverflow = useCallback(() => setToolbarOverflowOpen(false), [])
  usePopoverDismiss(toolbarOverflowOpen, closeToolbarOverflow, toolbarOverflowRef)

  /** 放不下的按钮只隐藏不移除，宽度仍可测量，所以先按完整顺序排版再决定切点。 */
  const measureToolbar = useCallback((): void => {
    const container = toolbarActionsRef.current
    if (container === null) return
    const slots = Array.from(container.querySelectorAll<HTMLElement>('[data-toolbar-action]'))
    if (slots.length === 0) return
    const widths = slots.map((slot) => slot.getBoundingClientRect().width || slot.offsetWidth)
    const overflow = container.querySelector<HTMLElement>('[data-toolbar-overflow]')
    const overflowWidth = overflow === null ? 0 : overflow.getBoundingClientRect().width || overflow.offsetWidth
    // .dshdb-toolbar-top 的按钮间距是 2px，和样式里的 gap 保持一致。
    const next = fitActionCount(widths, container.clientWidth, overflowWidth, 2)
    setVisibleToolbarActions(next)
    if (next === toolbarOrder.length) setToolbarOverflowOpen(false)
  }, [toolbarOrder.length])

  useLayoutEffect(() => {
    measureToolbar()
  })

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined
    const container = toolbarActionsRef.current
    if (container === null) return undefined
    const observer = new ResizeObserver(() => measureToolbar())
    observer.observe(container)
    return () => observer.disconnect()
  }, [measureToolbar])

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

  async function downloadJava(): Promise<void> {
    setDownloadingJava(true)
    try {
      const env = await api.downloadJava()
      if (snapshot != null) applySettings(snapshot.settings, env)
      if (env.java.available) notify('Java 运行环境已就绪', 'success')
      else notify('Java 已下载，但没有检测到可执行文件', 'error')
    } catch (error) {
      notify(`下载 Java 失败：${errorText(error)}`, 'error')
    } finally {
      setDownloadingJava(false)
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
    const ok = await askConfirm(`删除连接「${connection.name}」？它会先移到回收站，可随时恢复。`)
    if (!ok) return
    setDeleting(true)
    try {
      await api.deleteConnection(connection.id)
      setConnModal({ open: false, editing: null })
      notify('连接已移入回收站', 'success')
      await refresh()
    } catch (error) {
      notify(`删除失败：${errorText(error)}`, 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function restoreConnection(item: ClientTrashedConnection): Promise<void> {
    setTrashBusy({ id: item.id, action: 'restore' })
    try {
      await api.restoreConnection(item.id)
      notify(`连接「${item.name}」已恢复`, 'success')
      await refresh()
    } catch (error) {
      notify(`恢复失败：${errorText(error)}`, 'error')
    } finally {
      setTrashBusy(null)
    }
  }

  async function purgeConnection(item: ClientTrashedConnection): Promise<void> {
    const ok = await askConfirm(`彻底删除连接「${item.name}」？保存的密码与结构缓存也会删除，且无法恢复。`)
    if (!ok) return
    setTrashBusy({ id: item.id, action: 'purge' })
    try {
      await api.purgeConnection(item.id)
      notify('连接已彻底删除', 'success')
      await refresh()
    } catch (error) {
      notify(`删除失败：${errorText(error)}`, 'error')
    } finally {
      setTrashBusy(null)
    }
  }

  async function emptyTrash(): Promise<void> {
    const ok = await askConfirm(`清空回收站中的 ${String(trash.length)} 个连接？保存的密码与结构缓存也会删除，且无法恢复。`)
    if (!ok) return
    setEmptyingTrash(true)
    try {
      const result = await api.emptyTrash()
      notify(`已清空回收站（${String(result.purged)} 个连接）`, 'success')
      await refresh()
    } catch (error) {
      notify(`清空回收站失败：${errorText(error)}`, 'error')
    } finally {
      setEmptyingTrash(false)
    }
  }

  const toolbarActions: {
    id: ToolbarActionId
    label: string
    title: string
    disabled?: boolean
    onClick: () => void
  }[] = [
    {
      id: 'add',
      label: '新增',
      title: '新增数据源',
      onClick: () => setConnModal({ open: true, editing: null }),
    },
    {
      id: 'edit',
      label: '编辑',
      title: '编辑选中的数据源',
      disabled: !selected || deleting,
      onClick: () => {
        if (selected) setConnModal({ open: true, editing: selected })
      },
    },
    {
      id: 'refresh',
      label: '刷新',
      title: '刷新选中的数据源',
      disabled: connectingId !== '' || refreshing,
      onClick: () => {
        if (refreshing) return
        setRefreshing(true)
        void refreshSelected().finally(() => setRefreshing(false))
      },
    },
    {
      id: 'delete',
      label: '删除',
      title: '删除选中的数据源',
      disabled: !selected || deleting,
      onClick: () => {
        if (selected) void deleteConnection(selected)
      },
    },
    {
      id: 'console',
      label: '控制台',
      title: selectedSchema === '' ? '查询控制台' : `查询控制台（${selectedSchema}）`,
      onClick: () =>
        openConsoleTab({ connectionId: selected?.id, ...(selectedSchema === '' ? {} : { schema: selectedSchema }) }),
    },
    {
      id: 'trash',
      label: '回收站',
      title: trash.length > 0 ? `回收站（${String(trash.length)}）` : '回收站',
      onClick: () => setTrashOpen(true),
    },
    {
      id: 'settings',
      label: '设置',
      title: '设置',
      onClick: () => setSettingsOpen(true),
    },
  ]
  const toolbarActionById = new Map(toolbarActions.map((action) => [action.id, action]))
  const orderedToolbarActions = toolbarOrder.flatMap((id) => {
    const action = toolbarActionById.get(id)
    return action === undefined ? [] : [action]
  })
  const visibleToolbarCount = Math.min(visibleToolbarActions, orderedToolbarActions.length)
  const hiddenToolbarActions = orderedToolbarActions.slice(visibleToolbarCount)

  // Show the background walk only for the data source being looked at; other
  // connections keep caching quietly without stealing the status bar.
  const prefetchEntry = (snapshot?.prefetch ?? []).find((entry) => entry.connectionId === selectedId)

  const rootStyle: CSSProperties = {
    display: hidden ? 'none' : 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  }

  // The tree hands these callbacks to memoized object rows, so they must keep
  // one identity across renders. `useDataSources` already stabilizes the hook
  // side; these wrappers only adapt its promise-returning API for the view.
  const openAddConnection = useCallback((): void => setConnModal({ open: true, editing: null }), [])
  const connectTree = useCallback((id: string): void => void connect(id), [connect])
  const refreshTree = useCallback((): void => void refreshSelected(), [refreshSelected])
  const toggleTreeSchema = useCallback(
    (connectionId: string, schema: string): void => void toggleSchema(connectionId, schema),
    [toggleSchema],
  )
  const loadTreeObjects = useCallback(
    (connectionId: string, schema: string): void => void loadObjects(connectionId, schema),
    [loadObjects],
  )
  const selectTreeObject = useCallback(
    (...args: Parameters<typeof selectObject>): void => void selectObject(...args),
    [selectObject],
  )
  const selectTreeRedisKey = useCallback(
    (...args: Parameters<typeof selectRedisKey>): void => void selectRedisKey(...args),
    [selectRedisKey],
  )
  const loadTreeRedisKeys = useCallback(
    (...args: Parameters<typeof loadRedisKeys>): void => void loadRedisKeys(...args),
    [loadRedisKeys],
  )
  const showDdlTree = useCallback(
    (...args: Parameters<typeof showDdl>): void => void showDdl(...args),
    [showDdl],
  )
  const readDdlTree = useCallback(
    async (
      connectionId: string,
      schema: string,
      table: string,
      kind: Parameters<typeof showDdl>[3],
    ): Promise<string | null> => {
      try {
        return (await api.ddl(connectionId, schema, table, kind)).ddl
      } catch {
        return null
      }
    },
    [],
  )
  const downloadTreeScript = useCallback(
    (filename: string, text: string): void => {
      downloadText(filename, 'application/sql', text)
      notify(`已导出 ${filename}`, 'success')
    },
    [notify],
  )
  const openTableFromTree = useCallback(
    (connectionId: string, schema: string, object: { name: string; kind: string }): void => {
      selectConnection(connectionId)
      openTableTab({ connectionId, schema, table: object.name, kind: object.kind === 'view' ? 'view' : 'table' })
    },
    [selectConnection],
  )
  const openConsoleTabFromTree = useCallback(
    (connectionId: string): void => {
      selectConnection(connectionId)
      openConsoleTab({ connectionId })
    },
    [selectConnection],
  )
  const openConsoleFromTree = useCallback(
    (connectionId: string, schema: string, table: string): void => {
      const connection = connections.find((item) => item.id === connectionId)
      if (connection === undefined) return
      selectConnection(connectionId)
      openConsoleTab({ connectionId, sql: tableSelectSql(connection.dialect, schema, table, '', '', 500) })
    },
    [connections, selectConnection],
  )

  return (
    <div className="dshdb-root" style={rootStyle} data-plugin-route={ROUTE_PREFIX}>
      {/* IDEA 风格工具窗口：工具栏左对齐，下面是数据源列表 */}
      <div className="dshdb-toolbar dshdb-toolbar-top" role="toolbar" aria-label="数据库工具栏">
        <span className="dshdb-toolbar-actions" ref={toolbarActionsRef}>
          {orderedToolbarActions.map((action, index) => (
            <span
              key={action.id}
              className={'dshdb-toolbar-slot' + (index >= visibleToolbarCount ? ' dshdb-toolbar-slot-hidden' : '')}
              data-toolbar-action={action.id}
            >
              <ToolButton
                title={action.title}
                icon={toolbarActionIcon(action.id)}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </ToolButton>
            </span>
          ))}
          <span
            className={
              'dshdb-menu-wrap dshdb-toolbar-slot dshdb-toolbar-more' +
              (hiddenToolbarActions.length === 0 ? ' dshdb-toolbar-slot-hidden' : '')
            }
            data-toolbar-overflow="true"
            ref={toolbarOverflowRef}
          >
            <button
              type="button"
              className="dshdb-toolbtn"
              aria-label="更多操作"
              title="更多操作"
              aria-expanded={toolbarOverflowOpen}
              onClick={() => setToolbarOverflowOpen((open) => !open)}
            >
              <MoreIcon size={14} />
            </button>
            {toolbarOverflowOpen && hiddenToolbarActions.length > 0 ? (
              <span className="dshdb-menu" role="menu">
                {hiddenToolbarActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    role="menuitem"
                    disabled={action.disabled === true}
                    onClick={() => {
                      setToolbarOverflowOpen(false)
                      action.onClick()
                    }}
                  >
                    <span className="dshdb-menu-icon">{toolbarActionIcon(action.id, 13)}</span>
                    {action.label}
                  </button>
                ))}
              </span>
            ) : null}
          </span>
        </span>
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
            {setupError ? (
              <Banner
                tone="error"
                onClose={dismissSetupError}
                actions={
                  <Button size="sm" variant="primary" onClick={() => setSettingsOpen(true)}>
                    去设置
                  </Button>
                }
              >
                {setupError.message}
              </Banner>
            ) : null}
            {setupError === null && !snapshot.env.java.available && snapshot.drivers.some((driver) => driver.needsJava) ? (
              <Banner
                tone="warn"
                actions={
                  <Button size="sm" onClick={() => setSettingsOpen(true)}>
                    去设置
                  </Button>
                }
              >
                未检测到 Java，关系型数据库暂时无法连接。可在「运行环境」里下载 Java 或填写已有的 java 路径。
              </Banner>
            ) : null}
            {setupError === null && !snapshot.env.bridgeBuilt ? (
              <Banner
                tone="warn"
                actions={
                  <Button size="sm" onClick={() => setSettingsOpen(true)}>
                    去设置
                  </Button>
                }
              >
                JDBC 桥接器缺失，SQL 连接将不可用。可在插件目录运行 npm run build:bridge。
              </Banner>
            ) : null}
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
              onAddConnection={openAddConnection}
              onSelectConnection={selectConnection}
              onToggleConnection={toggleConnection}
              onReorderConnections={reorderConnections}
              onConnect={connectTree}
              onRefresh={refreshTree}
              onToggleSchema={toggleTreeSchema}
              onLoadObjects={loadTreeObjects}
              onToggleFolder={toggleFolder}
              onToggleKey={toggleKey}
              onSelectObject={selectTreeObject}
              onSelectSchema={selectSchema}
              onSelectFolder={selectFolder}
              onSelectRedisDb={selectRedisDb}
              onSelectRedisKey={selectTreeRedisKey}
              onToggleRedisDb={toggleRedisDb}
              onLoadRedisKeys={loadTreeRedisKeys}
              onToggleSchemaVisible={toggleSchemaVisible}
              onToggleAllSchemasVisible={toggleAllSchemasVisible}
              onToggleRedisDbVisible={toggleRedisDbVisible}
              onToggleAllRedisDbsVisible={toggleAllRedisDbsVisible}
              onShowDdl={showDdlTree}
              onReadDdl={readDdlTree}
              onDownloadScript={downloadTreeScript}
              onOpenTable={openTableFromTree}
              onOpenConsoleTab={openConsoleTabFromTree}
              onOpenConsole={openConsoleFromTree}
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
            <span className="dshdb-mono dshdb-muted" title={`连接 ID：${selected.id}`}>
              {selected.id}
            </span>
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
        {prefetchEntry !== undefined ? (
          <span
            className="dshdb-statusbar-prefetch"
            title={`后台正在缓存 ${selected?.name ?? '该数据源'} 的表结构描述`}
          >
            <Spinner size={11} />
            <span className="dshdb-muted">
              {prefetchEntry.total > 0
                ? `缓存结构 ${prefetchEntry.done.toLocaleString()}/${prefetchEntry.total.toLocaleString()}`
                : '正在缓存结构…'}
            </span>
          </span>
        ) : null}
        {snapshot ? (
          <span title={snapshot.env.configPath}>
            Java{' '}
            {snapshot.env.java.available ? (
              snapshot.env.java.version ?? '可用'
            ) : (
              <button
                type="button"
                className="dshdb-link"
                title="打开设置 → 运行环境"
                onClick={() => setSettingsOpen(true)}
              >
                未找到 · 去设置
              </button>
            )}{' '}
            · v{snapshot.env.pluginVersion}
          </span>
        ) : null}
      </footer>

      <TrashModal
        open={trashOpen}
        items={trash}
        busy={trashBusy}
        emptying={emptyingTrash}
        onClose={() => setTrashOpen(false)}
        onRestore={(item) => void restoreConnection(item)}
        onPurge={(item) => void purgeConnection(item)}
        onEmpty={() => void emptyTrash()}
      />
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
          downloadingJava={downloadingJava}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => void saveSettings(next)}
          onRefresh={() => void refresh()}
          onDownload={(driverId) => void downloadDriver(driverId)}
          onDownloadJava={() => void downloadJava()}
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

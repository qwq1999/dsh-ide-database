import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import type { ClientConnection, ObjectKind, RedisKeyInfo, RedisValue, SchemaInfo, SchemaObject, ServerInfo, TableDescription } from '../../shared/types'
import { DIALECT_LABEL } from '../../shared/presets'
import { objectKindLabel } from '../format'
import { filterTargets, matchesFilteredObject, parseFilter } from '../treefilter'
import { nextRowIndex } from '../treekeys'
import { highlightParts } from '../highlight'
import { redisTtlLabel } from '../redisvalue'
import { RedisValuePanel } from '../redisview'
import { copyText } from '../colmenu'
import { RedisDatabases } from './redis-databases'
import { OBJECT_PAGE, objectWindow } from './objectlimit'
import { TreeMenu, placeMenu, type TreeMenuState } from './tree-menu'
import { RowPicker } from './row-picker'
import {
  DEPTH_FIVE,
  DEPTH_FOUR,
  DEPTH_ONE,
  DEPTH_THREE,
  DEPTH_TWO,
  DetailFolder,
  Highlight,
  ObjectRow,
  RowToggle,
  objectIcon,
} from './tree-parts'
import {
  DatabaseIcon,
  FolderIcon,
  FunctionIcon,
  KeyIcon,
  PlusIcon,
  SequenceIcon,
  TableIcon,
  TriggerIcon,
  ViewIcon,
} from '../icons'
import { Button, EmptyState, Panel, Spinner, StateDot, Tag, TextInput } from '../ui'

export interface DataViewProps {
  connections: ClientConnection[]
  selectedId: string
  servers: Record<string, ServerInfo>
  connectingId: string
  schemas: Record<string, SchemaInfo[]>
  objects: Record<string, SchemaObject[]>
  expanded: Record<string, boolean>
  loadingSchemas: Record<string, boolean>
  loadingObjects: Record<string, boolean>
  /** ISO timestamp of the cached structure snapshot per connection. */
  cachedAt: Record<string, string>
  descriptions: Record<string, TableDescription>
  loadingDescriptions: Record<string, boolean>
  detail: TableDescription | null
  detailLoading: boolean
  selectedKey: string
  redisKeys: Record<string, Record<string, RedisKeyInfo[]>>
  redisCursor: Record<string, Record<string, string>>
  loadingRedisKeys: Record<string, Record<string, boolean>>
  redisDatabases: Record<string, number>
  redisDbs: Record<string, number[]>
  visibleSchemas: Record<string, string[] | null>
  redisDetail: RedisValue | null
  redisDetailDb: number
  redisDetailLoading: boolean
  onAddConnection: () => void
  onSelectConnection: (id: string) => void
  onToggleConnection: (id: string) => void
  onConnect: (id: string) => void
  onToggleSchema: (connectionId: string, schema: string) => void
  onLoadObjects: (connectionId: string, schema: string) => void
  onToggleFolder: (connectionId: string, schema: string, folder: string) => void
  onToggleKey: (key: string) => void
  onSelectObject: (connectionId: string, schema: string, object: SchemaObject) => void
  onSelectSchema: (connectionId: string, schema: string) => void
  onSelectFolder: (connectionId: string, schema: string, folder: string) => void
  onSelectRedisDb: (connectionId: string, db: number) => void
  onSelectRedisKey: (connectionId: string, db: number, key: string) => void
  onToggleRedisDb: (connectionId: string, db: number) => void
  onLoadRedisKeys: (connectionId: string, db: number, more?: boolean) => void
  onToggleSchemaVisible: (connectionId: string, schema: string) => void
  onToggleAllSchemasVisible: (connectionId: string, all: boolean) => void
  onToggleRedisDbVisible: (connectionId: string, db: number) => void
  onToggleAllRedisDbsVisible: (connectionId: string, all: boolean) => void
  onShowDdl: (connectionId: string, schema: string, table: string, kind: string) => void
  /** Double-click on a table/view: open its rows in their own Sidebar tab. */
  onOpenTable: (connectionId: string, schema: string, object: { name: string; kind: string }) => void
}

type FolderId = 'table' | 'view' | 'routine' | 'sequence' | 'trigger' | 'other'

interface FolderDefinition {
  id: FolderId
  label: string
  icon: ReactNode
}

const FOLDERS: FolderDefinition[] = [
  { id: 'table', label: '表', icon: <TableIcon size={13} /> },
  { id: 'view', label: '视图', icon: <ViewIcon size={13} /> },
  { id: 'routine', label: '例程', icon: <FunctionIcon size={13} /> },
  { id: 'sequence', label: '序列', icon: <SequenceIcon size={13} /> },
  { id: 'trigger', label: '触发器', icon: <TriggerIcon size={13} /> },
  { id: 'other', label: '其他', icon: <FolderIcon size={13} /> },
]

function folderOf(kind: ObjectKind): FolderId {
  if (kind === 'procedure' || kind === 'function') return 'routine'
  if (kind === 'sequence' || kind === 'trigger' || kind === 'view' || kind === 'table') return kind
  return 'other'
}

function relativeTime(iso: string): string {
  const stamp = Date.parse(iso)
  if (Number.isNaN(stamp)) return ''
  const seconds = Math.max(0, Math.round((Date.now() - stamp) / 1000))
  if (seconds < 60) return '刚刚'
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.round(seconds / 3600)} 小时前`
  return `${Math.round(seconds / 86400)} 天前`
}

export function DataView(props: DataViewProps): ReactElement {
  const [filter, setFilter] = useState('')
  const [objectExtra, setObjectExtra] = useState<Record<string, number>>({})
  const [objectMenu, setObjectMenu] = useState<TreeMenuState | null>(null)
  // Typing must stay responsive on big trees: match against the last settled
  // term and apply the new one once the user pauses.
  const [settledFilter, setSettledFilter] = useState('')
  useEffect(() => {
    if (filter === settledFilter) return undefined
    const timer = setTimeout(() => setSettledFilter(filter), 200)
    return () => clearTimeout(timer)
  }, [filter, settledFilter])
  const { connections, selectedId, servers, expanded, schemas, objects, cachedAt, detail, detailLoading } = props
  const selected = connections.find((connection) => connection.id === selectedId)

  // Roving keyboard focus: arrow keys move between rows, Home/End jump to the
  // edges, and Left/Right collapse/expand the focused row.
  const handleTreeKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const rows = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button.dshdb-row'))
    if (rows.length === 0) return
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const current = active === null ? -1 : rows.indexOf(active as HTMLButtonElement)
    const target = nextRowIndex(current, rows.length, event.key)
    if (target !== null) {
      event.preventDefault()
      rows[target].focus()
      return
    }
    if (active === null || !rows.includes(active as HTMLButtonElement)) return
    const expandedAttr = active.getAttribute('aria-expanded')
    const expanding = event.key === 'ArrowRight' && expandedAttr === 'false'
    const collapsing = event.key === 'ArrowLeft' && expandedAttr === 'true'
    if (expanding || collapsing) {
      // Expansion belongs to the chevron; clicking the row itself only selects.
      const toggle = active.querySelector<HTMLElement>('.dshdb-row-toggle-action')
      if (toggle === null) return
      event.preventDefault()
      toggle.click()
    }
  }

  const openObjectMenu = useCallback(
    (
      event: React.MouseEvent<HTMLButtonElement>,
      connectionId: string,
      schema: string,
      object: SchemaObject,
    ): void => {
      event.preventDefault()
      const isRelation = object.kind === 'table' || object.kind === 'view'
      const items = [
        ...(isRelation
          ? [{ label: '打开数据', run: () => props.onOpenTable(connectionId, schema, object) }]
          : []),
        { label: '查看 DDL', run: () => props.onShowDdl(connectionId, schema, object.name, object.kind) },
        { label: '复制名称', run: () => void copyText(object.name) },
        { label: '复制限定名', run: () => void copyText(`${schema}.${object.name}`) },
      ]
      setObjectMenu({ ...placeMenu(event.clientX, event.clientY, items), items })
    },
    [props.onOpenTable, props.onShowDdl],
  )

  const normalizedFilter = settledFilter.trim().toLowerCase()
  // Folding is per filter term: a new search gets the first page again.
  useEffect(() => {
    setObjectExtra({})
  }, [normalizedFilter])
  const matches = (text: string): boolean => normalizedFilter === '' || text.toLowerCase().includes(normalizedFilter)
  // `库.表` narrows the object list by schema; the schema row then stays visible through its buckets.
  const filterQuery = parseFilter(settledFilter)

  // Search inside collapsed schemas: fetch their object lists once per filter
  // so matches can be found even when the branch was never opened before.
  const searched = useRef<Set<string>>(new Set())
  const searchedRedis = useRef<Set<string>>(new Set())
  const lastFilter = useRef('')
  useEffect(() => {
    if (lastFilter.current !== normalizedFilter) {
      lastFilter.current = normalizedFilter
      searched.current = new Set()
      searchedRedis.current = new Set()
    }
    if (normalizedFilter === '') return
    for (const connection of connections) {
      const schemaList = schemas[connection.id]
      if (!schemaList || schemaList.length > 64) continue
      if (searched.current.has(connection.id)) continue
      // Offline data sources only have what the structure cache kept; wait for
      // the connection status before searching so the attempt can retry later.
      if (servers[connection.id] === undefined) continue
      searched.current.add(connection.id)
      for (const schema of schemaList) {
        const key = `${connection.id}:${schema.name}`
        // Object names are already in memory (or on the way): searching a new
        // filter term must not re-query metadata for lists we already hold.
        if (objects[key] !== undefined || props.loadingObjects[key] === true) continue
        props.onLoadObjects(connection.id, schema.name)
      }
    }
    // Redis has no schema: scan the displayed databases once so the filter can match keys.
    for (const connection of connections) {
      if (connection.dialect !== 'redis') continue
      if (servers[connection.id] === undefined) continue
      for (const db of props.redisDbs[connection.id] ?? [connection.redisDb]) {
        const scanKey = `${connection.id}:${db}`
        if (searchedRedis.current.has(scanKey)) continue
        if (props.redisKeys[connection.id]?.[db] !== undefined) continue
        searchedRedis.current.add(scanKey)
        props.onLoadRedisKeys(connection.id, db)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedFilter, connections, schemas, servers])

  // While filtering, open the branches that contain a match so hits are not
  // hidden inside collapsed data sources or schemas.
  useEffect(() => {
    if (normalizedFilter === '') return
    const timer = window.setTimeout(() => {
      const targets = filterTargets(filter, connections, schemas, objects, expanded)
      for (const id of targets.connections) props.onToggleConnection(id)
      for (const key of targets.schemas) {
        const separator = key.indexOf(':')
        void props.onToggleSchema(key.slice(0, separator), key.slice(separator + 1))
      }
      // Folders inside a matching schema open too, so the hit is one click away.
      for (const [key, list] of Object.entries(objects)) {
        const hits = list.filter((object) => matches(object.name))
        if (hits.length === 0) continue
        const separator = key.indexOf(':')
        const connectionId = key.slice(0, separator)
        const schema = key.slice(separator + 1)
        for (const folder of new Set(hits.map((object) => folderOf(object.kind)))) {
          if (expanded[`${key}#${folder}`] === true) continue
          props.onToggleFolder(connectionId, schema, folder)
        }
      }
      // A Redis key hit opens its data source (and database) so the key rows show.
      for (const connection of connections) {
        if (connection.dialect !== 'redis') continue
        const keysByDb = props.redisKeys[connection.id]
        if (keysByDb === undefined) continue
        for (const [db, keys] of Object.entries(keysByDb)) {
          if (!keys.some((key) => matches(key.key))) continue
          if (expanded[connection.id] !== true) props.onToggleConnection(connection.id)
          if (expanded[`${connection.id}:redis:db${db}`] === false) props.onToggleRedisDb(connection.id, Number(db))
        }
      }
    }, 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedFilter, connections, schemas, objects, expanded, props.redisKeys])

  const grouped = useMemo(() => {
    const cache: Record<string, Record<FolderId, SchemaObject[]>> = {}
    for (const [key, list] of Object.entries(objects)) {
      const buckets = {} as Record<FolderId, SchemaObject[]>
      for (const folder of FOLDERS) buckets[folder.id] = []
      const schemaName = key.slice(key.indexOf(':') + 1)
      for (const object of list) {
        if (normalizedFilter !== '' && !matchesFilteredObject(filterQuery, schemaName, object.name)) continue
        buckets[folderOf(object.kind)].push(object)
      }
      cache[key] = buckets
    }
    return cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects, normalizedFilter])

  return (
    <div className="dshdb-view" style={{ gap: 8 }}>
      <div className="dshdb-toolbar">
        <TextInput
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder={selected?.dialect === 'redis' ? '筛选键…' : '筛选库表…'}
          aria-label={selected?.dialect === 'redis' ? '筛选键' : '筛选库表'}
          style={{ width: 132 }}
        />
        <span className="dshdb-toolbar-spacer" />
        {props.detailLoading || props.redisDetailLoading ? (
          <span className="dshdb-muted dshdb-inline">
            <Spinner /> {props.redisDetailLoading ? '读取键值' : '读取结构'}
          </span>
        ) : null}
      </div>

      {connections.length === 0 ? (
        <EmptyState
          icon={<DatabaseIcon size={28} />}
          title="还没有数据源"
          description="用工具栏的「新增」按钮添加 MySQL、Oracle、达梦、OceanBase 或 Redis 连接。连接一次之后，即使离线也能浏览缓存的库表结构。"
          actions={
            <Button variant="primary" icon={<PlusIcon size={13} />} onClick={props.onAddConnection}>
              新建连接
            </Button>
          }
        />
      ) : (
        <Panel className="dshdb-grow" bodyClassName="dshdb-panel-body-pad">
          <div
            className="dshdb-tree dshdb-scroll-thin"
            role="tree"
            aria-label="数据源"
            onKeyDown={handleTreeKey}
          >
            {connections.map((connection) => {
              const isSelected = connection.id === selectedId
              const isExpanded = expanded[connection.id] === true
              const server = servers[connection.id]
              const connecting = props.connectingId === connection.id
              const loading = props.loadingSchemas[connection.id] === true
              const cachedStamp = cachedAt[connection.id]
              const allSchemas = schemas[connection.id] ?? []
              const shownSchemas = props.visibleSchemas[connection.id] ?? null
              const redisKeys = connection.dialect === 'redis' ? props.redisKeys[connection.id] : undefined
              const redisDbs = props.redisDbs[connection.id] ?? [connection.redisDb]
              // A schema stays visible when it or any of its loaded objects matches.
              const list = allSchemas
                .filter((schema) => shownSchemas === null || shownSchemas.includes(schema.name))
                .filter((schema) => {
                  if (matches(schema.name)) return true
                  const buckets = grouped[`${connection.id}:${schema.name}`]
                  return buckets !== undefined && FOLDERS.some((folder) => buckets[folder.id].length > 0)
                })
              const hasCachedStructure =
                allSchemas.length > 0 ||
                redisKeys !== undefined ||
                (connection.dialect === 'redis' && props.redisDatabases[connection.id] !== undefined)
              const redisMatches =
                connection.dialect === 'redis' &&
                (redisKeys === undefined ||
                  Object.values(redisKeys).some((keys) => keys.some((key) => matches(key.key))))
              const visible =
                normalizedFilter === '' ||
                matches(connection.name) ||
                list.length > 0 ||
                redisMatches ||
                (allSchemas.length === 0 && server === undefined && !loading)

              if (!visible) return null

              const schemaItems = allSchemas.map((schema) => ({ id: schema.name, label: schema.name }))
              const dbItems = Array.from({ length: props.redisDatabases[connection.id] ?? 16 }, (_, index) => ({
                id: String(index),
                label: index === connection.redisDb ? `db${index}（默认）` : `db${index}`,
              }))

              return (
                <div key={connection.id}>
                  <button
                    type="button"
                    className="dshdb-row"
                    role="treeitem"
                    aria-expanded={isExpanded}
                    data-active={isSelected}
                    data-kind="datasource"
                    title={`${connection.name} · ${connection.host}:${connection.port}${
                      connection.dialect === 'redis' ? ` · db${connection.redisDb}` : ''
                    }${cachedStamp ? `\n离线可用 · 结构更新于 ${relativeTime(cachedStamp)}` : ''}`}
                    onClick={() => props.onSelectConnection(connection.id)}
                    onDoubleClick={() => props.onToggleConnection(connection.id)}
                  >
                    <RowToggle
                      open={isExpanded}
                      title={isExpanded ? '收起数据源' : '展开数据源'}
                      onToggle={() => {
                        props.onSelectConnection(connection.id)
                        props.onToggleConnection(connection.id)
                      }}
                    />
                    <span className="dshdb-row-icon">
                      <DatabaseIcon size={13} />
                    </span>
                    <span className="dshdb-row-label">
                      <Highlight text={connection.name} query={normalizedFilter} />
                    </span>
                    <Tag>{DIALECT_LABEL[connection.dialect]}</Tag>
                    {connection.readOnly ? <Tag tone="warn">只读</Tag> : null}
                    {!server && cachedStamp && hasCachedStructure ? (
                      <span className="dshdb-row-meta">缓存 {relativeTime(cachedStamp)}</span>
                    ) : null}
                    {connection.dialect === 'redis' ? (
                      <RowPicker
                        title="选择要展示的数据库"
                        allLabel="所有数据库"
                        items={dbItems}
                        visible={redisDbs.map(String)}
                        onToggle={(id) => props.onToggleRedisDbVisible(connection.id, Number(id))}
                        onToggleAll={(all) => props.onToggleAllRedisDbsVisible(connection.id, all)}
                      />
                    ) : (
                      <RowPicker
                        title="选择要展示的架构"
                        allLabel="所有架构"
                        items={schemaItems}
                        visible={shownSchemas}
                        onToggle={(name) => props.onToggleSchemaVisible(connection.id, name)}
                        onToggleAll={(all) => props.onToggleAllSchemasVisible(connection.id, all)}
                      />
                    )}
                    {!server && !connecting ? (
                      <span
                        className="dshdb-row-action dshdb-connect-action"
                        role="button"
                        tabIndex={0}
                        title={`连接 ${connection.host}:${connection.port}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          props.onConnect(connection.id)
                        }}
                        onDoubleClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            event.stopPropagation()
                            props.onConnect(connection.id)
                          }
                        }}
                      >
                        连接
                      </span>
                    ) : null}
                    <StateDot
                      tone={server ? 'success' : connecting ? 'warn' : connection.dialect === 'redis' ? 'business' : 'idle'}
                    />
                  </button>

                  {isExpanded ? (
                    <div role="group">
                      {!server && !hasCachedStructure ? (
                        <button
                          type="button"
                          className="dshdb-row"
                          style={DEPTH_ONE}
                          data-kind="schema"
                          disabled={connecting}
                          onClick={() => props.onConnect(connection.id)}
                        >
                          <span className="dshdb-row-toggle" />
                          <span className="dshdb-row-icon">
                            {connecting ? <Spinner /> : <DatabaseIcon size={13} />}
                          </span>
                          <span className="dshdb-row-label dshdb-muted">
                            {connecting ? '正在连接…' : `连接到 ${connection.host}:${connection.port}`}
                          </span>
                        </button>
                      ) : connection.dialect === 'redis' ? (
                        <RedisDatabases
                          connection={connection}
                          keysByDb={props.redisKeys[connection.id]}
                          cursors={props.redisCursor[connection.id]}
                          loadingByDb={props.loadingRedisKeys[connection.id]}
                          visibleDbs={redisDbs}
                          expanded={expanded}
                          selectedKey={props.selectedKey}
                          query={normalizedFilter}
                          onToggleDb={(db) => props.onToggleRedisDb(connection.id, db)}
                          onLoadMore={(db) => props.onLoadRedisKeys(connection.id, db, true)}
                          onSelectDb={(db) => props.onSelectRedisDb(connection.id, db)}
                          onSelectKey={(db, key) => props.onSelectRedisKey(connection.id, db, key)}
                        />
                      ) : (
                        <>
                          {loading ? (
                            <div className="dshdb-muted dshdb-inline" style={{ padding: '4px 6px 4px 26px' }}>
                              <Spinner /> 正在加载 schema…
                            </div>
                          ) : null}
                          {!loading && !server && hasCachedStructure ? (
                            <div className="dshdb-muted" style={{ padding: '2px 6px 4px 26px', fontSize: 11 }}>
                              离线缓存 · {relativeTime(cachedStamp ?? '')}，连接后自动更新
                            </div>
                          ) : null}
                          {!loading && shownSchemas !== null && list.length === 0 ? (
                            <div className="dshdb-muted" style={{ padding: '4px 6px 4px 26px' }}>
                              全部 Schema 已隐藏，使用行尾按钮选择显示的架构
                            </div>
                          ) : null}
                          {!loading && list.length === 0 && (shownSchemas === null || allSchemas.length === 0) ? (
                            <div className="dshdb-muted" style={{ padding: '4px 6px 4px 26px' }}>
                              {normalizedFilter ? '没有匹配的 schema' : '没有 schema'}
                            </div>
                          ) : null}
                          {list.map((schema) => {
                            const key = `${connection.id}:${schema.name}`
                            const schemaExpanded = expanded[key] === true
                            const objectList = objects[key]
                            const objectLoading = props.loadingObjects[key] === true
                            const buckets = grouped[key]
                            const total = objectList === undefined ? undefined : FOLDERS.reduce(
                              (sum, folder) => sum + (buckets?.[folder.id].length ?? 0),
                              0,
                            )

                            return (
                              <div key={schema.name}>
                                <button
                                  type="button"
                                  className="dshdb-row"
                                  role="treeitem"
                                  aria-expanded={schemaExpanded}
                                  data-active={props.selectedKey === `${connection.id}|schema:${schema.name}`}
                                  data-kind="schema"
                                  style={DEPTH_ONE}
                                  onClick={() => props.onSelectSchema(connection.id, schema.name)}
                                  onDoubleClick={() => void props.onToggleSchema(connection.id, schema.name)}
                                >
                                  <RowToggle
                                    open={schemaExpanded}
                                    title={schemaExpanded ? '收起 Schema' : '展开 Schema'}
                                    onToggle={() => {
                                      props.onSelectSchema(connection.id, schema.name)
                                      void props.onToggleSchema(connection.id, schema.name)
                                    }}
                                  />
                                  <span className="dshdb-row-icon">
                                    <DatabaseIcon size={13} />
                                  </span>
                                  <span className="dshdb-row-label">
                                    <Highlight text={schema.name} query={filterQuery.schema === '' ? normalizedFilter : filterQuery.schema} />
                                  </span>
                                  {schema.system ? <Tag>系统</Tag> : null}
                                  {objectLoading ? <Spinner /> : null}
                                  {!objectLoading && total !== undefined ? (
                                    <span className="dshdb-row-meta">{total}</span>
                                  ) : null}
                                </button>

                                {schemaExpanded ? (
                                  <div role="group">
                                    {objectLoading && objectList === undefined ? (
                                      <div className="dshdb-muted" style={{ padding: '4px 6px 4px 40px' }}>
                                        正在加载对象…
                                      </div>
                                    ) : null}
                                    {!objectLoading &&
                                    objectList !== undefined &&
                                    FOLDERS.every((folder) => (buckets?.[folder.id].length ?? 0) === 0) ? (
                                      <div className="dshdb-muted" style={{ padding: '4px 6px 4px 40px' }}>
                                        {normalizedFilter ? '没有匹配的对象' : '没有表或视图'}
                                      </div>
                                    ) : null}
                                    {objectList !== undefined
                                      ? FOLDERS.filter((folder) => (buckets?.[folder.id].length ?? 0) > 0).map((folder) => {
                                          const folderKey = `${connection.id}:${schema.name}#${folder.id}`
                                          const folderExpanded = expanded[folderKey] === true
                                          const items = buckets?.[folder.id] ?? []
                                          const pageWindow = objectWindow(items.length, objectExtra[folderKey] ?? 0)
                                          return (
                                            <div key={folder.id}>
                                              <button
                                                type="button"
                                                className="dshdb-row"
                                                role="treeitem"
                                                aria-expanded={folderExpanded}
                                                data-active={
                                                  props.selectedKey === `${connection.id}|${schema.name}#${folder.id}`
                                                }
                                                data-kind="folder"
                                                style={DEPTH_TWO}
                                                onClick={() =>
                                                  props.onSelectFolder(connection.id, schema.name, folder.id)
                                                }
                                                onDoubleClick={() =>
                                                  props.onToggleFolder(connection.id, schema.name, folder.id)
                                                }
                                              >
                                                <RowToggle
                                                  open={folderExpanded}
                                                  title={folderExpanded ? `收起${folder.label}` : `展开${folder.label}`}
                                                  onToggle={() => {
                                                    props.onSelectFolder(connection.id, schema.name, folder.id)
                                                    props.onToggleFolder(connection.id, schema.name, folder.id)
                                                  }}
                                                />
                                                <span className="dshdb-row-icon">{folder.icon}</span>
                                                <span className="dshdb-row-label">{folder.label}</span>
                                                <span className="dshdb-row-meta">{items.length}</span>
                                              </button>
                                              {folderExpanded ? (
                                                <div role="group">
                                                  {items.slice(0, pageWindow.visible).map((object) => (
                                                    <ObjectRow
                                                      key={object.name}
                                                      connectionId={connection.id}
                                                      schema={schema.name}
                                                      object={object}
                                                      selected={
                                                        props.selectedKey ===
                                                        `${connection.id}|${schema.name}.${object.name}`
                                                      }
                                                      expanded={expanded}
                                                      description={
                                                        props.descriptions[`${connection.id}|${schema.name}.${object.name}`]
                                                      }
                                                      loading={
                                                        props.loadingDescriptions[
                                                          `${connection.id}|${schema.name}.${object.name}`
                                                        ] === true
                                                      }
                                                      onSelect={props.onSelectObject}
                                                      onOpen={props.onOpenTable}
                                                      onToggleKey={props.onToggleKey}
                                                      onMenu={openObjectMenu}
                                                      query={filterQuery.schema === '' ? normalizedFilter : filterQuery.name}
                                                    />
                                                  ))}
                                                  {pageWindow.hidden > 0 ? (
                                                    <button
                                                      type="button"
                                                      className="dshdb-row dshdb-muted"
                                                      style={DEPTH_THREE}
                                                      onClick={() =>
                                                        setObjectExtra((current) => ({
                                                          ...current,
                                                          [folderKey]: (current[folderKey] ?? 0) + OBJECT_PAGE,
                                                        }))
                                                      }
                                                    >
                                                      <span className="dshdb-row-label">
                                                        {pageWindow.hidden > OBJECT_PAGE
                                                          ? `再显示 ${OBJECT_PAGE} 个（还有 ${pageWindow.hidden} 个）`
                                                          : `显示剩余 ${pageWindow.hidden} 个`}
                                                      </span>
                                                    </button>
                                                  ) : null}
                                                </div>
                                              ) : null}
                                            </div>
                                          )
                                        })
                                      : null}
                                  </div>
                                ) : null}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Panel>
      )}

      {props.redisDetail ? (
        <Panel
          className="dshdb-redis-detail"
          title={
            <span className="dshdb-inline">
              <KeyIcon size={13} />
              <span className="dshdb-mono">{props.redisDetail.key}</span>
              <Tag>{props.redisDetail.type}</Tag>
              <span className="dshdb-row-meta">db{props.redisDetailDb}</span>
            </span>
          }
          bodyClassName="dshdb-panel-body-pad"
          scroll
        >
          <RedisValuePanel value={props.redisDetail} showKey={false} />
        </Panel>
      ) : null}

      {detail ? (
        <Panel
          title={
            <span className="dshdb-inline">
              {objectIcon(detail.kind)}
              <span className="dshdb-mono">
                {detail.schema}.{detail.table}
              </span>
              <Tag>{objectKindLabel(detail.kind)}</Tag>
            </span>
          }
          actions={
            detail.kind === 'table' || detail.kind === 'view' ? (
              <Button
                size="sm"
                onClick={() => props.onShowDdl(selectedId, detail.schema, detail.table, detail.kind)}
              >
                DDL
              </Button>
            ) : null
          }
          bodyClassName="dshdb-panel-body-pad"
          scroll
        >
          {detail.columns.length === 0 && (detail.ddl === undefined || detail.ddl === '') ? (
            <div className="dshdb-muted" style={{ padding: '4px 0' }}>
              {detail.kind === 'table' || detail.kind === 'view'
                ? '没有读取到列结构。'
                : `未读取到${objectKindLabel(detail.kind)}定义，请在 SQL 控制台查看。`}
            </div>
          ) : null}
          {detail.columns.length > 0 ? (
            <div className="dshdb-grid-wrap" style={{ maxHeight: 220 }}>
              <table className="dshdb-grid">
                <thead>
                  <tr>
                    <th>列</th>
                    <th>类型</th>
                    <th>可空</th>
                    <th>默认值</th>
                    <th>注释</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.columns.map((column) => (
                    <tr key={column.name}>
                      <td title={column.name}>
                        {column.name}
                        {column.primaryKey ? <span className="dshdb-tag" style={{ marginLeft: 6 }}>PK</span> : null}
                      </td>
                      <td title={column.typeName}>{column.typeName}</td>
                      <td>{column.nullable === false ? '否' : '是'}</td>
                      <td title={column.defaultValue ?? ''}>{column.defaultValue ?? '—'}</td>
                      <td title={column.comment ?? ''}>{column.comment ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {typeof detail.ddl === 'string' && detail.ddl !== '' ? (
            <div style={{ marginTop: detail.columns.length > 0 ? 10 : 0 }}>
              <pre className="dshdb-ddl" style={{ maxHeight: 280 }}>{detail.ddl}</pre>
              <div className="dshdb-muted" style={{ marginTop: 4 }}>
                {detail.ddlSource === 'generated' ? '根据列结构生成的 DDL' : '来自服务器的定义'}
                {detail.ddlWarnings !== undefined && detail.ddlWarnings.length > 0
                  ? `；${detail.ddlWarnings.join('；')}`
                  : ''}
              </div>
            </div>
          ) : null}
          {detail.indexes.length > 0 ? (
            <div className="dshdb-kv" style={{ padding: '8px 0 0' }}>
              {detail.indexes.map((index) => (
                <span key={index.name} style={{ display: 'contents' }}>
                  <span className="dshdb-kv-key">
                    {index.primary ? '主键' : index.unique ? '唯一索引' : '索引'} {index.name}
                  </span>
                  <span className="dshdb-kv-val dshdb-mono">{index.columns.join(', ')}</span>
                </span>
              ))}
            </div>
          ) : null}
        </Panel>
      ) : null}

      {!detail && !props.redisDetail && !detailLoading && !props.redisDetailLoading && connections.length > 0 ? (
        <div className="dshdb-muted" style={{ padding: '0 2px' }}>
          {selected?.dialect === 'redis'
            ? '展开 Redis 数据源和逻辑库，选择键可查看值、TTL 与长度；行尾按钮可选择显示的数据库。'
            : '展开数据源，选择表或视图可查看列、索引等结构信息；选择函数、存储过程、触发器可查看定义；行尾按钮可选择显示的架构。'}
        </div>
      ) : null}

      <TreeMenu menu={objectMenu} onClose={() => setObjectMenu(null)} />
    </div>
  )
}

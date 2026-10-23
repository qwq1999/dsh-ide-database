import {
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
import { filterTargets } from '../treefilter'
import { nextRowIndex } from '../treekeys'
import { highlightParts } from '../highlight'
import { redisTtlLabel } from '../redisvalue'
import { RedisValuePanel } from '../redisview'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ColumnIcon,
  DatabaseIcon,
  FolderIcon,
  FunctionIcon,
  IndexIcon,
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
  redisKeys: Record<string, RedisKeyInfo[]>
  redisCursor: Record<string, string>
  loadingRedisKeys: Record<string, boolean>
  redisDetail: RedisValue | null
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
  onSelectRedisKey: (connectionId: string, key: string) => void
  onLoadRedisKeys: (connectionId: string, more?: boolean) => void
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

function objectIcon(kind: ObjectKind): ReactNode {
  if (kind === 'table') return <TableIcon size={13} />
  if (kind === 'view') return <ViewIcon size={13} />
  if (kind === 'procedure' || kind === 'function') return <FunctionIcon size={13} />
  if (kind === 'sequence') return <SequenceIcon size={13} />
  if (kind === 'trigger') return <TriggerIcon size={13} />
  return <FolderIcon size={13} />
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

const DEPTH_ONE = { '--dshdb-depth': 1 } as CSSProperties
const DEPTH_TWO = { '--dshdb-depth': 2 } as CSSProperties
const DEPTH_THREE = { '--dshdb-depth': 3 } as CSSProperties
const DEPTH_FOUR = { '--dshdb-depth': 4 } as CSSProperties
const DEPTH_FIVE = { '--dshdb-depth': 5 } as CSSProperties

/**
 * Expanding is reserved for the chevron: clicking a row's name only selects it,
 * so browsing never collapses the branch being read. Clicking the chevron also
 * selects the row, the way JetBrains trees behave.
 */
function RowToggle({
  open,
  title,
  onToggle,
}: {
  open: boolean
  title: string
  onToggle: () => void
}): ReactElement {
  return (
    <span
      className="dshdb-row-toggle dshdb-row-toggle-action"
      role="presentation"
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {open ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
    </span>
  )
}

function DetailFolder({
  label,
  icon,
  count,
  depth,
  open,
  onToggle,
  onSelect,
  children,
}: {
  label: string
  icon: ReactNode
  count: number
  depth: CSSProperties
  open: boolean
  onToggle: () => void
  onSelect?: () => void
  children: ReactNode
}): ReactElement {
  return (
    <div>
      <button
        type="button"
        className="dshdb-row"
        role="treeitem"
        aria-expanded={open}
        data-kind="folder"
        style={depth}
        onClick={onSelect}
        onDoubleClick={onToggle}
      >
        <RowToggle open={open} title={open ? `收起${label}` : `展开${label}`} onToggle={onToggle} />
        <span className="dshdb-row-icon">{icon}</span>
        <span className="dshdb-row-label">{label}</span>
        <span className="dshdb-row-meta">{count}</span>
      </button>
      {open ? <div role="group">{children}</div> : null}
    </div>
  )
}

function Highlight({ text, query }: { text: string; query: string }): ReactElement {
  return (
    <>
      {highlightParts(text, query).map((part, index) =>
        part.hit ? (
          <mark key={index} className="dshdb-mark">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}

function ObjectRow({
  connectionId,
  schema,
  object,
  selected,
  expanded,
  description,
  loading,
  onSelect,
  onOpen,
  onToggleKey,
  query,
}: {
  connectionId: string
  schema: string
  object: SchemaObject
  selected: boolean
  expanded: Record<string, boolean>
  description: TableDescription | undefined
  loading: boolean
  onSelect: () => void
  onOpen: () => void
  onToggleKey: (key: string) => void
  query: string
}): ReactElement {
  const isRelation = object.kind === 'table' || object.kind === 'view'
  const key = `${connectionId}|${schema}.${object.name}`
  const open = isRelation && expanded[key] === true
  const keys = description?.indexes.filter((index) => index.primary === true || index.unique === true) ?? []
  const indexes = description?.indexes ?? []
  const columnFolderKey = `${key}#columns`
  const keyFolderKey = `${key}#keys`
  const indexFolderKey = `${key}#indexes`

  return (
    <div>
      <button
        type="button"
        className="dshdb-row"
        role="treeitem"
        aria-expanded={isRelation ? open : undefined}
        data-active={selected}
        data-kind={object.kind}
        style={DEPTH_THREE}
        title={object.comment ? `${object.name} — ${object.comment}` : `${object.name}（${objectKindLabel(object.kind)}）`}
        onClick={(event) => {
          // A double-click opens the table tab, so ignore the second click.
          if (event.detail > 1) return
          onSelect()
        }}
        onDoubleClick={() => {
          if (!isRelation) return
          onSelect()
          onOpen()
        }}
      >
        {isRelation ? (
          <RowToggle
            open={open}
            title={open ? '收起结构' : '展开结构'}
            onToggle={() => {
              onSelect()
              onToggleKey(key)
            }}
          />
        ) : (
          <span className="dshdb-row-toggle" />
        )}
        <span className="dshdb-row-icon">{objectIcon(object.kind)}</span>
        <span className="dshdb-row-label">
          <Highlight text={object.name} query={query} />
        </span>
        {loading ? <Spinner /> : null}
      </button>

      {open ? (
        <div role="group">
          {loading && description === undefined ? (
            <div className="dshdb-muted" style={{ padding: '4px 6px 4px 52px' }}>
              正在读取结构…
            </div>
          ) : null}
          {!loading && description === undefined ? (
            <div className="dshdb-muted" style={{ padding: '4px 6px 4px 52px' }}>
              未连接数据源，连接后可查看结构
            </div>
          ) : null}
          {description !== undefined ? (
            <>
              <DetailFolder
                label="列"
                icon={<ColumnIcon size={13} />}
                count={description.columns.length}
                depth={DEPTH_FOUR}
                open={expanded[columnFolderKey] === true}
                onToggle={() => onToggleKey(columnFolderKey)}
                onSelect={onSelect}
              >
                {description.columns.map((column) => (
                  <div key={column.name} className="dshdb-row" style={DEPTH_FIVE} data-kind="column">
                    <span className="dshdb-row-toggle" />
                    <span className="dshdb-row-icon">
                      <ColumnIcon size={13} />
                    </span>
                    <span className="dshdb-row-label">{column.name}</span>
                    {column.primaryKey ? <span className="dshdb-tag" data-tone="key">PK</span> : null}
                    <span className="dshdb-row-meta">{column.typeName}</span>
                  </div>
                ))}
              </DetailFolder>

              {keys.length > 0 ? (
                <DetailFolder
                  label="键"
                  icon={<KeyIcon size={13} />}
                  count={keys.length}
                  depth={DEPTH_FOUR}
                  open={expanded[keyFolderKey] === true}
                  onToggle={() => onToggleKey(keyFolderKey)}
                  onSelect={onSelect}
                >
                  {keys.map((index) => (
                    <div key={index.name} className="dshdb-row" style={DEPTH_FIVE} data-kind="key">
                      <span className="dshdb-row-toggle" />
                      <span className="dshdb-row-icon">
                        <KeyIcon size={13} />
                      </span>
                      <span className="dshdb-row-label">{index.primary ? '主键' : index.name}</span>
                      <span className="dshdb-row-meta">{index.columns.join(', ')}</span>
                    </div>
                  ))}
                </DetailFolder>
              ) : null}

              {indexes.length > 0 ? (
                <DetailFolder
                  label="索引"
                  icon={<IndexIcon size={13} />}
                  count={indexes.length}
                  depth={DEPTH_FOUR}
                  open={expanded[indexFolderKey] === true}
                  onToggle={() => onToggleKey(indexFolderKey)}
                  onSelect={onSelect}
                >
                  {indexes.map((index) => (
                    <div key={index.name} className="dshdb-row" style={DEPTH_FIVE} data-kind="index">
                      <span className="dshdb-row-toggle" />
                      <span className="dshdb-row-icon">
                        <IndexIcon size={13} />
                      </span>
                      <span className="dshdb-row-label">{index.name}</span>
                      <span className="dshdb-row-meta">{index.columns.join(', ')}</span>
                    </div>
                  ))}
                </DetailFolder>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function RedisBranch({
  connection,
  keys,
  cursor,
  loading,
  selectedKey,
  query,
  onLoadMore,
  onRefresh,
  onSelect,
}: {
  connection: ClientConnection
  keys: RedisKeyInfo[] | undefined
  cursor: string | undefined
  loading: boolean
  selectedKey: string
  query: string
  onLoadMore: () => void
  onRefresh: () => void
  onSelect: (key: string) => void
}): ReactElement {
  const list = (keys ?? []).filter((key) => query === '' || key.key.toLowerCase().includes(query))
  const hasMore = cursor !== undefined && cursor !== '0'
  const dbRowStyle = { ...DEPTH_ONE, cursor: 'default' } as CSSProperties

  return (
    <div role="group">
      <div
        className="dshdb-row"
        data-kind="schema"
        style={dbRowStyle}
        title={`Redis 逻辑库 db${connection.redisDb}，可在连接设置里切换`}
      >
        <span className="dshdb-row-toggle" />
        <span className="dshdb-row-icon">
          <DatabaseIcon size={13} />
        </span>
        <span className="dshdb-row-label dshdb-mono">db{connection.redisDb}</span>
        {loading ? <Spinner /> : null}
        {!loading && keys !== undefined ? <span className="dshdb-row-meta">{keys.length} 个键</span> : null}
      </div>

      {keys === undefined && loading ? (
        <div className="dshdb-muted dshdb-inline" style={{ padding: '4px 6px 4px 26px' }}>
          <Spinner /> 正在扫描键…
        </div>
      ) : null}
      {keys === undefined && !loading ? (
        <button
          type="button"
          className="dshdb-row"
          style={DEPTH_TWO}
          data-kind="folder"
          onClick={onRefresh}
        >
          <span className="dshdb-row-toggle" />
          <span className="dshdb-row-label dshdb-muted">扫描键</span>
        </button>
      ) : null}
      {keys !== undefined && list.length === 0 ? (
        <div className="dshdb-muted" style={{ padding: '4px 6px 4px 26px' }}>
          {query ? '没有匹配的键' : '没有键'}
        </div>
      ) : null}

      {list.map((key) => (
        <button
          key={key.key}
          type="button"
          className="dshdb-row"
          role="treeitem"
          data-active={selectedKey === `${connection.id}|redis:${key.key}`}
          data-kind="redis-key"
          style={DEPTH_TWO}
          title={`${key.key} · ${key.type} · TTL ${redisTtlLabel(key.ttl)}`}
          onClick={() => onSelect(key.key)}
        >
          <span className="dshdb-row-toggle" />
          <span className="dshdb-row-icon">
            <KeyIcon size={13} />
          </span>
          <span className="dshdb-row-label">
            <Highlight text={key.key} query={query} />
          </span>
          <Tag>{key.type}</Tag>
          {key.size === undefined ? null : <span className="dshdb-row-meta">{key.size}</span>}
        </button>
      ))}

      {hasMore ? (
        <button
          type="button"
          className="dshdb-row"
          style={DEPTH_TWO}
          data-kind="folder"
          disabled={loading}
          onClick={onLoadMore}
        >
          <span className="dshdb-row-toggle" />
          <span className="dshdb-row-label dshdb-muted">{loading ? '正在加载…' : '加载更多键'}</span>
        </button>
      ) : null}
    </div>
  )
}

export function DataView(props: DataViewProps): ReactElement {
  const [filter, setFilter] = useState('')
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

  const normalizedFilter = filter.trim().toLowerCase()
  const matches = (text: string): boolean => normalizedFilter === '' || text.toLowerCase().includes(normalizedFilter)

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
      for (const schema of schemaList) props.onLoadObjects(connection.id, schema.name)
    }
    // Redis has no schema: scan its keys once so the filter can match them.
    for (const connection of connections) {
      if (connection.dialect !== 'redis') continue
      if (searchedRedis.current.has(connection.id)) continue
      if (servers[connection.id] === undefined) continue
      if (props.redisKeys[connection.id] !== undefined) continue
      searchedRedis.current.add(connection.id)
      props.onLoadRedisKeys(connection.id)
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
      // A Redis key hit opens its data source, which then shows the key rows.
      for (const connection of connections) {
        if (connection.dialect !== 'redis' || expanded[connection.id] === true) continue
        const keys = props.redisKeys[connection.id]
        if (keys === undefined || !keys.some((key) => matches(key.key))) continue
        props.onToggleConnection(connection.id)
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
      for (const object of list) {
        if (!matches(object.name)) continue
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
              // A schema stays visible when it or any of its loaded objects matches.
              const list = allSchemas.filter((schema) => {
                if (matches(schema.name)) return true
                const buckets = grouped[`${connection.id}:${schema.name}`]
                return buckets !== undefined && FOLDERS.some((folder) => buckets[folder.id].length > 0)
              })
              const hasCachedStructure = allSchemas.length > 0
              const redisKeys = connection.dialect === 'redis' ? props.redisKeys[connection.id] : undefined
              const redisMatches =
                connection.dialect === 'redis' &&
                (redisKeys === undefined || redisKeys.some((key) => matches(key.key)))
              const visible =
                normalizedFilter === '' ||
                matches(connection.name) ||
                list.length > 0 ||
                redisMatches ||
                (allSchemas.length === 0 && server === undefined && !loading)

              if (!visible) return null

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
                        <RedisBranch
                          connection={connection}
                          keys={props.redisKeys[connection.id]}
                          cursor={props.redisCursor[connection.id]}
                          loading={props.loadingRedisKeys[connection.id] === true}
                          selectedKey={props.selectedKey}
                          query={normalizedFilter}
                          onLoadMore={() => props.onLoadRedisKeys(connection.id, true)}
                          onRefresh={() => props.onLoadRedisKeys(connection.id)}
                          onSelect={(key) => props.onSelectRedisKey(connection.id, key)}
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
                          {!loading && list.length === 0 ? (
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
                                    <Highlight text={schema.name} query={normalizedFilter} />
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
                                                  {items.map((object) => (
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
                                                      onSelect={() =>
                                                        void props.onSelectObject(connection.id, schema.name, object)
                                                      }
                                                      onOpen={() =>
                                                        props.onOpenTable(connection.id, schema.name, object)
                                                      }
                                                      onToggleKey={props.onToggleKey}
                                                      query={normalizedFilter}
                                                    />
                                                  ))}
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
          title={
            <span className="dshdb-inline">
              <KeyIcon size={13} />
              <span className="dshdb-mono">{props.redisDetail.key}</span>
              <Tag>{props.redisDetail.type}</Tag>
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
          {detail.columns.length === 0 ? (
            <div className="dshdb-muted" style={{ padding: '4px 0' }}>
              {detail.kind === 'table' || detail.kind === 'view'
                ? '没有读取到列结构。'
                : `${objectKindLabel(detail.kind)}没有列结构，可在 SQL 控制台查看定义。`}
            </div>
          ) : (
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
          )}
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
            ? '展开 Redis 数据源，选择键可查看值、TTL 与长度。'
            : '展开数据源，选择表或视图可查看列、索引等结构信息。'}
        </div>
      ) : null}
    </div>
  )
}

import { useMemo, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import type { ClientConnection, ObjectKind, SchemaInfo, SchemaObject, ServerInfo, TableDescription } from '../../shared/types'
import { DIALECT_LABEL } from '../../shared/presets'
import { objectKindLabel } from '../format'
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
  onAddConnection: () => void
  onSelectConnection: (id: string) => void
  onToggleConnection: (id: string) => void
  onConnect: (id: string) => void
  onToggleSchema: (connectionId: string, schema: string) => void
  onToggleFolder: (connectionId: string, schema: string, folder: string) => void
  onToggleKey: (key: string) => void
  onSelectObject: (connectionId: string, schema: string, object: SchemaObject) => void
  onQueryObject: (connectionId: string, schema: string, object: { name: string; kind: string }) => void
  /** Double-click on a table/view: open its rows in their own Sidebar tab. */
  onOpenTable: (connectionId: string, schema: string, object: { name: string; kind: string }) => void
  onOpenRedis: (id: string) => void
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

function DetailFolder({
  label,
  icon,
  count,
  depth,
  open,
  onToggle,
  children,
}: {
  label: string
  icon: ReactNode
  count: number
  depth: CSSProperties
  open: boolean
  onToggle: () => void
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
        onClick={onToggle}
      >
        <span className="dshdb-row-toggle">
          {open ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
        </span>
        <span className="dshdb-row-icon">{icon}</span>
        <span className="dshdb-row-label">{label}</span>
        <span className="dshdb-row-meta">{count}</span>
      </button>
      {open ? <div role="group">{children}</div> : null}
    </div>
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
          // A double-click opens the table tab, so the second click must not
          // collapse what the first one expanded.
          if (event.detail > 1) return
          onSelect()
          if (isRelation) onToggleKey(key)
        }}
        onDoubleClick={() => {
          if (!isRelation) return
          onSelect()
          onOpen()
        }}
      >
        <span className="dshdb-row-toggle">
          {isRelation ? open ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} /> : null}
        </span>
        <span className="dshdb-row-icon">{objectIcon(object.kind)}</span>
        <span className="dshdb-row-label">{object.name}</span>
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

export function DataView(props: DataViewProps): ReactElement {
  const [filter, setFilter] = useState('')
  const { connections, selectedId, servers, expanded, schemas, objects, cachedAt, detail, detailLoading } = props

  const normalizedFilter = filter.trim().toLowerCase()
  const matches = (text: string): boolean => normalizedFilter === '' || text.toLowerCase().includes(normalizedFilter)

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
          placeholder="筛选库表…"
          aria-label="筛选库表"
          style={{ width: 132 }}
        />
        <span className="dshdb-toolbar-spacer" />
        {props.detailLoading ? (
          <span className="dshdb-muted dshdb-inline">
            <Spinner /> 读取结构
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
          <div className="dshdb-tree dshdb-scroll-thin" role="tree" aria-label="数据源">
            {connections.map((connection) => {
              const isSelected = connection.id === selectedId
              const isExpanded = expanded[connection.id] === true
              const server = servers[connection.id]
              const connecting = props.connectingId === connection.id
              const loading = props.loadingSchemas[connection.id] === true
              const cachedStamp = cachedAt[connection.id]
              const list = (schemas[connection.id] ?? []).filter((schema) => matches(schema.name))
              const hasCachedStructure = (schemas[connection.id]?.length ?? 0) > 0

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
                      cachedStamp ? `\n离线可用 · 结构更新于 ${relativeTime(cachedStamp)}` : ''
                    }`}
                    onClick={() => {
                      props.onSelectConnection(connection.id)
                      props.onToggleConnection(connection.id)
                    }}
                  >
                    <span className="dshdb-row-toggle">
                      {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                    </span>
                    <span className="dshdb-row-icon">
                      <DatabaseIcon size={13} />
                    </span>
                    <span className="dshdb-row-label">{connection.name}</span>
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
                      {connection.dialect === 'redis' ? (
                        <button
                          type="button"
                          className="dshdb-row"
                          style={DEPTH_ONE}
                          data-kind="schema"
                          onClick={() => props.onOpenRedis(connection.id)}
                        >
                          <span className="dshdb-row-toggle" />
                          <span className="dshdb-row-icon">
                            <TableIcon size={13} />
                          </span>
                          <span className="dshdb-row-label">Redis 控制台</span>
                          <span className="dshdb-row-meta">键与命令</span>
                        </button>
                      ) : !server && !hasCachedStructure ? (
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
                                  data-kind="schema"
                                  style={DEPTH_ONE}
                                  onClick={() => props.onToggleSchema(connection.id, schema.name)}
                                >
                                  <span className="dshdb-row-toggle">
                                    {schemaExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                                  </span>
                                  <span className="dshdb-row-icon">
                                    <DatabaseIcon size={13} />
                                  </span>
                                  <span className="dshdb-row-label">{schema.name}</span>
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
                                                data-kind="folder"
                                                style={DEPTH_TWO}
                                                onClick={() =>
                                                  props.onToggleFolder(connection.id, schema.name, folder.id)
                                                }
                                              >
                                                <span className="dshdb-row-toggle">
                                                  {folderExpanded ? (
                                                    <ChevronDownIcon size={12} />
                                                  ) : (
                                                    <ChevronRightIcon size={12} />
                                                  )}
                                                </span>
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
                onClick={() => props.onQueryObject(selectedId, detail.schema, { name: detail.table, kind: detail.kind })}
              >
                查询数据
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

      {!detail && !detailLoading && connections.length > 0 ? (
        <div className="dshdb-muted" style={{ padding: '0 2px' }}>
          展开数据源，选择表或视图可查看列、索引等结构信息。
        </div>
      ) : null}
    </div>
  )
}

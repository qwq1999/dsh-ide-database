import type {
  ClientConnection,
  ObjectKind,
  RedisKeyInfo,
  SchemaInfo,
  SchemaObject,
  ServerInfo,
  TableDescription,
} from '../../shared/types'
import { DIALECT_LABEL } from '../../shared/presets'
import { relativeTime } from '../relativetime'
import { matchesFilteredObject, parseFilter } from '../treefilter'
import { redisTtlLabel } from '../redisvalue'
import { OBJECT_PAGE, objectWindow } from './objectlimit'
import {
  treeFolderKey,
  treeFolderSelectedKey,
  treeObjectKey,
  treeSchemaKey,
  treeSchemaSelectedKey,
} from '../treekeys'

/**
 * Flat row model of the object tree.
 *
 * The tree used to be nested DOM: every expanded branch added another group
 * around its children. With a few hundred tables that is a lot of nodes, and
 * the browser laid all of them out on every repaint. Here the whole visible
 * tree is one ordered array; the view mounts only the rows inside the scroll
 * window, so the DOM size stays proportional to the viewport instead of the
 * database.
 */

export type FolderId = 'table' | 'view' | 'routine' | 'sequence' | 'trigger' | 'other'

export interface FolderDefinition {
  id: FolderId
  label: string
}

export const TREE_FOLDERS: FolderDefinition[] = [
  { id: 'table', label: '表' },
  { id: 'view', label: '视图' },
  { id: 'routine', label: '例程' },
  { id: 'sequence', label: '序列' },
  { id: 'trigger', label: '触发器' },
  { id: 'other', label: '其他' },
]

export function folderOf(kind: ObjectKind): FolderId {
  if (kind === 'procedure' || kind === 'function') return 'routine'
  if (kind === 'sequence' || kind === 'trigger' || kind === 'view' || kind === 'table') return kind
  return 'other'
}

export type TreeRowKind =
  | 'connection'
  | 'schema'
  | 'folder'
  | 'object'
  | 'detail-folder'
  | 'column'
  | 'key'
  | 'index'
  | 'more'
  | 'note'
  | 'connect'
  | 'redis-db'
  | 'redis-key'
  | 'redis-action'

export type TreeDetailSection = 'columns' | 'keys' | 'indexes'

export type TreePickerMode = 'schemas' | 'redis-dbs'

export interface TreeRowPicker {
  title: string
  allLabel: string
  items: Array<{ id: string; label: string }>
  visible: string[] | null
  mode: TreePickerMode
}

/**
 * One line of the tree. Rows are immutable values: the builder returns a new
 * array only when the tree data or the settled filter changes, never when the
 * user merely scrolls or selects a row.
 */
export interface TreeRow {
  /** Stable React key, unique across the whole tree. */
  key: string
  kind: TreeRowKind
  /** `data-kind` of the old nested tree, kept for styles and tests. */
  dataKind: string
  ariaLevel: number
  /** Visual indentation level; one step is 12px. */
  depth: number
  /** Whether Up/Down may land on this row. */
  navigable: boolean
  expandable: boolean
  open: boolean
  label?: string
  /** Highlight query for the label. */
  query?: string
  title?: string
  /** Right-aligned secondary text. */
  meta?: string
  tag?: string
  readOnly?: boolean
  /** `缓存 3 分钟前` on an offline data source. */
  cacheLabel?: string
  picker?: TreeRowPicker
  /** Key the surrounding branches use for selection. */
  selectedKey?: string
  /** Key passed to onToggleKey when this row expands or collapses. */
  toggleKey?: string
  /** Folder whose extra page this "show more" row reveals. */
  pageKey?: string
  connectionId?: string
  schema?: string
  folder?: FolderId
  detailSection?: TreeDetailSection
  object?: SchemaObject
  db?: number
  redisKey?: RedisKeyInfo
  description?: TableDescription
  loading?: boolean
  connecting?: boolean
  online?: boolean
  /** True for Redis data sources; drives the dot tone and key-specific rows. */
  redis?: boolean
  /** Child count shown at the end of an expandable row. */
  count?: number
  /** Redis logical database number. */
  mono?: boolean
  defaultDb?: boolean
  system?: boolean
  primaryKey?: boolean
  action?: 'scan' | 'load-more'
}

/** Everything the pure row builder needs; deliberately data-only. */
export interface TreeRowsState {
  connections: ClientConnection[]
  servers: Record<string, ServerInfo>
  connectingId: string
  schemas: Record<string, SchemaInfo[]>
  objects: Record<string, SchemaObject[]>
  expanded: Record<string, boolean>
  loadingSchemas: Record<string, boolean>
  loadingObjects: Record<string, boolean>
  cachedAt: Record<string, string>
  descriptions: Record<string, TableDescription>
  loadingDescriptions: Record<string, boolean>
  redisKeys: Record<string, Record<string, RedisKeyInfo[]>>
  redisCursor: Record<string, Record<string, string>>
  loadingRedisKeys: Record<string, Record<string, boolean>>
  redisDatabases: Record<string, number>
  redisDbs: Record<string, number[]>
  visibleSchemas: Record<string, string[] | null>
  /** Settled filter term, not the in-flight text of the input. */
  filter: string
  objectExtra: Record<string, number>
}

interface BuildContext {
  state: TreeRowsState
  filter: string
  query: ReturnType<typeof parseFilter>
  buckets: Map<string, Record<FolderId, SchemaObject[]>>
  rows: TreeRow[]
  /** Case-insensitive substring match against the settled filter. */
  matches: (text: string) => boolean
}

const emptyBuckets = (): Record<FolderId, SchemaObject[]> => ({
  table: [],
  view: [],
  routine: [],
  sequence: [],
  trigger: [],
  other: [],
})

function note(rows: TreeRow[], key: string, label: string, depth: number, loading = false): void {
  rows.push({
    key,
    kind: 'note',
    dataKind: 'note',
    ariaLevel: depth + 1,
    depth,
    navigable: false,
    expandable: false,
    open: false,
    label,
    loading,
  })
}

function buildBuckets(state: TreeRowsState, filter: string, query: ReturnType<typeof parseFilter>): Map<string, Record<FolderId, SchemaObject[]>> {
  const buckets = new Map<string, Record<FolderId, SchemaObject[]>>()
  for (const [key, list] of Object.entries(state.objects)) {
    const grouped = emptyBuckets()
    const schemaName = key.slice(key.indexOf(':') + 1)
    for (const object of list) {
      if (filter !== '' && !matchesFilteredObject(query, schemaName, object.name, object.comment)) continue
      grouped[folderOf(object.kind)].push(object)
    }
    buckets.set(key, grouped)
  }
  return buckets
}

export function buildTreeRows(state: TreeRowsState): TreeRow[] {
  const filter = state.filter.trim().toLowerCase()
  const query = parseFilter(state.filter)
  const matches = (text: string): boolean => filter === '' || text.toLowerCase().includes(filter)
  const context: BuildContext = {
    state,
    filter,
    query,
    buckets: buildBuckets(state, filter, query),
    rows: [],
    matches,
  }
  for (const connection of state.connections) {
    appendConnection(context, connection)
  }
  return context.rows
}

/** The slice of tree state the filter summary needs. */
export interface TreeFilterState {
  connections: ClientConnection[]
  schemas: Record<string, SchemaInfo[]>
  objects: Record<string, SchemaObject[]>
  visibleSchemas: Record<string, string[] | null>
  redisKeys: Record<string, Record<string, RedisKeyInfo[]>>
  filter: string
}

/**
 * What a filter leaves behind, counted the same way the rows are built.
 *
 * `connections` is 0 only when no data source shows a matching row at all, so
 * the view can tell "nothing matched" apart from "a schema or key matched but
 * no table did". Objects inside schemas hidden by the row picker do not count:
 * the tree never shows them, and claiming they matched would be misleading.
 */
export interface TreeFilterSummary {
  connections: number
  objects: number
}

export function treeFilterSummary(state: TreeFilterState): TreeFilterSummary {
  const filter = state.filter.trim().toLowerCase()
  if (filter === '') return { connections: 0, objects: 0 }
  const query = parseFilter(state.filter)
  const matches = (text: string): boolean => text.toLowerCase().includes(filter)
  const summary: TreeFilterSummary = { connections: 0, objects: 0 }

  for (const connection of state.connections) {
    const shownSchemas = state.visibleSchemas[connection.id] ?? null
    let hit = matches(connection.name)

    for (const schema of state.schemas[connection.id] ?? []) {
      if (shownSchemas !== null && !shownSchemas.includes(schema.name)) continue
      let objectHits = 0
      for (const object of state.objects[`${connection.id}:${schema.name}`] ?? []) {
        if (matchesFilteredObject(query, schema.name, object.name, object.comment)) objectHits += 1
      }
      if (objectHits > 0 || matches(schema.name)) {
        summary.objects += objectHits
        hit = true
      }
    }

    if (connection.dialect === 'redis') {
      const keysByDb = state.redisKeys[connection.id]
      // Same rule as appendConnection: while the first scan is pending the
      // data source is still shown, so this is not an empty result yet.
      if (
        keysByDb === undefined ||
        Object.values(keysByDb).some((keys) => keys.some((key) => matches(key.key)))
      ) {
        hit = true
      }
    }

    if (hit) summary.connections += 1
  }

  return summary
}

function appendConnection(context: BuildContext, connection: ClientConnection): void {
  const { state, filter, matches, rows } = context
  const server = state.servers[connection.id]
  const connecting = state.connectingId === connection.id
  const loading = state.loadingSchemas[connection.id] === true
  const cachedStamp = state.cachedAt[connection.id]
  const allSchemas = state.schemas[connection.id] ?? []
  const shownSchemas = state.visibleSchemas[connection.id] ?? null
  const redis = connection.dialect === 'redis'
  const redisKeys = redis ? state.redisKeys[connection.id] : undefined
  const redisDbs = state.redisDbs[connection.id] ?? [connection.redisDb]
  const hasCachedStructure =
    allSchemas.length > 0 ||
    redisKeys !== undefined ||
    (redis && state.redisDatabases[connection.id] !== undefined)

  // A schema stays visible when it, or any object it currently exposes, matches.
  const schemas: SchemaInfo[] = []
  for (const schema of allSchemas) {
    if (shownSchemas !== null && !shownSchemas.includes(schema.name)) continue
    const buckets = context.buckets.get(`${connection.id}:${schema.name}`)
    if (matches(schema.name) || (buckets !== undefined && TREE_FOLDERS.some((folder) => buckets[folder.id].length > 0))) {
      schemas.push(schema)
    }
  }

  const redisMatches =
    redis && (redisKeys === undefined || Object.values(redisKeys).some((keys) => keys.some((key) => matches(key.key))))
  const visible =
    filter === '' ||
    matches(connection.name) ||
    schemas.length > 0 ||
    redisMatches ||
    (allSchemas.length === 0 && server === undefined && !loading)
  if (!visible) return

  const dbItems = Array.from({ length: state.redisDatabases[connection.id] ?? 16 }, (_, index) => ({
    id: String(index),
    label: index === connection.redisDb ? `db${index}（默认）` : `db${index}`,
  }))
  const picker: TreeRowPicker = redis
    ? {
        title: '选择要展示的数据库',
        allLabel: '所有数据库',
        items: dbItems,
        visible: redisDbs.map(String),
        mode: 'redis-dbs',
      }
    : {
        title: '选择要展示的架构',
        allLabel: '所有架构',
        items: allSchemas.map((schema) => ({ id: schema.name, label: schema.name })),
        visible: shownSchemas,
        mode: 'schemas',
      }

  rows.push({
    key: connection.id,
    kind: 'connection',
    dataKind: 'datasource',
    ariaLevel: 1,
    depth: 0,
    navigable: true,
    expandable: true,
    open: state.expanded[connection.id] === true,
    connectionId: connection.id,
    label: connection.name,
    query: filter,
    title: `${connection.name} · ${connection.host}:${connection.port}${
      redis ? ` · db${connection.redisDb}` : ''
    }${cachedStamp ? `\n离线可用 · 结构更新于 ${relativeTime(cachedStamp)}` : ''}`,
    tag: DIALECT_LABEL[connection.dialect],
    readOnly: connection.readOnly,
    cacheLabel: !server && cachedStamp !== undefined && hasCachedStructure ? `缓存 ${relativeTime(cachedStamp)}` : undefined,
    picker,
    connecting,
    online: server !== undefined,
    redis: connection.dialect === 'redis',
  })

  if (state.expanded[connection.id] !== true) return

  if (!server && !hasCachedStructure) {
    rows.push({
      key: `${connection.id}#connect`,
      kind: 'connect',
      dataKind: 'schema',
      ariaLevel: 2,
      depth: 1,
      navigable: !connecting,
      expandable: false,
      open: false,
      connectionId: connection.id,
      label: connecting ? '正在连接…' : `连接到 ${connection.host}:${connection.port}`,
      loading: connecting,
      connecting,
    })
    return
  }

  if (redis) {
    appendRedis(context, connection, redisDbs, server !== undefined)
    return
  }

  if (loading) note(rows, `${connection.id}#loading`, '正在加载 schema…', 2, true)
  if (!loading && server === undefined && hasCachedStructure) {
    note(rows, `${connection.id}#offline`, `离线缓存 · ${relativeTime(cachedStamp ?? '')}，连接后自动更新`, 2)
  }
  // Distinguish "the picker hides every schema" from "the filter matched
  // none": the first has a fix at the row's picker, the second needs a
  // different search term.
  const pickerHidesAll =
    shownSchemas !== null && allSchemas.length > 0 && allSchemas.every((schema) => !shownSchemas.includes(schema.name))
  if (!loading && pickerHidesAll) {
    note(rows, `${connection.id}#hidden`, '全部 Schema 已隐藏，使用行尾按钮选择显示的架构', 2)
  }
  if (!loading && schemas.length === 0 && !pickerHidesAll) {
    note(rows, `${connection.id}#empty`, filter !== '' ? '没有匹配的 schema' : '没有 schema', 2)
  }
  for (const schema of schemas) appendSchema(context, connection, schema)
}

function appendSchema(context: BuildContext, connection: ClientConnection, schema: SchemaInfo): void {
  const { state, filter, query, matches, rows } = context
  const objectsKey = `${connection.id}:${schema.name}`
  const key = treeSchemaKey(connection.id, schema.name)
  const objectList = state.objects[objectsKey]
  const objectLoading = state.loadingObjects[objectsKey] === true
  const buckets = context.buckets.get(objectsKey)
  const total =
    objectList === undefined
      ? undefined
      : TREE_FOLDERS.reduce((sum, folder) => sum + (buckets?.[folder.id].length ?? 0), 0)
  const schemaExpanded = state.expanded[key] === true

  rows.push({
    key,
    kind: 'schema',
    dataKind: 'schema',
    ariaLevel: 2,
    depth: 1,
    navigable: true,
    expandable: true,
    open: schemaExpanded,
    toggleKey: key,
    selectedKey: treeSchemaSelectedKey(connection.id, schema.name),
    connectionId: connection.id,
    schema: schema.name,
    label: schema.name,
    query: query.schema === '' ? filter : query.schema,
    system: schema.system,
    loading: objectLoading,
    count: !objectLoading ? total : undefined,
    meta: !objectLoading && total !== undefined ? String(total) : undefined,
  })

  if (!schemaExpanded) return

  if (objectLoading && objectList === undefined) {
    note(rows, `${key}#loading`, '正在加载对象…', 3, true)
  }
  if (
    !objectLoading &&
    objectList !== undefined &&
    TREE_FOLDERS.every((folder) => (buckets?.[folder.id].length ?? 0) === 0)
  ) {
    note(rows, `${key}#empty`, filter !== '' ? '没有匹配的对象' : '没有表或视图', 3)
  }
  if (objectList === undefined) return

  for (const folder of TREE_FOLDERS) {
    const items = buckets?.[folder.id] ?? []
    if (items.length === 0) continue
    const folderKey = treeFolderKey(connection.id, schema.name, folder.id)
    const folderExpanded = state.expanded[folderKey] === true
    rows.push({
      key: folderKey,
      kind: 'folder',
      dataKind: 'folder',
      ariaLevel: 3,
      depth: 2,
      navigable: true,
      expandable: true,
      open: folderExpanded,
      toggleKey: folderKey,
      selectedKey: treeFolderSelectedKey(connection.id, schema.name, folder.id),
      connectionId: connection.id,
      schema: schema.name,
      folder: folder.id,
      label: folder.label,
      meta: String(items.length),
      count: items.length,
    })
    if (!folderExpanded) continue
    const pageWindow = objectWindow(items.length, state.objectExtra[folderKey] ?? 0)
    for (const object of items.slice(0, pageWindow.visible)) {
      appendObject(context, connection, schema, object)
    }
    if (pageWindow.hidden > 0) {
      rows.push({
        key: `${folderKey}#more`,
        kind: 'more',
        dataKind: 'folder',
        ariaLevel: 4,
        depth: 3,
        navigable: true,
        expandable: false,
        open: false,
        pageKey: folderKey,
        label:
          pageWindow.hidden > OBJECT_PAGE
            ? `再显示 ${OBJECT_PAGE} 个（还有 ${pageWindow.hidden} 个）`
            : `显示剩余 ${pageWindow.hidden} 个`,
      })
    }
  }
}

function appendObject(
  context: BuildContext,
  connection: ClientConnection,
  schema: SchemaInfo,
  object: SchemaObject,
): void {
  const { state, filter, query, rows } = context
  const objectKey = treeObjectKey(connection.id, schema.name, object.name)
  const relation = object.kind === 'table' || object.kind === 'view'
  const description = state.descriptions[objectKey]
  const loading = state.loadingDescriptions[objectKey] === true
  const open = relation && state.expanded[objectKey] === true

  rows.push({
    key: objectKey,
    kind: 'object',
    dataKind: object.kind,
    ariaLevel: 4,
    depth: 3,
    navigable: true,
    expandable: relation,
    open,
    toggleKey: objectKey,
    selectedKey: objectKey,
    connectionId: connection.id,
    schema: schema.name,
    object,
    label: object.name,
    query: query.schema === '' ? filter : query.name,
    description,
    loading,
  })

  if (!open) return

  if (loading && description === undefined) {
    note(rows, `${objectKey}#loading`, '正在读取结构…', 4, true)
    return
  }
  if (!loading && description === undefined) {
    note(rows, `${objectKey}#offline`, '未连接数据源，连接后可查看结构', 4)
    return
  }
  if (description === undefined) return

  const columnKey = `${objectKey}#columns`
  const columnsOpen = state.expanded[columnKey] === true
  rows.push({
    key: columnKey,
    kind: 'detail-folder',
    dataKind: 'folder',
    ariaLevel: 5,
    depth: 4,
    navigable: true,
    expandable: true,
    open: columnsOpen,
    toggleKey: columnKey,
    detailSection: 'columns',
    connectionId: connection.id,
    schema: schema.name,
    object,
    label: '列',
    meta: String(description.columns.length),
    count: description.columns.length,
  })
  if (columnsOpen) {
    for (const column of description.columns) {
      rows.push({
        key: `${columnKey}:${column.name}`,
        kind: 'column',
        dataKind: 'column',
        ariaLevel: 6,
        depth: 5,
        navigable: false,
        expandable: false,
        open: false,
        connectionId: connection.id,
        schema: schema.name,
        object,
        label: column.name,
        meta: column.typeName,
        primaryKey: column.primaryKey === true,
      })
    }
  }

  const keys = description.indexes.filter((index) => index.primary === true || index.unique === true)
  if (keys.length > 0) {
    const keyFolder = `${objectKey}#keys`
    const keysOpen = state.expanded[keyFolder] === true
    rows.push({
      key: keyFolder,
      kind: 'detail-folder',
      dataKind: 'folder',
      ariaLevel: 5,
      depth: 4,
      navigable: true,
      expandable: true,
      open: keysOpen,
      toggleKey: keyFolder,
      detailSection: 'keys',
      connectionId: connection.id,
      schema: schema.name,
      object,
      label: '键',
      meta: String(keys.length),
      count: keys.length,
    })
    if (keysOpen) {
      for (const index of keys) {
        rows.push({
          key: `${keyFolder}:${index.name}`,
          kind: 'key',
          dataKind: 'key',
          ariaLevel: 6,
          depth: 5,
          navigable: false,
          expandable: false,
          open: false,
          connectionId: connection.id,
          schema: schema.name,
          object,
          label: index.primary ? '主键' : index.name,
          meta: index.columns.join(', '),
        })
      }
    }
  }

  if (description.indexes.length > 0) {
    const indexFolder = `${objectKey}#indexes`
    const indexesOpen = state.expanded[indexFolder] === true
    rows.push({
      key: indexFolder,
      kind: 'detail-folder',
      dataKind: 'folder',
      ariaLevel: 5,
      depth: 4,
      navigable: true,
      expandable: true,
      open: indexesOpen,
      toggleKey: indexFolder,
      detailSection: 'indexes',
      connectionId: connection.id,
      schema: schema.name,
      object,
      label: '索引',
      meta: String(description.indexes.length),
      count: description.indexes.length,
    })
    if (indexesOpen) {
      for (const index of description.indexes) {
        rows.push({
          key: `${indexFolder}:${index.name}`,
          kind: 'index',
          dataKind: 'index',
          ariaLevel: 6,
          depth: 5,
          navigable: false,
          expandable: false,
          open: false,
          connectionId: connection.id,
          schema: schema.name,
          object,
          label: index.name,
          meta: index.columns.join(', '),
        })
      }
    }
  }
}

function appendRedis(
  context: BuildContext,
  connection: ClientConnection,
  visibleDbs: number[],
  online: boolean,
): void {
  const { state, filter, rows } = context
  if (visibleDbs.length === 0) {
    note(rows, `${connection.id}#redis-empty`, '未选择数据库，使用行尾的数据库按钮选择', 2)
    return
  }
  const keysByDb = state.redisKeys[connection.id]
  const cursors = state.redisCursor[connection.id]
  const loadingByDb = state.loadingRedisKeys[connection.id]

  for (const db of visibleDbs) {
    const nodeKey = `${connection.id}:redis:db${db}`
    const open = state.expanded[nodeKey] !== false
    const keys = keysByDb?.[String(db)]
    const loading = loadingByDb?.[String(db)] === true
    const cursor = cursors?.[String(db)]
    const list = (keys ?? []).filter((key) => filter === '' || key.key.toLowerCase().includes(filter))
    const hasMore = cursor !== undefined && cursor !== '0'

    rows.push({
      key: nodeKey,
      kind: 'redis-db',
      dataKind: 'schema',
      ariaLevel: 2,
      depth: 1,
      navigable: true,
      expandable: true,
      open,
      toggleKey: nodeKey,
      selectedKey: `${connection.id}|redisdb:${db}`,
      connectionId: connection.id,
      db,
      label: `db${db}`,
      mono: true,
      title: `Redis 逻辑库 db${db}${db === connection.redisDb ? '（默认）' : ''}`,
      defaultDb: db === connection.redisDb,
      loading,
      online,
      meta: !loading && keys !== undefined ? `${keys.length} 个键` : undefined,
    })

    if (!open) continue

    if (keys === undefined && loading) {
      note(rows, `${nodeKey}#loading`, '正在扫描键…', 2, true)
    }
    if (keys === undefined && !loading) {
      rows.push({
        key: `${nodeKey}#scan`,
        kind: 'redis-action',
        dataKind: 'folder',
        ariaLevel: 3,
        depth: 2,
        navigable: true,
        expandable: false,
        open: false,
        action: 'scan',
        connectionId: connection.id,
        db,
        label: '扫描键',
      })
    }
    if (keys !== undefined && list.length === 0) {
      note(rows, `${nodeKey}#empty`, filter !== '' ? '没有匹配的键' : '没有键', 2)
    }
    for (const key of list) {
      rows.push({
        key: `${nodeKey}:${key.key}`,
        kind: 'redis-key',
        dataKind: 'redis-key',
        ariaLevel: 4,
        depth: 2,
        navigable: true,
        expandable: false,
        open: false,
        connectionId: connection.id,
        db,
        redisKey: key,
        selectedKey: `${connection.id}|redis:${db}:${key.key}`,
        label: key.key,
        query: filter,
        title: `${key.key} · ${key.type} · TTL ${redisTtlLabel(key.ttl)}`,
        tag: key.type,
        meta: key.size === undefined ? undefined : String(key.size),
      })
    }
    if (hasMore) {
      rows.push({
        key: `${nodeKey}#more`,
        kind: 'redis-action',
        dataKind: 'folder',
        ariaLevel: 3,
        depth: 2,
        navigable: !loading,
        expandable: false,
        open: false,
        action: 'load-more',
        connectionId: connection.id,
        db,
        loading,
        label: loading ? '正在加载…' : '加载更多键',
      })
    }
  }
}

import { agoText } from '../relativetime'
import { moveId } from '../dragorder'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import type { ClientConnection, ObjectKind, RedisKeyInfo, RedisValue, SchemaInfo, SchemaObject, ServerInfo, TableDescription } from '../../shared/types'
import { DIALECT_LABEL } from '../../shared/presets'
import { objectKindLabel } from '../format'
import { matchTree } from '../treefilter'
import { nextRowIndex } from '../treekeys'
import { shortcutHit } from '../keymap'
import { highlightParts } from '../highlight'
import { redisTtlLabel } from '../redisvalue'
import { RedisValuePanel } from '../redisview'
import { copyText } from '../colmenu'
import { selectColumnsSql } from '../tablesql'
import { tableSelectSql } from '../tablesql'
import { RedisDatabases } from './redis-databases'
import { MAX_TREE_ROWS, OBJECT_PAGE, objectWindow, treeRowBudget } from './objectlimit'
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
  FilterIcon,
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
import { usePopoverDismiss } from '../popover'

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
  /** Persist a new data-source order after a row drag. */
  onReorderConnections?: (ids: string[]) => void
  onConnect: (id: string) => void
  onRefresh?: () => void
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
  /** Read one object's DDL text; null when the server could not produce it. */
  onReadDdl?: (connectionId: string, schema: string, table: string, kind: 'table' | 'view') => Promise<string | null>
  /** Save a generated script; the host owns the download itself. */
  onDownloadScript?: (filename: string, text: string) => void
  /** Double-click on a table/view: open its rows in their own Sidebar tab. */
  onOpenTable: (connectionId: string, schema: string, object: { name: string; kind: string }) => void
  onOpenConsole: (connectionId: string, schema: string, table: string) => void
  /** Opens a query console for this connection, without a prepared statement. */
  onOpenConsoleTab?: (connectionId: string) => void
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

export function relativeTime(iso: string): string {
  const stamp = Date.parse(iso)
  if (Number.isNaN(stamp)) return ''
  return agoText((Date.now() - stamp) / 1000)
}

export function DataView(props: DataViewProps): ReactElement {
  const [filter, setFilter] = useState('')
  // The filter box starts hidden so the toolbar stays quiet; Ctrl+F (or the
  // funnel button) reveals it, and it closes again once emptied.
  const [filterOpen, setFilterOpen] = useState(false)
  const [filterFocus, setFilterFocus] = useState(0)
  const filterRef = useRef<HTMLInputElement | null>(null)
  const [objectExtra, setObjectExtra] = useState<Record<string, number>>({})
  const [objectMenu, setObjectMenu] = useState<TreeMenuState | null>(null)
  const [schemaMenu, setSchemaMenu] = useState<TreeMenuState | null>(null)
  const [connectionMenu, setConnectionMenu] = useState<TreeMenuState | null>(null)
  // Row being dragged plus the row it currently hovers; `after` puts the drop
  // line under the target, otherwise above it.
  const [dragging, setDragging] = useState<{ id: string; overId: string; after: boolean } | null>(null)
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
  /** What the tree filter searches, for the placeholder and the aria label. */
  const treeFilterLabel = selected?.dialect === 'redis' ? '键' : '库表'

  const handleRowDragStart = (event: DragEvent<HTMLElement>, id: string): void => {
    if (props.onReorderConnections === undefined) return
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', id)
    }
    setDragging({ id, overId: '', after: false })
  }

  const handleRowDragOver = (event: DragEvent<HTMLElement>, id: string): void => {
    if (props.onReorderConnections === undefined || dragging === null) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
    if (dragging.id === id) {
      if (dragging.overId !== '') setDragging({ ...dragging, overId: '', after: false })
      return
    }
    // Dropping on the upper half of a row inserts above it, the lower half below.
    const rect = event.currentTarget.getBoundingClientRect()
    const after = event.clientY > rect.top + rect.height / 2
    if (dragging.overId !== id || dragging.after !== after) setDragging({ ...dragging, overId: id, after })
  }

  const handleRowDragLeave = (event: DragEvent<HTMLElement>): void => {
    if (dragging === null) return
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setDragging({ ...dragging, overId: '', after: false })
  }

  const handleRowDrop = (event: DragEvent<HTMLElement>, id: string): void => {
    if (props.onReorderConnections === undefined || dragging === null) return
    event.preventDefault()
    const next = moveId(
      connections.map((connection) => connection.id),
      dragging.id,
      id,
      dragging.after,
    )
    setDragging(null)
    if (next !== null) props.onReorderConnections(next)
  }

  const handleRowDragEnd = (): void => {
    setDragging(null)
  }

  /** Reveal the tree filter and put the caret in it. */
  const focusTreeFilter = useCallback((): void => {
    setFilterOpen(true)
    setFilterFocus((count) => count + 1)
  }, [])

  const filterFloatRef = useRef<HTMLDivElement | null>(null)

  /** Put the floating filter away and stop it from filtering behind the user's back. */
  const closeTreeFilter = useCallback((): void => {
    setFilterOpen(false)
    setFilter('')
    setSettledFilter('')
  }, [])

  // Escape (from anywhere) or a press outside the floating box closes it.
  usePopoverDismiss(filterOpen, closeTreeFilter, filterFloatRef)

  // Focus after the box has been committed to the DOM, so Ctrl+F works from
  // the first press even though the input did not exist a moment earlier. The
  // caret goes to the end, so a term written by the context menus can be
  // extended instead of retyped.
  useEffect(() => {
    if (!filterOpen) return
    const input = filterRef.current
    if (input === null) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [filterOpen, filterFocus])

  // Roving keyboard focus: arrow keys move between rows, Home/End jump to the
  // edges, and Left/Right collapse/expand the focused row.
  const handleTreeKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (shortcutHit(event, 'tree.filter')) {
      event.preventDefault()
      focusTreeFilter()
      return
    }
    if (shortcutHit(event, 'tree.refresh')) {
      // 浏览器默认会把组合键当成刷新整页，这里只重读树。
      event.preventDefault()
      props.onRefresh?.()
      return
    }
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
          ? [
              { label: '打开数据', run: () => props.onOpenTable(connectionId, schema, object) },
              { label: '在控制台查询', run: () => props.onOpenConsole(connectionId, schema, object.name) },
              {
                label: '复制查询语句',
                // Same statement the console opens with; keeping it copyable
                // saves a round trip through the other tab.
                run: () => void copyText(tableSelectSql(props.connections.find((item) => item.id === connectionId)?.dialect ?? 'mysql', schema, object.name, '', '', 500)),
              },
            ]
          : []),
        { label: '查看 DDL', run: () => props.onShowDdl(connectionId, schema, object.name, object.kind) },
        { label: '复制名称', run: () => void copyText(object.name) },
        { label: '复制限定名', run: () => void copyText(`${schema}.${object.name}`) },
        {
          label: '只看这个表',
          run: () => {
            setFilter(`${schema}.${object.name}`)
            setTimeout(focusTreeFilter, 0)
          },
        },
      ]
      setObjectMenu({ ...placeMenu(event.clientX, event.clientY, items), items })
    },
    [focusTreeFilter, props.connections, props.onOpenConsole, props.onOpenTable, props.onShowDdl],
  )

  /** One .sql with every table and view of a schema, in tree order. */
  const exportSchemaScript = useCallback(
    (connectionId: string, schemaName: string): void => {
      const read = props.onReadDdl
      const save = props.onDownloadScript
      const listed = (props.objects[`${connectionId}:${schemaName}`] ?? []).filter(
        (object) => object.kind === 'table' || object.kind === 'view',
      )
      if (read === undefined || save === undefined || listed.length === 0) return
      void (async (): Promise<void> => {
        const parts: string[] = [`-- ${schemaName} 的建表语句`, '']
        for (const object of listed) {
          const kind = object.kind === 'view' ? 'view' : 'table'
          const ddl = await read(connectionId, schemaName, object.name, kind)
          if (ddl === null || ddl.trim() === '') continue
          const text = ddl.trim()
          parts.push(`-- ${object.name}`, text.endsWith(';') ? text : `${text};`, '')
        }
        if (parts.length > 2) save(`${schemaName}.sql`, parts.join(String.fromCharCode(10)))
      })()
    },
    [props.objects, props.onDownloadScript, props.onReadDdl],
  )

  const openSchemaMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, connectionId: string, schemaName: string): void => {
      event.preventDefault()
      const items = [
        { label: '复制库名', run: () => void copyText(schemaName) },
        { label: '导出这个库的建表语句', run: () => exportSchemaScript(connectionId, schemaName) },
        {
          label: '只看这个库',
          run: () => {
            setFilter(`${schemaName}.`)
            // Put the caret in the filter box so the prefix can be extended instead of retyped.
            setTimeout(focusTreeFilter, 0)
          },
        },
      ]
      setSchemaMenu({ ...placeMenu(event.clientX, event.clientY, items), items })
    },
    [exportSchemaScript],
  )

  const openConnectionMenu = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, connection: ClientConnection): void => {
      event.preventDefault()
      const items = [
        { label: '复制连接名', run: () => void copyText(connection.name) },
        { label: '复制连接ID', run: () => void copyText(connection.id) },
        { label: '复制地址', run: () => void copyText(`${connection.host}:${connection.port}`) },
        ...(props.onOpenConsoleTab === undefined
          ? []
          : [{ label: '打开控制台', run: () => props.onOpenConsoleTab?.(connection.id) }]),
        { label: '重新连接', run: () => props.onConnect(connection.id) },
      ]
      setConnectionMenu({ ...placeMenu(event.clientX, event.clientY, items), items })
    },
    [props.onConnect, props.onOpenConsoleTab],
  )

  const normalizedFilter = settledFilter.trim().toLowerCase()
  // Folding is per filter term: a new search gets the first page again.
  useEffect(() => {
    setObjectExtra({})
  }, [normalizedFilter])
  const matches = (text: string): boolean => normalizedFilter === '' || text.toLowerCase().includes(normalizedFilter)
  // One pass over the loaded object lists feeds the counters, the row filter
  // and the derived expansion; every object name is lowered once per term.
  const treeMatch = useMemo(
    () => matchTree(settledFilter, connections, schemas, objects),
    [settledFilter, connections, schemas, objects],
  )
  const filterQuery = treeMatch.query

  // While filtering, branches that contain a match are derived open instead of
  // being written into `expanded`: one expansion per branch no longer costs a
  // state update (and a full app re-render) per schema, and clearing the filter
  // restores exactly what the user had folded.
  const derivedOpen = useMemo(() => {
    const open = new Set<string>()
    if (normalizedFilter === '') return open
    for (const connectionId of treeMatch.connectionHits) open.add(connectionId)
    for (const schemaKey of treeMatch.schemaHits) open.add(schemaKey)
    for (const [schemaKey, list] of Object.entries(treeMatch.objectsBySchema)) {
      open.add(schemaKey)
      for (const object of list) open.add(`${schemaKey}#${folderOf(object.kind)}`)
    }
    // Redis keys live outside the schema/object maps: a key hit opens its data
    // source and its database just like the old toggle-based effect did.
    for (const connection of connections) {
      if (connection.dialect !== 'redis') continue
      const keysByDb = props.redisKeys[connection.id]
      if (keysByDb === undefined) continue
      for (const [db, keys] of Object.entries(keysByDb)) {
        if (!keys.some((key) => matches(key.key))) continue
        open.add(connection.id)
        open.add(`${connection.id}:redis:db${db}`)
      }
    }
    return open
    // `matches` only depends on normalizedFilter, already listed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedFilter, treeMatch, connections, props.redisKeys])

  // The Redis subtree reads the expanded record directly, so hand it a copy
  // whose matching databases are forced open (they may be explicitly closed).
  const redisExpanded = useMemo(() => {
    if (normalizedFilter === '') return expanded
    let next: Record<string, boolean> | undefined
    for (const key of derivedOpen) {
      if (!key.includes(':redis:db')) continue
      if (next === undefined) next = { ...expanded }
      next[key] = true
    }
    return next ?? expanded
  }, [expanded, normalizedFilter, derivedOpen])

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

  // "Did anything match" comes from the same index, so a filter term costs one
  // traversal instead of a separate summary pass.
  const filterSummary = normalizedFilter === '' ? null : treeMatch.counts

  const grouped = useMemo(() => {
    const cache: Record<string, Record<FolderId, SchemaObject[]>> = {}
    const source = normalizedFilter === '' ? objects : treeMatch.objectsBySchema
    for (const [key, list] of Object.entries(source)) {
      const buckets = {} as Record<FolderId, SchemaObject[]>
      for (const folder of FOLDERS) buckets[folder.id] = []
      for (const object of list) buckets[folderOf(object.kind)].push(object)
      cache[key] = buckets
    }
    return cache
  }, [objects, normalizedFilter, treeMatch])

  // The detail spinner keeps a thin strip at the top; the filter itself is a
  // floating box pinned to the top-right corner of the tree, opened by Ctrl+F.
  const loadingDetail = props.detailLoading || props.redisDetailLoading
  const saysFilter = filterOpen || filter !== ''
  // Expanding everything can surface tens of thousands of rows; stop at a fixed
  // budget (with one hint line) instead of rendering the whole tree.
  const rowBudget = treeRowBudget(MAX_TREE_ROWS)
  const takeRows = (count: number): number => rowBudget.take(count)

  return (
    <div className="dshdb-view" style={{ gap: 8 }}>
      {/* Floats sit above the tree instead of in a toolbar row: a row that
          appears and disappears would shove the whole tree up and down while
          the user is clicking through tables. */}
      {saysFilter || loadingDetail ? (
        <div className="dshdb-tree-floats">
          {saysFilter ? (
            <div className="dshdb-tree-filter-float" ref={filterFloatRef} role="search">
              <FilterIcon size={13} />
              <TextInput
                ref={filterRef}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    // Skip the pause that normally follows typing: Enter means "now".
                    event.preventDefault()
                    setSettledFilter(filter)
                  }
                }}
                onBlur={(event) => {
                  if (event.currentTarget.value === '') setFilterOpen(false)
                }}
                placeholder={`筛选${treeFilterLabel}…`}
                aria-label={`筛选${treeFilterLabel}`}
                autoFocus
              />
              {filter !== '' ? (
                <button
                  type="button"
                  className="dshdb-row-action"
                  title="清空筛选"
                  aria-label="清空筛选"
                  onClick={() => {
                    setFilter('')
                    setSettledFilter('')
                  }}
                >
                  ×
                </button>
              ) : null}
            </div>
          ) : null}
          {loadingDetail ? (
            <span className="dshdb-tree-loading" role="status">
              <Spinner /> {props.redisDetailLoading ? '读取键值' : '读取结构'}
            </span>
          ) : null}
        </div>
      ) : null}

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
            {filterSummary !== null && filterSummary.connections === 0 ? (
              <span className="dshdb-filter-empty">没有匹配的对象</span>
            ) : null}
            {filterSummary !== null && filterSummary.objects > 0 ? (
              <span className="dshdb-filter-empty">{filterSummary.objects} 个对象匹配</span>
            ) : null}
            {connections.map((connection) => {
              const isSelected = connection.id === selectedId
              const isExpanded = expanded[connection.id] === true || derivedOpen.has(connection.id)
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
              if (takeRows(1) === 0) return null

              const schemaItems = allSchemas.map((schema) => ({ id: schema.name, label: schema.name }))
              const dbItems = Array.from({ length: props.redisDatabases[connection.id] ?? 16 }, (_, index) => ({
                id: String(index),
                label: index === connection.redisDb ? `db${index}（默认）` : `db${index}`,
              }))

              return (
                <div key={connection.id}>
                  <button
                    type="button"
                    className={`dshdb-row${dragging?.id === connection.id ? ' dshdb-row-dragging' : ''}${
                      dragging?.overId === connection.id
                        ? dragging.after
                          ? ' dshdb-row-drop-after'
                          : ' dshdb-row-drop-before'
                        : ''
                    }`}
                    role="treeitem"
                    aria-level={1}
                    aria-expanded={isExpanded}
                    data-active={isSelected}
                    data-kind="datasource"
                    title={`${connection.name} · ${connection.host}:${connection.port}${
                      connection.dialect === 'redis' ? ` · db${connection.redisDb}` : ''
                    }${cachedStamp ? `\n离线可用 · 结构更新于 ${relativeTime(cachedStamp)}` : ''}`}
                    onClick={() => props.onSelectConnection(connection.id)}
                    onDoubleClick={() => props.onToggleConnection(connection.id)}
                    onContextMenu={(event) => openConnectionMenu(event, connection)}
                    draggable={props.onReorderConnections !== undefined}
                    onDragStart={(event) => handleRowDragStart(event, connection.id)}
                    onDragOver={(event) => handleRowDragOver(event, connection.id)}
                    onDragLeave={handleRowDragLeave}
                    onDrop={(event) => handleRowDrop(event, connection.id)}
                    onDragEnd={handleRowDragEnd}
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
                          expanded={redisExpanded}
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
                            if (takeRows(1) === 0) return null
                            const key = `${connection.id}:${schema.name}`
                            const schemaExpanded = expanded[key] === true || derivedOpen.has(key)
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
                                  aria-level={2}
                                  aria-expanded={schemaExpanded}
                                  data-active={props.selectedKey === `${connection.id}|schema:${schema.name}`}
                                  data-kind="schema"
                                  style={DEPTH_ONE}
                                  onClick={() => props.onSelectSchema(connection.id, schema.name)}
                                  onDoubleClick={() => void props.onToggleSchema(connection.id, schema.name)}
                                  onContextMenu={(event) => openSchemaMenu(event, connection.id, schema.name)}
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
                                          const folderExpanded = expanded[folderKey] === true || derivedOpen.has(folderKey)
                                          const items = buckets?.[folder.id] ?? []
                                          const pageWindow = objectWindow(items.length, objectExtra[folderKey] ?? 0)
                                          if (takeRows(1) === 0) return null
                                          const shownRows = takeRows(pageWindow.visible)
                                          return (
                                            <div key={folder.id}>
                                              <button
                                                type="button"
                                                className="dshdb-row"
                                                role="treeitem"
                                                aria-level={3}
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
                                                  {items.slice(0, shownRows).map((object) => {
                                                    const objectKey = `${connection.id}|${schema.name}.${object.name}`
                                                    const columnKey = `${objectKey}#columns`
                                                    const keyFolderKey = `${objectKey}#keys`
                                                    const indexKey = `${objectKey}#indexes`
                                                    return (
                                                      <ObjectRow
                                                        key={object.name}
                                                        connectionId={connection.id}
                                                        schema={schema.name}
                                                        object={object}
                                                        selected={props.selectedKey === objectKey}
                                                        open={expanded[objectKey] === true || derivedOpen.has(objectKey)}
                                                        columnOpen={
                                                          expanded[columnKey] === true || derivedOpen.has(columnKey)
                                                        }
                                                        keyOpen={
                                                          expanded[keyFolderKey] === true ||
                                                          derivedOpen.has(keyFolderKey)
                                                        }
                                                        indexOpen={
                                                          expanded[indexKey] === true || derivedOpen.has(indexKey)
                                                        }
                                                        description={props.descriptions[objectKey]}
                                                        loading={props.loadingDescriptions[objectKey] === true}
                                                        onSelect={props.onSelectObject}
                                                        onOpen={props.onOpenTable}
                                                        onToggleKey={props.onToggleKey}
                                                        onMenu={openObjectMenu}
                                                        query={filterQuery.schema === '' ? normalizedFilter : filterQuery.name}
                                                      />
                                                    )
                                                  })}
                                                  {pageWindow.hidden > 0 && shownRows === pageWindow.visible ? (
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
            {rowBudget.truncated ? (
              <div className="dshdb-muted" style={{ padding: '4px 6px 4px 26px', fontSize: 11 }}>
                已显示前 {rowBudget.shown} 行，请缩小筛选范围
              </div>
            ) : null}
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
            <>
              {detail.columns.length > 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  title="按逗号复制这张表的所有列名"
                  aria-label="复制列名"
                  onClick={() => void copyText(detail.columns.map((column) => column.name).join(', '))}
                >
                  复制列名
                </Button>
              ) : null}
              {detail.kind === 'table' || detail.kind === 'view' ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="复制一条把列名写全的 SELECT"
                    aria-label="复制查询语句"
                    onClick={() => {
                      const connection = props.connections.find((item) => item.id === selectedId)
                      if (connection === undefined) return
                      void copyText(selectColumnsSql(connection.dialect, detail.schema, detail.table, detail.columns))
                    }}
                  >
                    复制查询
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => props.onShowDdl(selectedId, detail.schema, detail.table, detail.kind)}
                  >
                    DDL
                  </Button>
                </>
              ) : null}
            </>
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
      <TreeMenu menu={schemaMenu} onClose={() => setSchemaMenu(null)} />
      <TreeMenu menu={connectionMenu} onClose={() => setConnectionMenu(null)} />
    </div>
  )
}

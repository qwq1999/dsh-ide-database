import { moveId } from '../dragorder'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
} from 'react'
import type {
  ClientConnection,
  RedisKeyInfo,
  RedisValue,
  SchemaInfo,
  SchemaObject,
  ServerInfo,
  TableDescription,
} from '../../shared/types'
import { objectKindLabel } from '../format'
import { filterTargets, matchesFilteredObject, parseFilter } from '../treefilter'
import { shortcutHit } from '../keymap'
import { RedisValuePanel } from '../redisview'
import { copyText } from '../colmenu'
import { selectColumnsSql } from '../tablesql'
import { tableSelectSql } from '../tablesql'
import { TreeMenu, placeMenu, type TreeMenuState } from './tree-menu'
import { objectIcon } from './tree-parts'
import { buildTreeRows, folderOf, type TreeRow } from './tree-rows'
import { TreeRowView, type TreeRowActions } from './tree-row-view'
import { TREE_ROW_HEIGHT, useWindow } from '../useWindow'
import { DatabaseIcon, FilterIcon, KeyIcon, PlusIcon } from '../icons'
import { Button, EmptyState, Loading, Panel, Tag, TextInput } from '../ui'
import { usePopoverDismiss } from '../popover'

export { relativeTime } from '../relativetime'

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

const rowDomId = (index: number): string => `dshdb-tree-row-${index}`

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
  // Keyboard focus lives on the container; this index is the row the arrow keys
  // currently sit on. It is deliberately absent from the row data, so selecting
  // a table never rebuilds the flat row array.
  const [activeIndex, setActiveIndex] = useState(-1)
  const activeIndexRef = useRef(-1)
  activeIndexRef.current = activeIndex
  const propsRef = useRef(props)
  propsRef.current = props

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

  // The memoized row actions read these through refs: re-creating the handlers
  // on every render would hand every mounted row a fresh `actions` object and
  // defeat the memo around TreeRowView.
  const dragHandlers = useRef({ start: handleRowDragStart, over: handleRowDragOver, leave: handleRowDragLeave, drop: handleRowDrop, end: handleRowDragEnd })
  dragHandlers.current = {
    start: handleRowDragStart,
    over: handleRowDragOver,
    leave: handleRowDragLeave,
    drop: handleRowDrop,
    end: handleRowDragEnd,
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

  const menuHandlers = useRef({ openObjectMenu, openSchemaMenu, openConnectionMenu })
  menuHandlers.current = { openObjectMenu, openSchemaMenu, openConnectionMenu }

  const normalizedFilter = settledFilter.trim().toLowerCase()
  // Folding is per filter term: a new search gets the first page again.
  useEffect(() => {
    // Keep the same empty object when nothing was paged in: swapping in a
    // fresh {} would rebuild every row and repaint the whole window.
    setObjectExtra((current) => (Object.keys(current).length === 0 ? current : {}))
  }, [normalizedFilter])
  const matches = (text: string): boolean => normalizedFilter === '' || text.toLowerCase().includes(normalizedFilter)
  // `库.表` narrows the object list by schema; the schema row then stays visible through its buckets.
  const filterQuery = useMemo(() => parseFilter(settledFilter), [settledFilter])

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

  // A filtered tree needs a quick answer to "did anything match": count the
  // connections and objects that survived the filter.
  const filterSummary = useMemo(() => {
    if (normalizedFilter === '') return null
    const summary = { connections: 0, objects: 0 }
    for (const connection of connections) {
      const schemaNames = schemas[connection.id] ?? []
      if (schemaNames.some((schema) => matchesFilteredObject(filterQuery, schema.name, ''))) summary.connections += 1
      for (const [key, list] of Object.entries(objects)) {
        if (!key.startsWith(`${connection.id}:`)) continue
        const schemaName = key.slice(connection.id.length + 1)
        const matched = list.filter((object) => matchesFilteredObject(filterQuery, schemaName, object.name))
        summary.objects += matched.length
      }
    }
    summary.connections = Math.max(summary.connections, summary.objects > 0 ? 1 : 0)
    return summary
  }, [normalizedFilter, connections, schemas, objects, filterQuery])

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

  // The flat tree is rebuilt only when tree data or the settled filter changes.
  // Scrolling, hovering, dragging and selecting are view state and must not
  // invalidate this array.
  const rows = useMemo(
    () =>
      buildTreeRows({
        connections,
        servers,
        connectingId: props.connectingId,
        schemas,
        objects,
        expanded,
        loadingSchemas: props.loadingSchemas,
        loadingObjects: props.loadingObjects,
        cachedAt,
        descriptions: props.descriptions,
        loadingDescriptions: props.loadingDescriptions,
        redisKeys: props.redisKeys,
        redisCursor: props.redisCursor,
        loadingRedisKeys: props.loadingRedisKeys,
        redisDatabases: props.redisDatabases,
        redisDbs: props.redisDbs,
        visibleSchemas: props.visibleSchemas,
        filter: settledFilter,
        objectExtra,
      }),
    [
      connections,
      servers,
      props.connectingId,
      schemas,
      objects,
      expanded,
      props.loadingSchemas,
      props.loadingObjects,
      cachedAt,
      props.descriptions,
      props.loadingDescriptions,
      props.redisKeys,
      props.redisCursor,
      props.loadingRedisKeys,
      props.redisDatabases,
      props.redisDbs,
      props.visibleSchemas,
      settledFilter,
      objectExtra,
    ],
  )

  const { containerRef, range, totalHeight, viewportHeight, onScroll, scrollToIndex } = useWindow(rows.length)

  // Pressing a row is part of using the filter, not leaving it: only presses
  // outside both the box and the tree dismiss the search.
  const filterAnchors = useMemo(() => [filterFloatRef, containerRef], [containerRef])
  usePopoverDismiss(filterOpen, closeTreeFilter, filterAnchors)

  // A shrinking tree (collapsed branch, narrower filter) may leave the active
  // index past the end; keep the roving focus valid.
  useEffect(() => {
    setActiveIndex((current) => {
      if (rows.length === 0) return -1
      return current >= rows.length ? rows.length - 1 : current
    })
  }, [rows])

  const focusIndex = (index: number): void => {
    setActiveIndex(index)
    containerRef.current?.focus()
    scrollToIndex(index)
  }

  /** Expansion semantics of the chevron: selecting the branch too, like JetBrains. */
  const toggleRow = useCallback((row: TreeRow): void => {
    const current = propsRef.current
    switch (row.kind) {
      case 'connection':
        if (row.connectionId !== undefined) {
          current.onSelectConnection(row.connectionId)
          current.onToggleConnection(row.connectionId)
        }
        return
      case 'schema':
        if (row.connectionId !== undefined && row.schema !== undefined) {
          current.onSelectSchema(row.connectionId, row.schema)
          current.onToggleSchema(row.connectionId, row.schema)
        }
        return
      case 'folder':
        if (row.connectionId !== undefined && row.schema !== undefined && row.folder !== undefined) {
          current.onSelectFolder(row.connectionId, row.schema, row.folder)
          current.onToggleFolder(row.connectionId, row.schema, row.folder)
        }
        return
      case 'object':
        if (row.connectionId !== undefined && row.schema !== undefined && row.object !== undefined) {
          current.onSelectObject(row.connectionId, row.schema, row.object)
          if (row.toggleKey !== undefined) current.onToggleKey(row.toggleKey)
        }
        return
      case 'detail-folder':
        if (row.toggleKey !== undefined) current.onToggleKey(row.toggleKey)
        return
      case 'redis-db':
        if (row.connectionId !== undefined && row.db !== undefined) current.onToggleRedisDb(row.connectionId, row.db)
        return
      default:
        return
    }
  }, [])

  // openRow needs the same stable toggle; the ref keeps both callbacks
  // identity-stable without depending on each other.
  const toggleRowRef = useRef(toggleRow)
  toggleRowRef.current = toggleRow

  const activateRow = useCallback((row: TreeRow, event?: MouseEvent<HTMLElement>): void => {
    const current = propsRef.current
    switch (row.kind) {
      case 'connection':
        if (row.connectionId !== undefined) current.onSelectConnection(row.connectionId)
        return
      case 'schema':
        if (row.connectionId !== undefined && row.schema !== undefined) current.onSelectSchema(row.connectionId, row.schema)
        return
      case 'folder':
        if (row.connectionId !== undefined && row.schema !== undefined && row.folder !== undefined) {
          current.onSelectFolder(row.connectionId, row.schema, row.folder)
        }
        return
      case 'object':
        if (event !== undefined && event.detail > 1) return
        if (row.connectionId !== undefined && row.schema !== undefined && row.object !== undefined) {
          current.onSelectObject(row.connectionId, row.schema, row.object)
        }
        return
      case 'detail-folder':
        if (row.connectionId !== undefined && row.schema !== undefined && row.object !== undefined) {
          current.onSelectObject(row.connectionId, row.schema, row.object)
        }
        return
      case 'redis-db':
        if (row.connectionId !== undefined && row.db !== undefined) current.onSelectRedisDb(row.connectionId, row.db)
        return
      case 'redis-key':
        if (row.connectionId !== undefined && row.db !== undefined && row.redisKey !== undefined) {
          current.onSelectRedisKey(row.connectionId, row.db, row.redisKey.key)
        }
        return
      case 'more':
        if (row.pageKey !== undefined) {
          setObjectExtra((currentExtra) => ({
            ...currentExtra,
            [row.pageKey as string]: (currentExtra[row.pageKey as string] ?? 0) + 200,
          }))
        }
        return
      case 'connect':
        if (row.connectionId !== undefined) current.onConnect(row.connectionId)
        return
      case 'redis-action':
        if (row.connectionId !== undefined && row.db !== undefined) {
          current.onLoadRedisKeys(row.connectionId, row.db, true)
        }
        return
      default:
        return
    }
  }, [])

  const openRow = useCallback((row: TreeRow): void => {
    const current = propsRef.current
    if (row.kind === 'object') {
      if (row.expandable && row.connectionId !== undefined && row.schema !== undefined && row.object !== undefined) {
        current.onSelectObject(row.connectionId, row.schema, row.object)
        current.onOpenTable(row.connectionId, row.schema, { name: row.object.name, kind: row.object.kind })
      }
      return
    }
    if (row.kind === 'detail-folder') {
      if (row.toggleKey !== undefined) current.onToggleKey(row.toggleKey)
      return
    }
    if (row.expandable) toggleRowRef.current(row)
  }, [])

  const actions = useMemo<TreeRowActions>(
    () => ({
      activate: (row, event) => activateRow(row, event),
      toggle: (row) => toggleRow(row),
      open: (row) => openRow(row),
      menu: (row, event) => {
        if (row.kind === 'connection') {
          const connection = propsRef.current.connections.find((item) => item.id === row.connectionId)
          if (connection !== undefined) {
            menuHandlers.current.openConnectionMenu(event as MouseEvent<HTMLButtonElement>, connection)
          }
        } else if (row.kind === 'schema' && row.connectionId !== undefined && row.schema !== undefined) {
          menuHandlers.current.openSchemaMenu(event as MouseEvent<HTMLButtonElement>, row.connectionId, row.schema)
        } else if (row.kind === 'object' && row.connectionId !== undefined && row.schema !== undefined && row.object !== undefined) {
          menuHandlers.current.openObjectMenu(event as MouseEvent<HTMLButtonElement>, row.connectionId, row.schema, row.object)
        }
      },
      connect: (connectionId) => propsRef.current.onConnect(connectionId),
      toggleSchemaVisible: (connectionId, schema) => propsRef.current.onToggleSchemaVisible(connectionId, schema),
      toggleAllSchemasVisible: (connectionId, all) => propsRef.current.onToggleAllSchemasVisible(connectionId, all),
      toggleRedisDbVisible: (connectionId, db) => propsRef.current.onToggleRedisDbVisible(connectionId, db),
      toggleAllRedisDbsVisible: (connectionId, all) => propsRef.current.onToggleAllRedisDbsVisible(connectionId, all),
      dragStart: (id, event) => dragHandlers.current.start(event, id),
      dragOver: (id, event) => dragHandlers.current.over(event, id),
      dragLeave: (event) => dragHandlers.current.leave(event),
      drop: (id, event) => dragHandlers.current.drop(event, id),
      dragEnd: () => dragHandlers.current.end(),
    }),
    [activateRow, openRow, toggleRow],
  )

  const navigable = useMemo(() => {
    const list: number[] = []
    rows.forEach((row, index) => {
      if (row.navigable) list.push(index)
    })
    return list
  }, [rows])

  // Roving keyboard focus over the flat array: Up/Down/PageUp/PageDown/Home/End
  // move between navigable rows, Left/Right collapse/expand or step to the
  // parent/child, and every move scrolls the target into the window.
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
    if (rows.length === 0) return
    const targetElement = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-index]') : null
    const domIndex = targetElement === null ? -1 : Number(targetElement.dataset.index)
    const current = Number.isInteger(domIndex) && domIndex >= 0 ? domIndex : activeIndexRef.current
    const position = navigable.indexOf(current)
    const last = navigable[navigable.length - 1]

    if (event.key === 'ArrowDown') {
      const next = position >= 0 ? navigable[position + 1] : navigable.find((index) => index > current)
      if (next !== undefined) {
        event.preventDefault()
        focusIndex(next)
      }
      return
    }
    if (event.key === 'ArrowUp') {
      const next = position >= 0 ? navigable[position - 1] : [...navigable].reverse().find((index) => index < current)
      if (next !== undefined) {
        event.preventDefault()
        focusIndex(next)
      }
      return
    }
    if (event.key === 'Home') {
      if (navigable[0] !== undefined) {
        event.preventDefault()
        focusIndex(navigable[0])
      }
      return
    }
    if (event.key === 'End') {
      if (last !== undefined) {
        event.preventDefault()
        focusIndex(last)
      }
      return
    }
    if (event.key === 'PageDown' || event.key === 'PageUp') {
      const step = Math.max(1, Math.floor(viewportHeight / TREE_ROW_HEIGHT) - 1)
      const pool = event.key === 'PageDown' ? navigable.filter((index) => index > current) : navigable.filter((index) => index < current).reverse()
      const next = pool[Math.min(step, pool.length) - 1]
      if (next !== undefined) {
        event.preventDefault()
        focusIndex(next)
      }
      return
    }

    const row = current >= 0 && current < rows.length ? rows[current] : undefined
    if (row === undefined) return
    if (event.key === 'ArrowLeft') {
      if (row.expandable && row.open) {
        event.preventDefault()
        toggleRow(row)
        return
      }
      for (let index = current - 1; index >= 0; index -= 1) {
        if (rows[index].depth < row.depth) {
          event.preventDefault()
          focusIndex(index)
          return
        }
      }
      return
    }
    if (event.key === 'ArrowRight') {
      if (row.expandable && !row.open) {
        event.preventDefault()
        toggleRow(row)
        return
      }
      const child = current + 1
      if (child < rows.length && rows[child].depth > row.depth) {
        event.preventDefault()
        focusIndex(child)
      }
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (row.kind === 'object' && row.expandable) {
        openRow(row)
        return
      }
      if (row.kind === 'connect') {
        activateRow(row)
        return
      }
      if (row.expandable) {
        toggleRow(row)
        return
      }
      activateRow(row)
    }
  }

  const isSelected = (row: TreeRow): boolean =>
    row.kind === 'connection'
      ? row.connectionId === selectedId
      : row.selectedKey !== undefined && row.selectedKey === props.selectedKey

  // The detail spinner keeps a thin strip at the top; the filter itself is a
  // floating box pinned to the top-right corner of the tree, opened by Ctrl+F.
  const loadingDetail = props.detailLoading || props.redisDetailLoading
  const saysFilter = filterOpen || filter !== ''
  const activeRow = activeIndex >= 0 && activeIndex < rows.length ? rows[activeIndex] : undefined
  const activeVisible = activeRow !== undefined && activeIndex >= range.start && activeIndex < range.end

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
          {loadingDetail ? <Loading label={props.redisDetailLoading ? '读取键值' : '读取结构'} /> : null}
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
          {filterSummary !== null && filterSummary.connections === 0 ? (
            <span className="dshdb-filter-empty">没有匹配的对象</span>
          ) : null}
          {filterSummary !== null && filterSummary.objects > 0 ? (
            <span className="dshdb-filter-empty">{filterSummary.objects} 个对象匹配</span>
          ) : null}
          <div
            ref={containerRef}
            className="dshdb-tree dshdb-scroll-thin"
            role="tree"
            aria-label="数据源"
            tabIndex={0}
            aria-activedescendant={activeVisible && activeRow?.navigable === true ? rowDomId(activeIndex) : undefined}
            onKeyDown={handleTreeKey}
            onScroll={onScroll}
          >
            <div className="dshdb-tree-body" style={{ height: totalHeight }}>
              {rows.slice(range.start, range.end).map((row, offset) => {
                const index = range.start + offset
                return (
                  <div className="dshdb-tree-slot" key={row.key} style={{ top: index * TREE_ROW_HEIGHT }}>
                    <TreeRowView
                      row={row}
                      index={index}
                      domId={rowDomId(index)}
                      selected={isSelected(row)}
                      active={index === activeIndex}
                      dragging={dragging !== null && dragging.id === row.key}
                      dragEnabled={props.onReorderConnections !== undefined}
                      drop={
                        dragging !== null && dragging.overId === row.key
                          ? dragging.after
                            ? 'after'
                            : 'before'
                          : ''
                      }
                      actions={actions}
                    />
                  </div>
                )
              })}
            </div>
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

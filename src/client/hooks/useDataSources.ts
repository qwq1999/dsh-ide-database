/**
 * Connection and structure state for the database panel.
 *
 * The panel itself only renders; everything that talks to the host lives
 * here — the snapshot of saved connections, the live servers, the lazily
 * loaded schema/object trees, the per-table descriptions and the structure
 * cache that keeps the tree browsable while offline.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ClientConnection,
  DbSettings,
  DriverStatus,
  EnvStatus,
  RedisKeyInfo,
  RedisValue,
  SchemaInfo,
  SchemaObject,
  ServerInfo,
  StructureSnapshot,
  TableDescription,
} from '../../shared/types'
import { api } from '../api'
import { objectKindLabel } from '../format'

export interface Snapshot {
  connections: ClientConnection[]
  drivers: DriverStatus[]
  settings: DbSettings
  env: EnvStatus
}

export type Notify = (text: string, tone?: 'info' | 'success' | 'error') => void

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export interface DataSources {
  snapshot: Snapshot | null
  loadError: string
  selectedId: string
  selectConnection: (id: string) => void
  selected: ClientConnection | undefined
  server: ServerInfo | undefined
  servers: Record<string, ServerInfo>
  connectingId: string
  connections: ClientConnection[]
  schemas: Record<string, SchemaInfo[]>
  objects: Record<string, SchemaObject[]>
  expanded: Record<string, boolean>
  loadingSchemas: Record<string, boolean>
  loadingObjects: Record<string, boolean>
  cachedAt: Record<string, string>
  descriptions: Record<string, TableDescription>
  loadingDescriptions: Record<string, boolean>
  detail: TableDescription | null
  detailLoading: boolean
  selectedKey: string
  /** Keys scanned per connection and logical database. */
  redisKeys: Record<string, Record<string, RedisKeyInfo[]>>
  /** Scan cursor still pending per connection and database; `0`/missing means done. */
  redisCursor: Record<string, Record<string, string>>
  loadingRedisKeys: Record<string, Record<string, boolean>>
  /** Number of logical databases reported by the server. */
  redisDatabases: Record<string, number>
  /** Logical databases currently displayed in the tree. */
  redisDbs: Record<string, number[]>
  /**
   * Schemas hidden from the tree per connection. `null` means "all", a list is
   * the explicit selection persisted in localStorage.
   */
  visibleSchemas: Record<string, string[] | null>
  redisDetail: RedisValue | null
  redisDetailDb: number
  redisDetailLoading: boolean
  refresh: () => Promise<void>
  connect: (connectionId: string) => Promise<void>
  disconnect: (connectionId: string) => Promise<void>
  refreshSelected: () => Promise<void>
  resetDetail: () => void
  toggleConnection: (id: string) => void
  toggleFolder: (connectionId: string, schema: string, folder: string) => void
  toggleSchema: (connectionId: string, schema: string) => Promise<void>
  loadObjects: (connectionId: string, schema: string) => Promise<void>
  loadRedisDatabases: (connectionId: string) => Promise<void>
  loadRedisKeys: (connectionId: string, db: number, more?: boolean) => Promise<void>
  toggleRedisDb: (connectionId: string, db: number) => void
  toggleKey: (key: string) => void
  selectObject: (connectionId: string, schema: string, object: SchemaObject) => Promise<void>
  selectSchema: (connectionId: string, schema: string) => void
  selectFolder: (connectionId: string, schema: string, folder: string) => void
  selectRedisDb: (connectionId: string, db: number) => void
  selectRedisKey: (connectionId: string, db: number, key: string) => Promise<void>
  toggleSchemaVisible: (connectionId: string, schema: string) => void
  toggleAllSchemasVisible: (connectionId: string, all: boolean) => void
  toggleRedisDbVisible: (connectionId: string, db: number) => void
  toggleAllRedisDbsVisible: (connectionId: string, all: boolean) => void
  updateDrivers: (drivers: DriverStatus[]) => void
  applySettings: (settings: DbSettings, env: EnvStatus) => void
}

const VISIBLE_SCHEMAS_KEY = 'dsh-ide-database:visible-schemas:'
const VISIBLE_REDIS_DBS_KEY = 'dsh-ide-database:visible-redis-dbs:'

function readStoredList(key: string): string[] | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return null
  }
}

function writeStoredList(key: string, value: string[] | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode / quota errors must not break the tree.
  }
}

function readStoredDbs(key: string): number[] | null {
  const stored = readStoredList(key)
  if (stored === null) return null
  return stored.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0)
}

function writeStoredDbs(key: string, value: number[] | null): void {
  writeStoredList(key, value === null ? null : value.map(String))
}

export function useDataSources(notify: Notify): DataSources {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loadError, setLoadError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [servers, setServers] = useState<Record<string, ServerInfo>>({})
  const [connectingId, setConnectingId] = useState('')

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

  const [redisKeys, setRedisKeys] = useState<Record<string, Record<string, RedisKeyInfo[]>>>({})
  const [redisCursor, setRedisCursor] = useState<Record<string, Record<string, string>>>({})
  const [loadingRedisKeys, setLoadingRedisKeys] = useState<Record<string, Record<string, boolean>>>({})
  const [redisDatabases, setRedisDatabases] = useState<Record<string, number>>({})
  const [redisDbs, setRedisDbs] = useState<Record<string, number[]>>({})
  const [visibleSchemas, setVisibleSchemas] = useState<Record<string, string[] | null>>({})
  const [redisDetail, setRedisDetail] = useState<RedisValue | null>(null)
  const [redisDetailDb, setRedisDetailDb] = useState(-1)
  const [redisDetailLoading, setRedisDetailLoading] = useState(false)
  const redisRequest = useRef(0)
  const detailRequest = useRef(0)
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId

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

  const applyStructures = useCallback((structures: StructureSnapshot): void => {
    const nextSchemas: Record<string, SchemaInfo[]> = {}
    const nextObjects: Record<string, SchemaObject[]> = {}
    const nextCached: Record<string, string> = {}
    const nextDescriptions: Record<string, TableDescription> = {}
    const nextRedisKeys: Record<string, Record<string, RedisKeyInfo[]>> = {}
    const nextRedisCursor: Record<string, Record<string, string>> = {}
    const nextRedisDatabases: Record<string, number> = {}
    for (const [connectionId, entry] of Object.entries(structures)) {
      if (entry.schemas.length > 0) nextSchemas[connectionId] = entry.schemas
      for (const [schema, list] of Object.entries(entry.objects)) {
        nextObjects[`${connectionId}:${schema}`] = list
      }
      for (const [key, description] of Object.entries(entry.descriptions ?? {})) {
        nextDescriptions[`${connectionId}|${key}`] = description
      }
      if (entry.redis !== undefined) {
        nextRedisDatabases[connectionId] = entry.redis.databases
        const keys: Record<string, RedisKeyInfo[]> = {}
        const cursors: Record<string, string> = {}
        for (const [db, cache] of Object.entries(entry.redis.dbs)) {
          keys[db] = cache.keys
          cursors[db] = cache.cursor
        }
        nextRedisKeys[connectionId] = keys
        nextRedisCursor[connectionId] = cursors
        const cachedDbs = Object.keys(keys)
          .map(Number)
          .filter((db) => Number.isInteger(db) && db >= 0)
          .sort((left, right) => left - right)
        setRedisDbs((previous) => {
          if (previous[connectionId] !== undefined) return previous
          const stored = readStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connectionId}`)
          const chosen = stored ?? (cachedDbs.length > 0 ? cachedDbs : [0])
          return { ...previous, [connectionId]: chosen }
        })
      }
      nextCached[connectionId] = entry.fetchedAt
    }
    setSchemas((previous) => ({ ...nextSchemas, ...previous }))
    setObjects((previous) => ({ ...nextObjects, ...previous }))
    setDescriptions((previous) => ({ ...nextDescriptions, ...previous }))
    setCachedAt((previous) => ({ ...nextCached, ...previous }))
    setRedisDatabases((previous) => ({ ...nextRedisDatabases, ...previous }))
    setRedisKeys((previous) => ({ ...nextRedisKeys, ...previous }))
    setRedisCursor((previous) => ({ ...nextRedisCursor, ...previous }))
  }, [])

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
  }, [applyStructures])

  useEffect(() => {
    if (!snapshot) return
    const exists = snapshot.connections.some((connection) => connection.id === selectedId)
    if (!exists) {
      // Keep cached structures: they are keyed by connection id and the tree
      // filters by `snapshot.connections`, so stale entries are harmless.
      setSelectedId(snapshot.connections[0]?.id ?? '')
      setServers({})
      setDetail(null)
      setRedisDetail(null)
      setSelectedKey('')
    }
  }, [snapshot, selectedId])

  const connections = snapshot?.connections ?? []
  const selected = connections.find((connection) => connection.id === selectedId)
  const server = selected ? servers[selected.id] : undefined

  // Restore which logical databases each Redis connection shows. The persisted
  // choice wins; otherwise fall back to the databases found in the cache, then
  // to the connection's own default database.
  useEffect(() => {
    if (!snapshot) return
    const missing: Record<string, number[]> = {}
    for (const connection of snapshot.connections) {
      if (connection.dialect !== 'redis' || redisDbs[connection.id] !== undefined) continue
      const stored = readStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connection.id}`)
      const cached = Object.keys(redisKeys[connection.id] ?? {})
        .map(Number)
        .filter((db) => Number.isInteger(db) && db >= 0)
        .sort((left, right) => left - right)
      missing[connection.id] = stored ?? (cached.length > 0 ? cached : [connection.redisDb])
    }
    if (Object.keys(missing).length > 0) setRedisDbs((previous) => ({ ...missing, ...previous }))
  }, [snapshot, redisDbs, redisKeys])

  // Same for the SQL schema selection.
  useEffect(() => {
    if (!snapshot) return
    const missing: Record<string, string[] | null> = {}
    for (const connection of snapshot.connections) {
      if (connection.dialect === 'redis' || visibleSchemas[connection.id] !== undefined) continue
      missing[connection.id] = readStoredList(`${VISIBLE_SCHEMAS_KEY}${connection.id}`)
    }
    if (Object.keys(missing).length > 0) setVisibleSchemas((previous) => ({ ...missing, ...previous }))
  }, [snapshot, visibleSchemas])

  /**
   * Selecting another data source drops the detail of the previous one. This
   * lives in the setter rather than a `selectedId` effect so selecting an
   * object or a Redis key in one go (which sets both the id and the detail) is
   * not wiped right after it happens.
   */
  const selectConnection = useCallback((id: string): void => {
    if (selectedRef.current !== id) {
      setDetail(null)
      setRedisDetail(null)
      setSelectedKey('')
    }
    selectedRef.current = id
    setSelectedId(id)
  }, [])

  const loadSchemas = useCallback(
    async (connectionId: string): Promise<void> => {
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
    },
    [notify],
  )

  /** Read the server's logical-database count; the cached value is enough offline. */
  const loadRedisDatabases = useCallback(async (connectionId: string): Promise<void> => {
    try {
      const result = await api.redisDatabases(connectionId)
      setRedisDatabases((previous) => ({ ...previous, [connectionId]: result.databases }))
      setRedisDbs((previous) => {
        const current = previous[connectionId]
        if (current === undefined) return previous
        const pruned = current.filter((db) => db < result.databases)
        if (pruned.length === current.length) return previous
        const next = pruned.length > 0 ? pruned : [0]
        writeStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connectionId}`, next)
        return { ...previous, [connectionId]: next }
      })
    } catch {
      // Offline: the cached count (or the 16 default) still renders a picker.
    }
  }, [])

  /**
   * Scan one page of a Redis logical database. Each database keeps its own
   * cursor and key list, mirroring how `SCAN` works per `SELECT`-ed db.
   */
  const loadRedisKeys = useCallback(
    async (connectionId: string, db: number, more = false): Promise<void> => {
      if (loadingRedisKeys[connectionId]?.[db] === true) return
      const cursor = more ? (redisCursor[connectionId]?.[db] ?? '0') : '0'
      if (more && cursor === '0') return
      setLoadingRedisKeys((previous) => ({
        ...previous,
        [connectionId]: { ...(previous[connectionId] ?? {}), [db]: true },
      }))
      try {
        const result = await api.redisScan({ id: connectionId, db, cursor })
        setRedisKeys((previous) => {
          const byDb = previous[connectionId] ?? {}
          const merged = new Map((more ? (byDb[db] ?? []) : []).map((key) => [key.key, key]))
          for (const key of result.keys) merged.set(key.key, key)
          return { ...previous, [connectionId]: { ...byDb, [db]: [...merged.values()] } }
        })
        setRedisCursor((previous) => ({
          ...previous,
          [connectionId]: { ...(previous[connectionId] ?? {}), [db]: result.cursor },
        }))
      } catch (error) {
        notify(`扫描 Redis 键失败：${errorText(error)}`, 'error')
      } finally {
        setLoadingRedisKeys((previous) => ({
          ...previous,
          [connectionId]: { ...(previous[connectionId] ?? {}), [db]: false },
        }))
      }
    },
    [loadingRedisKeys, redisCursor, notify],
  )

  const connect = useCallback(
    async (connectionId: string): Promise<void> => {
      const connection = connections.find((item) => item.id === connectionId)
      if (!connection) return
      setConnectingId(connectionId)
      try {
        const connected = await api.connect(connectionId)
        setServers((previous) => ({ ...previous, [connectionId]: connected }))
        notify('连接成功', 'success')
        if (connection.dialect === 'redis') {
          await loadRedisDatabases(connectionId)
          const shown = redisDbs[connectionId]
          const dbs = shown === undefined || shown.length === 0 ? [connection.redisDb] : shown
          if (shown === undefined) setRedisDbs((previous) => ({ ...previous, [connectionId]: dbs }))
          // Each logical db scans independently, so fan out instead of paying one
          // network round trip per db on connect.
          await Promise.all(dbs.map((db) => loadRedisKeys(connectionId, db)))
        } else {
          await loadSchemas(connectionId)
        }
      } catch (error) {
        notify(`连接失败：${errorText(error)}`, 'error')
      } finally {
        setConnectingId('')
      }
    },
    [connections, loadSchemas, loadRedisDatabases, loadRedisKeys, redisDbs, notify],
  )

  const disconnect = useCallback(
    async (connectionId: string): Promise<void> => {
      try {
        await api.disconnect(connectionId)
        setServers((previous) => {
          const next = { ...previous }
          delete next[connectionId]
          return next
        })
        setDetail(null)
        setRedisDetail(null)
        setRedisDetailDb(-1)
        setSelectedKey('')
        // The scanned keys stay as an offline cache; only live state is dropped.
        notify('已断开', 'info')
      } catch (error) {
        notify(`断开失败：${errorText(error)}`, 'error')
      }
    },
    [notify],
  )

  const toggleConnection = useCallback((id: string): void => {
    setExpanded((previous) => ({ ...previous, [id]: previous[id] !== true }))
  }, [])

  const toggleFolder = useCallback((connectionId: string, schema: string, folder: string): void => {
    const key = `${connectionId}:${schema}#${folder}`
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  }, [])

  const toggleSchema = useCallback(
    async (connectionId: string, schema: string): Promise<void> => {
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
    },
    [expanded, objects, notify],
  )

  // Load a schema's objects without touching its expansion state: the tree
  // filter uses this to search inside collapsed schemas before deciding what
  // to open. Failures stay silent so typing in the filter cannot spam toasts.
  const loadObjects = useCallback(
    async (connectionId: string, schema: string): Promise<void> => {
      const key = `${connectionId}:${schema}`
      if (objects[key] !== undefined || loadingObjects[key] === true) return
      setLoadingObjects((previous) => ({ ...previous, [key]: true }))
      try {
        const result = await api.objects(connectionId, schema)
        setObjects((previous) => ({ ...previous, [key]: result.objects }))
        if (result.fetchedAt !== undefined) {
          const stamp = result.fetchedAt
          setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }))
        }
      } catch {
        // leave the schema unloaded; the filter falls back to cached data
      } finally {
        setLoadingObjects((previous) => ({ ...previous, [key]: false }))
      }
    },
    [objects, loadingObjects],
  )

  const selectObject = useCallback(
    async (connectionId: string, schema: string, object: SchemaObject): Promise<void> => {
      const key = `${connectionId}|${schema}.${object.name}`
      const request = detailRequest.current + 1
      detailRequest.current = request
      setSelectedId(connectionId)
      setRedisDetail(null)
      setRedisDetailDb(-1)
      setSelectedKey(key)
      const known = descriptions[key]
      if (known !== undefined) {
        setDetailLoading(false)
        setDetail(known)
        return
      }
      // Routines, sequences and triggers have no column structure; their
      // definition is what the panel shows instead.
      if (object.kind !== 'table' && object.kind !== 'view') {
        if (!servers[connectionId]) {
          setDetailLoading(false)
          setDetail({ schema, table: object.name, kind: object.kind, columns: [], indexes: [] })
          notify(`数据源未连接，连接后可查看${objectKindLabel(object.kind)}定义`, 'info')
          return
        }
        setDetailLoading(true)
        setLoadingDescriptions((previous) => ({ ...previous, [key]: true }))
        try {
          const result = await api.ddl(connectionId, schema, object.name, object.kind)
          const described: TableDescription = {
            schema,
            table: object.name,
            kind: object.kind,
            columns: [],
            indexes: [],
            ddl: result.ddl,
            ddlSource: result.source,
            ddlWarnings: result.warnings,
          }
          setDescriptions((previous) => ({ ...previous, [key]: described }))
          if (detailRequest.current === request) setDetail(described)
        } catch (error) {
          if (detailRequest.current === request) {
            setDetail({ schema, table: object.name, kind: object.kind, columns: [], indexes: [] })
            notify(`读取${objectKindLabel(object.kind)}定义失败：${errorText(error)}`, 'error')
          }
        } finally {
          if (detailRequest.current === request) setDetailLoading(false)
          setLoadingDescriptions((previous) => ({ ...previous, [key]: false }))
        }
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
        if (detailRequest.current === request) setDetail(description)
      } catch (error) {
        if (detailRequest.current === request) setDetail(null)
        notify(`读取表结构失败：${errorText(error)}`, 'error')
      } finally {
        if (detailRequest.current === request) setDetailLoading(false)
        setLoadingDescriptions((previous) => ({ ...previous, [key]: false }))
      }
    },
    [descriptions, servers, notify],
  )

  const toggleKey = useCallback((key: string): void => {
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  }, [])

  /**
   * Selecting a schema or a folder only highlights that row; expanding stays
   * on the chevron so a click never collapses the branch being read.
   */
  const selectSchema = useCallback((connectionId: string, schema: string): void => {
    detailRequest.current += 1
    setSelectedId(connectionId)
    setDetail(null)
    setRedisDetail(null)
    setRedisDetailDb(-1)
    setSelectedKey(`${connectionId}|schema:${schema}`)
  }, [])

  const selectFolder = useCallback((connectionId: string, schema: string, folder: string): void => {
    detailRequest.current += 1
    setSelectedId(connectionId)
    setDetail(null)
    setRedisDetail(null)
    setRedisDetailDb(-1)
    setSelectedKey(`${connectionId}|${schema}#${folder}`)
  }, [])

  const selectRedisDb = useCallback((connectionId: string, db: number): void => {
    detailRequest.current += 1
    setSelectedId(connectionId)
    setDetail(null)
    setRedisDetail(null)
    setRedisDetailDb(-1)
    setSelectedKey(`${connectionId}|redisdb:${db}`)
  }, [])

  const toggleRedisDb = useCallback(
    (connectionId: string, db: number): void => {
      const key = `${connectionId}:redis:db${db}`
      const open = expanded[key] !== false
      setExpanded((previous) => ({ ...previous, [key]: !open }))
      if (open) return
      if (servers[connectionId] !== undefined && redisKeys[connectionId]?.[db] === undefined) {
        void loadRedisKeys(connectionId, db)
      }
    },
    [expanded, servers, redisKeys, loadRedisKeys],
  )

  /** Read one key's value for the tree's detail panel. */
  const selectRedisKey = useCallback(
    async (connectionId: string, db: number, key: string): Promise<void> => {
      detailRequest.current += 1
      setSelectedId(connectionId)
      setDetail(null)
      setRedisDetail(null)
      setRedisDetailDb(db)
      setSelectedKey(`${connectionId}|redis:${db}:${key}`)
      if (!servers[connectionId]) {
        setRedisDetailLoading(false)
        notify('数据源未连接，连接后可查看键值', 'info')
        return
      }
      const request = redisRequest.current + 1
      redisRequest.current = request
      setRedisDetailLoading(true)
      try {
        const value = await api.redisKey(connectionId, key, db)
        if (redisRequest.current === request) setRedisDetail(value)
      } catch (error) {
        if (redisRequest.current === request) {
          setRedisDetail(null)
          notify(`读取键值失败：${errorText(error)}`, 'error')
        }
      } finally {
        if (redisRequest.current === request) setRedisDetailLoading(false)
      }
    },
    [servers, notify],
  )

  /**
   * The row-end picker writes the visible list to localStorage so the choice
   * survives restarts, like DataGrip's database selector.
   */
  const toggleSchemaVisible = useCallback(
    (connectionId: string, schema: string): void => {
      const all = (schemas[connectionId] ?? []).map((item) => item.name)
      setVisibleSchemas((previous) => {
        const current = previous[connectionId] ?? all
        const list = current.includes(schema) ? current.filter((name) => name !== schema) : [...current, schema]
        const normalized = all.length > 0 && list.length === all.length ? null : list
        writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`, normalized)
        return { ...previous, [connectionId]: normalized }
      })
    },
    [schemas],
  )

  const toggleAllSchemasVisible = useCallback(
    (connectionId: string, all: boolean): void => {
      const value = all ? null : []
      writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`, value)
      setVisibleSchemas((previous) => ({ ...previous, [connectionId]: value }))
    },
    [],
  )

  const toggleRedisDbVisible = useCallback(
    (connectionId: string, db: number): void => {
      const fallback = connections.find((connection) => connection.id === connectionId)?.redisDb ?? 0
      const current = redisDbs[connectionId] ?? [fallback]
      const list = current.includes(db) ? current.filter((item) => item !== db) : [...current, db].sort((left, right) => left - right)
      writeStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connectionId}`, list)
      setRedisDbs((previous) => ({ ...previous, [connectionId]: list }))
      // Adding a database loads its first page right away, like DataGrip does
      // when a schema is switched on.
      if (!current.includes(db) && servers[connectionId] !== undefined && redisKeys[connectionId]?.[db] === undefined) {
        void loadRedisKeys(connectionId, db)
      }
    },
    [connections, redisDbs, servers, redisKeys, loadRedisKeys],
  )

  const toggleAllRedisDbsVisible = useCallback(
    (connectionId: string, all: boolean): void => {
      const count = redisDatabases[connectionId] ?? 16
      const list = all ? Array.from({ length: count }, (_, index) => index) : []
      writeStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connectionId}`, list)
      setRedisDbs((previous) => ({ ...previous, [connectionId]: list }))
    },
    [redisDatabases],
  )

  const resetDetail = useCallback((): void => {
    setDetail(null)
    setRedisDetail(null)
    setRedisDetailDb(-1)
    setSelectedKey('')
  }, [])

  const refreshSelected = useCallback(async (): Promise<void> => {
    setDetail(null)
    setRedisDetail(null)
    setSelectedKey('')
    if (!selected) {
      await refresh()
      return
    }
    if (selected.dialect === 'redis') {
      if (servers[selected.id]) {
        await loadRedisDatabases(selected.id)
        const shown = redisDbs[selected.id] ?? [selected.redisDb]
        for (const db of shown) await loadRedisKeys(selected.id, db)
        notify('已刷新数据源', 'success')
      } else {
        await connect(selected.id)
      }
      await refresh()
      return
    }
    if (!servers[selected.id]) {
      await connect(selected.id)
      await refresh()
      return
    }
    await loadSchemas(selected.id)
    await refresh()
    notify('已刷新数据源', 'success')
  }, [selected, servers, redisDbs, refresh, connect, loadSchemas, loadRedisDatabases, loadRedisKeys, notify])

  const updateDrivers = useCallback((drivers: DriverStatus[]): void => {
    setSnapshot((previous) => (previous ? { ...previous, drivers } : previous))
  }, [])

  const applySettings = useCallback((settings: DbSettings, env: EnvStatus): void => {
    setSnapshot((previous) => (previous ? { ...previous, settings, env } : previous))
  }, [])

  return {
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
    resetDetail,
    toggleConnection,
    toggleFolder,
    toggleSchema,
    loadObjects,
    loadRedisDatabases,
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
  }
}

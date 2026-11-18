/**
 * Connection and structure state for the database panel.
 *
 * The panel itself only renders; everything that talks to the host lives
 * here — the snapshot of saved connections, the live servers, the lazily
 * loaded schema/object trees, the per-table descriptions and the structure
 * cache that keeps the tree browsable while offline.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { readText, writeText } from '../prefs'
import { orderById } from '../dragorder'

/** Remembered so reopening the panel lands on the same data source. */
const LAST_CONNECTION_KEY = 'dsh-ide-database.last-connection.v1'
import type {
  ClientConnection,
  ClientTrashedConnection,
  DbSettings,
  DriverStatus,
  EnvStatus,
  PrefetchProgress,
  RedisKeyInfo,
  RedisValue,
  SchemaInfo,
  SchemaObject,
  ServerInfo,
  StructureSnapshot,
  TableDescription,
  UpdateNotice,
} from '../../shared/types'
import { api, ApiError } from '../api'
import { treeFolderKey, treeFolderSelectedKey, treeObjectKey, treeSchemaKey, treeSchemaSelectedKey } from '../treekeys'
import { objectKindLabel } from '../format'

export interface Snapshot {
  connections: ClientConnection[]
  trash: ClientTrashedConnection[]
  drivers: DriverStatus[]
  settings: DbSettings
  env: EnvStatus
  /** Background description walks the host is running right now. */
  prefetch: PrefetchProgress[]
  /** Update notices the host still shows; closing one hides it for good. */
  notices: UpdateNotice[]
}

export type Notify = (text: string, tone?: 'info' | 'success' | 'error') => void

/** A connect failure the user can only fix from the settings dialog. */
export interface SetupError {
  code: string
  message: string
}

const SETUP_ERROR_CODES = new Set(['java-missing', 'jar-missing', 'bridge', 'driver-missing'])

function setupErrorOf(error: unknown): SetupError | null {
  if (!(error instanceof ApiError) || !SETUP_ERROR_CODES.has(error.code)) return null
  return { code: error.code, message: error.message }
}

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
  /** Deleted connections kept in the recycle bin, newest first. */
  trash: ClientTrashedConnection[]
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
  /** Schema of the highlighted tree row ('' when a connection or nothing is selected). */
  selectedSchema: string
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
  /** Resolves to whether the server accepted the connection. */
  connect: (connectionId: string) => Promise<boolean>
  disconnect: (connectionId: string) => Promise<void>
  refreshSelected: () => Promise<void>
  resetDetail: () => void
  toggleConnection: (id: string) => void
  /** Persist a new data-source order after a row drag. */
  reorderConnections: (ids: string[]) => void
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
  /** Last connect failure caused by missing Java / bridge / driver jars. */
  setupError: SetupError | null
  dismissSetupError: () => void
  /** Close an update notice; the host remembers the dismissal. */
  dismissNotice: (id: string) => void
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

/**
 * A new data source starts with only its default schema visible: the connection
 * database when the server has it, else the login user (Oracle's schema name).
 * Returning `null` keeps every schema visible when neither name exists, so a
 * mis-detected default can never hide the whole tree.
 */
function defaultVisibleSchemas(
  connection: ClientConnection,
  schemas: readonly SchemaInfo[],
): string[] | null {
  if (schemas.length === 0) return null
  for (const name of [connection.database, connection.user]) {
    if (name === '') continue
    const match = schemas.find((schema) => schema.name.toLowerCase() === name.toLowerCase())
    if (match !== undefined) return [match.name]
  }
  return null
}

export function useDataSources(notify: Notify): DataSources {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loadError, setLoadError] = useState('')
  const [setupError, setSetupError] = useState<SetupError | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [servers, setServers] = useState<Record<string, ServerInfo>>({})
  const [connectingId, setConnectingId] = useState('')
  /** Concurrent connects: only the still-latest request owns the spinner. */
  const connectingRequest = useRef(0)
  /** Anticheck stale status polls so a late refresh cannot restore deleted data. */
  const refreshRequest = useRef(0)

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
  const [selectedSchema, setSelectedSchema] = useState('')

  const [redisKeys, setRedisKeys] = useState<Record<string, Record<string, RedisKeyInfo[]>>>({})
  const [redisCursor, setRedisCursor] = useState<Record<string, Record<string, string>>>({})
  const [loadingRedisKeys, setLoadingRedisKeys] = useState<Record<string, Record<string, boolean>>>({})
  const [redisDatabases, setRedisDatabases] = useState<Record<string, number>>({})
  const [redisDbs, setRedisDbs] = useState<Record<string, number[]>>({})
  const [visibleSchemas, setVisibleSchemas] = useState<Record<string, string[] | null>>({})
  const [redisDetail, setRedisDetail] = useState<RedisValue | null>(null)
  const [redisDetailDb, setRedisDetailDb] = useState(-1)
  const [redisDetailLoading, setRedisDetailLoading] = useState(false)
  const detailRequest = useRef(0)
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId

  /**
   * Invalidate any in-flight detail/key read and clear both spinners. Every
   * navigation that bumps `detailRequest` must go through this: the stale
   * request's finally is guarded by the same token and will NOT clear the
   * spinner once the token changes, so leaving it out strands the loading mask.
   */
  const invalidateDetail = useCallback((): void => {
    detailRequest.current += 1
    setDetailLoading(false)
    setRedisDetailLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    const request = ++refreshRequest.current
    try {
      const data = await api.status()
      // A newer refresh (delete/save, or the 1.5s poll) may have started while
      // this one was in flight; only the latest status snapshot may be applied.
      if (request !== refreshRequest.current) return
      setSnapshot({
        connections: data.config.connections,
        trash: data.config.trash,
        drivers: data.drivers,
        settings: data.config.settings,
        env: data.env,
        prefetch: data.prefetch ?? [],
        notices: data.notices ?? [],
      })
      setLoadError('')
    } catch (error) {
      if (request === refreshRequest.current) setLoadError(errorText(error))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // While the host fills structure descriptions in the background, keep asking
  // for status so the footer can show a live counter and clear itself when the
  // walk finishes.
  useEffect(() => {
    if ((snapshot?.prefetch.length ?? 0) === 0) return
    const timer = window.setInterval(() => {
      void refresh()
    }, 1500)
    return () => {
      window.clearInterval(timer)
    }
  }, [snapshot?.prefetch.length, refresh])

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
      const stored = readText(LAST_CONNECTION_KEY)
      const preferred = snapshot.connections.find((connection) => connection.id === stored)
      setSelectedId((preferred ?? snapshot.connections[0])?.id ?? '')
      invalidateDetail()
      // Only drop connections that are really gone from the snapshot; clearing
      // the whole table would hide the online state of every other connected
      // source (the host disconnects only the deleted id).
      setServers((previous) => {
        const alive = new Set(snapshot.connections.map((connection) => connection.id))
        return Object.fromEntries(Object.entries(previous).filter(([id]) => alive.has(id)))
      })
      setDetail(null)
      setRedisDetail(null)
      setSelectedKey('')
    }
  }, [snapshot, selectedId, invalidateDetail])

  const connections = snapshot?.connections ?? []
  const trash = snapshot?.trash ?? []
  const selected = connections.find((connection) => connection.id === selectedId)
  const server = selected ? servers[selected.id] : undefined

  // Read by callbacks whose identity must not change when the snapshot or the
  // visible-schema map changes (connect, refresh and the prefetch trigger).
  const connectionsRef = useRef(connections)
  connectionsRef.current = connections
  const schemasRef = useRef(schemas)
  schemasRef.current = schemas
  const visibleSchemasRef = useRef(visibleSchemas)
  visibleSchemasRef.current = visibleSchemas
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  // Read by the tree callbacks below. Keeping these behind refs lets the
  // callbacks keep one identity, which is what keeps memoized rows memoized.
  const objectsRef = useRef(objects)
  objectsRef.current = objects
  const loadingObjectsRef = useRef(loadingObjects)
  loadingObjectsRef.current = loadingObjects
  const descriptionsRef = useRef(descriptions)
  descriptionsRef.current = descriptions
  const serversRef = useRef(servers)
  serversRef.current = servers

  /**
   * Ask the host to keep table descriptions warm for the schemas that are
   * visible. Connecting fills only uncached relations; an explicit refresh
   * re-reads all of them.
   */
  const schedulePrefetch = useCallback(
    (connectionId: string, refreshAll: boolean, selection?: string[] | null): void => {
      const connection = connectionsRef.current.find((item) => item.id === connectionId)
      if (connection === undefined || connection.dialect === 'redis') return
      const visible = selection === undefined ? visibleSchemasRef.current[connectionId] : selection
      const names = schemasRef.current[connectionId]?.map((schema) => schema.name) ?? []
      const schemas = visible === null || visible === undefined ? (names.length > 0 ? names : undefined) : visible
      void api
        .prefetchConnection(connectionId, { refresh: refreshAll, schemas })
        .catch(() => undefined)
    },
    [],
  )

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

  // Same for the SQL schema selection. An absent key means the data source was
  // never opened, so its default schema is picked once the list is known.
  useEffect(() => {
    if (!snapshot) return
    const missing: Record<string, string[] | null> = {}
    for (const connection of snapshot.connections) {
      if (connection.dialect === 'redis' || visibleSchemas[connection.id] !== undefined) continue
      const stored = readStoredList(`${VISIBLE_SCHEMAS_KEY}${connection.id}`)
      if (stored !== null) missing[connection.id] = stored
    }
    if (Object.keys(missing).length > 0) setVisibleSchemas((previous) => ({ ...missing, ...previous }))
  }, [snapshot, visibleSchemas])

  // Cached structures populate the tree before the first connect; give a new
  // data source its default schema then too, so picker and cache agree.
  useEffect(() => {
    if (!snapshot) return
    const missing: Record<string, string[] | null> = {}
    for (const connection of snapshot.connections) {
      if (connection.dialect === 'redis' || visibleSchemas[connection.id] !== undefined) continue
      // The hydration effect above runs in the same commit but still sees this
      // render's (empty) visibleSchemas, so checking only that map here would
      // write a default over a choice the user already saved. Re-read storage:
      // if a choice exists, leave persistence alone and let hydration apply it.
      const key = `${VISIBLE_SCHEMAS_KEY}${connection.id}`
      if (readStoredList(key) !== null) continue
      const cached = schemas[connection.id]
      if (cached === undefined || cached.length === 0) continue
      const chosen = defaultVisibleSchemas(connection, cached)
      writeStoredList(key, chosen)
      missing[connection.id] = chosen
    }
    if (Object.keys(missing).length > 0) setVisibleSchemas((previous) => ({ ...missing, ...previous }))
  }, [snapshot, visibleSchemas, schemas])

  /**
   * Selecting another data source drops the detail of the previous one. This
   * lives in the setter rather than a `selectedId` effect so selecting an
   * object or a Redis key in one go (which sets both the id and the detail) is
   * not wiped right after it happens.
   */
  const selectConnection = useCallback((id: string): void => {
    if (selectedRef.current !== id) {
      invalidateDetail()
      setDetail(null)
      setRedisDetail(null)
      setSelectedKey('')
      setSelectedSchema('')
    }
    selectedRef.current = id
    setSelectedId(id)
    writeText(LAST_CONNECTION_KEY, id)
  }, [invalidateDetail])

  const loadSchemas = useCallback(
    async (connectionId: string, refreshObjects = false): Promise<void> => {
      setLoadingSchemas((previous) => ({ ...previous, [connectionId]: true }))
      try {
        const result = await api.schemas(connectionId)
        setSchemas((previous) => ({ ...previous, [connectionId]: result.schemas }))
        if (result.fetchedAt !== undefined) {
          const stamp = result.fetchedAt
          setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }))
        }
        // First open of a data source: only its default schema starts visible.
        // Persisting the choice keeps the picker and the background cache aligned.
        const stored = readStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`)
        const connection = connectionsRef.current.find((item) => item.id === connectionId)
        let selection = stored ?? visibleSchemasRef.current[connectionId]
        if (selection === undefined && connection !== undefined) {
          selection = defaultVisibleSchemas(connection, result.schemas)
          writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`, selection)
          setVisibleSchemas((previous) => ({ ...previous, [connectionId]: selection ?? null }))
        }
        schedulePrefetch(connectionId, false, selection)
        // Connecting (or refreshing) must not fold the tree back up: keep the
        // expansion of every schema that still exists and re-read the object
        // lists of the schemas that are open right now, in place.
        const listed = new Set(result.schemas.map((schema) => schema.name))
        const kept: Record<string, boolean> = {}
        const open: string[] = []
        for (const [key, value] of Object.entries(expandedRef.current)) {
          if (!key.startsWith(`${connectionId}:`)) {
            kept[key] = value
            continue
          }
          const rest = key.slice(connectionId.length + 1)
          const hash = rest.indexOf('#')
          const encodedSchema = hash === -1 ? rest : rest.slice(0, hash)
          let schema: string
          try {
            schema = decodeURIComponent(encodedSchema)
          } catch {
            // Keys from the previous in-memory format were not encoded.
            schema = encodedSchema
          }
          if (!listed.has(schema)) continue
          kept[key] = value
          if (hash === -1 && value === true && schema !== 'redis') open.push(schema)
        }
        setExpanded(kept)
        // A plain connect or background refresh keeps every cached list: the
        // tree already has the rows, and dropping them would make a filter
        // re-read schemas the user cannot see expanded. Only an explicit
        // refresh prunes the lists of schemas that are closed, and schemas
        // that no longer exist go either way.
        setObjects((previous) => {
          const next = { ...previous }
          for (const key of Object.keys(next)) {
            if (!key.startsWith(`${connectionId}:`)) continue
            const schema = key.slice(connectionId.length + 1)
            if (!listed.has(schema) || (refreshObjects && !open.includes(schema))) delete next[key]
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
        if (open.length > 0) {
          setLoadingObjects((previous) => {
            const next = { ...previous }
            for (const schema of open) next[`${connectionId}:${schema}`] = true
            return next
          })
          const refreshed = await Promise.all(
            open.map(async (schema) => {
              try {
                return [schema, await api.objects(connectionId, schema)] as const
              } catch {
                // Keep the list we already had; the next expand retries.
                return undefined
              }
            }),
          )
          setObjects((previous) => {
            const next = { ...previous }
            for (const entry of refreshed) {
              if (entry !== undefined) next[`${connectionId}:${entry[0]}`] = entry[1].objects
            }
            return next
          })
          setLoadingObjects((previous) => {
            const next = { ...previous }
            for (const schema of open) delete next[`${connectionId}:${schema}`]
            return next
          })
        }
      } catch (error) {
        notify(`加载 schema 失败：${errorText(error)}`, 'error')
      } finally {
        setLoadingSchemas((previous) => ({ ...previous, [connectionId]: false }))
      }
    },
    [notify, schedulePrefetch],
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
    async (connectionId: string): Promise<boolean> => {
      const connection = connections.find((item) => item.id === connectionId)
      if (!connection) return false
      const request = ++connectingRequest.current
      setConnectingId(connectionId)
      try {
        const connected = await api.connect(connectionId)
        // A newer connect/disconnect may have superseded this request; only the
        // latest one owns the connection result, error and follow-up loads.
        if (request !== connectingRequest.current) return false
        // The connection may have been deleted while the request was in
        // flight; a late response must not resurrect its online state.
        if (!connectionsRef.current.some((item) => item.id === connectionId)) return false
        setServers((previous) => ({ ...previous, [connectionId]: connected }))
        setSetupError(null)
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
        return true
      } catch (error) {
        // A superseded connect must not surface a stale failure toast/error.
        if (request !== connectingRequest.current) return false
        setSetupError(setupErrorOf(error))
        notify(`连接失败：${errorText(error)}`, 'error')
        return false
      } finally {
        if (request === connectingRequest.current) setConnectingId('')
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
        // Invalidate any in-flight connect for this connection too: its late
        // success must not mark a now-disconnected source online again.
        connectingRequest.current += 1
        // The in-flight connect for this id can no longer reach its finally
        // guard (its request is now stale), so clear its spinner here.
        setConnectingId((previous) => (previous === connectionId ? '' : previous))
        // A detail/key read may still be in flight for this connection; drop
        // its token so a late response cannot repopulate a disconnected source.
        invalidateDetail()
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
    [notify, invalidateDetail],
  )

  const toggleConnection = useCallback((id: string): void => {
    setExpanded((previous) => ({ ...previous, [id]: previous[id] !== true }))
  }, [])

  const reorderConnections = useCallback((ids: string[]): void => {
    // Apply the dropped order at once so the row never snaps back while the
    // host writes the config; a rejected write reloads the saved order.
    setSnapshot((previous) => (previous ? { ...previous, connections: orderById(previous.connections, ids) } : previous))
    // A delete/save/refresh can land while the reorder write is in flight. Its
    // fresh status snapshot must win over this late reorder response, which
    // still carries the old connection list (and would resurrect deleted ones).
    const request = refreshRequest.current
    void api
      .reorderConnections(ids)
      .then((result) => {
        if (request !== refreshRequest.current) return
        setSnapshot((previous) => (previous ? { ...previous, connections: result.config.connections } : previous))
      })
      .catch((error) => {
        notify(`排序失败：${errorText(error)}`, 'error')
        void refresh()
      })
  }, [notify, refresh])

  const toggleFolder = useCallback((connectionId: string, schema: string, folder: string): void => {
    const key = treeFolderKey(connectionId, schema, folder)
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  }, [])

  const toggleSchema = useCallback(
    async (connectionId: string, schema: string): Promise<void> => {
      const expandedKey = treeSchemaKey(connectionId, schema)
      const objectsKey = `${connectionId}:${schema}`
      const isExpanded = expandedRef.current[expandedKey] === true
      setExpanded((previous) => ({ ...previous, [expandedKey]: !isExpanded }))
      if (isExpanded || objectsRef.current[objectsKey] !== undefined) return
      setLoadingObjects((previous) => ({ ...previous, [objectsKey]: true }))
      try {
        const result = await api.objects(connectionId, schema)
        setObjects((previous) => ({ ...previous, [objectsKey]: result.objects }))
        if (result.fetchedAt !== undefined) {
          const stamp = result.fetchedAt
          setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }))
        }
      } catch (error) {
        notify(`加载对象失败：${errorText(error)}`, 'error')
      } finally {
        setLoadingObjects((previous) => ({ ...previous, [objectsKey]: false }))
      }
    },
    [notify],
  )

  // Load a schema's objects without touching its expansion state: the tree
  // filter uses this to search inside collapsed schemas before deciding what
  // to open. Failures stay silent so typing in the filter cannot spam toasts.
  const loadObjects = useCallback(
    async (connectionId: string, schema: string): Promise<void> => {
      const key = `${connectionId}:${schema}`
      if (objectsRef.current[key] !== undefined || loadingObjectsRef.current[key] === true) return
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
    [],
  )

  const selectObject = useCallback(
    async (connectionId: string, schema: string, object: SchemaObject): Promise<void> => {
      const key = treeObjectKey(connectionId, schema, object.name)
      const request = detailRequest.current + 1
      detailRequest.current = request
      setDetailLoading(false)
      setSelectedId(connectionId)
      writeText(LAST_CONNECTION_KEY, connectionId)
      setRedisDetail(null)
      setRedisDetailLoading(false)
      setRedisDetailDb(-1)
      setSelectedKey(key)
      setSelectedSchema(schema)
      const known = descriptionsRef.current[key]
      if (known !== undefined) {
        setDetailLoading(false)
        setDetail(known)
        return
      }
      // Routines, sequences and triggers have no column structure; their
      // definition is what the panel shows instead. The host keeps the last
      // definition it read, so an offline source can still answer this.
      if (object.kind !== 'table' && object.kind !== 'view') {
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
            if (!serversRef.current[connectionId]) notify(`数据源未连接，连接后可查看${objectKindLabel(object.kind)}定义`, 'info')
            else notify(`读取${objectKindLabel(object.kind)}定义失败：${errorText(error)}`, 'error')
          }
        } finally {
          if (detailRequest.current === request) setDetailLoading(false)
          setLoadingDescriptions((previous) => ({ ...previous, [key]: false }))
        }
        return
      }
      // Descriptions are no longer shipped with the tree snapshot, so even when
      // the source is offline the host can answer this from its cache.
      setDetailLoading(true)
      setLoadingDescriptions((previous) => ({ ...previous, [key]: true }))
      try {
        const description = await api.describe(connectionId, schema, object.name, object.kind)
        setDescriptions((previous) => ({ ...previous, [key]: description }))
        if (detailRequest.current === request) setDetail(description)
      } catch (error) {
        // Only report failures for the still-current request: after a switch,
        // a stale describe rejection must neither clear the new detail nor
        // surface a toast naming a table the user is no longer viewing.
        if (detailRequest.current === request) {
          setDetail(null)
          if (!serversRef.current[connectionId]) notify('数据源未连接，连接后可查看表结构', 'info')
          else notify(`读取表结构失败：${errorText(error)}`, 'error')
        }
      } finally {
        if (detailRequest.current === request) setDetailLoading(false)
        setLoadingDescriptions((previous) => ({ ...previous, [key]: false }))
      }
    },
    [notify],
  )

  const toggleKey = useCallback((key: string): void => {
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  }, [])

  /**
   * Selecting a schema or a folder only highlights that row; expanding stays
   * on the chevron so a click never collapses the branch being read.
   */
  const selectSchema = useCallback((connectionId: string, schema: string): void => {
    invalidateDetail()
    setSelectedId(connectionId)
    setDetail(null)
    setRedisDetail(null)
    setRedisDetailDb(-1)
    setSelectedKey(treeSchemaSelectedKey(connectionId, schema))
    setSelectedSchema(schema)
    writeText(LAST_CONNECTION_KEY, connectionId)
  }, [invalidateDetail])

  const selectFolder = useCallback((connectionId: string, schema: string, folder: string): void => {
    invalidateDetail()
    setSelectedId(connectionId)
    setDetail(null)
    setRedisDetail(null)
    setRedisDetailDb(-1)
    setSelectedKey(treeFolderSelectedKey(connectionId, schema, folder))
    setSelectedSchema(schema)
    writeText(LAST_CONNECTION_KEY, connectionId)
  }, [invalidateDetail])

  const selectRedisDb = useCallback((connectionId: string, db: number): void => {
    invalidateDetail()
    setSelectedId(connectionId)
    setDetail(null)
    setRedisDetail(null)
    setRedisDetailDb(-1)
    setSelectedKey(`${connectionId}|redisdb:${db}`)
    setSelectedSchema('')
    writeText(LAST_CONNECTION_KEY, connectionId)
  }, [invalidateDetail])

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
      const request = detailRequest.current + 1
      detailRequest.current = request
      setDetailLoading(false)
      setSelectedId(connectionId)
      writeText(LAST_CONNECTION_KEY, connectionId)
      setDetail(null)
      setRedisDetail(null)
      setRedisDetailDb(db)
      setSelectedKey(`${connectionId}|redis:${db}:${key}`)
      setSelectedSchema('')
      if (!servers[connectionId]) {
        setRedisDetailLoading(false)
        notify('数据源未连接，连接后可查看键值', 'info')
        return
      }
      setRedisDetailLoading(true)
      try {
        const value = await api.redisKey(connectionId, key, db)
        if (detailRequest.current === request) setRedisDetail(value)
      } catch (error) {
        if (detailRequest.current === request) {
          setRedisDetail(null)
          notify(`读取键值失败：${errorText(error)}`, 'error')
        }
      } finally {
        if (detailRequest.current === request) setRedisDetailLoading(false)
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
      const current = visibleSchemas[connectionId] ?? all
      const enabling = !current.includes(schema)
      const list = enabling ? [...current, schema] : current.filter((name) => name !== schema)
      writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`, list)
      setVisibleSchemas((previous) => ({ ...previous, [connectionId]: list }))
      if (!enabling) return
      // A newly visible schema starts caching right away: read its object list
      // (the host prefetcher needs it) and warm that schema's descriptions.
      void loadObjects(connectionId, schema)
      if (servers[connectionId] !== undefined) {
        void api.prefetchConnection(connectionId, { schemas: [schema] }).catch(() => undefined)
      }
    },
    [schemas, visibleSchemas, servers, loadObjects],
  )

  const toggleAllSchemasVisible = useCallback(
    (connectionId: string, all: boolean): void => {
      const list = all ? (schemas[connectionId] ?? []).map((item) => item.name) : []
      writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`, list)
      setVisibleSchemas((previous) => ({ ...previous, [connectionId]: list }))
      if (all) schedulePrefetch(connectionId, false, list)
    },
    [schemas, schedulePrefetch],
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
    invalidateDetail()
    setDetail(null)
    setRedisDetail(null)
    setRedisDetailDb(-1)
    setSelectedKey('')
  }, [invalidateDetail])

  const refreshSelected = useCallback(async (): Promise<void> => {
    invalidateDetail()
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
        // Each database is an independent SCAN; refreshing them sequentially just adds round trips.
        await Promise.all(shown.map((db) => loadRedisKeys(selected.id, db)))
        notify('已刷新数据源', 'success')
      } else {
        await connect(selected.id)
      }
      await refresh()
      return
    }
    if (!servers[selected.id]) {
      // Refreshing an offline source reconnects first. The refresh still has to
      // finish like one on a live source: connect() only fills the missing
      // descriptions, so without this pass a warm cache would report no
      // 「缓存结构」 progress at all.
      if (!(await connect(selected.id))) {
        await refresh()
        return
      }
      schedulePrefetch(selected.id, true)
      await refresh()
      notify('已刷新数据源', 'success')
      return
    }
    await loadSchemas(selected.id, true)
    // Refresh means "re-read every cached description", not just fill the gaps.
    schedulePrefetch(selected.id, true)
    await refresh()
    notify('已刷新数据源', 'success')
  }, [selected, servers, redisDbs, refresh, connect, loadSchemas, loadRedisDatabases, loadRedisKeys, notify, schedulePrefetch, invalidateDetail])

  const updateDrivers = useCallback((drivers: DriverStatus[]): void => {
    setSnapshot((previous) => (previous ? { ...previous, drivers } : previous))
  }, [])

  const applySettings = useCallback((settings: DbSettings, env: EnvStatus): void => {
    setSnapshot((previous) => (previous ? { ...previous, settings, env } : previous))
  }, [])

  const dismissSetupError = useCallback((): void => {
    setSetupError(null)
  }, [])

  /**
   * Close an update notice. The host writes the id to the config file, so the
   * notice never comes back; the response carries what is still visible.
   */
  const dismissNotice = useCallback(
    (id: string): void => {
      void (async () => {
        try {
          const notices = await api.dismissNotice(id)
          setSnapshot((previous) => (previous === null ? previous : { ...previous, notices }))
        } catch (error) {
          notify(`关闭提示失败：${errorText(error)}`, 'error')
        }
      })()
    },
    [notify],
  )

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
    refreshSelected,
    resetDetail,
    toggleConnection,
    reorderConnections,
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
    setupError,
    dismissSetupError,
    dismissNotice,
  }
}

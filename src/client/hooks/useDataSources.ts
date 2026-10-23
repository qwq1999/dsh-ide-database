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
  /** Keys scanned for a Redis data source, in scan order. */
  redisKeys: Record<string, RedisKeyInfo[]>
  /** Scan cursor still pending per Redis data source; `0` or missing means done. */
  redisCursor: Record<string, string>
  loadingRedisKeys: Record<string, boolean>
  redisDetail: RedisValue | null
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
  loadRedisKeys: (connectionId: string, more?: boolean) => Promise<void>
  toggleKey: (key: string) => void
  selectObject: (connectionId: string, schema: string, object: SchemaObject) => Promise<void>
  selectSchema: (connectionId: string, schema: string) => void
  selectFolder: (connectionId: string, schema: string, folder: string) => void
  selectRedisKey: (connectionId: string, key: string) => Promise<void>
  updateDrivers: (drivers: DriverStatus[]) => void
  applySettings: (settings: DbSettings, env: EnvStatus) => void
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

  const [redisKeys, setRedisKeys] = useState<Record<string, RedisKeyInfo[]>>({})
  const [redisCursor, setRedisCursor] = useState<Record<string, string>>({})
  const [loadingRedisKeys, setLoadingRedisKeys] = useState<Record<string, boolean>>({})
  const [redisDetail, setRedisDetail] = useState<RedisValue | null>(null)
  const [redisDetailLoading, setRedisDetailLoading] = useState(false)
  const redisRequest = useRef(0)
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
    for (const [connectionId, entry] of Object.entries(structures)) {
      if (entry.schemas.length > 0) nextSchemas[connectionId] = entry.schemas
      for (const [schema, list] of Object.entries(entry.objects)) {
        nextObjects[`${connectionId}:${schema}`] = list
      }
      for (const [key, description] of Object.entries(entry.descriptions ?? {})) {
        nextDescriptions[`${connectionId}|${key}`] = description
      }
      nextCached[connectionId] = entry.fetchedAt
    }
    setSchemas((previous) => ({ ...nextSchemas, ...previous }))
    setObjects((previous) => ({ ...nextObjects, ...previous }))
    setDescriptions((previous) => ({ ...nextDescriptions, ...previous }))
    setCachedAt((previous) => ({ ...nextCached, ...previous }))
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

  /**
   * Scan one page of a Redis data source's keys. The connection is a single
   * Redis database (its configured `redisDb`), so the cursor is all the tree
   * needs to page through the keyspace.
   */
  const loadRedisKeys = useCallback(
    async (connectionId: string, more = false): Promise<void> => {
      if (loadingRedisKeys[connectionId] === true) return
      const cursor = more ? redisCursor[connectionId] : '0'
      if (more && (cursor === undefined || cursor === '0')) return
      setLoadingRedisKeys((previous) => ({ ...previous, [connectionId]: true }))
      try {
        const result = await api.redisScan({ id: connectionId, cursor })
        setRedisKeys((previous) => {
          const merged = new Map((more ? previous[connectionId] ?? [] : []).map((key) => [key.key, key]))
          for (const key of result.keys) merged.set(key.key, key)
          return { ...previous, [connectionId]: [...merged.values()] }
        })
        setRedisCursor((previous) => ({ ...previous, [connectionId]: result.cursor }))
      } catch (error) {
        notify(`扫描 Redis 键失败：${errorText(error)}`, 'error')
      } finally {
        setLoadingRedisKeys((previous) => ({ ...previous, [connectionId]: false }))
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
        if (connection.dialect === 'redis') await loadRedisKeys(connectionId)
        else await loadSchemas(connectionId)
      } catch (error) {
        notify(`连接失败：${errorText(error)}`, 'error')
      } finally {
        setConnectingId('')
      }
    },
    [connections, loadSchemas, loadRedisKeys, notify],
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
        setSelectedKey('')
        setRedisKeys((previous) => {
          const next = { ...previous }
          delete next[connectionId]
          return next
        })
        setRedisCursor((previous) => {
          const next = { ...previous }
          delete next[connectionId]
          return next
        })
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
      setSelectedId(connectionId)
      setRedisDetail(null)
      setSelectedKey(key)
      // Routines, sequences and triggers have no column structure of their own.
      if (object.kind !== 'table' && object.kind !== 'view') {
        setDetailLoading(false)
        setDetail({ schema, table: object.name, kind: object.kind, columns: [], indexes: [] })
        return
      }
      const known = descriptions[key]
      if (known !== undefined) {
        setDetailLoading(false)
        setDetail(known)
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
        setDetail(description)
      } catch (error) {
        setDetail(null)
        notify(`读取表结构失败：${errorText(error)}`, 'error')
      } finally {
        setDetailLoading(false)
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
    setSelectedId(connectionId)
    setDetail(null)
    setRedisDetail(null)
    setSelectedKey(`${connectionId}|schema:${schema}`)
  }, [])

  const selectFolder = useCallback((connectionId: string, schema: string, folder: string): void => {
    setSelectedId(connectionId)
    setDetail(null)
    setRedisDetail(null)
    setSelectedKey(`${connectionId}|${schema}#${folder}`)
  }, [])

  /** Read one key's value for the tree's detail panel. */
  const selectRedisKey = useCallback(
    async (connectionId: string, key: string): Promise<void> => {
      setSelectedId(connectionId)
      setDetail(null)
      setRedisDetail(null)
      setSelectedKey(`${connectionId}|redis:${key}`)
      if (!servers[connectionId]) {
        setRedisDetailLoading(false)
        notify('数据源未连接，连接后可查看键值', 'info')
        return
      }
      const request = redisRequest.current + 1
      redisRequest.current = request
      setRedisDetailLoading(true)
      try {
        const value = await api.redisKey(connectionId, key)
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

  const resetDetail = useCallback((): void => {
    setDetail(null)
    setRedisDetail(null)
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
      if (servers[selected.id]) await loadRedisKeys(selected.id)
      else await connect(selected.id)
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
  }, [selected, servers, refresh, connect, loadSchemas, loadRedisKeys, notify])

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
    redisDetail,
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
    loadRedisKeys,
    toggleKey,
    selectObject,
    selectSchema,
    selectFolder,
    selectRedisKey,
    updateDrivers,
    applySettings,
  }
}

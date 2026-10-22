/**
 * Connection and structure state for the database panel.
 *
 * The panel itself only renders; everything that talks to the host lives
 * here — the snapshot of saved connections, the live servers, the lazily
 * loaded schema/object trees, the per-table descriptions and the structure
 * cache that keeps the tree browsable while offline.
 */
import { useCallback, useEffect, useState } from 'react'
import type {
  ClientConnection,
  DbSettings,
  DriverStatus,
  EnvStatus,
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
  refresh: () => Promise<void>
  connect: (connectionId: string) => Promise<void>
  disconnect: (connectionId: string) => Promise<void>
  refreshSelected: () => Promise<void>
  resetDetail: () => void
  toggleConnection: (id: string) => void
  toggleFolder: (connectionId: string, schema: string, folder: string) => void
  toggleSchema: (connectionId: string, schema: string) => Promise<void>
  toggleKey: (key: string) => void
  selectObject: (connectionId: string, schema: string, object: SchemaObject) => Promise<void>
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
      setSelectedKey('')
    }
  }, [snapshot, selectedId])

  useEffect(() => {
    setDetail(null)
    setSelectedKey('')
  }, [selectedId])

  const connections = snapshot?.connections ?? []
  const selected = connections.find((connection) => connection.id === selectedId)
  const server = selected ? servers[selected.id] : undefined

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

  const connect = useCallback(
    async (connectionId: string): Promise<void> => {
      const connection = connections.find((item) => item.id === connectionId)
      if (!connection) return
      setConnectingId(connectionId)
      try {
        const connected = await api.connect(connectionId)
        setServers((previous) => ({ ...previous, [connectionId]: connected }))
        notify('连接成功', 'success')
        if (connection.dialect !== 'redis') await loadSchemas(connectionId)
      } catch (error) {
        notify(`连接失败：${errorText(error)}`, 'error')
      } finally {
        setConnectingId('')
      }
    },
    [connections, loadSchemas, notify],
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
        setSelectedKey('')
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

  const selectObject = useCallback(
    async (connectionId: string, schema: string, object: SchemaObject): Promise<void> => {
      const key = `${connectionId}|${schema}.${object.name}`
      setSelectedId(connectionId)
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

  const resetDetail = useCallback((): void => {
    setDetail(null)
    setSelectedKey('')
  }, [])

  const refreshSelected = useCallback(async (): Promise<void> => {
    setDetail(null)
    setSelectedKey('')
    if (!selected) {
      await refresh()
      return
    }
    if (!servers[selected.id] || selected.dialect === 'redis') {
      await connect(selected.id)
      await refresh()
      return
    }
    await loadSchemas(selected.id)
    await refresh()
    notify('已刷新数据源', 'success')
  }, [selected, servers, refresh, connect, loadSchemas, notify])

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
    selectConnection: setSelectedId,
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
    refresh,
    connect,
    disconnect,
    refreshSelected,
    resetDetail,
    toggleConnection,
    toggleFolder,
    toggleSchema,
    toggleKey,
    selectObject,
    updateDrivers,
    applySettings,
  }
}

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { DescriptionCache } from './descriptioncache.js'
import type {
  CachedStructure,
  ColumnDetail,
  IndexInfo,
  ObjectKind,
  RedisDbCache,
  RedisKeyInfo,
  RedisStructureCache,
  SchemaInfo,
  SchemaObject,
  StructureSnapshot,
  TableDescription,
} from '../shared/types.js'

/** Keep the offline key cache bounded; a huge keyspace stops caching past this. */
const MAX_CACHED_KEYS = 2000

function normalizeKind(value: unknown): ObjectKind {
  switch (value) {
    case 'table':
    case 'view':
    case 'procedure':
    case 'function':
    case 'sequence':
    case 'trigger':
    case 'other':
      return value
    default:
      return 'other'
  }
}

function normalizeSchemas(value: unknown): SchemaInfo[] {
  if (!Array.isArray(value)) return []
  const out: SchemaInfo[] = []
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name : ''
    if (name === '') continue
    out.push({ name, system: record.system === true ? true : undefined })
  }
  return out
}

function normalizeObjects(value: unknown): Record<string, SchemaObject[]> {
  // Schema names come from the server and may be `__proto__`; a plain object
  // would route that assignment through the prototype setter and lose the list.
  const out: Record<string, SchemaObject[]> = Object.create(null)
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [schema, list] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue
    const objects: SchemaObject[] = []
    for (const entry of list) {
      if (entry === null || typeof entry !== 'object') continue
      const record = entry as Record<string, unknown>
      const name = typeof record.name === 'string' ? record.name : ''
      if (name === '') continue
      objects.push({
        name,
        kind: normalizeKind(record.kind),
        comment: typeof record.comment === 'string' && record.comment !== '' ? record.comment : undefined,
      })
    }
    out[schema] = objects
  }
  return out
}

function normalizeColumns(value: unknown): ColumnDetail[] {
  if (!Array.isArray(value)) return []
  const out: ColumnDetail[] = []
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name : ''
    if (name === '') continue
    out.push({
      name,
      typeName: typeof record.typeName === 'string' ? record.typeName : '',
      nullable: record.nullable !== false,
      defaultValue: typeof record.defaultValue === 'string' ? record.defaultValue : undefined,
      comment: typeof record.comment === 'string' && record.comment !== '' ? record.comment : undefined,
      primaryKey: record.primaryKey === true ? true : undefined,
    })
  }
  return out
}

function normalizeIndexes(value: unknown): IndexInfo[] {
  if (!Array.isArray(value)) return []
  const out: IndexInfo[] = []
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const name = typeof record.name === 'string' ? record.name : ''
    if (name === '') continue
    out.push({
      name,
      columns: Array.isArray(record.columns) ? record.columns.filter((item): item is string => typeof item === 'string') : [],
      unique: record.unique === true ? true : undefined,
      primary: record.primary === true ? true : undefined,
    })
  }
  return out
}

/**
 * Normalization exists only to read the legacy single-file cache; new code never
 * builds a `CachedStructure` with descriptions.
 *
 * TODO(0.5.0): 随 migrateDescriptions 一起删除。
 */
function normalizeDescriptions(value: unknown): Record<string, TableDescription> {
  const out: Record<string, TableDescription> = {}
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return out
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === null || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const dot = key.lastIndexOf('.')
    const schema = dot > 0 ? key.slice(0, dot) : ''
    const table = dot > 0 ? key.slice(dot + 1) : key
    out[key] = {
      schema: typeof record.schema === 'string' ? record.schema : schema,
      table: typeof record.table === 'string' ? record.table : table,
      kind: normalizeKind(record.kind),
      columns: normalizeColumns(record.columns),
      indexes: normalizeIndexes(record.indexes),
      ...(typeof record.describedAt === 'string' ? { describedAt: record.describedAt } : {}),
    }
  }
  return out
}

/**
 * Redis key metadata cached offline. Values are data, not structure, so only
 * the key list and its scan cursor survive a restart.
 */
function normalizeRedisKeys(value: unknown): RedisKeyInfo[] {
  if (!Array.isArray(value)) return []
  const out: RedisKeyInfo[] = []
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const key = typeof record.key === 'string' ? record.key : ''
    if (key === '') continue
    out.push({
      key,
      type: typeof record.type === 'string' ? record.type : 'string',
      ttl: typeof record.ttl === 'number' ? record.ttl : -1,
      size: typeof record.size === 'number' ? record.size : undefined,
    })
  }
  return out
}

function normalizeRedis(value: unknown): RedisStructureCache | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined
  const record = value as Record<string, unknown>
  const databases = typeof record.databases === 'number' && record.databases > 0 ? Math.trunc(record.databases) : 16
  const dbs: Record<string, RedisDbCache> = {}
  if (record.dbs !== null && typeof record.dbs === 'object' && !Array.isArray(record.dbs)) {
    for (const [db, entry] of Object.entries(record.dbs as Record<string, unknown>)) {
      if (entry === null || typeof entry !== 'object') continue
      const entryRecord = entry as Record<string, unknown>
      dbs[db] = {
        keys: normalizeRedisKeys(entryRecord.keys),
        cursor: typeof entryRecord.cursor === 'string' ? entryRecord.cursor : '0',
        fetchedAt: typeof entryRecord.fetchedAt === 'string' ? entryRecord.fetchedAt : new Date(0).toISOString(),
      }
    }
  }
  return { databases, dbs }
}

/**
 * Persisted "last known structure" per connection. Survives restarts so the data
 * source tree stays browsable while disconnected, and is replaced on the next
 * successful read (IDEA keeps the same contract).
 *
 * Writes are debounced: a full schema walk produces one save instead of dozens.
 */
export class StructureStore {
  private data: StructureSnapshot = {}
  private timer: NodeJS.Timeout | undefined
  private dirty = false
  /** Last JSON handed out by snapshotJson(), dropped whenever the data changes. */
  private serialized: string | undefined
  /** Descriptions grow large, so they live in per-connection append logs. */
  private readonly descriptions: DescriptionCache

  constructor(
    private readonly file: string,
    private readonly log: (message: string) => void,
  ) {
    this.descriptions = new DescriptionCache(join(dirname(file), 'descriptions'), log)
    this.load()
  }

  private load(): void {
    if (!existsSync(this.file)) return
    try {
      const raw = JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, unknown>
      const next: StructureSnapshot = {}
      for (const [connectionId, value] of Object.entries(raw)) {
        if (value === null || typeof value !== 'object') continue
        const record = value as Record<string, unknown>
        const redis = normalizeRedis(record.redis)
        next[connectionId] = {
          fetchedAt: typeof record.fetchedAt === 'string' ? record.fetchedAt : new Date(0).toISOString(),
          schemas: normalizeSchemas(record.schemas),
          objects: normalizeObjects(record.objects),
          // TODO(0.5.0): 旧版缓存文件里的 descriptions 随迁移逻辑一起删除。
          descriptions: normalizeDescriptions(record.descriptions),
          ...(redis === undefined ? {} : { redis }),
        }
      }
      // TODO(0.5.0): 发布 0.5.0 时删除旧版缓存迁移——届时 structure.json 不可能再附带 descriptions。
      this.migrateDescriptions(next)
      this.data = next
    } catch (error) {
      this.log(`结构缓存读取失败，忽略：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Older versions kept descriptions inside structure.json (tens of MB). Move
   * them into the per-connection logs once, then persist the slim tree file.
   *
   * TODO(0.5.0): 发布 0.5.0 时删除本方法及其调用，连同 DescriptionCache.import、
   * CachedStructure.descriptions 字段与 normalizeDescriptions，只保留「树文件 + 追加日志」一种格式。
   */
  private migrateDescriptions(data: StructureSnapshot): void {
    let migrated = false
    for (const [connectionId, entry] of Object.entries(data)) {
      const descriptions = entry.descriptions
      if (descriptions === undefined || Object.keys(descriptions).length === 0) continue
      // Keep the legacy descriptions if the rewrite did not reach disk: the
      // tree flush must not overwrite them, so a later start can retry migration.
      if (!this.descriptions.import(connectionId, descriptions)) continue
      entry.descriptions = {}
      migrated = true
    }
    if (migrated) this.schedule()
  }

  snapshot(): StructureSnapshot {
    return JSON.parse(this.snapshotJson()) as StructureSnapshot
  }

  /**
   * The snapshot as JSON, reused until the cached structure changes: the tree
   * endpoint only serializes, so it does not need its own deep copy first.
   * Descriptions are not shipped here; they are fetched per table (and the host
   * keeps them warm in their own logs), so the payload stays small.
   */
  snapshotJson(): string {
    if (this.serialized === undefined) this.serialized = JSON.stringify(this.treeSnapshot())
    return this.serialized
  }

  private treeSnapshot(): StructureSnapshot {
    const tree: StructureSnapshot = {}
    for (const [connectionId, entry] of Object.entries(this.data)) {
      tree[connectionId] = {
        fetchedAt: entry.fetchedAt,
        schemas: entry.schemas,
        objects: entry.objects,
        // A failed legacy-description migration leaves the old payload in
        // memory so a later start can retry it. Keep writing it back to disk
        // until that retry succeeds (migrateDescriptions empties it then);
        // otherwise the next flush silently destroys the only remaining copy.
        ...(entry.descriptions === undefined || Object.keys(entry.descriptions).length === 0
          ? {}
          : { descriptions: entry.descriptions }),
        ...(entry.redis === undefined ? {} : { redis: entry.redis }),
      }
    }
    return tree
  }

  get(connectionId: string): CachedStructure | undefined {
    const entry = this.data[connectionId]
    return entry === undefined ? undefined : (JSON.parse(JSON.stringify(entry)) as CachedStructure)
  }

  /** When the entry was last refreshed, without cloning its (possibly large) payload. */
  fetchedAt(connectionId: string): string | undefined {
    return this.data[connectionId]?.fetchedAt
  }

  /** Cached `CONFIG GET databases` value, without cloning the whole entry. */
  redisDatabases(connectionId: string): number | undefined {
    return this.data[connectionId]?.redis?.databases
  }

  putSchemas(connectionId: string, schemas: SchemaInfo[]): void {
    const previous = this.data[connectionId]
    const objects: Record<string, SchemaObject[]> = Object.create(null)
    for (const schema of schemas) {
      const kept = previous?.objects[schema.name]
      if (kept !== undefined) objects[schema.name] = kept
    }
    // Descriptions of schemas the server no longer reports would otherwise stay
    // in the cache forever: prune them together with the schema list.
    this.descriptions.pruneSchemas(connectionId, schemas.map((schema) => schema.name))
    this.data[connectionId] = {
      fetchedAt: new Date().toISOString(),
      schemas,
      objects,
      descriptions: {},
      ...(previous?.redis === undefined ? {} : { redis: previous.redis }),
    }
    this.schedule()
  }

  putObjects(connectionId: string, schema: string, objects: SchemaObject[]): void {
    const previous = this.data[connectionId] ?? {
      fetchedAt: new Date().toISOString(),
      schemas: [],
      objects: Object.create(null),
      descriptions: {},
    }
    // Drop descriptions of objects that disappeared from the refreshed list,
    // so renames/drops do not leave unreachable entries behind. Routines keep
    // their definition in the same cache, so every listed kind counts here.
    const listed = new Set(objects.map((object) => object.name))
    this.descriptions.pruneObjects(connectionId, schema, listed)
    previous.objects[schema] = objects
    previous.fetchedAt = new Date().toISOString()
    this.data[connectionId] = previous
    this.schedule()
  }

  /** The description cache is keyed by the schema/table pair; relations only. */
  putDescription(connectionId: string, schema: string, table: string, description: TableDescription): void {
    // The per-connection log takes the write; its timestamp makes the background
    // prefetcher incremental (a fresh entry is skipped, a stale one refreshed).
    this.descriptions.put(connectionId, schema, table, description)
    const entry = this.data[connectionId] ?? {
      fetchedAt: new Date().toISOString(),
      schemas: [],
      objects: Object.create(null),
      descriptions: {},
    }
    entry.fetchedAt = new Date().toISOString()
    this.data[connectionId] = entry
    this.schedule()
  }

  getDescription(connectionId: string, schema: string, table: string): TableDescription | undefined {
    return this.descriptions.get(connectionId, schema, table)
  }

  /** Whether a description is cached, without cloning it (the prefetcher asks this). */
  hasDescription(connectionId: string, schema: string, table: string): boolean {
    return this.descriptions.has(connectionId, schema, table)
  }

  /**
   * Whether an object is still present in the cached tree. A background prefetch
   * read can resolve after the schema/object was pruned (putSchemas/putObjects);
   * the writer must not resurrect a description for an object that no longer
   * exists in the tree.
   */
  hasObject(connectionId: string, schema: string, table: string): boolean {
    return (this.data[connectionId]?.objects[schema] ?? []).some((object) => object.name === table)
  }

  private redisEntry(connectionId: string): CachedStructure {
    const entry =
      this.data[connectionId] ?? {
        fetchedAt: new Date().toISOString(),
        schemas: [],
        objects: Object.create(null),
        descriptions: {},
      }
    if (entry.redis === undefined) entry.redis = { databases: 16, dbs: {} }
    return entry
  }

  /** Cache the server's database count so the picker works offline too. */
  putRedisDatabases(connectionId: string, databases: number): void {
    if (!Number.isFinite(databases) || databases <= 0) return
    const entry = this.redisEntry(connectionId)
    entry.redis!.databases = Math.trunc(databases)
    entry.fetchedAt = new Date().toISOString()
    this.data[connectionId] = entry
    this.schedule()
  }

  /**
   * Cache one page of a Redis database's keys. `replace` starts a fresh scan
   * (first page) and drops keys the server no longer has; later pages merge.
   */
  putRedisKeys(connectionId: string, db: number, keys: RedisKeyInfo[], cursor: string, replace: boolean): void {
    const entry = this.redisEntry(connectionId)
    const id = String(db)
    const previous = replace ? [] : (entry.redis!.dbs[id]?.keys ?? [])
    const merged = new Map(previous.map((key) => [key.key, key]))
    for (const key of keys) merged.set(key.key, key)
    const cached = [...merged.values()].slice(0, MAX_CACHED_KEYS)
    entry.redis!.dbs[id] = {
      keys: cached,
      // A capped cache stops paging: there is no room to remember more keys.
      cursor: cached.length >= MAX_CACHED_KEYS ? '0' : cursor,
      fetchedAt: new Date().toISOString(),
    }
    entry.fetchedAt = new Date().toISOString()
    this.data[connectionId] = entry
    this.schedule()
  }

  clear(connectionId: string): void {
    this.descriptions.clear(connectionId)
    if (this.data[connectionId] === undefined) return
    delete this.data[connectionId]
    this.schedule()
  }

  /** Drop entries whose connection no longer exists in the config. */
  retain(connectionIds: string[]): void {
    const allowed = new Set(connectionIds)
    let changed = false
    for (const id of Object.keys(this.data)) {
      if (allowed.has(id)) continue
      delete this.data[id]
      this.descriptions.clear(id)
      changed = true
    }
    if (changed) this.schedule()
  }

  private schedule(): void {
    this.serialized = undefined
    this.dirty = true
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.flush()
    }, 400)
    this.timer.unref?.()
  }

  flush(): void {
    this.descriptions.flush()
    if (!this.dirty) return
    try {
      const temp = `${this.file}.tmp-${process.pid}`
      // Compact JSON: the tree is small, and indentation only inflates I/O.
      writeFileSync(temp, `${JSON.stringify(this.treeSnapshot())}\n`, { encoding: 'utf8', mode: 0o600 })
      renameSync(temp, this.file)
      // Only clear the flag once the bytes are on disk. If the write fails the
      // tree still needs rewriting: leaving dirty set lets the next flush (or
      // timer) retry instead of silently dropping the change forever.
      this.dirty = false
    } catch (error) {
      this.log(`结构缓存写入失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

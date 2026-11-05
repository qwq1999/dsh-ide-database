/**
 * Completion metadata for one console session.
 *
 * The completion engine never talks to the server itself: it asks this catalog
 * for schemas, relations and columns. The host already keeps a structure cache,
 * so every entry is asked from `/completion/metadata` first (a cache hit costs
 * no bridge round trip) and only falls back to the older per-object endpoints
 * when the host has nothing cached yet.
 *
 * Both caches are bounded LRUs: a long console session can touch many schemas
 * and relations, while the popup only ever needs the recent ones again.
 * Concurrent requests for the same entry share one promise, so holding the
 * completion shortcut does not fire duplicate metadata reads.
 */
import { api } from '../api'
import type { CompletionCatalog } from './types'

interface CatalogTable {
  name: string
  kind: 'table' | 'view'
}

interface CatalogColumn {
  name: string
  typeName?: string
}

/** Schemas whose relation lists are remembered per console (least recent first). */
export const CATALOG_TABLE_LIMIT = 64
/** Relations whose column lists are remembered per console (least recent first). */
export const CATALOG_COLUMN_LIMIT = 256

/** Tiny LRU on top of a Map where the least recently used key comes first. */
class LruMap<K, V> {
  private readonly entries = new Map<K, V>()

  constructor(private readonly limit: number) {}

  get(key: K): V | undefined {
    const value = this.entries.get(key)
    if (value !== undefined) {
      this.entries.delete(key)
      this.entries.set(key, value)
    }
    return value
  }

  set(key: K, value: V): void {
    this.entries.delete(key)
    this.entries.set(key, value)
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next()
      if (oldest.done === true) return
      this.entries.delete(oldest.value)
    }
  }

  clear(): void {
    this.entries.clear()
  }
}

/** Metadata cache shared by every completion request of one console tab. */
export class ConsoleCompletionCatalog implements CompletionCatalog {
  private schemaNames: readonly string[] | undefined
  private readonly tableCache = new LruMap<string, readonly CatalogTable[]>(CATALOG_TABLE_LIMIT)
  private readonly columnCache = new LruMap<string, readonly CatalogColumn[]>(CATALOG_COLUMN_LIMIT)
  private readonly pending = new Map<string, Promise<unknown>>()

  /**
   * @param connectionId data source the console runs on
   * @param knownSchemas schemas the sidebar already loaded, used before
   *        falling back to a `/schema/list` round trip
   */
  constructor(
    private readonly connectionId: string,
    private readonly knownSchemas: () => readonly string[],
  ) {}

  async schemas(): Promise<readonly string[]> {
    if (this.schemaNames !== undefined) return this.schemaNames
    const known = this.knownSchemas()
    if (known.length > 0) {
      this.schemaNames = known
      return known
    }
    return this.shared('schemas', async () => {
      const cached = await this.cachedSchemas()
      if (cached !== undefined) {
        this.schemaNames = cached
        return cached
      }
      try {
        const listed = await api.schemas(this.connectionId)
        const names = listed.schemas.map((schema) => schema.name)
        this.schemaNames = names
        return names
      } catch {
        // The catalog is only used for suggestions; a failed read just means
        // the popup shows fewer names, never an error dialog.
        return []
      }
    })
  }

  async tables(schema: string): Promise<readonly CatalogTable[]> {
    if (schema === '') return []
    const cached = this.tableCache.get(schema)
    if (cached !== undefined) return cached
    return this.shared(`tables:${schema}`, async () => {
      const hostCached = await this.cachedTables(schema)
      if (hostCached !== undefined) {
        this.tableCache.set(schema, hostCached)
        return hostCached
      }
      try {
        const listed = await api.objects(this.connectionId, schema)
        const items: CatalogTable[] = listed.objects
          .filter((item) => item.kind === 'table' || item.kind === 'view')
          .map((item) => ({ name: item.name, kind: item.kind as 'table' | 'view' }))
        this.tableCache.set(schema, items)
        return items
      } catch {
        // Negative cache: a relation list that failed once (for example a schema
        // that does not exist on this server) should not be retried for every
        // popup of the same console. DDL and the refresh button clear the cache.
        this.tableCache.set(schema, [])
        return []
      }
    })
  }

  async columns(schema: string, table: string): Promise<readonly CatalogColumn[]> {
    if (schema === '' || table === '') return []
    const key = `${schema}.${table}`
    const cached = this.columnCache.get(key)
    if (cached !== undefined) return cached
    return this.shared(`columns:${key}`, async () => {
      const hostCached = await this.cachedColumns(schema, table)
      if (hostCached !== undefined) {
        this.columnCache.set(key, hostCached)
        return hostCached
      }
      try {
        const described = await api.describe(this.connectionId, schema, table, 'table')
        const items: CatalogColumn[] = described.columns.map((column) => ({
          name: column.name,
          typeName: column.typeName,
        }))
        this.columnCache.set(key, items)
        return items
      } catch {
        // See tables(): remember the miss so qualifier fallbacks do not repeat a
        // metadata read that cannot succeed on this connection.
        this.columnCache.set(key, [])
        return []
      }
    })
  }

  /** Drop every cached entry, for example after an explicit data-source refresh. */
  clear(): void {
    this.schemaNames = undefined
    this.tableCache.clear()
    this.columnCache.clear()
    this.pending.clear()
  }

  /**
   * Read the cached schema names from the host. Undefined means the host cache
   * cannot answer, so the caller falls back to the server.
   */
  private async cachedSchemas(): Promise<readonly string[] | undefined> {
    try {
      const data = await api.completionMetadata(this.connectionId)
      if (!data.cached || data.schemas.length === 0) return undefined
      return data.schemas.map((schema) => schema.name)
    } catch {
      return undefined
    }
  }

  /** Relation list from the host structure cache, or undefined when not cached. */
  private async cachedTables(schema: string): Promise<readonly CatalogTable[] | undefined> {
    try {
      const data = await api.completionMetadata(this.connectionId, { schemas: [schema] })
      if (!data.cached) return undefined
      const objects = data.tables[schema]
      if (objects === undefined) return undefined
      return objects
        .filter((item) => item.kind === 'table' || item.kind === 'view')
        .map((item) => ({ name: item.name, kind: item.kind as 'table' | 'view' }))
    } catch {
      return undefined
    }
  }

  /** Column list from the host structure cache, or undefined when not cached. */
  private async cachedColumns(schema: string, table: string): Promise<readonly CatalogColumn[] | undefined> {
    try {
      const data = await api.completionMetadata(this.connectionId, { tables: [{ schema, table }] })
      if (!data.cached) return undefined
      const columns = data.columns[`${schema}.${table}`]
      if (columns === undefined) return undefined
      return columns.map((column) => ({ name: column.name, typeName: column.typeName }))
    } catch {
      return undefined
    }
  }

  private shared<T>(key: string, load: () => Promise<T>): Promise<T> {
    const running = this.pending.get(key)
    if (running !== undefined) return running as Promise<T>
    const promise = load().finally(() => {
      this.pending.delete(key)
    })
    this.pending.set(key, promise)
    return promise
  }
}

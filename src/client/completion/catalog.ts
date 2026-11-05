/**
 * Completion metadata for one console session.
 *
 * The completion engine never talks to the server itself: it asks this catalog
 * for schemas, relations and columns. Everything is cached per console (schema
 * and object lists are small and rarely change while the popup is used) and
 * concurrent requests for the same entry share one promise, so holding the
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

/** Metadata cache shared by every completion request of one console tab. */
export class ConsoleCompletionCatalog implements CompletionCatalog {
  private schemaNames: readonly string[] | undefined
  private readonly tableCache = new Map<string, readonly CatalogTable[]>()
  private readonly columnCache = new Map<string, readonly CatalogColumn[]>()
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
      try {
        const listed = await api.schemas(this.connectionId)
        this.schemaNames = listed.schemas.map((schema) => schema.name)
      } catch {
        // The catalog is only used for suggestions; a failed read just means
        // the popup shows fewer names, never an error dialog.
        return []
      }
      return this.schemaNames
    })
  }

  async tables(schema: string): Promise<readonly CatalogTable[]> {
    if (schema === '') return []
    const cached = this.tableCache.get(schema)
    if (cached !== undefined) return cached
    return this.shared(`tables:${schema}`, async () => {
      try {
        const listed = await api.objects(this.connectionId, schema)
        const items: CatalogTable[] = listed.objects
          .filter((item) => item.kind === 'table' || item.kind === 'view')
          .map((item) => ({ name: item.name, kind: item.kind as 'table' | 'view' }))
        this.tableCache.set(schema, items)
        return items
      } catch {
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
      try {
        const described = await api.describe(this.connectionId, schema, table, 'table')
        const items: CatalogColumn[] = described.columns.map((column) => ({
          name: column.name,
          typeName: column.typeName,
        }))
        this.columnCache.set(key, items)
        return items
      } catch {
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

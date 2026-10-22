import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'

import type {
  CachedStructure,
  ColumnDetail,
  IndexInfo,
  ObjectKind,
  SchemaInfo,
  SchemaObject,
  StructureSnapshot,
  TableDescription,
} from '../shared/types.js'

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
  const out: Record<string, SchemaObject[]> = {}
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
    }
  }
  return out
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

  constructor(
    private readonly file: string,
    private readonly log: (message: string) => void,
  ) {
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
        next[connectionId] = {
          fetchedAt: typeof record.fetchedAt === 'string' ? record.fetchedAt : new Date(0).toISOString(),
          schemas: normalizeSchemas(record.schemas),
          objects: normalizeObjects(record.objects),
          descriptions: normalizeDescriptions(record.descriptions),
        }
      }
      this.data = next
    } catch (error) {
      this.log(`结构缓存读取失败，忽略：${error instanceof Error ? error.message : String(error)}`)
    }
  }

  snapshot(): StructureSnapshot {
    return JSON.parse(JSON.stringify(this.data)) as StructureSnapshot
  }

  get(connectionId: string): CachedStructure | undefined {
    const entry = this.data[connectionId]
    return entry === undefined ? undefined : (JSON.parse(JSON.stringify(entry)) as CachedStructure)
  }

  putSchemas(connectionId: string, schemas: SchemaInfo[]): void {
    const previous = this.data[connectionId]
    const objects: Record<string, SchemaObject[]> = {}
    for (const schema of schemas) {
      const kept = previous?.objects[schema.name]
      if (kept !== undefined) objects[schema.name] = kept
    }
    this.data[connectionId] = {
      fetchedAt: new Date().toISOString(),
      schemas,
      objects,
      descriptions: previous?.descriptions ?? {},
    }
    this.schedule()
  }

  putObjects(connectionId: string, schema: string, objects: SchemaObject[]): void {
    const previous = this.data[connectionId] ?? {
      fetchedAt: new Date().toISOString(),
      schemas: [],
      objects: {},
      descriptions: {},
    }
    previous.objects[schema] = objects
    previous.fetchedAt = new Date().toISOString()
    this.data[connectionId] = previous
    this.schedule()
  }

  /** `schema.table` keys the description cache; relations only. */
  putDescription(connectionId: string, schema: string, table: string, description: TableDescription): void {
    const entry = this.data[connectionId] ?? {
      fetchedAt: new Date().toISOString(),
      schemas: [],
      objects: {},
      descriptions: {},
    }
    entry.descriptions[`${schema}.${table}`] = description
    entry.fetchedAt = new Date().toISOString()
    this.data[connectionId] = entry
    this.schedule()
  }

  getDescription(connectionId: string, schema: string, table: string): TableDescription | undefined {
    const description = this.data[connectionId]?.descriptions[`${schema}.${table}`]
    return description === undefined ? undefined : (JSON.parse(JSON.stringify(description)) as TableDescription)
  }

  clear(connectionId: string): void {
    if (this.data[connectionId] === undefined) return
    delete this.data[connectionId]
    this.schedule()
  }

  /** Drop entries whose connection no longer exists in the config. */
  retain(connectionIds: string[]): void {
    const allowed = new Set(connectionIds)
    let changed = false
    for (const id of Object.keys(this.data)) {
      if (!allowed.has(id)) {
        delete this.data[id]
        changed = true
      }
    }
    if (changed) this.schedule()
  }

  private schedule(): void {
    this.dirty = true
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.flush()
    }, 400)
    this.timer.unref?.()
  }

  flush(): void {
    if (!this.dirty) return
    this.dirty = false
    try {
      const temp = `${this.file}.tmp-${process.pid}`
      writeFileSync(temp, `${JSON.stringify(this.data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
      renameSync(temp, this.file)
    } catch (error) {
      this.log(`结构缓存写入失败：${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

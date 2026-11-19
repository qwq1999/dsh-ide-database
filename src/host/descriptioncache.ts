import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import type { TableDescription } from '../shared/types.js'

/**
 * Descriptions dominate the structure cache (columns and indexes are long,
 * relations are short), so they get their own append-only log per connection:
 * a background walk appends a few bytes per table instead of rewriting one huge
 * JSON document every debounce window. The log is rewritten in place once it
 * has grown enough duplicates, keeping reads O(live entries).
 *
 * Lines are `{"s":"<schema>","t":"<table>","d":{...}}`; `{"s","t","del":true}`
 * marks a pruned relation so removals do not force an immediate rewrite.
 */
const ENTRY_PREFIX = 'd'

/** `${schema}.${table}` collides when either name contains a dot. */
function cacheKey(schema: string, table: string): string {
  return `${schema.length}:${schema}:${table}`
}

/** Rewrite the log once this many lines were appended past the live set. */
export const DESCRIPTION_COMPACT_LINES = 2000

/** Append buffered lines after this pause; small writes only. */
const FLUSH_DELAY_MS = 300

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class DescriptionCache {
  private readonly entries = new Map<string, Map<string, TableDescription>>()
  private readonly pending = new Map<string, string[]>()
  private readonly appended = new Map<string, number>()
  private timer: NodeJS.Timeout | undefined

  constructor(
    private readonly dir: string,
    private readonly log: (message: string) => void,
  ) {}

  private file(connectionId: string): string {
    return join(this.dir, `${connectionId}.ndjson`)
  }

  private ensure(connectionId: string): Map<string, TableDescription> {
    const existing = this.entries.get(connectionId)
    if (existing !== undefined) return existing
    const map = new Map<string, TableDescription>()
    const file = this.file(connectionId)
    if (existsSync(file)) {
      let skipped = 0
      let raw = ''
      try {
        raw = readFileSync(file, 'utf8')
      } catch (error) {
        this.log(`描述缓存读取失败，忽略：${errorText(error)}`)
      }
      for (const line of raw.split('\n')) {
        if (line.trim() === '') continue
        try {
          const record = JSON.parse(line) as { s?: unknown; t?: unknown; d?: unknown; del?: unknown }
          if (typeof record.s !== 'string' || typeof record.t !== 'string') {
            skipped += 1
            continue
          }
          const key = cacheKey(record.s, record.t)
          if (record.del === true) map.delete(key)
          else if (record.d !== null && typeof record.d === 'object') map.set(key, record.d as TableDescription)
        } catch {
          // One truncated line (crash mid-write) must not hide the whole log.
          skipped += 1
        }
      }
      if (skipped > 0) this.log(`描述缓存有 ${skipped} 行无法解析，已跳过`)
    }
    this.entries.set(connectionId, map)
    return map
  }

  get(connectionId: string, schema: string, table: string): TableDescription | undefined {
    const description = this.ensure(connectionId).get(cacheKey(schema, table))
    return description === undefined ? undefined : (JSON.parse(JSON.stringify(description)) as TableDescription)
  }

  has(connectionId: string, schema: string, table: string): boolean {
    return this.ensure(connectionId).has(cacheKey(schema, table))
  }

  /** Store a description and append it to the log (the timestamp drives refreshes). */
  put(connectionId: string, schema: string, table: string, description: TableDescription): void {
    const entry: TableDescription = { ...description, describedAt: new Date().toISOString() }
    this.ensure(connectionId).set(cacheKey(schema, table), entry)
    this.append(connectionId, JSON.stringify({ s: schema, t: table, [ENTRY_PREFIX]: entry }))
  }

  /**
   * Bulk import from the old single-file cache; writes a compact log at once.
   *
   * TODO(0.5.0): 只服务于旧版缓存迁移，发布 0.5.0 时随 StructureStore.migrateDescriptions 一起删除。
   */
  import(connectionId: string, descriptions: Record<string, TableDescription>): boolean {
    const map = this.ensure(connectionId)
    for (const description of Object.values(descriptions)) {
      if (description.table === '') continue
      map.set(cacheKey(description.schema, description.table), description)
    }
    return this.rewrite(connectionId)
  }

  /** Drop descriptions of schemas the server no longer reports. */
  pruneSchemas(connectionId: string, schemas: readonly string[]): void {
    const keep = new Set(schemas)
    this.prune(connectionId, (_key, description) => keep.has(description.schema))
  }

  /** Drop descriptions of objects that disappeared from one schema's object list; keys are table names. */
  pruneObjects(connectionId: string, schema: string, keys: ReadonlySet<string>): void {
    this.prune(connectionId, (_key, description) => description.schema !== schema || keys.has(description.table))
  }

  private prune(connectionId: string, keep: (key: string, description: TableDescription) => boolean): void {
    const map = this.ensure(connectionId)
    for (const [key, description] of [...map]) {
      if (keep(key, description)) continue
      map.delete(key)
      this.append(connectionId, JSON.stringify({ s: description.schema, t: description.table, del: true }))
      this.compactIfNeeded(connectionId)
    }
  }

  clear(connectionId: string): void {
    this.entries.delete(connectionId)
    this.pending.delete(connectionId)
    this.appended.delete(connectionId)
    try {
      rmSync(this.file(connectionId), { force: true })
    } catch (error) {
      this.log(`描述缓存删除失败：${errorText(error)}`)
    }
  }

  /** Append buffered lines. Called by the debounce timer and by StructureStore.flush(). */
  flush(): void {
    for (const [connectionId, lines] of [...this.pending]) {
      if (lines.length === 0) {
        this.pending.delete(connectionId)
        continue
      }
      try {
        mkdirSync(this.dir, { recursive: true })
        appendFileSync(this.file(connectionId), `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 })
        // Only drop the buffer once the bytes are on disk. On a write failure
        // (disk full, permissions) keep the lines so the next flush can retry
        // instead of silently losing the descriptions for this connection.
        this.pending.delete(connectionId)
      } catch (error) {
        this.log(`描述缓存写入失败：${errorText(error)}`)
      }
      this.compactIfNeeded(connectionId)
    }
  }

  private append(connectionId: string, line: string): void {
    const lines = this.pending.get(connectionId)
    if (lines === undefined) this.pending.set(connectionId, [line])
    else lines.push(line)
    this.appended.set(connectionId, (this.appended.get(connectionId) ?? 0) + 1)
    if (this.timer !== undefined) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      this.flush()
    }, FLUSH_DELAY_MS)
    this.timer.unref?.()
  }

  private compactIfNeeded(connectionId: string): void {
    const live = this.entries.get(connectionId)?.size ?? 0
    const appended = this.appended.get(connectionId) ?? 0
    // Compact only once duplicates/tombstones double the log: a first full walk
    // appends one line per entry and must not trigger a rewrite per batch.
    if (appended < Math.max(DESCRIPTION_COMPACT_LINES, live * 2)) return
    this.rewrite(connectionId)
  }

  /** Rewrite the log with one line per live entry. Returns true once on disk. */
  private rewrite(connectionId: string): boolean {
    const map = this.entries.get(connectionId) ?? new Map<string, TableDescription>()
    const lines: string[] = []
    // Write the description's own fields; the in-memory key is opaque and may
    // contain dots in either name.
    for (const description of map.values()) {
      lines.push(JSON.stringify({ s: description.schema, t: description.table, [ENTRY_PREFIX]: description }))
    }
    try {
      mkdirSync(this.dir, { recursive: true })
      const temp = `${this.file(connectionId)}.tmp-${process.pid}`
      writeFileSync(temp, lines.length === 0 ? '' : `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 })
      renameSync(temp, this.file(connectionId))
      // The live map already reflects buffered lines. Only drop them once the
      // compacted file is on disk; on failure the old log is still authoritative
      // and its pending lines must be kept so a later flush can replay them.
      this.pending.delete(connectionId)
      this.appended.set(connectionId, 0)
      return true
    } catch (error) {
      this.log(`描述缓存整理失败：${errorText(error)}`)
      return false
    }
  }
}

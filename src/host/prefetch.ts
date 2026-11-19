import { DbError } from './errors.js'
import type { SqlService } from './sql.js'
import type { StructureStore } from './structure.js'
import type { ObjectKind, PrefetchProgress, SqlDialect, TableDescription } from '../shared/types.js'

/** Keep the background walk gentle: metadata reads share the JDBC bridge. */
export const DESCRIPTION_CONCURRENCY = 2

/**
 * Relations are cached with their columns and indexes; the other object kinds
 * have no structure to read, so their definition is what the cache keeps.
 */
const PREFETCH_KINDS: ReadonlySet<ObjectKind> = new Set(['table', 'view', 'procedure', 'function', 'sequence', 'trigger'])

/** Order-independent comparison of two optional schema sets. */
function sameSchemaSet(left: Set<string> | undefined, right: Set<string> | undefined): boolean {
  if (left === undefined || right === undefined) return left === right
  if (left.size !== right.size) return false
  for (const value of left) if (!right.has(value)) return false
  return true
}

interface PrefetchTarget {
  schema: string
  table: string
  kind: ObjectKind
}

export interface PrefetchOptions {
  /** Re-read every relation instead of only the ones with no description yet. */
  refreshAll?: boolean
  /** Restrict the walk to these schemas (the ones the user made visible). */
  schemas?: readonly string[]
}

interface PrefetchSession extends PrefetchProgress {
  refreshAll: boolean
  /** `undefined` walks every cached schema. */
  schemas?: Set<string>
}

interface PrefetchDeps {
  sql: Pick<SqlService, 'describe' | 'ddl'>
  structure: Pick<StructureStore, 'get' | 'hasDescription' | 'hasObject' | 'putDescription'>
  /** Dialect of a connection; needed to ask the server for an object's definition. */
  dialect?: (connectionId: string) => SqlDialect | undefined
  log: (message: string) => void
}

/**
 * Walks a connection's cached object list in the background. Opening a
 * connection only fills the entries that have never been read, while an
 * explicit refresh re-reads everything the user can see. `schedule` never
 * blocks connecting: it returns immediately, and cancelling a connection stops
 * the walk at the next item.
 */
export class DescriptionPrefetcher {
  private readonly active = new Map<string, PrefetchSession>()

  constructor(private readonly deps: PrefetchDeps) {}

  /** Start (or upgrade) a background pass for one connection. */
  schedule(connectionId: string, options: PrefetchOptions = {}): void {
    const refreshAll = options.refreshAll === true
    const schemas = options.schemas === undefined ? undefined : new Set(options.schemas)
    const running = this.active.get(connectionId)
    if (running !== undefined) {
      // A refresh upgrades a "fill the gaps" pass so an explicit refresh really
      // re-reads everything. A changed visible-schema set must also restart —
      // otherwise the newly requested schemas are silently dropped while the
      // old pass keeps walking only the previous set. The old run retires
      // safely through isCurrent() when the session is replaced.
      if (sameSchemaSet(running.schemas, schemas) && (!refreshAll || running.refreshAll)) return
      // A full refresh already covers every schema. A partial (non-refresh)
      // request arriving while it runs must not retire it: doing so discards
      // its in-flight reads via isCurrent() and leaves only the subset re-read.
      if (running.refreshAll && !refreshAll) return
      this.active.delete(connectionId)
    }
    const session: PrefetchSession = {
      connectionId,
      total: 0,
      done: 0,
      refreshAll,
      schemas,
    }
    this.active.set(connectionId, session)
    void this.run(connectionId, session)
  }

  /** Stop a pass, e.g. when the connection is closed, trashed or removed. */
  cancel(connectionId: string): void {
    this.active.delete(connectionId)
  }

  /** Snapshot of the walks currently running, for the status bar. */
  progress(): PrefetchProgress[] {
    return [...this.active.values()].map(({ connectionId, total, done }) => ({ connectionId, total, done }))
  }

  private targets(connectionId: string, session: PrefetchSession): PrefetchTarget[] {
    const entry = this.deps.structure.get(connectionId)
    if (entry === undefined) return []
    const targets: PrefetchTarget[] = []
    for (const [schema, objects] of Object.entries(entry.objects)) {
      if (session.schemas !== undefined && !session.schemas.has(schema)) continue
      for (const object of objects) {
        if (!PREFETCH_KINDS.has(object.kind)) continue
        if (!session.refreshAll && this.deps.structure.hasDescription(connectionId, schema, object.name)) continue
        targets.push({ schema, table: object.name, kind: object.kind })
      }
    }
    return targets
  }

  /**
   * Read one cache entry: a relation's columns and indexes, or the definition
   * of a routine, sequence or trigger (they have no structure to describe).
   */
  private async read(connectionId: string, target: PrefetchTarget): Promise<TableDescription | undefined> {
    const { schema, table, kind } = target
    if (kind === 'table' || kind === 'view') {
      return this.deps.sql.describe(connectionId, schema, table, kind)
    }
    const dialect = this.deps.dialect?.(connectionId)
    // Only SQL connections list these objects; without a dialect there is
    // nothing to ask the server for.
    if (dialect === undefined) return undefined
    const result = await this.deps.sql.ddl(connectionId, dialect, schema, table, kind)
    return {
      schema,
      table,
      kind,
      columns: [],
      indexes: [],
      ddl: result.ddl,
      ddlSource: result.source,
      ddlWarnings: result.warnings,
    }
  }

  private async run(connectionId: string, session: PrefetchSession): Promise<void> {
    // A refresh replaces the session while an older pass may still be awaiting
    // a read. Only the session that is still in `active` may mutate state; an
    // obsolete pass must neither write stale descriptions, bump the new
    // session's counters, nor delete it when it finishes.
    const isCurrent = () => this.active.get(connectionId) === session
    try {
      const targets = this.targets(connectionId, session)
      session.total = targets.length
      let next = 0
      const worker = async (): Promise<void> => {
        while (isCurrent() && next < targets.length) {
          const target = targets[next]
          next += 1
          if (target === undefined) return
          try {
            const description = await this.read(connectionId, target)
            if (!isCurrent()) return
            // The object may have been pruned while the read was in flight
            // (putSchemas/putObjects). Writing its description back would
            // resurrect an orphan entry in the tree and on disk.
            if (description !== undefined && this.deps.structure.hasObject(connectionId, target.schema, target.table)) {
              this.deps.structure.putDescription(connectionId, target.schema, target.table, description)
            }
          } catch (error) {
            if (error instanceof DbError && error.code === 'not-connected') {
              // Closing the connection ends the walk silently. A stale run must
              // not delete the session that replaced it.
              if (isCurrent()) this.active.delete(connectionId)
              return
            }
            // Objects whose definition the server will not hand out stay
            // uncached; they are read on demand and reported there instead.
            if (error instanceof DbError && error.code === 'unsupported') {
              // skip
            } else {
              const message = error instanceof Error ? error.message : String(error)
              this.deps.log(`后台结构缓存失败（${target.schema}.${target.table}）：${message}`)
            }
          }
          if (isCurrent()) session.done += 1
        }
      }
      const workers = Math.min(DESCRIPTION_CONCURRENCY, targets.length)
      await Promise.all(Array.from({ length: workers }, () => worker()))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.deps.log(`后台结构缓存失败：${message}`)
    } finally {
      if (isCurrent()) this.active.delete(connectionId)
    }
  }
}

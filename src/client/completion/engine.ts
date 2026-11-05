/**
 * Orchestrate a completion request: analyse the statement, load the metadata
 * the caret needs and rank the result.
 *
 * Metadata only enters through the injected {@link CompletionCatalog}; the
 * engine has no idea which HTTP API (or cache) sits behind it. Catalog failures
 * are swallowed on purpose: a slow or broken server must never make the popup
 * show an error, it just shows fewer (or no) entries.
 */
import { analyze } from './context'
import { functionCompletions, keywordCompletions } from './keywords'
import {
  aliasCandidates,
  columnCandidates,
  cteCandidates,
  schemaCandidates,
  starCandidate,
  tableCandidates,
  type CatalogColumn,
} from './providers'
import { prioritiesFor, rank } from './rank'
import type {
  Completion,
  CompletionRelation,
  CompletionRequest,
  CompletionResult,
} from './types'

/** Max relations whose columns are fetched for an unqualified column caret. */
const MAX_COLUMN_RELATIONS = 6

function abortError(): DOMException {
  return new DOMException('The completion request was aborted.', 'AbortError')
}

function isAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const name = (error as { name?: unknown }).name
  return name === 'AbortError'
}

/** Reject as soon as `signal` fires, without leaving its listener behind. */
function raceAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) return promise
  if (signal.aborted) return Promise.reject(abortError())
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      signal.removeEventListener('abort', onAbort)
      reject(abortError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

/**
 * Await a catalog call, degrading any failure to `fallback`. Aborts are real
 * failures and travel up to the caller.
 */
async function load<T>(
  operation: () => Promise<T>,
  signal: AbortSignal | undefined,
  fallback: T,
): Promise<T> {
  if (signal?.aborted === true) throw abortError()
  try {
    return await raceAbort(operation(), signal)
  } catch (error) {
    if (isAbortError(error)) throw error
    return fallback
  }
}

async function tableCandidatesOf(
  request: CompletionRequest,
  schema: string,
): Promise<Completion[]> {
  const tables = await load(() => request.catalog.tables(schema), request.signal, [])
  return tableCandidates(tables, schema)
}

async function schemaNamesOf(request: CompletionRequest): Promise<Completion[]> {
  const schemas = await load(() => request.catalog.schemas(), request.signal, [])
  return schemaCandidates(schemas)
}

async function columnCandidatesOf(
  request: CompletionRequest,
  schema: string,
  table: string,
): Promise<Completion[]> {
  const columns = await load(
    () => request.catalog.columns(schema, table),
    request.signal,
    [] as readonly CatalogColumn[],
  )
  return columnCandidates(columns)
}

/** Columns of every relation mentioned before the caret, in statement order. */
async function referencedColumns(
  request: CompletionRequest,
  relations: readonly CompletionRelation[],
  currentSchema: string,
): Promise<Completion[]> {
  // Derived relations (CTEs, subqueries) already carry their columns; only the
  // concrete tables without them need a catalog round-trip.
  const targets: CompletionRelation[] = []
  for (const relation of relations) {
    if (relation.table === '' || relation.columns !== undefined) continue
    if (targets.length >= MAX_COLUMN_RELATIONS) break
    targets.push(relation)
  }
  const lists = await Promise.all(
    targets.map((relation) =>
      columnCandidatesOf(request, relation.schema ?? currentSchema, relation.table),
    ),
  )
  const fetched = new Map<CompletionRelation, Completion[]>()
  targets.forEach((relation, index) => {
    fetched.set(relation, lists[index] ?? [])
  })

  const seen = new Set<string>()
  const items: Completion[] = []
  const push = (list: readonly Completion[]): void => {
    for (const item of list) {
      const key = item.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push(item)
    }
  }
  for (const relation of relations) {
    if (relation.columns !== undefined) {
      push(columnCandidates(relation.columns.map((column) => ({ name: column }))))
      continue
    }
    if (relation.table === '') continue
    push(fetched.get(relation) ?? [])
  }
  return items
}

/** Find the relation a qualifier refers to, first by alias and then by name. */
function findRelation(
  relations: readonly CompletionRelation[],
  name: string,
): CompletionRelation | undefined {
  const lower = name.toLowerCase()
  return (
    relations.find(
      (relation) => relation.alias !== undefined && relation.alias.toLowerCase() === lower,
    ) ??
    relations.find((relation) => relation.table !== '' && relation.table.toLowerCase() === lower)
  )
}

/**
 * Resolve the columns of a `qualifier.` or `schema.table.` caret.
 *
 * The single-qualifier case is deliberately forgiving: `orders.` first means the
 * relation named `orders`, while `shop.` means the schema `shop` when no relation
 * matches.
 */
async function qualifiedCandidates(
  request: CompletionRequest,
  qualifier: readonly string[],
  relations: readonly CompletionRelation[],
): Promise<Completion[]> {
  if (qualifier.length >= 2) {
    const schema = qualifier[qualifier.length - 2] as string
    const table = qualifier[qualifier.length - 1] as string
    return columnCandidatesOf(request, schema, table)
  }

  const name = qualifier[0] as string
  const relation = findRelation(relations, name)
  if (relation !== undefined && relation.columns !== undefined) {
    return columnCandidates(relation.columns.map((column) => ({ name: column })))
  }
  if (relation !== undefined && relation.table !== '') {
    const columns = await columnCandidatesOf(
      request,
      relation.schema ?? request.schema,
      relation.table,
    )
    if (columns.length > 0) return columns
  }
  // A trailing dot (`orders.`) hides the relation from the parser above, so the
  // bare name is still tried as a table of the current schema before treating
  // it as a schema name.
  if (relation === undefined) {
    const columns = await columnCandidatesOf(request, request.schema, name)
    if (columns.length > 0) return columns
  }
  return tableCandidatesOf(request, name)
}

/**
 * Suggestions for the caret position, best match first. Never rejects because
 * of a catalog failure; only an aborted request rejects (`AbortError`).
 */
export async function complete(request: CompletionRequest): Promise<CompletionResult> {
  if (request.signal?.aborted === true) throw abortError()

  const analysis = analyze(request.statement, request.caret)
  const { expectation, qualifier, relations } = analysis
  const dialect = request.dialect
  let candidates: Completion[]

  if (qualifier.length > 0) {
    candidates = await qualifiedCandidates(request, qualifier, relations)
  } else {
    switch (expectation) {
      case 'relation': {
        const [tables, schemas] = await Promise.all([
          tableCandidatesOf(request, request.schema),
          schemaNamesOf(request),
        ])
        candidates = [
          ...aliasCandidates(relations),
          ...cteCandidates(analysis.ctes ?? []),
          ...tables,
          ...schemas,
          ...keywordCompletions('relation', dialect),
        ]
        break
      }
      case 'column': {
        const columns = await referencedColumns(request, relations, request.schema)
        candidates = [
          ...columns,
          ...(relations.some(
            (relation) => relation.table !== '' || relation.columns !== undefined,
          )
            ? [starCandidate()]
            : []),
          ...functionCompletions(dialect),
          ...keywordCompletions('column', dialect),
        ]
        break
      }
      case 'schema': {
        candidates = [...(await schemaNamesOf(request)), ...keywordCompletions('schema', dialect)]
        break
      }
      case 'alias': {
        const tables = await tableCandidatesOf(request, request.schema)
        candidates = [
          ...aliasCandidates(relations),
          ...tables,
          ...keywordCompletions('alias', dialect),
        ]
        break
      }
      case 'keyword':
        candidates = keywordCompletions('keyword', dialect)
        break
      case 'any':
      default: {
        const [tables, schemas] = await Promise.all([
          tableCandidatesOf(request, request.schema),
          schemaNamesOf(request),
        ])
        candidates = [
          ...tables,
          ...schemas,
          ...keywordCompletions('any', dialect),
          ...functionCompletions(dialect),
        ]
        break
      }
    }
  }

  if (request.signal?.aborted) throw abortError()
  const items = rank(candidates, analysis.word.prefix, 60, {
    priorities: prioritiesFor(expectation),
  })
  return { items, analysis }
}

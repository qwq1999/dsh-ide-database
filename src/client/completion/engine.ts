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
import {
  CHARSET_NAMES,
  COLLATION_NAMES,
  ENGINE_NAMES,
  functionCompletions,
  keywordCompletions,
} from './keywords'
import {
  aliasCandidates,
  columnCandidates,
  cteCandidates,
  schemaCandidates,
  snippetCandidates,
  starCandidate,
  tableCandidates,
  type CatalogColumn,
  type CatalogTable,
} from './providers'
import { prioritiesFor, rank } from './rank'
import { tokenize } from './tokenizer'
import { quotedIdentifier } from './edit'
import type {
  Analysis,
  Completion,
  CompletionExpectation,
  CompletionKind,
  CompletionRelation,
  CompletionRequest,
  CompletionResult,
} from './types'

/** Max relations whose columns are fetched for an unqualified column caret. */
const MAX_COLUMN_RELATIONS = 6

/** Max already-referenced relations inspected for a JOIN suggestion. */
const MAX_JOIN_OWNERS = 3

/** Max JOIN suggestions; they go before the plain table candidates. */
const MAX_JOIN_SUGGESTIONS = 3

/**
 * Caps per kind: on a big schema the table, column or function list alone would
 * fill the popup and hide every keyword, so each provider leaves room for the
 * others. The overall popup limit stays 60.
 */
const KIND_LIMITS: Partial<Record<CompletionExpectation, Partial<Record<CompletionKind, number>>>> = {
  any: { table: 30 },
  relation: { table: 45 },
  alias: { table: 45 },
  column: { function: 25 },
}

/** Keywords that open a relation position. */
const RELATION_VERBS: ReadonlySet<string> = new Set(['from', 'join', 'update', 'into', 'table'])

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

/**
 * True when the caret starts a statement and nothing has been typed there yet:
 * statement templates are only useful at that position.
 */
function atStatementStart(request: CompletionRequest, analysis: Analysis): boolean {
  if (analysis.word.prefix !== '') return false
  const before = request.statement.slice(0, analysis.word.start)
  return before.slice(before.lastIndexOf(';') + 1).trim() === ''
}

/** The last relation keyword (`from`, `join`, ...) before the caret, if any. */
function relationVerbAt(request: CompletionRequest, before: number): string | undefined {
  const text = request.statement.slice(0, before)
  const start = text.lastIndexOf(';') + 1
  let verb: string | undefined
  for (const token of tokenize(text.slice(start))) {
    if (token.kind === 'keyword' && RELATION_VERBS.has(token.lower)) verb = token.lower
  }
  return verb
}

/** Singular-ish forms of a table name, for `users`/`user` style matching. */
function singularForms(name: string): string[] {
  const lower = name.toLowerCase()
  const forms = [lower]
  if (lower.endsWith('ies') && lower.length > 3) forms.push(`${lower.slice(0, -3)}y`)
  if (lower.endsWith('es') && lower.length > 2) forms.push(lower.slice(0, -2))
  if (lower.endsWith('s') && !lower.endsWith('ss')) forms.push(lower.slice(0, -1))
  return forms
}

/** Whether two table names differ only by a plural suffix. */
function sameRelationName(left: string, right: string): boolean {
  const forms = new Set(singularForms(left))
  return singularForms(right).some((form) => forms.has(form))
}

/** A one-letter table alias that does not collide with existing names. */
function aliasForTable(table: string, taken: Set<string>): string {
  const base = (table[0] ?? 't').toLowerCase()
  if (!taken.has(base)) {
    taken.add(base)
    return base
  }
  let index = 2
  while (taken.has(`${base}${index}`)) index += 1
  const alias = `${base}${index}`
  taken.add(alias)
  return alias
}

/** Join key of the target table: `id`, then `<table>_id`, then its first column. */
function joinKeyColumn(columns: readonly CatalogColumn[], table: string): string | undefined {
  const names = columns.map((column) => column.name).filter((name) => name !== '')
  if (names.length === 0) return undefined
  const id = names.find((name) => name.toLowerCase() === 'id')
  if (id !== undefined) return id
  const forms = new Set(singularForms(table))
  const foreignKey = names.find((name) => {
    const lower = name.toLowerCase()
    return lower.endsWith('_id') && forms.has(lower.slice(0, -3))
  })
  return foreignKey ?? names[0]
}

/**
 * JOIN clauses for the tables the statement probably relates to.
 *
 * A `<name>_id` column of an already referenced table suggests a foreign key to
 * a table called `<name>` (singular or plural). Catalog failures only mean
 * "no JOIN suggestions"; the plain relation candidates are unaffected.
 */
async function joinCandidates(
  request: CompletionRequest,
  relations: readonly CompletionRelation[],
): Promise<Completion[]> {
  try {
    const owners = relations
      .filter((relation) => relation.table !== '')
      .slice(0, MAX_JOIN_OWNERS)
    if (owners.length === 0) return []

    const tables = await load(
      () => request.catalog.tables(request.schema),
      request.signal,
      [] as readonly CatalogTable[],
    )
    const referenced = new Set(relations.map((relation) => relation.table.toLowerCase()))
    const taken = new Set<string>()
    for (const relation of relations) {
      if (relation.alias !== undefined) taken.add(relation.alias.toLowerCase())
      if (relation.table !== '') taken.add(relation.table.toLowerCase())
    }

    const suggestions: Completion[] = []
    const usedTargets = new Set<string>()
    for (const owner of owners) {
      const ownerColumns =
        owner.columns ??
        (
          await load(
            () => request.catalog.columns(owner.schema ?? request.schema, owner.table),
            request.signal,
            [] as readonly CatalogColumn[],
          )
        ).map((column) => column.name)

      for (const column of ownerColumns) {
        if (suggestions.length >= MAX_JOIN_SUGGESTIONS) break
        const match = /^(.+)_id$/iu.exec(column)
        const base = match?.[1] ?? ''
        if (base === '') continue
        const target = tables.find(
          (table) =>
            !referenced.has(table.name.toLowerCase()) &&
            !usedTargets.has(table.name.toLowerCase()) &&
            sameRelationName(table.name, base),
        )
        if (target === undefined) continue

        const targetColumns = await load(
          () => request.catalog.columns(request.schema, target.name),
          request.signal,
          [] as readonly CatalogColumn[],
        )
        const key = joinKeyColumn(targetColumns, target.name)
        if (key === undefined) continue

        const alias = aliasForTable(target.name, taken)
        const ownerRef = owner.alias ?? owner.table
        usedTargets.add(target.name.toLowerCase())
        suggestions.push({
          name: target.name,
          kind: 'table',
          detail: `关联 ${owner.table}.${column}`,
          insert: `${target.name} ${alias} ON ${alias}.${key} = ${ownerRef}.${column}`,
        })
      }
    }
    return suggestions
  } catch (error) {
    if (isAbortError(error)) throw error
    return []
  }
}

/** Columns of one relation, kept together so `*` can expand them later. */
interface RelationColumns {
  relation: CompletionRelation
  columns: readonly CatalogColumn[]
}

/**
 * Columns of every relation mentioned before the caret, in statement order.
 *
 * Derived relations already carry their columns; only concrete tables need a
 * catalog round-trip, and at most {@link MAX_COLUMN_RELATIONS} of them so a
 * long FROM list cannot stall the popup.
 */
async function relationColumnLists(
  request: CompletionRequest,
  relations: readonly CompletionRelation[],
  currentSchema: string,
): Promise<RelationColumns[]> {
  const targets: CompletionRelation[] = []
  const lookups = new Map<CompletionRelation, { schema: string; table: string }>()
  for (const relation of relations) {
    if (relation.columns !== undefined) continue
    const lookup = columnLookup(relation, currentSchema)
    if (lookup === undefined) continue
    if (targets.length >= MAX_COLUMN_RELATIONS) break
    targets.push(relation)
    lookups.set(relation, lookup)
  }
  const lists = await Promise.all(
    targets.map((relation) => {
      const lookup = lookups.get(relation) as { schema: string; table: string }
      return load(
        () => request.catalog.columns(lookup.schema, lookup.table),
        request.signal,
        [],
      )
    }),
  )
  const fetched = new Map<CompletionRelation, readonly CatalogColumn[]>()
  targets.forEach((relation, index) => {
    fetched.set(relation, lists[index] ?? [])
  })
  return relations.map((relation) => {
    if (relation.columns !== undefined) {
      return { relation, columns: relation.columns.map((name) => ({ name })) }
    }
    if (!lookups.has(relation)) return { relation, columns: [] }
    return { relation, columns: fetched.get(relation) ?? [] }
  })
}

/** Deduplicated columns of every relation, in statement order. */
function referencedColumns(lists: readonly RelationColumns[]): Completion[] {
  const seen = new Set<string>()
  const items: Completion[] = []
  for (const { columns } of lists) {
    for (const item of columnCandidates(columns)) {
      const key = item.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push(item)
    }
  }
  return items
}

/**
 * `insert` text for the `*` candidate: the columns of every referenced
 * relation, qualified with the alias (or table name) as soon as more than one
 * relation is in play. Returns `undefined` when a relation's columns are
 * unknown, so the popup keeps the plain `*` instead of inventing a list.
 */
function starExpansion(
  lists: readonly RelationColumns[],
  dialect: CompletionRequest['dialect'],
): { insert: string; count: number } | undefined {
  if (lists.length === 0) return undefined
  const parts: string[] = []
  for (const { relation, columns } of lists) {
    if (columns.length === 0) return undefined
    const alias = relation.alias !== undefined && relation.alias !== '' ? relation.alias : undefined
    const bare = alias === undefined && lists.length === 1
    const ref = alias ?? relation.table
    if (!bare && ref === '') return undefined
    for (const column of columns) {
      const name = quotedIdentifier(column.name, dialect)
      parts.push(bare ? name : `${quotedIdentifier(ref, dialect)}.${name}`)
    }
  }
  return { insert: parts.join(', '), count: parts.length }
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
 * Where a relation's columns live: its own table, or the source of a derived
 * table whose SELECT list was a `*`. `undefined` means the columns are unknown.
 */
function columnLookup(
  relation: CompletionRelation,
  currentSchema: string,
): { schema: string; table: string } | undefined {
  // A CTE or derived table keeps its own name in `table`; the catalog only
  // knows the relation the `*` was expanded from.
  const source = relation.source
  if (source !== undefined) {
    return { schema: source.schema ?? currentSchema, table: source.table }
  }
  if (relation.table !== '') {
    return { schema: relation.schema ?? currentSchema, table: relation.table }
  }
  return undefined
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
  cteRelations: readonly CompletionRelation[] = [],
): Promise<Completion[]> {
  if (qualifier.length >= 2) {
    const schema = qualifier[qualifier.length - 2] as string
    const table = qualifier[qualifier.length - 1] as string
    return columnCandidatesOf(request, schema, table)
  }

  const name = qualifier[0] as string
  // A CTE is in scope before the main statement's FROM clause mentions it.
  const relation = findRelation(relations, name) ?? findRelation(cteRelations, name)
  if (relation !== undefined && relation.columns !== undefined) {
    return columnCandidates(relation.columns.map((column) => ({ name: column })))
  }
  if (relation !== undefined) {
    const lookup = columnLookup(relation, request.schema)
    if (lookup !== undefined) {
      const columns = await columnCandidatesOf(request, lookup.schema, lookup.table)
      if (columns.length > 0) return columns
    }
    // A CTE whose shape is unknown is not a schema: a table list here would
    // only be noise.
    if (findRelation(relations, name) === undefined) return []
  }
  // A trailing dot (`orders.`) hides the relation from the parser above, so the
  // bare name is still tried as a table of the current schema before treating
  // it as a schema name.
  const columns = await columnCandidatesOf(request, request.schema, name)
  if (columns.length > 0) return columns
  return tableCandidatesOf(request, name)
}

/**
 * Suggestions for the caret position, best match first. Never rejects because
 * of a catalog failure; only an aborted request rejects (`AbortError`).
 */
export async function complete(request: CompletionRequest): Promise<CompletionResult> {
  if (request.signal?.aborted === true) throw abortError()

  const analysis = analyze(request.statement, request.caret)
  // Nothing written inside a string literal or comment is an identifier;
  // offering names there would only paste them into prose.
  if (analysis.inLiteral === true) return { items: [], analysis }
  const { expectation, qualifier, relations } = analysis
  const dialect = request.dialect
  let candidates: Completion[]
  let priorities = prioritiesFor(expectation)

  if (qualifier.length > 0) {
    candidates = await qualifiedCandidates(request, qualifier, relations, analysis.cteRelations ?? [])
  } else {
    switch (expectation) {
      case 'tableName': {
        // A DDL statement names an existing table; clause keywords make no
        // sense in that position.
        const [tables, schemas] = await Promise.all([
          tableCandidatesOf(request, request.schema),
          schemaNamesOf(request),
        ])
        candidates = [...tables, ...schemas]
        break
      }
      case 'relation': {
        const [tables, schemas] = await Promise.all([
          tableCandidatesOf(request, request.schema),
          schemaNamesOf(request),
        ])
        const joins =
          relationVerbAt(request, analysis.word.start) === 'join'
            ? await joinCandidates(request, relations)
            : []
        candidates = [
          ...aliasCandidates(relations),
          ...cteCandidates(analysis.ctes ?? []),
          ...joins,
          ...tables,
          ...schemas,
          ...keywordCompletions('relation', dialect),
        ]
        // The suggested JOIN clause is the most useful row here, more than the
        // alias of a table that is already joined.
        if (joins.length > 0) priorities = { ...priorities, table: 0, alias: 1 }
        break
      }
      case 'column': {
        const lists = await relationColumnLists(request, relations, request.schema)
        const expansion = starExpansion(lists, dialect)
        candidates = [
          ...referencedColumns(lists),
          ...(relations.some(
            (relation) => relation.table !== '' || relation.columns !== undefined,
          )
            ? [
                expansion === undefined
                  ? starCandidate()
                  : starCandidate(expansion.insert, expansion.count),
              ]
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
      case 'value': {
        candidates = [...keywordCompletions('value', dialect), ...functionCompletions(dialect)]
        break
      }
      case 'definition': {
        candidates = [...keywordCompletions('definition', dialect)]
        break
      }
      case 'alter': {
        candidates = [...keywordCompletions('alter', dialect)]
        break
      }
      case 'alterObject': {
        candidates = [...keywordCompletions('alterObject', dialect)]
        break
      }
      case 'tableOptions': {
        candidates = [...keywordCompletions('tableOptions', dialect)]
        break
      }
      case 'number': {
        // A LIMIT/OFFSET count is a literal, so no catalog name applies.
        candidates = []
        break
      }
      case 'engine': {
        candidates = ENGINE_NAMES.map((name) => ({ name, kind: 'keyword' as const }))
        break
      }
      case 'set': {
        candidates = [...keywordCompletions('set', dialect)]
        break
      }
      case 'type': {
        candidates = [...keywordCompletions('type', dialect)]
        break
      }
      case 'columnType': {
        candidates = [...keywordCompletions('columnType', dialect)]
        break
      }
      case 'charset': {
        candidates = CHARSET_NAMES.map((name) => ({ name, kind: 'keyword' as const }))
        break
      }
      case 'frame': {
        candidates = [...keywordCompletions('frame', dialect)]
        break
      }
      case 'interval': {
        candidates = [...keywordCompletions('interval', dialect)]
        break
      }
      case 'indexMethod': {
        candidates = [...keywordCompletions('indexMethod', dialect)]
        break
      }
      case 'name': {
        // The user is typing a new object name; the catalog cannot guess it.
        candidates = []
        break
      }
      case 'statement': {
        candidates = [...keywordCompletions('statement', dialect)]
        break
      }
      case 'show': {
        candidates = [...keywordCompletions('show', dialect)]
        break
      }
      case 'comparison':
      case 'boolean':
      case 'direction':
      case 'orderTail':
      case 'expressionTail':
      case 'groupTail':
      case 'rollupTail':
      case 'insertTail':
      case 'insertSource':
      case 'joinTail': {
        candidates = [...keywordCompletions(expectation, dialect)]
        break
      }
      case 'using': {
        // Only the columns both sides share are valid in a USING list.
        const lists = await relationColumnLists(request, relations, request.schema)
        const [first, ...others] = lists
        const shared = (first?.columns ?? []).filter((column) =>
          others.every((list) =>
            list.columns.some((other) => other.name.toLowerCase() === column.name.toLowerCase()),
          ),
        )
        candidates = columnCandidates(shared)
        break
      }
      case 'over': {
        candidates = [...keywordCompletions('over', dialect)]
        break
      }
      case 'privilege': {
        candidates = [...keywordCompletions('privilege', dialect)]
        break
      }
      case 'collation': {
        candidates = COLLATION_NAMES.map((name) => ({ name, kind: 'keyword' as const }))
        break
      }
      case 'grantOption': {
        candidates = [...keywordCompletions('grantOption', dialect)]
        break
      }
      case 'grantOptionWord': {
        candidates = [...keywordCompletions('grantOptionWord', dialect)]
        break
      }
      case 'lock': {
        candidates = [...keywordCompletions('lock', dialect)]
        break
      }
      case 'lockTable':
      case 'rowFormat':
      case 'partition':
      case 'transaction':
      case 'transactionRead':
      case 'transactionWith':
      case 'rollbackTo':
      case 'isolation':
      case 'setTransaction':
      case 'isolationLevel':
      case 'isolationRead':
      case 'nulls':
      case 'alterColumnSet':
      case 'triggerTiming':
      case 'triggerEvent':
      case 'triggerOn':
      case 'triggerFor':
      case 'triggerEach':
      case 'triggerRow':
      case 'routineReturn':
      case 'viewTail':
      case 'eventOn':
      case 'eventSchedule':
      case 'eventTiming':
      case 'eventTail':
      case 'constraintType':
      case 'intoTarget': {
        candidates = [...keywordCompletions(expectation, dialect)]
        break
      }
      case 'database': {
        // A database name, with no DDL keywords mixed in.
        candidates = [...(await schemaNamesOf(request))]
        break
      }
      case 'keyword': {
        const snippets = atStatementStart(request, analysis) ? snippetCandidates(dialect) : []
        candidates = [...snippets, ...keywordCompletions('keyword', dialect)]
        if (snippets.length > 0) priorities = { ...priorities, snippet: 0 }
        break
      }
      case 'any':
      default: {
        const [tables, schemas] = await Promise.all([
          tableCandidatesOf(request, request.schema),
          schemaNamesOf(request),
        ])
        const snippets = atStatementStart(request, analysis) ? snippetCandidates(dialect) : []
        candidates = [
          ...snippets,
          ...tables,
          ...schemas,
          ...keywordCompletions('any', dialect),
          ...functionCompletions(dialect),
        ]
        // Templates are the whole point of an empty statement; normally the
        // kind priority would push them behind every keyword.
        if (snippets.length > 0) priorities = { ...priorities, snippet: 0 }
        break
      }
    }
  }

  if (request.signal?.aborted) throw abortError()
  const limits = KIND_LIMITS[expectation]
  const items = rank(candidates, analysis.word.prefix, 60, {
    priorities,
    recent: request.recent,
    frequency: request.frequency,
    ...(limits === undefined ? {} : { limits }),
  })
  return { items, analysis }
}

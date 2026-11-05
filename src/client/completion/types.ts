/**
 * Types shared by the console completion modules.
 *
 * The completion engine only understands these shapes; all metadata arrives
 * through the injected {@link CompletionCatalog}, so nothing here knows about
 * the HTTP API or the host half of the plugin.
 */
import type { ClientConnection } from '../../shared/types'

/** What an entry in the completion popup stands for. */
export type CompletionKind =
  | 'table'
  | 'schema'
  | 'column'
  | 'keyword'
  | 'function'
  | 'alias'
  | 'snippet'

/** One row of the completion popup. */
export interface Completion {
  /** Text shown and, unless `insert` overrides it, inserted. */
  name: string
  kind: CompletionKind
  /** Right-hand hint: a column type, a relation a alias points at, ... */
  detail?: string
  /** Text inserted instead of `name`, for example `COUNT(`. */
  insert?: string
}

/** A relation (table, view or derived table) the caret's statement mentions. */
export interface CompletionRelation {
  schema?: string
  table: string
  alias?: string
  /**
   * Output columns when the relation is derived (CTE or subquery) and they can
   * be inferred from the statement; `undefined` when they are unknown, for
   * example after `SELECT *`.
   */
  columns?: readonly string[]
  /**
   * Relation a derived table (`SELECT * FROM orders`) inherits its columns from.
   * The parser cannot name those columns itself, so the engine expands the `*`
   * through the catalog when the qualifier points here.
   */
  source?: { schema?: string; table: string }
}

/** Which kind of name the caret position expects. */
export type CompletionExpectation =
  | 'relation'
  | 'column'
  | 'schema'
  | 'alias'
  | 'value'
  | 'definition'
  | 'alter'
  | 'alterObject'
  | 'tableOptions'
  | 'engine'
  | 'number'
  | 'set'
  | 'type'
  | 'charset'
  | 'name'
  | 'statement'
  | 'show'
  | 'comparison'
  | 'boolean'
  | 'direction'
  | 'orderTail'
  | 'expressionTail'
  | 'groupTail'
  | 'insertTail'
  | 'insertSource'
  | 'joinTail'
  | 'keyword'
  | 'any'

/** The identifier the user is typing, as found by `wordAtCaret`. */
export interface WordAtCaret {
  /** First character of the identifier, relative to the analysed text. */
  start: number
  /** One past the last character of the identifier. */
  end: number
  /** Text between `start` and the caret. */
  prefix: string
  /** Opening quote character when the identifier is quoted, otherwise `''`. */
  quote: string
}

/**
 * What the caret's statement looks like. `masked` and `statement` are the
 * statement under the caret (`;` split); `word` positions refer to the whole
 * text that was passed to the analysis, so callers can hand it straight to
 * `applyCompletion`.
 */
export interface Analysis {
  /** Current statement with comments and string literals blanked out. */
  masked: string
  /** Current statement exactly as typed. */
  statement: string
  /** Relations mentioned before the caret, in statement order. */
  relations: CompletionRelation[]
  /** Kind of name the caret position is expected to hold. */
  expectation: CompletionExpectation
  /** Already typed qualifier chain before the dotted caret, e.g. `['shop','orders']`. */
  qualifier: string[]
  /** CTE names visible in the current statement, for FROM/JOIN suggestions. */
  ctes?: readonly string[]
  /**
   * CTE names as relations a qualifier can point at before a `FROM` is written
   * (`WITH recent AS (...) SELECT recent.`). Their columns may be inferred or
   * come from a `source` relation looked up in the catalog.
   */
  cteRelations?: readonly CompletionRelation[]
  /** Identifier being typed at the caret. */
  word: WordAtCaret
  /** The caret is inside a comment or string literal, where no name applies. */
  inLiteral?: boolean
}

/** Metadata source the engine asks for suggestions. */
export interface CompletionCatalog {
  schemas(): Promise<readonly string[]>
  tables(schema: string): Promise<readonly { name: string; kind: 'table' | 'view' }[]>
  columns(schema: string, table: string): Promise<readonly { name: string; typeName?: string }[]>
}

/** One completion request from the console. */
export interface CompletionRequest {
  /** Whole editor text (may contain several statements). */
  statement: string
  /** Caret position inside `statement`. */
  caret: number
  dialect: ClientConnection['dialect']
  /** Schema the console runs in; used for unqualified relations. */
  schema: string
  catalog: CompletionCatalog
  /** Names picked recently, most recent first; used to break ranking ties. */
  recent?: readonly string[]
  /** Pick counts keyed by lower-cased name; used after recent for ranking. */
  frequency?: Readonly<Record<string, number>>
  /** Cancels the request; `complete` then rejects with an `AbortError`. */
  signal?: AbortSignal
}

/** What the console gets back: ranked suggestions plus what was understood. */
export interface CompletionResult {
  items: Completion[]
  analysis: Analysis
}

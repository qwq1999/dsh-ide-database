/**
 * Scoring and ordering for the completion popup.
 *
 * Two things decide the order. The match quality (does the name start with the
 * typed prefix, does the prefix start a later word, is it a subsequence) always
 * wins; after that names are grouped by kind so the popup never pushes a table
 * below a keyword that happens to match equally well.
 */
import type { Completion, CompletionExpectation, CompletionKind } from './types'

/** A scored candidate, kept for tests and future ranking work. */
export interface RankedCandidate extends Completion {
  /** Lower is better. */
  score: number
}

/**
 * How well `name` matches `prefix`, or -1 when it does not match at all.
 *
 * 0: the name starts with the prefix;
 * 1: the prefix starts a later word, so `id` finds `order_id`;
 * 2: the prefix is a subsequence, so `crat` finds `created_at`.
 *
 * The comparison is case-insensitive and tolerant of half-typed input: the
 * console calls this while the user keeps typing, without refetching.
 */
export function matchScore(name: string, prefix: string): number {
  const needle = prefix.toLowerCase()
  if (needle === '') return 0
  const lower = name.toLowerCase()
  if (lower.startsWith(needle)) return 0
  for (let index = 1; index < lower.length; index += 1) {
    const previous = lower[index - 1] ?? ''
    const boundary =
      /[_.\s-]/u.test(previous) || (/[a-z]/u.test(previous) && /[A-Z]/u.test(name[index] ?? ''))
    if (boundary && lower.startsWith(needle, index)) return 1
  }
  let at = 0
  for (const character of needle) {
    const found = lower.indexOf(character, at)
    if (found < 0) return -1
    at = found + 1
  }
  return 2
}

const ANY_PRIORITY: Record<CompletionKind, number> = {
  column: 0,
  table: 1,
  schema: 2,
  keyword: 3,
  function: 4,
  alias: 5,
  snippet: 6,
}

const RELATION_PRIORITY: Record<CompletionKind, number> = {
  alias: 0,
  table: 1,
  schema: 2,
  keyword: 3,
  function: 4,
  column: 5,
  snippet: 6,
}

const COLUMN_PRIORITY: Record<CompletionKind, number> = {
  column: 0,
  alias: 1,
  function: 2,
  keyword: 3,
  table: 4,
  schema: 5,
  snippet: 6,
}

const SCHEMA_PRIORITY: Record<CompletionKind, number> = {
  schema: 0,
  keyword: 1,
  table: 2,
  function: 3,
  column: 4,
  alias: 5,
  snippet: 6,
}

const ALIAS_PRIORITY: Record<CompletionKind, number> = {
  alias: 0,
  table: 1,
  schema: 2,
  keyword: 3,
  function: 4,
  column: 5,
  snippet: 6,
}

const KEYWORD_PRIORITY: Record<CompletionKind, number> = {
  keyword: 0,
  function: 1,
  table: 2,
  schema: 3,
  column: 4,
  alias: 5,
  snippet: 6,
}

const PRIORITIES: Record<CompletionExpectation, Record<CompletionKind, number>> = {
  any: ANY_PRIORITY,
  relation: RELATION_PRIORITY,
  // A DDL statement takes an existing table, so only catalog rows are listed.
  tableName: RELATION_PRIORITY,
  column: COLUMN_PRIORITY,
  schema: SCHEMA_PRIORITY,
  alias: ALIAS_PRIORITY,
  keyword: KEYWORD_PRIORITY,
  // A value, a column definition or an `ALTER TABLE` action is a keyword-first
  // position, like a fresh statement, so they share the keyword order.
  value: KEYWORD_PRIORITY,
  definition: KEYWORD_PRIORITY,
  alter: KEYWORD_PRIORITY,
  alterObject: KEYWORD_PRIORITY,
  tableOptions: KEYWORD_PRIORITY,
  engine: KEYWORD_PRIORITY,
  number: KEYWORD_PRIORITY,
  set: KEYWORD_PRIORITY,
  type: KEYWORD_PRIORITY,
  charset: KEYWORD_PRIORITY,
  name: KEYWORD_PRIORITY,
  statement: KEYWORD_PRIORITY,
  show: KEYWORD_PRIORITY,
  comparison: KEYWORD_PRIORITY,
  boolean: KEYWORD_PRIORITY,
  direction: KEYWORD_PRIORITY,
  orderTail: KEYWORD_PRIORITY,
  expressionTail: KEYWORD_PRIORITY,
  groupTail: KEYWORD_PRIORITY,
  rollupTail: KEYWORD_PRIORITY,
  insertTail: KEYWORD_PRIORITY,
  insertSource: KEYWORD_PRIORITY,
  joinTail: KEYWORD_PRIORITY,
  // Common columns first, like an unqualified column list.
  using: COLUMN_PRIORITY,
  over: KEYWORD_PRIORITY,
  privilege: KEYWORD_PRIORITY,
  collation: KEYWORD_PRIORITY,
  grantOption: KEYWORD_PRIORITY,
  grantOptionWord: KEYWORD_PRIORITY,
  lock: KEYWORD_PRIORITY,
  frame: KEYWORD_PRIORITY,
  interval: KEYWORD_PRIORITY,
  indexMethod: KEYWORD_PRIORITY,
  lockTable: KEYWORD_PRIORITY,
  rowFormat: KEYWORD_PRIORITY,
  partition: KEYWORD_PRIORITY,
  transaction: KEYWORD_PRIORITY,
  transactionRead: KEYWORD_PRIORITY,
  transactionWith: KEYWORD_PRIORITY,
  rollbackTo: KEYWORD_PRIORITY,
  isolation: KEYWORD_PRIORITY,
  setTransaction: KEYWORD_PRIORITY,
  isolationLevel: KEYWORD_PRIORITY,
  isolationRead: KEYWORD_PRIORITY,
  nulls: KEYWORD_PRIORITY,
  alterColumnSet: KEYWORD_PRIORITY,
  columnType: KEYWORD_PRIORITY,
  triggerTiming: KEYWORD_PRIORITY,
  triggerEvent: KEYWORD_PRIORITY,
  triggerOn: KEYWORD_PRIORITY,
  triggerFor: KEYWORD_PRIORITY,
  triggerEach: KEYWORD_PRIORITY,
  triggerRow: KEYWORD_PRIORITY,
  routineReturn: KEYWORD_PRIORITY,
  viewTail: KEYWORD_PRIORITY,
  eventOn: KEYWORD_PRIORITY,
  eventSchedule: KEYWORD_PRIORITY,
  eventTiming: KEYWORD_PRIORITY,
  eventTail: KEYWORD_PRIORITY,
  database: SCHEMA_PRIORITY,
}

/**
 * Kind order for the expectation. Lower numbers are listed first when the match
 * quality is the same.
 */
export function prioritiesFor(context: CompletionExpectation): Record<CompletionKind, number> {
  return PRIORITIES[context] ?? ANY_PRIORITY
}

/** Extra ranking knobs; the engine passes the expectation's type order. */
export interface RankOptions {
  /** Overrides the default type order. */
  priorities?: Partial<Record<CompletionKind, number>>
  /** Recently used names, most recent first; reserved for P1 recall. */
  recent?: readonly string[]
  /** Pick counts keyed by lower-cased name; often-used names float up. */
  frequency?: Readonly<Record<string, number>>
  /** Per-kind maxima, so one crowded kind cannot fill the whole popup. */
  limits?: Partial<Record<CompletionKind, number>>
}

const MATCH_WEIGHT = 10_000
const KIND_WEIGHT = 100
const RECENT_WEIGHT = 1
const RECENT_MAX = 9
/** One pick above the next one; capped so kind order always wins. */
const FREQUENCY_WEIGHT = 10
const FREQUENCY_MAX = 3

/**
 * Score, dedupe (same kind + name) and cap `candidates` for `prefix`.
 * The first occurrence of a duplicate wins.
 */
export function rankCandidates(
  candidates: readonly Completion[],
  prefix: string,
  limit = 60,
  options: RankOptions = {},
): RankedCandidate[] {
  const priorities = options.priorities ?? ANY_PRIORITY
  const recent = options.recent ?? []
  const frequency = options.frequency ?? {}
  const recentScore = new Map<string, number>()
  recent.forEach((name, index) => {
    if (recentScore.has(name)) return
    recentScore.set(name, Math.min(RECENT_MAX, recent.length - index) * RECENT_WEIGHT)
  })

  const seen = new Set<string>()
  const scored: { item: Completion; score: number; order: number }[] = []
  candidates.forEach((item, order) => {
    if (item.name === '') return
    const match = matchScore(item.name, prefix)
    if (match < 0) return
    const key = `${item.kind}\u0000${item.name}`
    if (seen.has(key)) return
    seen.add(key)
    const kind = priorities[item.kind] ?? ANY_PRIORITY[item.kind] ?? 0
    const recentPenalty = recentScore.get(item.name) ?? 0
    const frequencyPenalty =
      Math.min(FREQUENCY_MAX, frequency[item.name.toLowerCase()] ?? 0) * FREQUENCY_WEIGHT
    const score = match * MATCH_WEIGHT + kind * KIND_WEIGHT - frequencyPenalty - recentPenalty
    scored.push({ item, score, order })
  })
  scored.sort((left, right) => left.score - right.score || left.order - right.order)
  const limits = options.limits
  const picked: typeof scored = []
  const counts = new Map<CompletionKind, number>()
  for (const entry of scored) {
    if (limits !== undefined) {
      const max = limits[entry.item.kind]
      const used = counts.get(entry.item.kind) ?? 0
      if (max !== undefined && used >= max) continue
      counts.set(entry.item.kind, used + 1)
    }
    picked.push(entry)
    if (picked.length >= limit) break
  }
  return picked.map((entry) => ({ ...entry.item, score: entry.score }))
}

/** Convenience wrapper: ranked candidates without their scores. */
export function rank(
  candidates: readonly Completion[],
  prefix: string,
  limit = 60,
  options: RankOptions = {},
): Completion[] {
  return rankCandidates(candidates, prefix, limit, options).map(({ score: _score, ...item }) => item)
}

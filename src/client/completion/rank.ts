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
  column: COLUMN_PRIORITY,
  schema: SCHEMA_PRIORITY,
  alias: ALIAS_PRIORITY,
  keyword: KEYWORD_PRIORITY,
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
}

const MATCH_WEIGHT = 10_000
const KIND_WEIGHT = 100
const RECENT_WEIGHT = 1
const RECENT_MAX = 9

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
    const score = match * MATCH_WEIGHT + kind * KIND_WEIGHT - recentPenalty
    scored.push({ item, score, order })
  })
  scored.sort((left, right) => left.score - right.score || left.order - right.order)
  return scored.slice(0, limit).map((entry) => ({ ...entry.item, score: entry.score }))
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

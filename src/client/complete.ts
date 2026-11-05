/**
 * Ctrl+Space completion for the SQL editor.
 *
 * The interesting part is not the list of names but the text surgery: the popup
 * replaces the identifier under the caret, keeps a backtick/double quote the
 * user already opened, and only quotes the inserted name when the catalog name
 * is not a plain identifier. All of it lives here so it can be tested without
 * rendering the console.
 */
import type { ClientConnection } from '../shared/types'
import { quoteIdent } from './tablesql'

export type CompletionKind = 'table' | 'schema' | 'column' | 'keyword' | 'function'

export interface Completion {
  name: string
  kind: CompletionKind
  /** Short right-aligned hint, for example the column type. */
  detail?: string
  /** Text inserted instead of `name`, for example `COUNT(`. */
  insert?: string
}

/**
 * SQL words worth completing: the list stays short on purpose, because every
 * extra entry pushes a table name down in the popup.
 */
export const SQL_KEYWORDS = [
  'select', 'insert', 'update', 'delete', 'from', 'where', 'group', 'order', 'having',
  'limit', 'offset', 'join', 'left', 'right', 'inner', 'outer', 'on', 'as', 'and', 'or',
  'not', 'null', 'between', 'like', 'case', 'when', 'then', 'else', 'end', 'distinct',
  'union', 'all', 'exists', 'into', 'values', 'set', 'recursive', 'with', 'explain',
  'analyze', 'asc', 'desc',
] as const

/** Keyword candidates for the popup, in the order above. */
export function keywordCompletions(): Completion[] {
  return SQL_KEYWORDS.map((name) => ({ name: name.toUpperCase(), kind: 'keyword' as const }))
}

/**
 * SQL functions get their own kind so they never outrank a table or a column
 * with the same prefix; picking one inserts the opening parenthesis too.
 */
export const SQL_FUNCTIONS = [
  'count', 'sum', 'avg', 'min', 'max', 'coalesce', 'cast', 'round', 'abs',
  'concat', 'substr', 'length', 'upper', 'lower', 'trim', 'replace',
  'now', 'date_format', 'to_date', 'to_char', 'nvl', 'ifnull',
  'row_number', 'rank', 'dense_rank',
] as const

/** Function candidates for the popup. */
export function functionCompletions(): Completion[] {
  return SQL_FUNCTIONS.map((name) => {
    const upper = name.toUpperCase()
    return { name: upper, kind: 'function' as const, insert: `${upper}(` }
  })
}

export interface WordAtCaret {
  /** Index where the word starts (before any opening quote). */
  start: number
  /** Index just past the word (before any closing quote). */
  end: number
  /** Text between `start` and the caret; this is what the list filters on. */
  prefix: string
  /** `\`` or `"` when the word sits inside an opened quote, otherwise ''. */
  quote: string
}

const WORD = /[\p{L}\p{N}_$]/u
const PLAIN = /^[A-Za-z_][A-Za-z0-9_]*$/u

function isWord(text: string | undefined): boolean {
  return text !== undefined && WORD.test(text)
}

/** The identifier-ish word under the caret, with the quote that opened it. */
export function wordAtCaret(statement: string, caret: number): WordAtCaret {
  const at = Math.max(0, Math.min(caret, statement.length))
  let start = at
  while (start > 0 && isWord(statement[start - 1])) start -= 1
  let end = at
  while (end < statement.length && isWord(statement[end])) end += 1
  const opened = start > 0 ? statement[start - 1] : ''
  // Only a quote that opens the token counts: an opening quote counts even
  // before the closing one is typed, while the quote that *closed* a previous
  // word must not make the next word look quoted.
  const begins = start < 2 || !isWord(statement[start - 2])
  const quote = (opened === '`' || opened === '"') && begins ? opened : ''
  return { start, end, prefix: statement.slice(start, at), quote }
}

const QUALIFIER = /[\p{L}\p{N}_$`"[\]]/u

function nameBefore(statement: string, dot: number): { name: string; start: number } | null {
  let start = dot
  while (start > 0 && QUALIFIER.test(statement[start - 1] ?? '')) start -= 1
  if (start === dot) return null
  const name = statement
    .slice(start, dot)
    .replace(/^[`"[]/u, '')
    .replace(/[`"\]]$/u, '')
  return name === '' ? null : { name, start }
}

/**
 * The `schema.table` chain typed right before `start`, most specific last.
 *
 * `SELECT * FROM orders WHERE orders.` → `['orders']`, and
 * `shop.orders.` → `['shop', 'orders']`. Anything else (a space after the dot,
 * no dot at all) returns an empty list, and the popup falls back to tables.
 */
export function qualifierBefore(statement: string, start: number): string[] {
  const names: string[] = []
  let dot = start - 1
  if (dot < 0 || statement[dot] !== '.') return names
  for (let round = 0; round < 2; round += 1) {
    const found = nameBefore(statement, dot)
    if (found === null) break
    names.unshift(found.name)
    if (found.start - 1 < 0 || statement[found.start - 1] !== '.') break
    dot = found.start - 1
  }
  return names
}

/**
 * How well `name` matches `needle`, or -1 when it does not match at all.
 *
 * 0: the name starts with the needle (the old behaviour);
 * 1: the needle starts a later word, so `id` finds `order_id`;
 * 2: the needle is a subsequence, so `crat` finds `created_at`.
 */
function matchScore(name: string, needle: string): number {
  if (needle === '') return 0
  const lower = name.toLowerCase()
  if (lower.startsWith(needle)) return 0
  for (let index = 1; index < lower.length; index += 1) {
    const previous = lower[index - 1] ?? ''
    const boundary =
      /[_.\s-]/u.test(previous) ||
      (/[a-z]/u.test(previous) && /[A-Z]/u.test(name[index] ?? ''))
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

/** Names matching `prefix` (case-insensitive), best matches first, capped at `limit`. */
export function completionCandidates(
  prefix: string,
  items: readonly Completion[],
  limit = 50,
): Completion[] {
  const needle = prefix.toLowerCase()
  const seen = new Set<string>()
  const scored: { item: Completion; score: number; order: number }[] = []
  items.forEach((item, order) => {
    if (item.name === '') return
    const score = matchScore(item.name, needle)
    if (score < 0) return
    const key = `${item.kind}:${item.name}`
    if (seen.has(key)) return
    seen.add(key)
    scored.push({ item, score, order })
  })
  scored.sort((left, right) => left.score - right.score || left.order - right.order)
  return scored.slice(0, limit).map((entry) => entry.item)
}

/**
 * Replace the word under the caret with `name`, returning the caret position so
 * the caller can move it after the inserted text.
 */
export function applyCompletion(
  statement: string,
  caret: number,
  name: string,
  dialect: ClientConnection['dialect'],
): { statement: string; caret: number } {
  const word = wordAtCaret(statement, caret)
  const start = word.quote === '' ? word.start : word.start - 1
  const tail = word.quote === '' ? word.end : statement[word.end] === word.quote ? word.end + 1 : word.end
  // A function candidate inserts its call syntax (`COUNT(`) verbatim: quoting it
  // would turn the parenthesis into part of an identifier.
  const call = name.endsWith('(') && PLAIN.test(name.slice(0, -1))
  const insertion = PLAIN.test(name) || call ? name : quoteIdent(dialect, name)
  return {
    statement: `${statement.slice(0, start)}${insertion}${statement.slice(tail)}`,
    caret: start + insertion.length,
  }
}

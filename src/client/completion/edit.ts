/**
 * Text surgery behind the completion popup.
 *
 * The interesting part is not the list of names but the edit: the popup
 * replaces the identifier under the caret, keeps a backtick/double quote the
 * user already opened, and only quotes the inserted name when the catalog name
 * is not a plain identifier. All of it lives here so it can be tested without
 * rendering the console.
 */
import type { ClientConnection } from '../../shared/types'
import { quoteIdent } from '../tablesql'
import type { CompletionKind, WordAtCaret } from './types'

export type { WordAtCaret } from './types'

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
 * Replace the word under the caret with `name`, returning the caret position so
 * the caller can move it after the inserted text. Snippets are templates such
 * as `SELECT * FROM ` and go in verbatim; every other candidate is an
 * identifier (or a call / `*`) and may need quoting.
 */
export function applyCompletion(
  statement: string,
  caret: number,
  name: string,
  dialect: ClientConnection['dialect'],
  kind?: CompletionKind,
): { statement: string; caret: number } {
  const word = wordAtCaret(statement, caret)
  const start = word.quote === '' ? word.start : word.start - 1
  const tail = word.quote === '' ? word.end : statement[word.end] === word.quote ? word.end + 1 : word.end
  // A function candidate inserts its call syntax (`COUNT(`) verbatim: quoting it
  // would turn the parenthesis into part of an identifier. `*` is an expression
  // too, not an identifier to quote.
  const call = name.endsWith('(') && PLAIN.test(name.slice(0, -1))
  const literal = kind === 'snippet'
  const insertion = literal || PLAIN.test(name) || call || name === '*' ? name : quoteIdent(dialect, name)
  return {
    statement: `${statement.slice(0, start)}${insertion}${statement.slice(tail)}`,
    caret: start + insertion.length,
  }
}

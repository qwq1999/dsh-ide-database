import type { SqlDialect } from '../shared/types'

/**
 * Whether a backslash inside the literal starting at `quoteIndex` escapes the
 * next character. MySQL always does; standard SQL treats it as data. The
 * PostgreSQL `E'...'` form is the one standard-dialect exception.
 */
export function backslashEscapes(input: string, quoteIndex: number, quote: string, dialect: SqlDialect): boolean {
  if (quote === '`') return false
  if (dialect === 'mysql') return true
  if (dialect !== 'postgres' || quote !== "'") return false
  const prefix = input[quoteIndex - 1]
  if (prefix !== 'e' && prefix !== 'E') return false
  const before = input[quoteIndex - 2]
  return before === undefined || !/[A-Za-z0-9_$]/u.test(before)
}

/**
 * The end (exclusive) of the Oracle alternative-quoted literal starting at
 * `index`, or null when this is not one. The shape is `[n]q'<open>text<close>'`;
 * bracket pairs have their own closing character, and anything else closes with
 * the same character it opened with. A missing terminator is left to the normal
 * scanner so malformed input still reaches the server.
 */
export function oracleQuotedLiteralEnd(input: string, index: number): number | null {
  const previous = input[index - 1]
  if (previous === 'n' || previous === 'N') {
    const before = input[index - 2]
    if (before !== undefined && /[A-Za-z0-9_$]/u.test(before)) return null
  } else if (previous !== undefined && /[A-Za-z0-9_$]/u.test(previous)) {
    return null
  }
  if (input[index + 1] !== "'") return null
  const open = input[index + 2]
  if (open === undefined) return null
  const close = open === '[' ? ']' : open === '{' ? '}' : open === '<' ? '>' : open === '(' ? ')' : open
  const end = input.indexOf(`${close}'`, index + 3)
  return end === -1 ? null : end + 2
}

/**
 * Whether the `--` at `index - 2` opens a comment. Standard SQL always does;
 * MySQL additionally requires whitespace (or the end of the text) after it,
 * which keeps expressions such as `select 5--3` intact.
 */
export function dashStartsComment(input: string, next: number, dialect: SqlDialect): boolean {
  if (dialect !== 'mysql') return true
  const char = input[next]
  return char === undefined || /\s/u.test(char)
}

/**
 * The PostgreSQL dollar-quote opener at `index` (`$$`, `$body$`), or null.
 *
 * A `$` glued to the end of an identifier belongs to that identifier:
 * PostgreSQL only starts a dollar quote when the delimiter follows whitespace,
 * punctuation or the start of the text. Tags follow identifier rules, so `$1$`
 * stays a parameter and never opens a quote.
 */
export function dollarDelimiterAt(input: string, index: number): string | null {
  if (input[index] !== '$') return null
  if (index > 0 && /[A-Za-z0-9_$]/.test(input[index - 1] ?? '')) return null
  let cursor = index + 1
  while (cursor < input.length && /[A-Za-z0-9_]/.test(input[cursor] ?? '')) cursor += 1
  if (input[cursor] !== '$') return null
  if (cursor > index + 1 && /[0-9]/.test(input[index + 1] ?? '')) return null
  return input.slice(index, cursor + 1)
}

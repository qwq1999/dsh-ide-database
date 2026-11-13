import type { SqlDialect } from '../shared/types'

/**
 * Split a SQL script into individual statements.
 *
 * The console sends one statement per request, so a script has to be cut at
 * top-level semicolons. Semicolons inside strings, quoted identifiers and
 * comments are part of the statement, not separators. MySQL's `#` comment and
 * `--` line comments are recognised so a trailing comment does not swallow the
 * following statement; both rules are dialect-specific: only MySQL treats `#`
 * as a comment, and only MySQL needs whitespace after `--` (without it the
 * dashes are arithmetic, as in `select 5--3`). Backslash escapes are also a
 * MySQL rule; standard SQL treats it as an ordinary character, so `'C:\'` ends
 * at the quote instead of swallowing the rest of the script. PostgreSQL is the
 * exception among the standard dialects: its `E'...'` string does escape.
 */
export function splitStatements(input: string, dialect: SqlDialect = 'generic'): string[] {
  const statements: string[] = []
  let current = ''
  let index = 0

  const flush = (): void => {
    const trimmed = current.trim()
    if (trimmed !== '') statements.push(trimmed)
    current = ''
  }

  while (index < input.length) {
    const char = input[index] ?? ''

    // PostgreSQL dollar quotes: a function body may contain semicolons, and the
    // matching tag is what ends it. An opener without a closer is left alone,
    // so MySQL's `$`-in-identifier scripts keep splitting at their semicolons.
    if (char === '$') {
      const delimiter = dollarDelimiterAt(input, index)
      if (delimiter !== null) {
        const close = input.indexOf(delimiter, index + delimiter.length)
        if (close !== -1) {
          current += input.slice(index, close + delimiter.length)
          index = close + delimiter.length
          continue
        }
      }
    }

    // Line comments run to the end of the line and may contain semicolons.
    // MySQL only starts one after whitespace, so `5--3` stays arithmetic.
    if (char === '-' && input[index + 1] === '-' && dashStartsComment(input, index + 2, dialect)) {
      const end = input.indexOf('\n', index)
      const stop = end === -1 ? input.length : end
      current += input.slice(index, stop)
      index = stop
      continue
    }

    if (char === '#' && dialect === 'mysql') {
      const end = input.indexOf('\n', index)
      const stop = end === -1 ? input.length : end
      current += input.slice(index, stop)
      index = stop
      continue
    }

    // Block comments span lines; keep them attached to the current statement.
    if (char === '/' && input[index + 1] === '*') {
      const close = input.indexOf('*/', index + 2)
      const stop = close === -1 ? input.length : close + 2
      current += input.slice(index, stop)
      index = stop
      continue
    }

    // Strings and quoted identifiers: semicolons inside them are literal.
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      const escapes = backslashEscapes(input, index, quote, dialect)
      current += char
      index += 1
      while (index < input.length) {
        const next = input[index] ?? ''
        current += next
        index += 1
        if (next === '\\' && quote !== '`' && escapes) {
          current += input[index] ?? ''
          index += 1
          continue
        }
        if (next === quote) {
          // A doubled quote is an escaped quote, not the end of the literal.
          if (input[index] === quote) {
            current += input[index] ?? ''
            index += 1
            continue
          }
          break
        }
      }
      continue
    }

    if (char === ';') {
      flush()
      index += 1
      continue
    }

    current += char
    index += 1
  }

  flush()
  return statements
}

/**
 * Whether a backslash inside the literal starting at `quoteIndex` escapes the
 * next character. MySQL always does; standard SQL treats it as data. The
 * PostgreSQL `E'...'` form is the one standard-dialect exception.
 */
function backslashEscapes(input: string, quoteIndex: number, quote: string, dialect: SqlDialect): boolean {
  if (quote === '`') return false
  if (dialect === 'mysql') return true
  if (dialect !== 'postgres' || quote !== "'") return false
  const prefix = input[quoteIndex - 1]
  if (prefix !== 'e' && prefix !== 'E') return false
  const before = input[quoteIndex - 2]
  return before === undefined || !/[A-Za-z0-9_$]/u.test(before)
}

/**
 * Whether the `--` at `index - 2` opens a comment. Standard SQL always does;
 * MySQL additionally requires whitespace (or the end of the text) after it,
 * which keeps expressions such as `select 5--3` intact.
 */
function dashStartsComment(input: string, next: number, dialect: SqlDialect): boolean {
  if (dialect !== 'mysql') return true
  const char = input[next]
  return char === undefined || /\s/u.test(char)
}

/**
 * The PostgreSQL dollar-quote opener at `index` (`$$`, `$body$`), or null.
 *
 * A `$` glued to the end of an identifier belongs to that identifier:
 * PostgreSQL only starts a dollar quote when the delimiter follows
 * whitespace, punctuation or the start of the text. Tags follow identifier
 * rules, so `$1$` stays a parameter and never opens a quote.
 */
function dollarDelimiterAt(input: string, index: number): string | null {
  if (input[index] !== '$') return null
  if (index > 0 && /[A-Za-z0-9_$]/.test(input[index - 1] ?? '')) return null
  let cursor = index + 1
  while (cursor < input.length && /[A-Za-z0-9_]/.test(input[cursor] ?? '')) cursor += 1
  if (input[cursor] !== '$') return null
  if (cursor > index + 1 && /[0-9]/.test(input[index + 1] ?? '')) return null
  return input.slice(index, cursor + 1)
}

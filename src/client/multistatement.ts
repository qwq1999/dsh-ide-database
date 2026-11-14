import type { SqlDialect } from '../shared/types'
import { backslashEscapes, dashStartsComment, dollarDelimiterAt, oracleQuotedLiteralEnd } from './sqllex'

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

    // Oracle alternative quoting (`q'[it's; fine]'`) is one literal even when
    // the text contains a quote of its own, so it has to be consumed before the
    // generic string scanner sees that inner quote.
    if ((char === 'q' || char === 'Q') && (dialect === 'oracle' || dialect === 'oceanbase-oracle')) {
      const end = oracleQuotedLiteralEnd(input, index)
      if (end !== null) {
        current += input.slice(index, end)
        index = end
        continue
      }
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

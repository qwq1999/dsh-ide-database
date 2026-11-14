import type { SqlDialect } from '../shared/types'
import { backslashEscapes, bracketIdentifierEnd, dashStartsComment, dollarDelimiterAt, oracleQuotedLiteralEnd } from './sqllex'

interface DelimiterDirective {
  token: string
  end: number
}

/** A script may put explanatory comments before its first DELIMITER line. */
function hasOnlyComments(text: string): boolean {
  const rest = text
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(?:--|#)[^\n]*/gu, '')
    .trim()
  return rest === ''
}

/**
 * Parse a mysql `DELIMITER <token>` line at `index`. The command only counts at
 * the beginning of a line; anything else is ordinary SQL and is left for the
 * server.
 */
function mysqlDelimiterDirective(input: string, index: number): DelimiterDirective | null {
  let lineStart = index
  while (lineStart > 0 && (input[lineStart - 1] === ' ' || input[lineStart - 1] === '\t')) lineStart -= 1
  if (lineStart > 0 && input[lineStart - 1] !== '\n' && input[lineStart - 1] !== '\r') return null
  const match = /^delimiter[ \t]+(\S+)[ \t]*(?:\r?\n|$)/iu.exec(input.slice(index))
  if (match === null) return null
  const token = match[1]
  if (token === undefined) return null
  return { token, end: index + match[0].length }
}

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
 *
 * MySQL's `DELIMITER $$` client command is handled here too: the directive is
 * removed, the chosen token terminates statements, and semicolons inside the
 * body stay part of the statement.
 */
export function splitStatements(input: string, dialect: SqlDialect = 'generic'): string[] {
  const statements: string[] = []
  let current = ''
  let delimiter = ';'
  let index = 0

  const flush = (): void => {
    const trimmed = current.trim()
    if (trimmed !== '') statements.push(trimmed)
    current = ''
  }

  while (index < input.length) {
    const char = input[index] ?? ''

    // `DELIMITER` is a mysql client command; it chooses the separator but is
    // never sent to the server. Only recognise it at the start of a line so a
    // string or identifier that happens to contain the word is left alone.
    const directiveWord = char === 'd' || char === 'D' ? input.slice(index, index + 9).toLowerCase() : ''
    if (
      dialect === 'mysql' &&
      directiveWord === 'delimiter' &&
      (current.trim() === '' || hasOnlyComments(current))
    ) {
      const directive = mysqlDelimiterDirective(input, index)
      if (directive !== null) {
        delimiter = directive.token
        index = directive.end
        continue
      }
    }

    // A custom delimiter replaces `;` until the next DELIMITER command. It is
    // checked before PostgreSQL dollar quotes because MySQL uses `$$` for both
    // a stored-program terminator and an ordinary delimiter token.
    if (delimiter !== ';' && input.startsWith(delimiter, index)) {
      flush()
      index += delimiter.length
      continue
    }

    // PostgreSQL dollar quotes: a function body may contain semicolons, and the
    // matching tag is what ends it. An opener without a closer is left alone,
    // so MySQL's `$`-in-identifier scripts keep splitting at their semicolons.
    if (char === '$') {
      const tag = dollarDelimiterAt(input, index)
      if (tag !== null) {
        const close = input.indexOf(tag, index + tag.length)
        if (close !== -1) {
          current += input.slice(index, close + tag.length)
          index = close + tag.length
          continue
        }
      }
    }

    // SQL Server bracket identifiers may contain semicolons; keep the whole
    // name together so `[a;b]` does not become two statements.
    if (char === '[' && dialect === 'mssql') {
      const end = bracketIdentifierEnd(input, index)
      if (end !== null) {
        current += input.slice(index, end)
        index = end
        continue
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

    if (char === ';' && delimiter === ';') {
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

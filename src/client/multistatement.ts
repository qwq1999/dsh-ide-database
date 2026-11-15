import type { SqlDialect } from '../shared/types'
import { backslashEscapes, bracketIdentifierEnd, dashStartsComment, dollarDelimiterAt, maskNonCode, oracleQuotedLiteralEnd } from './sqllex'

interface DelimiterDirective {
  token: string
  end: number
}

interface BatchDirective {
  end: number
  count: number
}

/**
 * SQLite keeps a trigger body between `BEGIN` and `END`; its internal
 * semicolons are part of the definition. A `CASE ... END` expression inside
 * the body has its own `END`, so count both `BEGIN` and `CASE` while scanning
 * the already string/comment-masked statement.
 */
function sqliteTriggerNeedsMore(text: string): boolean {
  const code = maskNonCode(text, 'sqlite', true)
  if (!/^\s*create\s+(?:temp(?:orary)?\s+)?trigger\b/iu.test(code)) return false
  let depth = 0
  let body = false
  for (const match of code.matchAll(/\b(begin|case|end)\b/giu)) {
    const word = match[1]?.toLowerCase()
    if (word === 'end') depth -= 1
    else {
      depth += 1
      if (word === 'begin') body = true
    }
  }
  return body && depth > 0
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
  const match = /^delimiter[ \t]+(\S+)[ \t]*(?:(?:--|#)[^\n]*)?(?:\r?\n|$)/iu.exec(input.slice(index))
  if (match === null) return null
  const token = match[1]
  if (token === undefined) return null
  return { token, end: index + match[0].length }
}

/**
 * SQL Server program bodies (`CREATE PROCEDURE`, `FUNCTION`, `TRIGGER`, `VIEW`)
 * contain semicolons that are part of the definition, not statement separators.
 * A batch ends at the next `GO`; keep the whole definition together until then.
 */
function isMssqlProgram(text: string): boolean {
  const code = maskNonCode(text, 'mssql', true)
  return /^\s*(?:create\s+(?:or\s+alter\s+)?|alter\s+)(?:proc(?:edure)?|function|trigger|view)\b/iu.test(code)
}

/**
 * Parse a SQL Server `GO` batch separator at `index`. `GO` is a client command,
 * not T-SQL: it only counts as its own line, optionally followed by a comment,
 * and is never sent to the server. A positive count repeats the preceding
 * batch, matching sqlcmd.
 */
function mssqlGoDirective(input: string, index: number): BatchDirective | null {
  let lineStart = index
  while (lineStart > 0 && (input[lineStart - 1] === ' ' || input[lineStart - 1] === '\t')) lineStart -= 1
  if (lineStart > 0 && input[lineStart - 1] !== '\n' && input[lineStart - 1] !== '\r') return null
  const match = /^go(?:[ \t]+(\d+))?[ \t]*(?:--[^\n]*)?(?:\r?\n|$)/iu.exec(input.slice(index))
  if (match === null) return null
  const count = match[1] === undefined ? 1 : Number(match[1])
  if (!Number.isSafeInteger(count) || count < 1) return null
  return { end: index + match[0].length, count }
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
 * body stay part of the statement. SQL Server's `GO` batch separator is also a
 * client command; a line containing only `GO` splits batches and is removed.
 */
export function splitStatements(input: string, dialect: SqlDialect = 'generic'): string[] {
  const statements: string[] = []
  let current = ''
  let delimiter = ';'
  let batchStart = 0
  let mssqlProgram: boolean | undefined
  let index = 0

  const flush = (): void => {
    const trimmed = current.trim()
    if (trimmed !== '') statements.push(trimmed)
    current = ''
    mssqlProgram = undefined
  }

  while (index < input.length) {
    const char = input[index] ?? ''

    // `GO` is a SQL Server client command, not T-SQL. It only counts when it
    // starts its own line; strings and comments are consumed by their own
    // branches before the scanner can see a `GO` inside them.
    const batchWord = char === 'g' || char === 'G' ? input.slice(index, index + 2).toLowerCase() : ''
    if (dialect === 'mssql' && batchWord === 'go') {
      const batch = mssqlGoDirective(input, index)
      if (batch !== null) {
        if (!hasOnlyComments(current)) flush()
        const batchStatements = statements.slice(batchStart)
        if (batch.count > 1 && batchStatements.length > 0) {
          for (let repeat = 1; repeat < batch.count; repeat += 1) statements.push(...batchStatements)
        }
        batchStart = statements.length
        index = batch.end
        continue
      }
    }

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
    if (char === '$' && dialect === 'postgres') {
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

    // SQL Server and SQLite bracket identifiers may contain semicolons; keep
    // the whole name together so `[a;b]` does not become two statements.
    if (char === '[' && (dialect === 'mssql' || dialect === 'sqlite')) {
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
      if (dialect === 'sqlite' && sqliteTriggerNeedsMore(current)) {
        current += char
        index += 1
        continue
      }
      if (dialect === 'mssql') {
        if (mssqlProgram === undefined) mssqlProgram = isMssqlProgram(current)
        if (mssqlProgram) {
          current += char
          index += 1
          continue
        }
      }
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

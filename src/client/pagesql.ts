/**
 * Paging by wrapping the statement the user wrote, the same trick IDEA uses:
 * only a single plain SELECT can be wrapped, everything else runs as written.
 */
import type { ClientConnection, SqlDialect } from '../shared/types'
import { maskNonCode } from './sqllex'

/** A SELECT that cannot be wrapped or cannot take an appended OFFSET/FETCH. */
const NOT_PAGEABLE =
  /\binto\b|\bfor\s+(?:update|share|key\s+share|no\s+key\s+update|xml|json|browse)\b|\block\s+in\s+share\s+mode\b|\btop\b\s*(?:\(|\d)|\boption\s*\(/u

/** A bare single SELECT can be wrapped into a page; anything else runs whole. */
export function pageable(statement: string, dialect: SqlDialect = 'generic'): boolean {
  const text = statement.trim().replace(/;+\s*$/u, '')
  // Judge the code, not the text: a literal `'limit'`, a comment, or a leading
  // comment must not decide whether the console can page the query.
  const code = maskNonCode(text, dialect, true).trim().toLowerCase()
  if (!/^select\b/u.test(code)) return false
  if (code.includes(';')) return false
  // An existing OFFSET already pages the statement; appending another one
  // would produce two OFFSET clauses.
  if (/\boffset\s+(?:\d+|[@:]\w+|\?)\s+rows?\b/u.test(code)) {
    return false
  }
  if (/\blimit\b/u.test(code) || /\brownum\b/u.test(code) || /\bfetch\s+(first|next)\b/u.test(code)) return false
  // INTO assigns a variable or writes a file, FOR UPDATE ... takes locks:
  // wrapping those in SELECT * FROM (...) changes what they do.
  if (NOT_PAGEABLE.test(code)) return false
  return true
}

/**
 * SQL Server refusing `ORDER BY` inside a derived table keeps the old wrapper
 * from paging an ordered statement. Append OFFSET/FETCH to the statement
 * itself instead; only add a dummy ordering when there is no top-level
 * `ORDER BY` to reuse.
 */
function hasTopLevelOrderBy(text: string, dialect: SqlDialect): boolean {
  const code = maskNonCode(text, dialect, true)
  let depth = 0
  for (let index = 0; index < code.length; index += 1) {
    const char = code[index]
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && (char === 'o' || char === 'O') && /^order\s+by\b/iu.test(code.slice(index))) {
      const before = code[index - 1]
      if (before === undefined || !/[A-Za-z0-9_$]/u.test(before)) return true
    }
  }
  return false
}

/**
 * Put the inner statement on its own lines so a trailing `-- note` keeps
 * commenting out only the user's own line instead of the closing parenthesis.
 */
export function wrapPage(
  dialect: ClientConnection['dialect'],
  statement: string,
  size: number,
  page: number,
): string {
  const text = statement.trim().replace(/;+\s*$/u, '')
  const offset = page * size
  if (dialect === 'oracle' || dialect === 'oceanbase-oracle' || dialect === 'dameng') {
    return `SELECT * FROM (
${text}
) dshdb_page OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`
  }
  if (dialect === 'mssql') {
    // SQL Server rejects ORDER BY in a derived table unless that table has
    // TOP/OFFSET/FOR XML. Paging the statement in place keeps a user's own
    // ORDER BY valid, and only needs a dummy order when none is present.
    const order = hasTopLevelOrderBy(text, dialect)
      ? `\nOFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`
      : `\nORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`
    return `${text}${order}`
  }
  return `SELECT * FROM (
${text}
) dshdb_page LIMIT ${size} OFFSET ${offset}`
}

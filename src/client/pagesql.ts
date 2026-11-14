/**
 * Paging by wrapping the statement the user wrote, the same trick IDEA uses:
 * only a single plain SELECT can be wrapped, everything else runs as written.
 */
import type { ClientConnection, SqlDialect } from '../shared/types'
import { maskNonCode } from './sqllex'

/** A SELECT that hands something off is not safe to run inside a derived table. */
const NOT_PAGEABLE =
  /\binto\b|\bfor\s+(?:update|share|key\s+share|no\s+key\s+update)\b|\block\s+in\s+share\s+mode\b/u

/** A bare single SELECT can be wrapped into a page; anything else runs whole. */
export function pageable(statement: string, dialect: SqlDialect = 'generic'): boolean {
  const text = statement.trim().replace(/;+\s*$/u, '')
  // Judge the code, not the text: a literal `'limit'`, a comment, or a leading
  // comment must not decide whether the console can page the query.
  const code = maskNonCode(text, dialect, true).trim().toLowerCase()
  if (!/^select\b/u.test(code)) return false
  if (code.includes(';')) return false
  if (/\blimit\b/u.test(code) || /\brownum\b/u.test(code) || /\bfetch\s+(first|next)\b/u.test(code)) return false
  // INTO assigns a variable or writes a file, FOR UPDATE ... takes locks:
  // wrapping those in SELECT * FROM (...) changes what they do.
  if (NOT_PAGEABLE.test(code)) return false
  return true
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
    return `SELECT * FROM (
${text}
) dshdb_page ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`
  }
  return `SELECT * FROM (
${text}
) dshdb_page LIMIT ${size} OFFSET ${offset}`
}

/**
 * Paging by wrapping the statement the user wrote, the same trick IDEA uses:
 * only a single plain SELECT can be wrapped, everything else runs as written.
 */
import type { ClientConnection } from '../shared/types'

/** A bare single SELECT can be wrapped into a page; anything else runs whole. */
export function pageable(statement: string): boolean {
  const text = statement.trim().replace(/;+\s*$/u, '')
  if (!/^select\b/iu.test(text)) return false
  if (/;\s*select/iu.test(text)) return false
  if (/\blimit\b/iu.test(text) || /\brownum\b/iu.test(text) || /\bfetch\s+(first|next)\b/iu.test(text)) return false
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
  return `SELECT * FROM (
${text}
) dshdb_page LIMIT ${size} OFFSET ${offset}`
}

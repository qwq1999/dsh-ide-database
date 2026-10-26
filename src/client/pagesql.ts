/**
 * Paging by wrapping the statement the user wrote, the same trick IDEA uses:
 * only a single plain SELECT can be wrapped, everything else runs as written.
 */
import type { ClientConnection } from '../shared/types'

/** A SELECT that hands something off is not safe to run inside a derived table. */
const NOT_PAGEABLE =
  /\binto\b|\bfor\s+(?:update|share|key\s+share|no\s+key\s+update)\b|\block\s+in\s+share\s+mode\b/u

/**
 * Replace string literals and comments with spaces so keyword checks only see
 * code: `SELECT 'for update' AS note` is still a plain query.
 */
function codeOnly(text: string): string {
  let out = ''
  let index = 0
  while (index < text.length) {
    const char = text[index] ?? ''
    if (char === '-' && text[index + 1] === '-') {
      const end = text.indexOf('\n', index)
      const stop = end === -1 ? text.length : end
      out += ' '.repeat(stop - index)
      index = stop
      continue
    }
    if (char === '#') {
      const end = text.indexOf('\n', index)
      const stop = end === -1 ? text.length : end
      out += ' '.repeat(stop - index)
      index = stop
      continue
    }
    if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2)
      const stop = close === -1 ? text.length : close + 2
      out += ' '.repeat(stop - index)
      index = stop
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      index += 1
      out += ' '
      while (index < text.length) {
        const next = text[index] ?? ''
        index += 1
        out += ' '
        if (next === '\\' && quote !== '`' && index < text.length) {
          index += 1
          out += ' '
          continue
        }
        if (next === quote) {
          if (text[index] === quote) {
            index += 1
            out += ' '
            continue
          }
          break
        }
      }
      continue
    }
    out += char
    index += 1
  }
  return out
}

/** A bare single SELECT can be wrapped into a page; anything else runs whole. */
export function pageable(statement: string): boolean {
  const text = statement.trim().replace(/;+\s*$/u, '')
  if (!/^select\b/iu.test(text)) return false
  if (/;\s*select/iu.test(text)) return false
  if (/\blimit\b/iu.test(text) || /\brownum\b/iu.test(text) || /\bfetch\s+(first|next)\b/iu.test(text)) return false
  // INTO assigns a variable or writes a file, FOR UPDATE ... takes locks:
  // wrapping those in SELECT * FROM (...) changes what they do.
  if (NOT_PAGEABLE.test(codeOnly(text).toLowerCase())) return false
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

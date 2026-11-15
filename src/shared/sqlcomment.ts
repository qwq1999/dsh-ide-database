import type { SqlDialect } from './types.js'

/**
 * End (exclusive) of the block comment starting at `index`, or -1 when it is
 * not closed. PostgreSQL and SQL Server nest block comments, so an inner
 * opener must be balanced before the outer comment ends. Other dialects stop
 * at the first closer.
 */
export function blockCommentEnd(text: string, index: number, dialect: SqlDialect): number {
  const nesting = dialect === 'postgres' || dialect === 'mssql'
  let depth = 1
  let cursor = index + 2
  while (cursor < text.length) {
    if (text[cursor] === '/' && text[cursor + 1] === '*') {
      if (nesting) depth += 1
      cursor += 2
      continue
    }
    if (text[cursor] === '*' && text[cursor + 1] === '/') {
      depth -= 1
      cursor += 2
      if (depth === 0) return cursor
      continue
    }
    cursor += 1
  }
  return -1
}

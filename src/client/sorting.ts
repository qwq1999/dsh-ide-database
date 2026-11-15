/**
 * Column-header sorting for the table data tab.
 *
 * The ORDER BY box stays the single source of truth: clicking a header simply
 * rewrites that expression (no direction -> ASC -> DESC -> none), so the query,
 * the export and the visible ordering never disagree.
 */

export type SortDirection = 'asc' | 'desc'

export interface SortSpec {
  column: string
  direction: SortDirection
}

/** One identifier, with the quote style the dialect's ORDER BY may use. */
function orderColumn(text: string): string | undefined {
  const double = /^"((?:[^"]|"")*)"$/u.exec(text)
  if (double !== null) return (double[1] ?? '').replaceAll('""', '"')
  const backtick = /^`((?:[^`]|``)*)`$/u.exec(text)
  if (backtick !== null) return (backtick[1] ?? '').replaceAll('``', '`')
  const bracket = /^\[((?:[^\]]|\]\])*)\]$/u.exec(text)
  if (bracket !== null) return (bracket[1] ?? '').replaceAll(']]', ']')
  const single = /^'((?:[^']|'')*)'$/u.exec(text)
  if (single !== null) return (single[1] ?? '').replaceAll("''", "'")
  return /^[A-Za-z0-9_$#]+$/u.test(text) ? text : undefined
}

/** The ORDER BY text when it is a single column, otherwise undefined. */
export function parseOrderBy(text: string): SortSpec | undefined {
  const trimmed = text.trim()
  const directionMatch = /\s+(asc|desc)\s*$/iu.exec(trimmed)
  const direction = directionMatch?.[1]?.toLowerCase() === 'desc' ? 'desc' : 'asc'
  const body = (directionMatch === null ? trimmed : trimmed.slice(0, directionMatch.index)).trim()
  if (body === '') return undefined
  const column = orderColumn(body)
  if (column === undefined || column === '') return undefined
  return { column, direction }
}

/** Next ORDER BY text after clicking a column header. */
export function nextOrderBy(text: string, column: string, quoted: string = column): string {
  const current = parseOrderBy(text)
  if (current === undefined || current.column !== column) return `${quoted} ASC`
  return current.direction === 'asc' ? `${quoted} DESC` : ''
}

/** Quote a column for ORDER BY (MySQL backticks, SQL Server brackets, others ANSI quotes). */
export function quoteSortColumn(dialect: string, column: string): string {
  if (dialect === 'mysql') return `\`${column.replaceAll('`', '``')}\``
  if (dialect === 'mssql') return `[${column.replaceAll(']', ']]')}]`
  return `"${column.replaceAll('"', '""')}"`
}

/** The words the ORDER BY box may start with; stripped before re-prefixing. */
const ORDER_BY_PATTERN = /^ORDER\s+BY\b/iu

/** Drop a leading ORDER BY keyword so the rest can be re-prefixed. */
export function stripOrderBy(text: string): string {
  const trimmed = text.trim().replace(/[\s;]+$/u, '')
  if (trimmed === '') return ''
  return trimmed.replace(ORDER_BY_PATTERN, '').trim()
}

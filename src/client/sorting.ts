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

const SIMPLE_ORDER = /^\s*[`"']?([A-Za-z0-9_$#]+)[`"']?\s*(asc|desc)?\s*$/i

/** The ORDER BY text when it is a single column, otherwise undefined. */
export function parseOrderBy(text: string): SortSpec | undefined {
  const match = SIMPLE_ORDER.exec(text)
  if (match === null) return undefined
  const column = match[1] ?? ''
  if (column === '') return undefined
  return { column, direction: (match[2] ?? 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc' }
}

/** Next ORDER BY text after clicking a column header. */
export function nextOrderBy(text: string, column: string, quoted: string = column): string {
  const current = parseOrderBy(text)
  if (current === undefined || current.column !== column) return `${quoted} ASC`
  return current.direction === 'asc' ? `${quoted} DESC` : ''
}

/** Quote a column for ORDER BY (MySQL uses backticks, Oracle family quotes). */
export function quoteSortColumn(dialect: string, column: string): string {
  if (dialect === 'mysql') return `\`${column.replaceAll('`', '``')}\``
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

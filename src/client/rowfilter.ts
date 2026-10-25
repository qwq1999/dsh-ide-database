/**
 * Free-text filter over the rows already returned for the current page.
 *
 * The grid shows `NULL` and `true`/`false` through {@link formatCell}, so the
 * filter matches that same text — typing `null` finds null cells and `12` finds
 * numeric cells without the user having to know the underlying type.
 */
import type { Row } from '../shared/types'
import { formatCell } from './format'

export function rowMatches(row: Row, needle: string): boolean {
  const lowered = needle.toLowerCase()
  return row.some((value) => formatCell(value).toLowerCase().includes(lowered))
}

export function filterRows(rows: Row[], needle: string): Row[] {
  const trimmed = needle.trim()
  if (trimmed === '') return rows
  return rows.filter((row) => rowMatches(row, trimmed))
}

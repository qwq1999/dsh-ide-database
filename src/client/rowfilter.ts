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

/**
 * Positions of the rows that should stay visible.
 *
 * The console renumbers the rows it renders, so it needs the original page
 * positions as well: filtering out row two must not turn row three into row two.
 */
export function filterRowIndexes(rows: Row[], needle: string): number[] {
  const trimmed = needle.trim()
  const indexes: number[] = []
  if (trimmed === '') {
    for (const index of rows.keys()) indexes.push(index)
    return indexes
  }
  rows.forEach((row, index) => {
    if (rowMatches(row, trimmed)) indexes.push(index)
  })
  return indexes
}

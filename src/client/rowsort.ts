/**
 * In-place sorting for the console's result grid.
 *
 * The console keeps no cursor, so it can only sort the page it already holds;
 * doing it in the browser is instant and never re-runs the statement. Sorting
 * is purely a view concern: the rows sent to the CSV/JSON export follow the
 * same order as the grid.
 */
import type { CellValue, ColumnInfo, Row } from '../shared/types'

export type RowSortDirection = 'asc' | 'desc'

export interface RowSort {
  column: string
  direction: RowSortDirection
}

/** Header clicks cycle none -> ascending -> descending -> none. */
export function nextRowSort(current: RowSort | null, column: string): RowSort | null {
  if (current === null || current.column !== column) return { column, direction: 'asc' }
  return current.direction === 'asc' ? { column, direction: 'desc' } : null
}

/**
 * One collator for every comparison. `String.prototype.localeCompare` with an
 * explicit locale and options builds a fresh ICU collator per call, which made
 * sorting a full 5000-row page about 30× slower than reusing this instance.
 */
const COLLATOR = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' })

function order(left: CellValue, right: CellValue): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right)
  return COLLATOR.compare(String(left), String(right))
}

/**
 * Sort a page of rows by one column; empty cells always sink to the bottom.
 * `order` maps each sorted position back to the row's position before sorting,
 * so callers can keep showing the original row numbers.
 */
export function sortRowsWithOrder(
  columns: ColumnInfo[],
  rows: Row[],
  sort: RowSort | null,
): { rows: Row[]; order: number[] } {
  const identity = rows.map((_row, index) => index)
  if (sort === null) return { rows, order: identity }
  const index = columns.findIndex((column) => column.name === sort.column)
  if (index < 0) return { rows, order: identity }
  const factor = sort.direction === 'asc' ? 1 : -1
  const positions: number[] = [...identity].sort((left, right) => {
    const a = rows[left]?.[index]
    const b = rows[right]?.[index]
    const aEmpty = a === null || a === undefined
    const bEmpty = b === null || b === undefined
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1
    return factor * order(a, b)
  })
  return { rows: positions.map((position) => rows[position] as Row), order: positions }
}


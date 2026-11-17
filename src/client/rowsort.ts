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
  /** Original result-column index; distinguishes columns with the same label. */
  index?: number
}

/**
 * Header clicks cycle none -> ascending -> descending -> none. The index is
 * compared too: `SELECT a.id, b.id` has two headers called `id`, and each one
 * owns its own sort state.
 */
export function nextRowSort(current: RowSort | null, column: string, index?: number): RowSort | null {
  const same = current !== null && current.column === column && (index === undefined || current.index === undefined || current.index === index)
  if (!same) {
    const next: RowSort = { column, direction: 'asc' }
    if (index !== undefined) next.index = index
    return next
  }
  if (current.direction === 'asc') return { column, direction: 'desc', index: current.index }
  return null
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
  const explicit = sort.index
  const byIndex = explicit !== undefined && Number.isInteger(explicit) && explicit >= 0 && explicit < columns.length
  const index = byIndex ? explicit : columns.findIndex((column) => column.name === sort.column)
  if (index < 0) return { rows, order: identity }
  const factor = sort.direction === 'asc' ? 1 : -1
  const positions: number[] = [...identity].sort((left, right) => {
    const a = rows[left]?.[index]
    const b = rows[right]?.[index]
    // NaN minus anything is NaN, which breaks comparator transitivity and
    // leaves the finite values unordered. Group it with the empty cells.
    const aEmpty = a === null || a === undefined || (typeof a === 'number' && Number.isNaN(a))
    const bEmpty = b === null || b === undefined || (typeof b === 'number' && Number.isNaN(b))
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1
    return factor * order(a, b)
  })
  return { rows: positions.map((position) => rows[position] as Row), order: positions }
}


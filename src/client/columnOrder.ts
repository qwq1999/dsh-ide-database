/**
 * Display order for result columns, dragged in the grid header.
 *
 * The order is kept as indices into the original result columns so filters,
 * sorting and menus can keep addressing columns by name; only what the grid
 * renders (headers, cells and exports) is rearranged.
 */
import type { CellValue, ColumnInfo, Row } from '../shared/types'

export function identityOrder(length: number): number[] {
  return Array.from({ length }, (_, index) => index)
}

/** Move one display position to another, clamping out-of-range targets. */
export function moveColumn(order: number[], from: number, to: number): number[] {
  if (from === to || from < 0 || from >= order.length || order.length === 0) return order
  const next = order.slice()
  const target = Math.max(0, Math.min(to, next.length - 1))
  const [moved] = next.splice(from, 1)
  next.splice(target, 0, moved)
  return next
}

export function orderColumns(columns: ColumnInfo[], order: number[] | null): ColumnInfo[] {
  if (order === null || order.length !== columns.length) return columns
  return order.map((index) => columns[index])
}

export function orderRows(rows: Row[], order: number[] | null): Row[] {
  if (order === null || rows.length === 0) return rows
  return rows.map((row) => {
    const next: CellValue[] = order.map((index) => row[index] ?? null)
    return next
  })
}

/** Column names joined, used to drop a stale order when the result changes. */
export function columnSignature(columns: ColumnInfo[]): string {
  return columns.map((column) => column.name).join('\u0000')
}

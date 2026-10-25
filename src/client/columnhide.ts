/**
 * Column visibility for result grids.
 *
 * Hiding is a view concern: the hidden columns keep their place in the column
 * order and stay in exports, they are only left out of what the grid renders.
 * The set is remembered per grid so reopening a table keeps the same view.
 */
import type { CellValue, ColumnInfo, Row } from '../shared/types'

export const HIDDEN_STORAGE_PREFIX = 'dsh-ide-database.hidden.v1:'

export function isHidden(hidden: string[] | null, name: string): boolean {
  return hidden !== null && hidden.includes(name)
}

/** Add or remove one column; an empty set collapses back to `null` (all visible). */
export function toggleHidden(hidden: string[] | null, name: string): string[] | null {
  const current = hidden ?? []
  const next = current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
  return next.length === 0 ? null : next
}

/** Drop remembered names that the current result no longer has. */
export function pruneHidden(hidden: string[] | null, columns: ColumnInfo[]): string[] | null {
  if (hidden === null) return null
  const names = new Set(columns.map((column) => column.name))
  const kept = hidden.filter((name) => names.has(name))
  return kept.length === 0 ? null : kept
}

/**
 * Display columns and their rows with hidden columns removed. Positions map
 * back into `columns`, so a grid's reorder callbacks can translate indices.
 */
export function hideColumns(
  columns: ColumnInfo[],
  rows: Row[],
  hidden: string[] | null,
): { positions: number[]; columns: ColumnInfo[]; rows: Row[] } {
  const positions = columns.map((column, index) => (isHidden(hidden, column.name) ? -1 : index)).filter((index) => index >= 0)
  // Never hide every column: an empty grid with no way back is worse than the
  // extra wide column the user just asked to hide.
  if (positions.length === 0) {
    const all = columns.map((_, index) => index)
    return { positions: all, columns, rows }
  }
  if (positions.length === columns.length) return { positions, columns, rows }
  const narrowed = positions.map((index) => columns[index]) as ColumnInfo[]
  const narrowedRows = rows.map((row) => positions.map((index) => (row[index] ?? null) as CellValue))
  return { positions, columns: narrowed, rows: narrowedRows }
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readHidden(storageKey: string): string[] | null {
  const store = storage()
  if (store === null) return null
  try {
    const raw = store.getItem(`${HIDDEN_STORAGE_PREFIX}${storageKey}`)
    if (raw === null || raw === '') return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const names = parsed.filter((item): item is string => typeof item === 'string')
    return names.length === 0 ? null : names
  } catch {
    return null
  }
}

export function writeHidden(storageKey: string, hidden: string[] | null): void {
  const store = storage()
  if (store === null) return
  try {
    if (hidden === null || hidden.length === 0) store.removeItem(`${HIDDEN_STORAGE_PREFIX}${storageKey}`)
    else store.setItem(`${HIDDEN_STORAGE_PREFIX}${storageKey}`, JSON.stringify(hidden))
  } catch {
    // Storage can be full or disabled; hiding is a nicety, not worth failing on.
  }
}

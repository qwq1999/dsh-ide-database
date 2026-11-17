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

/**
 * An exact decimal value: `n / 10^scale`, plus signed infinities. Integers
 * beyond 2^53 arrive as strings from the JDBC bridge (SqlExecutor.normalize
 * deliberately keeps them as text to avoid JS rounding), so folding them
 * through Number() collapses distinct BIGINTs onto one double and makes a
 * sort silently depend on row order. Scaled BigInts keep precision at any
 * magnitude while giving numbers and numeric strings one shared total order.
 */
type DecimalKey = { n: bigint; scale: number } | { inf: -1 | 1 }
type SortKey = { domain: 0; dec: DecimalKey } | { domain: 1; str: string }

const DECIMAL_RE = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/

function decimalKey(text: string): DecimalKey | null {
  const m = DECIMAL_RE.exec(text.trim())
  if (!m) return null
  const digits = (m[2] ?? '') + (m[3] ?? '')
  const scale = (m[3] ?? '').length - Number(m[4] ?? 0)
  let n = BigInt(digits) * (m[1] === '-' ? -1n : 1n)
  if (scale < 0) {
    n *= 10n ** BigInt(-scale)
    return { n, scale: 0 }
  }
  return { n, scale }
}

function sortKey(value: CellValue): SortKey {
  if (typeof value === 'number') {
    if (value === Infinity) return { domain: 0, dec: { inf: 1 } }
    if (value === -Infinity) return { domain: 0, dec: { inf: -1 } }
  }
  if (typeof value === 'boolean') return { domain: 0, dec: { n: value ? 1n : 0n, scale: 0 } }
  const text = String(value)
  const dec = decimalKey(text)
  return dec === null ? { domain: 1, str: text } : { domain: 0, dec }
}

function compareDecimal(a: DecimalKey, b: DecimalKey): number {
  const aFinite = 'n' in a
  const bFinite = 'n' in b
  if (!aFinite && !bFinite) return a.inf - b.inf
  if (!aFinite) return a.inf
  if (!bFinite) return -b.inf
  const scale = Math.max(a.scale, b.scale)
  const left = scale === a.scale ? a.n : a.n * 10n ** BigInt(scale - a.scale)
  const right = scale === b.scale ? b.n : b.n * 10n ** BigInt(scale - b.scale)
  return left < right ? -1 : left > right ? 1 : 0
}

function order(left: CellValue, right: CellValue): number {
  const a = sortKey(left)
  const b = sortKey(right)
  if (a.domain === 0 && b.domain === 0) return compareDecimal(a.dec, b.dec)
  if (a.domain === 1 && b.domain === 1) return COLLATOR.compare(a.str, b.str)
  return a.domain - b.domain
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


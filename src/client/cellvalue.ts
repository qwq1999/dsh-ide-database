/**
 * What the "view full value" dialog shows for one grid cell.
 *
 * Grids keep every cell on one line, so a JSON document or a long text blob is
 * unreadable there. Opening a cell expands JSON containers over several lines
 * and leaves every other value exactly as the grid already formats it.
 */
import type { CellValue, ColumnInfo, Row } from '../shared/types'
import { formatCell } from './format'
import { prettyJsonText } from './redisvalue'

/** Suffix the database bridge appends to a cell it had to cap. */
export const TRUNCATED_SUFFIX = '…<truncated>'
/** Keep in sync with MAX_TEXT in bridge/src/dshdb/SqlExecutor.java. */
export const CELL_TEXT_LIMIT = 16_384

export interface CellValueView {
  /** Column the cell belongs to, used as the dialog title. */
  column: string
  text: string
  /** True when a JSON container was expanded into several lines. */
  pretty: boolean
  /**
   * The capped cell text exactly as the result carried it, when the dialog has
   * to ask the bridge for the rest. Null for values that arrived complete.
   */
  truncated: string | null
}

/**
 * A result only ever carries the first {@link CELL_TEXT_LIMIT} characters plus
 * the marker, so the length tells a capped cell apart from text that merely
 * ends with the marker. The bridge shortens the prefix by one UTF-16 code unit
 * when a surrogate pair straddles the limit (so it never ships half a
 * character), hence both prefix lengths are accepted.
 */
export function isTruncatedCellText(value: string): boolean {
  if (!value.endsWith(TRUNCATED_SUFFIX)) return false
  const prefixLength = value.length - TRUNCATED_SUFFIX.length
  return prefixLength === CELL_TEXT_LIMIT || prefixLength === CELL_TEXT_LIMIT - 1
}

export function cellValueView(column: string, value: CellValue): CellValueView {
  if (value === null || value === undefined) return { column, text: 'NULL', pretty: false, truncated: null }
  if (typeof value !== 'string') return { column, text: formatCell(value), pretty: false, truncated: null }
  const text = prettyJsonText(value)
  return { column, text, pretty: text !== value, truncated: isTruncatedCellText(value) ? value : null }
}

/**
 * Swap bridge-capped cell previews for their full text before an export, so a
 * downloaded backup never carries the 16 KB preview plus the literal
 * `…<truncated>` marker. `cellText` is the same bridge lookup the full-value
 * dialog uses; identical capped values share one request. If the cached copy
 * is gone (or the lookup fails), the capped text is kept as an honest fallback
 * rather than failing the whole export.
 */
export async function expandTruncatedRows(
  columns: ColumnInfo[],
  rows: Row[],
  cellText: (column: string, text: string) => Promise<string | null>,
): Promise<Row[]> {
  const pending = new Map<string, Promise<string | null>>()
  for (const row of rows) {
    row.forEach((value, index) => {
      if (typeof value !== 'string' || !isTruncatedCellText(value) || index >= columns.length) return
      const key = `${index}\u0000${value}`
      if (!pending.has(key)) pending.set(key, cellText(columns[index].name, value))
    })
  }
  if (pending.size === 0) return rows

  const full = new Map<string, string>()
  await Promise.all(
    [...pending].map(async ([key, request]) => {
      const text = await request.catch(() => null)
      if (text !== null) full.set(key, text)
    }),
  )
  if (full.size === 0) return rows

  return rows.map((row) =>
    row.map((value, index) => {
      if (typeof value !== 'string') return value
      return full.get(`${index}\u0000${value}`) ?? value
    }),
  )
}

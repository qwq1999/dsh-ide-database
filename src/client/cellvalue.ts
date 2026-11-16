/**
 * What the "view full value" dialog shows for one grid cell.
 *
 * Grids keep every cell on one line, so a JSON document or a long text blob is
 * unreadable there. Opening a cell expands JSON containers over several lines
 * and leaves every other value exactly as the grid already formats it.
 */
import type { CellValue } from '../shared/types'
import { formatCell } from './format'
import { prettyJsonText } from './redisvalue'

/** Suffix the database bridge appends to a cell it had to cap. */
export const TRUNCATED_SUFFIX = '…<truncated>'
/** Keep in sync with MAX_TEXT in bridge/src/dshdb/SqlExecutor.java. */
export const CELL_TEXT_LIMIT = 16_384
const CAPPED_LENGTH = CELL_TEXT_LIMIT + TRUNCATED_SUFFIX.length

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
 * the marker, so the exact length tells a capped cell apart from text that
 * merely ends with the marker.
 */
export function isTruncatedCellText(value: string): boolean {
  return value.length === CAPPED_LENGTH && value.endsWith(TRUNCATED_SUFFIX)
}

export function cellValueView(column: string, value: CellValue): CellValueView {
  if (value === null || value === undefined) return { column, text: 'NULL', pretty: false, truncated: null }
  if (typeof value !== 'string') return { column, text: formatCell(value), pretty: false, truncated: null }
  const text = prettyJsonText(value)
  return { column, text, pretty: text !== value, truncated: isTruncatedCellText(value) ? value : null }
}

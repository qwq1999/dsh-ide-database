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

export interface CellValueView {
  /** Column the cell belongs to, used as the dialog title. */
  column: string
  text: string
  /** True when a JSON container was expanded into several lines. */
  pretty: boolean
}

export function cellValueView(column: string, value: CellValue): CellValueView {
  if (value === null || value === undefined) return { column, text: 'NULL', pretty: false }
  if (typeof value !== 'string') return { column, text: formatCell(value), pretty: false }
  const text = prettyJsonText(value)
  return { column, text, pretty: text !== value }
}

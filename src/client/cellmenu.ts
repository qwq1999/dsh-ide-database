/**
 * Helpers behind the result grid's cell context menu: copying one value or one
 * whole row as tab separated text, ready for a spreadsheet.
 */
import type { CellValue, ColumnInfo, Row } from '../shared/types'
import { formatCell } from './format'

export function cellCopyText(value: CellValue): string {
  return formatCell(value)
}

/** One row as a spreadsheet-friendly TSV line; NULL copies as an empty cell. */
export function rowToTsv(columns: ColumnInfo[], row: Row): string {
  return columns
    .map((_, index) => {
      const value = row[index] ?? null
      if (value === null) return ''
      return formatCell(value).replace(/\t/gu, ' ')
    })
    .join('\t')
}

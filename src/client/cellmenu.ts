/**
 * Helpers behind the result grid's cell context menu: copying one value or one
 * whole row as tab separated text, ready for a spreadsheet.
 */
import type { CellValue, ColumnInfo, Row } from '../shared/types'
import { spreadsheetSafe } from './export'
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
      // A raw tab or newline would split one copied row into several cells or
      // rows in the spreadsheet, so flatten them the same way file export does.
      return spreadsheetSafe(formatCell(value)).replace(/[\t\r\n]+/gu, ' ')
    })
    .join('\t')
}

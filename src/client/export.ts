/**
 * Turn query results into files the browser can download.
 *
 * CSV is written the way spreadsheets read it back: a UTF-8 BOM so Excel does
 * not mangle Chinese, quotes around anything with a comma, quote or newline,
 * and NULL spelled the same way the grid shows it. JSON keeps native types so
 * numbers stay numbers and NULL stays null.
 */
import type { CellValue, ColumnInfo, Row } from '../shared/types'
import { formatCell } from './format'

export type ExportFormat = 'csv' | 'json'

function csvCell(value: CellValue): string {
  const text = formatCell(value)
  if (/[",\r\n]/u.test(text)) return `"${text.replace(/"/gu, '""')}"`
  return text
}

export function toCsv(columns: ColumnInfo[], rows: Row[]): string {
  const head = columns.map((column) => csvCell(column.name)).join(',')
  const body = rows.map((row) => columns.map((_, index) => csvCell(row[index] ?? null)).join(','))
  return `${[head, ...body].join('\r\n')}\r\n`
}

export function toJson(columns: ColumnInfo[], rows: Row[]): string {
  const records = rows.map((row) => {
    const record: Record<string, CellValue> = {}
    columns.forEach((column, index) => {
      record[column.name] = row[index] ?? null
    })
    return record
  })
  return JSON.stringify(records, null, 2)
}

/** Save text as a file without any network round trip. */
export function downloadText(filename: string, mime: string, text: string): void {
  const bom = mime.startsWith('text/csv') ? '\ufeff' : ''
  const blob = new Blob([bom, text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** A filesystem-safe name stamped with the export time. */
export function exportFilename(schema: string, table: string, format: ExportFormat, now = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const base = schema === '' ? table : `${schema}.${table}`
  return `${base}-${stamp}.${format}`
}

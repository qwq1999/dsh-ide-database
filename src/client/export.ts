/**
 * Turn query results into files the browser can download.
 *
 * CSV is written the way spreadsheets read it back: a UTF-8 BOM so Excel does
 * not mangle Chinese, quotes around anything with a comma, quote or newline,
 * and NULL spelled the same way the grid shows it. JSON keeps native types so
 * numbers stay numbers and NULL stays null.
 */
import type { CellValue, ClientConnection, ColumnInfo, Row } from '../shared/types'
import { formatCell } from './format'
import { insertStatements } from './tablesql'

export type ExportFormat = 'csv' | 'json' | 'sql' | 'md'

/**
 * Spreadsheets execute text that starts with `=`, `+`, `-` or `@` even when it
 * arrived in a CSV cell. Prefix an apostrophe so a database value such as
 * `=HYPERLINK(...)` is displayed as text instead of running as a formula.
 * Plain numbers (`-42`, `+3.5`) are left alone so they stay numeric.
 */
function spreadsheetSafe(text: string): string {
  if (!/^[=+\-@]/u.test(text)) return text
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(text)) return text
  return `'${text}`
}

function csvCell(value: CellValue): string {
  const text = spreadsheetSafe(formatCell(value))
  if (/[",\r\n]/u.test(text)) return `"${text.replace(/"/gu, '""')}"`
  return text
}

export function toCsv(columns: ColumnInfo[], rows: Row[]): string {
  const head = columns.map((column) => csvCell(column.name)).join(',')
  const body = rows.map((row) => columns.map((_, index) => csvCell(row[index] ?? null)).join(','))
  return `${[head, ...body].join('\r\n')}\r\n`
}

function tsvCell(value: CellValue): string {
  // Tabs and line breaks would start a new cell in a spreadsheet, so flatten them.
  return spreadsheetSafe(formatCell(value)).replace(/[\t\r\n]+/gu, ' ')
}

/** Tab separated text for the clipboard: pasting it fills real cells in Excel. */
export function toTsv(columns: ColumnInfo[], rows: Row[]): string {
  const head = columns.map((column) => tsvCell(column.name)).join('\t')
  const body = rows.map((row) => columns.map((_, index) => tsvCell(row[index] ?? null)).join('\t'))
  return `${[head, ...body].join('\n')}\n`
}

export function jsonValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString()
  }
  if (value instanceof Date) return value.toISOString()
  return value
}

function uniqueKeys(columns: ColumnInfo[]): string[] {
  const used = new Set<string>()
  return columns.map((column) => {
    let key = column.name
    let suffix = 2
    // A real column may already be called `id_2`, so keep looking until the
    // generated name is free; otherwise JSON would silently drop one value.
    while (used.has(key)) {
      key = `${column.name}_${suffix}`
      suffix += 1
    }
    used.add(key)
    return key
  })
}

export function toJson(columns: ColumnInfo[], rows: Row[]): string {
  const keys = uniqueKeys(columns)
  const records = rows.map((row) => {
    // A null prototype keeps a column called `__proto__` as an ordinary key
    // instead of silently changing the record's prototype.
    const record: Record<string, unknown> = Object.create(null)
    keys.forEach((key, index) => {
      record[key] = jsonValue(row[index] ?? null)
    })
    return record
  })
  return JSON.stringify(records, null, 2)
}

export interface ExportInput {
  dialect: ClientConnection['dialect']
  schema: string
  table: string
  columns: ColumnInfo[]
  rows: Row[]
}

export interface ExportPayload {
  text: string
  mime: string
}

/** Render one export format, so every tab dispatches the same way. */
export function renderExport(format: ExportFormat, input: ExportInput): ExportPayload {
  switch (format) {
    case 'csv':
      return { text: toCsv(input.columns, input.rows), mime: 'text/csv' }
    case 'json':
      return { text: toJson(input.columns, input.rows), mime: 'application/json' }
    case 'sql':
      return {
        text: insertStatements(input.dialect, input.schema, input.table, input.columns, input.rows),
        mime: 'application/sql',
      }
    case 'md':
      return { text: toMarkdown(input.columns, input.rows), mime: 'text/markdown' }
  }
}

/** Save text as a file without any network round trip. */
/**
 * Markdown tables are one line per row, so cell text has to lose its newlines;
 * pipes and backslashes are escaped or the table would break apart.
 */
function markdownCell(value: CellValue): string {
  return formatCell(value)
    .replace(/\\/gu, '\\\\')
    .replace(/\|/gu, '\\|')
    .replace(/\r?\n/gu, '<br>')
}

export function toMarkdown(columns: ColumnInfo[], rows: Row[]): string {
  const head = `| ${columns.map((column) => markdownCell(column.name)).join(' | ')} |`
  const divider = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${columns.map((_, index) => markdownCell(row[index] ?? null)).join(' | ')} |`)
  return `${[head, divider, ...body].join('\n')}\n`
}

/**
 * Keep a browser download on disk instead of letting a schema or table name
 * with a slash, colon or wildcard turn into a path or an invalid Windows name.
 * The display name in menus stays untouched; only the saved file is sanitised.
 */
export function safeFilename(filename: string, fallback = 'download'): string {
  let cleaned = filename
    .replace(/[\\/:*?"<>|\u0000-\u001f]/gu, '_')
    .replace(/[. ]+$/u, '')
    .trim()
  if (cleaned === '') return fallback
  if (/^\.+/u.test(cleaned)) cleaned = `_${cleaned.replace(/^\.+/u, '')}`
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(cleaned)) cleaned = `_${cleaned}`
  return cleaned
}

export function downloadText(filename: string, mime: string, text: string): void {
  const bom = mime.startsWith('text/csv') ? '\ufeff' : ''
  const blob = new Blob([bom, text], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = safeFilename(filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** A readable file name stamped with the export time; `downloadText` sanitises it. */
export function exportFilename(schema: string, table: string, format: ExportFormat, now = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const base = schema === '' ? table : `${schema}.${table}`
  return `${base}-${stamp}.${format}`
}

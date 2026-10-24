/**
 * SQL building blocks for the table tab: identifiers, one page of rows, the
 * WHERE box and the per-column filters. They live here rather than inside the
 * tab so they can be unit tested without rendering React.
 */
import type { CellValue, ClientConnection, ColumnInfo } from '../shared/types'

/** A column filter: `like` is the text typed into the filter row, `eq` is an
 * exact value picked from a cell, `isnull` comes from clicking a NULL cell. */
export interface ColumnFilter {
  text: string
  op: 'like' | 'eq' | 'isnull'
}

export type ColumnFilters = Record<string, ColumnFilter>

export function quoteIdent(dialect: ClientConnection['dialect'], name: string): string {
  return dialect === 'mysql' ? `\`${name}\`` : `"${name}"`
}

export function qualifiedName(dialect: ClientConnection['dialect'], schema: string, table: string): string {
  const tableName = quoteIdent(dialect, table)
  return schema === '' ? tableName : `${quoteIdent(dialect, schema)}.${tableName}`
}

/** One page of rows: LIMIT/OFFSET on MySQL-family servers, OFFSET FETCH elsewhere. */
export function pageClause(dialect: ClientConnection['dialect'], limit: number, offset: number): string {
  if (dialect === 'oracle' || dialect === 'oceanbase-oracle') return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
  return `LIMIT ${limit} OFFSET ${offset}`
}

/** Strip a leading WHERE/ORDER BY keyword so the box takes just the expression. */
export function stripKeyword(text: string, keyword: string): string {
  const trimmed = text.trim().replace(/[\s;]+$/u, '')
  if (trimmed === '') return ''
  const pattern = new RegExp(`^${keyword}\\b`, 'i')
  return trimmed.replace(pattern, '').trim()
}

export function isNumericType(typeName: string): boolean {
  return /^(tiny|small|medium|big)?int|^decimal|^numeric|^float|^double|^number|^real/iu.test(typeName.replace(/[\s(].*$/u, ''))
}

export function quoteLiteral(text: string): string {
  return `'${text.replace(/'/gu, "''")}'`
}

/**
 * One row as an INSERT statement for the table tab's context menu. Numeric
 * columns keep the exact text the driver returned (decimals arrive as strings
 * to avoid float rounding), everything else is quoted; NULL stays NULL.
 */
export function insertStatement(
  dialect: ClientConnection['dialect'],
  schema: string,
  table: string,
  columns: ColumnInfo[],
  row: CellValue[],
): string {
  const names = columns.map((column) => quoteIdent(dialect, column.name)).join(', ')
  const values = columns.map((column, index) => insertLiteral(column, row[index] ?? null)).join(', ')
  return `INSERT INTO ${qualifiedName(dialect, schema, table)} (${names}) VALUES (${values});`
}

function insertLiteral(column: ColumnInfo, value: CellValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') return String(value)
  const text = String(value)
  if (isNumericType(column.typeName) && /^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(text)) return text
  return quoteLiteral(text)
}

/** Many rows as one INSERT-per-line SQL script, for the export menu. */
export function insertStatements(
  dialect: ClientConnection['dialect'],
  schema: string,
  table: string,
  columns: ColumnInfo[],
  rows: CellValue[][],
): string {
  if (rows.length === 0) return ''
  return `${rows.map((row) => insertStatement(dialect, schema, table, columns, row)).join('\n')}\n`
}

export function filterExpression(
  dialect: ClientConnection['dialect'],
  column: ColumnInfo,
  filter: ColumnFilter,
): string | undefined {
  const name = quoteIdent(dialect, column.name)
  if (filter.op === 'isnull') return `${name} IS NULL`
  const text = filter.text.trim()
  if (text === '') return undefined
  if (filter.op === 'eq') {
    if (isNumericType(column.typeName) && /^-?\d+(?:\.\d+)?$/u.test(text)) return `${name} = ${text}`
    return `${name} = ${quoteLiteral(text)}`
  }
  return `${name} LIKE ${quoteLiteral(`%${text}%`)}`
}

/** Manual WHERE (optional) AND every column filter, joined for one query. */
export function composeWhere(
  dialect: ClientConnection['dialect'],
  base: string,
  columns: ColumnInfo[],
  filters: ColumnFilters,
): string {
  const parts: string[] = []
  const manual = stripKeyword(base, 'WHERE')
  if (manual !== '') parts.push(`(${manual})`)
  for (const column of columns) {
    const filter = filters[column.name]
    if (filter === undefined) continue
    const expression = filterExpression(dialect, column, filter)
    if (expression !== undefined) parts.push(expression)
  }
  return parts.join(' AND ')
}

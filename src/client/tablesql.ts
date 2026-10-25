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

/**
 * The statement a table tab hands to the console: the table, whatever the WHERE
 * and ORDER BY boxes currently hold, and one page of rows. It is only text the
 * user can edit before running, never executed on their behalf.
 */
export function tableSelectSql(
  dialect: ClientConnection['dialect'],
  schema: string,
  table: string,
  where: string,
  orderBy: string,
  limit: number,
): string {
  const from = qualifiedName(dialect, schema, table)
  const whereSql = where.trim() === '' ? '' : ` WHERE ${where.trim()}`
  const orderSql = orderBy.trim() === '' ? '' : ` ORDER BY ${orderBy.trim()}`
  const size = Math.max(1, Math.trunc(limit) || 1)
  return `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, size, 0)}`
}

export function isNumericType(typeName: string): boolean {
  return /^(tiny|small|medium|big)?int|^decimal|^numeric|^float|^double|^number|^real/iu.test(typeName.replace(/[\s(].*$/u, ''))
}

/**
 * A quoted string literal. MySQL treats the backslash as an escape character,
 * so a Windows path or a regexp has to be doubled there or the value that comes
 * back is not the one that was exported; standard SQL dialects take the text
 * verbatim and only need the quote doubled.
 */
export function quoteLiteral(text: string, dialect: ClientConnection['dialect'] = 'generic'): string {
  const escaped = dialect === 'mysql' ? text.replace(/\\/gu, '\\\\') : text
  return `'${escaped.replace(/'/gu, "''")}'`
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
  const values = columns.map((column, index) => insertLiteral(dialect, column, row[index] ?? null)).join(', ')
  return `INSERT INTO ${qualifiedName(dialect, schema, table)} (${names}) VALUES (${values});`
}

function insertLiteral(dialect: ClientConnection['dialect'], column: ColumnInfo, value: CellValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  if (typeof value === 'number') return String(value)
  const text = String(value)
  if (isNumericType(column.typeName) && /^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(text)) return text
  return quoteLiteral(text, dialect)
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

function unquoteIdentifier(part: string): string {
  return part.trim().replace(/^[`"[]/u, '').replace(/[`"\]]$/u, '')
}

/**
 * The table a statement reads from or writes to, used by the console's SQL
 * export. Returns null for statements without a plain table (functions,
 * multi-statement scripts, SELECTs over subqueries only).
 */
export function tableFromStatement(statement: string): { schema: string; table: string } | null {
  const match =
    /\b(?:from|join|update|into)\s+((?:[`"\[]?[\w$#]+[`"\]]?\s*\.\s*)?[`"\[]?[\w$#]+[`"\]]?)/iu.exec(statement)
  if (match === null) return null
  const parts = match[1].split('.').map(unquoteIdentifier)
  if (parts.length >= 2) return { schema: parts[parts.length - 2] ?? '', table: parts[parts.length - 1] ?? '' }
  return { schema: '', table: parts[0] ?? '' }
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
    return `${name} = ${quoteLiteral(text, dialect)}`
  }
  return `${name} LIKE ${quoteLiteral(`%${text}%`, dialect)}`
}

/**
 * A `WHERE` fragment that finds the row behind one cell in the whole table.
 * Numbers and booleans keep their literal form, text is quoted (and escaped on
 * MySQL, where the backslash is an escape character).
 */
export function cellWhere(
  dialect: ClientConnection['dialect'],
  column: ColumnInfo,
  value: CellValue,
): string {
  const name = quoteIdent(dialect, column.name)
  if (value === null) return `${name} IS NULL`
  if (typeof value === 'number' || typeof value === 'bigint') return `${name} = ${String(value)}`
  if (typeof value === 'boolean') return `${name} = ${value ? 'TRUE' : 'FALSE'}`
  return `${name} = ${quoteLiteral(String(value), dialect)}`
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

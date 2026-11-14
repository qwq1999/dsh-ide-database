/**
 * SQL building blocks for the table tab: identifiers, one page of rows, the
 * WHERE box and the per-column filters. They live here rather than inside the
 * tab so they can be unit tested without rendering React.
 */
import type { CellValue, ClientConnection, ColumnInfo, Row, SqlDialect } from '../shared/types'
import { maskNonCode } from './sqllex'

/** A column filter: `like` is the text typed into the filter row, `eq` is an
 * exact value picked from a cell, `isnull` comes from clicking a NULL cell. */
export interface ColumnFilter {
  text: string
  op: 'like' | 'eq' | 'isnull'
}

export type ColumnFilters = Record<string, ColumnFilter>

export function quoteIdent(dialect: ClientConnection['dialect'], name: string): string {
  if (dialect === 'mysql') return `\`${name.replaceAll('`', '``')}\``
  if (dialect === 'mssql') return `[${name.replaceAll(']', ']]')}]`
  return `"${name.replaceAll('"', '""')}"`
}

export function qualifiedName(dialect: ClientConnection['dialect'], schema: string, table: string): string {
  const tableName = quoteIdent(dialect, table)
  return schema === '' ? tableName : `${quoteIdent(dialect, schema)}.${tableName}`
}

/** SQL Server requires ORDER BY before OFFSET/FETCH; fall back to a stable dummy order. */
export function orderByForPaging(dialect: ClientConnection['dialect'], orderBy: string): string {
  if (orderBy !== '') return ` ORDER BY ${orderBy}`
  return dialect === 'mssql' ? ' ORDER BY (SELECT NULL)' : ''
}

/** One page of rows: LIMIT/OFFSET on MySQL-family servers, OFFSET FETCH elsewhere. */
export function pageClause(dialect: ClientConnection['dialect'], limit: number, offset: number): string {
  if (dialect === 'oracle' || dialect === 'oceanbase-oracle' || dialect === 'mssql') {
    return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`
  }
  return `LIMIT ${limit} OFFSET ${offset}`
}

/** The keyword the WHERE box may start with; stripped before re-prefixing. */
const WHERE_PATTERN = /^WHERE\b/iu

/** Strip a leading WHERE keyword so the box takes just the expression. */
export function stripWhere(text: string): string {
  const trimmed = text.trim().replace(/[\s;]+$/u, '')
  if (trimmed === '') return ''
  return trimmed.replace(WHERE_PATTERN, '').trim()
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
  const orderSql = orderByForPaging(dialect, orderBy.trim())
  const size = Math.max(1, Math.trunc(limit) || 1)
  return `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, size, 0)}`
}

/** Every column name, quoted the way the dialect wants, joined for a SELECT list. */
export function columnNames(dialect: ClientConnection['dialect'], columns: ColumnInfo[]): string {
  return columns.map((column) => quoteIdent(dialect, column.name)).join(', ')
}

/**
 * A SELECT over every column the grid knows about: handy when a `SELECT *` should
 * become an explicit column list.
 */
export function selectColumnsSql(
  dialect: ClientConnection['dialect'],
  schema: string,
  table: string,
  columns: ColumnInfo[],
): string {
  const list = columns.map((column) => quoteIdent(dialect, column.name)).join(', ')
  return `SELECT ${list === '' ? '*' : list} FROM ${qualifiedName(dialect, schema, table)}`
}

export function isNumericType(typeName: string): boolean {
  const withoutParams = typeName.replace(/\([^)]*\)/gu, '').trim().toLowerCase()
  // Keep trailing `[]` visible: `decimal(10,2)[]` is an array, not a number.
  if (withoutParams.endsWith('[]')) return false
  const base = withoutParams.split(/\s+/u, 1)[0] ?? ''
  // Anchor the whole name: the old leading `int` alternative also matched
  // `interval`, and an array like `integer[]` is not a scalar number.
  return /^(?:(?:tiny|small|medium|big)?int[248]?|integer|int[248]|(?:big|small)?serial[248]?|decimal|numeric|float[48]?|double|number|real)$/u.test(
    base,
  )
}

/** Date / timestamp columns need a typed literal on Oracle-family servers. */
export function isTemporalType(typeName: string | undefined): boolean {
  if (typeName === undefined) return false
  const base = typeName.replace(/\([^)]*\)/gu, '').trim().toLowerCase()
  // Keep parameters and time-zone wording, but never treat an array as a
  // scalar timestamp: `date[]` needs a cast or an array literal, not TO_DATE.
  return /^(?:date|datetime2?|smalldatetime|timestamp(?:tz|ltz)?(?:\s+(?:with|without)(?:\s+local)?\s+time\s+zone)?)$/u.test(
    base,
  )
}

/** Character-family columns can be compared with LIKE without a cast. */
export function isTextType(typeName: string | undefined): boolean {
  if (typeName === undefined) return false
  const base = typeName.replace(/\([^)]*\)/gu, '').trim().toLowerCase()
  return /^(?:bpchar|character(?: varying)?|char(?:acter)?|varchar2?|nvarchar2?|nchar|(?:tiny|medium|long)?text|ntext|n?clob|enum|set|citext)$/u.test(
    base,
  )
}

/**
 * Oracle's `TO_CHAR` keeps a fixed number of fractional digits and a two-digit
 * hour offset, while the bridge trims trailing zeroes and prints "+8:00". Build
 * the same text as the grid so a whole displayed timestamp can be filtered.
 */
function oracleTimestampText(name: string, typeName: string): string {
  if (typeName.includes('local time zone')) {
    // TZR is uppercase in the session; INITCAP restores "Asia/Shanghai".
    return (
      `INITCAP(REGEXP_REPLACE(REGEXP_REPLACE(TO_CHAR(${name}, ` +
      `'YYYY-MM-DD HH24:MI:SS.FF TZR'), '0+ ([^ ]+)$', ' \\1'), ` +
      `'\\. ([^ ]+)$', '.0 \\1'))`
    )
  }
  if (typeName.includes('with time zone')) {
    return (
      `REGEXP_REPLACE(RTRIM(TO_CHAR(${name}, 'YYYY-MM-DD HH24:MI:SS.FF'), '0'), ` +
      `'\\.$', '.0') || ' ' || ` +
      `REGEXP_REPLACE(TO_CHAR(${name}, 'TZH:TZM'), '^([+-])0([0-9]:)', '\\1\\2')`
    )
  }
  return `RTRIM(RTRIM(TO_CHAR(${name}, 'YYYY-MM-DD HH24:MI:SS.FF'), '0'), '.')`
}

/**
 * PostgreSQL, Oracle and SQL Server reject `integer LIKE '1%'`: LIKE needs
 * character input. Cast other columns to text so the table's filter row keeps
 * working for numbers, dates, UUIDs and arrays.
 */
function textExpression(dialect: ClientConnection['dialect'], name: string, typeName: string | undefined): string {
  if (typeName !== undefined && isTemporalType(typeName)) {
    // The grid shows the bridge's ISO text, so format temporal columns the
    // same way instead of trusting the session's NLS / language settings.
    if (dialect === 'oracle' || dialect === 'oceanbase-oracle') {
      const lower = typeName.toLowerCase()
      if (lower.startsWith('timestamp')) return oracleTimestampText(name, lower)
      return `TO_CHAR(${name}, 'YYYY-MM-DD HH24:MI:SS')`
    }
    if (dialect === 'dameng') return `TO_CHAR(${name}, 'YYYY-MM-DD HH24:MI:SS')`
    if (dialect === 'mssql') return `CONVERT(VARCHAR(23), ${name}, 121)`
  }
  if (dialect === 'mysql') return `CAST(${name} AS CHAR)`
  if (dialect === 'mssql') return `CAST(${name} AS NVARCHAR(MAX))`
  if (dialect === 'oracle' || dialect === 'oceanbase-oracle' || dialect === 'dameng') {
    return `TO_CHAR(${name})`
  }
  if (dialect === 'sqlite') return `CAST(${name} AS TEXT)`
  if (dialect === 'postgres') return `CAST(${name} AS TEXT)`
  return `CAST(${name} AS VARCHAR(4000))`
}

/**
 * Oracle compares a DATE or TIMESTAMP column with a bare string by converting
 * that string with NLS_DATE_FORMAT / NLS_TIMESTAMP_FORMAT, which does not accept
 * the ISO text the grid shows, so the filter fails with ORA-01861. Wrap the
 * value in TO_DATE/TO_TIMESTAMP and spell the format out instead. The other
 * dialects parse ISO literals on their own and keep the plain quoted form.
 */
export function temporalLiteral(dialect: ClientConnection['dialect'], typeName: string, text: string): string {
  const literal = quoteLiteral(text, dialect)
  if (!isTemporalType(typeName)) return literal
  if (dialect !== 'oracle' && dialect !== 'oceanbase-oracle' && dialect !== 'dameng') return literal
  if (!/^\d{4}-\d{2}-\d{2}/u.test(text)) return literal
  const type = typeName.toLowerCase()
  const base = typeName.replace(/[\s(].*$/u, '').toLowerCase()
  const escaped = text.replace(/'/gu, "''")
  // Oracle prints a one-digit hour offset ("+8:00"), so accept both forms.
  const zone = /(?:[+-]\d{1,2}:\d{2}|Z)$/u.exec(text)
  const hasZone = zone !== null
  // Do not mistake a `+08:00` zone for a time; inspect only the local part.
  const local = hasZone ? text.slice(0, zone.index) : text
  const hasSeconds = /\d{2}:\d{2}:\d{2}/u.test(local)
  // A filter typed as `2024-11-11 09:54` must keep its minutes; a format
  // without them rejects the text with ORA-01830 instead of comparing at 00:00.
  const hasTime = /\d{2}:\d{2}/u.test(local)
  const hasFraction = hasSeconds && /\.\d+/u.test(local)
  const timeFormat = hasTime ? (hasSeconds ? ' HH24:MI:SS' : ' HH24:MI') : ''
  if (base.startsWith('timestamp')) {
    // A `TIMESTAMP WITH LOCAL TIME ZONE` is shown with its region name, which
    // `TO_TIMESTAMP` cannot parse. `TZR` accepts the displayed name and keeps
    // the instant when the value goes back into the column.
    if (type.includes('local time zone') && !hasZone && /[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/u.test(text)) {
      const format = `YYYY-MM-DD${timeFormat}${hasFraction ? '.FF' : ''} TZR`
      return `TO_TIMESTAMP_TZ('${escaped}', '${format}')`
    }
    if (hasZone) {
      const format = `YYYY-MM-DD${timeFormat}${hasFraction ? '.FF' : ''} TZH:TZM`
      return `TO_TIMESTAMP_TZ('${escaped}', '${format}')`
    }
    const format = `YYYY-MM-DD${timeFormat}${hasFraction ? '.FF' : ''}`
    return `TO_TIMESTAMP('${escaped}', '${format}')`
  }
  return `TO_DATE('${escaped}', 'YYYY-MM-DD${timeFormat}')`
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
 * Server-generated columns are left out: the database rejects a value for them.
 */
export function insertStatement(
  dialect: ClientConnection['dialect'],
  schema: string,
  table: string,
  columns: ColumnInfo[],
  row: CellValue[],
): string {
  const selected = columns
    .map((column, index) => ({ column, index }))
    .filter((entry) => entry.column.generated !== true)
  const names = selected.map((entry) => quoteIdent(dialect, entry.column.name)).join(', ')
  const values = selected
    .map((entry) => insertLiteral(dialect, entry.column, row[entry.index] ?? null))
    .join(', ')
  return `INSERT INTO ${qualifiedName(dialect, schema, table)} (${names}) VALUES (${values});`
}

/** SQL Server and Oracle have no boolean literals; their BIT/NUMBER(1) columns take 1 and 0. */
function booleanLiteral(dialect: ClientConnection['dialect'], value: boolean): string {
  // Oracle (and OceanBase's Oracle mode) has no SQL boolean literal before
  // 23c; a NUMBER(1) or BIT column is compared with 1/0 instead.
  if (dialect === 'mssql' || dialect === 'oracle' || dialect === 'oceanbase-oracle') return value ? '1' : '0'
  return value ? 'TRUE' : 'FALSE'
}

function insertLiteral(dialect: ClientConnection['dialect'], column: ColumnInfo, value: CellValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return booleanLiteral(dialect, value)
  if (typeof value === 'number') return String(value)
  const text = String(value)
  if (isTemporalType(column.typeName)) return temporalLiteral(dialect, column.typeName, text)
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

function skipSpaces(text: string, index: number): number {
  let cursor = index
  while (cursor < text.length && /\s/u.test(text[cursor] ?? '')) cursor += 1
  return cursor
}

interface IdentifierToken {
  value: string
  end: number
}

/** Read one unquoted or quoted identifier, unescaping its delimiter. */
function readTableIdentifier(text: string, index: number): IdentifierToken | null {
  const start = skipSpaces(text, index)
  const open = text[start]
  if (open === '[' || open === '"' || open === '`') {
    const close = open === '[' ? ']' : open
    let cursor = start + 1
    let value = ''
    while (cursor < text.length) {
      const char = text[cursor] ?? ''
      if (char === close) {
        if (text[cursor + 1] === close) {
          value += close
          cursor += 2
          continue
        }
        return { value, end: cursor + 1 }
      }
      value += char
      cursor += 1
    }
    return null
  }
  let cursor = start
  while (cursor < text.length && /[\w$#]/u.test(text[cursor] ?? '')) cursor += 1
  if (cursor === start) return null
  return { value: text.slice(start, cursor), end: cursor }
}

/**
 * The table a statement reads from or writes to, used by the console's SQL
 * export. Returns null for statements without a plain table (functions,
 * multi-statement scripts, SELECTs over subqueries only). Literals and
 * comments are masked first: `SELECT 'from users' FROM orders` must not send
 * the INSERT export to users. Quoted names keep spaces and dots inside their
 * delimiters (`[Order Details]`, `"my.schema"."table name"`).
 */
export function tableFromStatement(statement: string, dialect: SqlDialect = 'generic'): { schema: string; table: string } | null {
  // Mask all quoted identifiers too, so a keyword inside `[from orders]` is
  // not mistaken for the FROM clause; the offsets still line up with the
  // original statement, which is where the actual name is read.
  const code = maskNonCode(statement, dialect, true)
  const keyword = /\b(?:from|join|update|into)\b/giu
  // A subquery in the select list or in a CTE can mention a table before the
  // statement's own FROM; only top-level keywords name the table being read or
  // written. Fall back to nested keywords when the outer query selects from a
  // derived table, whose real source is one level down.
  const depthAt = new Int32Array(code.length)
  let depth = 0
  for (let index = 0; index < code.length; index += 1) {
    depthAt[index] = depth
    if (code[index] === '(') depth += 1
    else if (code[index] === ')') depth = Math.max(0, depth - 1)
  }
  const readAt = (topLevelOnly: boolean): { schema: string; table: string } | null => {
    keyword.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = keyword.exec(code)) !== null) {
      if (topLevelOnly && depthAt[match.index] !== 0) continue
      const parts: string[] = []
      let token = readTableIdentifier(statement, keyword.lastIndex)
      let end = 0
      while (token !== null) {
        parts.push(token.value)
        end = token.end
        const dot = skipSpaces(statement, token.end)
        if (statement[dot] !== '.') break
        token = readTableIdentifier(statement, dot + 1)
      }
      if (parts.length === 0) continue
      // `generate_series(1, 2)` and `[dbo].[split](@text)` are table-valued
      // functions, not tables; opening an INSERT for them would point at a
      // nonexistent relation. Keep scanning for a real FROM/JOIN table. An
      // INSERT's parenthesized column list is not a function call.
      if (
        (match[0].toLowerCase() === 'from' || match[0].toLowerCase() === 'join')
        && statement[skipSpaces(statement, end)] === '('
      ) continue
      // SQL Server accepts a three-part `database.schema.table` (and a four-part
      // server name); the console only needs the last two parts.
      return {
        schema: parts.length >= 2 ? parts[parts.length - 2] ?? '' : '',
        table: parts[parts.length - 1] ?? '',
      }
    }
    return null
  }
  return readAt(true) ?? readAt(false)
}

/** Escape LIKE metacharacters so a contains filter matches the typed text literally. */
function escapeLikeText(text: string): string {
  return text.replace(/[!%_]/gu, (char) => `!${char}`)
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
    if (isTemporalType(column.typeName)) return `${name} = ${temporalLiteral(dialect, column.typeName, text)}`
    return `${name} = ${quoteLiteral(text, dialect)}`
  }
  const target = isTextType(column.typeName) ? name : textExpression(dialect, name, column.typeName)
  const pattern = quoteLiteral(`%${escapeLikeText(text)}%`, dialect)
  // Oracle prints a region as ASIA/SHANGHAI while the bridge shows
  // Asia/Shanghai; compare case-insensitively so both spellings match.
  if (
    (dialect === 'oracle' || dialect === 'oceanbase-oracle') &&
    column.typeName !== undefined &&
    column.typeName.toLowerCase().includes('local time zone')
  ) {
    return `UPPER(${target}) LIKE UPPER(${pattern}) ESCAPE '!'`
  }
  return `${target} LIKE ${pattern} ESCAPE '!'`
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
  if (typeof value === 'boolean') return `${name} = ${booleanLiteral(dialect, value)}`
  if (typeof value === 'string' && isTemporalType(column.typeName)) {
    return `${name} = ${temporalLiteral(dialect, column.typeName, value)}`
  }
  return `${name} = ${quoteLiteral(String(value), dialect)}`
}

/** One column counted across the whole table: the quick "group by" report. */
export function groupCountSql(
  dialect: ClientConnection['dialect'],
  schema: string,
  table: string,
  column: ColumnInfo,
): string {
  const name = quoteIdent(dialect, column.name)
  const count = quoteIdent(dialect, 'count')
  return `SELECT ${name}, COUNT(*) AS ${count} FROM ${qualifiedName(dialect, schema, table)} GROUP BY ${name} ORDER BY ${count} DESC`
}

/** Manual WHERE (optional) AND every column filter, joined for one query. */
/**
 * The values of one column as a parenthesised `IN` list: `(1, 2, 'x')`.
 * Handy for turning a result grid back into a `WHERE id IN (...)` filter.
 * Pass the column so typed values (Oracle dates, numeric strings) get the
 * same literal form the INSERT export uses.
 */
export function inListOf(
  dialect: ClientConnection['dialect'],
  rows: Row[],
  index: number,
  column?: ColumnInfo,
): string {
  const literals = rows.map((row) => {
    const value: CellValue = row[index] ?? null
    if (column !== undefined) return insertLiteral(dialect, column, value)
    if (value === null || value === undefined) return 'NULL'
    if (typeof value === 'number' || typeof value === 'bigint') return String(value)
    if (typeof value === 'boolean') return booleanLiteral(dialect, value)
    return quoteLiteral(String(value), dialect)
  })
  return `(${literals.join(', ')})`
}

export function composeWhere(
  dialect: ClientConnection['dialect'],
  base: string,
  columns: ColumnInfo[],
  filters: ColumnFilters,
): string {
  const parts: string[] = []
  const manual = stripWhere(base)
  if (manual !== '') parts.push(`(${manual})`)
  for (const column of columns) {
    const filter = filters[column.name]
    if (filter === undefined) continue
    const expression = filterExpression(dialect, column, filter)
    if (expression !== undefined) parts.push(expression)
  }
  return parts.join(' AND ')
}

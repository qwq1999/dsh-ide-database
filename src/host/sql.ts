import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'

import type {
  ColumnDetail,
  ColumnInfo,
  ConnectionConfig,
  ConnectionDraft,
  ConnectionTestResult,
  DdlResult,
  ExplainResult,
  IndexInfo,
  ObjectKind,
  QueryResult,
  Row,
  SchemaInfo,
  SchemaObject,
  ServerInfo,
  SqlDialect,
  TableDescription,
} from '../shared/types.js'
import { BridgeClient } from './bridge.js'
import type { ConfigStore } from './config.js'
import { DbError, errorMessage } from './errors.js'
import type { DriverManager, ResolvedJdbcDriver } from './drivers.js'
import type { JavaLocator } from './java.js'
import type { PluginPaths } from './paths.js'
import type { SecretStore } from './secrets.js'

export interface QueryOptions {
  maxRows?: number
  timeoutSec?: number
  schema?: string
  stmtKey?: string
  allowWrite?: boolean
}

interface Connected {
  driver: ResolvedJdbcDriver
  server: ServerInfo
}

const READ_ONLY_STARTERS = new Set(['select', 'with', 'show', 'describe', 'desc', 'explain', 'values'])

/** True for identifier characters; deliberately ASCII plus anything above 127. */
function isWordChar(char: string): boolean {
  if (char === '_' || char === '$') return true
  const code = char.codePointAt(0) ?? 0
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code > 127
}

function skipSpace(text: string, index: number): number {
  let cursor = index
  while (cursor < text.length) {
    const char = text[cursor]
    if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') break
    cursor += 1
  }
  return cursor
}

function readWord(text: string, index: number): { word: string; end: number } {
  let end = index
  while (end < text.length && isWordChar(text[end] ?? '')) end += 1
  return { word: text.slice(index, end).toLowerCase(), end }
}

/** Index of the parenthesis closing the one at `open`, skipping quoted text and comments. */
function bracketIdentifierEnd(text: string, index: number): number | null {
  if (text[index] !== '[') return null
  let cursor = index + 1
  while (cursor < text.length) {
    if (text[cursor] === ']') {
      if (text[cursor + 1] === ']') {
        cursor += 2
        continue
      }
      return cursor + 1
    }
    cursor += 1
  }
  return null
}

function matchingParen(text: string, open: number): number {
  let depth = 0
  for (let index = open; index < text.length; index += 1) {
    const char = text[index]
    // SQL Server bracket identifiers may contain parentheses and semicolons.
    if (char === '[') {
      const end = bracketIdentifierEnd(text, index)
      if (end !== null) {
        index = end - 1
        continue
      }
    }
    // Literals may contain parentheses that do not affect nesting.
    if (char === '$') {
      const end = dollarQuotedLiteralEnd(text, index)
      if (end !== null) {
        index = end - 1
        continue
      }
    }
    // Oracle alternative quoting hides its inner quote from the generic scanner.
    if (char === 'q' || char === 'Q') {
      const end = oracleQuotedLiteralEnd(text, index)
      if (end !== null) {
        index = end - 1
        continue
      }
    }
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      index += 1
      while (index < text.length) {
        if (text[index] === quote) {
          if (text[index + 1] === quote) {
            index += 2
            continue
          }
          break
        }
        index += 1
      }
      continue
    }
    if (char === '-' && text[index + 1] === '-') {
      const newline = text.indexOf('\n', index)
      if (newline < 0) return -1
      index = newline
      continue
    }
    if (char === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2)
      if (end < 0) return -1
      index = end + 1
      continue
    }
    if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

interface WithClause {
  /** The parenthesised body of every CTE, in source order. */
  bodies: string[]
  /** The statement the CTE list runs. */
  statement: string
}

/**
 * Parse a `WITH cte AS (...), ...` clause. Returns null when the list cannot
 * be parsed, which the read-only guard treats as a write.
 */
function parseWithClause(text: string): WithClause | null {
  let cursor = skipSpace(text, 'with'.length)
  const recursive = readWord(text, cursor)
  if (recursive.word === 'recursive') cursor = skipSpace(text, recursive.end)
  const bodies: string[] = []
  for (;;) {
    const name = readWord(text, cursor)
    if (name.word === '') return null
    cursor = skipSpace(text, name.end)
    if (text[cursor] === '(') {
      const close = matchingParen(text, cursor)
      if (close < 0) return null
      cursor = skipSpace(text, close + 1)
    }
    const as = readWord(text, cursor)
    if (as.word !== 'as') return null
    cursor = skipSpace(text, as.end)
    for (;;) {
      const modifier = readWord(text, cursor)
      if (modifier.word !== 'not' && modifier.word !== 'materialized') break
      cursor = skipSpace(text, modifier.end)
    }
    if (text[cursor] !== '(') return null
    const close = matchingParen(text, cursor)
    if (close < 0) return null
    bodies.push(text.slice(cursor + 1, close))
    cursor = skipSpace(text, close + 1)
    if (text[cursor] !== ',') break
    cursor = skipSpace(text, cursor + 1)
  }
  return { bodies, statement: text.slice(cursor) }
}

/** Statements that write files on the server; a read-only connection must refuse them. */
const FILE_WRITE = /\binto\s+(?:outfile|dumpfile)\b/

/** Lowercase copy of `text` with quoted strings and comments blanked out. */
/**
 * The end (exclusive) of the Oracle alternative-quoted literal starting at
 * `index`, or null when this is not one. The shape is `[n]q'<open>text<close>'`;
 * bracket pairs have their own closing character, and anything else closes with
 * the same character it opened with. A missing terminator is left to the normal
 * scanner so malformed input still reaches the server.
 */
function oracleQuotedLiteralEnd(input: string, index: number): number | null {
  const previous = input[index - 1]
  if (previous === 'n' || previous === 'N') {
    const before = input[index - 2]
    if (before !== undefined && /[A-Za-z0-9_$]/u.test(before)) return null
  } else if (previous !== undefined && /[A-Za-z0-9_$]/u.test(previous)) {
    return null
  }
  if (input[index + 1] !== "'") return null
  const open = input[index + 2]
  if (open === undefined) return null
  const close = open === '[' ? ']' : open === '{' ? '}' : open === '<' ? '>' : open === '(' ? ')' : open
  const end = input.indexOf(`${close}'`, index + 3)
  return end === -1 ? null : end + 2
}

/**
 * The end (exclusive) of the PostgreSQL dollar-quoted string starting at
 * `index`, or null when this is not one. `$$text$$` and `$tag$text$tag$` are
 * both allowed; a tag may not start with a digit because `$1` is a parameter.
 */
function dollarQuotedLiteralEnd(input: string, index: number): number | null {
  if (input[index] !== '$') return null
  if (index > 0 && /[A-Za-z0-9_$]/u.test(input[index - 1] ?? '')) return null
  let cursor = index + 1
  while (cursor < input.length && /[A-Za-z0-9_]/u.test(input[cursor] ?? '')) cursor += 1
  if (input[cursor] !== '$') return null
  if (cursor > index + 1 && /[0-9]/u.test(input[index + 1] ?? '')) return null
  const delimiter = input.slice(index, cursor + 1)
  const close = input.indexOf(delimiter, cursor + 1)
  return close === -1 ? null : close + delimiter.length
}

function withoutLiterals(text: string): string {
  let out = ''
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? ''
    // PostgreSQL dollar quoting hides semicolons inside a plain SELECT.
    if (char === '$') {
      const end = dollarQuotedLiteralEnd(text, index)
      if (end !== null) {
        index = end - 1
        out += ' '
        continue
      }
    }
    // SQL Server bracket identifiers may contain semicolons and look like
    // writes (`[a into b]`); blank them like other quoted identifiers.
    if (char === '[') {
      const end = bracketIdentifierEnd(text, index)
      if (end !== null) {
        index = end - 1
        out += ' '
        continue
      }
    }
    // Oracle alternative quoting can contain the quote character and semicolons;
    // skip the whole literal before the generic `'...'` scanner sees its inner quote.
    if (char === 'q' || char === 'Q') {
      const end = oracleQuotedLiteralEnd(text, index)
      if (end !== null) {
        index = end - 1
        out += ' '
        continue
      }
    }
    if (char === "'" || char === '"' || char === '`') {
      const quote = char
      index += 1
      while (index < text.length) {
        if (text[index] === quote) {
          if (text[index + 1] === quote) {
            index += 2
            continue
          }
          break
        }
        index += 1
      }
      out += ' '
      continue
    }
    if (char === '-' && text[index + 1] === '-') {
      const newline = text.indexOf('\n', index)
      if (newline < 0) return out
      index = newline
      out += ' '
      continue
    }
    if (char === '/' && text[index + 1] === '*') {
      // MySQL executes `/*! ... */` bodies; do not let the guard treat them as
      // inert comments. Keeping the body visible makes the INTO checks below
      // reject `SELECT ... /*!50000 INTO OUTFILE ... */` while still allowing
      // harmless hints such as `/*!50000 SQL_NO_CACHE */`.
      if (text[index + 2] === '!') {
        out += '/*!'
        index += 2
        continue
      }
      const end = text.indexOf('*/', index + 2)
      if (end < 0) return out
      index = end + 1
      out += ' '
      continue
    }
    out += char.toLowerCase()
  }
  return out
}

/**
 * True when a top-level `INTO` creates a table rather than reading into a session
 * variable or writing a server-side file. PostgreSQL spells it
 * `SELECT ... INTO [TEMP] [TABLE] name`; SQL Server uses `SELECT ... INTO #tmp`.
 */
function selectsIntoTable(text: string): boolean {
  const plain = withoutLiterals(text)
  let depth = 0
  for (let index = 0; index < plain.length; index += 1) {
    const char = plain[index] ?? ''
    if (char === '(') {
      depth += 1
      continue
    }
    if (char === ')') {
      depth = Math.max(0, depth - 1)
      continue
    }
    if (depth !== 0 || !plain.startsWith('into', index)) continue
    if (isWordChar(plain[index - 1] ?? '') || isWordChar(plain[index + 4] ?? '')) continue
    const target = skipSpace(plain, index + 4)
    // `INTO @total` fills a session variable; only reads the source table.
    if ((plain[target] ?? '') === '@') continue
    const word = readWord(plain, target).word
    // File writes are rejected separately by FILE_WRITE.
    if (word === 'outfile' || word === 'dumpfile') continue
    return true
  }
  return false
}

/** Strip leading comments; null means the text ends inside an unterminated comment. */
function stripLeadingComments(text: string): string | null {
  let rest = text.trim()
  for (;;) {
    if (rest.startsWith('--')) {
      const newline = rest.indexOf('\n')
      if (newline < 0) return null
      rest = rest.slice(newline + 1).trim()
      continue
    }
    if (rest.startsWith('/*!')) {
      // Executable comments are MySQL code, not a leading comment. Leaving them
      // in place makes a read-only guard reject a statement that starts inside
      // one instead of skipping the write the server would run.
      return rest
    }
    if (rest.startsWith('/*')) {
      const end = rest.indexOf('*/', 2)
      if (end < 0) return null
      rest = rest.slice(end + 2).trim()
      continue
    }
    return rest
  }
}

/** Conservative guard used before the panel runs a statement on a read-only connection. */
export function isReadOnlySql(sql: string): boolean {
  const text = stripLeadingComments(sql)
  if (text === null) return false
  const withoutTrailing = text.replace(/;+\s*$/, '')
  // A semicolon inside a string, quoted identifier or comment is data, not a
  // second statement; only one left in the code part makes the script unsafe.
  if (withoutLiterals(withoutTrailing).includes(';')) return false
  const first = /^[A-Za-z]+/.exec(withoutTrailing)
  if (first === null) return false
  const head = first[0].toLowerCase()
  if (!READ_ONLY_STARTERS.has(head)) return false
  if (head === 'with') {
    // A CTE list can front any statement, including DELETE; judge what it runs.
    const clause = parseWithClause(withoutTrailing)
    if (clause === null) return false
    // PostgreSQL also allows data-modifying CTE bodies
    // (`WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d`); judge them too.
    return clause.bodies.every((body) => isReadOnlySql(body)) && isReadOnlySql(clause.statement)
  }
  if (head === 'explain') {
    // `EXPLAIN ANALYZE <statement>` and the parenthesised `EXPLAIN (ANALYZE, ...)`
    // form run <statement>; plain EXPLAIN only plans. Comments between the
    // keywords are whitespace, so `EXPLAIN /*x*/ ANALYZE DELETE` still runs.
    let rest = stripLeadingComments(withoutTrailing.slice(first[0].length))
    if (rest === null || rest === '') return false
    if (rest.startsWith('(')) {
      const close = matchingParen(rest, 0)
      if (close < 0) return false
      if (!/\banalyze\b/.test(withoutLiterals(rest.slice(1, close)))) return true
      const statement = stripLeadingComments(rest.slice(close + 1))
      return statement !== null && statement !== '' && isReadOnlySql(statement)
    }
    const analyze = readWord(rest, 0)
    if (analyze.word !== 'analyze') return true
    rest = stripLeadingComments(rest.slice(analyze.end)) ?? ''
    if (rest === '') return false
    const format = readWord(rest, 0)
    if (format.word === 'format') {
      const equals = rest.indexOf('=')
      if (equals < 0) return false
      const value = readWord(rest, skipSpace(rest, equals + 1))
      if (value.word === '') return false
      rest = stripLeadingComments(rest.slice(value.end)) ?? ''
    }
    return rest !== '' && isReadOnlySql(rest)
  }
  // `SELECT ... INTO <table>` creates a table on PostgreSQL and SQL Server.
  if (head === 'select' && selectsIntoTable(withoutTrailing)) return false
  // `SELECT ... INTO OUTFILE '/path'` looks plain but writes a file on the server.
  if (FILE_WRITE.test(withoutLiterals(withoutTrailing))) return false
  return true
}

/** SQLite silently creates the file when it is missing; say so instead of pretending it existed. */
export function fileDatabaseNote(dialect: SqlDialect, database: string, exists: boolean): string | null {
  if (dialect !== 'sqlite' || database.trim() === '' || exists) return null
  return '文件不存在，连接时会新建一个空数据库'
}

function parseNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Quote one identifier the way the dialect wants (backticks, square brackets, ANSI quotes). */
function quoteIdent(dialect: SqlDialect, name: string): string {
  if (dialect === 'mysql') return `\`${name.replace(/`/g, '``')}\``
  if (dialect === 'mssql') return `[${name.replace(/]/g, ']]')}]`
  return `"${name.replace(/"/g, '""')}"`
}

function quoteLiteral(value: string, dialect: SqlDialect = 'generic'): string {
  // MySQL treats backslash as an escape character inside string literals, so a
  // Windows path or a regexp must be doubled there. Leaving it alone can even
  // swallow the closing quote when the comment ends with a backslash.
  const escaped = dialect === 'mysql' ? value.replace(/\\/g, '\\\\') : value
  return `'${escaped.replace(/'/g, "''")}'`
}

function qualifies(schema: string, table: string): string {
  return schema !== '' ? `${schema}.${table}` : table
}

function objectKindName(kind: ObjectKind): string {
  switch (kind) {
    case 'table':
      return '表'
    case 'view':
      return '视图'
    case 'procedure':
      return '存储过程'
    case 'function':
      return '函数'
    case 'sequence':
      return '序列'
    case 'trigger':
      return '触发器'
    default:
      return '数据库对象'
  }
}

/**
 * Server DDL is displayed verbatim in a <pre> and is also returned by the
 * agent tools. Oracle's DBMS_METADATA pretty-prints the statement as
 * "\n  CREATE …": a blank first line plus a two-space indent, and it also
 * ends with a newline. Drop the blank edges and the indent of the first line
 * (a DDL statement never starts with meaningful horizontal whitespace) while
 * keeping the indentation inside the statement.
 */
function trimDdlText(text: string): string {
  return text
    .replace(/^(?:[ \t]*\r?\n)+/, '')
    .replace(/^[ \t]+/, '')
    .replace(/\s+$/, '')
}

/**
 * Best-effort CREATE TABLE for dialects whose metadata cannot return DDL.
 * Only columns, the primary key and unique indexes are reconstructed; the
 * answer is marked generated so callers can tell it apart from the real thing.
 */
function generateDdl(dialect: SqlDialect, description: TableDescription): string {
  const name = qualifies(quoteIdent(dialect, description.schema), quoteIdent(dialect, description.table))
  const commentSupported = dialect === 'mysql'
  const lines: string[] = []
  for (const column of description.columns) {
    const parts = [quoteIdent(dialect, column.name), column.typeName.trim() === '' ? 'VARCHAR(255)' : column.typeName]
    if (column.nullable === false) parts.push('NOT NULL')
    const fallback = column.defaultValue?.trim() ?? ''
    if (fallback !== '') parts.push(`DEFAULT ${fallback}`)
    if (commentSupported && column.comment !== undefined && column.comment !== '') parts.push(`COMMENT ${quoteLiteral(column.comment, dialect)}`)
    lines.push(`  ${parts.join(' ')}`)
  }
  const primary = description.indexes.find((index) => index.primary)
  if (primary !== undefined && primary.columns.length > 0) {
    lines.push(`  PRIMARY KEY (${primary.columns.map((column) => quoteIdent(dialect, column)).join(', ')})`)
  }
  let ddl = `CREATE TABLE ${name} (\n${lines.join(',\n')}\n)`
  for (const index of description.indexes) {
    if (index.primary || !index.unique || index.columns.length === 0) continue
    ddl += `;\nCREATE UNIQUE INDEX ${quoteIdent(dialect, index.name)} ON ${name} (${index.columns
      .map((column) => quoteIdent(dialect, column))
      .join(', ')})`
  }
  return ddl
}

export class SqlService {
  private bridge: BridgeClient | undefined
  private bridgeJavaPath = ''
  private bridgeStarting: Promise<BridgeClient> | undefined
  private readonly connected = new Map<string, Connected>()

  constructor(
    private readonly paths: PluginPaths,
    private readonly config: ConfigStore,
    private readonly secrets: SecretStore,
    private readonly drivers: DriverManager,
    private readonly java: JavaLocator,
    private readonly log: (message: string) => void = () => {},
  ) {}

  isConnected(connId: string): boolean {
    return this.connected.has(connId)
  }

  connectedIds(): string[] {
    return [...this.connected.keys()]
  }

  serverOf(connId: string): ServerInfo | undefined {
    return this.connected.get(connId)?.server
  }

  private requireConnection(connId: string): ConnectionConfig {
    const connection = this.config.connection(connId)
    if (connection === undefined) throw new DbError('not-found', `连接不存在：${connId}`)
    if (connection.dialect === 'redis') throw new DbError('unsupported', '该连接不是 JDBC 连接')
    return connection
  }

  private async ensureBridge(): Promise<BridgeClient> {
    const settings = this.config.settings()
    const status = this.java.locate(settings.javaPath)
    if (!status.available || status.path === undefined) {
      throw new DbError('java-missing', status.message ?? '未找到 Java 运行时（需要 8 及以上）')
    }
    if (!this.java.bridgeReady(this.paths.bridgeJar)) {
      throw new DbError('bridge', 'Java 数据库桥未构建', `缺少 ${this.paths.bridgeJar}，请在插件目录运行 npm run build:bridge。`)
    }
    if (this.bridge !== undefined && this.bridgeJavaPath !== status.path) {
      this.bridge.dispose()
      this.bridge = undefined
    }
    if (this.bridge !== undefined) {
      await this.bridge.start()
      return this.bridge
    }
    if (this.bridgeStarting !== undefined) return this.bridgeStarting
    this.bridgeJavaPath = status.path
    const bridge = new BridgeClient({ javaPath: status.path, bridgeJar: this.paths.bridgeJar, log: this.log })
    this.bridge = bridge
    this.bridgeStarting = bridge
      .start()
      .then(() => bridge)
      .catch((error: unknown) => {
        this.bridge = undefined
        throw error instanceof DbError ? error : new DbError('bridge', `无法启动 Java 数据库桥：${errorMessage(error)}`)
      })
      .finally(() => {
        this.bridgeStarting = undefined
      })
    return this.bridgeStarting
  }

  private async passwordFor(connection: ConnectionConfig, draftPassword?: string): Promise<string> {
    if (typeof draftPassword === 'string' && draftPassword !== '') return draftPassword
    if (connection.secretName === undefined) return ''
    return this.secrets.resolve(connection.secretName)?.value ?? ''
  }

  private validateDatabase(connection: ConnectionConfig, template: string): void {
    const database = connection.database.trim()
    if (/[?#\s]/.test(database)) throw new DbError('invalid', '数据库/服务名不能包含空白或 ? # 字符')
    if (template.includes('{{database}}') && database === '') {
      if (connection.driver === 'oracle') throw new DbError('invalid', 'Oracle 连接必须填写服务名（Service Name）')
    }
  }

  private buildUrl(connection: ConnectionConfig, driver: ResolvedJdbcDriver): string {
    this.validateDatabase(connection, driver.urlTemplate)
    return driver.urlTemplate
      .replaceAll('{{host}}', connection.host)
      .replaceAll('{{port}}', String(connection.port))
      .replaceAll('{{database}}', connection.database.trim())
      .replaceAll('{{user}}', connection.user)
  }

  private propertiesFor(connection: ConnectionConfig, driver: ResolvedJdbcDriver): Record<string, string> {
    const settings = this.config.settings()
    const props: Record<string, string> = { ...connection.params }
    const timeoutMs = String(settings.connectTimeoutSec * 1000)
    switch (driver.dialect) {
      case 'mysql':
        props.connectTimeout ??= timeoutMs
        props.allowPublicKeyRetrieval ??= 'true'
        props.characterEncoding ??= 'UTF-8'
        break
      case 'oracle':
      case 'oceanbase-oracle':
        props['oracle.net.CONNECT_TIMEOUT'] ??= timeoutMs
        break
      case 'dameng':
        props.connectTimeout ??= timeoutMs
        break
      case 'postgres':
        // PostgreSQL measures connectTimeout in seconds, matching our setting.
        props.connectTimeout ??= String(settings.connectTimeoutSec)
        props.ApplicationName ??= 'dsh-ide-database'
        break
      default:
        break
    }
    return props
  }

  async test(draft: ConnectionDraft): Promise<ConnectionTestResult> {
    const started = Date.now()
    const syntheticId = typeof draft.id === 'string' && draft.id !== '' ? draft.id : `probe-${randomBytes(3).toString('hex')}`
    const existing = this.config.connection(syntheticId)
    let driver: ResolvedJdbcDriver | undefined
    try {
      driver = this.drivers.resolveDriver(draft.driver, draft.customDriverId)
      this.drivers.assertJarsPresent(driver)
      const javaStatus = this.java.locate(this.config.settings().javaPath)
      if (!javaStatus.available) throw new DbError('java-missing', javaStatus.message ?? '未找到 Java')
      const connection: ConnectionConfig = {
        id: syntheticId,
        name: draft.name,
        driver: draft.driver,
        ...(draft.customDriverId === undefined ? {} : { customDriverId: draft.customDriverId }),
        dialect: driver.dialect,
        host: draft.host,
        port: draft.port,
        user: draft.user,
        ...(existing?.secretName === undefined ? {} : { secretName: existing.secretName }),
        hasPassword: false,
        database: draft.database,
        redisDb: draft.redisDb,
        params: draft.params,
        readOnly: draft.readOnly,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      const password = await this.passwordFor(connection, draft.password)
      const bridge = await this.ensureBridge()
      const settings = this.config.settings()
      const server = await bridge.request<ServerInfo>(
        'connect',
        {
          connId: syntheticId,
          url: this.buildUrl(connection, driver),
          driverClass: driver.driverClass,
          dialect: driver.dialect,
          user: connection.user,
          password,
          jars: driver.jars.map((jar) => jar.file),
          readOnly: true,
          properties: this.propertiesFor(connection, driver),
        },
        (settings.connectTimeoutSec + 15) * 1000,
      )
      await bridge.request('disconnect', { connId: syntheticId }, 15_000).catch(() => undefined)
      const note = fileDatabaseNote(driver.dialect, connection.database, existsSync(connection.database))
      return { ok: true, server, latencyMs: Date.now() - started, ...(note === null ? {} : { note }) }
    } catch (error) {
      if (this.bridge !== undefined && driver !== undefined) {
        await this.bridge.request('disconnect', { connId: syntheticId }, 10_000).catch(() => undefined)
      }
      return { ok: false, latencyMs: Date.now() - started, message: errorMessage(error) }
    }
  }

  async connect(connId: string): Promise<ServerInfo> {
    const connection = this.requireConnection(connId)
    const driver = this.drivers.resolveDriver(connection.driver, connection.customDriverId)
    this.drivers.assertJarsPresent(driver)
    const bridge = await this.ensureBridge()
    const settings = this.config.settings()
    const password = await this.passwordFor(connection)
    try {
      const server = await bridge.request<ServerInfo>(
        'connect',
        {
          connId,
          url: this.buildUrl(connection, driver),
          driverClass: driver.driverClass,
          dialect: driver.dialect,
          user: connection.user,
          password,
          jars: driver.jars.map((jar) => jar.file),
          readOnly: connection.readOnly,
          properties: this.propertiesFor(connection, driver),
        },
        (settings.connectTimeoutSec + 15) * 1000,
      )
      this.connected.set(connId, { driver, server })
      this.config.touchConnection(connId)
      return server
    } catch (error) {
      if (error instanceof DbError && error.code === 'bridge') this.connected.clear()
      throw error instanceof DbError ? error : new DbError('connect-failed', `连接失败：${errorMessage(error)}`)
    }
  }

  async disconnect(connId: string): Promise<void> {
    this.connected.delete(connId)
    if (this.bridge === undefined) return
    await this.bridge.request('disconnect', { connId }, 15_000).catch(() => undefined)
  }

  private requireConnected(connId: string): Connected {
    const state = this.connected.get(connId)
    if (state === undefined) throw new DbError('not-connected', '连接尚未打开', '请先连接数据库。')
    return state
  }

  async schemas(connId: string, filter = ''): Promise<SchemaInfo[]> {
    this.requireConnected(connId)
    const bridge = await this.ensureBridge()
    const reply = await bridge.request<{ schemas?: SchemaInfo[] }>('schemas', { connId, filter }, 60_000)
    const list = Array.isArray(reply.schemas) ? reply.schemas : []
    return list.sort((a, b) => Number(Boolean(a.system)) - Number(Boolean(b.system)) || a.name.localeCompare(b.name))
  }

  async objects(connId: string, schema: string): Promise<SchemaObject[]> {
    this.requireConnected(connId)
    const bridge = await this.ensureBridge()
    const reply = await bridge.request<{ objects?: SchemaObject[] }>('objects', { connId, schema }, 60_000)
    const list = Array.isArray(reply.objects) ? reply.objects : []
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }

  async setSchema(connId: string, schema: string): Promise<void> {
    this.requireConnected(connId)
    const bridge = await this.ensureBridge()
    await bridge.request('setSchema', { connId, schema }, 30_000)
  }

  async describe(connId: string, schema: string, table: string, kind: ObjectKind = 'table'): Promise<TableDescription> {
    this.requireConnected(connId)
    // Columns/indexes only exist for relations; routines, sequences and triggers
    // are listed in the tree but have no table structure to read.
    if (kind !== 'table' && kind !== 'view') {
      return { schema, table, kind, columns: [], indexes: [] }
    }
    const bridge = await this.ensureBridge()
    const reply = await bridge.request<{ columns?: ColumnDetail[]; indexes?: IndexInfo[] }>(
      'columns',
      { connId, schema, table },
      60_000,
    )
    return {
      schema,
      table,
      kind,
      columns: Array.isArray(reply.columns) ? reply.columns : [],
      indexes: Array.isArray(reply.indexes) ? reply.indexes : [],
    }
  }

  /**
   * DDL of a database object. Tables and views fall back to a reconstruction
   * from the described structure when the server cannot provide one; routines,
   * sequences and triggers must come from the server (there is nothing to
   * reconstruct from).
   */
  async ddl(connId: string, dialect: SqlDialect, schema: string, table: string, kind: ObjectKind = 'table'): Promise<DdlResult> {
    this.requireConnected(connId)
    const supported: ObjectKind[] = ['table', 'view', 'procedure', 'function', 'sequence', 'trigger']
    if (!supported.includes(kind)) {
      throw new DbError('unsupported', `不支持查看${objectKindName(kind)}的 DDL`)
    }
    const qualified = qualifies(quoteIdent(dialect, schema), quoteIdent(dialect, table))
    const warnings: string[] = []
    try {
      if (dialect === 'mysql') {
        const statement =
          kind === 'view'
            ? `SHOW CREATE VIEW ${qualified}`
            : kind === 'procedure'
              ? `SHOW CREATE PROCEDURE ${qualified}`
              : kind === 'function'
                ? `SHOW CREATE FUNCTION ${qualified}`
                : kind === 'trigger'
                  ? `SHOW CREATE TRIGGER ${qualified}`
                  : kind === 'sequence'
                    ? `SHOW CREATE SEQUENCE ${qualified}`
                    : `SHOW CREATE TABLE ${qualified}`
        const result = await this.query(connId, statement, { maxRows: 1 })
        const row = result.rows[0]
        // SHOW CREATE … returns the statement among metadata columns; its
        // position differs per object type (and MariaDB version), so take the
        // longest string cell instead of a fixed index.
        const cells = Array.isArray(row) ? row.filter((cell): cell is string => typeof cell === 'string') : []
        const ddl = trimDdlText(cells.reduce((longest, cell) => (cell.length > longest.length ? cell : longest), ''))
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('服务器没有返回 DDL 文本')
      } else if (dialect === 'sqlite' && (kind === 'table' || kind === 'view' || kind === 'trigger')) {
        const statement = `SELECT sql FROM sqlite_master WHERE type = ${quoteLiteral(kind)} AND name = ${quoteLiteral(table)}`
        const ddl = await this.firstCell(connId, statement)
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('sqlite_master 没有返回定义')
      } else if (dialect === 'mssql' && (kind === 'view' || kind === 'procedure' || kind === 'function' || kind === 'trigger')) {
        const statement = `SELECT OBJECT_DEFINITION(OBJECT_ID(${quoteLiteral(qualified)})) AS ddl`
        const ddl = await this.firstCell(connId, statement)
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('OBJECT_DEFINITION 没有返回内容（可能没有查看定义的权限）')
      } else if (dialect === 'postgres' && kind === 'sequence') {
        const statement =
          "SELECT 'CREATE SEQUENCE ' || quote_ident(schemaname) || '.' || quote_ident(sequencename)"
          + " || ' START WITH ' || start_value || ' INCREMENT BY ' || increment_by"
          + ` FROM pg_sequences WHERE schemaname = ${quoteLiteral(schema)} AND sequencename = ${quoteLiteral(table)}`
        const ddl = await this.firstCell(connId, statement)
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('pg_sequences 没有返回内容')
      } else if (dialect === 'mssql' && kind === 'sequence') {
        const statement =
          "SELECT 'CREATE SEQUENCE [' + SCHEMA_NAME(schema_id) + '].[' + name + '] START WITH '"
          + " + CAST(start_value AS varchar(40)) + ' INCREMENT BY ' + CAST(increment AS varchar(40))"
          + ` FROM sys.sequences WHERE SCHEMA_NAME(schema_id) = ${quoteLiteral(schema)} AND name = ${quoteLiteral(table)}`
        const ddl = await this.firstCell(connId, statement)
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('sys.sequences 没有返回内容')
      } else if (dialect === 'postgres' && kind === 'trigger') {
        const statement = `SELECT pg_get_triggerdef(t.oid) AS ddl FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE t.tgname = ${quoteLiteral(table)} AND n.nspname = ${quoteLiteral(schema)} LIMIT 1`
        const ddl = await this.firstCell(connId, statement)
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('pg_get_triggerdef 没有返回内容')
      } else if (dialect === 'postgres' && kind === 'view') {
        const statement = `SELECT pg_get_viewdef(to_regclass(${quoteLiteral(qualified)}) , true) AS ddl`
        const ddl = await this.firstCell(connId, statement)
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('pg_get_viewdef 没有返回内容')
      } else if (dialect === 'oracle' || dialect === 'oceanbase-oracle' || dialect === 'dameng') {
        const objectType = kind.toUpperCase()
        const statement = `SELECT DBMS_METADATA.GET_DDL(${quoteLiteral(objectType)}, ${quoteLiteral(table)}, ${quoteLiteral(schema)}) AS DDL FROM DUAL`
        const ddl = await this.firstCell(connId, statement)
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('DBMS_METADATA.GET_DDL 没有返回内容')
      }
    } catch (error) {
      warnings.push(`服务器取不到 DDL：${errorMessage(error)}`)
    }
    if (kind !== 'table' && kind !== 'view') {
      throw new DbError(
        'unsupported',
        `服务器没有返回${objectKindName(kind)}的定义`,
        warnings.length > 0 ? warnings.join('；') : '可在 SQL 控制台查看定义。',
      )
    }
    const description = await this.describe(connId, schema, table, kind)
    if (dialect === 'postgres' && kind === 'table') {
      warnings.push('PostgreSQL 没有内置的建表语句查询，这张表是按结构重建的')
    }
    if (dialect === 'mssql' && kind === 'table') {
      warnings.push('SQL Server 没有内置的取建表语句的方法，这张表是按结构重建的')
    }
    return { schema, table, kind, ddl: generateDdl(dialect, description), source: 'generated', warnings }
  }

  /**
   * Runs a one-row query and returns the first cell when it is a string.
   * Server DDL is shown verbatim, so blank lines around it are dropped here.
   */
  private async firstCell(connId: string, statement: string): Promise<string> {
    const result = await this.query(connId, statement, { maxRows: 1 })
    const cell = result.rows[0]?.[0]
    return typeof cell === 'string' ? trimDdlText(cell) : ''
  }

  /** Fetch the execution plan (EXPLAIN) of a statement without running it. */
  async explain(connId: string, statement: string, options: QueryOptions = {}): Promise<ExplainResult> {
    const connection = this.requireConnection(connId)
    if (connection.dialect === 'redis') {
      throw new DbError('unsupported', 'Redis 连接没有执行计划')
    }
    this.requireConnected(connId)
    const sql = statement.trim()
    if (sql === '') throw new DbError('invalid', 'SQL 不能为空')
    const queryOptions: QueryOptions = { maxRows: 500, ...options }
    const statements: string[] = []
    if (connection.dialect === 'mssql') {
      // SHOWPLAN_ALL compiles the statement instead of running it, so the plan
      // comes back as a normal result set; turn it off again even on failure.
      const statements: string[] = ['SET SHOWPLAN_ALL ON']
      const warnings: string[] = []
      await this.query(connId, 'SET SHOWPLAN_ALL ON', { ...queryOptions, allowWrite: true })
      try {
        statements.push(sql)
        const plan = await this.query(connId, sql, queryOptions)
        return { dialect: connection.dialect, statements, plan, warnings }
      } finally {
        statements.push('SET SHOWPLAN_ALL OFF')
        try {
          await this.query(connId, 'SET SHOWPLAN_ALL OFF', { ...queryOptions, allowWrite: true })
        } catch (error) {
          warnings.push(`恢复执行计划开关失败：${errorMessage(error)}`)
        }
      }
    }
    if (connection.dialect === 'oracle' || connection.dialect === 'oceanbase-oracle') {
      const explain = `EXPLAIN PLAN FOR ${sql}`
      statements.push(explain)
      await this.query(connId, explain, queryOptions)
      try {
        const display = "SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, 'BASIC'))"
        statements.push(display)
        const plan = await this.query(connId, display, queryOptions)
        return { dialect: connection.dialect, statements, plan, warnings: [] }
      } catch (displayError) {
        return {
          dialect: connection.dialect,
          statements,
          warnings: [`DBMS_XPLAN 不可用：${errorMessage(displayError)}`],
        }
      }
    }
    if (connection.dialect === 'dameng') {
      const explain = `EXPLAIN ${sql}`
      statements.push(explain)
      // DM's EXPLAIN returns an empty ResultSet through Statement; the vendor
      // API DmdbConnection.getExplainInfo(text) is the supported way to read it.
      const bridge = await this.ensureBridge()
      const plan = await bridge.request<QueryResult>('explain', { connId, sql }, 60_000)
      return { dialect: connection.dialect, statements, plan, warnings: [] }
    }
    if (connection.dialect === 'sqlite') {
      const explain = `EXPLAIN QUERY PLAN ${sql}`
      statements.push(explain)
      const plan = await this.query(connId, explain, queryOptions)
      return { dialect: connection.dialect, statements, plan, warnings: [] }
    }
    const explain = `EXPLAIN ${sql}`
    statements.push(explain)
    const plan = await this.query(connId, explain, queryOptions)
    return { dialect: connection.dialect, statements, plan, warnings: [] }
  }

  /**
   * Explicit transaction control. Switches the JDBC connection out of
   * auto-commit instead of posting SQL text, because Oracle has no `BEGIN`
   * statement (only a PL/SQL block opener).
   */
  async transaction(connId: string, action: 'start' | 'commit' | 'rollback'): Promise<void> {
    this.requireConnected(connId)
    const bridge = await this.ensureBridge()
    await bridge.request('tx', { connId, action }, 30_000)
  }

  async query(connId: string, sql: string, options: QueryOptions = {}): Promise<QueryResult> {
    this.requireConnected(connId)
    const statement = sql.trim()
    if (statement === '') throw new DbError('invalid', 'SQL 不能为空')
    if (options.allowWrite !== true && !isReadOnlySql(statement)) {
      throw new DbError('read-only', '该操作只允许只读语句（SELECT/SHOW/DESCRIBE/EXPLAIN 等）', '请打开连接或先在面板中确认执行。')
    }
    const bridge = await this.ensureBridge()
    const settings = this.config.settings()
    const maxRows = Math.min(Math.max(Math.trunc(options.maxRows ?? settings.maxRows) || settings.maxRows, 1), 5_000)
    const timeoutSec = Math.min(Math.max(Math.trunc(options.timeoutSec ?? settings.queryTimeoutSec) || settings.queryTimeoutSec, 1), 600)
    const stmtKey = options.stmtKey !== undefined && options.stmtKey !== '' ? options.stmtKey.slice(0, 64) : `stmt-${randomBytes(6).toString('hex')}`
    try {
      const reply = await bridge.request<{
        columns?: ColumnInfo[]
        rows?: Row[]
        rowCount?: number
        truncated?: boolean
        updateCount?: number
        elapsedMs?: number
        warnings?: string[]
        sql?: string
      }>(
        'query',
        { connId, sql: statement, maxRows, timeoutSec, stmtKey, schema: options.schema ?? '' },
        (timeoutSec + 10) * 1000,
      )
      return {
        columns: Array.isArray(reply.columns) ? reply.columns : [],
        rows: Array.isArray(reply.rows) ? reply.rows : [],
        rowCount: parseNumber(reply.rowCount, 0),
        truncated: reply.truncated === true,
        ...(typeof reply.updateCount === 'number' ? { updateCount: reply.updateCount } : {}),
        elapsedMs: parseNumber(reply.elapsedMs, 0),
        warnings: Array.isArray(reply.warnings) ? reply.warnings.filter((warning): warning is string => typeof warning === 'string') : [],
        sql: typeof reply.sql === 'string' ? reply.sql : statement,
        stmtKey,
      }
    } catch (error) {
      if (error instanceof DbError && error.code === 'timeout') {
        await this.cancel(stmtKey).catch(() => undefined)
      }
      if (error instanceof DbError && error.code === 'bridge') this.connected.clear()
      throw error
    }
  }

  async cancel(stmtKey: string): Promise<boolean> {
    if (this.bridge === undefined) return false
    const reply = await this.bridge.request<{ cancelled?: boolean }>('cancel', { stmtKey }, 15_000)
    return reply.cancelled === true
  }

  async ping(): Promise<{ bridge: number; java: string; vm: string; threads: number }> {
    const bridge = await this.ensureBridge()
    return bridge.request('ping', {}, 15_000)
  }

  async dispose(): Promise<void> {
    this.connected.clear()
    if (this.bridge === undefined) return
    const bridge = this.bridge
    this.bridge = undefined
    bridge.dispose()
  }
}

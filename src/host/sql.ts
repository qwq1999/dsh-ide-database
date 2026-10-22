import { randomBytes } from 'node:crypto'

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

/** Conservative guard used before the panel runs a statement on a read-only connection. */
export function isReadOnlySql(sql: string): boolean {
  let text = sql.trim()
  // Strip leading comments so `/* hint */ select 1` still counts as a read.
  for (;;) {
    if (text.startsWith('--')) {
      const newline = text.indexOf('\n')
      if (newline < 0) return false
      text = text.slice(newline + 1).trim()
      continue
    }
    if (text.startsWith('/*')) {
      const end = text.indexOf('*/', 2)
      if (end < 0) return false
      text = text.slice(end + 2).trim()
      continue
    }
    break
  }
  const withoutTrailing = text.replace(/;+\s*$/, '')
  if (withoutTrailing.includes(';')) return false
  const first = /^[A-Za-z]+/.exec(withoutTrailing)
  return first !== null && READ_ONLY_STARTERS.has(first[0].toLowerCase())
}

function parseNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Quote one identifier for the dialect (MySQL style backticks, otherwise ANSI quotes). */
function quoteIdent(dialect: SqlDialect, name: string): string {
  return dialect === 'mysql'
    ? `\`${name.replace(/`/g, '``')}\``
    : `"${name.replace(/"/g, '""')}"`
}

function quoteLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function qualifies(schema: string, table: string): string {
  return schema !== '' ? `${schema}.${table}` : table
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
    if (commentSupported && column.comment !== undefined && column.comment !== '') parts.push(`COMMENT ${quoteLiteral(column.comment)}`)
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
      return { ok: true, server, latencyMs: Date.now() - started }
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
   * DDL of a table or view: asks the server for its own definition and falls
   * back to a reconstruction from the described structure when the dialect or
   * account cannot provide one.
   */
  async ddl(connId: string, dialect: SqlDialect, schema: string, table: string, kind: ObjectKind = 'table'): Promise<DdlResult> {
    this.requireConnected(connId)
    if (kind !== 'table' && kind !== 'view') {
      throw new DbError('unsupported', '只有表或视图可以查看 DDL', '例程、序列、触发器的定义请到数据库对象上查看。')
    }
    const qualified = qualifies(quoteIdent(dialect, schema), quoteIdent(dialect, table))
    const warnings: string[] = []
    try {
      if (dialect === 'mysql') {
        const result = await this.query(connId, `SHOW CREATE ${kind === 'view' ? 'VIEW' : 'TABLE'} ${qualified}`, { maxRows: 1 })
        const ddl = typeof result.rows[0]?.[1] === 'string' ? result.rows[0][1] : ''
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('服务器没有返回 DDL 文本')
      } else if (dialect === 'oracle' || dialect === 'oceanbase-oracle' || dialect === 'dameng') {
        const objectType = kind === 'view' ? 'VIEW' : 'TABLE'
        const statement = `SELECT DBMS_METADATA.GET_DDL(${quoteLiteral(objectType)}, ${quoteLiteral(table)}, ${quoteLiteral(schema)}) AS DDL FROM DUAL`
        const result = await this.query(connId, statement, { maxRows: 1 })
        const ddl = typeof result.rows[0]?.[0] === 'string' ? result.rows[0][0] : ''
        if (ddl.trim() !== '') return { schema, table, kind, ddl, source: 'server', warnings }
        warnings.push('DBMS_METADATA.GET_DDL 没有返回内容')
      }
    } catch (error) {
      warnings.push(`服务器取不到 DDL：${errorMessage(error)}`)
    }
    const description = await this.describe(connId, schema, table, kind)
    return { schema, table, kind, ddl: generateDdl(dialect, description), source: 'generated', warnings }
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
    const explain = `EXPLAIN ${sql}`
    statements.push(explain)
    const plan = await this.query(connId, explain, queryOptions)
    return { dialect: connection.dialect, statements, plan, warnings: [] }
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

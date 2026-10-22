import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'

import { isReadOnlySql } from './sql.js'
import type { SqlService } from './sql.js'
import type { RedisManager } from './redis.js'
import type { ConfigStore } from './config.js'
import type { DriverManager } from './drivers.js'
import { DbError, errorMessage } from './errors.js'
import type { PluginPaths } from './paths.js'
import type { ConnectionConfig, ObjectKind, PresetId, SqlDialect } from '../shared/types.js'

export interface ToolDeps {
  config: ConfigStore
  drivers: DriverManager
  sql: SqlService
  redis: RedisManager
  paths: PluginPaths
}

function fail(error: unknown): never {
  const message = error instanceof DbError && error.detail !== undefined ? `${error.message}（${error.detail}）` : errorMessage(error)
  throw new Error(message)
}

function text(args: Record<string, unknown>, name: string, required = true): string {
  const value = args[name]
  if (value === undefined || value === null) {
    if (required) throw new DbError('invalid', `缺少参数 ${name}`)
    return ''
  }
  if (typeof value !== 'string') throw new DbError('invalid', `参数 ${name} 必须是字符串`)
  return value
}

function integer(args: Record<string, unknown>, name: string, fallback: number, min: number, max: number): number {
  const value = args[name]
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new DbError('invalid', `参数 ${name} 必须是数字`)
  return Math.min(Math.max(Math.trunc(value), min), max)
}

function objectArg(args: Record<string, unknown>, name: string): Record<string, unknown> | undefined {
  const value = args[name]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'object' || Array.isArray(value)) throw new DbError('invalid', `参数 ${name} 必须是对象`)
  return value as Record<string, unknown>
}

function resolveConnection(config: ConfigStore, reference: string): ConnectionConfig {
  const direct = config.connection(reference)
  if (direct !== undefined) return direct
  const all = config.get().connections
  const byName =
    all.find((connection) => connection.name === reference) ??
    all.find((connection) => connection.name.toLowerCase() === reference.toLowerCase())
  if (byName === undefined) {
    throw new DbError(
      'not-found',
      `连接不存在：${reference}`,
      all.length === 0 ? '请先在右侧 Database 面板新建连接' : `可用连接：${all.map((connection) => connection.name).join('、')}`,
    )
  }
  return byName
}

async function ensureSql(deps: ToolDeps, connection: ConnectionConfig): Promise<SqlService> {
  if (!deps.sql.isConnected(connection.id)) await deps.sql.connect(connection.id)
  return deps.sql
}

function oracleFamily(dialect: SqlDialect): boolean {
  return dialect === 'oracle' || dialect === 'oceanbase-oracle'
}

/** Property schema accepted by the local tool authoring shape (JSON Schema-ish). */
type PropertySchema = Record<string, unknown>

interface ToolAuthorDefinition {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, PropertySchema>
    required?: readonly string[]
  }
  readOnly?: boolean
  timeoutMs?: number
  execute: (args: Record<string, unknown>, ctx: { signal?: AbortSignal }) => Promise<unknown> | unknown
}

/** Translate one JSON-Schema-ish property into a dsh-tools value schema spec. */
function valueSpec(property: PropertySchema): Record<string, unknown> {
  const spec: Record<string, unknown> = {}
  if (property.description !== undefined) spec.description = property.description
  if (property.enum !== undefined) spec.enum = property.enum
  const type = property.type
  if (type === 'object' || type === undefined) {
    spec.type = 'json'
    return spec
  }
  spec.type = type
  if (type === 'array' && property.items !== undefined) {
    spec.items = valueSpec(property.items as PropertySchema)
  }
  return spec
}

/** Translate the authoring parameters into dsh-tools' implicit parameter map. */
function parameterSpec(parameters: ToolAuthorDefinition['parameters']): Record<string, unknown> {
  const required = new Set(parameters.required ?? [])
  const spec: Record<string, unknown> = {}
  for (const [name, property] of Object.entries(parameters.properties)) {
    const value = valueSpec(property)
    if (required.has(name)) value.required = true
    spec[name] = value
  }
  return spec
}

/**
 * Author tools in a compact JSON-Schema shape and adapt them to `defineTool`.
 * dsh-tools requires an implicit parameter map plus a canonical output schema
 * and a pure renderer; this wrapper supplies the JSON output and text renderer.
 */
function tool(definition: ToolAuthorDefinition): ToolDefinition {
  const { readOnly: _readOnly, ...rest } = definition
  return defineTool({
    name: rest.name,
    description: rest.description,
    parameters: parameterSpec(rest.parameters),
    output: {
      schema: { type: 'json' },
      render: (_args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    ...(rest.timeoutMs === undefined ? {} : { timeoutMs: rest.timeoutMs }),
    execute: async (args, exec) => rest.execute(args as Record<string, unknown>, exec),
  })
}

export function createDatabaseTools(deps: ToolDeps): ToolDefinition[] {
  return [
    tool({
      name: 'db_list_connections',
      description:
        'List configured database connections (MySQL, Oracle, Dameng, OceanBase, Redis) with their id, dialect, read-only flag and driver availability. Agent tools accept either the id or the name as the "connection" argument. Call this first when the user asks about a database.',
      parameters: {
        type: 'object',
        properties: {
          includeDrivers: { type: 'boolean', description: 'Include JDBC driver jar status (default true).' },
        },
        required: [],
      },
      readOnly: true,
      execute: (args) => {
        try {
          const snapshot = deps.config.snapshot()
          const includeDrivers = args.includeDrivers !== false
          return {
            connections: snapshot.connections,
            settings: snapshot.settings,
            ...(includeDrivers ? { drivers: deps.drivers.statuses() } : {}),
          }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_test_connection',
      description:
        'Test a saved connection (by id or name) or a draft connection object. Returns server version and latency on success, or a diagnostic message on failure.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Saved connection id or name.' },
          draft: {
            type: 'object',
            additionalProperties: true,
            description: 'Draft connection: {driver, host, port, user, password?, database, redisDb, params, readOnly, customDriverId?}.',
          },
        },
        required: [],
      },
      readOnly: true,
      execute: async (args) => {
        try {
          const draft = objectArg(args, 'draft')
          const reference = text(args, 'connection', false)
          if (draft !== undefined) {
            return await deps.sql.test(draft as never)
          }
          if (reference === '') throw new DbError('invalid', '必须提供 connection 或 draft')
          const connection = resolveConnection(deps.config, reference)
          if (connection.dialect === 'redis') {
            const server = await deps.redis.connect(connection.id)
            return { ok: true, server, latencyMs: 0, note: 'Redis 连接已建立' }
          }
          return await deps.sql.test({
            id: connection.id,
            name: connection.name,
            driver: connection.driver,
            ...(connection.customDriverId === undefined ? {} : { customDriverId: connection.customDriverId }),
            host: connection.host,
            port: connection.port,
            user: connection.user,
            database: connection.database,
            redisDb: connection.redisDb,
            params: connection.params,
            readOnly: connection.readOnly,
          })
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_list_databases',
      description:
        'List schemas/databases visible on a SQL connection. For MySQL/OceanBase-MySQL this lists databases, for Oracle/Dameng/OceanBase-Oracle it lists schemas. Use db_list_objects next to explore one schema.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Connection id or name.' },
          filter: { type: 'string', description: 'Case-insensitive substring filter on the schema name.' },
        },
        required: ['connection'],
      },
      readOnly: true,
      execute: async (args) => {
        try {
          const connection = resolveConnection(deps.config, text(args, 'connection'))
          if (connection.dialect === 'redis') throw new DbError('unsupported', 'Redis 连接没有 schema，请使用 db_redis_scan')
          const sql = await ensureSql(deps, connection)
          const schemas = await sql.schemas(connection.id, text(args, 'filter', false))
          return { connection: { id: connection.id, name: connection.name, dialect: connection.dialect }, schemas }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_list_objects',
      description: 'List objects (tables, views, procedures, functions, sequences, triggers) in a schema of a SQL connection. Requires a schema name from db_list_databases.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Connection id or name.' },
          schema: { type: 'string', description: 'Schema or database name.' },
          kinds: {
            type: 'string',
            enum: ['all', 'table', 'view', 'procedure', 'function', 'sequence', 'trigger', 'other'],
            description: 'Restrict the object kind (default all). Routines are procedure/function.',
          },
        },
        required: ['connection', 'schema'],
      },
      readOnly: true,
      execute: async (args) => {
        try {
          const connection = resolveConnection(deps.config, text(args, 'connection'))
          if (connection.dialect === 'redis') throw new DbError('unsupported', 'Redis 连接不支持对象浏览')
          const schema = text(args, 'schema')
          const kinds = text(args, 'kinds', false) || 'all'
          const sql = await ensureSql(deps, connection)
          const objects = await sql.objects(connection.id, schema)
          const filtered = kinds === 'all' ? objects : objects.filter((object) => object.kind === kinds)
          return { connection: { id: connection.id, name: connection.name }, schema, count: filtered.length, objects: filtered }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_describe_table',
      description: 'Describe a table or view: columns (type, nullability, default, comment, primary key) and indexes. Use db_list_objects to find names first.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Connection id or name.' },
          schema: { type: 'string', description: 'Schema or database name.' },
          table: { type: 'string', description: 'Table or view name.' },
          kind: { type: 'string', enum: ['table', 'view', 'other'], description: 'Object kind (default table).' },
        },
        required: ['connection', 'schema', 'table'],
      },
      readOnly: true,
      execute: async (args) => {
        try {
          const connection = resolveConnection(deps.config, text(args, 'connection'))
          if (connection.dialect === 'redis') throw new DbError('unsupported', 'Redis 连接不支持表结构')
          const schema = text(args, 'schema')
          const table = text(args, 'table')
          const kind = (text(args, 'kind', false) || 'table') as ObjectKind
          const sql = await ensureSql(deps, connection)
          const description = await sql.describe(connection.id, schema, table, kind)
          return { connection: { id: connection.id, name: connection.name }, ...description }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_query',
      description:
        'Run a SQL statement on a saved SQL connection and return rows (columns + values, capped by the row limit). Only read-only statements are allowed unless "allowAgentWrites" is enabled in the Database settings and the connection is not read-only. One statement per call; write statements affect the real database.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Connection id or name.' },
          sql: { type: 'string', description: 'SQL statement to execute.' },
          schema: { type: 'string', description: 'Optional current schema for unqualified names.' },
          maxRows: { type: 'number', description: 'Row cap override (1-5000).' },
          timeoutSec: { type: 'number', description: 'Statement timeout override (1-600).' },
        },
        required: ['connection', 'sql'],
      },
      readOnly: false,
      timeoutMs: 660_000,
      execute: async (args) => {
        try {
          const connection = resolveConnection(deps.config, text(args, 'connection'))
          if (connection.dialect === 'redis') throw new DbError('unsupported', 'Redis 连接请使用 db_redis_command')
          const statement = text(args, 'sql')
          const settings = deps.config.settings()
          const allowWrite = settings.allowAgentWrites && !connection.readOnly
          if (!allowWrite && !isReadOnlySql(statement)) {
            throw new DbError(
              'read-only',
              '当前配置不允许代理执行写语句',
              '可在右侧 Database 设置中开启 allowAgentWrites，或使用只读语句；只读连接永远拒绝写操作',
            )
          }
          const sql = await ensureSql(deps, connection)
          const schema = text(args, 'schema', false)
          const options = {
            maxRows: integer(args, 'maxRows', settings.maxRows, 1, 5_000),
            timeoutSec: integer(args, 'timeoutSec', settings.queryTimeoutSec, 1, 600),
            allowWrite,
            ...(schema === '' ? {} : { schema }),
          }
          const result = await sql.query(connection.id, statement, options)
          return {
            connection: { id: connection.id, name: connection.name },
            sql: result.sql,
            columns: result.columns,
            rows: result.rows,
            rowCount: result.rowCount,
            truncated: result.truncated,
            ...(result.updateCount === undefined ? {} : { updateCount: result.updateCount }),
            elapsedMs: result.elapsedMs,
            warnings: result.warnings,
            ...(result.stmtKey === undefined ? {} : { stmtKey: result.stmtKey }),
          }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_explain',
      description:
        'Explain a SQL statement and return the plan rows. MySQL/OceanBase-MySQL use EXPLAIN; Oracle/OceanBase-Oracle run EXPLAIN PLAN FOR then read DBMS_XPLAN; Dameng uses EXPLAIN. Read-only.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Connection id or name.' },
          sql: { type: 'string', description: 'SQL statement to explain.' },
          schema: { type: 'string', description: 'Optional current schema.' },
        },
        required: ['connection', 'sql'],
      },
      readOnly: true,
      timeoutMs: 120_000,
      execute: async (args) => {
        try {
          const connection = resolveConnection(deps.config, text(args, 'connection'))
          if (connection.dialect === 'redis') throw new DbError('unsupported', 'Redis 连接没有执行计划')
          const statement = text(args, 'sql')
          const schema = text(args, 'schema', false)
          const sql = await ensureSql(deps, connection)
          const queryOptions = { maxRows: 500, ...(schema === '' ? {} : { schema }) }
          const statements: string[] = []
          if (oracleFamily(connection.dialect)) {
            const explain = `EXPLAIN PLAN FOR ${statement}`
            statements.push(explain)
            await sql.query(connection.id, explain, queryOptions)
            try {
              const display = 'SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, \'BASIC\'))'
              statements.push(display)
              const plan = await sql.query(connection.id, display, queryOptions)
              return { dialect: connection.dialect, statements, plan }
            } catch (displayError) {
              return {
                dialect: connection.dialect,
                statements,
                warnings: [`DBMS_XPLAN 不可用：${errorMessage(displayError)}`],
              }
            }
          }
          const explain = connection.dialect === 'dameng' ? `EXPLAIN ${statement}` : `EXPLAIN ${statement}`
          statements.push(explain)
          const plan = await sql.query(connection.id, explain, queryOptions)
          return { dialect: connection.dialect, statements, plan }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_redis_scan',
      description: 'Scan keys of a Redis connection (cursor-based SCAN). Returns the next cursor, key names, types and TTL. Read-only.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Redis connection id or name.' },
          cursor: { type: 'string', description: 'SCAN cursor (default "0").' },
          pattern: { type: 'string', description: 'MATCH pattern (default "*").' },
          type: { type: 'string', description: 'Optional TYPE filter (string, hash, list, set, zset, stream).' },
          count: { type: 'number', description: 'SCAN COUNT hint (default from settings).' },
        },
        required: ['connection'],
      },
      readOnly: true,
      execute: async (args) => {
        try {
          const connection = resolveConnection(deps.config, text(args, 'connection'))
          if (connection.dialect !== 'redis') throw new DbError('unsupported', '该连接不是 Redis 连接')
          const settings = deps.config.settings()
          await deps.redis.connect(connection.id)
          const result = await deps.redis.scan(
            connection.id,
            text(args, 'cursor', false) || '0',
            text(args, 'pattern', false) || '*',
            text(args, 'type', false) || undefined,
            integer(args, 'count', settings.redisScanCount, 1, 10_000),
          )
          return { connection: { id: connection.id, name: connection.name }, ...result }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_redis_get',
      description: 'Inspect one Redis key: type, TTL, size and value preview (strings, lists, sets, hashes, sorted sets, streams). Read-only.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Redis connection id or name.' },
          key: { type: 'string', description: 'Key to inspect.' },
        },
        required: ['connection', 'key'],
      },
      readOnly: true,
      execute: async (args) => {
        try {
          const connection = resolveConnection(deps.config, text(args, 'connection'))
          if (connection.dialect !== 'redis') throw new DbError('unsupported', '该连接不是 Redis 连接')
          await deps.redis.connect(connection.id)
          return { connection: { id: connection.id, name: connection.name }, ...(await deps.redis.inspect(connection.id, text(args, 'key'))) }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_redis_command',
      description:
        'Run a raw Redis command (e.g. "GET foo", "HGETALL h"). Read-only commands are always allowed; write/destructive commands require "allowAgentWrites" in settings and a non-read-only connection. FLUSHDB, FLUSHALL and SHUTDOWN are always rejected.',
      parameters: {
        type: 'object',
        properties: {
          connection: { type: 'string', description: 'Redis connection id or name.' },
          command: { type: 'string', description: 'Full command line, split like a shell.' },
        },
        required: ['connection', 'command'],
      },
      readOnly: false,
      execute: async (args) => {
        try {
          const connection = resolveConnection(deps.config, text(args, 'connection'))
          if (connection.dialect !== 'redis') throw new DbError('unsupported', '该连接不是 Redis 连接')
          const settings = deps.config.settings()
          await deps.redis.connect(connection.id)
          const allowWrite = settings.allowAgentWrites && !connection.readOnly
          const result = await deps.redis.command(connection.id, text(args, 'command'), allowWrite)
          return { connection: { id: connection.id, name: connection.name }, ...result }
        } catch (error) {
          return fail(error)
        }
      },
    }),

    tool({
      name: 'db_download_driver',
      description:
        'Download the JDBC driver jars for a preset (mysql, oracle, dameng, oceanbase-mysql, oceanbase-oracle) or a custom driver into the plugin data directory. Needed before a JDBC connection can be opened.',
      parameters: {
        type: 'object',
        properties: {
          driverId: { type: 'string', description: 'Preset id or custom driver id.' },
        },
        required: ['driverId'],
      },
      readOnly: false,
      timeoutMs: 300_000,
      execute: async (args) => {
        try {
          const driverId = text(args, 'driverId')
          const status = deps.drivers.statuses().find((entry) => entry.id === driverId)
          if (status === undefined) throw new DbError('not-found', `驱动不存在：${driverId}`)
          if (!status.needsJava) return status
          const resolved =
            status.preset !== null ? deps.drivers.resolvePreset(status.preset as PresetId) : deps.drivers.resolveCustom(status.id)
          const jars = await deps.drivers.ensureJars(resolved)
          return { driverId, jars, dataDir: deps.paths.dataDir }
        } catch (error) {
          return fail(error)
        }
      },
    }),
  ]
}

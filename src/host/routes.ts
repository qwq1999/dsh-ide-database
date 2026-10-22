import type { IncomingMessage, ServerResponse } from 'node:http'

import { PLUGIN_NAME, ROUTE_PREFIX } from '../shared/presets.js'
import type {
  ApiResult,
  ClientConnection,
  ConnectionDraft,
  DriverStatus,
  EnvStatus,
  JavaStatus,
  QueryResult,
  RedisCommandResult,
  RedisScanResult,
  RedisValue,
  SchemaInfo,
  SchemaObject,
  ServerInfo,
  TableDescription,
} from '../shared/types.js'
import type { ConfigStore } from './config.js'
import type { DriverManager } from './drivers.js'
import { DbError, toWireError } from './errors.js'
import type { JavaLocator } from './java.js'
import type { PluginPaths } from './paths.js'
import type { RedisManager } from './redis.js'
import type { SecretStore } from './secrets.js'
import { optionalService, type HostContext } from './services.js'
import type { SqlService } from './sql.js'

const BODY_LIMIT = 4 * 1024 * 1024

export interface RouteDeps {
  ctx: HostContext
  paths: PluginPaths
  config: ConfigStore
  secrets: SecretStore
  drivers: DriverManager
  java: JavaLocator
  sql: SqlService
  redis: RedisManager
  log: (message: string) => void
}

interface ConnectionService {
  requestRejection(request: { readonly headers: IncomingMessage['headers'] }): 401 | 403 | undefined
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  response.statusCode = status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.end(payload)
}

function fail(response: ServerResponse, error: unknown): void {
  const { status, body } = toWireError(error)
  sendJson(response, status, { ok: false, error: body })
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
    size += buffer.length
    if (size > BODY_LIMIT) throw new DbError('invalid', '请求体过大')
    chunks.push(buffer)
  }
  if (chunks.length === 0) return {}
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return {}
  try {
    const parsed = JSON.parse(text) as unknown
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('not an object')
    return parsed as Record<string, unknown>
  } catch {
    throw new DbError('invalid', '请求体必须是 JSON 对象')
  }
}

/**
 * DSH owns the admission policy for loopback Web requests. When the
 * `connection` service is present it is authoritative; otherwise the plugin
 * applies the same browser-origin sanity check locally (and trusts the
 * desktop host's loopback binding).
 */
function rejectionOf(deps: RouteDeps, request: IncomingMessage): number | undefined {
  const connection = optionalService<ConnectionService>(deps.ctx, 'connection')
  if (connection?.requestRejection !== undefined) {
    try {
      const rejection = connection.requestRejection(request)
      if (rejection !== undefined) return rejection
      return undefined
    } catch {
      // fall through to the local check
    }
  }
  const headers = request.headers
  const origin = headers.origin
  const host = headers.host
  if (typeof origin === 'string' && typeof host === 'string') {
    try {
      if (new URL(origin).host !== host) return 403
    } catch {
      return 403
    }
  }
  const site = headers['sec-fetch-site']
  if (typeof site === 'string' && site !== 'same-origin' && site !== 'none') return 403
  return undefined
}

function sqlConnection(deps: RouteDeps, id: string) {
  const connection = deps.config.connection(id)
  if (connection === undefined) throw new DbError('not-found', `连接不存在：${id}`)
  return connection
}

function envStatus(deps: RouteDeps): EnvStatus {
  const settings = deps.config.settings()
  const java: JavaStatus = deps.java.locate(settings.javaPath)
  return {
    java,
    dataDir: deps.paths.dataDir,
    configPath: deps.paths.configFile,
    bridgeJar: deps.paths.bridgeJar,
    bridgeBuilt: deps.java.bridgeReady(deps.paths.bridgeJar),
    pluginVersion: deps.paths.version,
    platform: `${process.platform}-${process.arch}`,
  }
}

async function handle(deps: RouteDeps, request: IncomingMessage, response: ServerResponse, path: string): Promise<void> {
  const data = await readJson(request)

  switch (path) {
    case '/status': {
      const snapshot: ApiResult<unknown> = {
        ok: true,
        data: {
          config: deps.config.snapshot(),
          drivers: deps.drivers.statuses(),
          env: envStatus(deps),
        },
      }
      sendJson(response, 200, snapshot)
      return
    }
    case '/env': {
      sendJson(response, 200, { ok: true, data: envStatus(deps) })
      return
    }
    case '/connections/save': {
      const saved = deps.config.saveConnection(data)
      const client = deps.config.snapshot().connections.find((entry) => entry.id === saved.id) as ClientConnection
      sendJson(response, 200, { ok: true, data: { connection: client, config: deps.config.snapshot() } })
      return
    }
    case '/connections/delete': {
      const id = typeof data.id === 'string' ? data.id : ''
      await deps.sql.disconnect(id)
      await deps.redis.disconnect(id)
      deps.config.deleteConnection(id)
      sendJson(response, 200, { ok: true, data: { config: deps.config.snapshot() } })
      return
    }
    case '/connections/test': {
      const draft = data.draft
      if (typeof draft !== 'object' || draft === null) throw new DbError('invalid', '缺少连接草稿')
      const result = await deps.sql.test(draft as ConnectionDraft)
      sendJson(response, 200, { ok: true, data: result })
      return
    }
    case '/connections/connect': {
      const id = typeof data.id === 'string' ? data.id : ''
      const connection = sqlConnection(deps, id)
      const server: ServerInfo =
        connection.dialect === 'redis' ? await deps.redis.connect(id) : await deps.sql.connect(id)
      sendJson(response, 200, { ok: true, data: server })
      return
    }
    case '/connections/disconnect': {
      const id = typeof data.id === 'string' ? data.id : ''
      await deps.sql.disconnect(id)
      await deps.redis.disconnect(id)
      sendJson(response, 200, { ok: true, data: { disconnected: id } })
      return
    }
    case '/schema/list': {
      const id = typeof data.id === 'string' ? data.id : ''
      const filter = typeof data.filter === 'string' ? data.filter : ''
      const schemas: SchemaInfo[] = await deps.sql.schemas(id, filter)
      sendJson(response, 200, { ok: true, data: { schemas } })
      return
    }
    case '/schema/objects': {
      const id = typeof data.id === 'string' ? data.id : ''
      const schema = typeof data.schema === 'string' ? data.schema : ''
      if (schema === '') throw new DbError('invalid', '必须选择 Schema')
      const objects: SchemaObject[] = await deps.sql.objects(id, schema)
      sendJson(response, 200, { ok: true, data: { objects } })
      return
    }
    case '/schema/describe': {
      const id = typeof data.id === 'string' ? data.id : ''
      const schema = typeof data.schema === 'string' ? data.schema : ''
      const table = typeof data.table === 'string' ? data.table : ''
      if (schema === '' || table === '') throw new DbError('invalid', '必须提供 schema 与表名')
      const kind = data.kind === 'view' || data.kind === 'other' ? data.kind : 'table'
      const description: TableDescription = await deps.sql.describe(id, schema, table, kind)
      sendJson(response, 200, { ok: true, data: description })
      return
    }
    case '/query': {
      const id = typeof data.id === 'string' ? data.id : ''
      const sql = typeof data.sql === 'string' ? data.sql : ''
      const connection = sqlConnection(deps, id)
      const allowWrite = data.allowWrite === true && !connection.readOnly
      const result: QueryResult = await deps.sql.query(id, sql, {
        ...(typeof data.maxRows === 'number' ? { maxRows: data.maxRows } : {}),
        ...(typeof data.timeoutSec === 'number' ? { timeoutSec: data.timeoutSec } : {}),
        ...(typeof data.schema === 'string' ? { schema: data.schema } : {}),
        ...(typeof data.stmtKey === 'string' ? { stmtKey: data.stmtKey } : {}),
        allowWrite,
      })
      sendJson(response, 200, { ok: true, data: result })
      return
    }
    case '/query/cancel': {
      const stmtKey = typeof data.stmtKey === 'string' ? data.stmtKey : ''
      const cancelled = await deps.sql.cancel(stmtKey)
      sendJson(response, 200, { ok: true, data: { cancelled } })
      return
    }
    case '/redis/scan': {
      const id = typeof data.id === 'string' ? data.id : ''
      const connection = sqlConnection(deps, id)
      if (connection.dialect !== 'redis') throw new DbError('unsupported', '该连接不是 Redis 连接')
      const result: RedisScanResult = await deps.redis.scan(
        id,
        typeof data.cursor === 'string' ? data.cursor : '0',
        typeof data.pattern === 'string' ? data.pattern : '*',
        typeof data.type === 'string' ? data.type : undefined,
        typeof data.count === 'number' ? data.count : deps.config.settings().redisScanCount,
      )
      sendJson(response, 200, { ok: true, data: result })
      return
    }
    case '/redis/key': {
      const id = typeof data.id === 'string' ? data.id : ''
      const key = typeof data.key === 'string' ? data.key : ''
      if (key === '') throw new DbError('invalid', '必须提供 key')
      const result: RedisValue = await deps.redis.inspect(id, key)
      sendJson(response, 200, { ok: true, data: result })
      return
    }
    case '/redis/command': {
      const id = typeof data.id === 'string' ? data.id : ''
      const command = typeof data.command === 'string' ? data.command : ''
      const connection = sqlConnection(deps, id)
      const allowWrite = data.allowWrite === true && !connection.readOnly
      const result: RedisCommandResult = await deps.redis.command(id, command, allowWrite)
      sendJson(response, 200, { ok: true, data: result })
      return
    }
    case '/drivers/download': {
      const driverId = typeof data.driverId === 'string' ? data.driverId : ''
      if (driverId === '') throw new DbError('invalid', '缺少 driverId')
      const status = await ensureDriver(deps, driverId)
      sendJson(response, 200, { ok: true, data: status })
      return
    }
    case '/drivers/custom/save': {
      const driver = deps.config.upsertDriver(data.driver)
      sendJson(response, 200, { ok: true, data: { driver, drivers: deps.drivers.statuses() } })
      return
    }
    case '/drivers/custom/delete': {
      const id = typeof data.id === 'string' ? data.id : ''
      deps.config.deleteDriver(id)
      sendJson(response, 200, { ok: true, data: { drivers: deps.drivers.statuses() } })
      return
    }
    case '/settings/update': {
      const before = deps.config.settings().javaPath
      const settings = deps.config.updateSettings(data.settings)
      if (settings.javaPath !== before) deps.java.invalidate()
      sendJson(response, 200, { ok: true, data: { settings, env: envStatus(deps) } })
      return
    }
    case '/health': {
      const java = deps.java.locate(deps.config.settings().javaPath)
      let bridgePing: unknown = null
      if (java.available && deps.java.bridgeReady(deps.paths.bridgeJar)) {
        bridgePing = await deps.sql.ping().catch((error: unknown) => ({ error: toWireError(error).body }))
      }
      sendJson(response, 200, {
        ok: true,
        data: {
          plugin: PLUGIN_NAME,
          version: deps.paths.version,
          java,
          bridgePing,
          connected: deps.sql.connectedIds(),
        },
      })
      return
    }
    default:
      throw new DbError('not-found', `未知的接口：${path}`)
  }
}

async function ensureDriver(deps: RouteDeps, driverId: string): Promise<DriverStatus> {
  const presets = deps.drivers.statuses().filter((status) => status.preset !== null)
  const status = deps.drivers.statuses().find((entry) => entry.id === driverId)
  if (status === undefined) throw new DbError('not-found', `驱动不存在：${driverId}`)
  if (!status.needsJava) return status
  const resolved =
    status.preset !== null && presets.some((entry) => entry.id === status.id)
      ? deps.drivers.resolvePreset(status.preset)
      : deps.drivers.resolveCustom(status.id)
  await deps.drivers.ensureJars(resolved)
  return deps.drivers.statuses().find((entry) => entry.id === driverId) ?? status
}

export function createRouteHandler(deps: RouteDeps) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    try {
      const rejection = rejectionOf(deps, request)
      if (rejection !== undefined) {
        sendJson(response, rejection, { ok: false, error: { code: 'forbidden', message: '请求被拒绝' } })
        return
      }
      if (request.method !== 'POST') {
        response.setHeader('allow', 'POST')
        sendJson(response, 405, { ok: false, error: { code: 'method-not-allowed', message: '只接受 POST 请求' } })
        return
      }
      const url = new URL(String(request.url), 'http://localhost')
      if (!url.pathname.startsWith(ROUTE_PREFIX)) {
        sendJson(response, 404, { ok: false, error: { code: 'not-found', message: '未知接口' } })
        return
      }
      const path = url.pathname.slice(ROUTE_PREFIX.length) || '/'
      await handle(deps, request, response, path)
    } catch (error) {
      if (error instanceof DbError && error.code === 'not-found' && !response.headersSent) {
        fail(response, error)
        return
      }
      if (!response.headersSent) fail(response, error)
      else deps.log(`route error after headers sent: ${String(error)}`)
    }
  }
}

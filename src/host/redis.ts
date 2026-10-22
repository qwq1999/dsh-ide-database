import { Redis } from 'ioredis'

import type {
  ConnectionConfig,
  JsonValue,
  RedisCommandResult,
  RedisKeyInfo,
  RedisScanResult,
  RedisValue,
  ServerInfo,
} from '../shared/types.js'
import type { ConfigStore } from './config.js'
import { DbError } from './errors.js'
import type { SecretStore } from './secrets.js'

interface Session {
  client: Redis
  readOnly: boolean
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function toJsonValue(value: unknown): JsonValue {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'bigint') return value.toString()
  if (Buffer.isBuffer(value)) return value.toString('utf8')
  if (Array.isArray(value)) return value.map((item) => toJsonValue(item))
  if (typeof value === 'object') {
    const out: Record<string, JsonValue> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = toJsonValue(item)
    return out
  }
  return String(value)
}

function truncateText(text: string, limit: number): { text: string; truncated: boolean } {
  return text.length > limit ? { text: text.slice(0, limit), truncated: true } : { text, truncated: false }
}

const READ_ONLY_COMMANDS = new Set([
  'get',
  'mget',
  'strlen',
  'type',
  'ttl',
  'pttl',
  'exists',
  'scan',
  'keys',
  'dbsize',
  'info',
  'ping',
  'echo',
  'time',
  'randomkey',
  'lrange',
  'llen',
  'lpos',
  'smembers',
  'scard',
  'sismember',
  'sscan',
  'hget',
  'hmget',
  'hgetall',
  'hlen',
  'hscan',
  'hkeys',
  'hvals',
  'zrange',
  'zrevrange',
  'zrangebyscore',
  'zcard',
  'zscan',
  'zscore',
  'xrange',
  'xrevrange',
  'xlen',
  'getrange',
  'object',
  'memory',
  'bitcount',
  'geopos',
])

const DENIED_COMMANDS = new Set(['shutdown', 'monitor', 'subscribe', 'psubscribe', 'sync', 'psync', 'replconf'])

/** Splits a Redis command line into argv, honouring single and double quotes. */
export function tokenizeCommand(input: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  let escaped = false
  for (const char of input) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\' && quote !== "'") {
      escaped = true
      continue
    }
    if (quote !== null) {
      if (char === quote) quote = null
      else current += char
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      if (current !== '') {
        tokens.push(current)
        current = ''
      }
      continue
    }
    current += char
  }
  if (current !== '') tokens.push(current)
  return tokens
}

export class RedisManager {
  private readonly sessions = new Map<string, Session>()

  constructor(
    private readonly config: ConfigStore,
    private readonly secrets: SecretStore,
    private readonly log: (message: string) => void = () => {},
  ) {}

  isConnected(connId: string): boolean {
    const session = this.sessions.get(connId)
    return session !== undefined && (session.client.status === 'ready' || session.client.status === 'connect')
  }

  private connection(connId: string): ConnectionConfig {
    const conn = this.config.connection(connId)
    if (conn === undefined) throw new DbError('not-found', `连接不存在：${connId}`)
    if (conn.dialect !== 'redis') throw new DbError('unsupported', '该连接不是 Redis 连接')
    return conn
  }

  private options(conn: ConnectionConfig): Record<string, unknown> {
    const settings = this.config.settings()
    const password = conn.secretName === undefined ? undefined : this.secrets.resolve(conn.secretName)?.value
    return {
      host: conn.host,
      port: conn.port,
      ...(conn.user === '' ? {} : { username: conn.user }),
      ...(password === undefined ? {} : { password }),
      db: conn.redisDb,
      connectTimeout: settings.connectTimeoutSec * 1000,
      commandTimeout: settings.queryTimeoutSec,
      lazyConnect: true,
      enableOfflineQueue: false,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      ...conn.params,
    }
  }

  async connect(connId: string): Promise<ServerInfo> {
    const conn = this.connection(connId)
    if (this.sessions.has(connId)) return this.serverInfo(conn, this.sessions.get(connId)!.client)
    const client = new Redis(this.options(conn) as never)
    try {
      await client.connect()
      await client.ping()
    } catch (error) {
      client.disconnect()
      throw new DbError('connect-failed', `无法连接 Redis ${conn.host}:${conn.port}：${messageOf(error)}`)
    }
    this.sessions.set(connId, { client, readOnly: conn.readOnly })
    this.config.touchConnection(connId)
    return this.serverInfo(conn, client)
  }

  private async serverInfo(conn: ConnectionConfig, client: Redis): Promise<ServerInfo> {
    let version = ''
    try {
      const info = await client.info('server')
      const match = /^redis_version:(.+)$/m.exec(info)
      if (match !== null) version = match[1].trim()
    } catch {
      // Some compatible servers restrict INFO.
    }
    return {
      product: 'Redis',
      version,
      ...(conn.user === '' ? {} : { user: conn.user }),
      database: String(conn.redisDb),
      url: `redis://${conn.host}:${conn.port}/${conn.redisDb}`,
    }
  }

  async disconnect(connId: string): Promise<void> {
    const session = this.sessions.get(connId)
    if (session === undefined) return
    this.sessions.delete(connId)
    try {
      await session.client.quit()
    } catch {
      session.client.disconnect()
    }
  }

  private session(connId: string): Session {
    const session = this.sessions.get(connId)
    if (session === undefined || session.client.status !== 'ready') {
      throw new DbError('not-connected', '连接尚未打开')
    }
    return session
  }

  private async keyInfo(client: Redis, key: string): Promise<RedisKeyInfo> {
    const type = String(await client.type(key))
    let ttl = -1
    try {
      ttl = Number(await client.ttl(key))
    } catch {
      ttl = -1
    }
    const size = await this.keySize(client, key, type).catch(() => undefined)
    return { key, type, ttl, ...(size === undefined ? {} : { size }) }
  }

  private async keySize(client: Redis, key: string, type: string): Promise<number | undefined> {
    switch (type) {
      case 'string':
        return Number(await client.strlen(key))
      case 'list':
        return Number(await client.llen(key))
      case 'set':
        return Number(await client.scard(key))
      case 'zset':
        return Number(await client.zcard(key))
      case 'hash':
        return Number(await client.hlen(key))
      case 'stream':
        return Number(await client.xlen(key))
      default:
        return undefined
    }
  }

  async scan(connId: string, cursor: string, pattern: string, type: string | undefined, limit: number): Promise<RedisScanResult> {
    const session = this.session(connId)
    const count = Math.max(10, Math.min(Math.trunc(limit) || 200, 10_000))
    const match = pattern.trim() === '' ? '*' : pattern.trim()
    const args: string[] = [cursor === '' ? '0' : cursor, 'MATCH', match, 'COUNT', String(count)]
    const wanted = type === undefined || type === '' ? undefined : type
    if (wanted !== undefined) args.push('TYPE', wanted)
    let reply: unknown
    try {
      reply = await session.client.call('SCAN', ...args)
    } catch (error) {
      if (wanted === undefined) throw new DbError('redis', `SCAN 失败：${messageOf(error)}`)
      // Redis < 6 has no SCAN TYPE; retry without it and filter client-side.
      reply = await session.client.call('SCAN', cursor === '' ? '0' : cursor, 'MATCH', match, 'COUNT', String(count))
    }
    if (!Array.isArray(reply) || reply.length < 2) throw new DbError('redis', 'SCAN 返回了意外的结果')
    const nextCursor = String(reply[0])
    const keys = Array.isArray(reply[1]) ? (reply[1] as unknown[]).map((key) => String(key)) : []
    const infos = await Promise.all(keys.map((key) => this.keyInfo(session.client, key)))
    const filtered = wanted === undefined ? infos : infos.filter((info) => info.type === wanted)
    return { cursor: nextCursor, done: nextCursor === '0', keys: filtered, scanned: keys.length }
  }

  async inspect(connId: string, key: string): Promise<RedisValue> {
    const session = this.session(connId)
    const client = session.client
    const type = String(await client.type(key))
    if (type === 'none') throw new DbError('not-found', `键不存在：${key}`)
    const ttl = Number(await client.ttl(key))
    const size = await this.keySize(client, key, type).catch(() => undefined)
    const maxRows = Math.max(1, this.config.settings().maxRows)
    let value: JsonValue = null
    let truncated = false
    try {
      switch (type) {
        case 'string': {
          const length = Number(await client.strlen(key))
          const limit = 64 * 1024
          const raw = length > limit ? await client.getrange(key, 0, limit - 1) : await client.get(key)
          const result = truncateText(String(raw ?? ''), limit)
          value = result.text
          truncated = length > limit || result.truncated
          break
        }
        case 'hash': {
          const entries: string[] = []
          let cursor = '0'
          do {
            const [next, chunk] = await client.hscan(key, cursor, 'COUNT', String(Math.max(100, maxRows * 4)))
            entries.push(...chunk)
            cursor = next
            if (entries.length >= maxRows * 2 + 2) {
              truncated = true
              break
            }
          } while (cursor !== '0')
          const object: Record<string, JsonValue> = {}
          const limit = entries.length > maxRows * 2 ? maxRows * 2 : entries.length
          for (let index = 0; index + 1 < limit; index += 2) object[entries[index]] = entries[index + 1]
          if (entries.length > maxRows * 2) truncated = true
          value = object
          break
        }
        case 'list': {
          const items = await client.lrange(key, 0, maxRows)
          if (items.length > maxRows) {
            truncated = true
            items.length = maxRows
          }
          value = items
          break
        }
        case 'set': {
          const members: string[] = []
          let cursor = '0'
          do {
            const [next, chunk] = await client.sscan(key, cursor, 'COUNT', String(Math.max(100, maxRows * 4)))
            members.push(...chunk)
            cursor = next
          } while (cursor !== '0' && members.length < maxRows + 1)
          if (members.length > maxRows) {
            truncated = true
            members.length = maxRows
          }
          value = members
          break
        }
        case 'zset': {
          const reply = (await client.call('ZRANGE', key, '0', String(maxRows), 'WITHSCORES')) as unknown
          const flat = Array.isArray(reply) ? reply.map((item) => String(item)) : []
          const items: JsonValue[] = []
          for (let index = 0; index + 1 < flat.length; index += 2) {
            items.push({ member: flat[index], score: Number(flat[index + 1]) })
          }
          if (Number(await client.zcard(key)) > maxRows) truncated = true
          value = items
          break
        }
        case 'stream': {
          const reply = (await client.call('XRANGE', key, '-', '+', 'COUNT', String(maxRows + 1))) as unknown
          const entries = Array.isArray(reply) ? reply : []
          const items: JsonValue[] = entries.slice(0, maxRows).map((entry) => toJsonValue(entry))
          if (entries.length > maxRows) truncated = true
          value = items
          break
        }
        default:
          value = null
          truncated = true
      }
    } catch (error) {
      throw new DbError('redis', `读取键 ${key} 失败：${messageOf(error)}`)
    }
    return {
      key,
      type,
      ttl,
      ...(size === undefined ? {} : { size }),
      value,
      truncated,
      preview: JSON.stringify(value)?.slice(0, 400) ?? String(value),
    }
  }

  async command(connId: string, input: string, allowWrite: boolean): Promise<RedisCommandResult> {
    const session = this.session(connId)
    const tokens = tokenizeCommand(input)
    if (tokens.length === 0) throw new DbError('invalid', '命令不能为空')
    const command = tokens[0].toUpperCase()
    if (DENIED_COMMANDS.has(command.toLowerCase())) {
      throw new DbError('read-only', `该命令被插件禁止执行：${command}`)
    }
    const readOnlyCommand = READ_ONLY_COMMANDS.has(command.toLowerCase())
    if (!readOnlyCommand && (session.readOnly || !allowWrite)) {
      throw new DbError('read-only', session.readOnly ? '该连接已标记为只读，拒绝写命令' : '当前操作不允许写命令')
    }
    const started = Date.now()
    try {
      const reply = await session.client.call(command, ...tokens.slice(1))
      return { command: tokens.join(' '), value: toJsonValue(reply), elapsedMs: Date.now() - started, readOnly: readOnlyCommand }
    } catch (error) {
      if (error instanceof DbError) throw error
      throw new DbError('redis', `Redis 命令执行失败：${messageOf(error)}`)
    }
  }

  async dispose(): Promise<void> {
    const sessions = [...this.sessions.values()]
    this.sessions.clear()
    await Promise.all(
      sessions.map(async (session) => {
        try {
          await session.client.quit()
        } catch {
          session.client.disconnect()
        }
      }),
    )
  }
}

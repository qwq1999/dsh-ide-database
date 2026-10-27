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
  db: number
}

/** One session per connection *and* logical database (`SELECT`). */
function sessionKey(connId: string, db: number): string {
  return `${connId}\u0000${db}`
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

/**
 * Normalise a `ZRANGE ... WITHSCORES` reply into member/score pairs.
 *
 * ioredis normally returns a flat `[member, score, member, score, ...]` list,
 * but RESP3 connections (and raw `CALL`) return `[[member, score], ...]`.
 */
export function zsetEntries(reply: unknown): Array<{ member: string; score: number }> {
  const flat: string[] = []
  if (Array.isArray(reply)) {
    for (const entry of reply) {
      if (Array.isArray(entry)) flat.push(...entry.map((cell) => String(cell)))
      else flat.push(String(entry))
    }
  }
  const items: Array<{ member: string; score: number }> = []
  for (let index = 0; index + 1 < flat.length; index += 2) {
    const score = Number(flat[index + 1])
    items.push({ member: flat[index], score: Number.isFinite(score) ? score : 0 })
  }
  return items
}

/**
 * Redis command that reports a key's size (entries, or bytes for strings).
 *
 * `type` comes from the server, so the size command is only known after the
 * TYPE round trip; keeping the mapping in one table lets the batch reader and
 * the single-key path agree.
 */
const SIZE_COMMAND: Record<string, 'strlen' | 'llen' | 'scard' | 'zcard' | 'hlen' | 'xlen'> = {
  string: 'strlen',
  list: 'llen',
  set: 'scard',
  zset: 'zcard',
  hash: 'hlen',
  stream: 'xlen',
}

interface PipelineSlot {
  value?: unknown
  error?: unknown
}

/** One `pipeline.exec()` entry is `[error, value]`; plain values are tolerated. */
function slotAt(replies: unknown, index: number): PipelineSlot {
  if (!Array.isArray(replies)) return { value: undefined }
  const slot: unknown = replies[index]
  if (!Array.isArray(slot)) return { value: slot }
  return slot[0] === null || slot[0] === undefined ? { value: slot[1] } : { error: slot[0] }
}

function ttlOf(slot: PipelineSlot): number {
  const value = Number(slot.value)
  return slot.error === undefined && Number.isFinite(value) ? value : -1
}

function typeOf(slot: PipelineSlot, key: string): string {
  if (slot.error !== undefined) throw new DbError('redis', `读取键 ${key} 的类型失败：${messageOf(slot.error)}`)
  return slot.value === undefined || slot.value === null ? 'none' : String(slot.value)
}

/**
 * TYPE/TTL (and, for containers, their size) for a whole page of keys.
 *
 * A page is up to `COUNT` keys; asking per key costs three round trips each.
 * Both pipelines send every command in one write and read every reply in one
 * batch, so a 200-key page costs two round trips instead of hundreds — the
 * single biggest cost of browsing a big Redis keyspace.
 */
export async function keyInfos(client: Redis, keys: string[]): Promise<RedisKeyInfo[]> {
  if (keys.length === 0) return []
  const meta = client.pipeline()
  for (const key of keys) {
    meta.type(key)
    meta.ttl(key)
  }
  const metaReplies = await meta.exec()
  const infos: RedisKeyInfo[] = keys.map((key, index) => {
    const type = typeOf(slotAt(metaReplies, index * 2), key)
    const ttl = ttlOf(slotAt(metaReplies, index * 2 + 1))
    return { key, type, ttl }
  })
  if (!infos.some((info) => SIZE_COMMAND[info.type] !== undefined)) return infos
  const sizes = client.pipeline()
  const sized: Array<(typeof SIZE_COMMAND)[string] | undefined> = infos.map((info) => SIZE_COMMAND[info.type])
  for (let index = 0; index < infos.length; index += 1) {
    const command = sized[index]
    if (command === undefined) continue
    if (command === 'strlen') sizes.strlen(infos[index].key)
    else if (command === 'llen') sizes.llen(infos[index].key)
    else if (command === 'scard') sizes.scard(infos[index].key)
    else if (command === 'zcard') sizes.zcard(infos[index].key)
    else if (command === 'hlen') sizes.hlen(infos[index].key)
    else sizes.xlen(infos[index].key)
  }
  const sizeReplies = await sizes.exec()
  let slot = 0
  for (let index = 0; index < infos.length; index += 1) {
    if (sized[index] === undefined) continue
    const entry = slotAt(sizeReplies, slot)
    slot += 1
    const size = Number(entry.value)
    if (entry.error === undefined && entry.value !== null && Number.isFinite(size)) infos[index].size = size
  }
  return infos
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
  'xread',
  'xinfo',
  'lindex',
  'zcount',
  'zlexcount',
  'zrank',
  'zrevrank',
  'zmscore',
  'hstrlen',
  'hexists',
  'hrandfield',
  'getbit',
  'bitpos',
  'geodist',
  'geohash',
  'geosearch',
  'pfcount',
  'srandmember',
])

// FLUSHDB/FLUSHALL wipe a whole logical database; keep them denied even when writes are allowed.
const DENIED_COMMANDS = new Set(['shutdown', 'monitor', 'subscribe', 'psubscribe', 'sync', 'psync', 'replconf', 'flushdb', 'flushall'])

/** Splits a Redis command line into argv, honouring single and double quotes. */
function tokenizeCommand(input: string): string[] {
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
    const prefix = `${connId}\u0000`
    for (const [key, session] of this.sessions) {
      if (key.startsWith(prefix) && (session.client.status === 'ready' || session.client.status === 'connect')) return true
    }
    return false
  }

  private connection(connId: string): ConnectionConfig {
    const conn = this.config.connection(connId)
    if (conn === undefined) throw new DbError('not-found', `连接不存在：${connId}`)
    if (conn.dialect !== 'redis') throw new DbError('unsupported', '该连接不是 Redis 连接')
    return conn
  }

  private options(conn: ConnectionConfig, db: number): Record<string, unknown> {
    const settings = this.config.settings()
    const password = conn.secretName === undefined ? undefined : this.secrets.resolve(conn.secretName)?.value
    return {
      host: conn.host,
      port: conn.port,
      ...(conn.user === '' ? {} : { username: conn.user }),
      ...(password === undefined ? {} : { password }),
      db,
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
    const db = conn.redisDb
    const key = sessionKey(connId, db)
    const existing = this.sessions.get(key)
    if (existing !== undefined) return this.serverInfo(conn, existing.client)
    const client = new Redis(this.options(conn, db) as never)
    try {
      await client.connect()
      await client.ping()
    } catch (error) {
      client.disconnect()
      throw new DbError('connect-failed', `无法连接 Redis ${conn.host}:${conn.port}：${messageOf(error)}`)
    }
    this.sessions.set(key, { client, readOnly: conn.readOnly, db })
    this.config.touchConnection(connId)
    return this.serverInfo(conn, client)
  }

  /**
   * Another logical database is reached with its own pooled client, opened on
   * demand once the connection itself is live. Keeping one session per db avoids
   * `SELECT` racing between a scan and a key inspection.
   */
  private async ensureSession(connId: string, db: number): Promise<Session> {
    const conn = this.connection(connId)
    const key = sessionKey(connId, db)
    const existing = this.sessions.get(key)
    if (existing !== undefined && existing.client.status === 'ready') return existing
    const live = [...this.sessions.keys()].some((entry) => entry.startsWith(`${connId}\u0000`))
    if (!live) throw new DbError('not-connected', '连接尚未打开')
    const client = new Redis(this.options(conn, db) as never)
    try {
      await client.connect()
      await client.ping()
    } catch (error) {
      client.disconnect()
      throw new DbError('connect-failed', `无法打开 Redis db${db}：${messageOf(error)}`)
    }
    const session: Session = { client, readOnly: conn.readOnly, db }
    this.sessions.set(key, session)
    return session
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
    const prefix = `${connId}\u0000`
    const closing = [...this.sessions.entries()].filter(([key]) => key.startsWith(prefix))
    for (const [key] of closing) this.sessions.delete(key)
    await Promise.all(
      closing.map(async ([, session]) => {
        try {
          await session.client.quit()
        } catch {
          session.client.disconnect()
        }
      }),
    )
  }

  private session(connId: string, db?: number): Session {
    const session = db === undefined
      ? [...this.sessions.entries()].find(([key]) => key.startsWith(`${connId}\u0000`))?.[1]
      : this.sessions.get(sessionKey(connId, db))
    if (session === undefined || session.client.status !== 'ready') {
      throw new DbError('not-connected', '连接尚未打开')
    }
    return session
  }

  /** Logical database count, read from the server (`CONFIG GET databases`). */
  async databases(connId: string): Promise<number> {
    const session = this.session(connId)
    try {
      const reply = (await session.client.call('CONFIG', 'GET', 'databases')) as unknown
      if (Array.isArray(reply) && reply.length >= 2) {
        const count = Number(reply[1])
        if (Number.isFinite(count) && count > 0) return Math.trunc(count)
      }
    } catch {
      // Managed providers can disable CONFIG; Redis' historical default is 16.
    }
    return 16
  }

  async scan(
    connId: string,
    db: number,
    cursor: string,
    pattern: string,
    type: string | undefined,
    limit: number,
  ): Promise<RedisScanResult> {
    const session = await this.ensureSession(connId, db)
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
    const infos = await keyInfos(session.client, keys)
    const filtered = wanted === undefined ? infos : infos.filter((info) => info.type === wanted)
    return { cursor: nextCursor, done: nextCursor === '0', keys: filtered, scanned: keys.length }
  }

  async inspect(connId: string, db: number, key: string): Promise<RedisValue> {
    const session = await this.ensureSession(connId, db)
    const client = session.client
    const [info] = await keyInfos(client, [key])
    const { type, ttl, size } = info
    if (type === 'none') throw new DbError('not-found', `键不存在：${key}`)
    const maxRows = Math.max(1, this.config.settings().maxRows)
    let value: JsonValue = null
    let truncated = false
    try {
      switch (type) {
        case 'string': {
          const length = size ?? Number(await client.strlen(key))
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
          const reply = (await client.zrange(key, '0', String(maxRows), 'WITHSCORES')) as unknown
          value = zsetEntries(reply) as JsonValue[]
          if ((size ?? Number(await client.zcard(key))) > maxRows) truncated = true
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

  async command(connId: string, db: number, input: string, allowWrite: boolean): Promise<RedisCommandResult> {
    const tokens = tokenizeCommand(input)
    if (tokens.length === 0) throw new DbError('invalid', '命令不能为空')
    const command = tokens[0].toUpperCase()
    // Deny before connecting: a forbidden command must not open a session either.
    if (DENIED_COMMANDS.has(command.toLowerCase())) {
      throw new DbError('read-only', `该命令被插件禁止执行：${command}`)
    }
    const session = await this.ensureSession(connId, db)
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

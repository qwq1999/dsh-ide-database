import { DIALECT_LABEL } from '../shared/presets'
import type { CellValue, Dialect, ObjectKind } from '../shared/types'

export function dialectLabel(dialect: Dialect | undefined): string {
  return dialect ? DIALECT_LABEL[dialect] : '未选择'
}

export function formatMs(ms: number | undefined): string {
  if (ms === undefined || Number.isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.max(1, Math.round(ms))} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatCell(value: CellValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

export function cellTone(value: CellValue): 'null' | undefined {
  return value === null ? 'null' : undefined
}

const WRITE_STATEMENT =
  /^\s*(insert|update|delete|merge|replace|create|alter|drop|truncate|grant|revoke|call|exec|execute|rename|comment|lock|unlock|analyze|optimize|vacuum|set\s+global)\b/i

function stripComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n\r]*/g, ' ')
    .replace(/^\s*#.*$/gm, ' ')
}

/** Client-side hint only: the host re-checks and refuses writes on read-only connections. */
function isSpaceChar(char: string): boolean {
  return char === ' ' || char === '\t' || char === '\n' || char === '\r'
}

function firstWord(text: string): { word: string; rest: string } {
  let end = 0
  while (end < text.length && !isSpaceChar(text[end] ?? '')) end += 1
  let cursor = end
  while (cursor < text.length && isSpaceChar(text[cursor] ?? '')) cursor += 1
  return { word: text.slice(0, end).toLowerCase(), rest: text.slice(cursor) }
}

/**
 * `EXPLAIN ANALYZE <statement>` executes the statement it plans, so the
 * confirmation prompt has to look at that statement instead of at EXPLAIN.
 */
function unwrapExplainAnalyze(statement: string): string {
  const head = firstWord(statement)
  if (head.word !== 'explain') return statement
  const analyze = firstWord(head.rest)
  if (analyze.word !== 'analyze') return statement
  const next = firstWord(analyze.rest)
  return next.word.startsWith('format') ? next.rest : analyze.rest
}

export function looksLikeWrite(sql: string): boolean {
  const cleaned = stripComments(sql)
  return cleaned
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .some((statement) => WRITE_STATEMENT.test(unwrapExplainAnalyze(statement)))
}

const REDIS_READ = new Set([
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
  'srandmember',
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
  'xinfo',
  'object',
  'memory',
  'getrange',
  'bitcount',
  'geopos',
  'geodist',
  'georadius_ro',
])

export function redisCommandName(command: string): string {
  const match = /^\s*([a-zA-Z]+)/.exec(command)
  return match?.[1]?.toLowerCase() ?? ''
}

export function looksLikeRedisWrite(command: string): boolean {
  const name = redisCommandName(command)
  return name !== '' && !REDIS_READ.has(name)
}

export function objectKindLabel(kind: ObjectKind): string {
  if (kind === 'table') return '表'
  if (kind === 'view') return '视图'
  if (kind === 'procedure') return '存储过程'
  if (kind === 'function') return '函数'
  if (kind === 'sequence') return '序列'
  if (kind === 'trigger') return '触发器'
  return '对象'
}

export function truncateMiddle(text: string, max = 60): string {
  if (text.length <= max) return text
  const half = Math.floor((max - 1) / 2)
  return `${text.slice(0, half)}…${text.slice(-half)}`
}

export function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function redisValuePreview(value: unknown): string {
  if (value === null || value === undefined) return 'nil'
  if (typeof value === 'string') return value.length > 400 ? `${value.slice(0, 400)}…` : value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.length} 项]`
  return stringifyJson(value)
}

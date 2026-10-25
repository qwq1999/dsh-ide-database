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

/** Compact remaining TTL: 3600 becomes `1h`, negative means no expiry. */
export function formatTtl(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 0) return '永久'
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
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

function headWord(text: string): { word: string; rest: string } {
  let end = 0
  while (end < text.length) {
    const char = text[end] ?? ''
    if (isSpaceChar(char) || char === '(' || char === ')' || char === ',') break
    end += 1
  }
  let cursor = end
  while (cursor < text.length && isSpaceChar(text[cursor] ?? '')) cursor += 1
  return { word: text.slice(0, end).toLowerCase(), rest: text.slice(cursor) }
}

/** Index just past the `)` that closes the `(` at `open`, or -1. */
function skipBalanced(text: string, open: number): number {
  let depth = 0
  let quote = ''
  for (let index = open; index < text.length; index += 1) {
    const char = text[index] ?? ''
    if (quote !== '') {
      if (char === quote) quote = ''
      continue
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char
      continue
    }
    if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }
  return -1
}

/**
 * Oracle and PostgreSQL let a CTE prefix a write statement:
 * `WITH fresh AS (…) DELETE FROM t`. The confirmation prompt must look past
 * the CTE list, so this walks `WITH [RECURSIVE] name [(cols)] AS [NOT]
 * [MATERIALIZED] (…) [, …]` and returns the statement it decorates. `null`
 * means the header could not be parsed; the caller then treats it as a write.
 */
function unwrapWith(statement: string): string | null {
  let rest = firstWord(statement).rest
  const maybeRecursive = headWord(rest)
  if (maybeRecursive.word === 'recursive') rest = maybeRecursive.rest
  for (;;) {
    const name = headWord(rest)
    if (name.word === '') return null
    rest = name.rest
    if (rest.startsWith('(')) {
      const close = skipBalanced(rest, 0)
      if (close < 0) return null
      rest = rest.slice(close).trimStart()
    }
    const as = headWord(rest)
    if (as.word !== 'as') return null
    rest = as.rest
    const optional = headWord(rest)
    if (optional.word === 'not' || optional.word === 'materialized') rest = optional.rest
    if (!rest.startsWith('(')) return null
    const close = skipBalanced(rest, 0)
    if (close < 0) return null
    rest = rest.slice(close).trimStart()
    if (rest.startsWith(',')) {
      rest = rest.slice(1).trimStart()
      continue
    }
    return rest
  }
}

export function looksLikeWrite(sql: string): boolean {
  const cleaned = stripComments(sql)
  return cleaned
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .some((statement) => {
      const unwrapped = unwrapExplainAnalyze(statement)
      const rest = firstWord(unwrapped).word === 'with' ? unwrapWith(unwrapped) : unwrapped
      if (rest === null) return true
      return WRITE_STATEMENT.test(rest)
    })
}

/**
 * Only schema changes invalidate the database dropdown and the object tree:
 * a plain SELECT does not, so it must not pay for an extra `/schemas` round
 * trip (the host answers that from the live server).
 */
const DDL_STATEMENT = /^\s*(create|alter|drop|rename|truncate)\b/i

export function looksLikeDdl(sql: string): boolean {
  return stripComments(sql)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .some((statement) => DDL_STATEMENT.test(unwrapExplainAnalyze(statement)))
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

export function stringifyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const COUNT_FORMAT = new Intl.NumberFormat('en-US')

/** Group digits so counts read the same everywhere they are shown. */
export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value)
}

import { DIALECT_LABEL } from '../shared/presets'
import type { CellValue, Dialect, ObjectKind, SqlDialect } from '../shared/types'
import { splitStatements } from './multistatement'
import { bracketIdentifierEnd, maskNonCode } from './sqllex'

export function dialectLabel(dialect: Dialect | undefined): string {
  return dialect ? DIALECT_LABEL[dialect] : '未选择'
}

export function formatMs(ms: number | undefined): string {
  if (ms === undefined || Number.isNaN(ms)) return '—'
  const rounded = Math.max(1, Math.round(ms))
  if (rounded < 1000) return `${rounded} ms`
  const seconds = Math.round(ms / 1000)
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${(ms / 1000).toFixed(2)} s`
}

/** Compact remaining TTL: 3600 becomes `1h`, negative means no expiry. */
export function formatTtl(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 0) return '永久'
  const whole = Math.round(seconds)
  if (whole < 60) return `${whole}s`
  if (whole < 3600) return `${Math.floor(whole / 60)}m`
  if (whole < 86400) return `${Math.floor(whole / 3600)}h`
  return `${Math.floor(whole / 86400)}d`
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  const rounded = Math.round(bytes)
  if (rounded < 1024) return `${rounded} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatCell(value: CellValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

/** Local `YYYY-MM-DD HH:mm` for an ISO timestamp; `—` when missing or invalid. */
export function formatDateTime(iso: string | undefined): string {
  if (iso === undefined || iso === '') return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const WRITE_STATEMENT =
  /^\s*(insert|update|delete|merge|replace|create|alter|drop|truncate|grant|revoke|call|exec|execute|rename|comment|lock|unlock|load|bulk|reindex|cluster|refresh|backup|restore|dbcc|analyze|optimize|vacuum|set\s+global)\b/i

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

/** Index just past a CTE name starting at `index`, or null when it is empty. */
function cteNameEnd(text: string, index: number): number | null {
  const first = text[index]
  if (first === undefined) return null
  const closer = first === '"' ? '"' : first === '`' ? '`' : first === '[' ? ']' : ''
  if (closer !== '') {
    let cursor = index + 1
    while (cursor < text.length) {
      if (text[cursor] === closer) {
        if (text[cursor + 1] === closer) {
          cursor += 2
          continue
        }
        return cursor + 1
      }
      cursor += 1
    }
    return null
  }
  let cursor = index
  while (cursor < text.length) {
    const char = text[cursor] ?? ''
    if (isSpaceChar(char) || char === '(' || char === ')' || char === ',') break
    cursor += 1
  }
  return cursor > index ? cursor : null
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
    if (char === '[') {
      const end = bracketIdentifierEnd(text, index)
      if (end !== null) {
        index = end - 1
        continue
      }
    }
    if (char === '(') depth += 1
    else if (char === ')') {
      depth -= 1
      if (depth === 0) return index + 1
    }
  }
  return -1
}

/** Split a masked WITH clause into its CTE bodies and the statement it decorates. */
function withWriteParts(code: string): { bodies: string[]; statement: string } | null {
  let rest = firstWord(code).rest
  const maybeRecursive = firstWord(rest)
  if (maybeRecursive.word === 'recursive') rest = maybeRecursive.rest
  const bodies: string[] = []
  for (;;) {
    const nameEnd = cteNameEnd(rest, 0)
    if (nameEnd === null) return null
    rest = rest.slice(nameEnd).trimStart()
    if (rest.startsWith('(')) {
      const close = skipBalanced(rest, 0)
      if (close < 0) return null
      rest = rest.slice(close).trimStart()
    }
    const as = firstWord(rest)
    if (as.word !== 'as') return null
    rest = as.rest
    const optional = firstWord(rest)
    if (optional.word === 'not') {
      const materialized = firstWord(optional.rest)
      if (materialized.word !== 'materialized') return null
      rest = materialized.rest
    } else if (optional.word === 'materialized') {
      rest = optional.rest
    }
    if (!rest.startsWith('(')) return null
    const close = skipBalanced(rest, 0)
    if (close < 0) return null
    bodies.push(rest.slice(1, close - 1))
    rest = rest.slice(close).trimStart()
    if (rest.startsWith(',')) {
      rest = rest.slice(1).trimStart()
      continue
    }
    return { bodies, statement: rest }
  }
}

const SELECT_INTO_FILE = /\binto\s+(?:outfile|dumpfile)\b/iu
const MYSQL_EXECUTABLE_WRITE =
  /\/\*![\s\S]*?(?:insert|update|delete|merge|replace|create|alter|drop|truncate|grant|revoke|call|exec(?:ute)?|rename|lock|unlock|analyze|optimize|vacuum)\b/iu
const SELECT_INTO_TABLE =
  /\binto\s+(?!@|(?:outfile|dumpfile)\b)(?:temp(?:orary)?\s+)?(?:table\s+)?(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_$#][\w$#]*)/iu

/** The statement after `EXPLAIN ANALYZE`, or null when EXPLAIN does not execute. */
function explainAnalyzeBody(code: string): string | null {
  let rest = firstWord(code).rest
  let analyze = false
  if (rest.startsWith('(')) {
    const close = skipBalanced(rest, 0)
    if (close < 0) return null
    if (/\banalyze\b/iu.test(rest.slice(1, close - 1))) analyze = true
    rest = rest.slice(close).trimStart()
  }
  const next = firstWord(rest)
  if (next.word === 'analyze') {
    analyze = true
    rest = next.rest
  }
  if (!analyze) return null
  const verbose = firstWord(rest)
  if (verbose.word === 'verbose') rest = verbose.rest
  const format = firstWord(rest)
  if (format.word.startsWith('format')) rest = format.rest
  return rest
}

/**
 * Whether executing this statement may change data, files or schema. This is
 * only a confirmation hint; the host re-checks read-only connections. Strings
 * and comments are masked first, but MySQL executable comments stay visible
 * because the server runs them.
 */
function looksLikeWriteCode(code: string, dialect: SqlDialect): boolean {
  if (dialect === 'mysql' && MYSQL_EXECUTABLE_WRITE.test(code)) return true
  const head = firstWord(code)
  if (head.word === 'explain') {
    const body = explainAnalyzeBody(code)
    return body !== null && looksLikeWrite(body, dialect)
  }
  if (head.word === 'with') {
    const clause = withWriteParts(code)
    if (clause === null) return true
    if (clause.bodies.some((body) => looksLikeWrite(body, dialect))) return true
    return looksLikeWrite(clause.statement, dialect)
  }
  if (head.word === 'copy') {
    // COPY ... TO PROGRAM runs an arbitrary server-side command, so it needs
    // confirmation even though it does not write the database.
    if (/\bto\s+program\b/iu.test(code)) return true
    // COPY (SELECT ...) TO ... only reads the database; the FROM inside the
    // subquery must not make it look like a table import.
    if (head.rest.startsWith('(')) return false
    return /\bfrom\b/iu.test(code)
  }
  if (head.word === 'select' || head.word === 'values') {
    return SELECT_INTO_FILE.test(code) || SELECT_INTO_TABLE.test(code)
  }
  return WRITE_STATEMENT.test(code)
}

export function looksLikeWrite(sql: string, dialect: SqlDialect = 'generic'): boolean {
  return splitStatements(sql, dialect).some((statement) => {
    const code = maskNonCode(statement, dialect, false, true).trim()
    return code !== '' && looksLikeWriteCode(code, dialect)
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

function redisCommandName(command: string): string {
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

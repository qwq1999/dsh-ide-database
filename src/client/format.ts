import { DIALECT_LABEL } from '../shared/presets'
import type { CellValue, Dialect, ObjectKind, SqlDialect } from '../shared/types'
import { splitStatements } from './multistatement'
import { isRedisReadCommand } from '../shared/redisread'
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

/** Compact remaining TTL: 3600 becomes `1h`; -1 is no expiry, -2 is a vanished key. */
export function formatTtl(seconds: number): string {
  if (!Number.isFinite(seconds)) return '—'
  if (seconds === -1) return '永久'
  if (seconds === -2) return '已过期'
  if (seconds < 0) return '—'
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
  let rest = head.rest
  // PostgreSQL also allows `EXPLAIN (ANALYZE, FORMAT JSON) statement`; only
  // unwrap the body when the option actually enables execution.
  if (rest.startsWith('(')) {
    const close = skipBalanced(rest, 0)
    if (close < 0) return statement
    if (!analyzeOptionEnabled(rest.slice(1, close - 1))) return statement
    return rest.slice(close).trimStart()
  }
  const analyze = firstWord(rest)
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
const MSSQL_WRITE_WORD =
  /\b(?:insert|update|delete|merge|truncate|create|alter|drop|exec(?:ute)?|backup|restore|bulk)\b/iu
const MYSQL_EXECUTABLE_WRITE =
  /\/\*![\s\S]*?(?:insert|update|delete|merge|replace|create|alter|drop|truncate|grant|revoke|call|exec(?:ute)?|rename|lock|unlock|analyze|optimize|vacuum)\b/iu
const MYSQL_EXECUTABLE_DDL = /\/\*![\s\S]*?(?:create|alter|drop|rename|truncate)\b/iu
const SELECT_INTO_TABLE =
  /\binto\s+(?!@|(?:outfile|dumpfile)\b)(?:temp(?:orary)?\s+)?(?:table\s+)?(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_$#][\w$#]*)/iu

/** The statement after `EXPLAIN ANALYZE`, or null when EXPLAIN does not execute. */
/** PostgreSQL's parenthesised EXPLAIN accepts `ANALYZE false`, which plans without running the statement. */
function analyzeOptionEnabled(options: string): boolean {
  const match = /\banalyze\b(?:\s*(?:=\s*)?(true|false|on|off|1|0))?/iu.exec(options)
  if (match === null) return false
  const value = match[1]?.toLowerCase()
  return value !== 'false' && value !== 'off' && value !== '0'
}

function explainAnalyzeBody(code: string): string | null {
  let rest = firstWord(code).rest
  let analyze = false
  if (rest.startsWith('(')) {
    const close = skipBalanced(rest, 0)
    if (close < 0) return null
    if (analyzeOptionEnabled(rest.slice(1, close - 1))) analyze = true
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
  // PostgreSQL `DO` runs an anonymous code block; the block is opaque after
  // masking, so any DO statement could contain DML and needs confirmation.
  // MySQL's `DO expr` only evaluates an expression, so it stays read-only.
  if (head.word === 'do' && dialect === 'postgres') return true
  // Oracle PL/SQL anonymous blocks can hide DML behind `BEGIN` or `DECLARE`.
  // Oracle starts transactions implicitly, so `BEGIN` here is always a block.
  if (
    (head.word === 'begin' || head.word === 'declare') &&
    (dialect === 'oracle' || dialect === 'oceanbase-oracle')
  ) {
    return true
  }
  // T-SQL `BEGIN ... END` is a block, not only a transaction. Its statements
  // may not use semicolons, so a DML keyword inside the same statement would
  // otherwise be missed. `BEGIN TRY ... END TRY` blocks without writes stay
  // read-only.
  if (dialect === 'mssql' && (head.word === 'begin' || head.word === 'if' || head.word === 'while')) {
    return MSSQL_WRITE_WORD.test(head.rest) || SELECT_INTO_TABLE.test(head.rest)
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
const DDL_STATEMENT = /^\s*(create|alter|drop|rename|truncate|comment)\b/i
// SQL Server renames objects through the sp_rename procedure, not RENAME.
const MSSQL_RENAME = /\bexec(?:ute)?\s+(?:@\w+\s*=\s*)?(?:\[?dbo\]?\.)?\[?sp_rename\]?\b/iu
// `sp_executesql` and `EXEC(@sql)` run dynamic SQL, which may create or
// drop objects; stored-procedure calls such as `sp_help` are ordinary reads.
const MSSQL_DYNAMIC_SQL =
  /\bexec(?:ute)?\s*(?:@\w+\s*=\s*)?(?:\(|(?:\[?dbo\]?\.)?\[?sp_executesql\]?|@\w+\b(?!\s*=))/iu

/** `SELECT ... INTO new_table` creates a table even though it starts with SELECT. */
function selectCreatesTable(code: string): boolean {
  return /^\s*select\b/iu.test(code) && SELECT_INTO_TABLE.test(code)
}

export function looksLikeDdl(sql: string, dialect: SqlDialect = 'generic'): boolean {
  return splitStatements(sql, dialect).some((statement) => {
    // MySQL executes the body of `/*! ... */`; DDL hidden there must clear the
    // cached structure just like a top-level statement.
    const code = maskNonCode(statement, dialect, false, true).trim()
    if (dialect === 'mysql' && MYSQL_EXECUTABLE_DDL.test(code)) return true
    if (code === '') return false
    const analyzed = unwrapExplainAnalyze(code)
    if (DDL_STATEMENT.test(analyzed)) return true
    // PostgreSQL masks the body of a `DO` block as a string, so its DDL is
    // invisible here; any DO block may create or drop objects, so refresh.
    if (dialect === 'postgres' && /^\s*do\b/iu.test(analyzed)) return true
    // Oracle PL/SQL blocks run DDL through `EXECUTE IMMEDIATE`; the block body
    // is opaque here, so refresh after any anonymous block for safety.
    if ((dialect === 'oracle' || dialect === 'oceanbase-oracle') && /^\s*(?:begin|declare)\b/iu.test(analyzed)) {
      return true
    }
    // T-SQL control-flow blocks can contain DDL or `SELECT ... INTO`; their
    // first word is BEGIN/IF/WHILE, so the anchored DDL test above misses them.
    if (dialect === 'mssql' && MSSQL_RENAME.test(analyzed)) return true
    if (dialect === 'mssql' && MSSQL_DYNAMIC_SQL.test(analyzed)) return true
    if (dialect === 'mssql' && /^\s*(?:begin|if|while)\b/iu.test(analyzed)) {
      return /\b(?:create|alter|drop|rename|truncate)\b/iu.test(analyzed) || SELECT_INTO_TABLE.test(analyzed)
    }
    // Look at the statement after a CTE list: `WITH ... SELECT INTO` creates a
    // table, while `WITH ... INSERT INTO` does not change the schema layout.
    return selectCreatesTable(withWriteParts(analyzed)?.statement ?? analyzed)
  })
}

function redisCommandName(command: string): string {
  const match = /^\s*([a-zA-Z][a-zA-Z0-9_]*)/.exec(command)
  return match?.[1]?.toLowerCase() ?? ''
}

export function looksLikeRedisWrite(command: string): boolean {
  const name = redisCommandName(command)
  return name !== '' && !isRedisReadCommand(name)
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

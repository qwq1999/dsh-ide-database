/** Turn a stored Redis value into a two-or-three column table, like IDEA's data viewer. */
import type { JsonValue, RedisValue } from '../shared/types'
import { formatTtl, stringifyJson } from './format'

export interface RedisTable {
  headers: string[]
  rows: string[][]
}

function text(value: JsonValue | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value) ?? String(value)
}

function asRecord(value: JsonValue | undefined): Record<string, JsonValue> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, JsonValue>
}

function asArray(value: JsonValue | undefined): JsonValue[] {
  return Array.isArray(value) ? (value as JsonValue[]) : []
}

/**
 * A stored string is shown as it is: quoting it (and escaping every newline)
 * hides what the key really holds. Values that parse as a JSON object or array
 * get indented so hand-written payloads stay readable; anything else is
 * returned untouched.
 */
function parseJsonContainer(text: string): object | null {
  const trimmed = text.trim()
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    return parsed !== null && typeof parsed === 'object' ? (parsed as object) : null
  } catch {
    return null
  }
}

/**
 * Indent an already-validated JSON container without reparsing it.
 *
 * JSON.parse → JSON.stringify would round every number through IEEE754, which
 * silently corrupts integers beyond 2^53 (64-bit ids, bigint amounts) and
 * normalises literals (`1.0`→`1`, `1e3`→`1000`). Scanning the original text
 * instead keeps every number and string byte-for-byte, changing only structural
 * whitespace. Structural chars and string escapes are handled lexically; the
 * caller has already verified the text parses as an object/array.
 */
function indentJsonContainer(text: string): string {
  type Token = { kind: 'open' | 'close' | 'comma' | 'colon' | 'value'; text: string }
  const tokens: Token[] = []
  const structural = '{}[],:'
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (/\s/u.test(ch)) {
      i += 1
      continue
    }
    if (ch === '{' || ch === '[') {
      tokens.push({ kind: 'open', text: ch })
      i += 1
      continue
    }
    if (ch === '}' || ch === ']') {
      tokens.push({ kind: 'close', text: ch })
      i += 1
      continue
    }
    if (ch === ',') {
      tokens.push({ kind: 'comma', text: ch })
      i += 1
      continue
    }
    if (ch === ':') {
      tokens.push({ kind: 'colon', text: ch })
      i += 1
      continue
    }
    if (ch === '"') {
      const start = i
      i += 1
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2
          continue
        }
        if (text[i] === '"') {
          i += 1
          break
        }
        i += 1
      }
      tokens.push({ kind: 'value', text: text.slice(start, i) })
      continue
    }
    // number / true / false / null — copy verbatim up to the next structural
    // char or whitespace so no numeric literal is ever reinterpreted.
    const start = i
    while (i < text.length && !structural.includes(text[i]) && !/\s/u.test(text[i])) i += 1
    tokens.push({ kind: 'value', text: text.slice(start, i) })
  }

  const out: string[] = []
  let indent = 0
  const pad = (): string => '  '.repeat(indent)
  for (let k = 0; k < tokens.length; k += 1) {
    const token = tokens[k]
    const next = tokens[k + 1]
    if (token.kind === 'open') {
      out.push(token.text)
      indent += 1
      // Keep empty containers on one line.
      if (!(next !== undefined && next.kind === 'close')) out.push('\n' + pad())
    } else if (token.kind === 'close') {
      indent -= 1
      const last = out[out.length - 1] ?? ''
      if (last === '{' || last === '[') {
        out.push(token.text)
      } else {
        // Drop the indent we appended for the current level, then close on a
        // fresh line at the parent level.
        if (last.endsWith('  '.repeat(indent + 1))) out[out.length - 1] = last.replace(/ +$/u, '')
        out.push('\n' + pad() + token.text)
      }
    } else if (token.kind === 'comma') {
      out.push(',\n' + pad())
    } else if (token.kind === 'colon') {
      out.push(': ')
    } else {
      out.push(token.text)
    }
  }
  return out.join('')
}

export function prettyJsonText(text: string): string {
  const trimmed = text.trim()
  const parsed = parseJsonContainer(text)
  return parsed === null ? text : indentJsonContainer(trimmed)
}

/** What the value panel prints when the payload cannot be tabulated. */
export function redisValueText(value: JsonValue): string {
  if (typeof value === 'string') return prettyJsonText(value)
  if (value === null) return 'NULL'
  return stringifyJson(value)
}

/** NULL when the shape cannot be tabulated; callers then fall back to raw JSON. */
export function redisValueTable(value: RedisValue): RedisTable | null {
  switch (value.type) {
    case 'string': {
      const raw = text(value.value)
      // JSON payloads read better as an indented block than squeezed into a cell.
      return parseJsonContainer(raw) === null ? { headers: ['值'], rows: [[raw]] } : null
    }
    case 'hash': {
      const record = asRecord(value.value)
      if (record === null) return null
      return { headers: ['字段', '值'], rows: Object.entries(record).map(([field, item]) => [field, text(item)]) }
    }
    case 'list':
      return { headers: ['#', '值'], rows: asArray(value.value).map((item, index) => [String(index + 1), text(item)]) }
    case 'set':
      return { headers: ['#', '成员'], rows: asArray(value.value).map((item, index) => [String(index + 1), text(item)]) }
    case 'zset':
      return {
        headers: ['成员', '分数'],
        rows: asArray(value.value).map((item) => {
          const record = asRecord(item) ?? {}
          return [text(record.member), text(record.score)]
        }),
      }
    case 'stream':
      return {
        headers: ['ID', '字段'],
        rows: asArray(value.value).map((item) => {
          const entry = asArray(item)
          return [text(entry[0]), text(entry[1])]
        }),
      }
    default:
      return null
  }
}

/**
 * `永久` when the key has no expiry, otherwise seconds; -2 means the key
 * vanished. Delegate to the shared formatter so a TTL that rounds up to 60
 * seconds switches to `1m` here just as it does in the table TTL badge.
 */
export function redisTtlLabel(ttl: number): string {
  return formatTtl(ttl)
}

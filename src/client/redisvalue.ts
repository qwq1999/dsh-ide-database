/** Turn a stored Redis value into a two-or-three column table, like IDEA's data viewer. */
import type { JsonValue, RedisValue } from '../shared/types'
import { stringifyJson } from './format'

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

export function prettyJsonText(text: string): string {
  const parsed = parseJsonContainer(text)
  return parsed === null ? text : JSON.stringify(parsed, null, 2)
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

/** `永久` when the key has no expiry, otherwise seconds; -2 means the key vanished. */
export function redisTtlLabel(ttl: number): string {
  if (ttl === -1) return '永久'
  if (ttl === -2) return '已过期'
  return `${Math.max(0, Math.round(ttl))}s`
}

/**
 * A small amount of SQL understanding for the console completion popup.
 *
 * The editor only needs two questions answered: which tables does the query
 * already mention, and is the caret in a place where a table name or a column
 * name makes sense? Both live here so they can be unit tested without rendering
 * the console; a real parser would be overkill for an editor popup and would
 * reject half-typed statements, which is exactly the input we get.
 */

export interface TableRef {
  schema?: string
  table: string
  alias?: string
}

export type CompletionContext = 'table' | 'column' | 'any'

/** Words that introduce a relation name. */
const TABLE_STARTERS = new Set(['from', 'join', 'update', 'into', 'table'])

/** Words that introduce (or continue) an expression list where columns fit. */
const COLUMN_STARTERS = new Set([
  'select', 'where', 'on', 'having', 'set', 'by', 'and', 'or', 'using', 'returning',
])

/** Keywords that end an alias scan: `FROM orders WHERE` must not read `WHERE` as an alias. */
const RESERVED = new Set([
  'select', 'from', 'where', 'group', 'order', 'having', 'limit', 'offset', 'join',
  'left', 'right', 'inner', 'outer', 'full', 'cross', 'natural', 'union', 'all',
  'insert', 'into', 'values', 'update', 'set', 'delete', 'on', 'and', 'or', 'not',
  'as', 'by', 'when', 'then', 'else', 'end', 'case', 'exists', 'returning', 'using',
  'fetch', 'for', 'lock', 'table',
])

interface Token {
  text: string
  lower: string
  kind: 'word' | 'punct'
  start: number
}

const WORD_CHAR = /[\p{L}\p{N}_$]/u

/**
 * Replace comments and single-quoted strings with spaces, keeping the length so
 * token offsets still line up with the statement the editor holds.
 */
function mask(statement: string): string {
  const chars = [...statement]
  let index = 0
  while (index < chars.length) {
    const char = chars[index]
    const next = chars[index + 1]
    if (char === '-' && next === '-') {
      while (index < chars.length && chars[index] !== '\n') {
        chars[index] = ' '
        index += 1
      }
      continue
    }
    if (char === '/' && next === '*') {
      chars[index] = ' '
      chars[index + 1] = ' '
      index += 2
      while (index < chars.length) {
        if (chars[index] === '*' && chars[index + 1] === '/') {
          chars[index] = ' '
          chars[index + 1] = ' '
          index += 2
          break
        }
        chars[index] = ' '
        index += 1
      }
      continue
    }
    if (char === "'") {
      chars[index] = ' '
      index += 1
      while (index < chars.length) {
        const inner = chars[index]
        chars[index] = ' '
        index += 1
        if (inner === "'") {
          if (chars[index] === "'") {
            chars[index] = ' '
            index += 1
            continue
          }
          break
        }
      }
      continue
    }
    index += 1
  }
  return chars.join('')
}

function tokenize(statement: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  const push = (text: string, start: number, kind: Token['kind']): void => {
    tokens.push({ text, lower: text.toLowerCase(), kind, start })
  }
  while (index < statement.length) {
    const char = statement[index]
    if (char === undefined) break
    if (/\s/u.test(char)) {
      index += 1
      continue
    }
    if (char === '"' || char === '`') {
      const quote = char
      const start = index
      index += 1
      let text = ''
      while (index < statement.length) {
        const inner = statement[index]
        index += 1
        if (inner === quote) {
          if (statement[index] === quote) {
            text += quote
            index += 1
            continue
          }
          break
        }
        text += inner
      }
      push(text, start, 'word')
      continue
    }
    if (char === '[') {
      const start = index
      index += 1
      let text = ''
      while (index < statement.length && statement[index] !== ']') {
        text += statement[index]
        index += 1
      }
      index += 1
      push(text, start, 'word')
      continue
    }
    if (WORD_CHAR.test(char)) {
      const start = index
      while (index < statement.length && WORD_CHAR.test(statement[index] ?? '')) index += 1
      push(statement.slice(start, index), start, 'word')
      continue
    }
    push(char, index, 'punct')
    index += 1
  }
  return tokens
}

function tokensBefore(statement: string, caret: number): Token[] {
  const limit = Math.max(0, Math.min(caret, statement.length))
  return tokenize(mask(statement)).filter((token) => token.start < limit)
}

function parseRef(
  tokens: readonly Token[],
  index: number,
): { ref: TableRef; next: number } | null {
  let cursor = index
  const first = tokens[cursor]
  if (first === undefined || first.kind !== 'word' || RESERVED.has(first.lower)) return null
  let schema: string | undefined
  let table = first.text
  cursor += 1
  const dot = tokens[cursor]
  const second = tokens[cursor + 1]
  if (dot?.text === '.' && second !== undefined && second.kind === 'word') {
    schema = first.text
    table = second.text
    cursor += 2
  }
  let alias: string | undefined
  const after = tokens[cursor]
  if (after !== undefined && after.lower === 'as') {
    const named = tokens[cursor + 1]
    if (named !== undefined && named.kind === 'word' && !RESERVED.has(named.lower)) {
      alias = named.text
      cursor += 2
    }
  } else if (after !== undefined && after.kind === 'word' && !RESERVED.has(after.lower)) {
    alias = after.text
    cursor += 1
  }
  return { ref: { schema, table, alias }, next: cursor }
}

/**
 * Relations mentioned by `FROM`, `JOIN`, `UPDATE`, `INSERT INTO` and `DELETE
 * FROM` in the text before the caret, with their aliases.
 */
export function referencedTables(statement: string, caret: number): TableRef[] {
  const tokens = tokensBefore(statement, caret)
  const refs: TableRef[] = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token === undefined || token.kind !== 'word') continue
    if (token.lower === 'from') {
      let cursor = index + 1
      while (cursor < tokens.length) {
        const parsed = parseRef(tokens, cursor)
        if (parsed === null) break
        refs.push(parsed.ref)
        cursor = parsed.next
        if (tokens[cursor]?.text === ',') {
          cursor += 1
          continue
        }
        break
      }
    } else if (token.lower === 'join' || token.lower === 'update' || token.lower === 'into' || token.lower === 'table') {
      const parsed = parseRef(tokens, index + 1)
      if (parsed !== null) refs.push(parsed.ref)
    }
  }
  const seen = new Set<string>()
  return refs.filter((ref) => {
    const key = `${ref.schema ?? ''}.${ref.table}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Whether the caret sits where a relation name (`table`) or an expression
 * (`column`) is expected. `any` means "no idea", and the caller falls back to
 * the old schema-level list.
 */
export function completionContext(statement: string, caret: number): CompletionContext {
  const tokens = tokensBefore(statement, caret)
  let index = tokens.length - 1
  if (tokens[index]?.text === ',') index -= 1
  for (let round = 0; round < 24 && index >= 0; round += 1, index -= 1) {
    const token = tokens[index]
    if (token === undefined) break
    if (token.text === ';') return 'any'
    if (token.kind === 'punct') continue
    if (TABLE_STARTERS.has(token.lower)) return 'table'
    if (COLUMN_STARTERS.has(token.lower)) return 'column'
    if (token.lower === 'insert') return 'table'
    if (token.lower === 'delete') return 'any'
  }
  return 'any'
}

/** The relation a qualifier (`alias.` or `table.` or `schema.table.`) points at. */
export function columnOwner(
  refs: readonly TableRef[],
  qualifier: string,
): TableRef | null {
  const needle = qualifier.toLowerCase()
  const byAlias = refs.find((ref) => ref.alias !== undefined && ref.alias.toLowerCase() === needle)
  if (byAlias !== undefined) return byAlias
  const byTable = refs.find((ref) => ref.table.toLowerCase() === needle)
  return byTable ?? null
}
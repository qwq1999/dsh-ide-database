/**
 * Work out what the caret's statement looks like: which relations it mentions,
 * which kind of name the caret position expects and which qualifier is already
 * typed.
 *
 * The parser is intentionally tolerant. It reads a token stream with comments
 * and string literals blanked out, so a half-written `FROM shop.` or a stray
 * `JOIN orders o` never throws — it just produces the relations found so far.
 */
import { qualifierBefore, wordAtCaret } from './edit'
import {
  isInsideCommentOrString,
  maskCommentsAndStrings,
  tokenize,
  type Token,
} from './tokenizer'
import type {
  Analysis,
  CompletionExpectation,
  CompletionRelation,
  WordAtCaret,
} from './types'

/** Keywords that introduce a relation (a table, view or derived table). */
const RELATION_STARTERS = new Set(['from', 'join', 'into', 'update', 'table'])

/** Clause words that add another relation after a FROM item. */
const MORE_RELATIONS = new Set(['join', 'left', 'right', 'inner', 'full', 'cross', 'natural'])

/**
 * The single relation a `SELECT *` body expands to. Only an unambiguous
 * `FROM <table>` with no JOIN or comma qualifies; anything else stays unknown.
 */
function starSource(body: readonly Token[]): CompletionRelation['source'] | undefined {
  let depth = 0
  let fromIndex = -1
  for (let index = 0; index < body.length; index += 1) {
    const token = body[index] as Token
    if (token.kind === 'punct') {
      if (token.text === '(') depth += 1
      else if (token.text === ')') depth = Math.max(0, depth - 1)
      continue
    }
    if (depth === 0 && token.kind === 'keyword' && token.lower === 'from') {
      fromIndex = index
      break
    }
  }
  if (fromIndex < 0) return undefined
  const parsed = parseRelationRef(body, fromIndex + 1)
  if (parsed === null || parsed.relation.table === '') return undefined
  const rest = body[parsed.next]
  if (rest !== undefined) {
    if (rest.kind === 'punct' && (rest.text === ',' || rest.text === ')')) return undefined
    if (rest.kind === 'keyword' && MORE_RELATIONS.has(rest.lower)) return undefined
  }
  return {
    ...(parsed.relation.schema === undefined ? {} : { schema: parsed.relation.schema }),
    table: parsed.relation.table,
  }
}

/**
 * What the caret expects after each clause word. Words that start a statement
 * but do not pin a clause (`insert`, `delete`, `explain`, ...) are absent and
 * fall through to `any`.
 */
const EXPECTED_AFTER = new Map<string, CompletionExpectation>([
  // relation position
  ['from', 'relation'],
  ['join', 'relation'],
  ['into', 'relation'],
  ['update', 'relation'],
  ['table', 'relation'],
  // column position
  ['select', 'column'],
  ['where', 'column'],
  ['on', 'column'],
  ['having', 'column'],
  ['set', 'column'],
  ['by', 'column'],
  ['using', 'column'],
  ['returning', 'column'],
  ['values', 'column'],
  ['group', 'column'],
  ['order', 'column'],
  ['and', 'column'],
  ['or', 'column'],
  ['not', 'column'],
  ['null', 'column'],
  ['true', 'column'],
  ['false', 'column'],
  ['between', 'column'],
  ['like', 'column'],
  ['in', 'column'],
  ['is', 'column'],
  ['case', 'column'],
  ['when', 'column'],
  ['then', 'column'],
  ['else', 'column'],
  ['end', 'column'],
  ['distinct', 'column'],
  ['exists', 'column'],
  ['asc', 'column'],
  ['desc', 'column'],
  ['escape', 'column'],
  ['collate', 'column'],
  ['interval', 'column'],
  ['over', 'column'],
  ['partition', 'column'],
  ['filter', 'column'],
  // alias position
  ['as', 'alias'],
  // schema object position
  ['use', 'schema'],
  ['create', 'schema'],
  ['drop', 'schema'],
  ['alter', 'schema'],
])

/** Clamp the caret and return `[start, end)` of the statement around it. */
function statementBounds(masked: string, at: number, length: number): { start: number; end: number } {
  let start = 0
  for (let index = 0; index < at; index += 1) {
    if (masked[index] === ';') start = index + 1
  }
  let end = length
  for (let index = at; index < masked.length; index += 1) {
    if (masked[index] === ';') {
      end = index
      break
    }
  }
  return { start, end }
}

function previousKeyword(tokens: readonly Token[], index: number): string | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor] as Token
    if (token.kind === 'keyword') return token.lower
  }
  return null
}

/**
 * True when the caret sits inside a `CREATE TABLE` body. Those parentheses
 * hold column definitions (`PRIMARY KEY`, `NOT NULL`), not relations.
 */
function insideCreateTableParen(tokens: readonly Token[]): boolean {
  let table = -1
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'keyword') continue
    if (token.lower === 'create' || token.lower === 'alter') {
      table = -1
      continue
    }
    if (token.lower === 'as' || token.lower === 'like') return false
    if (token.lower === 'table') table = index
    if (token.lower === 'select' && table >= 0) return false
  }
  if (table < 0) return false
  let depth = 0
  let opened = false
  for (let index = table + 1; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === '(') {
      depth += 1
      opened = true
    } else if (token.text === ')') {
      depth -= 1
    }
  }
  return opened && depth > 0
}

/**
 * True when the caret sits at the start of a parenthesised subquery body:
 * `WITH x AS (`, `CREATE VIEW v AS (`, `SELECT * FROM (`. The next token must
 * be a statement keyword (`SELECT`), not a relation or an alias.
 */
function startsSubquery(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'punct' || last.text !== '(') return false
  const before = previousKeyword(tokens, tokens.length - 1)
  return before === 'as' || before === 'from' || before === 'exists' || before === 'in'
}

/** `INSERT INTO t (cols) ` is complete and expects the row source. */
function insertColumnListComplete(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'insert') return false
  if (tokens.some((token) => token.kind === 'keyword' && token.lower === 'values')) return false
  let depth = 0
  let close = -1
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === '(') depth += 1
    else if (token.text === ')' && depth > 0) {
      depth -= 1
      if (depth === 0) close = index
    }
  }
  return close >= 0 && close === tokens.length - 1
}

/** `JOIN ... USING (id) ` is complete; only clause tails remain. */
function usingTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'punct' || last.text !== ')') return false
  let depth = 0
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === ')') depth += 1
    else if (token.text === '(') {
      depth -= 1
      if (depth === 0) {
        const owner = tokens[index - 1] as Token | undefined
        return owner?.text.toLowerCase() === 'using'
      }
    }
  }
  return false
}

/**
 * Index of the `ON` that introduces the table of a `CREATE INDEX` statement,
 * or -1. That position names a relation, and its columns follow.
 */
function createIndexOn(tokens: readonly Token[]): number {
  let create = false
  let index = -1
  for (let cursor = 0; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor] as Token
    if (token.kind !== 'keyword') continue
    if (token.lower === 'create') {
      create = true
      continue
    }
    if (create && token.lower === 'index') {
      index = cursor
      continue
    }
    if (index >= 0 && token.lower === 'on') return cursor
  }
  return -1
}

/** True when the caret follows the `ON` of a `GRANT`/`REVOKE` statement. */
function grantTarget(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'keyword' || last.lower !== 'on') return false
  const first = tokens[0]
  if (first === undefined) return false
  const start = first.text.toLowerCase()
  return start === 'grant' || start === 'revoke'
}

/** `DESCRIBE ` / `DESC ` name a table, not a column. */
function describesTable(tokens: readonly Token[]): boolean {
  if (tokens.length !== 1) return false
  const only = tokens[0] as Token
  const lower = only.text.toLowerCase()
  return lower === 'describe' || lower === 'desc'
}

/** After `DESCRIBE orders ` only an optional column name remains. */
function describeTableTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined) return false
  const start = first.text.toLowerCase()
  return (start === 'describe' || start === 'desc') && tokens.length >= 2
}

/** `DROP TABLE orders ` / `TRUNCATE TABLE orders ` already named the object. */
function tableNameTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  const second = tokens[1]
  if (first === undefined || second === undefined) return false
  const start = first.text.toLowerCase()
  if ((start !== 'drop' && start !== 'truncate') || second.text.toLowerCase() !== 'table') {
    return false
  }
  return tokens.length >= 3
}

/** `RENAME TABLE orders TO ` names the new table, which only the user knows. */
function renameTableTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  const last = tokens[tokens.length - 1]
  if (first === undefined || last === undefined) return false
  if (first.text.toLowerCase() !== 'rename' || tokens[1]?.text.toLowerCase() !== 'table') return false
  return last.kind === 'keyword' && last.lower === 'to'
}

/** `DROP INDEX idx ON ` names the table that owns the index. */
function dropIndexOn(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'keyword' || last.lower !== 'on') return false
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'drop') return false
  return tokens.some((token) => token.text.toLowerCase() === 'index')
}

/**
 * True inside the parenthesis of `ALTER TABLE ... ADD INDEX/KEY name (...)`;
 * that list holds columns, not column definitions.
 */
function alterIndexColumns(tokens: readonly Token[]): boolean {
  const start = alterTableStart(tokens)
  if (start < 0) return false
  const action = tokens[start]
  if (action === undefined || action.lower !== 'add') return false
  const markers = new Set(['index', 'key', 'primary', 'unique', 'constraint', 'foreign', 'check'])
  let marked = false
  let index = start + 1
  while (index < tokens.length) {
    const token = tokens[index] as Token
    const lower = token.text.toLowerCase()
    if (markers.has(lower)) marked = true
    if (token.kind === 'punct' && token.text === '(') break
    index += 1
  }
  if (index >= tokens.length || !marked) return false
  let depth = 0
  for (let cursor = index; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor] as Token
    if (token.kind !== 'punct') continue
    if (token.text === '(') depth += 1
    else if (token.text === ')') depth -= 1
  }
  return depth > 0
}

/** `LIMIT `/`OFFSET ` take a number, not a catalog name. */
function limitCount(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return false
  if (last.kind === 'keyword' && (last.lower === 'limit' || last.lower === 'offset')) return true
  // MySQL's `LIMIT 10, ` form: the row count follows the comma and is a number.
  if (last.kind !== 'punct' || last.text !== ',') return false
  let cursor = tokens.length - 2
  let numbers = 0
  while (cursor >= 0) {
    const token = tokens[cursor] as Token
    if (token.kind === 'number') {
      numbers += 1
      cursor -= 1
      continue
    }
    if (token.kind === 'punct' && token.text === ',') {
      cursor -= 1
      continue
    }
    break
  }
  const keyword = tokens[cursor]
  return (
    numbers > 0 && keyword !== undefined && keyword.kind === 'keyword' && keyword.lower === 'limit'
  )
}

/** A finished `LIMIT 10 [`/`OFFSET 5 ` tail takes no catalog names. */
function limitTail(tokens: readonly Token[]): boolean {
  let cursor = tokens.length - 1
  while (cursor >= 0) {
    const token = tokens[cursor] as Token
    if (token.kind === 'number' || (token.kind === 'punct' && token.text === ',')) {
      cursor -= 1
      continue
    }
    return token.kind === 'keyword' && (token.lower === 'limit' || token.lower === 'offset')
  }
  return false
}

/** `CREATE TABLE ... ENGINE = ` names a storage engine. */
function createTableEngine(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'create') return false
  const last = tokens[tokens.length - 1]
  const previous = tokens[tokens.length - 2]
  if (last === undefined) return false
  if (last.text.toLowerCase() === 'engine') return true
  return (
    last.kind === 'punct' &&
    last.text === '=' &&
    previous !== undefined &&
    previous.text.toLowerCase() === 'engine'
  )
}

/**
 * What a `SET ` statement expects. Session variables and literals are user
 * text, so the catalog has nothing to add here.
 */
function setStatement(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]
  if (first === undefined || first.kind !== 'keyword' || first.lower !== 'set') return undefined
  const last = tokens[tokens.length - 1]
  if (last === undefined || (first === last && tokens.length === 1)) return 'set'
  if (last.kind === 'punct' && last.text === '=') return 'value'
  const lower = last.text.toLowerCase()
  if (lower === 'names' || lower === 'charset') return 'charset'
  if (tokens.length === 2 && last.kind === 'ident') {
    const known = new Set(['session', 'global', 'local', 'transaction', 'character', 'password', 'role'])
    if (known.has(lower)) return 'set'
  }
  // `SET NAMES utf8mb4 ` and other literal tails: stay quiet.
  return 'number'
}

/** `CAST(value AS ` names a type, not a table or a column. */
function castAs(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'keyword' || last.lower !== 'as') return false
  let opened = false
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'keyword') return false
    if (token.kind === 'punct' && token.text === '(') opened = true
    if (token.kind === 'ident' && token.text.toLowerCase() === 'cast') return opened
  }
  return false
}

/** `ON DUPLICATE KEY UPDATE ` assigns columns of the inserted table. */
function duplicateKeyUpdate(tokens: readonly Token[]): boolean {
  if (tokens.length < 4) return false
  const tail = tokens.slice(tokens.length - 4).map((token) => token.text.toLowerCase())
  return tail[0] === 'on' && tail[1] === 'duplicate' && tail[2] === 'key' && tail[3] === 'update'
}

/**
 * True when an `INSERT ... VALUES (...)` tuple list is balanced and the caret
 * sits after the last closing parenthesis: only more tuples or the duplicate
 * key clause can follow.
 */
function valuesListComplete(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'insert') return false
  const valuesAt = tokens.findIndex((token) => token.kind === 'keyword' && token.lower === 'values')
  if (valuesAt < 0) return false
  let depth = 0
  let sawParen = false
  for (let index = valuesAt + 1; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === '(') {
      depth += 1
      sawParen = true
    } else if (token.text === ')' && depth > 0) {
      depth -= 1
    }
  }
  const last = tokens[tokens.length - 1]
  return sawParen && depth === 0 && last?.kind === 'punct' && last.text === ')'
}

/** `DEFAULT CHARSET ` / `CHARACTER SET ` name a character set. */
function charsetValue(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  const previous = tokens[tokens.length - 2]
  if (last === undefined) return false
  if (last.text.toLowerCase() === 'charset') return true
  return (
    last.kind === 'keyword' &&
    last.lower === 'set' &&
    previous !== undefined &&
    previous.text.toLowerCase() === 'character'
  )
}

/**
 * `CREATE TABLE … COMMENT `/`DEFAULT `/`COLLATE ` tails take user text
 * (a comment, a default expression, a collation name), not catalog names.
 */
function tableOptionValue(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'create') return undefined
  if (!tokens.some((token) => token.text.toLowerCase() === 'table')) return undefined
  const last = tokens[tokens.length - 1]
  const previous = tokens[tokens.length - 2]
  if (last === undefined) return undefined
  const lower = last.text.toLowerCase()
  if (lower === 'comment') return 'name'
  if (lower === 'collate') return 'number'
  if (lower === 'default') return 'value'
  if (last.kind === 'punct' && last.text === '=') {
    return previous?.text.toLowerCase() === 'comment' ? 'name' : undefined
  }
  return undefined
}

/** After `ENGINE = InnoDB `/`DEFAULT CHARSET utf8mb4 ` more table options follow. */
function afterTableOptionValue(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'create') return false
  const last = tokens[tokens.length - 1]
  const secondLast = tokens[tokens.length - 2]
  const thirdLast = tokens[tokens.length - 3]
  if (last === undefined || last.kind !== 'ident') return false
  if (secondLast === undefined) return false
  if (thirdLast !== undefined && thirdLast.text.toLowerCase() === 'engine' && secondLast.text === '=') {
    return true
  }
  if (secondLast.text.toLowerCase() === 'charset') return true
  return secondLast.lower === 'set' && thirdLast?.text.toLowerCase() === 'character'
}

/** Statements whose next word is a name only the user knows. */
function objectName(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  const second = tokens[1]
  if (first === undefined || second === undefined) return false
  const start = first.text.toLowerCase()
  const next = second.text.toLowerCase()
  if (start === 'drop' && next === 'index') return true
  if (start !== 'create') return false
  return next === 'database' || next === 'schema' || next === 'user' || next === 'role'
    || next === 'sequence' || next === 'trigger'
}

/** `GRANT ... TO ` / `REVOKE ... FROM ` name a user, not a relation. */
function grantee(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  const last = tokens[tokens.length - 1]
  if (first === undefined || last === undefined) return false
  const start = first.text.toLowerCase()
  if (start !== 'grant' && start !== 'revoke') return false
  return last.kind === 'keyword' && (last.lower === 'to' || last.lower === 'from')
}

/** `EXPLAIN ` / `EXPLAIN ANALYZE ` is followed by the statement it explains. */
function explainStart(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'explain') return false
  if (tokens.length === 1) return true
  const second = tokens[1] as Token
  const secondText = second.text.toLowerCase()
  if (tokens.length === 2 && secondText === 'analyze') return true
  // `EXPLAIN FORMAT=TREE ` / `EXPLAIN FORMAT JSON ` still precede the statement.
  return tokens.length >= 3 && secondText === 'format'
}

/** `UNION ` / `UNION ALL ` start another SELECT, not a table list. */
function unionStatement(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return false
  const lower = last.text.toLowerCase()
  if (lower === 'union') return true
  const previous = tokens[tokens.length - 2]
  return lower === 'all' && previous !== undefined && previous.text.toLowerCase() === 'union'
}

/** Bare `CREATE TABLE t AS ` (no body yet) continues with a statement. */
function createTableAs(tokens: readonly Token[]): boolean {
  const words = tokens.map((token) => token.text.toLowerCase())
  const tableAt = words[1] === 'table' ? 1 : words[1] === 'temporary' && words[2] === 'table' ? 2 : -1
  if (tableAt < 0) return false
  return words[words.length - 1] === 'as' && !words.includes('(')
}

/** `CREATE VIEW v AS ` and friends continue with a statement, like a table. */
function createViewAs(tokens: readonly Token[]): boolean {
  const words = tokens.map((token) => token.text.toLowerCase())
  if (words[0] !== 'create' || words[words.length - 1] !== 'as') return false
  const object = words[1] === 'or' ? words[3] : words[1]
  return object === 'view' || object === 'trigger' || object === 'event'
}

/** `CREATE TABLE t LIKE ` copies another table. */
function createTableLike(tokens: readonly Token[]): boolean {
  const words = tokens.map((token) => token.text.toLowerCase())
  const tableAt = words[1] === 'table' ? 1 : words[1] === 'temporary' && words[2] === 'table' ? 2 : -1
  return tableAt >= 0 && words[words.length - 1] === 'like'
}

/** `WITH x AS (…select…) ` is followed by the main statement. */
function afterCteDefinition(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  const last = tokens[tokens.length - 1]
  return (
    first !== undefined &&
    first.text.toLowerCase() === 'with' &&
    last !== undefined &&
    last.kind === 'punct' &&
    last.text === ')'
  )
}

/** `SHOW ` tails that name a catalog object or have nothing left to offer. */
function showTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'show') return undefined
  const words = tokens.map((token) => token.text.toLowerCase())
  const second = words[1]
  if (second === 'create') {
    const object = words[2]
    if (object === 'database' || object === 'schema') return 'schema'
    if (object === 'table' || object === 'view') return words.length > 3 ? 'name' : 'relation'
    return undefined
  }
  const from = words.indexOf('from')
  const inDatabase = words.indexOf('in')
  if (second === 'tables') {
    if (from < 0 && inDatabase < 0) return 'number'
    if (from === words.length - 1 || inDatabase === words.length - 1) return 'schema'
    return 'number'
  }
  if (second === 'full' && words[2] === 'tables') {
    if (from < 0 && inDatabase < 0) return 'number'
    if (from === words.length - 1 || inDatabase === words.length - 1) return 'schema'
    return 'number'
  }
  if (second === 'table' && words[2] === 'status') {
    if (from < 0) return 'number'
    return from === words.length - 1 ? 'schema' : 'number'
  }
  if (
    second === 'columns' ||
    second === 'fields' ||
    second === 'index' ||
    second === 'indexes' ||
    second === 'keys'
  ) {
    if (from >= 0 && from < tokens.length - 1) return 'name'
    return undefined
  }
  if (second === 'grants' && words.length > 2) return 'name'
  if (words[words.length - 1] === 'like') return 'name'
  if (
    second === 'engines' ||
    second === 'warnings' ||
    second === 'errors' ||
    second === 'processlist'
  ) {
    return 'number'
  }
  return undefined
}

/** `SHOW ` names a catalog list (`SHOW TABLES`, `SHOW STATUS`, ...). */
function showStart(tokens: readonly Token[]): boolean {
  return tokens.length <= 2 && tokens[0]?.text.toLowerCase() === 'show'
}

const ALTER_ACTIONS = new Set(['add', 'drop', 'modify', 'change', 'rename', 'alter'])

/**
 * Index right after the table named by `ALTER TABLE`, the position where the
 * alter action (`ADD`, `DROP`, `MODIFY`, ...) belongs; -1 when the caret sits
 * somewhere else.
 */
function alterTableStart(tokens: readonly Token[]): number {
  const alter = tokens[0]
  const table = tokens[1]
  if (
    alter === undefined ||
    table === undefined ||
    alter.kind !== 'keyword' ||
    alter.lower !== 'alter' ||
    table.kind !== 'keyword' ||
    table.lower !== 'table'
  ) {
    return -1
  }
  let index = 2
  const first = tokens[index]
  if (first === undefined) return -1
  // `ALTER TABLE IF EXISTS name`; the tolerant tokenizer may see them as names.
  if (first.text.toLowerCase() === 'if') {
    const exists = tokens[index + 1]
    if (exists === undefined || exists.text.toLowerCase() !== 'exists') return -1
    index += 2
  }
  const name = tokens[index]
  if (name === undefined || name.kind !== 'ident') return -1
  index += 1
  const dot = tokens[index]
  const second = tokens[index + 1]
  if (dot !== undefined && dot.kind === 'punct' && dot.text === '.' && second !== undefined && second.kind === 'ident') {
    index += 2
  }
  return index
}

/**
 * What an `ALTER TABLE <name>` position expects: the action itself, the object
 * the action targets, or the column that a column action names next.
 */
function alterExpectation(tokens: readonly Token[]): CompletionExpectation | undefined {
  const start = alterTableStart(tokens)
  if (start < 0) return undefined
  const action = tokens[start]
  if (action === undefined) return 'alter'
  if (action.kind !== 'keyword' || !ALTER_ACTIONS.has(action.lower)) return undefined
  const object = tokens[start + 1]
  if (object === undefined) {
    // `MODIFY`/`CHANGE` name an existing column first; the others name an object.
    return action.lower === 'modify' || action.lower === 'change' ? 'column' : 'alterObject'
  }
  if (object.kind !== 'keyword' || tokens[start + 2] !== undefined) {
    // `ALTER TABLE ... RENAME TO <new name> ` already named the table; there is
    // nothing left for the catalog to offer.
    if (
      action.lower === 'rename' &&
      object.kind === 'keyword' &&
      object.lower === 'to' &&
      tokens[start + 2] !== undefined
    ) {
      return 'number'
    }
    // `ADD COLUMN x INT ` still takes column options (NOT NULL, COMMENT, ...).
    if (action.lower === 'add' && (object.lower === 'column' || object.kind === 'ident')) {
      const last = tokens[tokens.length - 1]
      if (last?.kind === 'keyword') {
        if (last.lower === 'comment') return 'name'
        if (last.lower === 'default') return 'value'
        if (last.lower === 'collate') return 'number'
      }
      return 'definition'
    }
    return undefined
  }
  switch (action.lower) {
    case 'add':
      return object.lower === 'column' ? 'definition' : undefined
    case 'drop':
      return object.lower === 'column' ? 'column' : undefined
    case 'modify':
    case 'change':
      return object.lower === 'column' ? 'column' : undefined
    case 'rename':
      if (object.lower === 'column') return 'column'
      // `RENAME TO ` names the *new* table, which only the user knows.
      return object.lower === 'to' ? 'name' : undefined
    default:
      return undefined
  }
}

/**
 * True when the caret sits right after `IF EXISTS`: the guarded object name is
 * still a relation, and `EXISTS` must not be read as a boolean operator.
 */
function trailingIfExists(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  const ifToken = tokens[tokens.length - 2]
  const object = tokens[tokens.length - 3]
  return (
    last !== undefined &&
    last.kind === 'keyword' &&
    last.lower === 'exists' &&
    ifToken !== undefined &&
    ifToken.kind === 'ident' &&
    ifToken.lower === 'if' &&
    object !== undefined &&
    object.kind === 'keyword' &&
    (object.lower === 'table' || object.lower === 'view')
  )
}

/**
 * What follows the closing parenthesis of a `CREATE TABLE` body: table options,
 * or a keyword position when the tail starts with `AS` (`CREATE TABLE ... AS
 * SELECT ...`); undefined for every other position.
 */
function createTableBodyTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const last = tokens[tokens.length - 1]
  const previous = tokens[tokens.length - 2]
  const asTail = last !== undefined && last.kind === 'keyword' && last.lower === 'as'
  const close = last !== undefined && last.kind === 'punct' && last.text === ')'
  if (!close && !asTail) return undefined
  if (asTail && !(previous !== undefined && previous.kind === 'punct' && previous.text === ')')) {
    return undefined
  }
  const first = tokens[0]
  const second = tokens[1]
  if (first?.kind !== 'keyword' || first.lower !== 'create') return undefined
  if (second === undefined || (second.lower !== 'table' && second.lower !== 'temporary')) {
    return undefined
  }
  if (second.lower === 'temporary' && tokens[2]?.lower !== 'table') return undefined
  let depth = 0
  for (const token of tokens) {
    if (token.kind !== 'punct') continue
    if (token.text === '(') depth += 1
    else if (token.text === ')') depth -= 1
    if (depth < 0) return undefined
  }
  if (depth !== 0) return undefined
  return asTail ? 'keyword' : 'tableOptions'
}

/** Tokens that can end an expression inside a condition. */
function endsOperand(token: Token | undefined): boolean {
  if (token === undefined) return false
  if (
    token.kind === 'ident' ||
    token.kind === 'number' ||
    token.kind === 'param' ||
    token.kind === 'string'
  ) {
    return true
  }
  if (token.kind === 'punct' && token.text === ')') return true
  return (
    token.kind === 'keyword' &&
    (token.lower === 'null' || token.lower === 'true' || token.lower === 'false')
  )
}

const CONDITION_CLAUSES = new Set(['where', 'having', 'on'])
const CONDITION_BREAKS = new Set([
  'select',
  'from',
  'group',
  'order',
  'limit',
  'offset',
  'union',
  'set',
  'into',
  'values',
  'using',
  'returning',
])
const COMPARATORS = new Set(['=', '<', '>', '!'])
const COMPARISON_KEYWORDS = new Set(['like', 'in', 'is', 'between', 'not', 'regexp', 'and', 'or'])

/** A complete expression (`COUNT(*)`, `CASE ... END`) still takes a next clause. */
function completedExpression(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return false
  if (last.kind === 'keyword' && last.lower === 'end') return true
  if (last.kind !== 'punct' || last.text !== ')') return false
  let depth = 0
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === ')') depth += 1
    else if (token.text === '(') {
      if (depth === 0) {
        // A function call closes an expression; a grouped condition does not.
        return tokens[index - 1]?.kind === 'ident'
      }
      depth -= 1
    }
  }
  return false
}

/** `SELECT COUNT(*) ` takes AS/FROM; `WHERE CASE WHEN ... END ` takes an operator. */
function expressionTail(tokens: readonly Token[]): 'comparison' | 'expressionTail' | undefined {
  if (!completedExpression(tokens)) return undefined
  let depth = 0
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === ')') depth += 1
      else if (token.text === '(' && depth > 0) depth -= 1
      continue
    }
    if (token.kind !== 'keyword' || depth > 0) continue
    if (token.lower === 'where' || token.lower === 'having' || token.lower === 'on') {
      return 'comparison'
    }
    if (token.lower === 'select') return 'expressionTail'
    if (CONDITION_BREAKS.has(token.lower)) return undefined
  }
  return undefined
}

/** `WHERE total ` needs a comparison; `WHERE id = 1 ` needs a connector. */
function conditionOperator(tokens: readonly Token[]): 'comparison' | 'boolean' | undefined {
  if (!endsOperand(tokens[tokens.length - 1])) return undefined
  let inCondition = false
  let depth = 0
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === ')') depth += 1
      else if (token.text === '(') {
        // An IN-list or grouped operand does not leave the clause.
        if (depth === 0) continue
        depth -= 1
      }
      continue
    }
    if (token.kind !== 'keyword' || depth > 0) continue
    if (CONDITION_CLAUSES.has(token.lower)) {
      inCondition = true
      break
    }
    if (CONDITION_BREAKS.has(token.lower)) return undefined
  }
  if (!inCondition) return undefined
  // Walk back over the operand (including `o.user_id` paths and IN-list groups)
  // to find its operator.
  let index = tokens.length - 2
  depth = 0
  for (;;) {
    const token = tokens[index]
    if (token === undefined) break
    if (token.kind === 'punct') {
      if (token.text === ')') {
        depth += 1
        index -= 1
        continue
      }
      if (token.text === '(') {
        if (depth > 0) {
          depth -= 1
          index -= 1
          continue
        }
        index -= 1
        break
      }
      if (token.text === ',' && depth === 0) {
        index -= 1
        continue
      }
      if (token.text === '.' && depth === 0) {
        index -= 1
        continue
      }
      break
    }
    if (depth > 0) {
      index -= 1
      continue
    }
    if (
      token.kind === 'ident' ||
      token.kind === 'number' ||
      token.kind === 'param' ||
      token.kind === 'string'
    ) {
      index -= 1
      continue
    }
    break
  }
  const before = tokens[index]
  const compared =
    before !== undefined &&
    ((before.kind === 'punct' && COMPARATORS.has(before.text)) ||
      (before.kind === 'keyword' && COMPARISON_KEYWORDS.has(before.lower)))
  return compared ? 'boolean' : 'comparison'
}

/** `ORDER BY total ` needs ASC/DESC; `ORDER BY total DESC ` takes LIMIT. */
function orderByPosition(tokens: readonly Token[]): 'direction' | 'orderTail' | undefined {
  const last = tokens[tokens.length - 1]
  const finished = endsOperand(last)
  const directed =
    last !== undefined &&
    last.kind === 'keyword' &&
    (last.lower === 'asc' || last.lower === 'desc')
  if (!finished && !directed) return undefined
  let depth = 0
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === ')') depth += 1
      else if (token.text === '(') {
        if (depth === 0) break
        depth -= 1
      }
      continue
    }
    if (token.kind !== 'keyword' || depth > 0) continue
    const previous = tokens[index - 1]
    if (token.lower === 'by' && previous?.kind === 'keyword' && previous.lower === 'order') {
      return directed ? 'orderTail' : 'direction'
    }
    if (CONDITION_BREAKS.has(token.lower) || token.lower === 'by') return undefined
  }
  return undefined
}

/** `GROUP BY status ` takes HAVING/ORDER/LIMIT; `GROUP BY status, ` takes a column. */
function groupByPosition(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  const finished =
    last !== undefined &&
    ((last.kind === 'keyword' && last.lower === 'rollup') || endsOperand(last))
  if (!finished) return false
  let depth = 0
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === ')') depth += 1
      else if (token.text === '(') {
        if (depth === 0) break
        depth -= 1
      }
      continue
    }
    if (token.kind !== 'keyword' || depth > 0) continue
    const previous = tokens[index - 1]
    if (token.lower === 'by' && previous?.kind === 'keyword' && previous.lower === 'group') {
      return true
    }
    // Another clause since GROUP BY means this operand belongs to it.
    if (
      token.lower === 'having' ||
      token.lower === 'where' ||
      token.lower === 'on' ||
      token.lower === 'select'
    ) {
      return false
    }
    if (CONDITION_BREAKS.has(token.lower) || token.lower === 'by') return false
  }
  return false
}

/** `FOR UPDATE ` / `FOR SHARE ` / `LOCK IN SHARE MODE ` end the statement. */
function lockClauseTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return false
  const lower = last.text.toLowerCase()
  if (lower === 'update' || lower === 'share') {
    const previous = tokens[tokens.length - 2]
    return previous !== undefined && previous.text.toLowerCase() === 'for'
  }
  if (lower !== 'mode' || tokens.length < 4) return false
  const tail = tokens.slice(tokens.length - 4).map((token) => token.text.toLowerCase())
  return tail[0] === 'lock' && tail[1] === 'in' && tail[2] === 'share' && tail[3] === 'mode'
}

/**
 * `INSERT ... SET col = ` takes a value; once the value is written the
 * statement is complete (`SET a = 1, ` still takes another column).
 */
function insertSetPosition(tokens: readonly Token[]): 'number' | 'value' | undefined {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'insert') return undefined
  if (!tokens.some((token) => token.kind === 'keyword' && token.lower === 'set')) return undefined
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  if (last.kind === 'punct' && last.text === '=') return 'value'
  if (last.kind === 'punct') return undefined
  return endsOperand(last) ? 'number' : undefined
}

/**
 * The kind of name the caret position expects, found by walking back to the
 * nearest clause word. Separators (`,`, `(`, `.`) are skipped on the way.
 */
function expectationAt(tokens: readonly Token[]): CompletionExpectation {  if (alterIndexColumns(tokens)) return 'column'
  if (insideCreateTableParen(tokens)) return 'definition'
  const tableTail = createTableBodyTail(tokens)
  if (tableTail !== undefined) return tableTail
  if (createTableAs(tokens)) return 'statement'
  if (createViewAs(tokens) || afterCteDefinition(tokens)) return 'statement'
  if (createTableLike(tokens)) return 'relation'
  const alter = alterExpectation(tokens)
  if (alter !== undefined) return alter
  const indexOn = createIndexOn(tokens)
  if (indexOn >= 0) {
    const target = parseRelationRef(tokens, indexOn + 1)
    if (target === null) return 'relation'
    // `... ON orders (` takes index columns; once that list closes there is
    // nothing left for the catalog to offer.
    let depth = 0
    let sawParen = false
    for (let cursor = target.next; cursor < tokens.length; cursor += 1) {
      const token = tokens[cursor] as Token
      if (token.kind !== 'punct') continue
      if (token.text === '(') {
        depth += 1
        sawParen = true
      } else if (token.text === ')' && depth > 0) {
        depth -= 1
      }
    }
    return sawParen && depth === 0 ? 'number' : 'column'
  }
  if (startsSubquery(tokens)) return 'keyword'
  if (trailingIfExists(tokens)) return 'relation'
  if (tableNameTail(tokens)) return 'number'
  if (renameTableTail(tokens)) return 'name'
  if (lockClauseTail(tokens)) return 'number'
  const insertSet = insertSetPosition(tokens)
  if (insertSet !== undefined) return insertSet
  if (insertColumnListComplete(tokens)) return 'insertSource'
  if (usingTail(tokens)) return 'joinTail'
  if (grantTarget(tokens)) return 'relation'
  if (describesTable(tokens)) return 'relation'
  if (describeTableTail(tokens)) return 'name'
  if (dropIndexOn(tokens)) return 'relation'
  if (objectName(tokens)) return 'name'
  if (grantee(tokens)) return 'name'
  if (unionStatement(tokens)) return 'statement'
  if (explainStart(tokens)) return 'statement'
  const show = showTail(tokens)
  if (show !== undefined) return show
  if (showStart(tokens)) return 'show'
  if (limitCount(tokens)) return 'number'
  if (limitTail(tokens)) return 'number'
  if (createTableEngine(tokens)) return 'engine'
  if (charsetValue(tokens)) return 'charset'
  const optionValue = tableOptionValue(tokens)
  if (optionValue !== undefined) return optionValue
  if (afterTableOptionValue(tokens)) return 'tableOptions'
  const set = setStatement(tokens)
  if (set !== undefined) return set
  if (duplicateKeyUpdate(tokens)) return 'column'
  if (valuesListComplete(tokens)) return 'insertTail'
  if (castAs(tokens)) return 'type'
  const expression = expressionTail(tokens)
  if (expression !== undefined) return expression
  const last = tokens[tokens.length - 1]
  const before = tokens[tokens.length - 2]
  if (
    last?.kind === 'keyword' &&
    last.lower === 'not' &&
    before?.kind === 'keyword' &&
    before.lower === 'is'
  ) {
    // `IS NOT ` only takes NULL/TRUE/FALSE.
    return 'value'
  }
  // `IS ` takes a literal predicate, and a bare `NOT ` takes an operator.
  if (last?.kind === 'keyword' && last.lower === 'is') return 'value'
  if (last?.kind === 'keyword' && last.lower === 'not') return 'comparison'
  const order = orderByPosition(tokens)
  if (order !== undefined) return order
  if (groupByPosition(tokens)) return 'groupTail'
  const operator = conditionOperator(tokens)
  if (operator !== undefined) return operator
  let sawOpenParen = false
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === '(') sawOpenParen = true
      continue
    }
    if (token.kind !== 'keyword') continue
    // `INSERT ... VALUES (` expects a literal or a function, not table columns.
    if (token.lower === 'values') return 'value'
    // `INSERT INTO orders (id, ` is a column list even though the nearest
    // clause word (INTO) normally expects a relation.
    if (token.lower === 'insert') return sawOpenParen ? 'column' : 'any'
    if (token.lower === 'into' && sawOpenParen && previousKeyword(tokens, index) === 'insert') {
      return 'column'
    }
    return EXPECTED_AFTER.get(token.lower) ?? 'any'
  }
  return 'any'
}

/** Optional `AS alias` / bare `alias` after a relation reference. */
function aliasAt(tokens: readonly Token[], index: number): { alias?: string; next: number } {
  const token = tokens[index]
  if (token === undefined) return { next: index }
  if (token.kind === 'keyword' && token.lower === 'as') {
    const name = tokens[index + 1]
    if (name !== undefined && name.kind === 'ident') return { alias: name.text, next: index + 2 }
    return { name: undefined, next: index + 1 } as { alias?: string; next: number }
  }
  if (token.kind === 'ident') return { alias: token.text, next: index + 1 }
  return { next: index }
}

/** Drop a leading DISTINCT/ALL from one SELECT-list item. */
function stripSelectModifiers(tokens: readonly Token[]): readonly Token[] {
  let index = 0
  while (index < tokens.length) {
    const token = tokens[index] as Token
    if (token.kind === 'keyword' && (token.lower === 'distinct' || token.lower === 'all')) {
      index += 1
      continue
    }
    break
  }
  return tokens.slice(index)
}

/**
 * Tokens of a SELECT-list item outside nested parentheses, with the parentheses
 * themselves removed. `COUNT(*)` therefore flattens to `COUNT`.
 */
function topLevelTokens(tokens: readonly Token[]): Token[] {
  const flat: Token[] = []
  let depth = 0
  for (const token of tokens) {
    if (token.kind === 'punct') {
      if (token.text === '(') {
        depth += 1
        continue
      }
      if (token.text === ')') {
        depth = Math.max(0, depth - 1)
        continue
      }
    }
    if (depth === 0) flat.push(token)
  }
  return flat
}

/** `AS alias` or bare `expr alias` name of one SELECT-list item. */
function selectItemAlias(tokens: readonly Token[]): string | undefined {
  const flat = topLevelTokens(tokens)
  for (let index = 0; index < flat.length - 1; index += 1) {
    const token = flat[index] as Token
    if (token.kind === 'keyword' && token.lower === 'as') {
      const name = flat[index + 1] as Token
      if (name.kind === 'ident') return name.text
    }
  }
  const last = flat[flat.length - 1]
  const previous = flat[flat.length - 2]
  if (last === undefined || last.kind !== 'ident' || previous === undefined) return undefined
  // A bare alias follows an expression; `t.col` and `a + b` are not aliases.
  const aliasable =
    previous.kind === 'ident' ||
    previous.kind === 'number' ||
    previous.kind === 'string' ||
    previous.kind === 'param'
  return aliasable ? last.text : undefined
}

/** The column name of a plain column reference (`col`, `t.col`, `"Col"`). */
function selectItemColumn(tokens: readonly Token[]): string | undefined {
  const flat = topLevelTokens(tokens)
  // A function call or nested expression has no stable output name.
  if (flat.length !== tokens.length) return undefined
  for (const token of flat) {
    if (token.kind === 'ident') continue
    if (token.kind === 'punct' && token.text === '.') continue
    return undefined
  }
  const last = flat[flat.length - 1]
  return last !== undefined && last.kind === 'ident' ? last.text : undefined
}

/**
 * Output columns of a SELECT list. `undefined` means "unknown": a `*`/`t.*`
 * item makes the whole list unguessable, so nothing is invented.
 */
function selectListColumns(items: readonly Token[]): string[] | undefined {
  const groups: Token[][] = []
  let depth = 0
  let current: Token[] = []
  for (const token of items) {
    if (token.kind === 'punct') {
      if (token.text === '(') depth += 1
      else if (token.text === ')') depth = Math.max(0, depth - 1)
      else if (token.text === ',' && depth === 0) {
        groups.push(current)
        current = []
        continue
      }
    }
    current.push(token)
  }
  if (current.length > 0 || groups.length === 0) groups.push(current)

  const columns: string[] = []
  for (const raw of groups) {
    const group = stripSelectModifiers(raw)
    if (group.length === 0) continue
    const flat = topLevelTokens(group)
    if (flat.some((token) => token.kind === 'punct' && token.text === '*')) return undefined
    const alias = selectItemAlias(group)
    if (alias !== undefined) {
      columns.push(alias)
      continue
    }
    const column = selectItemColumn(group)
    if (column !== undefined) columns.push(column)
    // An expression without an alias has no stable output name: skip it.
  }
  return columns.length > 0 ? columns : undefined
}

/** SELECT output columns of a subquery body, or `undefined` when unknown. */
function inferSelectColumns(body: readonly Token[]): string[] | undefined {
  let depth = 0
  let selectIndex = -1
  for (let index = 0; index < body.length; index += 1) {
    const token = body[index] as Token
    if (token.kind === 'punct') {
      if (token.text === '(') depth += 1
      else if (token.text === ')') depth = Math.max(0, depth - 1)
      continue
    }
    if (depth !== 0 || token.kind !== 'keyword') continue
    if (selectIndex < 0) {
      if (token.lower === 'select') selectIndex = index
      continue
    }
    if (token.lower === 'from' || token.lower === 'into') {
      return selectListColumns(body.slice(selectIndex + 1, index))
    }
  }
  if (selectIndex < 0) return undefined
  return selectListColumns(body.slice(selectIndex + 1))
}

interface CteDefinition {
  name: string
  /** Explicit column list or inferred SELECT output; unknown columns are absent. */
  columns?: string[]
  /** Relation a `SELECT *` body inherits its columns from, when unambiguous. */
  source?: CompletionRelation['source']
}

/**
 * A CTE whose body is `SELECT * FROM earlier_cte` borrows that CTE's known
 * shape: its columns, or the catalog relation it expands from. Only earlier
 * definitions are visible, which also keeps recursive references safe.
 */
function resolveCteSource(
  definition: CteDefinition,
  known: readonly CteDefinition[],
): void {
  const source = definition.source
  if (source === undefined || source.schema !== undefined) return
  const lower = source.table.toLowerCase()
  const target = known.find((cte) => cte.name.toLowerCase() === lower)
  if (target === undefined) return
  delete definition.source
  if (target.columns !== undefined) definition.columns = target.columns
  else if (target.source !== undefined) definition.source = target.source
}

/**
 * Parse a leading `WITH [RECURSIVE] name [(cols)] AS (SELECT ...), ...` clause.
 * Incomplete or unrecognised syntax yields no CTEs, so the parser falls back to
 * treating the whole token list as the statement.
 */
function parseWith(tokens: readonly Token[]): { ctes: CteDefinition[]; mainStart: number } {
  const none = { ctes: [] as CteDefinition[], mainStart: 0 }
  const first = tokens[0]
  if (first === undefined || first.kind !== 'keyword' || first.lower !== 'with') return none

  let index = 1
  const recursive = tokens[index]
  if (recursive !== undefined && recursive.kind === 'keyword' && recursive.lower === 'recursive') {
    index += 1
  }

  const ctes: CteDefinition[] = []
  for (;;) {
    const name = tokens[index]
    if (name === undefined || name.kind !== 'ident') return none
    index += 1

    let explicit: string[] | undefined
    const maybeOpen = tokens[index]
    if (maybeOpen !== undefined && maybeOpen.kind === 'punct' && maybeOpen.text === '(') {
      const columns: string[] = []
      index += 1
      let closed = false
      while (index < tokens.length) {
        const token = tokens[index] as Token
        index += 1
        if (token.kind === 'punct' && token.text === ')') {
          closed = true
          break
        }
        if (token.kind === 'punct' && token.text === ',') continue
        if (token.kind === 'ident') {
          columns.push(token.text)
          continue
        }
        return none
      }
      if (!closed) return none
      if (columns.length > 0) explicit = columns
    }

    const as = tokens[index]
    if (as === undefined || as.kind !== 'keyword' || as.lower !== 'as') return none
    index += 1
    const open = tokens[index]
    if (open === undefined || open.kind !== 'punct' || open.text !== '(') return none

    let depth = 0
    let close = -1
    for (let cursor = index; cursor < tokens.length; cursor += 1) {
      const token = tokens[cursor] as Token
      if (token.kind !== 'punct') continue
      if (token.text === '(') depth += 1
      else if (token.text === ')') {
        depth -= 1
        if (depth === 0) {
          close = cursor
          break
        }
      }
    }
    if (close < 0) return none

    const body = tokens.slice(index + 1, close)
    const cte: CteDefinition = { name: name.text }
    const columns = explicit ?? inferSelectColumns(body)
    if (columns !== undefined) {
      cte.columns = columns
    } else {
      const source = starSource(body)
      if (source !== undefined) cte.source = source
    }
    resolveCteSource(cte, ctes)
    ctes.push(cte)
    index = close + 1

    const comma = tokens[index]
    if (comma !== undefined && comma.kind === 'punct' && comma.text === ',') {
      index += 1
      continue
    }
    break
  }

  return { ctes, mainStart: index }
}

/**
 * Parse one relation reference starting at `index`: `schema.table`, or a
 * parenthesised derived table (`(SELECT ...) alias`, recorded with an empty
 * table name).
 */
function parseRelationRef(
  tokens: readonly Token[],
  index: number,
): { relation: CompletionRelation; next: number } | null {
  const token = tokens[index]
  if (token === undefined) return null

  if (token.kind === 'punct' && token.text === '(') {
    let depth = 0
    let cursor = index
    for (; cursor < tokens.length; cursor += 1) {
      const current = tokens[cursor] as Token
      if (current.kind !== 'punct') continue
      if (current.text === '(') depth += 1
      else if (current.text === ')') {
        depth -= 1
        if (depth === 0) {
          cursor += 1
          break
        }
      }
    }
    if (depth !== 0) return null
    const body = tokens.slice(index + 1, Math.max(index + 1, cursor - 1))
    const alias = aliasAt(tokens, cursor)
    const relation: CompletionRelation = { table: '' }
    if (alias.alias !== undefined) relation.alias = alias.alias
    const columns = inferSelectColumns(body)
    if (columns !== undefined) {
      relation.columns = columns
    } else {
      const source = starSource(body)
      if (source !== undefined) relation.source = source
    }
    return { relation, next: alias.next }
  }

  if (token.kind !== 'ident') return null

  const dot = tokens[index + 1]
  const after = tokens[index + 2]
  let relation: CompletionRelation
  let cursor: number
  if (dot !== undefined && dot.kind === 'punct' && dot.text === '.' && after !== undefined && after.kind === 'ident') {
    relation = { schema: token.text, table: after.text }
    cursor = index + 3
  } else {
    relation = { table: token.text }
    cursor = index + 1
  }
  const alias = aliasAt(tokens, cursor)
  if (alias.alias !== undefined) relation.alias = alias.alias
  return { relation, next: alias.next }
}

/** Give a relation the inferred columns when its name matches a CTE. */
function attachCteColumns(
  relation: CompletionRelation,
  ctes: readonly CteDefinition[],
): CompletionRelation {
  if (ctes.length === 0) return relation
  if (relation.table !== '') {
    const lower = relation.table.toLowerCase()
    const cte = ctes.find((definition) => definition.name.toLowerCase() === lower)
    if (cte === undefined) return relation
    if (cte.columns !== undefined) relation.columns = cte.columns
    else if (cte.source !== undefined) relation.source = cte.source
    return relation
  }
  // A derived table whose inner `SELECT *` reads from a CTE inherits the same
  // shape, so `(SELECT * FROM recent) d` can offer `recent`'s columns.
  const source = relation.source
  if (source === undefined || source.schema !== undefined) return relation
  const lower = source.table.toLowerCase()
  const cte = ctes.find((definition) => definition.name.toLowerCase() === lower)
  if (cte === undefined) return relation
  if (cte.columns !== undefined) relation.columns = cte.columns
  else if (cte.source !== undefined) relation.source = cte.source
  return relation
}

/** Identity of a relation view: duplicated for the same schema/table/alias. */
function relationKey(relation: CompletionRelation): string {
  return [relation.schema ?? '', relation.table, relation.alias ?? '']
    .join('\u0000')
    .toLowerCase()
}

/** Relations mentioned by the token prefix before the caret. */
function collectRelations(
  tokens: readonly Token[],
  ctes: readonly CteDefinition[] = [],
): CompletionRelation[] {
  const relations: CompletionRelation[] = []
  const seen = new Set<string>()
  const push = (relation: CompletionRelation): void => {
    const resolved = attachCteColumns(relation, ctes)
    if (resolved.table === '' && (resolved.alias === undefined || resolved.alias === '')) return
    const key = relationKey(resolved)
    if (seen.has(key)) return
    seen.add(key)
    relations.push(resolved)
  }

  // `CREATE INDEX idx ON orders (col, ...)`: the indexed table carries the
  // columns the statement wants next.
  const indexOn = createIndexOn(tokens)
  if (indexOn >= 0) {
    const target = parseRelationRef(tokens, indexOn + 1)
    if (target !== null) push(target.relation)
  }

  let index = 0
  while (index < tokens.length) {
    const token = tokens[index] as Token
    if (token.kind !== 'keyword' || !RELATION_STARTERS.has(token.lower)) {
      index += 1
      continue
    }
    let cursor = index + 1
    // CREATE TABLE IF NOT EXISTS orders
    if (token.lower === 'table') {
      const ifToken = tokens[cursor]
      const nextToken = tokens[cursor + 1]
      const thirdToken = tokens[cursor + 2]
      if (ifToken?.kind === 'ident' && ifToken.lower === 'if') {
        // `CREATE TABLE IF NOT EXISTS t` and `DROP TABLE IF EXISTS t`.
        if (
          nextToken?.kind === 'keyword' &&
          nextToken.lower === 'not' &&
          thirdToken?.kind === 'keyword' &&
          thirdToken.lower === 'exists'
        ) {
          cursor += 3
        } else if (nextToken?.kind === 'keyword' && nextToken.lower === 'exists') {
          cursor += 2
        }
      }
    }
    const parsed = parseRelationRef(tokens, cursor)
    if (parsed !== null) {
      push(parsed.relation)
      cursor = parsed.next
      // A FROM clause may list several relations separated by commas.
      if (token.lower === 'from') {
        for (;;) {
          const comma = tokens[cursor]
          if (comma === undefined || comma.kind !== 'punct' || comma.text !== ',') break
          const next = parseRelationRef(tokens, cursor + 1)
          if (next === null) {
            cursor += 1
            break
          }
          push(next.relation)
          cursor = next.next
        }
      }
    }
    index = Math.max(cursor, index + 1)
  }
  return relations
}

/**
 * Analyse the statement around `caret` inside `text`.
 *
 * The returned `masked`/`statement` strings cover only the statement that holds
 * the caret; `word` offsets stay relative to `text` so they can be handed to
 * `applyCompletion` unchanged.
 */
export function analyze(text: string, caret: number): Analysis {
  const at = Math.max(0, Math.min(caret, text.length))
  const maskedFull = maskCommentsAndStrings(text)
  const bounds = statementBounds(maskedFull, at, text.length)
  const statement = text.slice(bounds.start, bounds.end)
  const masked = maskedFull.slice(bounds.start, bounds.end)

  const found = wordAtCaret(text, at)
  const word: WordAtCaret = {
    start: found.start,
    end: found.end,
    prefix: found.prefix,
    quote: found.quote,
  }
  const qualifier = qualifierBefore(text, word.start)

  // Tokens are relative to the statement; the identifier under the caret is not
  // part of the already-typed context, so it is excluded. Tokenising the raw
  // statement keeps string literals as single `string` tokens (a comparison
  // with a literal still ends an operand), while the tokenizer itself skips
  // comments and never splits the contents of a string.
  const tokens = tokenize(statement)
  const caretRelative = at - bounds.start
  const wordStartRelative = word.start - bounds.start
  const before = tokens.filter(
    (token) => token.end <= wordStartRelative && token.start < caretRelative,
  )

  // A leading WITH defines names that only the main statement can use; the CTE
  // bodies themselves are not part of the caret's clause.
  const withClause = parseWith(before)
  const mainStatement =
    withClause.mainStart > 0 ? before.slice(withClause.mainStart) : before
  // Only CTE bodies typed so far: the caret still sits on the WITH header, so
  // the header itself is what tells us a statement comes next.
  const statementTokens = mainStatement.length > 0 ? mainStatement : before
  const ctes = withClause.ctes.map((definition) => definition.name)
  const cteRelations = withClause.ctes.map((definition) => {
    const relation: CompletionRelation = { table: '', alias: definition.name }
    if (definition.columns !== undefined) relation.columns = definition.columns
    else if (definition.source !== undefined) relation.source = definition.source
    return relation
  })
  const relations = collectRelations(statementTokens, withClause.ctes)
  // `SELECT o. FROM orders o`: the alias is written after the caret, but a
  // dotted qualifier can only point at that relation. Spell the statement out
  // to the end and read the relations from there; the caret's clause is still
  // decided from the tokens before it only.
  if (qualifier.length > 0) {
    const remainder = tokens.filter((token) => token.start >= word.end - bounds.start)
    const seen = new Set(relations.map(relationKey))
    for (const relation of collectRelations(remainder, withClause.ctes)) {
      const key = relationKey(relation)
      if (seen.has(key)) continue
      seen.add(key)
      relations.push(relation)
    }
  }
  let expectation = expectationAt(statementTokens)
  // A dotted caret (`orders.`, `shop.orders.`, `u.`) always wants a member of
  // the qualifier, whatever clause it appears in.
  if (qualifier.length > 0 && expectation !== 'schema') expectation = 'column'

  const analysis: Analysis = { masked, statement, relations, expectation, qualifier, word }
  if (isInsideCommentOrString(text, at)) analysis.inLiteral = true
  if (ctes.length > 0) analysis.ctes = ctes
  if (cteRelations.length > 0) analysis.cteRelations = cteRelations
  return analysis
}

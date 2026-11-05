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
  ['as', 'name'],
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
/** `REFERENCES ` inside a CREATE TABLE body names the parent table. */
function referencesTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  return last?.kind === 'keyword' && last.lower === 'references'
}

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
  // `WINDOW w AS (` starts a window specification, not a subquery.
  if (tokens.some((token) => token.text.toLowerCase() === 'window')) return false
  const before = previousKeyword(tokens, tokens.length - 1)
  return (
    before === 'as' ||
    before === 'from' ||
    before === 'exists' ||
    before === 'in' ||
    before === 'any' ||
    before === 'all' ||
    before === 'some'
  )
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

/** `CREATE INDEX ... USING ` names an index method (BTREE/HASH). */
function indexUsingTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'create') return false
  if (!tokens.some((token) => token.text.toLowerCase() === 'index')) return false
  const last = tokens[tokens.length - 1]
  return last !== undefined && last.text.toLowerCase() === 'using'
}

/** True when the caret follows the `ON` of a `GRANT`/`REVOKE` statement. */
/** The caret is inside the parenthesis of `USING (...)`. */
function usingParenOpen(tokens: readonly Token[]): boolean {
  let depth = 0
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === ')') depth += 1
    else if (token.text === '(') {
      if (depth === 0) {
        const owner = tokens[index - 1] as Token | undefined
        return owner?.text.toLowerCase() === 'using'
      }
      depth -= 1
    }
  }
  return false
}

const WINDOW_PARTS = new Set(['partition', 'order', 'rows', 'range', 'groups'])

/** Index of the `(` opening the window specification around the caret, or -1. */
function windowSpecOpen(tokens: readonly Token[]): number {
  let depth = 0
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === ')') {
      depth += 1
      continue
    }
    if (token.text !== '(') continue
    if (depth > 0) {
      depth -= 1
      continue
    }
    const owner = tokens[index - 1]
    if (owner === undefined) return -1
    if (owner.text.toLowerCase() === 'over') return index
    // `WINDOW w AS (` names a window specification, not a subquery.
    const namedWindow = tokens
      .slice(0, index - 1)
      .some((candidate) => candidate.text.toLowerCase() === 'window')
    return owner.text.toLowerCase() === 'as' && namedWindow ? index : -1
  }
  return -1
}

/**
 * What a caret inside `OVER (...)` / `WINDOW w AS (...)` expects: a window part
 * at the start, a column after `PARTITION BY`/`ORDER BY`, a frame bound after
 * `ROWS`/`RANGE`/`GROUPS`, or a direction after a sort key.
 */
function windowExpectation(tokens: readonly Token[]): CompletionExpectation | undefined {
  const open = windowSpecOpen(tokens)
  if (open < 0) return undefined
  const inside: Token[] = []
  let depth = 0
  for (let index = open + 1; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === '(') depth += 1
      else if (token.text === ')') {
        if (depth === 0) break
        depth -= 1
      }
    }
    if (depth === 0) inside.push(token)
  }
  let partAt = -1
  depth = 0
  for (let index = 0; index < inside.length; index += 1) {
    const token = inside[index] as Token
    if (token.kind === 'punct') {
      if (token.text === '(') depth += 1
      else if (token.text === ')' && depth > 0) depth -= 1
      continue
    }
    // ROWS/RANGE/GROUPS are not reserved words in every dialect, so match text.
    if (depth === 0 && WINDOW_PARTS.has(token.text.toLowerCase())) partAt = index
  }
  if (partAt < 0) return 'over'
  const part = (inside[partAt] as Token).lower
  const tail = inside.slice(partAt + 1)
  const last = tail[tail.length - 1]
  const lower = last?.text.toLowerCase()
  if (part === 'partition') {
    return lower === 'partition' ? 'over' : 'column'
  }
  if (part === 'order') {
    if (lower === 'order') return 'over'
    if (last?.kind === 'keyword' && (last.lower === 'asc' || last.lower === 'desc')) return 'over'
    return endsOperand(last) ? 'direction' : 'column'
  }
  if (lower === 'rows' || lower === 'range' || lower === 'groups') return 'frame'
  if (lower === 'preceding' || lower === 'following' || lower === 'row') return 'number'
  return 'frame'
}

/**
 * `OVER w ` refers to a named window without parentheses, and a closed
 * `WINDOW w AS (...)` definition ends the window expression.
 */
function namedWindowTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  const before = tokens[tokens.length - 2]
  if (last === undefined) return false
  if (
    last.kind === 'ident' &&
    before !== undefined &&
    before.text.toLowerCase() === 'over'
  ) {
    return true
  }
  if (last.kind === 'punct' && last.text === ')') {
    let depth = 0
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index] as Token
      if (token.kind !== 'punct') continue
      if (token.text === ')') {
        depth += 1
        continue
      }
      if (token.text !== '(') continue
      depth -= 1
      if (depth > 0) continue
      const owner = tokens[index - 1]
      if (owner === undefined || owner.text.toLowerCase() !== 'as') return false
      return tokens
        .slice(0, index - 1)
        .some((candidate) => candidate.text.toLowerCase() === 'window')
    }
  }
  return false
}

/** `GRANT `, `GRANT SELECT, `: privileges come before the ON clause. */
function privilegePosition(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.kind !== 'keyword') return false
  const head = first.text.toLowerCase()
  if (head !== 'grant' && head !== 'revoke') return false
  if (tokens.some((token) => token.kind === 'keyword' && token.lower === 'on')) return false
  // `GRANT role1 TO ` names a grantee; `GRANT SELECT ` still lists privileges.
  if (tokens.some((token) => token.text.toLowerCase() === 'to')) return false
  if (tokens.length === 1) return true
  const last = tokens[tokens.length - 1] as Token
  return (last.kind === 'punct' && last.text === ',') || last.kind === 'keyword'
}

/** A grantee was already typed after TO/FROM; only a WITH clause remains. */
function granteeTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.kind !== 'keyword') return false
  const head = first.text.toLowerCase()
  if (head !== 'grant' && head !== 'revoke') return false
  return tokens.some(
    (token, index) =>
      token.kind === 'keyword' &&
      (token.lower === 'to' || token.lower === 'from') &&
      tokens[index + 1] !== undefined &&
      tokens[index + 1]?.kind !== 'keyword',
  )
}

/** `COLLATE ` takes a collation name, in ORDER BY as well as in DDL. */
function collationValue(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  return last?.kind === 'keyword' && last.lower === 'collate'
}

/** `... ESCAPE ` takes a single pattern-escape character. */
function escapeTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  return last?.kind === 'keyword' && last.lower === 'escape'
}

/** `WITH GRANT ` / `WITH ADMIN ` in a GRANT statement. */
function grantWith(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]
  if (first === undefined || first.kind !== 'keyword') return undefined
  const head = first.text.toLowerCase()
  if (head !== 'grant' && head !== 'revoke') return undefined
  let index = tokens.length - 1
  while (index >= 0 && tokens[index]?.text.toLowerCase() !== 'with') index -= 1
  if (index < 0) return undefined
  const rest = tokens
    .slice(index + 1)
    .map((token) => token.text.toLowerCase())
    .filter((text) => text !== '')
  if (rest.length === 0) return 'grantOption'
  const lastWord = rest[rest.length - 1]
  if (rest.length === 1 && (lastWord === 'grant' || lastWord === 'admin')) {
    return 'grantOptionWord'
  }
  return undefined
}

/** `DROP DATABASE `/`DROP SCHEMA ` names an existing database. */
function dropDatabase(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  const second = tokens[1]
  if (first?.text.toLowerCase() !== 'drop') return false
  const object = second?.text.toLowerCase()
  return object === 'database' || object === 'schema'
}

/** `USE ` names an existing database. */
function useDatabase(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  return tokens.length === 1 && first?.text.toLowerCase() === 'use'
}

/** `FOR ` at the end of a SELECT takes the lock clause. */
function lockStart(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last?.kind !== 'keyword' || last.lower !== 'for') return false
  // `SUBSTRING(name FROM n FOR ` is inside a function call, not a row lock.
  let depth = 0
  for (const token of tokens) {
    if (token.kind !== 'punct') continue
    if (token.text === '(') depth += 1
    else if (token.text === ')') depth -= 1
  }
  return depth === 0
}

/** The length in `SUBSTRING(name FROM n FOR ` and `CHAR(`-style lengths. */
const LENGTH_TYPES = new Set([
  'char',
  'varchar',
  'binary',
  'varbinary',
  'decimal',
  'numeric',
  'bit',
  'time',
  'datetime',
  'timestamp',
  'year',
])

/** A type's length/precision takes a number, not a name. */
function columnLength(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last?.kind !== 'punct' || last.text !== '(') return false
  const owner = tokens[tokens.length - 2]
  if (owner === undefined) return false
  if (!LENGTH_TYPES.has(owner.text.toLowerCase())) return false
  return tokens.some((token) =>
    ['create', 'alter', 'cast', 'convert'].includes(token.text.toLowerCase()),
  )
}

/** `SUBSTRING(name FROM n FOR ` takes a length even though it sits in a call. */
function forLengthTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  return last?.kind === 'keyword' && last.lower === 'for'
}

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
  if (first === undefined) return false
  const start = first.text.toLowerCase()
  let index = 1
  if (start === 'drop' && tokens[1]?.text.toLowerCase() === 'temporary') index = 2
  const object = tokens[index]?.text.toLowerCase()
  if ((start !== 'drop' && start !== 'truncate') || (object !== 'table' && object !== 'view')) {
    return false
  }
  return tokens.length >= index + 2
}

/** `RENAME TABLE orders TO ` names the new table, which only the user knows. */
function renameTableTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  const last = tokens[tokens.length - 1]
  if (first === undefined || last === undefined) return false
  if (first.text.toLowerCase() !== 'rename' || tokens[1]?.text.toLowerCase() !== 'table') return false
  return last.kind === 'keyword' && last.lower === 'to'
}

/** `DROP VIEW ` and a bare `TRUNCATE ` name a relation, like `DROP TABLE` does. */
function relationKeywordTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined) return false
  const start = first.text.toLowerCase()
  if (start === 'truncate') return tokens.length === 1
  const second = tokens[1]
  if (start !== 'drop' || second === undefined) return false
  return second.text.toLowerCase() === 'view'
}

/**
 * Statements whose next word is an existing table name: `ANALYZE TABLE `,
 * `TRUNCATE TABLE `, `DROP TABLE orders, ` and friends. The clause keywords a
 * `relation` position offers (`WHERE`, `JOIN`, ...) would be noise there.
 */
function ddlTableName(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  const second = tokens[1]
  if (first === undefined || second === undefined) return false
  const start = first.text.toLowerCase()
  const object = second.text.toLowerCase()
  const last = tokens[tokens.length - 1]
  const commaTail = last?.kind === 'punct' && last.text === ','
  const bare = tokens.length === 2 || commaTail
  if (start === 'truncate' || start === 'rename') return object === 'table' && bare
  if (start === 'analyze' || start === 'optimize' || start === 'check' || start === 'repair') {
    return object === 'table' && bare
  }
  if (start === 'drop') {
    const temporary = object === 'temporary'
    const target = temporary ? tokens[2]?.text.toLowerCase() : object
    return (
      (target === 'table' || target === 'view') &&
      (tokens.length === (temporary ? 3 : 2) || commaTail)
    )
  }
  if (start === 'alter' || start === 'lock') {
    return (object === 'table' || object === 'tables') && tokens.length === 2
  }
  return false
}

/**
 * `SELECT ... INTO OUTFILE '/path'`, `PREPARE stmt FROM ...` and `UNLOCK TABLES`
 * take text only the user knows; nothing from the catalog belongs there.
 */
function literalTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined) return false
  const start = first.text.toLowerCase()
  const last = tokens[tokens.length - 1]
  if (last === undefined) return false
  const tail = last.text.toLowerCase()
  if (start === 'select' && (tail === 'outfile' || tail === 'dumpfile')) return true
  if (start === 'prepare' && last.kind === 'keyword' && last.lower === 'from') return true
  if (start === 'execute' || start === 'deallocate') return true
  return start === 'unlock' && tokens[1]?.text.toLowerCase() === 'tables'
}

/**
 * `LOCK TABLES orders ` takes an access mode; after `READ, ` the next word is
 * another table name.
 */
function lockTableTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  if (tokens[0]?.text.toLowerCase() !== 'lock') return undefined
  if (tokens[1]?.text.toLowerCase() !== 'tables') return undefined
  if (tokens.length <= 2) return 'tableName'
  const last = tokens[tokens.length - 1]
  if (last?.kind === 'punct' && last.text === ',') return 'tableName'
  const hasAccess = tokens.slice(2).some((token) => {
    const word = token.text.toLowerCase()
    return word === 'read' || word === 'write' || word === 'as'
  })
  return hasAccess ? 'number' : 'lockTable'
}

/** `CALL ` names a procedure; its arguments are literals, not catalog names. */
function callStart(tokens: readonly Token[]): 'name' | 'number' | undefined {
  if (tokens[0]?.text.toLowerCase() !== 'call') return undefined
  return tokens.length === 1 ? 'name' : 'number'
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

/** `ALTER TABLE ... ENGINE = ` names a storage engine; its value ends the option. */
function alterTableEngine(tokens: readonly Token[]): CompletionExpectation | undefined {
  const start = alterTableStart(tokens)
  if (start < 0) return undefined
  const engineAt = tokens.findIndex(
    (token, index) => index >= start && token.text.toLowerCase() === 'engine',
  )
  if (engineAt < 0) return undefined
  const equals = tokens[engineAt + 1]
  if (equals === undefined || equals.kind !== 'punct' || equals.text !== '=') {
    return tokens.length === engineAt + 1 ? 'number' : undefined
  }
  if (tokens.length === engineAt + 2) return 'engine'
  return 'tableOptions'
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

const INTERVAL_UNITS = new Set([
  'microsecond',
  'second',
  'minute',
  'hour',
  'day',
  'week',
  'month',
  'quarter',
  'year',
])

/** `INTERVAL ` and `INTERVAL 1 ` take a unit; a finished unit ends the literal. */
function intervalTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  if (last.kind === 'keyword' && last.lower === 'interval') return 'interval'
  const previous = tokens[tokens.length - 2]
  if (
    previous !== undefined &&
    previous.text.toLowerCase() === 'interval' &&
    (last.kind === 'number' || last.kind === 'string')
  ) {
    return 'interval'
  }
  if (
    INTERVAL_UNITS.has(last.text.toLowerCase()) &&
    tokens.some((token) => token.text.toLowerCase() === 'interval')
  ) {
    return 'number'
  }
  return undefined
}

/** `ON DUPLICATE KEY UPDATE ` assigns columns of the inserted table. */
function duplicateKeyUpdate(tokens: readonly Token[]): boolean {
  if (tokens.length < 4) return false
  const tail = tokens.slice(tokens.length - 4).map((token) => token.text.toLowerCase())
  return tail[0] === 'on' && tail[1] === 'duplicate' && tail[2] === 'key' && tail[3] === 'update'
}

/** `ON DUPLICATE KEY UPDATE col = ` assigns a value to that column. */
function duplicateKeyValue(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'insert') return false
  const words = tokens.map((token) => token.text.toLowerCase())
  const at = words.findIndex(
    (word, index) =>
      word === 'on' &&
      words[index + 1] === 'duplicate' &&
      words[index + 2] === 'key' &&
      words[index + 3] === 'update',
  )
  if (at < 0) return false
  const last = tokens[tokens.length - 1]
  return last?.kind === 'punct' && last.text === '='
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

/** A closed `VALUES (...)` tuple followed by a comma: only `(` can follow. */
function valuesNextTuple(tokens: readonly Token[]): boolean {
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
  return sawParen && depth === 0 && last?.kind === 'punct' && last.text === ','
}

/** `DEFAULT CHARSET ` / `CHARACTER SET ` name a character set. */
function charsetValue(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  const previous = tokens[tokens.length - 2]
  if (last === undefined) return false
  if (last.text.toLowerCase() === 'charset') return true
  if (last.kind === 'punct' && last.text === '=') {
    return previous?.text.toLowerCase() === 'charset'
  }
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
  if (lower === 'default') return 'value'
  if (last.kind === 'punct' && last.text === '=') {
    return previous?.text.toLowerCase() === 'comment' ? 'name' : undefined
  }
  return undefined
}

/** `AUTO_INCREMENT = ` and `ROW_FORMAT = ` values in a CREATE TABLE tail. */
function tableOptionAssignment(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'create') return undefined
  if (!tokens.some((token) => token.text.toLowerCase() === 'table')) return undefined
  const last = tokens[tokens.length - 1]
  const previous = tokens[tokens.length - 2]
  if (last?.kind !== 'punct' || last.text !== '=' || previous === undefined) return undefined
  const name = previous.text.toLowerCase()
  if (name === 'auto_increment') return 'number'
  return name === 'row_format' ? 'rowFormat' : undefined
}

/** `PARTITION BY ` names a partitioning method. */
function partitionBy(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  const previous = tokens[tokens.length - 2]
  return (
    last?.kind === 'keyword' &&
    last.lower === 'by' &&
    previous?.text.toLowerCase() === 'partition'
  )
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

/** `CREATE TABLE `/`CREATE VIEW ` still need a name only the user knows. */
function createObjectName(tokens: readonly Token[]): boolean {
  const words = tokens.map((token) => token.text.toLowerCase())
  if (words[0] !== 'create') return false
  let index = 1
  if (words[1] === 'or' && words[2] === 'replace') index = 3
  else if (words[1] === 'temporary') index = 2
  const object = words[index]
  if (object !== 'table' && object !== 'view') return false
  const next = words[index + 1]
  if (next === undefined) return true
  // `CREATE TABLE IF NOT EXISTS ` still has no object name yet.
  return (
    next === 'if' &&
    words[index + 2] === 'not' &&
    words[index + 3] === 'exists' &&
    words[index + 4] === undefined
  )
}

/** `CREATE TABLE t ` (name typed, no body yet) continues with table options. */
function createTableOptionsTail(tokens: readonly Token[]): boolean {
  const words = tokens.map((token) => token.text.toLowerCase())
  if (words[0] !== 'create') return false
  let index = 1
  if (words[1] === 'temporary') index = 2
  if (words[index] !== 'table') return false
  index += 1
  if (words[index] === 'if' && words[index + 1] === 'not' && words[index + 2] === 'exists') index += 3
  const name = tokens[index]
  if (name === undefined || name.kind !== 'ident') return false
  return index === tokens.length - 1
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
  // `EXPLAIN FORMAT=TREE ` / `EXPLAIN FORMAT JSON ` still precede the statement,
  // unless the explained statement has already started.
  if (secondText !== 'format') return false
  return !tokens.some(
    (token) =>
      token.kind === 'keyword' &&
      (token.lower === 'select' ||
        token.lower === 'insert' ||
        token.lower === 'update' ||
        token.lower === 'delete' ||
        token.lower === 'with' ||
        token.lower === 'table'),
  )
}

/** `UNION ` / `UNION ALL ` start another SELECT, not a table list. */
function unionStatement(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return false
  const lower = last.text.toLowerCase()
  if (lower === 'union' || lower === 'intersect' || lower === 'except') return true
  const previous = tokens[tokens.length - 2]
  return (
    lower === 'all' &&
    previous !== undefined &&
    (previous.text.toLowerCase() === 'union' ||
      previous.text.toLowerCase() === 'intersect' ||
      previous.text.toLowerCase() === 'except')
  )
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
  const kind = second === 'full' ? words[2] : second
  if (second === 'create') {
    const object = words[2]
    if (object === 'database' || object === 'schema') return 'database'
    if (object === 'procedure' || object === 'function' || object === 'event' || object === 'trigger') {
      return 'name'
    }
    if (object === 'table' || object === 'view') return words.length > 3 ? 'name' : 'tableName'
    return undefined
  }
  const from = words.indexOf('from')
  const inDatabase = words.indexOf('in')
  if (second === 'tables') {
    if (from < 0 && inDatabase < 0) return 'number'
    if (from === words.length - 1 || inDatabase === words.length - 1) return 'database'
    return 'number'
  }
  if (second === 'full' && words[2] === 'tables') {
    if (from < 0 && inDatabase < 0) return 'number'
    if (from === words.length - 1 || inDatabase === words.length - 1) return 'database'
    return 'number'
  }
  if (second === 'table' && words[2] === 'status') {
    if (from < 0) return 'number'
    return from === words.length - 1 ? 'database' : 'number'
  }
  if (
    kind === 'columns' ||
    kind === 'fields' ||
    kind === 'index' ||
    kind === 'indexes' ||
    kind === 'keys'
  ) {
    if (from < 0) return undefined
    return from === words.length - 1 ? 'tableName' : 'name'
  }
  if (second === 'grants' && words.length > 2) return 'name'
  if (words[words.length - 1] === 'like') return 'name'
  if ((second === 'status' || second === 'variables') && words[words.length - 1] === 'where') {
    return 'comparison'
  }
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

/** `SET TRANSACTION ...` tails: access mode, `ISOLATION LEVEL`. */
function setTransactionTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'set') return undefined
  const words = tokens.map((token) => token.text.toLowerCase())
  if (words[1] !== 'transaction') return undefined
  if (tokens.length === 2) return 'setTransaction'
  const tail = words[words.length - 1]
  if (tail === 'read') return words.includes('isolation') ? 'isolationRead' : 'transactionRead'
  if (tail === 'isolation') return 'isolationLevel'
  if (tail === 'level') return 'isolation'
  return 'number'
}

/** `SET TRANSACTION ISOLATION LEVEL ` names an isolation level. */
function isolationStart(tokens: readonly Token[]): boolean {
  const words = tokens.map((token) => token.text.toLowerCase())
  return (
    words[0] === 'set' &&
    words[1] === 'transaction' &&
    words[2] === 'isolation' &&
    words[3] === 'level' &&
    words.length === 4
  )
}

/** `DELETE FROM t USING ` names the extra tables of a multi-table delete. */
function deleteUsing(tokens: readonly Token[]): CompletionExpectation | undefined {
  const words = tokens.map((token) => token.text.toLowerCase())
  if (words[0] !== 'delete') return undefined
  const at = words.indexOf('using')
  if (at < 0) return undefined
  const after = tokens.slice(at + 1)
  if (after.length === 0) return 'tableName'
  const last = tokens[tokens.length - 1]
  if (last?.kind === 'punct' && last.text === ',') return 'tableName'
  // Once a JOIN or a following clause starts, the normal parser takes over.
  const continues = words.some(
    (word) => word === 'join' || word === 'where' || word === 'order' || word === 'limit',
  )
  if (continues) return undefined
  return 'number'
}

/** `ORDER BY ... NULLS ` takes FIRST or LAST. */
function nullsTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  const tail = last.text.toLowerCase()
  if (tail === 'nulls') return 'nulls'
  const hasOrder = tokens.some((token) => token.text.toLowerCase() === 'order')
  if (hasOrder && (tail === 'first' || tail === 'last')) return 'number'
  return undefined
}

/** `SHOW ` names a catalog list (`SHOW TABLES`, `SHOW STATUS`, ...). */
function showStart(tokens: readonly Token[]): boolean {
  return tokens.length <= 2 && tokens[0]?.text.toLowerCase() === 'show'
}

/** A finished `SHOW ... LIKE '<pattern>' ` leaves nothing to complete. */
function showPatternTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]
  if (first === undefined || first.text.toLowerCase() !== 'show') return false
  const last = tokens[tokens.length - 1]
  return (
    last?.kind === 'string' &&
    tokens.some((token) => token.kind === 'keyword' && token.lower === 'like')
  )
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
  const lastWord = tokens[tokens.length - 1]?.text.toLowerCase()
  // `ADD COLUMN x INT AFTER ` names the existing column it goes after; `FIRST`
  // ends the clause.
  if (lastWord === 'after') return 'column'
  if (lastWord === 'first') return 'number'
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
    // `ADD CONSTRAINT fk ` takes the constraint kind next.
    if (
      action.lower === 'add' &&
      object.lower === 'constraint' &&
      tokens[start + 2] !== undefined
    ) {
      return 'constraintType'
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
    // `ALTER COLUMN id SET ` takes a column option, not catalog names.
    if (action.lower === 'alter' && object.lower === 'column') {
      const last = tokens[tokens.length - 1]
      const word = last?.text.toLowerCase()
      if (word === 'set') return 'alterColumnSet'
      if (word === 'default') {
        return tokens[tokens.length - 2]?.text.toLowerCase() === 'drop' ? 'number' : 'value'
      }
      return 'number'
    }
    // `RENAME INDEX old TO ` names the new index, which only the user knows.
    if (action.lower === 'rename' && (object.lower === 'index' || object.lower === 'key')) {
      return 'name'
    }
    // `RENAME COLUMN old TO ` names the new column, which only the user knows.
    if (action.lower === 'rename' && object.lower === 'column') {
      const rest = tokens.slice(start + 2)
      const last = rest[rest.length - 1]
      if (last?.kind === 'keyword' && last.lower === 'to') return 'name'
      return 'alterObject'
    }
    // `CHANGE COLUMN old new` takes the new definition after the new name.
    if (action.lower === 'change' && object.lower === 'column') {
      const rest = tokens.slice(start + 2)
      if (rest.length === 0) return 'column'
      if (rest.length === 1) return 'name'
      return 'definition'
    }
    if (action.lower === 'modify' && object.lower === 'column') {
      return tokens.slice(start + 2).length === 0 ? 'column' : 'definition'
    }
    // `ADD INDEX ... (cols)` and `DROP INDEX name` are complete specifications.
    if (
      (action.lower === 'add' || action.lower === 'drop') &&
      (object.lower === 'index' || object.lower === 'key' || object.lower === 'unique')
    ) {
      const last = tokens[tokens.length - 1]
      if (
        (last?.kind === 'punct' && last.text === ')') ||
        (action.lower === 'drop' && last?.kind === 'ident')
      ) {
        return 'number'
      }
    }
    // A comma ends one alter specification; the next word is another action.
    const last = tokens[tokens.length - 1]
    if (last?.kind === 'punct' && last.text === ',') return 'alter'
    return undefined
  }
  switch (action.lower) {
    case 'add':
      if (object.lower === 'column') return 'definition'
      if (object.lower === 'index' || object.lower === 'key' || object.lower === 'unique') {
        return 'name'
      }
      return object.lower === 'constraint' ? 'name' : undefined
    case 'drop':
      return object.lower === 'column' ? 'column' : undefined
    case 'modify':
    case 'change':
      return object.lower === 'column' ? 'column' : undefined
    case 'rename':
      if (object.lower === 'column') return 'column'
      if (object.lower === 'index' || object.lower === 'key') return 'name'
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
        // A function call or a window closes an expression; a grouped
        // condition does not.
        const owner = tokens[index - 1]
        return owner?.kind === 'ident' || (owner?.kind === 'keyword' && owner.lower === 'over')
      }
      depth -= 1
    }
  }
  return false
}

/** `SELECT COUNT(*) ` takes AS/FROM; `WHERE CASE WHEN ... END ` takes an operator. */
function expressionTail(tokens: readonly Token[]): 'comparison' | 'expressionTail' | undefined {
  if (!completedExpression(tokens)) return undefined
  const last = tokens[tokens.length - 1] as Token
  let start = tokens.length - 2
  if (last.kind === 'punct' && last.text === ')') {
    // Skip the finished parenthesis (function arguments, window body): its
    // contents decide nothing about the clause the expression sits in.
    let depth = 0
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index] as Token
      if (token.kind !== 'punct') continue
      if (token.text === ')') depth += 1
      else if (token.text === '(') {
        depth -= 1
        if (depth === 0) {
          start = index - 2
          break
        }
      }
    }
  }
  for (let index = start; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'keyword') continue
    if (token.lower === 'where' || token.lower === 'having' || token.lower === 'on') {
      return 'comparison'
    }
    if (token.lower === 'select') return 'expressionTail'
    if (CONDITION_BREAKS.has(token.lower)) return undefined
  }
  return undefined
}

/** Inside a `CREATE TABLE` body: a column option takes a literal or a name. */
function createColumnOption(
  tokens: readonly Token[],
): CompletionExpectation | undefined {
  const words = tokens.map((token) => token.text.toLowerCase())
  if (!words.includes('create') || !words.includes('table')) return undefined
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  let depth = 0
  let opened = false
  for (const token of tokens) {
    if (token.kind !== 'punct') continue
    if (token.text === '(') {
      depth += 1
      opened = true
    } else if (token.text === ')') {
      depth -= 1
    }
  }
  if (!opened || depth <= 0) return undefined
  const tail = last.text.toLowerCase()
  if (last.kind === 'keyword' && last.lower === 'default') return 'value'
  if (last.kind === 'keyword' && last.lower === 'comment') return 'name'
  // `PRIMARY KEY ` / `AUTO_INCREMENT ` finish a definition; nothing catalog-bound follows.
  if (tail === 'key' || tail === 'auto_increment') return 'number'
  return undefined
}

/** `ALTER TABLE … MODIFY/CHANGE/ADD [COLUMN] … DEFAULT ` and friends. */
function alterColumnOption(
  tokens: readonly Token[],
): CompletionExpectation | undefined {
  if (alterTableStart(tokens) < 0) return undefined
  const words = tokens.map((token) => token.text.toLowerCase())
  if (!words.some((word) => word === 'column' || word === 'modify' || word === 'change' || word === 'add')) {
    return undefined
  }
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  const previous = tokens[tokens.length - 2]
  if (last.kind === 'keyword' && last.lower === 'default') {
    return previous?.text.toLowerCase() === 'drop' ? 'number' : 'value'
  }
  if (last.kind === 'keyword' && last.lower === 'comment') return 'name'
  const tail = last.text.toLowerCase()
  if (tail === 'auto_increment' || tail === 'key') return 'number'
  return undefined
}

/** Inside a `CREATE TABLE` body: the start of a column definition, or its type. */
function createColumnStage(
  tokens: readonly Token[],
): 'name' | 'columnType' | 'number' | undefined {
  let created = false
  let table = -1
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'keyword') continue
    if (token.lower === 'create') {
      created = true
      continue
    }
    if (token.lower === 'as' || token.lower === 'like') return undefined
    if (token.lower === 'table') {
      table = index
      break
    }
  }
  if (!created || table < 0) return undefined
  let open = -1
  for (let index = table + 1; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct' && token.text === '(') {
      open = index
      break
    }
  }
  if (open < 0) return undefined
  let depth = 0
  let segment = open + 1
  for (let index = open + 1; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === '(') depth += 1
    else if (token.text === ')') {
      if (depth === 0) return undefined
      depth -= 1
    } else if (token.text === ',' && depth === 0) segment = index + 1
  }
  const rest = tokens.slice(segment)
  if (rest.length === 0) return 'name'
  // `PRIMARY KEY (`, `UNIQUE KEY (`, `FOREIGN KEY (` and `INDEX (` list
  // column names, not another definition.
  const words = rest.map((token) => token.text.toLowerCase())
  const inlineConstraint = words.some(
    (word) => word === 'primary' || word === 'unique' || word === 'index' || word === 'key' || word === 'foreign',
  )
  const tail = rest[rest.length - 1]
  // The new table's own columns are not in the catalog yet, so stay quiet
  // instead of offering functions for a constraint column list.
  if (inlineConstraint && tail?.kind === 'punct' && tail.text === '(') return 'number'
  const first = rest[0] as Token
  if (rest.length === 1 && first.kind === 'ident') return 'columnType'
  return undefined
}

/** `ALTER TABLE ... ADD/MODIFY/CHANGE [COLUMN] name ` takes a column type next. */
function alterColumnStage(tokens: readonly Token[]): 'name' | 'columnType' | undefined {
  const start = alterTableStart(tokens)
  if (start < 0) return undefined
  const action = tokens[start]
  if (action === undefined || action.kind !== 'keyword') return undefined
  const verb = action.lower
  if (verb !== 'add' && verb !== 'modify' && verb !== 'change') return undefined
  let index = start + 1
  const column = tokens[index]
  if (column !== undefined && column.kind === 'keyword' && column.lower === 'column') index += 1
  const name = tokens[index]
  if (name === undefined || name.kind !== 'ident') return undefined
  const rest = tokens.slice(index + 1)
  if (verb === 'add' || verb === 'modify') return rest.length === 0 ? 'columnType' : undefined
  // CHANGE old new <type>: the new name comes first, then the type.
  if (rest.length === 0) return 'name'
  if (rest.length === 1) return 'columnType'
  return undefined
}

/** A scalar ends an expression: `SELECT 1 ` / `SELECT 'x' ` take AS/FROM. */
function scalarTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return false
  const scalar =
    last.kind === 'number' ||
    last.kind === 'string' ||
    (last.kind === 'keyword' &&
      (last.lower === 'null' || last.lower === 'true' || last.lower === 'false'))
  if (!scalar) return false
  let depth = 0
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === ')') depth += 1
      else if (token.text === '(') depth -= 1
      continue
    }
    if (depth !== 0) continue
    if (token.kind !== 'keyword') continue
    if (token.lower === 'select') return true
    if (
      token.lower === 'where' ||
      token.lower === 'having' ||
      token.lower === 'on' ||
      CONDITION_BREAKS.has(token.lower)
    ) {
      return false
    }
  }
  return false
}

/** A closed subquery: `SELECT (SELECT ...) ` takes AS/FROM, `WHERE id IN (SELECT ...) ` AND/OR. */
function subqueryClose(tokens: readonly Token[]): 'expressionTail' | 'boolean' | undefined {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'punct' || last.text !== ')') return undefined
  let depth = 0
  let open = -1
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind !== 'punct') continue
    if (token.text === ')') depth += 1
    else if (token.text === '(') {
      depth -= 1
      if (depth === 0) {
        open = index
        break
      }
    }
  }
  if (open < 0) return undefined
  const first = tokens[open + 1]
  if (
    first === undefined ||
    first.kind !== 'keyword' ||
    (first.lower !== 'select' && first.lower !== 'with')
  ) {
    return undefined
  }
  let nest = 0
  for (let index = open - 1; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === ')') nest += 1
      else if (token.text === '(') nest -= 1
      continue
    }
    if (nest !== 0) continue
    if (token.kind !== 'keyword') continue
    if (token.lower === 'select') return 'expressionTail'
    if (token.lower === 'where' || token.lower === 'having' || token.lower === 'on') {
      return 'boolean'
    }
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
function groupByPosition(tokens: readonly Token[]): 'groupTail' | 'rollupTail' | undefined {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  // `WITH ROLLUP` closes the grouping clause, a second WITH is redundant.
  if (last.text.toLowerCase() === 'rollup') return 'rollupTail'
  if (!endsOperand(last)) return undefined
  // A completed function call ends with ')': its own parenthesis is already
  // closed, so the backward scan starts one level deep.
  let depth = last.kind === 'punct' && last.text === ')' ? 1 : 0
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
      return 'groupTail'
    }
    // Another clause since GROUP BY means this operand belongs to it.
    if (
      token.lower === 'having' ||
      token.lower === 'where' ||
      token.lower === 'on' ||
      token.lower === 'select'
    ) {
      return undefined
    }
    if (CONDITION_BREAKS.has(token.lower) || token.lower === 'by') return undefined
  }
  return undefined
}

/** `FOR UPDATE ` / `FOR SHARE ` / `LOCK IN SHARE MODE ` end the statement. */
/**
 * Transaction-control tails: `START TRANSACTION`, `BEGIN`, `COMMIT`,
 * `ROLLBACK`, savepoints and isolation levels take words the catalog cannot
 * supply.
 */
function transactionTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]
  if (first === undefined) return undefined
  const start = first.text.toLowerCase()
  const words = tokens.map((token) => token.text.toLowerCase())
  const last = tokens[tokens.length - 1]
  if (start === 'start') {
    if (words[1] !== 'transaction') return undefined
    if (tokens.length === 2) return 'transaction'
    const tail = last?.text.toLowerCase()
    if (tail === 'read') return 'transactionRead'
    if (tail === 'with') return 'transactionWith'
    // READ ONLY / READ WRITE / WITH CONSISTENT SNAPSHOT: nothing to offer.
    return 'number'
  }
  if (start === 'begin' || start === 'commit') return 'number'
  if (start === 'rollback') {
    if (tokens.length === 1) return 'number'
    if (last?.text.toLowerCase() === 'to') return 'rollbackTo'
    if (last?.text.toLowerCase() === 'savepoint') return 'name'
    return 'number'
  }
  if (start === 'savepoint') return tokens.length === 1 ? 'name' : 'number'
  if (start === 'release') {
    if (tokens.length === 1) return 'rollbackTo'
    if (tokens.length === 2 && last?.text.toLowerCase() === 'savepoint') return 'name'
    return 'number'
  }
  return undefined
}

function lockClauseTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return false
  const lower = last.text.toLowerCase()
  if (lower === 'update' || lower === 'share') {
    const previous = tokens[tokens.length - 2]
    return previous !== undefined && previous.text.toLowerCase() === 'for'
  }
  if (lower === 'nowait' || lower === 'wait') return true
  if (lower === 'locked') {
    const previous = tokens[tokens.length - 2]
    return previous !== undefined && previous.text.toLowerCase() === 'skip'
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
function triggerTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  if (tokens.length < 2) return undefined
  if (tokens[0]?.text.toLowerCase() !== 'create') return undefined
  if (tokens[1]?.text.toLowerCase() !== 'trigger') return undefined
  if (tokens.length === 2) return 'name'
  if (tokens.length === 3) return 'triggerTiming'
  if (tokens.length === 4) return 'triggerEvent'
  if (tokens.length === 5) return 'triggerOn'
  const onIndex = tokens.findIndex(
    (token) => token.text.toLowerCase() === 'on' && token.kind === 'keyword',
  )
  if (onIndex < 0) return 'triggerOn'
  if (onIndex === tokens.length - 1) return 'tableName'
  const forIndex = tokens.findIndex((token) => token.text.toLowerCase() === 'for')
  if (forIndex < 0) return 'triggerFor'
  if (forIndex === tokens.length - 1) return 'triggerEach'
  const eachIndex = tokens.findIndex((token) => token.text.toLowerCase() === 'each')
  if (eachIndex < 0 || eachIndex === tokens.length - 1) return 'triggerRow'
  return 'statement'
}

function returnsTail(tokens: readonly Token[]): boolean {
  if (tokens.length < 2) return false
  if (tokens[0]?.text.toLowerCase() !== 'create') return false
  const index = tokens.findIndex((token) => token.text.toLowerCase() === 'returns')
  return index >= 0 && index === tokens.length - 1
}

function declareTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  if (tokens[0]?.text.toLowerCase() !== 'declare') return undefined
  const last = tokens[tokens.length - 1]
  if (last?.kind === 'keyword' && last.lower === 'default') return 'value'
  if (tokens.length === 1) return 'name'
  if (tokens.length === 2) return 'columnType'
  return 'number'
}

/** `CREATE [OR REPLACE] PROCEDURE|FUNCTION name (...)`: walks the definition. */
/** Inside a routine BEGIN body: labels and cursor names are not catalog objects. */
function routineStatementTail(
  tokens: readonly Token[],
): CompletionExpectation | undefined {
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  const tail = last.text.toLowerCase()
  if (tail === 'leave' || tail === 'iterate' || tail === 'open' || tail === 'close') {
    return 'name'
  }
  if (tail === 'fetch' || tail === 'signal' || tail === 'resignal') return 'number'
  if (tail === 'diagnostics' || tail === 'message_text' || tail === '=') return 'number'
  return undefined
}

/** `data->` / `data->>` must be followed by a quoted JSON path. */
function jsonArrowTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'punct' || last.text !== '>') return false
  let index = tokens.length - 1
  while (index > 0) {
    const previous = tokens[index - 1] as Token
    if (previous.kind === 'punct' && previous.text === '>') {
      index -= 1
      continue
    }
    return previous.kind === 'punct' && previous.text === '-'
  }
  return false
}

/** Inside a table body, `CHECK (` and `GENERATED … AS (` take expressions. */
function tableExpressionParen(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'punct' || last.text !== '(') return false
  const previous = tokens[tokens.length - 2]
  const owner = previous?.text.toLowerCase()
  if (owner !== 'check' && owner !== 'as') return false
  const words = tokens.map((token) => token.text.toLowerCase())
  return (words.includes('create') || words.includes('alter')) && words.includes('table')
}

/** MySQL session statements: quiet ids, option words or expressions only. */
function adminTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]?.text.toLowerCase()
  if (first === undefined) return undefined
  if (first === 'kill') return 'number'
  if (first === 'flush') {
    if (tokens.length === 1) return 'flush'
    const last = tokens[tokens.length - 1] as Token
    return last.text.toLowerCase() === 'tables' ? 'tableName' : 'number'
  }
  if (first === 'reset') return tokens.length === 1 ? 'reset' : 'number'
  if (first === 'do') return 'column'
  if (first === 'help') return 'name'
  return undefined
}

function routineTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  if (tokens.length < 2) return undefined
  if (tokens[0]?.text.toLowerCase() !== 'create') return undefined
  let index = 1
  if (tokens[1]?.text.toLowerCase() === 'or' && tokens[2]?.text.toLowerCase() === 'replace') {
    index = 3
  }
  const object = tokens[index]?.text.toLowerCase()
  if (object !== 'procedure' && object !== 'function') return undefined
  const routineBody = object === 'function'
  const nameIndex = index + 1
  if (tokens[nameIndex] === undefined) return 'name'
  const open = tokens.findIndex(
    (token, at) => at > nameIndex && token.kind === 'punct' && token.text === '(',
  )
  if (open < 0) return 'number'
  // Find the matching close; while it is unclosed the caret is in the parameters.
  let depth = 0
  let close = -1
  for (let at = open; at < tokens.length; at += 1) {
    const token = tokens[at] as Token
    if (token.kind !== 'punct') continue
    if (token.text === '(') {
      depth += 1
    } else if (token.text === ')') {
      depth -= 1
      if (depth === 0) {
        close = at
        break
      }
    }
  }
  if (close < 0) {
    let segmentStart = open
    depth = 0
    for (let at = open; at < tokens.length; at += 1) {
      const token = tokens[at] as Token
      if (token.kind !== 'punct') continue
      if (token.text === '(') depth += 1
      else if (token.text === ')' && depth > 0) depth -= 1
      else if (token.text === ',' && depth === 1) segmentStart = at
    }
    const segment = tokens
      .slice(segmentStart + 1)
      .filter((token) => token.text.toLowerCase() !== 'in')
      .filter((token) => token.text.toLowerCase() !== 'out')
      .filter((token) => token.text.toLowerCase() !== 'inout')
    if (segment.length === 0) return 'name'
    if (segment.length === 1 && segment[0]?.kind === 'ident') return 'columnType'
    return 'number'
  }
  const after = tokens.slice(close + 1).map((token) => token.text.toLowerCase())
  if (after.length === 0) return routineBody ? 'routineReturn' : 'statement'
  if (after[0] === 'returns') {
    if (after.length === 1) return 'columnType'
    // `RETURNS <type> RETURN ` starts the function body expression.
    if (after[after.length - 1] === 'return') return 'column'
    return 'number'
  }
  if (after[0] === 'begin') {
    const body = tokens.slice(close + 2)
    return routineStatementTail(body) ?? 'statement'
  }
  if (after[0] === 'return') return 'column'
  return 'number'
}

/** `CREATE [OR REPLACE] VIEW name [(columns)] AS ...`. */
function createViewTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const words = tokens.map((token) => token.text.toLowerCase())
  if (words[0] !== 'create') return undefined
  let index = 1
  if (words[1] === 'or' && words[2] === 'replace') index = 3
  if (words[index] !== 'view') return undefined
  const nameIndex = index + 1
  if (words[nameIndex] === undefined) return 'name'
  // `CREATE VIEW v AS (...)` has already started the select; the parenthesis is
  // the subquery, not a view column list.
  if (words.indexOf('as', nameIndex + 1) >= 0) return undefined
  let depth = 0
  let open = -1
  let close = -1
  for (let at = nameIndex + 1; at < words.length; at += 1) {
    const word = words[at]
    if (word === '(') {
      if (open < 0) open = at
      depth += 1
    } else if (word === ')' && depth > 0) {
      depth -= 1
      if (open >= 0 && depth === 0) {
        close = at
        break
      }
    }
  }
  if (open < 0) return 'viewTail'
  if (close < 0) {
    const last = words[words.length - 1]
    if (last === '(' || last === ',') return 'name'
    return 'number'
  }
  return 'viewTail'
}

/** `CREATE EVENT name ON SCHEDULE ... [DO ...]`. */
function createEventTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const words = tokens.map((token) => token.text.toLowerCase())
  if (words[0] !== 'create') return undefined
  let index = 1
  if (words[index] === 'definer') {
    while (tokens[index] !== undefined && tokens[index]?.text !== '=') index += 1
    index += 1
  }
  if (words[index] !== 'event') return undefined
  const nameIndex = index + 1
  if (words[nameIndex] === undefined) return 'name'
  if (words[nameIndex + 1] === undefined) return 'eventOn'
  const onIndex = words.indexOf('on', nameIndex + 1)
  if (onIndex < 0) return 'eventOn'
  const scheduleIndex = words.indexOf('schedule', onIndex + 1)
  if (onIndex === words.length - 1) return 'eventSchedule'
  if (scheduleIndex < 0) return 'eventSchedule'
  if (scheduleIndex === words.length - 1) return 'eventTiming'
  const timing = words[scheduleIndex + 1]
  const rest = tokens.slice(scheduleIndex + 2)
  if (timing === 'every' && rest.length === 0) return 'number'
  if (timing === 'every' && rest.length === 1 && rest[0]?.kind === 'number') return 'interval'
  if (timing === 'at' && rest.length === 0) return 'number'
  const last = words[words.length - 1] as string
  if (last === 'starts' || last === 'ends') return 'number'
  const doIndex = words.indexOf('do', scheduleIndex + 1)
  if (doIndex >= 0) return doIndex === words.length - 1 ? 'statement' : undefined
  return 'eventTail'
}


/** `TRIM(BOTH ' ' FROM ` finishes a function argument, not a FROM clause. */
function functionArgumentFrom(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'keyword' || last.lower !== 'from') return false
  let depth = 0
  for (let at = tokens.length - 1; at >= 0; at -= 1) {
    const token = tokens[at] as Token
    if (token.kind !== 'punct') continue
    if (token.text === ')') {
      depth += 1
    } else if (token.text === '(') {
      if (depth > 0) {
        depth -= 1
        continue
      }
      const owner = tokens[at - 1]
      return owner !== undefined && owner.kind === 'ident'
    }
  }
  return false
}

/** `SELECT ... INTO ` takes OUTFILE or DUMPFILE; `@var` needs no completion. */
function selectInto(tokens: readonly Token[]): boolean {
  if (tokens[0]?.text.toLowerCase() !== 'select') return false
  const last = tokens[tokens.length - 1]
  return last !== undefined && last.kind === 'keyword' && last.lower === 'into'
}

/** `INSERT INTO orders ` takes VALUES / SELECT / SET, not another relation. */
function insertTargetTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]?.text.toLowerCase()
  if (first !== 'insert' && first !== 'replace') return false
  const intoIndex = tokens.findIndex((token) => token.text.toLowerCase() === 'into')
  if (intoIndex < 0) return false
  const target = parseRelationRef(tokens, intoIndex + 1)
  return target !== null && target.next === tokens.length
}

/** `FORCE INDEX (`, `USE INDEX (` and `IGNORE INDEX (` list index names. */
function indexHint(tokens: readonly Token[]): boolean {
  const words = tokens.map((token) => token.text.toLowerCase())
  let hint = -1
  for (let index = 0; index < words.length - 1; index += 1) {
    if (
      (words[index] === 'force' || words[index] === 'use' || words[index] === 'ignore') &&
      (words[index + 1] === 'index' || words[index + 1] === 'key')
    ) {
      hint = index
    }
  }
  if (hint < 0) return false
  let depth = 0
  let opened = false
  for (let index = hint + 2; index < tokens.length; index += 1) {
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

/** `FOR UPDATE`/`FOR SHARE` tails: OF names tables, then nothing catalog-bound. */
function forLockTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const words = tokens.map((token) => token.text.toLowerCase())
  if (!words.includes('for')) return undefined
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  const tail = last.text.toLowerCase()
  if (tail === 'update' || tail === 'share') return 'number'
  if (tail === 'of') return 'tableName'
  if (words[words.length - 2] === 'of') return 'number'
  return undefined
}

/** `FETCH FIRST ` and `OFFSET n ROWS ` take numbers only. */
function fetchTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const words = tokens.map((token) => token.text.toLowerCase())
  // FETCH [FIRST|NEXT] [n] [ROW|ROWS] and OFFSET n ROWS carry numbers only.
  if (words.includes('fetch')) return 'number'
  const tail = words[words.length - 1]
  if ((tail === 'rows' || tail === 'row') && words.includes('offset')) return 'number'
  return undefined
}

/** `LOAD DATA ... INTO TABLE orders ` is followed by field/line clauses. */
function loadDataTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  const first = tokens[0]
  const second = tokens[1]
  if (first?.text.toLowerCase() !== 'load' || second?.text.toLowerCase() !== 'data') {
    return undefined
  }
  const words = tokens.map((token) => token.text.toLowerCase())
  const table = words.indexOf('table')
  if (table < 0) return 'number'
  return table === words.length - 1 ? 'tableName' : 'number'
}

/** Partition method lists take columns; partition definitions take literals. */
function partitionParen(
  tokens: readonly Token[],
): CompletionExpectation | undefined {
  const last = tokens[tokens.length - 1]
  if (last?.kind !== 'punct' || last.text !== '(') return undefined
  if (!tokens.some((token) => token.text.toLowerCase() === 'partition')) return undefined
  const owner = tokens[tokens.length - 2]?.text.toLowerCase()
  if (owner === 'range' || owner === 'list' || owner === 'hash' || owner === 'key') {
    return 'column'
  }
  return 'number'
}

/** `ALTER TABLE … DROP FOREIGN KEY|CONSTRAINT|CHECK ` names a constraint. */
function alterDropConstraint(tokens: readonly Token[]): boolean {
  const start = alterTableStart(tokens)
  if (start < 0) return false
  if (tokens[start]?.text.toLowerCase() !== 'drop') return false
  const object = tokens[start + 1]?.text.toLowerCase()
  return object === 'foreign' || object === 'constraint' || object === 'check'
}

/** `GROUP_CONCAT(… SEPARATOR ` takes a literal separator. */
function separatorTail(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  return last !== undefined && last.text.toLowerCase() === 'separator'
}

/** `CONVERT(expr USING ` takes a charset name. */
function convertUsing(tokens: readonly Token[]): boolean {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'keyword' || last.lower !== 'using') return false
  let depth = 0
  for (let at = tokens.length - 1; at >= 0; at -= 1) {
    const token = tokens[at] as Token
    if (token.kind !== 'punct') continue
    if (token.text === ')') {
      depth += 1
    } else if (token.text === '(') {
      if (depth > 0) {
        depth -= 1
        continue
      }
      const owner = tokens[at - 1]
      return owner !== undefined && owner.kind === 'ident' && owner.lower === 'convert'
    }
  }
  return false
}

/** `SELECT … INTO @a, ` still types the variable list. */
function selectIntoVariableTail(tokens: readonly Token[]): boolean {
  if (tokens[0]?.text.toLowerCase() !== 'select') return false
  if (!tokens.some((token) => token.kind === 'keyword' && token.lower === 'into')) return false
  const last = tokens[tokens.length - 1]
  return last?.kind === 'punct' && last.text === ','
}

/** Deprecated `SELECT … PROCEDURE ANALYSE` tail. */
function procedureQuietTail(tokens: readonly Token[]): boolean {
  if (tokens[0]?.text.toLowerCase() !== 'select') return false
  const last = tokens[tokens.length - 1]
  return last?.kind === 'keyword' && last.lower === 'procedure'
}

/** `ALTER TABLE … ALGORITHM= ` / `LOCK= ` take a fixed option word. */
function alterOptionAssignment(
  tokens: readonly Token[],
): CompletionExpectation | undefined {
  const last = tokens[tokens.length - 1]
  if (last === undefined || last.kind !== 'punct' || last.text !== '=') return undefined
  if (alterTableStart(tokens) < 0) return undefined
  const option = tokens[tokens.length - 2]?.text.toLowerCase()
  if (option === 'algorithm') return 'algorithm'
  if (option === 'lock') return 'lockOption'
  return undefined
}

/** `DROP TRIGGER|USER|… ` names an object that is not a catalog table. */
function dropObjectTail(tokens: readonly Token[]): boolean {
  const first = tokens[0]?.text.toLowerCase()
  if (first !== 'drop') return false
  const object = tokens[1]?.text.toLowerCase()
  return (
    object === 'trigger' ||
    object === 'procedure' ||
    object === 'function' ||
    object === 'event' ||
    object === 'user' ||
    object === 'role' ||
    object === 'server' ||
    object === 'sequence'
  )
}

/** `ALTER USER|ROLE … ` never takes a table or a column here. */
function alterUserTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  if (tokens[0]?.text.toLowerCase() !== 'alter') return undefined
  const object = tokens[1]?.text.toLowerCase()
  if (object !== 'user' && object !== 'role') return undefined
  return tokens.length === 2 ? 'name' : 'number'
}

/** `UPDATE orders ` (or `UPDATE orders o `) continues with SET. */
function updateTail(tokens: readonly Token[]): boolean {
  if (tokens[0]?.text.toLowerCase() !== 'update') return false
  if (tokens.length < 2) return false
  if (tokens.some((token) => token.text.toLowerCase() === 'set')) return false
  const last = tokens[tokens.length - 1] as Token
  if (last.kind === 'punct' && last.text === ',') return false
  return last.text.toLowerCase() !== 'join' && last.text.toLowerCase() !== 'using'
}

/** A user variable ends a SELECT list item: an alias or FROM comes next. */
function variableTail(tokens: readonly Token[]): CompletionExpectation | undefined {
  if (tokens[0]?.text.toLowerCase() !== 'select') return undefined
  const last = tokens[tokens.length - 1]
  if (last === undefined) return undefined
  return last.text.startsWith('@') ? 'expressionTail' : undefined
}

function expectationAt(tokens: readonly Token[]): CompletionExpectation {
  // COLLATE always names a collation, wherever it appears.
  if (collationValue(tokens)) return 'collation'
  // CHARACTER SET names a charset wherever it appears, including column
  // definitions inside CREATE TABLE / routines.
  if (charsetValue(tokens)) return 'charset'
  // `CONVERT(expr USING <charset>)` names a charset even though the shared
  // CHARACTER SET helper above cannot see it.
  if (convertUsing(tokens)) return 'charset'
  // Partition definitions carry literals, and index names are not catalog
  // objects this engine can list.
  const partition = partitionParen(tokens)
  if (partition !== undefined) return partition
  if (indexHint(tokens)) return 'number'
  if (alterIndexColumns(tokens)) return 'column'
  if (columnLength(tokens)) return 'number'
  const columnOption = createColumnOption(tokens)
  if (columnOption !== undefined) return columnOption
  const alterColumnSetting = alterColumnOption(tokens)
  if (alterColumnSetting !== undefined) return alterColumnSetting
  if (tableExpressionParen(tokens)) return 'column'
  const columnStage = createColumnStage(tokens)
  if (columnStage !== undefined) return columnStage
  if (referencesTail(tokens)) return 'tableName'
  if (insideCreateTableParen(tokens)) return 'definition'
  const tableTail = createTableBodyTail(tokens)
  if (tableTail !== undefined) return tableTail
  if (createTableAs(tokens)) return 'statement'
  if (createViewAs(tokens) || afterCteDefinition(tokens)) return 'statement'
  const view = createViewTail(tokens)
  if (view !== undefined) return view
  if (createTableLike(tokens)) return 'tableName'
  if (createObjectName(tokens)) return 'name'
  const routine = routineTail(tokens)
  if (routine !== undefined) return routine
  const event = createEventTail(tokens)
  if (event !== undefined) return event
  const trigger = triggerTail(tokens)
  if (trigger !== undefined) return trigger
  if (returnsTail(tokens)) return 'columnType'
  const declared = declareTail(tokens)
  if (declared !== undefined) return declared
  if (createTableOptionsTail(tokens)) return 'tableOptions'
  if (indexUsingTail(tokens)) return 'indexMethod'
  const alterColumn = alterColumnStage(tokens)
  if (alterColumn !== undefined) return alterColumn
  if (alterDropConstraint(tokens)) return 'name'
  const alterOption = alterOptionAssignment(tokens)
  if (alterOption !== undefined) return alterOption
  const alter = alterExpectation(tokens)
  if (alter !== undefined) return alter
  const alterEngine = alterTableEngine(tokens)
  if (alterEngine !== undefined) return alterEngine
  const indexOn = createIndexOn(tokens)
  if (indexOn >= 0) {
    const target = parseRelationRef(tokens, indexOn + 1)
    if (target === null) return 'tableName'
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
  if (trailingIfExists(tokens)) return 'tableName'
  if (useDatabase(tokens)) return 'database'
  // `USE shop ` already named the database; nothing catalog-bound follows.
  if (tokens.length > 1 && tokens[0]?.text.toLowerCase() === 'use') return 'number'
  const alterUser = alterUserTail(tokens)
  if (alterUser !== undefined) return alterUser
  const transaction = transactionTail(tokens)
  if (transaction !== undefined) return transaction
  const call = callStart(tokens)
  if (call !== undefined) return call
  if (ddlTableName(tokens)) return 'tableName'
  if (dropObjectTail(tokens)) return 'name'
  const load = loadDataTail(tokens)
  if (load !== undefined) return load
  const deleteSource = deleteUsing(tokens)
  if (deleteSource !== undefined) return deleteSource
  if (tableNameTail(tokens)) return 'number'
  if (renameTableTail(tokens)) return 'name'
  // `INSERT ... ON DUPLICATE KEY UPDATE col = ` assigns a value, not a table.
  if (duplicateKeyValue(tokens)) return 'value'
  // `LOCK TABLES orders ` takes an access mode, not a table.
  const lockTable = lockTableTail(tokens)
  if (lockTable !== undefined) return lockTable
  if (updateTail(tokens)) return 'assignment'
  if (functionArgumentFrom(tokens)) return 'column'
  if (insertTargetTail(tokens)) return 'insertSource'
  if (relationKeywordTail(tokens)) return 'relation'
  if (lockClauseTail(tokens)) return 'number'
  if (selectInto(tokens)) return 'intoTarget'
  if (selectIntoVariableTail(tokens)) return 'number'
  if (literalTail(tokens)) return 'number'
  const insertSet = insertSetPosition(tokens)
  if (insertSet !== undefined) return insertSet
  if (insertColumnListComplete(tokens)) return 'insertSource'
  if (usingTail(tokens)) return 'joinTail'
  if (usingParenOpen(tokens)) return 'using'
  if (privilegePosition(tokens)) return 'privilege'
  if (grantTarget(tokens)) return 'tableName'
  if (describesTable(tokens)) return 'relation'
  if (describeTableTail(tokens)) return 'name'
  if (dropIndexOn(tokens)) return 'relation'
  if (objectName(tokens)) return 'name'
  if (dropDatabase(tokens)) return 'database'
  if (grantee(tokens)) return 'name'
  const withOption = grantWith(tokens)
  if (withOption !== undefined) return withOption
  if (granteeTail(tokens)) return 'number'
  if (unionStatement(tokens)) return 'statement'
  if (explainStart(tokens)) return 'statement'
  const show = showTail(tokens)
  if (show !== undefined) return show
  if (showStart(tokens)) return 'show'
  if (showPatternTail(tokens)) return 'number'
  if (procedureQuietTail(tokens)) return 'number'
  if (separatorTail(tokens)) return 'number'
  const admin = adminTail(tokens)
  if (admin !== undefined) return admin
  if (limitCount(tokens)) return 'number'
  if (limitTail(tokens)) return 'number'
  const fetch = fetchTail(tokens)
  if (fetch !== undefined) return fetch
  if (createTableEngine(tokens)) return 'engine'
  if (partitionBy(tokens)) return 'partition'
  if (charsetValue(tokens)) return 'charset'
  const assignment = tableOptionAssignment(tokens)
  if (assignment !== undefined) return assignment
  const optionValue = tableOptionValue(tokens)
  if (optionValue !== undefined) return optionValue
  if (afterTableOptionValue(tokens)) return 'tableOptions'
  const setTransaction = setTransactionTail(tokens)
  if (setTransaction !== undefined) return setTransaction
  if (isolationStart(tokens)) return 'isolation'
  const set = setStatement(tokens)
  if (set !== undefined) return set
  if (duplicateKeyUpdate(tokens)) return 'column'
  if (valuesListComplete(tokens)) return 'insertTail'
  if (valuesNextTuple(tokens)) return 'number'
  if (castAs(tokens)) return 'type'
  const interval = intervalTail(tokens)
  if (interval !== undefined) return interval
  const expression = expressionTail(tokens)
  if (expression !== undefined) return expression
  if (scalarTail(tokens)) return 'expressionTail'
  const subquery = subqueryClose(tokens)
  if (subquery !== undefined) return subquery
  if (jsonArrowTail(tokens)) return 'number'
  const variable = variableTail(tokens)
  if (variable !== undefined) return variable
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
  // LIKE takes a pattern literal, so no column list belongs here.
  if (last?.kind === 'keyword' && last.lower === 'like') return 'number'
  // `RETURN ` in a routine body starts an expression (RETURN is not a
  // reserved word in every dialect, so match the text).
  if (last !== undefined && last.text.toLowerCase() === 'return') return 'column'
  if (escapeTail(tokens)) return 'number'
  if (lockStart(tokens)) return 'lock'
  if (forLengthTail(tokens)) return 'number'
  const forLock = forLockTail(tokens)
  if (forLock !== undefined) return forLock
  // `OVER w ` and a closed `WINDOW w AS (...)` end the window expression.
  if (namedWindowTail(tokens)) return 'expressionTail'
  // `OVER (...)`/`WINDOW ... AS (...)`: the spec's own PARTITION BY / ORDER BY
  // / frame clause decides, before the statement's ORDER BY rules apply.
  const window = windowExpectation(tokens)
  if (window !== undefined) return window
  const nulls = nullsTail(tokens)
  if (nulls !== undefined) return nulls
  const order = orderByPosition(tokens)
  if (order !== undefined) return order
  const group = groupByPosition(tokens)
  if (group !== undefined) return group
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
/** The table an `INSERT INTO ... SELECT` fills; its columns are not visible in the select list. */
function insertSelectTarget(tokens: readonly Token[]): CompletionRelation | undefined {
  const first = tokens[0]
  if (first === undefined) return undefined
  const head = first.text.toLowerCase()
  if (head !== 'insert' && head !== 'replace') return undefined
  let into = -1
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.kind === 'keyword' && token.lower === 'into') {
      into = index
      break
    }
  }
  if (into < 0) return undefined
  const parsed = parseRelationRef(tokens, into + 1)
  if (parsed === null) return undefined
  const hasSelect = tokens
    .slice(parsed.next)
    .some((token) => token.kind === 'keyword' && token.lower === 'select')
  return hasSelect ? parsed.relation : undefined
}

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
    (token) =>
      token.text !== '' && token.end <= wordStartRelative && token.start < caretRelative,
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
  let expectation = expectationAt(statementTokens)
  // A dotted caret (`orders.`, `shop.orders.`, `u.`) always wants a member of
  // the qualifier, whatever clause it appears in.
  if (qualifier.length > 0 && expectation !== 'schema') expectation = 'column'
  const relations = collectRelations(statementTokens, withClause.ctes)
  const insertTarget = insertSelectTarget(statementTokens)
  const insertTargetKey = insertTarget === undefined ? undefined : relationKey(insertTarget)
  if (insertTargetKey !== undefined) {
    const kept = relations.filter((relation) => relationKey(relation) !== insertTargetKey)
    relations.length = 0
    relations.push(...kept)
  }
  // Two cases need the rest of the statement: a dotted qualifier whose alias is
  // only written in a later FROM (`SELECT o. FROM orders o`), and a select list
  // typed before its FROM (`SELECT id | FROM orders`). Spell the statement out
  // to the end and read the relations there; the caret's clause is still
  // decided from the tokens before it only.
  const needsLaterRelations = qualifier.length > 0 || (expectation === 'column' && relations.length === 0)
  if (needsLaterRelations) {
    const remainder = tokens.filter((token) => token.start >= word.end - bounds.start)
    const seen = new Set(relations.map(relationKey))
    for (const relation of collectRelations(remainder, withClause.ctes)) {
      const key = relationKey(relation)
      if (key === insertTargetKey || seen.has(key)) continue
      seen.add(key)
      relations.push(relation)
    }
  }

  const analysis: Analysis = { masked, statement, relations, expectation, qualifier, word }
  if (isInsideCommentOrString(text, at)) analysis.inLiteral = true
  if (ctes.length > 0) analysis.ctes = ctes
  if (cteRelations.length > 0) analysis.cteRelations = cteRelations
  return analysis
}

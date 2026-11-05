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
 * The kind of name the caret position expects, found by walking back to the
 * nearest clause word. Separators (`,`, `(`, `.`) are skipped on the way.
 */
function expectationAt(tokens: readonly Token[]): CompletionExpectation {
  if (insideCreateTableParen(tokens)) return 'definition'
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
    const key = [resolved.schema ?? '', resolved.table, resolved.alias ?? '']
      .join('\u0000')
      .toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    relations.push(resolved)
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
      const notToken = tokens[cursor + 1]
      const existsToken = tokens[cursor + 2]
      if (
        ifToken?.kind === 'ident' &&
        ifToken.lower === 'if' &&
        notToken?.kind === 'keyword' &&
        notToken.lower === 'not' &&
        existsToken?.kind === 'keyword' &&
        existsToken.lower === 'exists'
      ) {
        cursor += 3
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

  // Tokens are relative to `masked`; the identifier under the caret is not part
  // of the already-typed context, so it is excluded.
  const tokens = tokenize(masked)
  const caretRelative = at - bounds.start
  const wordStartRelative = word.start - bounds.start
  const before = tokens.filter(
    (token) => token.end <= wordStartRelative && token.start < caretRelative,
  )

  // A leading WITH defines names that only the main statement can use; the CTE
  // bodies themselves are not part of the caret's clause.
  const withClause = parseWith(before)
  const statementTokens =
    withClause.mainStart > 0 ? before.slice(withClause.mainStart) : before
  const ctes = withClause.ctes.map((definition) => definition.name)
  const relations = collectRelations(statementTokens, withClause.ctes)
  let expectation = expectationAt(statementTokens)
  // A dotted caret (`orders.`, `shop.orders.`, `u.`) always wants a member of
  // the qualifier, whatever clause it appears in.
  if (qualifier.length > 0 && expectation !== 'schema') expectation = 'column'

  const analysis: Analysis = { masked, statement, relations, expectation, qualifier, word }
  if (isInsideCommentOrString(text, at)) analysis.inLiteral = true
  if (ctes.length > 0) analysis.ctes = ctes
  return analysis
}

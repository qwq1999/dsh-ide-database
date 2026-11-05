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
import { maskCommentsAndStrings, tokenize, type Token } from './tokenizer'
import type {
  Analysis,
  CompletionExpectation,
  CompletionRelation,
  WordAtCaret,
} from './types'

/** Keywords that introduce a relation (a table, view or derived table). */
const RELATION_STARTERS = new Set(['from', 'join', 'into', 'update', 'table'])

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
 * The kind of name the caret position expects, found by walking back to the
 * nearest clause word. Separators (`,`, `(`, `.`) are skipped on the way.
 */
function expectationAt(tokens: readonly Token[]): CompletionExpectation {
  let sawOpenParen = false
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index] as Token
    if (token.kind === 'punct') {
      if (token.text === '(') sawOpenParen = true
      continue
    }
    if (token.kind !== 'keyword') continue
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
    const alias = aliasAt(tokens, cursor)
    const relation: CompletionRelation = { table: '' }
    if (alias.alias !== undefined) relation.alias = alias.alias
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

/** Relations mentioned by the token prefix before the caret. */
function collectRelations(tokens: readonly Token[]): CompletionRelation[] {
  const relations: CompletionRelation[] = []
  const seen = new Set<string>()
  const push = (relation: CompletionRelation): void => {
    if (relation.table === '' && (relation.alias === undefined || relation.alias === '')) return
    const key = [relation.schema ?? '', relation.table, relation.alias ?? '']
      .join('\u0000')
      .toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    relations.push(relation)
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

  const relations = collectRelations(before)
  let expectation = expectationAt(before)
  // A dotted caret (`orders.`, `shop.orders.`, `u.`) always wants a member of
  // the qualifier, whatever clause it appears in.
  if (qualifier.length > 0 && expectation !== 'schema') expectation = 'column'

  return { masked, statement, relations, expectation, qualifier, word }
}

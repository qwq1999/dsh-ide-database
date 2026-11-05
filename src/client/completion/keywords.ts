/**
 * SQL keywords and built-in functions, grouped by the kind of expression they
 * can start. The console shows a much shorter list than a full grammar: only
 * the words that make sense right after the caret's clause.
 */
import type { ClientConnection } from '../../shared/types'
import type { Completion, CompletionExpectation } from './types'

/** Keywords that can start a statement. */
const STATEMENT_WORDS = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'WITH',
  'EXPLAIN',
  'ANALYZE',
  'CREATE',
  'DROP',
  'ALTER',
  'USE',
  'TRUNCATE',
  'MERGE',
  'REPLACE',
  'SHOW',
  'DESCRIBE',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'DECLARE',
] as const

/** Keywords that may follow a complete relation in FROM/JOIN position. */
const RELATION_WORDS = [
  'WHERE',
  'JOIN',
  'INTO',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'FULL',
  'CROSS',
  'NATURAL',
  'ON',
  'USING',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
  'OFFSET',
  'FETCH',
  'UNION',
  'EXCEPT',
  'INTERSECT',
  'RETURNING',
  'SET',
  'VALUES',
  'AS',
] as const

/** Keywords that continue an expression (SELECT list, WHERE, ON, ...). */
const EXPRESSION_WORDS = [
  'AND',
  'OR',
  'NOT',
  'NULL',
  'BETWEEN',
  'LIKE',
  'IN',
  'IS',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'DISTINCT',
  'EXISTS',
  'ASC',
  'DESC',
  'TRUE',
  'FALSE',
  'ESCAPE',
  'COLLATE',
  'INTERVAL',
  'OVER',
  'PARTITION',
  'FILTER',
] as const

/** Keywords that follow a DDL verb while naming the schema object. */
const SCHEMA_WORDS = [
  'TABLE',
  'VIEW',
  'SCHEMA',
  'DATABASE',
  'INDEX',
  'SEQUENCE',
  'TRIGGER',
  'FUNCTION',
  'PROCEDURE',
  'TYPE',
] as const

/** Keywords in alias position (only `AS` can really start one). */
const ALIAS_WORDS = ['AS'] as const

/**
 * Every word the tolerant tokenizer should report as a keyword. It is a
 * curated reserved-word list rather than a full SQL grammar: common names
 * such as `status` or `total` must stay identifiers so relations and aliases
 * parse correctly.
 */
const RESERVED_WORDS = [
  ...STATEMENT_WORDS,
  ...RELATION_WORDS,
  ...EXPRESSION_WORDS,
  ...SCHEMA_WORDS,
  'FROM',
  'INTO',
  'BY',
  'ALL',
  'ANY',
  'SOME',
  'FOR',
  'RECURSIVE',
  'LATERAL',
  'COLUMN',
  'ADD',
  'MODIFY',
  'RENAME',
  'CASCADE',
  'RESTRICT',
  'CONSTRAINT',
  'PRIMARY',
  'FOREIGN',
  'REFERENCES',
  'UNIQUE',
  'CHECK',
  'DEFAULT',
  'AUTO_INCREMENT',
  'COMMENT',
  'GRANT',
  'REVOKE',
  'LOCK',
  'UNLOCK',
  'CONNECT',
  'MINUS',
  'TOP',
  'OUTPUT',
  'ILIKE',
  'ATTACH',
  'DETACH',
  'PRAGMA',
] as const

const RESERVED = new Set(RESERVED_WORDS.map((word) => word.toLowerCase()))

/** True when `word` (any case) is a reserved word for the completion lexer. */
export function isKeyword(word: string): boolean {
  return RESERVED.has(word.toLowerCase())
}

/** Extra words the generic popup offers although no clause pins them. */
const LOOSE_WORDS = ['FROM'] as const

/**
 * Every keyword the popup can offer when the caret position does not pin a
 * clause: statement starters, words that follow a relation, words that
 * continue an expression, plus a few connector words.
 */
const ANY_WORDS = [...STATEMENT_WORDS, ...RELATION_WORDS, ...EXPRESSION_WORDS, ...LOOSE_WORDS] as const

function uniqueWords(words: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const word of words) {
    const upper = word.toUpperCase()
    if (seen.has(upper)) continue
    seen.add(upper)
    result.push(upper)
  }
  return result
}

/** Flat list of every keyword suggestion, in popup order. */
export const SQL_KEYWORDS: readonly string[] = uniqueWords(ANY_WORDS)

function contextWords(context: CompletionExpectation): readonly string[] {
  switch (context) {
    case 'relation':
      return RELATION_WORDS
    case 'column':
      return EXPRESSION_WORDS
    case 'schema':
      return SCHEMA_WORDS
    case 'alias':
      return ALIAS_WORDS
    case 'keyword':
      return ANY_WORDS
    case 'any':
    default:
      return ANY_WORDS
  }
}

/**
 * Keyword suggestions for the given context. `dialect` is accepted for
 * symmetry with {@link functionCompletions}; the words themselves are shared
 * by every dialect.
 */
export function keywordCompletions(
  context: CompletionExpectation = 'any',
  dialect: ClientConnection['dialect'] = 'generic',
): Completion[] {
  void dialect
  const words = contextWords(context)
  return uniqueWords(words).map((name) => ({ name, kind: 'keyword' as const }))
}

/** Functions every dialect shares. */
const COMMON_FUNCTIONS = [
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'COALESCE',
  'CAST',
  'ROUND',
  'ABS',
  'CONCAT',
  'SUBSTR',
  'LENGTH',
  'UPPER',
  'LOWER',
  'TRIM',
  'REPLACE',
  'NOW',
  'ROW_NUMBER',
  'RANK',
  'DENSE_RANK',
] as const

const MYSQL_FUNCTIONS = [
  'IFNULL',
  'DATE_FORMAT',
  'GROUP_CONCAT',
  'CURDATE',
  'JSON_EXTRACT',
  'JSON_UNQUOTE',
  'IF',
] as const

const ORACLE_FUNCTIONS = [
  'NVL',
  'NVL2',
  'TO_DATE',
  'TO_CHAR',
  'TO_NUMBER',
  'SYSDATE',
  'DECODE',
  'TRUNC',
  'INSTR',
] as const

const POSTGRES_FUNCTIONS = [
  'TO_CHAR',
  'TO_DATE',
  'TO_TIMESTAMP',
  'DATE_TRUNC',
  'STRING_AGG',
  'ARRAY_AGG',
  'GENERATE_SERIES',
  'EXTRACT',
  'MAKE_INTERVAL',
  'JSON_BUILD_OBJECT',
] as const

function dialectFunctions(dialect: ClientConnection['dialect']): readonly string[] {
  switch (dialect) {
    case 'mysql':
      return [...COMMON_FUNCTIONS, ...MYSQL_FUNCTIONS]
    case 'oracle':
    case 'oceanbase-oracle':
    case 'dameng':
      return [...COMMON_FUNCTIONS, ...ORACLE_FUNCTIONS]
    case 'postgres':
      return [...COMMON_FUNCTIONS, ...POSTGRES_FUNCTIONS]
    default:
      return COMMON_FUNCTIONS
  }
}

/**
 * Function suggestions for the dialect. `insert` already holds the opening
 * parenthesis so picking `COUNT` leaves the caret inside the call.
 */
export function functionCompletions(
  dialect: ClientConnection['dialect'] = 'generic',
): Completion[] {
  const seen = new Set<string>()
  const items: Completion[] = []
  for (const name of dialectFunctions(dialect)) {
    const upper = name.toUpperCase()
    if (seen.has(upper)) continue
    seen.add(upper)
    items.push({ name: upper, kind: 'function', insert: `${upper}(` })
  }
  return items
}

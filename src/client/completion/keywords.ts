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

/**
 * Keywords that continue an expression (SELECT list, WHERE, ON, ...). `FROM`
 * leads: a select list ends by offering it, and the popup caps its rows, so a
 * word inserted late in this list may never be displayed.
 */
const EXPRESSION_WORDS = [
  'FROM',
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

/** Actions that follow `ALTER TABLE <name>`. */
const ALTER_WORDS = ['ADD', 'DROP', 'MODIFY', 'CHANGE', 'RENAME', 'ALTER'] as const

/** Objects an `ALTER TABLE` action can target. */
const ALTER_OBJECT_WORDS = [
  'COLUMN',
  'CONSTRAINT',
  'INDEX',
  'KEY',
  'PRIMARY',
  'FOREIGN',
  'UNIQUE',
  'CHECK',
  'DEFAULT',
  'TO',
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
  'TO',
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
  'CHANGE',
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

/**
 * Clause words the generic popup leads with: they are the most common next
 * steps and must survive the popup's item cap on large schemas.
 */
const CLAUSE_WORDS = ['SELECT', 'FROM', 'WHERE'] as const

/**
 * Every keyword the popup can offer when the caret position does not pin a
 * clause: the leading clause words, statement starters, words that follow a
 * relation, and words that continue an expression.
 */
const ANY_WORDS = [
  ...CLAUSE_WORDS,
  ...STATEMENT_WORDS,
  ...RELATION_WORDS,
  ...EXPRESSION_WORDS,
] as const

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

/**
 * Words only some servers understand. They are merged into the shared list for
 * their dialect; `contexts` keeps them out of clauses where they make no sense
 * (for example `PIVOT` is not offered while the caret is in an alias list).
 */
interface DialectWordGroup {
  readonly words: readonly string[]
  readonly contexts: readonly ('relation' | 'column')[]
}

const MYSQL_KEYWORDS: DialectWordGroup = {
  words: [
    'STRAIGHT_JOIN',
    'REGEXP',
    'RLIKE',
    'IGNORE',
    'DUPLICATE',
    'BINARY',
    'FORCE',
    'SQL_CALC_FOUND_ROWS',
    'SEPARATOR',
    'SQL_NO_CACHE',
  ],
  contexts: ['relation', 'column'],
}

const ORACLE_KEYWORDS: DialectWordGroup = {
  words: ['CONNECT', 'START', 'PRIOR', 'SIBLINGS', 'PIVOT', 'UNPIVOT', 'ROWNUM', 'MODEL', 'KEEP', 'SAMPLE', 'FLASHBACK'],
  contexts: ['relation', 'column'],
}

const POSTGRES_KEYWORDS: DialectWordGroup = {
  words: ['CONFLICT', 'DO', 'NOTHING', 'SIMILAR', 'OVERLAPS', 'WITHIN'],
  contexts: ['column'],
}

function dialectWordGroup(dialect: ClientConnection['dialect']): DialectWordGroup | undefined {
  switch (dialect) {
    case 'mysql':
      return MYSQL_KEYWORDS
    case 'oracle':
    case 'oceanbase-oracle':
    case 'dameng':
      return ORACLE_KEYWORDS
    case 'postgres':
      return POSTGRES_KEYWORDS
    default:
      return undefined
  }
}


/** Scalar placeholders valid where a value expression is expected. */
const VALUE_WORDS = ['DEFAULT', 'NULL', 'TRUE', 'FALSE'] as const

/** DDL words that can follow a column name in a `CREATE TABLE` body. */
const DEFINITION_WORDS = [
  'PRIMARY',
  'KEY',
  'NOT',
  'NULL',
  'DEFAULT',
  'UNIQUE',
  'CHECK',
  'REFERENCES',
  'CONSTRAINT',
  'AUTO_INCREMENT',
  'COMMENT',
  'COLLATE',
  'UNSIGNED',
] as const

/** Table options that may follow the closing parenthesis of `CREATE TABLE`. */
const TABLE_OPTION_WORDS = [
  'AS',
  'ENGINE',
  'DEFAULT',
  'CHARSET',
  'CHARACTER',
  'COLLATE',
  'COMMENT',
  'AUTO_INCREMENT',
  'PARTITION',
  'ROW_FORMAT',
  'TABLESPACE',
] as const

/**
 * Storage engines offered after `ENGINE =`. Kept in the spelling MySQL
 * documents; engine names are case insensitive, so the original case is nicer
 * to read than the uppercased keyword list.
 */
export const ENGINE_NAMES = [
  'InnoDB',
  'MyISAM',
  'MEMORY',
  'CSV',
  'ARCHIVE',
  'BLACKHOLE',
  'FEDERATED',
  'NDB',
  'PERFORMANCE_SCHEMA',
  'MRG_MYISAM',
] as const

/**
 * Words a `SET` statement starts with. The variable name and its literal are
 * user text, so nothing from the catalog belongs here.
 */
const SET_WORDS = [
  'NAMES',
  'SESSION',
  'GLOBAL',
  'LOCAL',
  'TRANSACTION',
  'CHARACTER',
  'PASSWORD',
  'ROLE',
] as const

/** Types a `CAST(value AS ` can name. */
const CAST_TYPE_WORDS = [
  'SIGNED',
  'UNSIGNED',
  'CHAR',
  'VARCHAR',
  'BINARY',
  'INT',
  'INTEGER',
  'DECIMAL',
  'NUMERIC',
  'DATE',
  'DATETIME',
  'TIME',
  'TIMESTAMP',
  'JSON',
  'FLOAT',
  'DOUBLE',
  'TEXT',
  'BLOB',
] as const

/**
 * Character sets offered after `SET NAMES` or `DEFAULT CHARSET`. Kept in the
 * spelling MySQL documents; names are case insensitive.
 */
export const CHARSET_NAMES = [
  'utf8mb4',
  'utf8',
  'latin1',
  'ascii',
  'binary',
  'gbk',
  'gb18030',
  'utf16',
  'utf32',
  'big5',
] as const

/** Subcommands a `SHOW ` statement can name. */
const SHOW_WORDS = [
  'TABLES',
  'DATABASES',
  'SCHEMAS',
  'COLUMNS',
  'FIELDS',
  'INDEX',
  'INDEXES',
  'KEYS',
  'STATUS',
  'VARIABLES',
  'GLOBAL',
  'SESSION',
  'CREATE',
  'FULL',
  'PROCESSLIST',
  'GRANTS',
  'TRIGGERS',
  'EVENTS',
  'ENGINES',
  'CHARSET',
  'COLLATION',
  'WARNINGS',
  'ERRORS',
  'TABLE',
  'PRIVILEGES',
] as const

/** Comparison words after a condition operand (`WHERE total `). */
const COMPARISON_WORDS = ['LIKE', 'IN', 'IS', 'NOT', 'BETWEEN', 'REGEXP'] as const

/** Connectors after a finished comparison (`WHERE id = 1 `). */
const BOOLEAN_WORDS = ['AND', 'OR'] as const

/** Sort directions after an ORDER BY item. */
const DIRECTION_WORDS = ['ASC', 'DESC'] as const

/** Clauses that may follow a finished ORDER BY item. */
const ORDER_TAIL_WORDS = ['LIMIT', 'OFFSET'] as const

/** What may follow a complete select-list expression (`COUNT(*) `). */
const EXPRESSION_TAIL_WORDS = [
  'AS',
  'FROM',
  'WHERE',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
  'UNION',
  'AND',
  'OR',
] as const

/** Clauses that may follow a grouped column (`GROUP BY status `). */
const GROUP_TAIL_WORDS = ['HAVING', 'ORDER', 'LIMIT', 'WITH'] as const

/** The only clause left after an INSERT values tuple list. */
const INSERT_TAIL_WORDS = ['ON DUPLICATE KEY UPDATE'] as const

/** The source of rows after `INSERT INTO t (cols)`. */
const INSERT_SOURCE_WORDS = ['VALUES', 'SELECT', 'SET'] as const

/** Clauses that may follow a completed `JOIN ... USING (...)`. */
const PRIVILEGE_WORDS = [
  'SELECT',
  'INSERT',
  'UPDATE',
  'DELETE',
  'CREATE',
  'DROP',
  'ALTER',
  'EXECUTE',
  'ALL',
  'USAGE',
  'REFERENCES',
  'TRIGGER',
  'INDEX',
  'PROCESS',
  'RELOAD',
  'SHOW',
] as const

const OVER_WORDS = ['PARTITION', 'ORDER', 'RANGE', 'ROWS', 'GROUPS'] as const

const JOIN_TAIL_WORDS = [
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'CROSS',
  'NATURAL',
  'WHERE',
  'GROUP',
  'ORDER',
  'HAVING',
  'LIMIT',
  'UNION',
] as const

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
    case 'value':
      return VALUE_WORDS
    case 'definition':
      return DEFINITION_WORDS
    case 'tableOptions':
      return TABLE_OPTION_WORDS
    case 'engine':
    case 'number':
      // `ENGINE =` names come from ENGINE_NAMES (original case); a LIMIT
      // count has no keyword to offer.
      return []
    case 'set':
      return SET_WORDS
    case 'type':
      return CAST_TYPE_WORDS
    case 'charset':
      // Charset names come from CHARSET_NAMES (original case).
      return []
    case 'statement':
      return STATEMENT_WORDS
    case 'show':
      return SHOW_WORDS
    case 'comparison':
      return COMPARISON_WORDS
    case 'boolean':
      return BOOLEAN_WORDS
    case 'direction':
      return DIRECTION_WORDS
    case 'orderTail':
      return ORDER_TAIL_WORDS
    case 'expressionTail':
      return EXPRESSION_TAIL_WORDS
    case 'groupTail':
      return GROUP_TAIL_WORDS
    case 'insertTail':
      return INSERT_TAIL_WORDS
    case 'insertSource':
      return INSERT_SOURCE_WORDS
    case 'joinTail':
      return JOIN_TAIL_WORDS
    case 'privilege':
      return PRIVILEGE_WORDS
    case 'over':
      return OVER_WORDS
    case 'name':
      // The user is typing a name only they know.
      return []
    case 'alter':
      return ALTER_WORDS
    case 'alterObject':
      return ALTER_OBJECT_WORDS
    case 'keyword':
      return ANY_WORDS
    case 'any':
    default:
      return ANY_WORDS
  }
}

/**
 * Keyword suggestions for the given context. Words every server shares come
 * first; the dialect's own words are appended when the caret's clause can use
 * them (or when the popup is not pinned to a clause at all).
 */
export function keywordCompletions(
  context: CompletionExpectation = 'any',
  dialect: ClientConnection['dialect'] = 'generic',
): Completion[] {
  const words = [...contextWords(context)]
  const group = dialectWordGroup(dialect)
  if (group !== undefined) {
    const pinned = context === 'keyword' || context === 'any'
    const clause = context === 'relation' || context === 'column'
    if (pinned || (clause && group.contexts.includes(context))) {
      words.push(...group.words)
    }
  }
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
  'DATE_ADD',
  'DATE_SUB',
  'DATEDIFF',
  'TIMESTAMPDIFF',
  'JSON_ARRAY',
  'JSON_OBJECT',
  'JSON_ARRAYAGG',
  'SUBSTRING_INDEX',
  'LOCATE',
  'RAND',
  'UUID',
  'LAST_INSERT_ID',
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
  'LISTAGG',
  'REGEXP_REPLACE',
  'REGEXP_SUBSTR',
  'REGEXP_LIKE',
  'ADD_MONTHS',
  'MONTHS_BETWEEN',
  'LAST_DAY',
  'NEXT_DAY',
  'GREATEST',
  'LEAST',
  'RATIO_TO_REPORT',
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
  'CONCAT_WS',
  'SPLIT_PART',
  'DATE_PART',
  'AGE',
  'ARRAY_LENGTH',
  'STRING_TO_ARRAY',
  'TO_JSON',
  'TO_JSONB',
  'JSONB_BUILD_OBJECT',
  'GEN_RANDOM_UUID',
  'LEFT',
  'RIGHT',
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

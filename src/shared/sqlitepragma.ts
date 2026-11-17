/** SQLite pragmas that only inspect the database. */
export const SQLITE_READ_PRAGMAS: ReadonlySet<string> = new Set([
  'table_info',
  'table_xinfo',
  'table_list',
  'index_info',
  'index_list',
  'index_xinfo',
  'foreign_key_list',
  'foreign_key_check',
  'database_list',
  'collation_list',
  'compile_options',
  'function_list',
  'module_list',
  'pragma_list',
  'integrity_check',
  'quick_check',
  'freelist_count',
  'page_count',
  'schema_version',
  'data_version',
  'user_version',
  'application_id',
])

export interface SqlitePragma {
  name: string
  /** Statement text after the pragma name, including any arguments. */
  rest: string
}

/**
 * Pragmas whose parenthesized form is a read argument (`table_info(users)`)
 * rather than an assignment. For every other allowed pragma, SQLite also
 * accepts `PRAGMA name(value)` as an assignment, e.g. `user_version(7)` or
 * `application_id(1234)`, so a non-empty rest must be rejected.
 */
export const SQLITE_ARGUMENT_PRAGMAS: ReadonlySet<string> = new Set([
  'table_info',
  'table_xinfo',
  'index_info',
  'index_list',
  'index_xinfo',
  'foreign_key_list',
  'foreign_key_check',
  'integrity_check',
  'quick_check',
])

// SQLite accepts comments between PRAGMA and the name (and around the schema
// dot). They cannot be stripped blindly because quoted schema identifiers may
// contain comment-like text, so consume them as grammar whitespace.
const PRAGMA_GAP = String.raw`(?:\s+|--[^\n]*(?:\n|$)|/\*[\s\S]*?\*/)+`
const PRAGMA_GAP_OPT = String.raw`(?:\s+|--[^\n]*(?:\n|$)|/\*[\s\S]*?\*/)*`
const PRAGMA_HEAD = new RegExp(
  '^pragma' +
    PRAGMA_GAP +
    '(?:(?:"[^"]*"|`[^`]*`|\\[[^\\]]*\\]|[^\\s."`\\[]+)' +
    PRAGMA_GAP_OPT +
    '\\.' +
    PRAGMA_GAP_OPT +
    ')?' +
    '([A-Za-z_][A-Za-z0-9_]*)\\b',
  'iu',
)

/**
 * Parse the optional schema prefix and the pragma name. Works on raw SQL and
 * on text whose string literals/comments were already masked; quoted schema
 * identifiers are kept by both callers.
 */
export function parseSqlitePragma(text: string): SqlitePragma | null {
  const trimmed = text.trimStart()
  const match = PRAGMA_HEAD.exec(trimmed)
  if (match === null) return null
  const name = match[1]?.toLowerCase()
  if (name === undefined) return null
  return { name, rest: trimmed.slice(match[0].length) }
}

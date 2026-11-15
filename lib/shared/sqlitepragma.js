/** SQLite pragmas that only inspect the database. */
export const SQLITE_READ_PRAGMAS = new Set([
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
]);
const PRAGMA_HEAD = /^pragma\s+(?:(?:[^\s.]+|"[^"]*"|`[^`]*`|\[[^\]]*\])\s*\.\s*)?([A-Za-z_][A-Za-z0-9_]*)\b/iu;
/**
 * Parse the optional schema prefix and the pragma name. Works on raw SQL and
 * on text whose string literals/comments were already masked; quoted schema
 * identifiers are kept by both callers.
 */
export function parseSqlitePragma(text) {
    const trimmed = text.trimStart();
    const match = PRAGMA_HEAD.exec(trimmed);
    if (match === null)
        return null;
    const name = match[1]?.toLowerCase();
    if (name === undefined)
        return null;
    return { name, rest: trimmed.slice(match[0].length) };
}
//# sourceMappingURL=sqlitepragma.js.map
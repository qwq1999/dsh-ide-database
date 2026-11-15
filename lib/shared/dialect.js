/**
 * The SQL dialect a connection uses for client-side parsing.
 *
 * Redis has no SQL lexer; it is represented by the generic dialect so the
 * console and host can share one parser path. Keeping this normalization in one
 * place avoids a missed branch (for example a write confirmation that forgets
 * Redis has no SQL dialect at all).
 */
export function sqlDialectOf(dialect) {
    return dialect === 'redis' ? 'generic' : dialect ?? 'generic';
}
//# sourceMappingURL=dialect.js.map
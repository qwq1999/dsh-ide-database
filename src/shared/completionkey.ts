/**
 * Key for one relation in the completion metadata response.
 *
 * A dotted `${schema}.${table}` collides when either name contains a dot:
 * (`a.b`, `c`) and (`a`, `b.c`) would address the same entry. Prefixing both
 * lengths keeps the key unambiguous while remaining a plain object key.
 */
export function completionColumnKey(schema: string, table: string): string {
  return `${schema.length}:${schema}:${table.length}:${table}`
}

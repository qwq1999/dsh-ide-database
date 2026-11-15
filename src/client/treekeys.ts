/** Keyboard navigation helpers for the data source tree. */


/**
 * Resolve the row index a navigation key should move focus to, or `null` when the
 * key is not a navigation key or the tree is empty.
 */
export function nextRowIndex(current: number, total: number, key: string): number | null {
  if (total <= 0) return null
  const focused = current < 0 ? -1 : Math.min(current, total - 1)
  if (key === 'ArrowDown') return focused < 0 ? 0 : Math.min(total - 1, focused + 1)
  if (key === 'ArrowUp') return focused < 0 ? total - 1 : Math.max(0, focused - 1)
  if (key === 'Home') return 0
  if (key === 'End') return total - 1
  return null
}

/**
 * Identity of one object-tree row.
 *
 * The readable `connection|schema.name` form is kept for ordinary names. A dot
 * in either the schema or the object name makes that form ambiguous: (`a`,
 * `b.c`) and (`a.b`, `c`) would produce the same key, sharing selection,
 * expansion and description cache entries. Those dotted cases append the exact
 * pair, encoded, so the key remains unique without changing normal keys.
 */
export function treeObjectKey(connectionId: string, schema: string, name: string): string {
  const base = `${connectionId}|${schema}.${name}`
  return schema.includes('.') || name.includes('.')
    ? `${base}#${encodeURIComponent(JSON.stringify([schema, name]))}`
    : base
}

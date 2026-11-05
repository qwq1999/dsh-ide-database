/**
 * Display order for saved data sources, dragged in the tree.
 *
 * The order lives on the host (the `connections` array in the config file), so
 * the tree and the agent tools always agree; the client only works out the new
 * id sequence and lets the host persist it.
 */

/**
 * Move `id` directly above (`after` false) or below (`after` true) `targetId`.
 * Returns `null` when the drag would not change anything, so callers can skip
 * the round trip.
 */
export function moveId(ids: string[], id: string, targetId: string, after: boolean): string[] | null {
  const from = ids.indexOf(id)
  const target = ids.indexOf(targetId)
  if (from < 0 || target < 0 || id === targetId) return null
  const next = ids.filter((entry) => entry !== id)
  const insert = next.indexOf(targetId) + (after ? 1 : 0)
  if (insert === from) return null
  next.splice(insert, 0, id)
  return next
}

/** Apply an id order to records, keeping anything the order forgot at the end. */
export function orderById<T extends { id: string }>(items: T[], ids: string[]): T[] {
  const remaining = new Map(items.map((item) => [item.id, item]))
  const ordered: T[] = []
  for (const id of ids) {
    const item = remaining.get(id)
    if (item === undefined) continue
    remaining.delete(id)
    ordered.push(item)
  }
  return ordered.concat(items.filter((item) => remaining.has(item.id)))
}

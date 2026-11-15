/**
 * The data-source toolbar actions, shared by the panel and the host.
 *
 * The host stores the user's display order in DbSettings so it survives a
 * restart; both halves need the same id list to validate and to fall back to
 * the default order, so it lives here instead of in the client bundle.
 */

export const TOOLBAR_ACTION_IDS = ['add', 'edit', 'refresh', 'delete', 'filter', 'console', 'trash', 'settings'] as const

export type ToolbarActionId = (typeof TOOLBAR_ACTION_IDS)[number]

const TOOLBAR_ACTION_SET: ReadonlySet<string> = new Set(TOOLBAR_ACTION_IDS)

export function isToolbarActionId(value: unknown): value is ToolbarActionId {
  return typeof value === 'string' && TOOLBAR_ACTION_SET.has(value)
}

/**
 * The ids of a stored order this version understands, de-duplicated.
 * Unknown ids (a newer panel, or a hand-edited config file) are dropped.
 */
export function readToolbarActionOrder(value: unknown): ToolbarActionId[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<ToolbarActionId>()
  const order: ToolbarActionId[] = []
  for (const entry of value) {
    if (!isToolbarActionId(entry) || seen.has(entry)) continue
    seen.add(entry)
    order.push(entry)
  }
  return order
}

/**
 * The saved order, followed by every action it does not mention. New actions
 * added by a plugin update therefore appear at the end of an old saved order.
 */
export function orderToolbarActions(stored: readonly string[] | undefined): ToolbarActionId[] {
  const known = readToolbarActionOrder(stored)
  const seen = new Set<ToolbarActionId>(known)
  return [...known, ...TOOLBAR_ACTION_IDS.filter((id) => !seen.has(id))]
}

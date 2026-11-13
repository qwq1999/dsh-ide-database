/**
 * Fold long object lists in the tree.
 *
 * A schema with thousands of tables would otherwise render every row the first
 * time it is expanded: hundreds of milliseconds of layout for a list nobody is
 * going to scroll through. Show a first page, then let the row ask for more.
 */
export const OBJECT_PAGE = 200

export interface ObjectWindow {
  /** How many rows of the list are currently shown. */
  visible: number
  /** How many rows stay folded away. */
  hidden: number
}

/** Row window for `total` rows after `extra` rows were asked for on top of the first page. */
export function objectWindow(total: number, extra: number): ObjectWindow {
  const asked = Math.trunc(Number.isFinite(extra) ? extra : 0)
  const visible = Math.min(Math.max(0, total), OBJECT_PAGE + Math.max(0, asked))
  return { visible, hidden: Math.max(0, total - visible) }
}

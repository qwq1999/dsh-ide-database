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

/**
 * Hard cap for one rendered tree. The per-folder page still bounds a single
 * list, but a connection with fifty schemas multiplies it; this budget stops
 * the whole tree instead of only one folder.
 */
export const MAX_TREE_ROWS = 2000

export interface TreeRowBudget {
  /** Rows handed out so far. */
  readonly shown: number
  /** Rows still available. */
  readonly left: number
  /** Whether a `take` was clipped, i.e. the hint line belongs in the tree. */
  readonly truncated: boolean
  /** Reserve up to `count` rows and return how many may be drawn. */
  take(count: number): number
}

/** Sequential row budget for one tree render. */
export function treeRowBudget(limit: number = MAX_TREE_ROWS): TreeRowBudget {
  const cap = Math.max(0, Math.trunc(Number.isFinite(limit) ? limit : MAX_TREE_ROWS))
  let shown = 0
  let truncated = false
  return {
    get shown() {
      return shown
    },
    get left() {
      return cap - shown
    },
    get truncated() {
      return truncated
    },
    take(count: number): number {
      const asked = Math.max(0, Math.trunc(Number.isFinite(count) ? count : 0))
      const take = Math.min(asked, cap - shown)
      shown += take
      if (take < asked) truncated = true
      return take
    },
  }
}

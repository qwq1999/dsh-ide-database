/** Keyboard navigation helpers for the data source tree. */

export type TreeKey = 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'

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

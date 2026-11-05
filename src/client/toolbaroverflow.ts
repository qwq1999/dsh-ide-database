/**
 * Toolbar overflow arithmetic, kept separate so it is testable without a DOM.
 *
 * The console toolbar renders every action, marks the ones that do not fit as
 * out of flow (they keep their measured width), and shows a "…" button for
 * them. This file only decides how many leading actions fit.
 */

/** Same gap as `.dshdb-qbar-actions`; keep the two in sync. */
export const TOOLBAR_GAP = 6

/**
 * Number of leading actions that fit in `available` pixels.
 *
 * A trailing overflow button only takes room when at least one action is
 * hidden, so `overflowWidth` is reserved from the point a cut is needed.
 * A non-positive `available` (jsdom, a hidden tab) means "measure nothing yet"
 * and keeps every action visible instead of hiding the whole toolbar.
 */
export function fitActionCount(
  widths: readonly number[],
  available: number,
  overflowWidth: number,
  gap: number = TOOLBAR_GAP,
): number {
  const total = widths.length
  if (total === 0) return 0
  if (available <= 0) return total
  const prefix: number[] = []
  let used = 0
  widths.forEach((width, index) => {
    used += width + (index === 0 ? 0 : gap)
    prefix.push(used)
  })
  for (let visible = total; visible >= 1; visible--) {
    const before = prefix[visible - 1] ?? 0
    const reserve = visible < total ? overflowWidth + gap : 0
    if (before + reserve <= available + 0.5) return visible
  }
  return 0
}

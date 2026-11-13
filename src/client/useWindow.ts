import { useCallback, useEffect, useMemo, useRef, useState, type RefObject, type UIEvent } from 'react'
import { flushSync } from 'react-dom'

/**
 * Fixed-row-height windowing for the object tree.
 *
 * The tree renders one flat list of rows; mounting all of them would defeat
 * the point on a schema with thousands of tables. The container scrolls, the
 * window is the slice of rows that intersects the viewport plus a small
 * overscan, and every row keeps its exact height so the scrollbar stays
 * proportional to the real list.
 */

export const TREE_ROW_HEIGHT = 26
/**
 * Rows kept mounted above and below the viewport. A trackpad fling or a
 * scrollbar drag can move further than one screenful between two scroll
 * events; anything outside the overscan would paint as a blank band until the
 * next commit, so the buffer is deliberately generous.
 */
export const TREE_OVERSCAN = 24

/**
 * Viewport used when the browser cannot measure the container yet. jsdom
 * reports clientHeight 0, and an unmeasured tree would otherwise mount a
 * single row and make every row-based test scroll for no reason.
 */
export const TREE_DEFAULT_VIEWPORT = 768

export interface WindowRange {
  /** First mounted row index. */
  start: number
  /** One past the last mounted row index. */
  end: number
}

export interface WindowState {
  containerRef: RefObject<HTMLDivElement>
  range: WindowRange
  scrollTop: number
  totalHeight: number
  viewportHeight: number
  onScroll: (event: UIEvent<HTMLDivElement>) => void
  scrollToIndex: (index: number) => void
}

/**
 * Pure window calculation, kept separate so it can be tested without a DOM.
 * `scrollTop` is clamped to the real scroll range: jsdom (and programmatic
 * writes) can set values past the end, which would otherwise produce an empty
 * window at the bottom of the list.
 */
export function windowRange(
  total: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number = TREE_ROW_HEIGHT,
  overscan: number = TREE_OVERSCAN,
): WindowRange {
  if (total <= 0) return { start: 0, end: 0 }
  const height = Math.max(rowHeight, viewportHeight)
  const maxTop = Math.max(0, total * rowHeight - height)
  const top = Math.min(Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0), maxTop)
  const first = Math.floor(top / rowHeight)
  const last = Math.ceil((top + height) / rowHeight)
  const start = Math.max(0, Math.min(first - overscan, total))
  const end = Math.max(start, Math.min(total, last + overscan))
  return { start, end }
}

export function useWindow(
  total: number,
  rowHeight: number = TREE_ROW_HEIGHT,
  overscan: number = TREE_OVERSCAN,
): WindowState {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const scrollTopRef = useRef(0)
  const [viewportHeight, setViewportHeight] = useState(TREE_DEFAULT_VIEWPORT)
  // scrollToIndex stays identity-stable so the memoized row actions do not
  // change on every resize (that would repaint every mounted row).
  const geometry = useRef({ viewportHeight, total })
  geometry.current = { viewportHeight, total }

  useEffect(() => {
    const node = containerRef.current
    if (node === null) return undefined
    const read = (): void => {
      const height = node.clientHeight
      setViewportHeight(height > 0 ? height : TREE_DEFAULT_VIEWPORT)
    }
    read()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', read)
      return () => window.removeEventListener('resize', read)
    }
    const observer = new ResizeObserver(read)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const range = useMemo(
    () => windowRange(total, scrollTop, viewportHeight, rowHeight, overscan),
    [total, scrollTop, viewportHeight, rowHeight, overscan],
  )

  const onScroll = useCallback((event: UIEvent<HTMLDivElement>): void => {
    const next = event.currentTarget.scrollTop
    if (next === scrollTopRef.current) return
    scrollTopRef.current = next
    // Commit inside the scroll event: a passive update lands after the browser
    // has already painted the new scroll position, which is exactly the blank
    // band that appears when the tree is flung quickly.
    flushSync(() => setScrollTop(next))
  }, [])

  const scrollToIndex = useCallback(
    (index: number): void => {
      const node = containerRef.current
      if (node === null) return
      const viewport = node.clientHeight > 0 ? node.clientHeight : geometry.current.viewportHeight
      const top = index * rowHeight
      const bottom = top + rowHeight
      const current = node.scrollTop
      let next = current
      if (top < current) next = top
      else if (bottom > current + viewport) next = bottom - viewport
      const maxTop = Math.max(0, geometry.current.total * rowHeight - viewport)
      next = Math.min(Math.max(0, next), maxTop)
      if (Math.abs(next - current) < 1) return
      node.scrollTop = next
      scrollTopRef.current = next
      setScrollTop(next)
    },
    [rowHeight],
  )

  return {
    containerRef,
    range,
    scrollTop,
    totalHeight: total * rowHeight,
    viewportHeight,
    onScroll,
    scrollToIndex,
  }
}

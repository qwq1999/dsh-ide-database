/**
 * Fetching "all rows" for an export, batch by batch.
 *
 * A result grid only holds the current page, so exporting everything means
 * re-running the statement with growing paging until the server returns a short
 * batch. Both the table tab (offset paging) and the console (page-number
 * paging) walk rows that way; one walker keeps the stop conditions identical:
 * a short batch ends the walk, and the row cap is never exceeded even if a
 * server ignores the batch size.
 */
import type { Row } from '../shared/types'

export interface PagedWalk {
  /** Hard cap on collected rows; a walk stops here even if more are available. */
  limit: number
  /** Rows asked for per request. */
  batch: number
  /** Fetch one batch; `page` is the page number, `offset` the row offset. */
  fetch: (paging: { page: number; offset: number }) => Promise<Row[]>
  /** Called after each batch with the number of rows collected so far. */
  onProgress?: (collected: number) => void
  /** Checked between batches; true stops the walk and keeps what was collected. */
  cancelled?: () => boolean
}

const MAX_BATCHES = 1000

/**
 * Walk batches until a short one arrives or `limit` rows are collected. The
 * batch guard keeps a misbehaving server from looping forever.
 */
export async function collectRows(walk: PagedWalk): Promise<Row[]> {
  const batch = Math.max(1, Math.trunc(walk.batch))
  const limit = Math.max(0, Math.trunc(walk.limit))
  const rows: Row[] = []
  for (let page = 0; page < MAX_BATCHES && rows.length < limit; page += 1) {
    if (walk.cancelled?.() === true) break
    const chunk = await walk.fetch({ page, offset: page * batch })
    rows.push(...chunk)
    walk.onProgress?.(rows.length)
    // A short (or empty) batch is the server saying there is nothing more.
    if (chunk.length < batch) break
  }
  return rows.slice(0, limit)
}

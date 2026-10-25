/**
 * Remember how many rows a page shows.
 *
 * The console and the table tab offer slightly different sizes, so each keeps
 * its own key; values are validated against the sizes the caller can render,
 * which keeps a stale or hand-edited entry from leaving an unknown <option>
 * selected.
 */

import { readAllowedNumber, writeNumber } from './prefs'

export const CONSOLE_PAGE_KEY = 'dsh-ide-database.page-size.console.v1'
export const TABLE_PAGE_KEY = 'dsh-ide-database.page-size.table.v1'

/** The stored size when it is still one of the offered values, else fallback. */
export function readPageSize(key: string, allowed: readonly number[], fallback: number): number {
  return readAllowedNumber(key, allowed, fallback)
}

/** Persisting is best effort: a full or blocked store just keeps the session value. */
export function writePageSize(key: string, size: number): void {
  writeNumber(key, size)
}

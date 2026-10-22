/**
 * Column widths the user dragged in a result grid, remembered per grid.
 *
 * The memory is per browser: the panel is a client plugin, and JetBrains
 * Database also keeps column widths locally. Values are validated on read so a
 * stale or hand-edited entry can never make a column invisible.
 */

const STORAGE_KEY = 'dsh-ide-database.colwidths.v1'
const MIN_WIDTH = 40
const MAX_WIDTH = 1200
const MAX_COLUMNS = 64

type StoredWidths = Record<string, number[]>

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function clamp(width: number): number {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)))
}

function readAll(): StoredWidths {
  const store = storage()
  if (store === null) return {}
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return parsed as StoredWidths
  } catch {
    return {}
  }
}

function writeAll(all: StoredWidths): void {
  const store = storage()
  if (store === null) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Storage full or disabled: widths are a convenience, not state.
  }
}

/** Widths for one grid, or null when nothing usable is stored. */
export function readWidths(key: string, count: number): number[] | null {
  const widths = readAll()[key]
  if (!Array.isArray(widths) || widths.length !== count || count > MAX_COLUMNS) return null
  const valid = widths.every(
    (width) => typeof width === 'number' && Number.isFinite(width) && width >= MIN_WIDTH && width <= MAX_WIDTH,
  )
  return valid ? widths.map(clamp) : null
}

export function writeWidths(key: string, widths: number[]): void {
  const all = readAll()
  all[key] = widths.slice(0, MAX_COLUMNS).map(clamp)
  writeAll(all)
}

export function clearWidths(key: string): void {
  const all = readAll()
  if (!(key in all)) return
  delete all[key]
  writeAll(all)
}

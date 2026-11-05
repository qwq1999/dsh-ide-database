/**
 * Local completion history and debug metrics.
 *
 * The popup floats names the user picked before above equally good matches; the
 * list is small, stays on this machine (localStorage) and is never sent
 * anywhere. The debug switch (`dsh-ide-database:completion-debug` = '1') only
 * turns on local console.debug timing lines for development.
 */

const STORAGE_KEY = 'dsh-ide-database:completion-history'
const FREQUENCY_KEY = 'dsh-ide-database:completion-frequency'
const DEBUG_KEY = 'dsh-ide-database:completion-debug'
/** Enough for the usual handful of tables without turning into a log. */
const MAX_ENTRIES = 100
/** Pick counts for the names actually used, capped so the map stays small. */
const MAX_FREQUENCY_ENTRIES = 200
/** Guard against a corrupt or hand-edited map growing without bound. */
const MAX_FREQUENCY_PARSED = 1000

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** Recently picked completion names, most recent first. */
export function recentCompletions(): string[] {
  const store = storage()
  if (store === undefined) return []
  try {
    const raw = store.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const names: string[] = []
    const seen = new Set<string>()
    for (const entry of parsed) {
      if (typeof entry !== 'string' || entry === '') continue
      const key = entry.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      names.push(entry)
    }
    return names.slice(0, MAX_ENTRIES)
  } catch {
    return []
  }
}

/** Record a picked completion; a duplicate moves to the front. */
export function rememberCompletion(name: string): void {
  // `*` is inserted expanded, so remembering it would only rank the star row.
  if (name === '' || name === '*') return
  const store = storage()
  if (store === undefined) return
  const lower = name.toLowerCase()
  const next = [
    name,
    ...recentCompletions().filter((entry) => entry.toLowerCase() !== lower),
  ]
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_ENTRIES)))
  } catch {
    // A full quota must not break the editor: forget the history instead.
    try {
      store.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
  rememberPicks(store, name)
}

/**
 * Read every stored pick count. The update path must see the full map: reading
 * the top-N view would drop a freshly picked name that only has count 1 before
 * it could ever be picked again, so a full map could never learn new names.
 */
function readPicks(store: Storage): Map<string, number> {
  const picks = new Map<string, number>()
  try {
    const raw = store.getItem(FREQUENCY_KEY)
    if (raw === null) return picks
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return picks
    for (const [name, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (picks.size >= MAX_FREQUENCY_PARSED) break
      if (name === '' || typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
      picks.set(name.toLowerCase(), Math.floor(value))
    }
  } catch {
    return picks
  }
  return picks
}

/**
 * Pick counts keyed by lower-cased name, highest count first. The ranking uses
 * them after match quality and kind priority, so a name that is picked often
 * floats above equally good candidates.
 */
export function completionFrequency(): Record<string, number> {
  const store = storage()
  if (store === undefined) return {}
  const entries = [...readPicks(store)].sort((left, right) => right[1] - left[1])
  const counts: Record<string, number> = {}
  for (const [name, count] of entries.slice(0, MAX_FREQUENCY_ENTRIES)) counts[name] = count
  return counts
}

function rememberPicks(store: Storage, name: string): void {
  const picks = readPicks(store)
  const key = name.toLowerCase()
  picks.set(key, (picks.get(key) ?? 0) + 1)
  // Keep the map bounded by dropping the least used name, never the one just
  // picked: when the counts tie, the oldest entry loses.
  while (picks.size > MAX_FREQUENCY_ENTRIES) {
    let evict: string | undefined
    let lowest = Number.POSITIVE_INFINITY
    for (const [candidate, count] of picks) {
      if (candidate === key) continue
      if (count < lowest) {
        lowest = count
        evict = candidate
      }
    }
    if (evict === undefined) break
    picks.delete(evict)
  }
  try {
    store.setItem(FREQUENCY_KEY, JSON.stringify(Object.fromEntries(picks)))
  } catch {
    try {
      store.removeItem(FREQUENCY_KEY)
    } catch {
      /* ignore */
    }
  }
}

/** True when the local completion-debug switch is on. */
export function completionDebugEnabled(): boolean {
  const store = storage()
  if (store === undefined) return false
  try {
    return store.getItem(DEBUG_KEY) === '1'
  } catch {
    return false
  }
}

/** One local console line per request, only when the debug switch is on. */
export function logCompletionMetrics(elapsedMs: number, count: number, prefix: string): void {
  if (!completionDebugEnabled()) return
  console.debug(`[completion] ${elapsedMs} ms · ${count} 个候选 · 前缀 "${prefix}"`)
}

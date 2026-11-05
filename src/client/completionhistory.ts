/**
 * Local completion history and debug metrics.
 *
 * The popup floats names the user picked before above equally good matches; the
 * list is small, stays on this machine (localStorage) and is never sent
 * anywhere. The debug switch (`dsh-ide-database:completion-debug` = '1') only
 * turns on local console.debug timing lines for development.
 */

const STORAGE_KEY = 'dsh-ide-database:completion-history'
const DEBUG_KEY = 'dsh-ide-database:completion-debug'
/** Enough for the usual handful of tables without turning into a log. */
const MAX_ENTRIES = 100

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

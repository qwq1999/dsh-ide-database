/**
 * Tiny localStorage preferences shared by the tabs.
 *
 * Values are validated against the options the caller can render, so a stale
 * or hand-edited entry cannot leave an unknown <select> option selected.
 */

/** The stored number when it is still one of the offered values, else fallback. */
export function readAllowedNumber(key: string, allowed: readonly number[], fallback: number): number {
  try {
    const raw = window.localStorage.getItem(key)
    // `Number('')` and `Number(null)` are both 0, which would silently pick 0
    // when zero is an offered value; require a real number in the entry.
    if (raw === null || raw.trim() === '') return fallback
    const stored = Number(raw)
    return Number.isFinite(stored) && allowed.includes(stored) ? stored : fallback
  } catch {
    return fallback
  }
}

/** Persisting is best effort: a full or blocked store just keeps the session value. */
export function writeNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value))
  } catch {
    // ignore
  }
}

/** Stored boolean flag; anything else falls back to the given default. */
export function readFlag(key: string, fallback = false): boolean {
  try {
    const stored = window.localStorage.getItem(key)
    if (stored === '1') return true
    if (stored === '0') return false
    return fallback
  } catch {
    return fallback
  }
}

/** Persisting is best effort, same as writeNumber. */
export function writeFlag(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // ignore
  }
}

/** Stored string, or the fallback when nothing usable is saved. */
export function readText(key: string, fallback = ''): string {
  try {
    const stored = window.localStorage.getItem(key)
    return stored === null || stored === '' ? fallback : stored
  } catch {
    return fallback
  }
}

/** Persisting is best effort, same as writeNumber. */
export function writeText(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/**
 * Tiny localStorage preferences shared by the tabs.
 *
 * Values are validated against the options the caller can render, so a stale
 * or hand-edited entry cannot leave an unknown <select> option selected.
 */

/** The stored number when it is still one of the offered values, else fallback. */
export function readAllowedNumber(key: string, allowed: readonly number[], fallback: number): number {
  try {
    const stored = Number(window.localStorage.getItem(key))
    return allowed.includes(stored) ? stored : fallback
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

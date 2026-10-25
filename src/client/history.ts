/**
 * Statements executed in the console tabs, remembered in the browser.
 *
 * IDEA keeps a statement history per console, and so do we: it lives in
 * `localStorage` so it survives a reload, is capped, and repeated statements
 * move to the front instead of piling up.
 */

export type HistoryKind = 'sql' | 'redis'

export interface HistoryEntry {
  statement: string
  at: number
  /** Rows the statement returned last time, when the console knows it. */
  rows?: number
  /** How long that run took, for the history list. */
  elapsedMs?: number
}

const KEY = 'dsh-ide-database.history.v1'
const PIN_KEY = 'dsh-ide-database.history.pinned.v1'
const LIMIT = 50
const PIN_LIMIT = 20

type History = Record<HistoryKind, HistoryEntry[]>

function storage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function isEntry(value: unknown): value is HistoryEntry {
  const entry = value as Partial<HistoryEntry> | null
  return typeof entry?.statement === 'string' && typeof entry?.at === 'number'
}

function read(): History {
  const empty: History = { sql: [], redis: [] }
  const raw = storage()?.getItem(KEY)
  if (raw === null || raw === undefined) return empty
  try {
    const parsed = JSON.parse(raw) as Partial<History> | null
    return {
      sql: Array.isArray(parsed?.sql) ? parsed.sql.filter(isEntry).slice(0, LIMIT) : [],
      redis: Array.isArray(parsed?.redis) ? parsed.redis.filter(isEntry).slice(0, LIMIT) : [],
    }
  } catch {
    return empty
  }
}

function write(entries: History): void {
  try {
    storage()?.setItem(KEY, JSON.stringify(entries))
  } catch {
    // Storage may be full or disabled; history is a convenience only.
  }
}

/** Current history, newest first. */
export function readHistory(kind: HistoryKind): HistoryEntry[] {
  return read()[kind]
}

/** Remember one statement; repeated statements move to the front. */
export function pushHistory(kind: HistoryKind, statement: string): HistoryEntry[] {
  const text = statement.trim()
  if (text === '') return readHistory(kind)
  const entries = read()
  entries[kind] = [{ statement: text, at: Date.now() }, ...entries[kind].filter((entry) => entry.statement !== text)].slice(
    0,
    LIMIT,
  )
  write(entries)
  return entries[kind]
}

/**
 * Attach the row count and duration to a statement that just ran. The entry is
 * written when the statement is submitted, so the numbers arrive a moment later.
 */
export function annotateHistory(
  kind: HistoryKind,
  statement: string,
  meta: { rows: number; elapsedMs: number },
): HistoryEntry[] {
  const text = statement.trim()
  if (text === '') return readHistory(kind)
  const entries = read()
  const index = entries[kind].findIndex((entry) => entry.statement === text)
  if (index < 0) return entries[kind]
  const current = entries[kind][index]
  if (current === undefined) return entries[kind]
  const next = entries[kind].slice()
  next[index] = { ...current, rows: meta.rows, elapsedMs: meta.elapsedMs }
  entries[kind] = next
  write(entries)
  return entries[kind]
}

/** Drop everything kept for one side; used by the "清空" action. */
export function clearHistory(kind: HistoryKind): HistoryEntry[] {
  const entries = read()
  entries[kind] = []
  write(entries)
  return entries[kind]
}

/** "刚刚 / 5 分钟前 / 2 小时前 / 3 天前" for the history rows. */
export function historyAgo(at: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000))
  if (seconds < 60) return '刚刚'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

type Pinned = Record<HistoryKind, HistoryEntry[]>

function readPinned(): Pinned {
  const empty: Pinned = { sql: [], redis: [] }
  const raw = storage()?.getItem(PIN_KEY)
  if (raw === null || raw === undefined) return empty
  try {
    const parsed = JSON.parse(raw) as Partial<Pinned> | null
    return {
      sql: Array.isArray(parsed?.sql) ? parsed.sql.filter(isEntry).slice(0, PIN_LIMIT) : [],
      redis: Array.isArray(parsed?.redis) ? parsed.redis.filter(isEntry).slice(0, PIN_LIMIT) : [],
    }
  } catch {
    return empty
  }
}

function writePinned(entries: Pinned): void {
  try {
    storage()?.setItem(PIN_KEY, JSON.stringify(entries))
  } catch {
    // Storage may be full or disabled; pins are a convenience only.
  }
}

/** Statements starred by the user, newest first. */
export function readPins(kind: HistoryKind): HistoryEntry[] {
  return readPinned()[kind]
}

/** Add or remove a star; returns true when the statement is now pinned. */
export function togglePin(kind: HistoryKind, statement: string): boolean {
  const text = statement.trim()
  if (text === '') return false
  const pinned = readPinned()
  const existing = pinned[kind].some((entry) => entry.statement === text)
  pinned[kind] = existing
    ? pinned[kind].filter((entry) => entry.statement !== text)
    : [{ statement: text, at: Date.now() }, ...pinned[kind]].slice(0, PIN_LIMIT)
  writePinned(pinned)
  return !existing
}

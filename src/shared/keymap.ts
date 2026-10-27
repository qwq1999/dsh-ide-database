/**
 * Shortcut registry shared by both halves: the host stores and validates the
 * overrides, the client matches them against real key events.
 *
 * A binding is a canonical string — modifiers first, then one key name:
 * `mod+enter`, `mod+shift+f`, `mod+/`, `alt+arrowup`. `mod` is Ctrl on Windows
 * and Linux and ⌘ on macOS, which is what the handlers accepted before.
 *
 * shortcut: '+' 本身不能当绑定键（它是分隔符），真要支持就换一个分隔符。
 */

export type ShortcutScope = 'console' | 'result' | 'table' | 'tree' | 'redis'

export type ShortcutId =
  | 'console.run'
  | 'console.runCaret'
  | 'console.complete'
  | 'console.save'
  | 'console.explain'
  | 'console.comment'
  | 'console.clear'
  | 'console.format'
  | 'console.historyOlder'
  | 'console.historyNewer'
  | 'result.filter'
  | 'result.rerun'
  | 'table.where'
  | 'table.refresh'
  | 'tree.filter'
  | 'tree.refresh'
  | 'redis.clear'

export interface ShortcutDef {
  id: ShortcutId
  scope: ShortcutScope
  label: string
  defaultBinding: string
}

/** Scopes are separate key spaces: two scopes may share a binding. */
export const SHORTCUT_SCOPE_LABEL: Record<ShortcutScope, string> = {
  console: 'SQL 编辑器',
  result: '控制台结果区',
  table: '数据表标签页',
  tree: '数据源树',
  redis: 'Redis 命令框',
}

export const SHORTCUTS: readonly ShortcutDef[] = [
  { id: 'console.run', scope: 'console', label: '执行（有选中内容时只执行选中部分）', defaultBinding: 'mod+enter' },
  { id: 'console.runCaret', scope: 'console', label: '只执行光标所在的那条语句', defaultBinding: 'mod+shift+enter' },
  { id: 'console.complete', scope: 'console', label: '补全表名、库名、列名与关键字', defaultBinding: 'mod+space' },
  { id: 'console.save', scope: 'console', label: '把编辑器里的 SQL 存成 .sql 文件', defaultBinding: 'mod+s' },
  { id: 'console.explain', scope: 'console', label: '查看执行计划（不执行语句）', defaultBinding: 'mod+e' },
  { id: 'console.comment', scope: 'console', label: '注释或取消注释选中的行', defaultBinding: 'mod+/' },
  { id: 'console.clear', scope: 'console', label: '清空编辑器（不影响已拿到的结果）', defaultBinding: 'mod+l' },
  { id: 'console.format', scope: 'console', label: '格式化 SQL', defaultBinding: 'mod+shift+f' },
  { id: 'console.historyOlder', scope: 'console', label: '回看上一条执行过的语句', defaultBinding: 'mod+arrowup' },
  { id: 'console.historyNewer', scope: 'console', label: '回看下一条执行过的语句', defaultBinding: 'mod+arrowdown' },
  { id: 'result.filter', scope: 'result', label: '跳到结果筛选框', defaultBinding: 'mod+f' },
  { id: 'result.rerun', scope: 'result', label: '重新执行当前语句（不刷新页面）', defaultBinding: 'mod+r' },
  { id: 'table.where', scope: 'table', label: '跳到 WHERE 输入框', defaultBinding: 'mod+f' },
  { id: 'table.refresh', scope: 'table', label: '只刷新当前页（重算总数）', defaultBinding: 'mod+r' },
  { id: 'tree.filter', scope: 'tree', label: '跳到筛选框', defaultBinding: 'mod+f' },
  { id: 'tree.refresh', scope: 'tree', label: '重读当前数据源的结构', defaultBinding: 'mod+r' },
  { id: 'redis.clear', scope: 'redis', label: '清空命令框', defaultBinding: 'mod+l' },
]

export interface ShortcutStorage {
  /**
   * Only the bindings the user changed; anything missing or unusable falls back
   * to the default. Stored inside DbSettings, so it follows the profile.
   */
  keybindings: Record<string, string>
}

const NAMED_KEYS = new Set([
  'enter',
  'escape',
  'tab',
  'space',
  'backspace',
  'delete',
  'insert',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
  'home',
  'end',
  'pageup',
  'pagedown',
])

const KEY_LABEL: Record<string, string> = {
  enter: 'Enter',
  escape: 'Esc',
  tab: 'Tab',
  space: 'Space',
  backspace: 'Backspace',
  delete: 'Delete',
  insert: 'Insert',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  home: 'Home',
  end: 'End',
  pageup: 'Page Up',
  pagedown: 'Page Down',
}

export interface KeyStroke {
  /** Ctrl on Windows/Linux, ⌘ on macOS. */
  mod: boolean
  alt: boolean
  shift: boolean
  /** Lowercase event.key, with `space` / `escape` spellings normalised. */
  key: string
}

/** The parts of a KeyboardEvent this module needs. */
export interface KeyLike {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

export function isShortcutId(value: string): value is ShortcutId {
  return SHORTCUTS.some((def) => def.id === value)
}

export function shortcutDef(id: ShortcutId): ShortcutDef {
  const def = SHORTCUTS.find((entry) => entry.id === id)
  if (def === undefined) throw new Error(`未知的快捷键：${id}`)
  return def
}

function keyOf(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower === ' ' || lower === 'spacebar') return 'space'
  if (lower === 'esc') return 'escape'
  if (lower === 'del') return 'delete'
  return lower
}

function isTypableKey(key: string): boolean {
  return /^(?:[a-z0-9]|[^\w\s])$/.test(key) || NAMED_KEYS.has(key) || /^f(?:[1-9]|1[0-2])$/.test(key)
}

/** A binding has to carry a modifier (or be a function key) so typing still works. */
function isSafeStroke(stroke: KeyStroke): boolean {
  return stroke.mod || stroke.alt || /^f(?:[1-9]|1[0-2])$/.test(stroke.key)
}

export function parseBinding(text: string): KeyStroke | null {
  const parts = text.trim().toLowerCase().split('+')
  if (parts.some((part) => part === '')) return null
  const key = parts[parts.length - 1]!
  const modifiers = parts.slice(0, -1)
  if (new Set(modifiers).size !== modifiers.length) return null
  if (modifiers.some((part) => part !== 'mod' && part !== 'alt' && part !== 'shift')) return null
  const stroke: KeyStroke = {
    mod: modifiers.includes('mod'),
    alt: modifiers.includes('alt'),
    shift: modifiers.includes('shift'),
    key,
  }
  if (!isTypableKey(key) || !isSafeStroke(stroke)) return null
  return stroke
}

/** Canonical binding text for a stroke, modifier order is fixed. */
export function strokeText(stroke: KeyStroke): string {
  const parts: string[] = []
  if (stroke.mod) parts.push('mod')
  if (stroke.alt) parts.push('alt')
  if (stroke.shift) parts.push('shift')
  parts.push(stroke.key)
  return parts.join('+')
}

/** The binding a keypress would record, or null for modifiers/invalid keys. */
export function bindingFromEvent(event: KeyLike): string | null {
  const key = keyOf(event.key)
  if (key === 'control' || key === 'meta' || key === 'alt' || key === 'shift') return null
  if (!isTypableKey(key)) return null
  const stroke: KeyStroke = {
    mod: event.ctrlKey || event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
    key,
  }
  return isSafeStroke(stroke) ? strokeText(stroke) : null
}

export function matchesBinding(event: KeyLike, binding: string): boolean {
  const stroke = parseBinding(binding)
  if (stroke === null) return false
  if (stroke.mod !== (event.ctrlKey || event.metaKey)) return false
  if (stroke.alt !== event.altKey) return false
  if (stroke.shift !== event.shiftKey) return false
  return stroke.key === keyOf(event.key)
}

/** Human readable form, e.g. `Ctrl + Shift + Enter`. */
export function formatBinding(binding: string, mac = false): string {
  const stroke = parseBinding(binding)
  if (stroke === null) return binding
  const parts: string[] = []
  if (stroke.mod) parts.push(mac ? '⌘' : 'Ctrl')
  if (stroke.alt) parts.push(mac ? '⌥' : 'Alt')
  if (stroke.shift) parts.push(mac ? '⇧' : 'Shift')
  const label = KEY_LABEL[stroke.key]
  const key = /^f(?:[1-9]|1[0-2])$/.test(stroke.key) ? stroke.key.toUpperCase() : stroke.key
  parts.push(label ?? (key.length === 1 ? key.toUpperCase() : key))
  return parts.join(' + ')
}

export function defaultBindingOf(id: ShortcutId): string {
  return shortcutDef(id).defaultBinding
}

/** The binding in force: the stored override when it is usable, else the default. */
export function bindingOf(id: ShortcutId, overrides?: Readonly<Record<string, string>>): string {
  const custom = overrides?.[id]
  if (custom !== undefined && parseBinding(custom) !== null) return custom
  return defaultBindingOf(id)
}

/** Another action in the same scope already using this binding, if any. */
export function conflictingShortcut(
  id: ShortcutId,
  binding: string,
  overrides: Readonly<Record<string, string>>,
): ShortcutId | null {
  const scope = shortcutDef(id).scope
  const stroke = parseBinding(binding)
  if (stroke === null) return null
  const canonical = strokeText(stroke)
  const hit = SHORTCUTS.find(
    (def) => def.id !== id && def.scope === scope && strokeText(parseBinding(bindingOf(def.id, overrides))! ) === canonical,
  )
  return hit === undefined ? null : hit.id
}

/**
 * Drop entries this build cannot use — an unknown action from a newer version
 * or a hand-edited config must not break the panel.
 */
export function lenientKeybindings(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const result: Record<string, string> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (typeof value !== 'string' || !isShortcutId(id)) continue
    const stroke = parseBinding(value)
    if (stroke === null) continue
    result[id] = strokeText(stroke)
  }
  return result
}

/** Strict variant for a save request: unknown ids and bad bindings are rejected. */
export function parseKeybindings(raw: unknown): Record<string, string> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('keybindings 必须是对象')
  const result: Record<string, string> = {}
  for (const [id, value] of Object.entries(raw)) {
    if (!isShortcutId(id)) throw new Error(`未知的快捷键：${id}`)
    if (typeof value !== 'string') throw new Error(`快捷键 ${id} 的值必须是字符串`)
    const stroke = parseBinding(value)
    if (stroke === null) throw new Error(`无法识别的组合键：${value}（需要 Ctrl/⌘、Alt 或功能键）`)
    result[id] = strokeText(stroke)
  }
  const conflicts = keybindingConflicts(result)
  if (conflicts.length > 0) throw new Error(conflicts[0]!)
  return result
}

/** Same binding handed to two actions of one scope, described for a human. */
export function keybindingConflicts(overrides: Readonly<Record<string, string>>): string[] {
  const seen = new Map<string, ShortcutId[]>()
  for (const def of SHORTCUTS) {
    const key = `${def.scope}\u0000${strokeText(parseBinding(bindingOf(def.id, overrides))!)}`
    const ids = seen.get(key)
    if (ids === undefined) seen.set(key, [def.id])
    else ids.push(def.id)
  }
  const conflicts: string[] = []
  for (const [key, ids] of seen) {
    if (ids.length < 2) continue
    const [scope, binding] = key.split('\u0000') as [ShortcutScope, string]
    const labels = ids.map((id) => `「${shortcutDef(id).label}」`).join('、')
    conflicts.push(`${SHORTCUT_SCOPE_LABEL[scope]}：${formatBinding(binding)} 同时绑给了${labels}`)
  }
  return conflicts
}

import { describe, expect, it } from 'vitest'

import {
  SHORTCUTS,
  bindingFromEvent,
  bindingOf,
  conflictingShortcut,
  formatBinding,
  keybindingConflicts,
  lenientKeybindings,
  matchesBinding,
  parseBinding,
  parseKeybindings,
  strokeText,
} from '../../src/shared/keymap.ts'

const press = (overrides = {}) => ({ key: 'Enter', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...overrides })

describe('shortcut registry', () => {
  it('parses every default binding and keeps each scope free of duplicates', () => {
    const seen = new Set()
    for (const def of SHORTCUTS) {
      const stroke = parseBinding(def.defaultBinding)
      expect(stroke, def.id).not.toBeNull()
      const key = `${def.scope}/${strokeText(stroke)}`
      expect(seen.has(key), `${def.id} 与同区域的其他默认值重复`).toBe(false)
      seen.add(key)
    }
  })

  it('rejects bindings that would swallow plain typing', () => {
    expect(parseBinding('enter')).toBeNull()
    expect(parseBinding('mod+enter')).toEqual({ mod: true, alt: false, shift: false, key: 'enter' })
    expect(parseBinding('f5')).toEqual({ mod: false, alt: false, shift: false, key: 'f5' })
    expect(parseBinding('ctrl+enter')).toBeNull()
    expect(parseBinding('mod++a')).toBeNull()
    expect(parseBinding('mod+a+b')).toBeNull()
    expect(parseBinding('mod+mod+a')).toBeNull()
  })

  it('records the keypress the user actually made', () => {
    expect(bindingFromEvent(press({ ctrlKey: true }))).toBe('mod+enter')
    expect(bindingFromEvent(press({ metaKey: true }))).toBe('mod+enter')
    expect(bindingFromEvent(press({ key: ' ', ctrlKey: true }))).toBe('mod+space')
    expect(bindingFromEvent(press({ key: 'F5', ctrlKey: false }))).toBe('f5')
    expect(bindingFromEvent(press({ key: 'Shift', shiftKey: true }))).toBeNull()
    expect(bindingFromEvent(press({ key: 'k', ctrlKey: false }))).toBeNull()
  })

  it('matches modifiers exactly', () => {
    expect(matchesBinding(press({ ctrlKey: true }), 'mod+enter')).toBe(true)
    expect(matchesBinding(press({ ctrlKey: true, shiftKey: true }), 'mod+enter')).toBe(false)
    expect(matchesBinding(press({ key: 'l', ctrlKey: false, metaKey: true }), 'mod+l')).toBe(true)
    expect(matchesBinding(press({ key: 'l', ctrlKey: true, altKey: true }), 'mod+l')).toBe(false)
    expect(matchesBinding(press({ ctrlKey: true }), 'mod+nonsense')).toBe(false)
  })

  it('formats for the platform', () => {
    expect(formatBinding('mod+shift+arrowdown')).toBe('Ctrl + Shift + ↓')
    expect(formatBinding('mod+shift+arrowdown', true)).toBe('⌘ + ⇧ + ↓')
    expect(formatBinding('alt+f5')).toBe('Alt + F5')
  })

  it('falls back to the default when the stored override is unusable', () => {
    expect(bindingOf('console.run', {})).toBe('mod+enter')
    expect(bindingOf('console.run', { 'console.run': 'alt+r' })).toBe('alt+r')
    expect(bindingOf('console.run', { 'console.run': 'r' })).toBe('mod+enter')
    expect(bindingOf('console.run', undefined)).toBe('mod+enter')
  })

  it('only reports duplicates inside one scope', () => {
    expect(conflictingShortcut('console.save', 'mod+enter', {})).toBe('console.run')
    expect(conflictingShortcut('result.rerun', 'mod+f', {})).toBe('result.filter')
    expect(conflictingShortcut('result.filter', 'mod+enter', {})).toBeNull()
    expect(conflictingShortcut('console.run', 'mod+enter', {})).toBeNull()
  })
})

describe('stored keybindings', () => {
  it('drops entries this build cannot use instead of failing the panel', () => {
    expect(
      lenientKeybindings({
        'console.clear': 'MOD+K',
        'console.run': 'r',
        'from-the-future': 'mod+j',
        'console.save': 42,
      }),
    ).toEqual({ 'console.clear': 'mod+k' })
    expect(lenientKeybindings(null)).toEqual({})
    expect(lenientKeybindings(['mod+k'])).toEqual({})
  })

  it('rejects bad saves with a message a human can act on', () => {
    expect(() => parseKeybindings({ 'no-such-action': 'mod+k' })).toThrow('未知的快捷键：no-such-action')
    expect(() => parseKeybindings({ 'console.clear': 'l' })).toThrow('无法识别的组合键：l')
    expect(() => parseKeybindings({ 'console.clear': 'mod+enter' })).toThrow('SQL 编辑器：Ctrl + Enter 同时绑给了')
    expect(() => parseKeybindings(null)).toThrow('keybindings 必须是对象')
    expect(parseKeybindings({ 'console.clear': 'MOD+K' })).toEqual({ 'console.clear': 'mod+k' })
    expect(parseKeybindings({})).toEqual({})
  })

  it('describes a clash with the action labels of that scope', () => {
    expect(keybindingConflicts({})).toEqual([])
    const [message] = keybindingConflicts({ 'console.clear': 'mod+enter' })
    expect(message).toContain('SQL 编辑器：Ctrl + Enter')
    expect(message).toContain('「执行（有选中内容时只执行选中部分）」')
    expect(message).toContain('「清空编辑器（不影响已拿到的结果）」')
  })
})

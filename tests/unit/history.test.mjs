import { beforeEach, describe, expect, it } from 'vitest'
import { annotateHistory, clearHistory, pushHistory, readHistory, readPins, togglePin } from '../../src/client/history.ts'

class MemoryStorage {
  #map = new Map()
  getItem(key) {
    return this.#map.has(key) ? this.#map.get(key) : null
  }
  setItem(key, value) {
    this.#map.set(key, String(value))
  }
  removeItem(key) {
    this.#map.delete(key)
  }
  clear() {
    this.#map.clear()
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

describe('statement history', () => {
  it('keeps newest first and de-duplicates', () => {
    pushHistory('sql', 'select 1')
    pushHistory('sql', 'select 2')
    pushHistory('sql', 'select 1')
    expect(readHistory('sql').map((entry) => entry.statement)).toEqual(['select 1', 'select 2'])
  })

  it('keeps SQL and Redis apart and ignores blank statements', () => {
    pushHistory('sql', 'select 1')
    pushHistory('redis', 'GET foo')
    pushHistory('sql', '   ')
    expect(readHistory('sql')).toHaveLength(1)
    expect(readHistory('redis').map((entry) => entry.statement)).toEqual(['GET foo'])
  })

  it('caps the list at 50 entries', () => {
    for (let index = 0; index < 60; index += 1) pushHistory('sql', `select ${index}`)
    expect(readHistory('sql')).toHaveLength(50)
  })

  it('clears only the recent list, keeping pins', () => {
    pushHistory('sql', 'select 1')
    togglePin('sql', 'select 1')
    clearHistory('sql')
    expect(readHistory('sql')).toEqual([])
    expect(readPins('sql').map((entry) => entry.statement)).toEqual(['select 1'])
  })
})

describe('pinned statements', () => {
  it('toggles a statement on and off', () => {
    expect(togglePin('sql', 'select 1')).toBe(true)
    pushHistory('sql', 'select 1')
    expect(togglePin('sql', 'select 1')).toBe(false)
    expect(readPins('sql')).toHaveLength(0)
  })

  it('keeps pins per console kind and ignores blanks', () => {
    togglePin('sql', 'select 1')
    togglePin('redis', 'GET foo')
    togglePin('sql', '  ')
    expect(readPins('sql').map((entry) => entry.statement)).toEqual(['select 1'])
    expect(readPins('redis').map((entry) => entry.statement)).toEqual(['GET foo'])
  })

  it('caps pins at 20', () => {
    for (let index = 0; index < 25; index += 1) togglePin('sql', `select ${index}`)
    expect(readPins('sql')).toHaveLength(20)
  })
})

describe('history annotations', () => {
  it('adds the row count and duration to the statement that ran', () => {
    pushHistory('sql', 'select 1')
    const entries = annotateHistory('sql', 'select 1', { rows: 3, elapsedMs: 12 })
    expect(entries[0].rows).toBe(3)
    expect(entries[0].elapsedMs).toBe(12)
    expect(readHistory('sql')[0].elapsedMs).toBe(12)
  })

  it('leaves history untouched when the statement is missing', () => {
    pushHistory('sql', 'select 1')
    const entries = annotateHistory('sql', 'select 2', { rows: 1, elapsedMs: 1 })
    expect(entries).toHaveLength(1)
    expect(entries[0].rows).toBeUndefined()
  })

  it('can record only the duration for commands without rows', () => {
    pushHistory('redis', 'GET foo')
    const entries = annotateHistory('redis', 'GET foo', { elapsedMs: 5 })
    expect(entries[0].elapsedMs).toBe(5)
    expect(entries[0].rows).toBeUndefined()
  })

  it('keeps the other entries as they were', () => {
    pushHistory('sql', 'select 1')
    pushHistory('sql', 'select 2')
    const entries = annotateHistory('sql', 'select 1', { rows: 9, elapsedMs: 30 })
    expect(entries.map((entry) => entry.statement)).toEqual(['select 2', 'select 1'])
    expect(entries[1].rows).toBe(9)
    expect(entries[0].rows).toBeUndefined()
  })
})

import { beforeEach, describe, expect, it } from 'vitest'
import { clearHistory, pushHistory, readHistory, readPins, togglePin } from '../../src/client/history.ts'

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

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readAllowedNumber, readFlag, writeFlag, writeNumber } from '../../src/client/prefs'

describe('prefs', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('reads a stored value that is still offered', () => {
    window.localStorage.setItem('k', '200')
    expect(readAllowedNumber('k', [100, 200, 500], 500)).toBe(200)
  })

  it('falls back when the stored value is not offered any more', () => {
    window.localStorage.setItem('k', '300')
    expect(readAllowedNumber('k', [100, 200, 500], 500)).toBe(500)
  })

  it('falls back when nothing is stored', () => {
    expect(readAllowedNumber('missing', [100, 200], 100)).toBe(100)
  })

  it('falls back when the store is not readable', () => {
    const getItem = window.localStorage.getItem
    window.localStorage.getItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(readAllowedNumber('k', [100], 100)).toBe(100)
    } finally {
      window.localStorage.getItem = getItem
    }
  })

  it('writes the value as a string and swallows storage errors', () => {
    writeNumber('k', 500)
    expect(window.localStorage.getItem('k')).toBe('500')

    const setItem = window.localStorage.setItem
    window.localStorage.setItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(() => writeNumber('k', 100)).not.toThrow()
    } finally {
      window.localStorage.setItem = setItem
    }
  })
})

describe('prefs flags', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('reads stored booleans and falls back for anything else', () => {
    window.localStorage.setItem('on', '1')
    window.localStorage.setItem('off', '0')
    window.localStorage.setItem('junk', 'yes')
    expect(readFlag('on')).toBe(true)
    expect(readFlag('off')).toBe(false)
    expect(readFlag('junk', true)).toBe(true)
    expect(readFlag('missing')).toBe(false)
  })

  it('writes 1/0 and swallows storage errors', () => {
    writeFlag('k', true)
    expect(window.localStorage.getItem('k')).toBe('1')
    writeFlag('k', false)
    expect(window.localStorage.getItem('k')).toBe('0')

    const setItem = window.localStorage.setItem
    window.localStorage.setItem = () => {
      throw new Error('blocked')
    }
    try {
      expect(() => writeFlag('k', true)).not.toThrow()
    } finally {
      window.localStorage.setItem = setItem
    }
  })
})

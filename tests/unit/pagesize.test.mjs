// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import { CONSOLE_PAGE_KEY, TABLE_PAGE_KEY, readPageSize, writePageSize } from '../../src/client/pagesize'

const CONSOLE_SIZES = [200, 500, 1000, 2000, 5000]

describe('page size memory', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('falls back when nothing was stored', () => {
    expect(readPageSize(CONSOLE_PAGE_KEY, CONSOLE_SIZES, 500)).toBe(500)
  })

  it('reads back the size that was written', () => {
    writePageSize(CONSOLE_PAGE_KEY, 1000)
    expect(readPageSize(CONSOLE_PAGE_KEY, CONSOLE_SIZES, 500)).toBe(1000)
  })

  it('ignores a size the tab cannot render', () => {
    writePageSize(CONSOLE_PAGE_KEY, 100)
    expect(readPageSize(CONSOLE_PAGE_KEY, CONSOLE_SIZES, 500)).toBe(500)
  })

  it('ignores a value that is not a number', () => {
    window.localStorage.setItem(CONSOLE_PAGE_KEY, 'lots')
    expect(readPageSize(CONSOLE_PAGE_KEY, CONSOLE_SIZES, 500)).toBe(500)
  })

  it('keeps the two tabs apart', () => {
    writePageSize(CONSOLE_PAGE_KEY, 2000)
    expect(readPageSize(TABLE_PAGE_KEY, [100, 200, 500], 500)).toBe(500)
  })

  it('persists "all rows" (0) once it is in the allowed sizes', () => {
    // The console offers an "all" page size of 0; it only round-trips when the
    // caller includes 0 in the whitelist (see ConsoleTab's [...PAGE_SIZES, 0]).
    const sizesWithAll = [...CONSOLE_SIZES, 0]
    writePageSize(CONSOLE_PAGE_KEY, 0)
    expect(readPageSize(CONSOLE_PAGE_KEY, sizesWithAll, 500)).toBe(0)
    // Without 0 in the whitelist it would silently fall back to the default.
    expect(readPageSize(CONSOLE_PAGE_KEY, CONSOLE_SIZES, 500)).toBe(500)
  })
})

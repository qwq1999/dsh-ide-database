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
})

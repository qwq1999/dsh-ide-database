import { describe, expect, it } from 'vitest'
import { filterRows, rowMatches } from '../../src/client/rowfilter'

describe('rowMatches', () => {
  it('matches any cell by its displayed text', () => {
    expect(rowMatches(['alpha', 42, null], 'alpha')).toBe(true)
    expect(rowMatches(['alpha', 42, null], '42')).toBe(true)
    expect(rowMatches(['alpha', 42, null], 'NULL')).toBe(true)
  })

  it('matches case-insensitively and treats booleans as the grid shows them', () => {
    expect(rowMatches(['Goods', true, false], 'goods')).toBe(true)
    expect(rowMatches(['Goods', true, false], 'TRUE')).toBe(true)
  })

  it('returns false when no cell contains the needle', () => {
    expect(rowMatches(['alpha', 42], 'beta')).toBe(false)
  })
})

describe('filterRows', () => {
  it('returns the same array for a blank or whitespace-only needle', () => {
    const rows = [['a'], ['b']]
    expect(filterRows(rows, '')).toBe(rows)
    expect(filterRows(rows, '   ')).toBe(rows)
  })

  it('keeps only matching rows and preserves their order', () => {
    const rows = [['one', 1], ['two', 2], ['three', 3]]
    expect(filterRows(rows, 't')).toEqual([['two', 2], ['three', 3]])
  })

  it('trims the needle before matching', () => {
    expect(filterRows([[' abc ']], '  abc  ')).toEqual([[' abc ']])
  })
})

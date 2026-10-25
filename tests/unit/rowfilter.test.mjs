import { describe, expect, it } from 'vitest'
import { filterRowIndexes, rowMatches } from '../../src/client/rowfilter'

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

describe('filterRowIndexes', () => {
  it('lists every position when nothing is filtered out', () => {
    expect(filterRowIndexes([['a'], ['b']], '')).toEqual([0, 1])
    expect(filterRowIndexes([['a'], ['b']], '  ')).toEqual([0, 1])
  })

  it('keeps the original positions of matching rows', () => {
    expect(filterRowIndexes([['alpha'], ['beta'], ['gamma']], 'gamma')).toEqual([2])
    expect(filterRowIndexes([['alpha'], ['beta'], ['gamma']], 'a')).toEqual([0, 1, 2])
  })
})


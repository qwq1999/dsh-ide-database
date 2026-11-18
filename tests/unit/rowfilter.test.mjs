import { describe, expect, it } from 'vitest'
import { filterRowIndexes, filterRowIndexesByHaystacks, rowHaystacks, rowMatches } from '../../src/client/rowfilter'

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

describe('prebuilt haystacks', () => {
  const rows = [['Goods', 42, null], ['beta', true], ['gamma', 'x']]

  it('agree with filterRowIndexes for every needle', () => {
    for (const needle of ['', '  ', 'goods', '42', 'NULL', 'TRUE', 'a', 'zzz']) {
      expect(filterRowIndexesByHaystacks(rowHaystacks(rows), needle)).toEqual(filterRowIndexes(rows, needle))
    }
  })

  it('does not let a needle match across two cells', () => {
    expect(filterRowIndexesByHaystacks(rowHaystacks([['ab', 'cd']]), 'abcd')).toEqual([])
    expect(filterRowIndexesByHaystacks(rowHaystacks([['ab', 'cd']]), 'cd')).toEqual([0])
  })
})

describe('NUL in haystack text', () => {
  const NUL = String.fromCharCode(0)

  it('keeps haystack filtering in sync with row matching', () => {
    const rows = [['x' + NUL + 'y', 'z']]
    expect(filterRowIndexesByHaystacks(rowHaystacks(rows), 'y' + NUL + 'z')).toEqual(filterRowIndexes(rows, 'y' + NUL + 'z'))
    expect(filterRowIndexesByHaystacks(rowHaystacks(rows), 'y' + NUL + 'z')).toEqual([])
  })

  it('still matches a NUL that is genuinely inside one cell', () => {
    const rows = [['x' + NUL + 'y', 'z']]
    expect(filterRowIndexesByHaystacks(rowHaystacks(rows), 'x' + NUL + 'y')).toEqual([0])
  })

  it('never matches a needle across a cell boundary (doubled-NUL ambiguity)', () => {
    // A needle ending in NUL must not span cell1's end + the boundary + cell2's
    // start. Previously the single-NUL separator plus doubled content NULs let
    // 'a' + NUL wrongly match the haystack of ['a', NUL + 'b'].
    const rows = [['a', NUL + 'b']]
    const needle = 'a' + NUL
    expect(filterRowIndexesByHaystacks(rowHaystacks(rows), needle)).toEqual(filterRowIndexes(rows, needle))
    expect(filterRowIndexesByHaystacks(rowHaystacks(rows), needle)).toEqual([])

    // A NUL-ending value genuinely in cell 0 must not also hit cell 1 where the
    // NUL sits at the start.
    const rows2 = [['x' + NUL, 'q'], ['x', NUL + 'z']]
    const needle2 = 'x' + NUL
    expect(filterRowIndexesByHaystacks(rowHaystacks(rows2), needle2)).toEqual(filterRowIndexes(rows2, needle2))
    expect(filterRowIndexesByHaystacks(rowHaystacks(rows2), needle2)).toEqual([0])
  })
})

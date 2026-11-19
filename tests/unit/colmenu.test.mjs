import { describe, expect, it } from 'vitest'
import { columnValues, commaValues } from '../../src/client/colmenu'

describe('columnValues', () => {
  it('joins one line per row', () => {
    expect(columnValues([[1, 'a'], [2, 'b']], 1)).toBe('a\nb')
  })

  it('renders null and undefined as empty lines', () => {
    expect(columnValues([[1, null], [2, undefined], [3, 0]], 1)).toBe('\n\n0')
  })

  it('stringifies objects instead of dropping them', () => {
    expect(columnValues([[{ x: 1 }]], 0)).toBe('[object Object]')
  })
})

describe('commaValues', () => {
  it('puts every value on one line', () => {
    expect(commaValues([[1, 'a'], [2, 'b']], 1)).toBe('a, b')
  })

  it('keeps nulls as empty slots', () => {
    expect(commaValues([[1, null], [2, 0]], 1)).toBe(', 0')
  })
})

describe('columnValues / commaValues flatten embedded newlines', () => {
  const NL = String.fromCharCode(10)
  const TAB = String.fromCharCode(9)

  it('keeps one line per row when a cell contains a newline', () => {
    const rows = [[1, 'a' + NL + 'b'], [2, 'c']]
    expect(columnValues(rows, 1)).toBe('a b' + NL + 'c')
  })

  it('flattens tabs and newlines in comma values', () => {
    const rows = [[1, 'a' + TAB + NL + 'b'], [2, 'c']]
    expect(commaValues(rows, 1)).toBe('a b, c')
  })

  it('still applies spreadsheet formula protection', () => {
    expect(columnValues([[1, '=1+1']], 1)).not.toBe('=1+1')
  })
})

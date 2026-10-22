import { describe, expect, it } from 'vitest'
import { columnValues } from '../../src/client/colmenu'

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

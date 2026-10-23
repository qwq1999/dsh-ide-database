import { describe, expect, it } from 'vitest'
import { nextRowIndex } from '../../src/client/treekeys'

describe('nextRowIndex', () => {
  it('moves down and stops at the last row', () => {
    expect(nextRowIndex(0, 3, 'ArrowDown')).toBe(1)
    expect(nextRowIndex(2, 3, 'ArrowDown')).toBe(2)
  })

  it('moves up and stops at the first row', () => {
    expect(nextRowIndex(2, 3, 'ArrowUp')).toBe(1)
    expect(nextRowIndex(0, 3, 'ArrowUp')).toBe(0)
  })

  it('jumps home and end', () => {
    expect(nextRowIndex(1, 3, 'Home')).toBe(0)
    expect(nextRowIndex(1, 3, 'End')).toBe(2)
  })

  it('starts at a sensible end when nothing is focused', () => {
    expect(nextRowIndex(-1, 3, 'ArrowDown')).toBe(0)
    expect(nextRowIndex(-1, 3, 'ArrowUp')).toBe(2)
    expect(nextRowIndex(5, 3, 'ArrowDown')).toBe(2)
  })

  it('ignores unrelated keys and empty trees', () => {
    expect(nextRowIndex(0, 3, 'Enter')).toBeNull()
    expect(nextRowIndex(0, 0, 'ArrowDown')).toBeNull()
  })
})

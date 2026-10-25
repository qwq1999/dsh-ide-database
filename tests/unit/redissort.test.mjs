import { describe, expect, it } from 'vitest'
import { nextKeySort, sortKeys } from '../../src/client/redissort'

const keys = [
  { key: 'user:10' },
  { key: 'user:9' },
  { key: 'Order:2' },
  { key: 'order:1' },
]

describe('redissort', () => {
  it('cycles scan order, ascending, and descending', () => {
    expect(nextKeySort('none')).toBe('asc')
    expect(nextKeySort('asc')).toBe('desc')
    expect(nextKeySort('desc')).toBe('none')
  })

  it('sorts key names naturally and ignores case', () => {
    expect(sortKeys(keys, 'asc').map((item) => item.key)).toEqual(['order:1', 'Order:2', 'user:9', 'user:10'])
    expect(sortKeys(keys, 'desc').map((item) => item.key)).toEqual(['user:10', 'user:9', 'Order:2', 'order:1'])
  })

  it('keeps scan order and the original array when unsorted', () => {
    expect(sortKeys(keys, 'none')).toBe(keys)
  })

  it('does not mutate the input array', () => {
    const before = keys.map((item) => item.key)
    sortKeys(keys, 'asc')
    expect(keys.map((item) => item.key)).toEqual(before)
  })
})

import { describe, expect, it } from 'vitest'

import { moveId, orderById } from '../../src/client/dragorder.ts'

describe('moveId', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('moves a row directly below the row it was dropped on', () => {
    expect(moveId(ids, 'a', 'c', true)).toEqual(['b', 'c', 'a', 'd'])
    expect(moveId(ids, 'd', 'c', true)).toBeNull()
  })

  it('moves a row directly above the row it was dropped on', () => {
    expect(moveId(ids, 'd', 'b', false)).toEqual(['a', 'd', 'b', 'c'])
    expect(moveId(ids, 'c', 'a', false)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('returns null when the drag would not change the order', () => {
    expect(moveId(ids, 'a', 'b', false)).toBeNull()
    expect(moveId(ids, 'b', 'a', true)).toBeNull()
    expect(moveId(ids, 'b', 'b', true)).toBeNull()
    expect(moveId(ids, 'missing', 'a', false)).toBeNull()
  })
})

describe('orderById', () => {
  const items = [
    { id: 'a', name: 'A' },
    { id: 'b', name: 'B' },
    { id: 'c', name: 'C' },
  ]

  it('applies a full order to the records', () => {
    expect(orderById(items, ['c', 'a', 'b']).map((item) => item.id)).toEqual(['c', 'a', 'b'])
  })

  it('appends records the order forgot and ignores unknown ids', () => {
    expect(orderById(items, ['c', 'ghost']).map((item) => item.id)).toEqual(['c', 'a', 'b'])
    expect(orderById(items, []).map((item) => item.id)).toEqual(['a', 'b', 'c'])
  })
})

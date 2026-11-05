import { describe, expect, it } from 'vitest'

import {
  TOOLBAR_ACTION_IDS,
  readToolbarActionOrder,
  orderToolbarActions,
} from '../../src/shared/toolbaractions.ts'

describe('toolbar action order', () => {
  it('keeps known ids in order and drops unknown or repeated ones', () => {
    expect(readToolbarActionOrder(['settings', 'ghost', 'add', 'settings', 7])).toEqual(['settings', 'add'])
    expect(readToolbarActionOrder(undefined)).toEqual([])
    expect(readToolbarActionOrder({ add: true })).toEqual([])
  })

  it('appends every action the saved order does not mention', () => {
    expect(orderToolbarActions(['console'])).toEqual([
      'console',
      'add',
      'edit',
      'refresh',
      'delete',
      'trash',
      'settings',
    ])
    expect(TOOLBAR_ACTION_IDS).toHaveLength(7)
    expect(orderToolbarActions(undefined)).toEqual([...TOOLBAR_ACTION_IDS])
  })

  it('ignores duplicates instead of listing an action twice', () => {
    const order = orderToolbarActions(['add', 'add', 'add'])
    expect(order).toHaveLength(7)
    expect(new Set(order).size).toBe(7)
  })
})

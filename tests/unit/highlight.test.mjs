import { describe, expect, it } from 'vitest'
import { highlightParts } from '../../src/client/highlight.ts'

describe('highlightParts', () => {
  it('returns the whole label when there is no query', () => {
    expect(highlightParts('orders', '')).toEqual([{ text: 'orders', hit: false }])
    expect(highlightParts('orders', '   ')).toEqual([{ text: 'orders', hit: false }])
  })

  it('marks a single case-insensitive hit', () => {
    expect(highlightParts('Orders', 'order')).toEqual([
      { text: 'Order', hit: true },
      { text: 's', hit: false },
    ])
    expect(highlightParts('shop_orders', 'ORDER')).toEqual([
      { text: 'shop_', hit: false },
      { text: 'order', hit: true },
      { text: 's', hit: false },
    ])
  })

  it('marks every occurrence', () => {
    expect(highlightParts('order_order', 'order')).toEqual([
      { text: 'order', hit: true },
      { text: '_', hit: false },
      { text: 'order', hit: true },
    ])
  })

  it('returns the whole label when nothing matches', () => {
    expect(highlightParts('customers', 'orders')).toEqual([{ text: 'customers', hit: false }])
  })
})

import { describe, expect, it } from 'vitest'

import {
  matchScore,
  prioritiesFor,
  rank,
  rankCandidates,
} from '../../src/client/completion/rank'

const candidate = (name, kind) => ({ name, kind })

describe('matchScore', () => {
  it('scores a prefix match as 0', () => {
    expect(matchScore('orders', 'ord')).toBe(0)
    expect(matchScore('orders', 'ORD')).toBe(0)
  })

  it('scores the start of a later word as 1', () => {
    expect(matchScore('order_id', 'id')).toBe(1)
    expect(matchScore('created_at', 'at')).toBe(1)
    expect(matchScore('OrderItems', 'items')).toBe(1)
  })

  it('scores a subsequence as 2', () => {
    expect(matchScore('created_at', 'crat')).toBe(2)
    expect(matchScore('customer', 'ctm')).toBe(2)
  })

  it('rejects names that do not match', () => {
    expect(matchScore('orders', 'xyz')).toBe(-1)
    expect(matchScore('orders', 'sord')).toBe(-1)
  })

  it('treats an empty prefix as a match', () => {
    expect(matchScore('anything', '')).toBe(0)
  })
})

describe('rank', () => {
  it('puts better matches first', () => {
    const items = [
      candidate('created_at', 'column'),
      candidate('cat', 'column'),
      candidate('order_id', 'column'),
    ]
    expect(rank(items, 'cat').map((item) => item.name)).toEqual(['cat', 'created_at', 'order_id'].slice(0, 2))
  })

  it('uses the kind priority when matches are equal', () => {
    expect(prioritiesFor('relation').alias).toBeLessThan(prioritiesFor('relation').table)
    expect(prioritiesFor('relation').table).toBeLessThan(prioritiesFor('relation').schema)
    expect(prioritiesFor('relation').schema).toBeLessThan(prioritiesFor('relation').keyword)
    const items = [
      candidate('orders', 'keyword'),
      candidate('orders', 'table'),
      candidate('orders', 'schema'),
      candidate('orders', 'alias'),
    ]
    expect(
      rank(items, 'ord', 10, { priorities: prioritiesFor('relation') }).map((item) => item.kind),
    ).toEqual(['alias', 'table', 'schema', 'keyword'])
  })

  it('deduplicates by kind and name, keeping the first occurrence', () => {
    const items = [
      { name: 'orders', kind: 'table', detail: 'first' },
      { name: 'orders', kind: 'table', detail: 'second' },
      { name: 'orders', kind: 'schema' },
    ]
    expect(rank(items, 'ord')).toEqual([
      { name: 'orders', kind: 'table', detail: 'first' },
      { name: 'orders', kind: 'schema' },
    ])
  })

  it('drops candidates that do not match and empty names', () => {
    const items = [candidate('', 'table'), candidate('orders', 'table'), candidate('customers', 'table')]
    expect(rank(items, 'ord').map((item) => item.name)).toEqual(['orders'])
  })

  it('truncates to the limit', () => {
    const items = ['orders', 'order_items', 'order_log'].map((name) => candidate(name, 'table'))
    expect(rank(items, 'order')).toHaveLength(3)
    expect(rank(items, 'order', 2)).toHaveLength(2)
    expect(rank(items, 'order', 2).map((item) => item.name)).toEqual(['orders', 'order_items'])
  })

  it('promotes recently used names', () => {
    const items = [candidate('orders', 'table'), candidate('order_items', 'table')]
    expect(rank(items, 'order').map((item) => item.name)).toEqual(['orders', 'order_items'])
    expect(rank(items, 'order', 10, { recent: ['order_items'] }).map((item) => item.name)).toEqual([
      'order_items',
      'orders',
    ])
  })

  it('keeps the score on ranked candidates only', () => {
    const ranked = rankCandidates([candidate('orders', 'table')], 'ord')
    expect(ranked[0]).toEqual({ name: 'orders', kind: 'table', score: 100 })
    expect(rank([candidate('orders', 'table')], 'ord')).toEqual([{ name: 'orders', kind: 'table' }])
  })
})

import { describe, expect, it } from 'vitest'

import { applyCompletion, completionCandidates, qualifierBefore, wordAtCaret } from '../../src/client/complete'

describe('wordAtCaret', () => {
  it('finds the word the caret sits in', () => {
    expect(wordAtCaret('SELECT * FROM ord', 18)).toEqual({ start: 14, end: 17, prefix: 'ord', quote: '' })
  })

  it('has no prefix right after a separator', () => {
    expect(wordAtCaret('SELECT * FROM ', 14)).toEqual({ start: 14, end: 14, prefix: '', quote: '' })
  })

  it('reports the quote that opened a quoted word', () => {
    expect(wordAtCaret('SELECT * FROM `ord', 18)).toEqual({ start: 15, end: 18, prefix: 'ord', quote: '`' })
    expect(wordAtCaret('SELECT * FROM "ord"', 18)).toEqual({ start: 15, end: 18, prefix: 'ord', quote: '"' })
  })

  it('reports an opening quote before it is closed', () => {
    expect(wordAtCaret('SELECT * FROM `ord', 18).quote).toBe('`')
  })

  it('clamps a caret outside the statement', () => {
    expect(wordAtCaret('SELECT', -2)).toEqual({ start: 0, end: 6, prefix: '', quote: '' })
    expect(wordAtCaret('SELECT', 99)).toEqual({ start: 0, end: 6, prefix: 'SELECT', quote: '' })
  })
})

describe('completionCandidates', () => {
  const items = [
    { name: 'orders', kind: 'table' },
    { name: 'order_items', kind: 'table' },
    { name: 'customers', kind: 'table' },
    { name: 'shop', kind: 'schema' },
    { name: 'orders', kind: 'schema' },
  ]

  it('filters case-insensitively by prefix', () => {
    expect(completionCandidates('ORD', items).map((item) => item.name)).toEqual(['orders', 'order_items', 'orders'])
  })

  it('returns everything for an empty prefix and drops duplicates', () => {
    const names = completionCandidates('', items).map((item) => `${item.kind}:${item.name}`)
    expect(names).toEqual(['table:orders', 'table:order_items', 'table:customers', 'schema:shop', 'schema:orders'])
  })

  it('caps the list', () => {
    expect(completionCandidates('', items, 2)).toHaveLength(2)
  })
})

describe('applyCompletion', () => {
  it('replaces the partial word and moves the caret after it', () => {
    expect(applyCompletion('SELECT * FROM ord WHERE id = 1', 17, 'orders', 'mysql')).toEqual({
      statement: 'SELECT * FROM orders WHERE id = 1',
      caret: 20,
    })
  })

  it('keeps the quote the user opened', () => {
    expect(applyCompletion('SELECT * FROM `ord', 18, 'orders', 'mysql')).toEqual({
      statement: 'SELECT * FROM orders',
      caret: 20,
    })
    expect(applyCompletion('SELECT * FROM `ord` ', 18, 'orders', 'mysql')).toEqual({
      statement: 'SELECT * FROM orders ',
      caret: 20,
    })
  })

  it('quotes a name that is not a plain identifier', () => {
    expect(applyCompletion('SELECT * FROM ', 14, '订单', 'mysql')).toEqual({
      statement: 'SELECT * FROM `订单`',
      caret: 18,
    })
    expect(applyCompletion('SELECT * FROM ', 14, 'Order Items', 'oracle').statement).toBe('SELECT * FROM "Order Items"')
  })

  it('inserts at the caret when there is no word yet', () => {
    expect(applyCompletion('SELECT ', 7, 'orders', 'mysql')).toEqual({ statement: 'SELECT orders', caret: 13 })
  })
})

describe('qualifierBefore', () => {
  it('reads the table typed before the dot', () => {
    const sql = 'SELECT * FROM orders WHERE orders.'
    expect(qualifierBefore(sql, sql.length)).toEqual(['orders'])
  })

  it('keeps the schema when the whole name is typed', () => {
    const sql = 'SELECT * FROM shop.orders.'
    expect(qualifierBefore(sql, sql.length)).toEqual(['shop', 'orders'])
  })

  it('strips backticks and double quotes', () => {
    const quoted = 'SELECT * FROM `shop`.`orders` wHERE `orders`.'
    expect(qualifierBefore(quoted, quoted.length)).toEqual(['orders'])
    const upper = 'SELECT * FROM "shop"."OrderItems".'
    expect(qualifierBefore(upper, upper.length)).toEqual(['shop', 'OrderItems'])
  })

  it('falls back to tables when there is no dot right before the caret', () => {
    expect(qualifierBefore('SELECT * FROM orders', 20)).toEqual([])
    expect(qualifierBefore('SELECT * FROM orders. ', 22)).toEqual([])
  })

  it('returns nothing for a bare dot', () => {
    expect(qualifierBefore('.', 1)).toEqual([])
  })
})

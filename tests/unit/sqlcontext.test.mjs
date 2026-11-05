import { describe, expect, it } from 'vitest'

import {
  columnOwner,
  completionContext,
  referencedTables,
} from '../../src/client/sqlcontext'

describe('referencedTables', () => {
  it('reads a plain FROM relation', () => {
    const sql = 'SELECT * FROM orders'
    expect(referencedTables(sql, sql.length)).toEqual([{ table: 'orders' }])
  })

  it('keeps the schema and the alias', () => {
    const sql = 'SELECT * FROM shop.orders o'
    expect(referencedTables(sql, sql.length)).toEqual([
      { schema: 'shop', table: 'orders', alias: 'o' },
    ])
  })

  it('reads joins, FROM lists and AS aliases', () => {
    const sql = 'SELECT * FROM orders AS o JOIN customers c ON o.id = c.id'
    expect(referencedTables(sql, sql.length)).toEqual([
      { table: 'orders', alias: 'o' },
      { table: 'customers', alias: 'c' },
    ])
    const list = 'SELECT * FROM orders o, shop.users u'
    expect(referencedTables(list, list.length)).toEqual([
      { table: 'orders', alias: 'o' },
      { schema: 'shop', table: 'users', alias: 'u' },
    ])
  })

  it('reads UPDATE, INSERT INTO and DELETE FROM targets', () => {
    const update = 'UPDATE orders SET id = 1'
    expect(referencedTables(update, update.length)).toEqual([{ table: 'orders' }])
    const insert = 'INSERT INTO orders (id) VALUES (1)'
    expect(referencedTables(insert, insert.length)).toEqual([{ table: 'orders' }])
    const remove = 'DELETE FROM orders WHERE id = 1'
    expect(referencedTables(remove, remove.length)).toEqual([{ table: 'orders' }])
  })

  it('strips identifier quotes and skips comments and strings', () => {
    const quoted = 'SELECT * FROM "shop"."Order Items" x'
    expect(referencedTables(quoted, quoted.length)).toEqual([
      { schema: 'shop', table: 'Order Items', alias: 'x' },
    ])
    const commented = "SELECT * FROM orders -- JOIN customers\nWHERE note = 'JOIN users'"
    expect(referencedTables(commented, commented.length)).toEqual([{ table: 'orders' }])
  })

  it('ignores text after the caret', () => {
    const sql = 'SELECT * FROM orders JOIN customers'
    expect(referencedTables(sql, 21)).toEqual([{ table: 'orders' }])
  })
})

describe('completionContext', () => {
  it('expects a relation after FROM, JOIN, INTO and UPDATE', () => {
    expect(completionContext('SELECT * FROM ', 14)).toBe('table')
    const joined = 'SELECT * FROM orders JOIN '
    expect(completionContext(joined, joined.length)).toBe('table')
    expect(completionContext('INSERT INTO ', 12)).toBe('table')
    expect(completionContext('DELETE FROM ', 12)).toBe('table')
  })

  it('expects an expression after SELECT, WHERE, ON and SET', () => {
    expect(completionContext('SELECT ', 7)).toBe('column')
    const where = 'SELECT * FROM orders WHERE '
    expect(completionContext(where, where.length)).toBe('column')
    const updated = 'UPDATE orders SET '
    expect(completionContext(updated, updated.length)).toBe('column')
  })

  it('treats a comma as a continuation of the current clause', () => {
    const list = 'SELECT * FROM orders, '
    expect(completionContext(list, list.length)).toBe('table')
    const cols = 'SELECT id, '
    expect(completionContext(cols, cols.length)).toBe('column')
  })

  it('falls back to any for an empty or finished statement', () => {
    expect(completionContext('', 0)).toBe('any')
    const done = 'SELECT 1; '
    expect(completionContext(done, done.length)).toBe('any')
  })
})

describe('columnOwner', () => {
  const refs = [
    { schema: 'shop', table: 'orders', alias: 'o' },
    { table: 'customers' },
  ]

  it('resolves aliases and table names', () => {
    expect(columnOwner(refs, 'O')).toEqual(refs[0])
    expect(columnOwner(refs, 'customers')).toEqual(refs[1])
  })

  it('returns null for an unknown qualifier', () => {
    expect(columnOwner(refs, 'nope')).toBeNull()
  })
})
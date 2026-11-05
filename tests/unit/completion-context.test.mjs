import { describe, expect, it } from 'vitest'

import { analyze } from '../../src/client/completion/context'

const caretAtEnd = (text) => analyze(text, text.length)

describe('analyze relations', () => {
  it('finds a table in FROM', () => {
    const analysis = caretAtEnd('SELECT * FROM orders WHERE ')
    expect(analysis.relations).toEqual([{ table: 'orders' }])
  })

  it('finds an alias and keeps it on the relation', () => {
    const analysis = caretAtEnd('SELECT * FROM orders o WHERE o.')
    expect(analysis.relations).toEqual([{ table: 'orders', alias: 'o' }])
    expect(analysis.qualifier).toEqual(['o'])
    expect(analysis.expectation).toBe('column')
  })

  it('reads a schema qualified relation', () => {
    const analysis = caretAtEnd('SELECT * FROM shop.orders WHERE ')
    expect(analysis.relations).toEqual([{ schema: 'shop', table: 'orders' }])
  })

  it('reads a schema qualified relation before a dotted caret', () => {
    const analysis = caretAtEnd('SELECT * FROM shop.orders.')
    expect(analysis.relations).toEqual([{ schema: 'shop', table: 'orders' }])
    expect(analysis.qualifier).toEqual(['shop', 'orders'])
  })

  it('reads the FROM list and every JOIN', () => {
    const analysis = caretAtEnd('SELECT * FROM orders o, customers c JOIN items i ON ')
    expect(analysis.relations).toEqual([
      { table: 'orders', alias: 'o' },
      { table: 'customers', alias: 'c' },
      { table: 'items', alias: 'i' },
    ])
  })

  it('reads UPDATE, INSERT INTO and CREATE TABLE relations', () => {
    expect(caretAtEnd('UPDATE orders SET ').relations).toEqual([{ table: 'orders' }])
    expect(caretAtEnd('INSERT INTO shop.orders (id, ').relations).toEqual([
      { schema: 'shop', table: 'orders' },
    ])
    expect(caretAtEnd('CREATE TABLE IF NOT EXISTS orders (id INT)').relations).toEqual([
      { table: 'orders' },
    ])
  })

  it('records a derived table by its alias only', () => {
    const analysis = caretAtEnd('SELECT * FROM (SELECT 1) x WHERE ')
    expect(analysis.relations).toEqual([{ table: '', alias: 'x' }])
  })

  it('is case insensitive about keywords but keeps the catalog spelling', () => {
    const analysis = caretAtEnd('select * from ORDERS where ')
    expect(analysis.relations).toEqual([{ table: 'ORDERS' }])
  })
})

describe('analyze expectation', () => {
  it('expects a relation after FROM/JOIN/UPDATE/INTO', () => {
    expect(caretAtEnd('SELECT * FROM ').expectation).toBe('relation')
    expect(caretAtEnd('SELECT * FROM a JOIN ').expectation).toBe('relation')
    expect(caretAtEnd('UPDATE ').expectation).toBe('relation')
    expect(caretAtEnd('INSERT INTO ').expectation).toBe('relation')
  })

  it('expects a column after SELECT/WHERE/ON/GROUP BY/ORDER BY', () => {
    expect(caretAtEnd('SELECT ').expectation).toBe('column')
    expect(caretAtEnd('SELECT * FROM t WHERE ').expectation).toBe('column')
    expect(caretAtEnd('SELECT * FROM a JOIN b ON ').expectation).toBe('column')
    expect(caretAtEnd('SELECT * FROM t GROUP BY ').expectation).toBe('column')
    expect(caretAtEnd('SELECT * FROM t ORDER BY ').expectation).toBe('column')
    expect(caretAtEnd('UPDATE t SET ').expectation).toBe('column')
  })

  it('expects a column in an INSERT column list', () => {
    const analysis = caretAtEnd('INSERT INTO orders (')
    expect(analysis.expectation).toBe('column')
    expect(analysis.relations).toEqual([{ table: 'orders' }])
  })

  it('expects an alias after AS', () => {
    expect(caretAtEnd('SELECT * FROM orders AS ').expectation).toBe('alias')
  })

  it('expects a schema after DDL and USE', () => {
    expect(caretAtEnd('CREATE ').expectation).toBe('schema')
    expect(caretAtEnd('DROP ').expectation).toBe('schema')
    expect(caretAtEnd('USE ').expectation).toBe('schema')
  })

  it('falls back to any outside a clause', () => {
    expect(caretAtEnd('ord').expectation).toBe('any')
    expect(caretAtEnd('').expectation).toBe('any')
    expect(caretAtEnd('EXPLAIN ').expectation).toBe('any')
  })

  it('ignores the identifier that is being typed', () => {
    expect(analyze('SELECT * FROM ord', 18).expectation).toBe('relation')
    expect(analyze('SELECT * FROM orders WHERE crat', 31).expectation).toBe('column')
  })
})

describe('analyze statement bounds', () => {
  it('uses only the statement under the caret', () => {
    const text = 'SELECT 1; SELECT * FROM orders WHERE '
    const analysis = caretAtEnd(text)
    expect(analysis.statement).toBe(' SELECT * FROM orders WHERE ')
    expect(analysis.masked).toBe(' SELECT * FROM orders WHERE ')
    expect(analysis.relations).toEqual([{ table: 'orders' }])
    expect(analysis.word.start).toBe(text.length)
  })

  it('does not split on a semicolon inside a string literal', () => {
    const analysis = caretAtEnd("SELECT ';' FROM orders WHERE ")
    expect(analysis.statement).toBe("SELECT ';' FROM orders WHERE ")
    expect(analysis.relations).toEqual([{ table: 'orders' }])
    expect(analysis.expectation).toBe('column')
  })

  it('blanks comments inside the statement while keeping the typed text', () => {
    const text = 'SELECT * FROM orders -- pick one\nWHERE '
    const analysis = caretAtEnd(text)
    expect(analysis.statement).toBe(text)
    expect(analysis.masked).not.toContain('pick one')
    expect(analysis.masked).toHaveLength(text.length)
    expect(analysis.relations).toEqual([{ table: 'orders' }])
    expect(analysis.expectation).toBe('column')
  })

  it('starts a fresh statement after a trailing semicolon', () => {
    const analysis = caretAtEnd('SELECT * FROM orders; ')
    expect(analysis.statement).toBe(' ')
    expect(analysis.relations).toEqual([])
    expect(analysis.expectation).toBe('any')
  })
})

describe('analyze word and qualifier', () => {
  it('reports the word under the caret with absolute offsets', () => {
    const text = 'SELECT * FROM orders WHERE crat'
    const analysis = analyze(text, text.length)
    expect(analysis.word).toEqual({ start: 27, end: 31, prefix: 'crat', quote: '' })
  })

  it('detects a qualifier chain', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE orders.').qualifier).toEqual(['orders'])
    expect(caretAtEnd('SELECT * FROM shop.orders.').qualifier).toEqual(['shop', 'orders'])
    expect(caretAtEnd('SELECT * FROM orders o WHERE o.').qualifier).toEqual(['o'])
  })

  it('detects a quoted qualifier', () => {
    const analysis = caretAtEnd('SELECT * FROM "shop"."OrderItems".')
    expect(analysis.qualifier).toEqual(['shop', 'OrderItems'])
  })

  it('has no qualifier without a dotted caret', () => {
    expect(caretAtEnd('SELECT * FROM orders').qualifier).toEqual([])
    expect(caretAtEnd('SELECT * FROM orders .').qualifier).toEqual([])
  })

  it('clamps out of range carets', () => {
    expect(analyze('SELECT 1', -5).word.start).toBe(0)
    expect(analyze('SELECT 1', 500).word.end).toBe(8)
  })
})

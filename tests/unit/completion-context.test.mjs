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

  it('expects a value after VALUES', () => {
    expect(caretAtEnd('INSERT INTO orders VALUES (').expectation).toBe('value')
    expect(caretAtEnd('INSERT INTO orders VALUES ').expectation).toBe('value')
  })

  it('expects a column definition inside CREATE TABLE', () => {
    expect(caretAtEnd('CREATE TABLE new_table (').expectation).toBe('definition')
    expect(caretAtEnd('CREATE TABLE IF NOT EXISTS new_table (id INT, ').expectation).toBe('definition')
  })

  it('does not expect a definition outside the CREATE TABLE body', () => {
    expect(caretAtEnd('CREATE TABLE ').expectation).toBe('relation')
    expect(caretAtEnd('SELECT * FROM orders WHERE ').expectation).toBe('column')
  })

  it('expects an ALTER action right after the table name', () => {
    expect(caretAtEnd('ALTER TABLE orders ').expectation).toBe('alter')
    expect(caretAtEnd('ALTER TABLE shop.orders ').expectation).toBe('alter')
    expect(caretAtEnd('ALTER TABLE IF EXISTS orders ').expectation).toBe('alter')
  })

  it('lets the typed ALTER action take over', () => {
    expect(caretAtEnd('ALTER TABLE orders ADD ').expectation).not.toBe('alter')
  })

  it('expects a table after CREATE INDEX ON', () => {
    const analysis = caretAtEnd('CREATE INDEX idx ON ')
    expect(analysis.expectation).toBe('relation')
    expect(analysis.relations).toEqual([])
    expect(caretAtEnd('CREATE UNIQUE INDEX idx ON ').expectation).toBe('relation')
  })

  it('expects columns after the CREATE INDEX table', () => {
    const analysis = caretAtEnd('CREATE INDEX idx ON orders (')
    expect(analysis.expectation).toBe('column')
    expect(analysis.relations).toEqual([{ table: 'orders' }])
    expect(caretAtEnd('CREATE INDEX idx ON shop.orders ').relations).toEqual([
      { schema: 'shop', table: 'orders' },
    ])
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

describe('analyze CTEs and derived tables', () => {
  it('infers the columns of a simple CTE', () => {
    const analysis = caretAtEnd(
      'WITH recent AS (SELECT id, total FROM orders) SELECT * FROM recent WHERE ',
    )
    expect(analysis.ctes).toEqual(['recent'])
    expect(analysis.relations).toEqual([{ table: 'recent', columns: ['id', 'total'] }])
    expect(analysis.expectation).toBe('column')
  })

  it('uses an explicit CTE column list over the SELECT list', () => {
    const analysis = caretAtEnd(
      'WITH x(a, b) AS (SELECT id, total FROM orders) SELECT * FROM x WHERE ',
    )
    expect(analysis.ctes).toEqual(['x'])
    expect(analysis.relations).toEqual([{ table: 'x', columns: ['a', 'b'] }])
  })

  it('reads several CTEs including RECURSIVE', () => {
    const analysis = caretAtEnd(
      'WITH RECURSIVE a AS (SELECT id FROM orders), b AS (SELECT name FROM customers) SELECT * FROM b WHERE ',
    )
    expect(analysis.ctes).toEqual(['a', 'b'])
    expect(analysis.relations).toEqual([{ table: 'b', columns: ['name'] }])
  })

  it('keeps CTE columns on a joined CTE', () => {
    const analysis = caretAtEnd(
      'WITH c AS (SELECT id, name FROM customers) SELECT * FROM orders o JOIN c ON ',
    )
    expect(analysis.relations).toEqual([
      { table: 'orders', alias: 'o' },
      { table: 'c', columns: ['id', 'name'] },
    ])
  })

  it('matches CTE names case insensitively', () => {
    const analysis = caretAtEnd(
      'WITH Recent AS (SELECT id FROM orders) SELECT * FROM recent WHERE ',
    )
    expect(analysis.ctes).toEqual(['Recent'])
    expect(analysis.relations).toEqual([{ table: 'recent', columns: ['id'] }])
  })

  it('infers derived table columns and the alias', () => {
    const analysis = caretAtEnd(
      'SELECT * FROM (SELECT id, total AS amount, o.id order_id, o.name FROM orders o) d WHERE d.',
    )
    expect(analysis.relations).toEqual([
      { table: '', alias: 'd', columns: ['id', 'amount', 'order_id', 'name'] },
    ])
    expect(analysis.qualifier).toEqual(['d'])
    expect(analysis.expectation).toBe('column')
  })

  it('records the source relation behind SELECT * instead of inventing columns', () => {
    const cte = caretAtEnd('WITH all_rows AS (SELECT * FROM orders) SELECT * FROM all_rows WHERE ')
    expect(cte.relations).toEqual([{ table: 'all_rows', source: { table: 'orders' } }])
    const derived = caretAtEnd('SELECT * FROM (SELECT o.* FROM orders o) d WHERE ')
    expect(derived.relations).toEqual([{ table: '', alias: 'd', source: { table: 'orders' } }])
  })

  it('keeps the schema of the SELECT * source relation', () => {
    const analysis = caretAtEnd(
      'WITH x AS (SELECT * FROM shop.orders) SELECT * FROM x WHERE x.',
    )
    expect(analysis.relations).toEqual([
      { table: 'x', source: { schema: 'shop', table: 'orders' } },
    ])
  })

  it('leaves the source unknown for an ambiguous FROM list', () => {
    const analysis = caretAtEnd(
      'WITH x AS (SELECT * FROM orders o JOIN customers c ON o.id = c.id) SELECT * FROM x WHERE ',
    )
    expect(analysis.relations).toEqual([{ table: 'x' }])
  })

  it('follows a chained CTE through SELECT *', () => {
    const analysis = caretAtEnd(
      'WITH a AS (SELECT * FROM orders), b AS (SELECT * FROM a) SELECT * FROM b WHERE ',
    )
    expect(analysis.ctes).toEqual(['a', 'b'])
    expect(analysis.relations).toEqual([{ table: 'b', source: { table: 'orders' } }])
  })

  it('carries explicit CTE columns through a chain', () => {
    const analysis = caretAtEnd(
      'WITH a AS (SELECT id, total FROM orders), b AS (SELECT * FROM a) SELECT * FROM b WHERE ',
    )
    expect(analysis.relations).toEqual([{ table: 'b', columns: ['id', 'total'] }])
  })

  it('inherits CTE columns in a derived table', () => {
    const analysis = caretAtEnd(
      'WITH a AS (SELECT * FROM orders) SELECT * FROM (SELECT * FROM a) d WHERE ',
    )
    expect(analysis.relations).toEqual([
      { table: '', alias: 'd', source: { table: 'orders' } },
    ])
  })

  it('gives no CTE list outside a WITH statement', () => {
    const analysis = caretAtEnd('for (part of items) ')
    expect(analysis.ctes).toBeUndefined()
    expect(analysis.relations).toEqual([])
  })

  it('falls back cleanly on an incomplete WITH', () => {
    expect(() => caretAtEnd('WITH x AS (')).not.toThrow()
    expect(caretAtEnd('WITH x AS (').ctes).toBeUndefined()
  })
})

describe('analyze literal positions', () => {
  it('marks a caret inside a string literal or comment', () => {
    expect(analyze("SELECT 'he", 11).inLiteral).toBe(true)
    expect(analyze('SELECT * FROM t -- note', 21).inLiteral).toBe(true)
    expect(analyze('SELECT 1 /* note */ FROM t', 12).inLiteral).toBe(true)
  })

  it('does not mark a caret after a closed literal or comment', () => {
    expect(analyze("SELECT 'hi' ", 12).inLiteral).toBeUndefined()
    const comment = 'SELECT 1 -- note\n'
    expect(analyze(comment, comment.length).inLiteral).toBeUndefined()
  })
})

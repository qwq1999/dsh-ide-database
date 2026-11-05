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
    expect(caretAtEnd('EXPLAIN ').expectation).toBe('statement')
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

  it('expects an ALTER object after the action', () => {
    expect(caretAtEnd('ALTER TABLE orders ADD ').expectation).toBe('alterObject')
    expect(caretAtEnd('ALTER TABLE orders DROP ').expectation).toBe('alterObject')
    expect(caretAtEnd('ALTER TABLE orders RENAME ').expectation).toBe('alterObject')
    expect(caretAtEnd('ALTER TABLE orders ADD ').expectation).not.toBe('alter')
  })

  it('follows ALTER TABLE actions into the column they name', () => {
    expect(caretAtEnd('ALTER TABLE orders DROP COLUMN ').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders MODIFY ').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders MODIFY COLUMN ').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders CHANGE COLUMN ').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders ADD COLUMN ').expectation).toBe('definition')
    expect(caretAtEnd('ALTER TABLE orders RENAME TO ').expectation).toBe('name')
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

  it('expects a table after GRANT or REVOKE ... ON', () => {
    expect(caretAtEnd('GRANT SELECT ON ').expectation).toBe('relation')
    expect(caretAtEnd('GRANT ALL PRIVILEGES ON ').expectation).toBe('relation')
    expect(caretAtEnd('REVOKE SELECT ON ').expectation).toBe('relation')
    expect(caretAtEnd('SELECT * FROM orders JOIN customers ON ').expectation).toBe('column')
  })

  it('expects a table after DESCRIBE or DESC', () => {
    expect(caretAtEnd('DESCRIBE ').expectation).toBe('relation')
    expect(caretAtEnd('DESC ').expectation).toBe('relation')
    expect(caretAtEnd('SELECT * FROM orders ORDER BY id DESC ').expectation).toBe('orderTail')
  })

  it('expects a table after DROP INDEX ... ON', () => {
    expect(caretAtEnd('DROP INDEX idx ON ').expectation).toBe('relation')
  })

  it('expects columns in an ALTER TABLE index definition', () => {
    expect(caretAtEnd('ALTER TABLE orders ADD INDEX idx (').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders ADD UNIQUE KEY idx (id, ').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders ADD PRIMARY KEY (').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders ADD COLUMN ').expectation).toBe('definition')
  })

  it('starts a statement inside subquery parentheses', () => {
    expect(caretAtEnd('WITH x AS (').expectation).toBe('keyword')
    expect(caretAtEnd('CREATE VIEW v AS (').expectation).toBe('keyword')
    expect(caretAtEnd('SELECT * FROM (').expectation).toBe('keyword')
    expect(caretAtEnd('SELECT * FROM orders WHERE id IN (').expectation).toBe('column')
  })

  it('expects a table after IF EXISTS', () => {
    expect(caretAtEnd('DROP TABLE IF EXISTS ').expectation).toBe('relation')
    expect(caretAtEnd('DROP TABLE IF EXISTS ').relations).toEqual([])
    expect(caretAtEnd('DROP TABLE IF EXISTS orders ').relations).toEqual([{ table: 'orders' }])
    expect(caretAtEnd('DROP VIEW IF EXISTS ').expectation).toBe('relation')
  })

  it('expects table options after a CREATE TABLE body', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT) ').expectation).toBe('tableOptions')
    expect(caretAtEnd('CREATE TEMPORARY TABLE t (id INT) ').expectation).toBe('tableOptions')
    expect(caretAtEnd('CREATE TABLE t (id INT) AS ').expectation).toBe('keyword')
    expect(caretAtEnd('CREATE TABLE t AS SELECT * FROM ').expectation).toBe('relation')
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

  it('exposes CTEs as relations a qualifier can point at', () => {
    const starred = caretAtEnd('WITH recent AS (SELECT * FROM orders) SELECT recent.')
    expect(starred.cteRelations).toEqual([
      { table: '', alias: 'recent', source: { table: 'orders' } },
    ])
    expect(starred.relations).toEqual([])
    const explicit = caretAtEnd('WITH recent AS (SELECT id, total FROM orders) SELECT recent.')
    expect(explicit.cteRelations).toEqual([
      { table: '', alias: 'recent', columns: ['id', 'total'] },
    ])
    const unknown = caretAtEnd('WITH recent AS (SELECT 1) SELECT recent.')
    expect(unknown.cteRelations).toEqual([{ table: '', alias: 'recent' }])
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

describe('analyze statement tails', () => {
  it('expects a number right after LIMIT or OFFSET', () => {
    expect(caretAtEnd('SELECT * FROM orders LIMIT ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders LIMIT 10 OFFSET ').expectation).toBe('number')
  })

  it('returns to the generic list once the count is typed', () => {
    expect(caretAtEnd('SELECT * FROM orders LIMIT 10 ').expectation).toBe('number')
  })

  it('expects a storage engine after ENGINE', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT) ENGINE = ').expectation).toBe('engine')
    expect(caretAtEnd('CREATE TABLE t (id INT) ENGINE ').expectation).toBe('engine')
  })

  it('does not treat a column named engine as an engine position', () => {
    expect(caretAtEnd('SELECT engine = ').expectation).not.toBe('engine')
  })
})

describe('analyze SET and CAST tails', () => {
  it('expects SET words instead of catalog names', () => {
    expect(caretAtEnd('SET ').expectation).toBe('set')
    expect(caretAtEnd('SET SESSION ').expectation).toBe('set')
  })

  it('expects a charset after SET NAMES', () => {
    expect(caretAtEnd('SET NAMES ').expectation).toBe('charset')
  })

  it('expects a literal in a SET assignment', () => {
    expect(caretAtEnd('SET autocommit = ').expectation).toBe('value')
  })

  it('stays quiet once the SET literal is typed', () => {
    expect(caretAtEnd('SET NAMES utf8mb4 ').expectation).toBe('number')
  })

  it('expects a type after AS inside CAST', () => {
    expect(caretAtEnd('SELECT CAST(id AS ').expectation).toBe('type')
    expect(caretAtEnd('SELECT cast(id as ').expectation).toBe('type')
  })

  it('keeps AS an alias outside CAST', () => {
    expect(caretAtEnd('SELECT * FROM orders AS ').expectation).toBe('alias')
  })

  it('assigns columns after ON DUPLICATE KEY UPDATE', () => {
    const analysis = caretAtEnd('INSERT INTO orders (id) VALUES (1) ON DUPLICATE KEY UPDATE ')
    expect(analysis.expectation).toBe('column')
    expect(analysis.relations).toEqual([{ table: 'orders' }])
  })
})

describe('analyze CREATE TABLE option values', () => {
  it('expects a charset name after DEFAULT CHARSET', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT) DEFAULT CHARSET ').expectation).toBe('charset')
    expect(caretAtEnd('CREATE TABLE t (id INT) CHARACTER SET ').expectation).toBe('charset')
  })

  it('returns to table options after an option value', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT) ENGINE = InnoDB ').expectation).toBe('tableOptions')
    expect(caretAtEnd('CREATE TABLE t (id INT) DEFAULT CHARSET utf8mb4 ').expectation).toBe(
      'tableOptions',
    )
  })
})

describe('analyze name-only and statement tails', () => {
  it('asks for a name only the user knows', () => {
    expect(caretAtEnd('DROP INDEX ').expectation).toBe('name')
    expect(caretAtEnd('CREATE DATABASE ').expectation).toBe('name')
    expect(caretAtEnd('CREATE SCHEMA ').expectation).toBe('name')
    expect(caretAtEnd('GRANT SELECT ON orders TO ').expectation).toBe('name')
    expect(caretAtEnd('REVOKE SELECT ON orders FROM ').expectation).toBe('name')
  })

  it('expects the explained statement after EXPLAIN', () => {
    expect(caretAtEnd('EXPLAIN ').expectation).toBe('statement')
  })

  it('expects SHOW subcommands', () => {
    expect(caretAtEnd('SHOW ').expectation).toBe('show')
    expect(caretAtEnd('SHOW FULL ').expectation).toBe('show')
  })
})

describe('analyze statement continuation tails', () => {
  it('expects a statement after UNION and CREATE TABLE ... AS', () => {
    expect(caretAtEnd('SELECT * FROM orders UNION ').expectation).toBe('statement')
    expect(caretAtEnd('SELECT * FROM orders UNION ALL ').expectation).toBe('statement')
    expect(caretAtEnd('CREATE TABLE t AS ').expectation).toBe('statement')
    expect(caretAtEnd('CREATE TABLE IF NOT EXISTS t AS ').expectation).toBe('statement')
  })

  it('expects the explained statement after EXPLAIN ANALYZE', () => {
    expect(caretAtEnd('EXPLAIN ANALYZE ').expectation).toBe('statement')
  })

  it('expects a number after the LIMIT offset comma', () => {
    expect(caretAtEnd('SELECT * FROM orders LIMIT ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders LIMIT 10, ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders LIMIT 10 ').expectation).toBe('number')
  })

  it('points SHOW tails at their targets', () => {
    expect(caretAtEnd('SHOW CREATE DATABASE ').expectation).toBe('schema')
    expect(caretAtEnd('SHOW CREATE TABLE ').expectation).toBe('relation')
    expect(caretAtEnd('SHOW CREATE VIEW ').expectation).toBe('relation')
    expect(caretAtEnd('SHOW TABLES FROM ').expectation).toBe('schema')
    expect(caretAtEnd('SHOW TABLES ').expectation).toBe('number')
    expect(caretAtEnd('SHOW COLUMNS FROM orders ').expectation).toBe('name')
    expect(caretAtEnd('SHOW INDEX FROM orders ').expectation).toBe('name')
    expect(caretAtEnd('SHOW GRANTS FOR users ').expectation).toBe('name')
    expect(caretAtEnd('SHOW VARIABLES LIKE ').expectation).toBe('name')
    expect(caretAtEnd('SHOW ENGINES ').expectation).toBe('number')
    expect(caretAtEnd('SHOW FULL TABLES ').expectation).toBe('number')
    expect(caretAtEnd('SHOW TABLE STATUS ').expectation).toBe('number')
  })

  it('stays quiet after a completed ALTER TABLE rename', () => {
    expect(caretAtEnd('ALTER TABLE orders RENAME TO new_orders ').expectation).toBe('number')
    expect(caretAtEnd('ALTER TABLE orders RENAME TO ').expectation).toBe('name')
  })
})

describe('analyze DDL and tail leftovers', () => {
  it('expects user text after COMMENT and DEFAULT', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT) COMMENT ').expectation).toBe('name')
    expect(caretAtEnd('CREATE TABLE t (id INT) COMMENT = ').expectation).toBe('name')
    expect(caretAtEnd('CREATE TABLE t (id INT) DEFAULT ').expectation).toBe('value')
    expect(caretAtEnd('CREATE TABLE t (id INT) COLLATE ').expectation).toBe('number')
  })

  it('keeps the CREATE TABLE body positions intact', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT) ').expectation).toBe('tableOptions')
    expect(caretAtEnd('CREATE TABLE t (id INT) DEFAULT CHARSET ').expectation).toBe('charset')
    expect(caretAtEnd('CREATE TABLE t (id INT) ENGINE = ').expectation).toBe('engine')
  })

  it('stays quiet after DESCRIBE targets', () => {
    expect(caretAtEnd('DESCRIBE ').expectation).toBe('relation')
    expect(caretAtEnd('DESCRIBE orders ').expectation).toBe('name')
    expect(caretAtEnd('DESC orders ').expectation).toBe('name')
  })

  it('expects a statement after a CTE or CREATE VIEW header', () => {
    expect(caretAtEnd('WITH x AS (SELECT 1) ').expectation).toBe('statement')
    expect(caretAtEnd('CREATE VIEW v AS ').expectation).toBe('statement')
    expect(caretAtEnd('CREATE TABLE t LIKE ').expectation).toBe('relation')
  })

  it('handles EXPLAIN format and names-only DDL', () => {
    expect(caretAtEnd('EXPLAIN FORMAT=TREE ').expectation).toBe('statement')
    expect(caretAtEnd('EXPLAIN FORMAT = JSON ').expectation).toBe('statement')
    expect(caretAtEnd('CREATE USER ').expectation).toBe('name')
    expect(caretAtEnd('CREATE ROLE ').expectation).toBe('name')
    expect(caretAtEnd('CREATE SEQUENCE ').expectation).toBe('name')
    expect(caretAtEnd('CREATE TRIGGER ').expectation).toBe('name')
  })
})

describe('analyze condition and ordering tails', () => {
  it('expects a comparison after a condition operand', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE total ').expectation).toBe('comparison')
    expect(caretAtEnd('SELECT * FROM orders o WHERE o.id ').expectation).toBe('comparison')
    expect(caretAtEnd('SELECT * FROM orders GROUP BY total HAVING total ').expectation).toBe(
      'comparison',
    )
  })

  it('expects a connector after a finished comparison', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE id = 1 ').expectation).toBe('boolean')
    expect(
      caretAtEnd('SELECT * FROM orders o JOIN customers c ON o.user_id = c.id ').expectation,
    ).toBe('boolean')
    expect(caretAtEnd('SELECT * FROM orders HAVING COUNT(*) > 1 ').expectation).toBe('boolean')
  })

  it('keeps plain condition positions as columns', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE ').expectation).toBe('column')
    expect(caretAtEnd('SELECT * FROM orders WHERE id = ').expectation).toBe('column')
  })

  it('expects a sort direction after an ORDER BY item', () => {
    expect(caretAtEnd('SELECT * FROM orders ORDER BY total ').expectation).toBe('direction')
    expect(caretAtEnd('SELECT * FROM orders ORDER BY total DESC, total ').expectation).toBe(
      'direction',
    )
    expect(caretAtEnd('SELECT * FROM orders GROUP BY total ').expectation).toBe('column')
  })

  it('expects the ORDER BY tail after a direction', () => {
    expect(caretAtEnd('SELECT * FROM orders ORDER BY total DESC ').expectation).toBe('orderTail')
  })

  it('does not read clause words out of a closed subquery', () => {
    expect(
      caretAtEnd('SELECT * FROM (SELECT id FROM orders ORDER BY id) t ').expectation,
    ).toBe('column')
    expect(
      caretAtEnd('SELECT * FROM (SELECT id FROM orders WHERE id = 1) t ').expectation,
    ).toBe('column')
  })
})

describe('analyze finished expressions and parameters', () => {
  it('expects a connector after a parameter or IN-list comparison', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE id = ? ').expectation).toBe('boolean')
    expect(caretAtEnd('SELECT * FROM orders WHERE id = :id ').expectation).toBe('boolean')
    expect(caretAtEnd('SELECT * FROM orders WHERE id IN (1, 2) ').expectation).toBe('boolean')
    expect(caretAtEnd('SELECT * FROM orders WHERE id NOT IN (1, 2) ').expectation).toBe('boolean')
    expect(caretAtEnd('SELECT * FROM orders WHERE id BETWEEN 1 AND 2 ').expectation).toBe('boolean')
  })

  it('expects a clause after a complete select-list expression', () => {
    expect(caretAtEnd('SELECT COUNT(*) ').expectation).toBe('expressionTail')
    expect(caretAtEnd('SELECT id, COUNT(*) ').expectation).toBe('expressionTail')
    expect(caretAtEnd('SELECT CASE WHEN id = 1 THEN 1 END ').expectation).toBe('expressionTail')
  })

  it('expects an operator after a complete CASE expression in a condition', () => {
    expect(
      caretAtEnd('SELECT * FROM orders WHERE CASE WHEN id = 1 THEN 1 END ').expectation,
    ).toBe('comparison')
  })

  it('offers only scalar values after IS NOT', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE id IS NOT ').expectation).toBe('value')
  })

  it('keeps incomplete expressions and plain positions as columns', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE id = ').expectation).toBe('column')
    expect(caretAtEnd('SELECT COUNT(').expectation).toBe('column')
  })

  it('expects column options after a finished ALTER COLUMN definition', () => {
    expect(caretAtEnd('ALTER TABLE orders ADD COLUMN x INT ').expectation).toBe('definition')
    expect(caretAtEnd('ALTER TABLE orders ADD COLUMN x INT COMMENT ').expectation).toBe('name')
    expect(caretAtEnd('ALTER TABLE orders ADD COLUMN x INT DEFAULT ').expectation).toBe('value')
  })
})

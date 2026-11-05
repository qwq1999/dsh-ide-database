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
    expect(caretAtEnd('SELECT * FROM orders AS ').expectation).toBe('name')
  })

  it('expects a schema after DDL and USE', () => {
    expect(caretAtEnd('CREATE ').expectation).toBe('schema')
    expect(caretAtEnd('DROP ').expectation).toBe('schema')
    expect(caretAtEnd('USE ').expectation).toBe('database')
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

  it('names the stage of a column definition inside CREATE TABLE', () => {
    expect(caretAtEnd('CREATE TABLE new_table (').expectation).toBe('name')
    expect(caretAtEnd('CREATE TABLE new_table (id ').expectation).toBe('columnType')
    expect(caretAtEnd('CREATE TABLE new_table (id INT NOT ').expectation).toBe('definition')
    expect(caretAtEnd('CREATE TABLE IF NOT EXISTS new_table (id INT, ').expectation).toBe('name')
  })

  it('does not expect a definition outside the CREATE TABLE body', () => {
    expect(caretAtEnd('CREATE TABLE ').expectation).toBe('name')
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
    expect(analysis.expectation).toBe('tableName')
    expect(analysis.relations).toEqual([])
    expect(caretAtEnd('CREATE UNIQUE INDEX idx ON ').expectation).toBe('tableName')
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
    expect(caretAtEnd('GRANT SELECT ON ').expectation).toBe('tableName')
    expect(caretAtEnd('GRANT ALL PRIVILEGES ON ').expectation).toBe('tableName')
    expect(caretAtEnd('REVOKE SELECT ON ').expectation).toBe('tableName')
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
    expect(caretAtEnd('SELECT * FROM orders WHERE id IN (').expectation).toBe('keyword')
  })

  it('expects a table after IF EXISTS', () => {
    expect(caretAtEnd('DROP TABLE IF EXISTS ').expectation).toBe('tableName')
    expect(caretAtEnd('DROP TABLE IF EXISTS ').relations).toEqual([])
    expect(caretAtEnd('DROP TABLE IF EXISTS orders ').relations).toEqual([{ table: 'orders' }])
    expect(caretAtEnd('DROP VIEW IF EXISTS ').expectation).toBe('tableName')
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
    expect(caretAtEnd('SELECT * FROM orders AS ').expectation).toBe('name')
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
    expect(caretAtEnd('SHOW CREATE DATABASE ').expectation).toBe('database')
    expect(caretAtEnd('SHOW CREATE TABLE ').expectation).toBe('tableName')
    expect(caretAtEnd('SHOW CREATE VIEW ').expectation).toBe('tableName')
    expect(caretAtEnd('SHOW TABLES FROM ').expectation).toBe('database')
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
    expect(caretAtEnd('CREATE TABLE t (id INT) COLLATE ').expectation).toBe('collation')
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
    expect(caretAtEnd('CREATE TABLE t LIKE ').expectation).toBe('tableName')
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
    expect(caretAtEnd('SELECT * FROM orders GROUP BY total ').expectation).toBe('groupTail')
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

describe('analyze grouping, insert and table tails', () => {
  it('expects the GROUP BY tail after a grouped column', () => {
    expect(caretAtEnd('SELECT * FROM orders GROUP BY status ').expectation).toBe('groupTail')
    expect(caretAtEnd('SELECT * FROM orders GROUP BY status WITH ROLLUP ').expectation).toBe(
      'rollupTail',
    )
    expect(caretAtEnd('SELECT * FROM orders GROUP BY status, ').expectation).toBe('column')
    expect(caretAtEnd('SELECT * FROM orders ORDER BY total ').expectation).toBe('direction')
  })

  it('expects the duplicate key clause after an INSERT values list', () => {
    expect(caretAtEnd('INSERT INTO orders VALUES (1, 2) ').expectation).toBe('insertTail')
    expect(caretAtEnd('INSERT INTO orders VALUES (1, 2), (3, 4) ').expectation).toBe('insertTail')
    expect(caretAtEnd('INSERT INTO orders VALUES (1, 2), ').expectation).toBe('number')
    expect(caretAtEnd('INSERT INTO orders VALUES (1, 2) ON DUPLICATE KEY UPDATE ').expectation).toBe(
      'column',
    )
  })

  it('starts a statement inside EXISTS parentheses', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE EXISTS (').expectation).toBe('keyword')
    expect(caretAtEnd('SELECT * FROM orders WHERE NOT EXISTS (').expectation).toBe('keyword')
  })

  it('names the SHOW database and quiets completed SHOW tails', () => {
    expect(caretAtEnd('SHOW TABLES IN ').expectation).toBe('database')
    expect(caretAtEnd('SHOW TABLES FROM ').expectation).toBe('database')
    expect(caretAtEnd('SHOW CREATE TABLE ').expectation).toBe('tableName')
    expect(caretAtEnd('SHOW CREATE TABLE orders ').expectation).toBe('name')
  })

  it('quiets completed table statement tails', () => {
    expect(caretAtEnd('DROP TABLE orders ').expectation).toBe('number')
    expect(caretAtEnd('TRUNCATE TABLE orders ').expectation).toBe('number')
    expect(caretAtEnd('RENAME TABLE orders TO ').expectation).toBe('name')
    expect(caretAtEnd('DROP TABLE IF EXISTS ').expectation).toBe('tableName')
    expect(caretAtEnd('DROP TABLE ').expectation).toBe('tableName')
  })

  it('quiets a CREATE INDEX column list once it closes', () => {
    expect(caretAtEnd('CREATE INDEX idx ON orders (id) ').expectation).toBe('number')
    expect(caretAtEnd('CREATE INDEX idx ON orders (').expectation).toBe('column')
    expect(caretAtEnd('CREATE INDEX idx ON ').expectation).toBe('tableName')
  })
})

describe('analyze literals, lock clauses and INSERT SET', () => {
  it('finishes a comparison whose operand is a string literal', () => {
    expect(caretAtEnd("SELECT * FROM orders WHERE status = 'paid' ").expectation).toBe('boolean')
    expect(caretAtEnd("SELECT * FROM orders WHERE name LIKE 'a%' ").expectation).toBe('boolean')
    expect(caretAtEnd("SELECT * FROM orders WHERE created_at > '2024-01-01' ").expectation).toBe(
      'boolean',
    )
    expect(caretAtEnd("SELECT * FROM orders WHERE comment = 'it''s ok' ").expectation).toBe(
      'boolean',
    )
    expect(caretAtEnd('SELECT * FROM orders WHERE status = ').expectation).toBe('column')
  })

  it('quiets trailing lock clauses', () => {
    expect(caretAtEnd('SELECT * FROM orders FOR UPDATE ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders FOR SHARE ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders LOCK IN SHARE MODE ').expectation).toBe('number')
  })

  it('handles MySQL INSERT ... SET assignments', () => {
    expect(caretAtEnd('INSERT INTO orders SET ').expectation).toBe('column')
    expect(caretAtEnd('INSERT INTO orders SET total = ').expectation).toBe('value')
    expect(caretAtEnd('INSERT INTO orders SET total = 1 ').expectation).toBe('number')
    expect(caretAtEnd('INSERT INTO orders SET total = 1, ').expectation).toBe('column')
  })
})

describe('resolve relations written after the caret', () => {
  it('reads the FROM alias of a select list qualifier', () => {
    expect(analyze('SELECT o. FROM orders o', 9).relations).toEqual([
      { table: 'orders', alias: 'o' },
    ])
    expect(analyze('SELECT o. FROM orders AS o', 9).relations).toEqual([
      { table: 'orders', alias: 'o' },
    ])
  })

  it('merges every relation of the statement', () => {
    expect(
      analyze('SELECT o. , c.name FROM orders o JOIN customers c ON c.id = o.user_id', 9)
        .relations,
    ).toEqual([
      { table: 'orders', alias: 'o' },
      { table: 'customers', alias: 'c' },
    ])
  })

  it('reads later relations for a select list without a qualifier', () => {
    expect(analyze('SELECT o FROM orders o', 8).relations).toEqual([
      { table: 'orders', alias: 'o' },
    ])
  })
})

describe('analyze boolean, insert and join tails', () => {
  it('expects a literal after IS and an operator after NOT', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE id IS ').expectation).toBe('value')
    expect(caretAtEnd('SELECT * FROM orders WHERE id NOT ').expectation).toBe('comparison')
    expect(caretAtEnd('SELECT * FROM orders WHERE id IS NOT ').expectation).toBe('value')
    expect(caretAtEnd('SELECT * FROM orders WHERE id IS NULL ').expectation).toBe('boolean')
  })

  it('expects the row source after a complete INSERT column list', () => {
    expect(caretAtEnd('INSERT INTO orders (id) ').expectation).toBe('insertSource')
    expect(caretAtEnd('INSERT INTO orders (id, total) ').expectation).toBe('insertSource')
    expect(caretAtEnd('INSERT INTO orders (').expectation).toBe('column')
    expect(caretAtEnd('INSERT INTO orders (id) VALUES (').expectation).toBe('value')
  })

  it('moves on after a complete JOIN USING list', () => {
    expect(caretAtEnd('SELECT * FROM orders o JOIN customers c USING (id) ').expectation).toBe(
      'joinTail',
    )
    expect(caretAtEnd('SELECT * FROM orders o JOIN customers c USING (').expectation).toBe('using')
  })

  it('starts a statement inside an IN parenthesis', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE id IN (').expectation).toBe('keyword')
  })
})

describe('analyze alias names, windows and later FROM', () => {
  it('treats AS as the start of a name, not a relation', () => {
    expect(caretAtEnd('SELECT id AS ').expectation).toBe('name')
    expect(caretAtEnd('SELECT * FROM orders AS ').expectation).toBe('name')
  })

  it('finishes a window expression after OVER', () => {
    expect(
      caretAtEnd('SELECT ROW_NUMBER() OVER (PARTITION BY user_id) ').expectation,
    ).toBe('expressionTail')
  })

  it('starts a subquery after ANY and ALL', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE id = ANY (').expectation).toBe('keyword')
    expect(caretAtEnd('SELECT * FROM orders WHERE id = ALL (').expectation).toBe('keyword')
  })

  it('reads a FROM clause written after the select list', () => {
    expect(analyze('SELECT id FROM orders', 9)).toMatchObject({
      expectation: 'column',
      relations: [{ table: 'orders' }],
    })
    expect(analyze('SELECT id ', 10).relations).toEqual([])
  })
})

describe('analyze USING columns, LIKE patterns and GRANT privileges', () => {
  it('expects the shared columns inside USING parentheses', () => {
    expect(caretAtEnd('SELECT * FROM orders o JOIN customers c USING (').expectation).toBe('using')
    expect(
      caretAtEnd('SELECT * FROM orders o JOIN customers c USING (id) ').expectation,
    ).toBe('joinTail')
  })

  it('expects a pattern literal after LIKE', () => {
    expect(caretAtEnd('SELECT * FROM orders WHERE name LIKE ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders WHERE name NOT LIKE ').expectation).toBe('number')
  })

  it('offers privileges before the ON clause of GRANT and REVOKE', () => {
    expect(caretAtEnd('GRANT ').expectation).toBe('privilege')
    expect(caretAtEnd('REVOKE ').expectation).toBe('privilege')
    expect(caretAtEnd('GRANT SELECT ').expectation).toBe('privilege')
    expect(caretAtEnd('GRANT SELECT, ').expectation).toBe('privilege')
    expect(caretAtEnd('GRANT SELECT ON ').expectation).toBe('tableName')
    expect(caretAtEnd('GRANT SELECT ON orders TO ').expectation).toBe('name')
    expect(caretAtEnd('GRANT SELECT ON orders TO alice ').expectation).toBe('number')
  })

  it('offers window keywords inside OVER and yields to ORDER BY', () => {
    expect(caretAtEnd('SELECT ROW_NUMBER() OVER (').expectation).toBe('over')
    expect(caretAtEnd('SELECT ROW_NUMBER() OVER (PARTITION BY user_id ').expectation).toBe(
      'column',
    )
    expect(caretAtEnd('SELECT ROW_NUMBER() OVER (ORDER BY id ').expectation).toBe('direction')
    expect(caretAtEnd('SELECT ROW_NUMBER() OVER (ORDER BY id) ').expectation).toBe(
      'expressionTail',
    )
  })
})


describe('analyze collations, grant options and lock tails', () => {
  it('expects a collation name after COLLATE', () => {
    expect(caretAtEnd('SELECT * FROM orders ORDER BY name COLLATE ').expectation).toBe('collation')
    expect(caretAtEnd('CREATE TABLE t (id INT) COLLATE ').expectation).toBe('collation')
  })

  it('stays quiet after ESCAPE', () => {
    expect(caretAtEnd("SELECT * FROM orders WHERE name LIKE '%x' ESCAPE ").expectation).toBe(
      'number',
    )
  })

  it('follows WITH in a GRANT statement', () => {
    expect(caretAtEnd('GRANT SELECT ON orders TO alice WITH ').expectation).toBe('grantOption')
    expect(caretAtEnd('GRANT SELECT ON orders TO alice WITH GRANT ').expectation).toBe(
      'grantOptionWord',
    )
    expect(caretAtEnd('GRANT SELECT ON orders TO alice WITH ADMIN ').expectation).toBe(
      'grantOptionWord',
    )
    expect(caretAtEnd('GRANT SELECT ON orders TO alice WITH GRANT OPTION ').expectation).toBe(
      'number',
    )
  })

  it('lists databases for DROP DATABASE and DROP SCHEMA', () => {
    expect(caretAtEnd('DROP DATABASE ').expectation).toBe('database')
    expect(caretAtEnd('DROP SCHEMA ').expectation).toBe('database')
  })

  it('offers the lock clause after FOR', () => {
    expect(caretAtEnd('SELECT * FROM orders FOR ').expectation).toBe('lock')
  })
})

describe('analyze CREATE names and ALTER column tails', () => {
  it('quietly names a new table or view', () => {
    expect(caretAtEnd('CREATE TABLE ').expectation).toBe('name')
    expect(caretAtEnd('CREATE TEMPORARY TABLE ').expectation).toBe('name')
    expect(caretAtEnd('CREATE TABLE IF NOT EXISTS ').expectation).toBe('name')
    expect(caretAtEnd('CREATE VIEW ').expectation).toBe('name')
    expect(caretAtEnd('CREATE OR REPLACE VIEW ').expectation).toBe('name')
  })

  it('moves to table options once a new table is named', () => {
    expect(caretAtEnd('CREATE TABLE orders ').expectation).toBe('tableOptions')
    expect(caretAtEnd('CREATE TABLE IF NOT EXISTS orders ').expectation).toBe('tableOptions')
  })

  it('names a procedure only the user knows', () => {
    expect(caretAtEnd('CALL ').expectation).toBe('name')
    expect(caretAtEnd('CALL my_proc(').expectation).toBe('number')
  })

  it('treats DROP VIEW and bare TRUNCATE like DROP TABLE', () => {
    expect(caretAtEnd('DROP VIEW ').expectation).toBe('tableName')
    expect(caretAtEnd('TRUNCATE ').expectation).toBe('relation')
    expect(caretAtEnd('TRUNCATE TABLE ').expectation).toBe('tableName')
  })

  it('follows ALTER TABLE column renames and changes', () => {
    expect(caretAtEnd('ALTER TABLE orders RENAME COLUMN id TO ').expectation).toBe('name')
    expect(caretAtEnd('ALTER TABLE orders ADD CONSTRAINT ').expectation).toBe('name')
    expect(caretAtEnd('ALTER TABLE orders CHANGE COLUMN id new_id ').expectation).toBe('columnType')
    expect(caretAtEnd('ALTER TABLE orders MODIFY COLUMN id ').expectation).toBe('columnType')
    expect(caretAtEnd('ALTER TABLE orders MODIFY COLUMN id INT NOT ').expectation).toBe('definition')
    expect(caretAtEnd('ALTER TABLE orders DROP PRIMARY KEY, ').expectation).toBe('alter')
  })
})

describe('analyze database names and index collations', () => {
  it('offers existing databases where a database name belongs', () => {
    expect(caretAtEnd('USE ').expectation).toBe('database')
    expect(caretAtEnd('DROP DATABASE ').expectation).toBe('database')
    expect(caretAtEnd('SHOW CREATE DATABASE ').expectation).toBe('database')
    expect(caretAtEnd('SHOW TABLES FROM ').expectation).toBe('database')
  })

  it('offers collations inside index and column definitions', () => {
    expect(caretAtEnd('CREATE INDEX idx ON orders (name COLLATE ').expectation).toBe('collation')
    expect(caretAtEnd('CREATE TABLE t (name COLLATE ').expectation).toBe('collation')
  })
})

describe('analyze window specifications and intervals', () => {
  it('offers columns inside PARTITION BY and ORDER BY', () => {
    expect(caretAtEnd('SELECT ROW_NUMBER() OVER (ORDER BY ').expectation).toBe('column')
    expect(caretAtEnd('SELECT ROW_NUMBER() OVER (PARTITION BY status, ').expectation).toBe('column')
  })

  it('offers directions after a window sort key', () => {
    expect(caretAtEnd('SELECT ROW_NUMBER() OVER (ORDER BY id ').expectation).toBe('direction')
  })

  it('offers frame bounds inside ROWS and RANGE', () => {
    expect(caretAtEnd('SELECT SUM(total) OVER (ROWS ').expectation).toBe('frame')
    expect(caretAtEnd('SELECT SUM(total) OVER (ROWS BETWEEN ').expectation).toBe('frame')
    expect(caretAtEnd('SELECT SUM(total) OVER (RANGE BETWEEN 1 PRECEDING AND ').expectation).toBe('frame')
    expect(
      caretAtEnd('SELECT SUM(total) OVER (ROWS BETWEEN 1 PRECEDING AND CURRENT ROW ').expectation,
    ).toBe('number')
  })

  it('treats WINDOW ... AS ( as a window spec, not a subquery', () => {
    expect(caretAtEnd('SELECT SUM(total) OVER w FROM orders WINDOW w AS (').expectation).toBe('over')
  })

  it('offers interval units', () => {
    expect(caretAtEnd('SELECT CURRENT_DATE + INTERVAL ').expectation).toBe('interval')
    expect(caretAtEnd('SELECT DATE_ADD(created_at, INTERVAL 1 ').expectation).toBe('interval')
    expect(caretAtEnd('SELECT DATE_ADD(created_at, INTERVAL 1 DAY ').expectation).toBe('number')
  })

  it('names the object after SHOW FULL COLUMNS / INDEX', () => {
    expect(caretAtEnd('SHOW FULL COLUMNS FROM orders ').expectation).toBe('name')
    expect(caretAtEnd('SHOW FULL INDEX FROM orders ').expectation).toBe('name')
  })
})

describe('analyze VALUES tuples, index tails and window names', () => {
  it('stays quiet after a closed VALUES tuple and comma', () => {
    expect(caretAtEnd('INSERT INTO orders VALUES (1, 2), ').expectation).toBe('number')
    expect(caretAtEnd('INSERT INTO orders VALUES (1, 2) ').expectation).toBe('insertTail')
  })

  it('offers index methods after USING', () => {
    expect(caretAtEnd('CREATE INDEX idx ON orders (id) USING ').expectation).toBe('indexMethod')
  })

  it('finishes ADD/DROP INDEX specifications quietly', () => {
    expect(caretAtEnd('ALTER TABLE orders ADD INDEX idx (id) ').expectation).toBe('number')
    expect(caretAtEnd('ALTER TABLE orders DROP INDEX idx ').expectation).toBe('number')
    expect(caretAtEnd('ALTER TABLE orders ADD INDEX ').expectation).toBe('name')
  })

  it('treats named windows as finished windows', () => {
    expect(caretAtEnd('SELECT SUM(total) OVER w ').expectation).toBe('expressionTail')
    expect(
      caretAtEnd(
        'SELECT SUM(total) OVER w FROM orders WINDOW w AS (PARTITION BY status ORDER BY id) ',
      ).expectation,
    ).toBe('expressionTail')
  })

  it('stays quiet after a SHOW LIKE pattern', () => {
    expect(caretAtEnd('SHOW VARIABLES LIKE ').expectation).toBe('name')
    expect(caretAtEnd("SHOW VARIABLES LIKE 'max%' ").expectation).toBe('number')
  })
})

describe('analyze relation name and literal tails', () => {
  it('names an existing table without clause keywords', () => {
    for (const statement of [
      'ANALYZE TABLE ',
      'OPTIMIZE TABLE ',
      'CHECK TABLE ',
      'REPAIR TABLE ',
      'TRUNCATE TABLE ',
      'DROP TABLE ',
      'DROP VIEW ',
      'RENAME TABLE ',
      'LOCK TABLES ',
      'SHOW CREATE TABLE ',
      'SHOW CREATE VIEW ',
    ]) {
      expect(caretAtEnd(statement).expectation).toBe('tableName')
    }
    expect(caretAtEnd('DROP TABLE orders, ').expectation).toBe('tableName')
    expect(caretAtEnd('DROP TABLE orders ').expectation).toBe('number')
  })

  it('quiets positions that take only user text', () => {
    expect(caretAtEnd('SELECT * FROM orders INTO OUTFILE ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders INTO DUMPFILE ').expectation).toBe('number')
    expect(caretAtEnd('PREPARE stmt FROM ').expectation).toBe('number')
    expect(caretAtEnd('UNLOCK TABLES ').expectation).toBe('number')
  })

  it('quietly continues after WITH ROLLUP', () => {
    expect(caretAtEnd('SELECT * FROM orders GROUP BY status WITH ROLLUP ').expectation).toBe(
      'rollupTail',
    )
    expect(caretAtEnd('SELECT * FROM orders GROUP BY status ').expectation).toBe('groupTail')
    expect(caretAtEnd('SELECT * FROM orders GROUP BY status WITH ROLLUP HAVING ').expectation).toBe(
      'column',
    )
  })
})

describe('analyze alter options, lock tables and insert updates', () => {
  it('names the engine after ALTER TABLE ... ENGINE =', () => {
    expect(caretAtEnd('ALTER TABLE orders ENGINE = ').expectation).toBe('engine')
    expect(caretAtEnd('ALTER TABLE orders ENGINE = InnoDB ').expectation).toBe('tableOptions')
  })

  it('assigns a value in ON DUPLICATE KEY UPDATE', () => {
    expect(
      caretAtEnd('INSERT INTO orders VALUES (1) ON DUPLICATE KEY UPDATE total = ').expectation,
    ).toBe('value')
  })

  it('names the new index in RENAME INDEX', () => {
    expect(caretAtEnd('ALTER TABLE orders RENAME INDEX idx TO ').expectation).toBe('name')
    expect(caretAtEnd('ALTER TABLE orders RENAME KEY idx TO ').expectation).toBe('name')
  })

  it('takes access modes in LOCK TABLES', () => {
    expect(caretAtEnd('LOCK TABLES orders ').expectation).toBe('lockTable')
    expect(caretAtEnd('LOCK TABLES orders READ, ').expectation).toBe('tableName')
  })

  it('reads CREATE TABLE option assignments', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT) DEFAULT CHARSET = ').expectation).toBe('charset')
    expect(caretAtEnd('CREATE TABLE t (id INT) AUTO_INCREMENT = ').expectation).toBe('number')
    expect(caretAtEnd('CREATE TABLE t (id INT) ROW_FORMAT = ').expectation).toBe('rowFormat')
    expect(caretAtEnd('CREATE TABLE t (id INT) PARTITION BY ').expectation).toBe('partition')
  })
})

describe('analyze transaction, nulls and multi-table delete tails', () => {
  it('follows START TRANSACTION access modes', () => {
    expect(caretAtEnd('START TRANSACTION ').expectation).toBe('transaction')
    expect(caretAtEnd('START TRANSACTION READ ').expectation).toBe('transactionRead')
    expect(caretAtEnd('START TRANSACTION WITH ').expectation).toBe('transactionWith')
    expect(caretAtEnd('START TRANSACTION READ ONLY ').expectation).toBe('number')
  })

  it('keeps transaction control words out of the catalog', () => {
    expect(caretAtEnd('BEGIN ').expectation).toBe('number')
    expect(caretAtEnd('COMMIT ').expectation).toBe('number')
    expect(caretAtEnd('ROLLBACK ').expectation).toBe('number')
    expect(caretAtEnd('ROLLBACK TO ').expectation).toBe('rollbackTo')
    expect(caretAtEnd('ROLLBACK TO SAVEPOINT ').expectation).toBe('name')
    expect(caretAtEnd('SAVEPOINT sp1 ').expectation).toBe('number')
    expect(caretAtEnd('RELEASE SAVEPOINT ').expectation).toBe('name')
  })

  it('names an isolation level', () => {
    expect(caretAtEnd('SET TRANSACTION ISOLATION LEVEL ').expectation).toBe('isolation')
  })

  it('takes FIRST or LAST after NULLS', () => {
    expect(caretAtEnd('SELECT * FROM orders ORDER BY id NULLS ').expectation).toBe('nulls')
    expect(caretAtEnd('SELECT * FROM orders ORDER BY id NULLS FIRST ').expectation).toBe('number')
  })

  it('names the extra tables of a multi-table DELETE', () => {
    expect(caretAtEnd('DELETE FROM orders USING ').expectation).toBe('tableName')
    expect(caretAtEnd('DELETE FROM orders USING orders, ').expectation).toBe('tableName')
    expect(caretAtEnd('DELETE FROM orders USING orders ').expectation).toBe('number')
  })

  it('takes ALTER COLUMN SET options', () => {
    expect(caretAtEnd('ALTER TABLE orders ALTER COLUMN id SET ').expectation).toBe('alterColumnSet')
    expect(caretAtEnd('ALTER TABLE orders ALTER COLUMN id SET DEFAULT ').expectation).toBe('value')
    expect(caretAtEnd('ALTER TABLE orders ALTER COLUMN id DROP DEFAULT ').expectation).toBe(
      'number',
    )
  })

  it('takes a condition after SHOW ... WHERE', () => {
    expect(caretAtEnd('SHOW STATUS WHERE ').expectation).toBe('comparison')
    expect(caretAtEnd('SHOW VARIABLES WHERE ').expectation).toBe('comparison')
  })

  it('finishes FOR UPDATE options quietly', () => {
    expect(caretAtEnd('SELECT * FROM orders FOR UPDATE NOWAIT ').expectation).toBe('number')
  })
})

describe('analyze SET TRANSACTION tails', () => {
  it('offers ISOLATION or READ after SET TRANSACTION', () => {
    expect(caretAtEnd('SET TRANSACTION ').expectation).toBe('setTransaction')
    expect(caretAtEnd('SET TRANSACTION READ ').expectation).toBe('transactionRead')
    expect(caretAtEnd('SET TRANSACTION ISOLATION ').expectation).toBe('isolationLevel')
    expect(caretAtEnd('SET TRANSACTION ISOLATION LEVEL ').expectation).toBe('isolation')
  })
})

describe('analyze isolation level values', () => {
  it('takes COMMITTED or UNCOMMITTED after READ', () => {
    expect(caretAtEnd('SET TRANSACTION ISOLATION LEVEL READ ').expectation).toBe('isolationRead')
    expect(caretAtEnd('SET TRANSACTION ISOLATION LEVEL REPEATABLE ').expectation).toBe('number')
  })
})

describe('analyze insert targets, column types and expression tails', () => {
  it('hides the INSERT target from the select list', () => {
    expect(analyze('INSERT INTO orders SELECT ', 26).relations).toEqual([])
    expect(analyze('INSERT INTO orders SELECT * FROM customers WHERE ', 48).relations).toEqual([
      { table: 'customers' },
    ])
    expect(analyze('INSERT INTO orders VALUES (', 28).relations).toEqual([{ table: 'orders' }])
  })

  it('names the stage of a column definition', () => {
    expect(analyze('CREATE TABLE t (', 16).expectation).toBe('name')
    expect(analyze('CREATE TABLE t (id ', 19).expectation).toBe('columnType')
    expect(analyze('CREATE TABLE t (id INT, ', 23).expectation).toBe('name')
    expect(analyze('CREATE TABLE t (id INT NOT NULL ', 29).expectation).toBe('definition')
  })

  it('takes a column type after ALTER column names', () => {
    const add = 'ALTER TABLE orders ADD COLUMN amount '
    const modify = 'ALTER TABLE orders MODIFY total '
    const change = 'ALTER TABLE orders CHANGE COLUMN total amount '
    expect(analyze(add, add.length).expectation).toBe('columnType')
    expect(analyze(modify, modify.length).expectation).toBe('columnType')
    expect(analyze(change, change.length).expectation).toBe('columnType')
  })

  it('finishes scalar expressions in a select list', () => {
    expect(analyze('SELECT 1 ', 9).expectation).toBe('expressionTail')
    expect(analyze('SELECT total + 1 ', 17).expectation).toBe('expressionTail')
    expect(analyze('SELECT * FROM orders WHERE id = 1 ', 37).expectation).toBe('boolean')
    expect(analyze('SELECT * FROM orders ORDER BY 1 ', 35).expectation).toBe('direction')
  })

  it('classifies closed subqueries by the clause they finish', () => {
    expect(analyze('SELECT (SELECT MAX(total) FROM orders) ', 40).expectation).toBe(
      'expressionTail',
    )
    expect(analyze('SELECT * FROM orders WHERE id IN (SELECT id FROM customers) ', 63).expectation).toBe(
      'boolean',
    )
  })
})

describe('analyze trigger and routine tails', () => {
  it('walks through a CREATE TRIGGER definition', () => {
    expect(analyze('CREATE TRIGGER ', 15).expectation).toBe('name')
    expect(analyze('CREATE TRIGGER trg ', 19).expectation).toBe('triggerTiming')
    expect(analyze('CREATE TRIGGER trg BEFORE ', 26).expectation).toBe('triggerEvent')
    expect(analyze('CREATE TRIGGER trg BEFORE INSERT ', 33).expectation).toBe('triggerOn')
    expect(analyze('CREATE TRIGGER trg BEFORE INSERT ON ', 36).expectation).toBe('tableName')
    expect(analyze('CREATE TRIGGER trg BEFORE INSERT ON orders ', 43).expectation).toBe(
      'triggerFor',
    )
    expect(analyze('CREATE TRIGGER trg BEFORE INSERT ON orders FOR ', 47).expectation).toBe(
      'triggerEach',
    )
    expect(analyze('CREATE TRIGGER trg BEFORE INSERT ON orders FOR EACH ', 52).expectation).toBe(
      'triggerRow',
    )
    expect(analyze('CREATE TRIGGER trg BEFORE INSERT ON orders FOR EACH ROW ', 56).expectation).toBe(
      'statement',
    )
    expect(
      analyze('CREATE TRIGGER trg BEFORE INSERT ON orders FOR EACH ROW BEGIN ', 62).expectation,
    ).toBe('statement')
  })

  it('names routine declarations and return types', () => {
    expect(analyze('CREATE FUNCTION f() RETURNS ', 28).expectation).toBe('columnType')
    expect(analyze('DECLARE ', 8).expectation).toBe('name')
    expect(analyze('DECLARE x ', 10).expectation).toBe('columnType')
    expect(analyze('DECLARE x INT ', 14).expectation).toBe('number')
  })

  it('expects a table after SHOW COLUMNS and SHOW INDEX', () => {
    expect(analyze('SHOW COLUMNS FROM ', 18).expectation).toBe('tableName')
    expect(analyze('SHOW INDEX FROM ', 16).expectation).toBe('tableName')
    expect(analyze('SHOW COLUMNS FROM orders ', 25).expectation).toBe('name')
  })
})

describe('analyze routine, view and event definitions', () => {
  it('walks a procedure definition', () => {
    expect(caretAtEnd('CREATE PROCEDURE ').expectation).toBe('name')
    expect(caretAtEnd('CREATE PROCEDURE p ').expectation).toBe('number')
    expect(caretAtEnd('CREATE PROCEDURE p (').expectation).toBe('name')
    expect(caretAtEnd('CREATE PROCEDURE p (IN ').expectation).toBe('name')
    expect(caretAtEnd('CREATE PROCEDURE p (IN x ').expectation).toBe('columnType')
    expect(caretAtEnd('CREATE PROCEDURE p (IN x INT ').expectation).toBe('number')
    expect(caretAtEnd('CREATE PROCEDURE p (IN x INT, ').expectation).toBe('name')
    expect(caretAtEnd('CREATE PROCEDURE p() ').expectation).toBe('statement')
    expect(caretAtEnd('CREATE PROCEDURE p() BEGIN ').expectation).toBe('statement')
  })

  it('offers RETURNS after a function parameter list', () => {
    expect(caretAtEnd('CREATE FUNCTION f(').expectation).toBe('name')
    expect(caretAtEnd('CREATE FUNCTION f() ').expectation).toBe('routineReturn')
    expect(caretAtEnd('CREATE FUNCTION f() RETURNS ').expectation).toBe('columnType')
    expect(caretAtEnd('CREATE FUNCTION f() RETURNS INT ').expectation).toBe('number')
  })

  it('walks a view definition', () => {
    expect(caretAtEnd('CREATE VIEW ').expectation).toBe('name')
    expect(caretAtEnd('CREATE VIEW v ').expectation).toBe('viewTail')
    expect(caretAtEnd('CREATE VIEW v (').expectation).toBe('name')
    expect(caretAtEnd('CREATE VIEW v (a, ').expectation).toBe('name')
    expect(caretAtEnd('CREATE VIEW v (a) ').expectation).toBe('viewTail')
    expect(caretAtEnd('CREATE VIEW v AS ').expectation).toBe('statement')
  })

  it('walks the CREATE EVENT schedule', () => {
    expect(caretAtEnd('CREATE EVENT ').expectation).toBe('name')
    expect(caretAtEnd('CREATE EVENT e ').expectation).toBe('eventOn')
    expect(caretAtEnd('CREATE EVENT e ON ').expectation).toBe('eventSchedule')
    expect(caretAtEnd('CREATE EVENT e ON SCHEDULE ').expectation).toBe('eventTiming')
    expect(caretAtEnd('CREATE EVENT e ON SCHEDULE AT ').expectation).toBe('number')
    expect(caretAtEnd('CREATE EVENT e ON SCHEDULE EVERY ').expectation).toBe('number')
    expect(caretAtEnd('CREATE EVENT e ON SCHEDULE EVERY 1 ').expectation).toBe('interval')
    expect(caretAtEnd('CREATE EVENT e ON SCHEDULE EVERY 1 DAY ').expectation).toBe('eventTail')
    expect(caretAtEnd('CREATE EVENT e ON SCHEDULE EVERY 1 DAY STARTS ').expectation).toBe(
      'number',
    )
    expect(caretAtEnd('CREATE EVENT e ON SCHEDULE EVERY 1 DAY DO ').expectation).toBe(
      'statement',
    )
  })

  it('names the routine in SHOW CREATE', () => {
    expect(caretAtEnd('SHOW CREATE PROCEDURE ').expectation).toBe('name')
    expect(caretAtEnd('SHOW CREATE FUNCTION ').expectation).toBe('name')
    expect(caretAtEnd('SHOW CREATE EVENT ').expectation).toBe('name')
    expect(caretAtEnd('SHOW CREATE TRIGGER ').expectation).toBe('name')
  })
})

describe('analyze function and INTO tails', () => {
  it('reads FROM inside a function argument as an expression', () => {
    expect(caretAtEnd("SELECT TRIM(BOTH ' ' FROM ").expectation).toBe('column')
    expect(caretAtEnd('SELECT * FROM ').expectation).toBe('relation')
  })

  it('names the INTO target', () => {
    expect(caretAtEnd('SELECT * FROM orders INTO ').expectation).toBe('intoTarget')
    expect(caretAtEnd('SELECT * FROM orders INTO OUTFILE ').expectation).toBe('number')
  })

  it('offers the INSERT source after the target table', () => {
    expect(caretAtEnd('INSERT INTO orders ').expectation).toBe('insertSource')
    expect(
      caretAtEnd('WITH recent AS (SELECT * FROM orders) INSERT INTO order_items ').expectation,
    ).toBe('insertSource')
  })

  it('names the existing column after AFTER and finishes FIRST quietly', () => {
    expect(caretAtEnd('ALTER TABLE orders ADD COLUMN x INT AFTER ').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders ADD COLUMN x INT FIRST ').expectation).toBe('number')
  })

  it('offers charset names inside a column definition', () => {
    expect(caretAtEnd('CREATE PROCEDURE p(IN x VARCHAR(10) CHARACTER SET ').expectation).toBe(
      'charset',
    )
    expect(caretAtEnd('CREATE TABLE t (name VARCHAR(10) CHARACTER SET ').expectation).toBe(
      'charset',
    )
  })

  it('cleans the GRANT target and resumes after DO', () => {
    expect(caretAtEnd('GRANT ALL PRIVILEGES ON ').expectation).toBe('tableName')
    expect(
      caretAtEnd('CREATE EVENT e ON SCHEDULE EVERY 1 DAY DO INSERT INTO ').expectation,
    ).toBe('relation')
  })
})

describe('analyze USE, constraints and routine tails', () => {
  it('goes quiet after a USE database name', () => {
    expect(caretAtEnd('USE shop ').expectation).toBe('number')
    expect(caretAtEnd('USE ').expectation).toBe('database')
  })

  it('offers constraint kinds after ADD CONSTRAINT name', () => {
    expect(caretAtEnd('ALTER TABLE orders ADD CONSTRAINT fk ').expectation).toBe('constraintType')
    expect(caretAtEnd('ALTER TABLE orders ADD CONSTRAINT ').expectation).toBe('name')
  })

  it('stays quiet for inline constraint column lists', () => {
    expect(caretAtEnd('CREATE TABLE t (a INT, PRIMARY KEY (').expectation).toBe('number')
    expect(caretAtEnd('CREATE TABLE t (a INT, FOREIGN KEY (').expectation).toBe('number')
    expect(
      caretAtEnd('CREATE TABLE t (a INT, FOREIGN KEY (a) REFERENCES ').expectation,
    ).toBe('tableName')
  })

  it('takes an expression after RETURN', () => {
    expect(caretAtEnd('RETURN ').expectation).toBe('column')
    expect(caretAtEnd('CREATE FUNCTION f() RETURNS INT RETURN ').expectation).toBe('column')
  })

  it('takes a value after DECLARE ... DEFAULT', () => {
    expect(caretAtEnd('DECLARE x INT DEFAULT ').expectation).toBe('value')
  })

  it('parses the rest of a multi-table DELETE', () => {
    expect(caretAtEnd('DELETE FROM orders USING orders JOIN ').expectation).toBe('relation')
    expect(caretAtEnd('DELETE FROM orders USING ').expectation).toBe('tableName')
  })

  it('recognises an aggregate at the end of GROUP BY', () => {
    expect(caretAtEnd('SELECT * FROM orders GROUP BY COUNT(*) ').expectation).toBe('groupTail')
    expect(caretAtEnd('SELECT * FROM orders GROUP BY id + 1 ').expectation).toBe('groupTail')
  })
})

describe('analyze hints, locks and load/partition tails', () => {
  it('stays quiet inside index hints', () => {
    expect(caretAtEnd('SELECT * FROM orders FORCE INDEX (').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders USE INDEX (').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders IGNORE INDEX (').expectation).toBe('number')
  })

  it('follows FOR UPDATE/SHARE tails', () => {
    expect(caretAtEnd('SELECT * FROM orders FOR UPDATE ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders FOR SHARE ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders FOR UPDATE OF ').expectation).toBe('tableName')
    expect(caretAtEnd('SELECT * FROM orders FOR SHARE OF ').expectation).toBe('tableName')
  })

  it('takes numbers in FETCH and OFFSET tails', () => {
    expect(caretAtEnd('SELECT * FROM orders FETCH FIRST ').expectation).toBe('number')
    expect(caretAtEnd('SELECT * FROM orders OFFSET 10 ROWS ').expectation).toBe('number')
  })

  it('continues with a statement after INTERSECT/EXCEPT', () => {
    expect(caretAtEnd('SELECT id FROM orders INTERSECT ').expectation).toBe('statement')
    expect(caretAtEnd('SELECT id FROM orders EXCEPT ').expectation).toBe('statement')
    expect(caretAtEnd('SELECT id FROM orders INTERSECT ALL ').expectation).toBe('statement')
  })

  it('names the LOAD DATA table then stays quiet', () => {
    expect(caretAtEnd("LOAD DATA INFILE 'x' INTO TABLE ").expectation).toBe('tableName')
    expect(caretAtEnd("LOAD DATA INFILE 'x' INTO TABLE orders ").expectation).toBe('number')
  })

  it('distinguishes partition definitions from method lists', () => {
    expect(caretAtEnd('ALTER TABLE orders ADD PARTITION (').expectation).toBe('number')
    expect(caretAtEnd('CREATE TABLE t (id INT) PARTITION BY RANGE (').expectation).toBe('column')
  })

  it('keeps a quoted table name after IF EXISTS', () => {
    expect(caretAtEnd('DROP TABLE IF EXISTS `').expectation).toBe('tableName')
  })
})


describe('analyze column options and admin tails', () => {
  it('takes a literal after a column DEFAULT', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT NOT NULL DEFAULT ').expectation).toBe('value')
  })

  it('takes a comment name and finishes AUTO_INCREMENT', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT COMMENT ').expectation).toBe('name')
    expect(caretAtEnd('CREATE TABLE t (id INT AUTO_INCREMENT ').expectation).toBe('number')
  })

  it('stays quiet for triggers and users', () => {
    expect(caretAtEnd('DROP TRIGGER trg ').expectation).toBe('name')
    expect(caretAtEnd("DROP USER 'u'@'h' ").expectation).toBe('name')
    expect(caretAtEnd('ALTER USER ').expectation).toBe('name')
    expect(caretAtEnd("ALTER USER 'u'@'h' IDENTIFIED BY ").expectation).toBe('number')
  })

  it('stays quiet for EXECUTE and DEALLOCATE', () => {
    expect(caretAtEnd('EXECUTE stmt USING @x ').expectation).toBe('number')
    expect(caretAtEnd('DEALLOCATE PREPARE stmt ').expectation).toBe('number')
  })

  it('reads GRANT role TO as a grantee', () => {
    expect(caretAtEnd('GRANT role1 TO ').expectation).toBe('name')
  })

  it('continues UPDATE with SET', () => {
    expect(caretAtEnd('UPDATE orders ').expectation).toBe('assignment')
    expect(caretAtEnd('UPDATE orders o ').expectation).toBe('assignment')
  })

  it('reads a user variable as a finished select item', () => {
    expect(caretAtEnd('SELECT @x ').expectation).toBe('expressionTail')
  })
})


describe('analyze routine statements, JSON and admin tails', () => {
  it('stays quiet for routine labels and cursors', () => {
    expect(caretAtEnd('CREATE PROCEDURE p() BEGIN LEAVE ').expectation).toBe('name')
    expect(caretAtEnd('CREATE PROCEDURE p() BEGIN OPEN ').expectation).toBe('name')
    expect(caretAtEnd('CREATE PROCEDURE p() BEGIN FETCH ').expectation).toBe('number')
  })

  it('stays quiet around SIGNAL and diagnostics', () => {
    expect(
      caretAtEnd("CREATE PROCEDURE p() BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = ").expectation,
    ).toBe('number')
    expect(caretAtEnd('CREATE PROCEDURE p() BEGIN GET DIAGNOSTICS ').expectation).toBe('number')
  })

  it('keeps a routine body statement suggestion', () => {
    expect(caretAtEnd('CREATE PROCEDURE p() BEGIN IF x > 0 THEN ').expectation).toBe('statement')
  })

  it('expects a quoted path after JSON arrows', () => {
    expect(caretAtEnd('SELECT data->').expectation).toBe('number')
    expect(caretAtEnd('SELECT data->>').expectation).toBe('number')
    expect(caretAtEnd("SELECT data->'$.a' ").expectation).toBe('expressionTail')
  })

  it('takes expressions inside CHECK and generated columns', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT, CHECK (').expectation).toBe('column')
    expect(caretAtEnd('CREATE TABLE t (id INT, CONSTRAINT c CHECK (').expectation).toBe('column')
    expect(caretAtEnd('CREATE TABLE t (id INT GENERATED ALWAYS AS (').expectation).toBe('column')
  })

  it('handles admin statements', () => {
    expect(caretAtEnd('KILL ').expectation).toBe('number')
    expect(caretAtEnd('FLUSH ').expectation).toBe('flush')
    expect(caretAtEnd('FLUSH TABLES ').expectation).toBe('tableName')
    expect(caretAtEnd('RESET ').expectation).toBe('reset')
    expect(caretAtEnd('DO ').expectation).toBe('column')
    expect(caretAtEnd('HELP ').expectation).toBe('name')
  })
})


describe('analyze alter constraints, options and partition lists', () => {
  it('names constraints dropped from a table', () => {
    expect(caretAtEnd('ALTER TABLE orders DROP FOREIGN KEY ').expectation).toBe('name')
    expect(caretAtEnd('ALTER TABLE orders DROP CONSTRAINT ').expectation).toBe('name')
    expect(caretAtEnd('ALTER TABLE orders DROP CHECK ').expectation).toBe('name')
  })

  it('offers ALTER algorithm and lock options', () => {
    expect(caretAtEnd('ALTER TABLE orders ALGORITHM=').expectation).toBe('algorithm')
    expect(caretAtEnd('ALTER TABLE orders LOCK=').expectation).toBe('lockOption')
  })

  it('takes a separator literal', () => {
    expect(caretAtEnd('SELECT GROUP_CONCAT(name SEPARATOR ').expectation).toBe('number')
  })

  it('takes a charset after CONVERT USING', () => {
    expect(caretAtEnd('SELECT CONVERT(id USING ').expectation).toBe('charset')
  })

  it('stays quiet while typing the INTO variable list', () => {
    expect(caretAtEnd('SELECT id INTO @x, ').expectation).toBe('number')
  })

  it('stays quiet on the deprecated PROCEDURE tail', () => {
    expect(caretAtEnd('SELECT * FROM orders PROCEDURE ').expectation).toBe('number')
  })

  it('takes columns in partition method lists', () => {
    expect(caretAtEnd('CREATE TABLE t (id INT) PARTITION BY LIST (').expectation).toBe('column')
    expect(caretAtEnd('CREATE TABLE t (id INT) PARTITION BY RANGE (').expectation).toBe('column')
    expect(
      caretAtEnd('CREATE TABLE t (id INT) PARTITION BY RANGE (id) (PARTITION p0 VALUES LESS THAN (').expectation,
    ).toBe('number')
  })
})


describe('analyze function lengths and statement tails', () => {
  it('takes a length inside SUBSTRING ... FOR', () => {
    expect(caretAtEnd('SELECT SUBSTRING(name FROM 1 FOR ').expectation).toBe('number')
  })

  it('still recognises a row lock at the end of a statement', () => {
    expect(caretAtEnd('SELECT * FROM orders FOR ').expectation).toBe('lock')
    expect(caretAtEnd('SELECT * FROM orders FOR UPDATE ').expectation).toBe('number')
  })

  it('takes a length after a type name', () => {
    expect(caretAtEnd('SELECT CAST(id AS CHAR(').expectation).toBe('number')
    expect(caretAtEnd('CREATE TABLE t (name VARCHAR(').expectation).toBe('number')
  })

  it('lets the explained statement decide its own context', () => {
    expect(caretAtEnd('EXPLAIN FORMAT=TREE ').expectation).toBe('statement')
    expect(caretAtEnd('EXPLAIN FORMAT=TREE SELECT ').expectation).toBe('column')
  })

  it('names the object of DROP TEMPORARY TABLE', () => {
    expect(caretAtEnd('DROP TEMPORARY TABLE ').expectation).toBe('tableName')
    expect(caretAtEnd('DROP TEMPORARY TABLE orders ').expectation).toBe('number')
  })

  it('takes column options in ALTER TABLE', () => {
    expect(caretAtEnd('ALTER TABLE orders MODIFY COLUMN total INT DEFAULT ').expectation).toBe('value')
    expect(caretAtEnd('ALTER TABLE orders MODIFY COLUMN total INT COMMENT ').expectation).toBe('name')
  })
})


describe('analyze JSON_TABLE columns and multi-table UPDATE', () => {
  it('stages the JSON_TABLE column definitions', () => {
    expect(caretAtEnd("SELECT * FROM JSON_TABLE(data, '$' COLUMNS (").expectation).toBe('name')
    expect(caretAtEnd("SELECT * FROM JSON_TABLE(data, '$' COLUMNS (id ").expectation).toBe('columnType')
    expect(caretAtEnd("SELECT * FROM JSON_TABLE(data, '$' COLUMNS (id, ").expectation).toBe('name')
    expect(caretAtEnd("SELECT * FROM JSON_TABLE(data, '$' COLUMNS (id INT ").expectation).toBe('number')
    expect(caretAtEnd("SELECT * FROM JSON_TABLE(data, '$' COLUMNS (id INT) ").expectation).toBe('number')
  })

  it('stays quiet after a dropped column name', () => {
    expect(caretAtEnd('ALTER TABLE orders DROP COLUMN ').expectation).toBe('column')
    expect(caretAtEnd('ALTER TABLE orders DROP COLUMN total ').expectation).toBe('number')
    expect(caretAtEnd('ALTER TABLE orders DROP COLUMN total, ').expectation).toBe('number')
  })

  it('collects both tables of a comma UPDATE', () => {
    const analysis = caretAtEnd('UPDATE orders o, customers c SET ')
    expect(analysis.expectation).toBe('column')
    expect(analysis.relations.map((relation) => relation.alias)).toEqual(['o', 'c'])
  })
})

describe('analyze WITH ROLLUP, database, user and foreign-key tails', () => {
  it('offers ROLLUP after GROUP BY ... WITH', () => {
    expect(caretAtEnd('SELECT status FROM orders GROUP BY status WITH ').expectation).toBe(
      'withRollup',
    )
  })

  it('offers ALTER DATABASE options and stays quiet after a value', () => {
    expect(caretAtEnd('ALTER DATABASE shop ').expectation).toBe('alterDatabase')
    expect(caretAtEnd('ALTER DATABASE shop CHARACTER SET ').expectation).toBe('charset')
    expect(caretAtEnd('ALTER DATABASE shop CHARACTER SET utf8mb4 ').expectation).toBe('number')
    expect(caretAtEnd('ALTER DATABASE shop COLLATE ').expectation).toBe('collation')
    expect(caretAtEnd('ALTER DATABASE shop COLLATE utf8mb4_bin ').expectation).toBe('number')
  })

  it('stays quiet around RENAME USER accounts', () => {
    expect(caretAtEnd('RENAME USER ').expectation).toBe('name')
    expect(caretAtEnd("RENAME USER 'a'@'h' TO ").expectation).toBe('name')
    expect(caretAtEnd("RENAME USER 'a'@'h' TO 'b'@'h' ").expectation).toBe('number')
  })

  it('offers referenced columns after a foreign key REFERENCES', () => {
    const analysis = caretAtEnd('CREATE TABLE t (id INT, FOREIGN KEY (user_id) REFERENCES orders (')
    expect(analysis.expectation).toBe('column')
    expect(analysis.relations.map((relation) => relation.table)).toContain('orders')
    expect(
      caretAtEnd('CREATE TABLE t (id INT, FOREIGN KEY (user_id) REFERENCES orders (id) ')
        .expectation,
    ).toBe('number')
  })

  it('stays quiet after an OUTFILE clause keyword', () => {
    expect(
      caretAtEnd("SELECT * FROM orders INTO OUTFILE 'x' FIELDS TERMINATED BY ").expectation,
    ).toBe('number')
  })
})

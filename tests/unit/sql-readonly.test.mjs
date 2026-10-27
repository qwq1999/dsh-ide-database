import { describe, expect, it } from 'vitest'
import { isReadOnlySql } from '../../lib/host/sql.js'

/**
 * The read-only guard has to be conservative: a false "yes" silently lets a
 * read-only connection mutate data, a false "no" only annoys the user.
 */
describe('isReadOnlySql', () => {
  it('accepts plain reads', () => {
    expect(isReadOnlySql('SELECT 1')).toBe(true)
    expect(isReadOnlySql('select * from `shop`.`orders` where id > 10')).toBe(true)
    expect(isReadOnlySql('  SHOW TABLES  ')).toBe(true)
    expect(isReadOnlySql('DESCRIBE orders')).toBe(true)
    expect(isReadOnlySql('desc orders')).toBe(true)
    expect(isReadOnlySql('VALUES ROW(1, 2)')).toBe(true)
    expect(isReadOnlySql('EXPLAIN SELECT * FROM orders')).toBe(true)
    expect(isReadOnlySql('select 1;')).toBe(true)
    expect(isReadOnlySql('select 1;;;')).toBe(true)
  })

  it('accepts reads behind leading comments', () => {
    expect(isReadOnlySql('-- fetch orders\nSELECT 1')).toBe(true)
    expect(isReadOnlySql('/* hint */ select 1')).toBe(true)
    expect(isReadOnlySql('/* a */ -- b\n/* c */ SELECT 1')).toBe(true)
  })

  it('rejects writes', () => {
    expect(isReadOnlySql('INSERT INTO t VALUES (1)')).toBe(false)
    expect(isReadOnlySql('update t set a = 1')).toBe(false)
    expect(isReadOnlySql('DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('drop table t')).toBe(false)
    expect(isReadOnlySql('call p()')).toBe(false)
    expect(isReadOnlySql('set @a = 1')).toBe(false)
  })

  it('rejects a second statement after a semicolon', () => {
    expect(isReadOnlySql('SELECT 1; DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('select 1; select 2')).toBe(false)
  })

  it('treats EXPLAIN ANALYZE as running its statement', () => {
    expect(isReadOnlySql('EXPLAIN ANALYZE SELECT 1')).toBe(true)
    expect(isReadOnlySql('EXPLAIN ANALYZE FORMAT=TREE SELECT 1')).toBe(true)
    expect(isReadOnlySql('EXPLAIN ANALYZE FORMAT = TREE SELECT 1')).toBe(true)
    expect(isReadOnlySql('EXPLAIN ANALYZE DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN ANALYZE UPDATE t SET a = 1')).toBe(false)
    expect(isReadOnlySql('EXPLAIN ANALYZE FORMAT=TREE DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN ANALYZE FORMAT=TREE UPDATE t SET a = 1')).toBe(false)
    expect(isReadOnlySql('EXPLAIN ANALYZE')).toBe(false)
    // Plain EXPLAIN never runs the statement.
    expect(isReadOnlySql('EXPLAIN DELETE FROM t')).toBe(true)
  })

  it('judges an EXPLAIN (...) option list by whether ANALYZE runs the statement', () => {
    expect(isReadOnlySql('EXPLAIN (ANALYZE) SELECT 1')).toBe(true)
    expect(isReadOnlySql('EXPLAIN (ANALYZE, FORMAT JSON) DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN (ANALYZE) UPDATE t SET a = 1')).toBe(false)
    expect(isReadOnlySql('EXPLAIN (FORMAT JSON) DELETE FROM t')).toBe(true)
    expect(isReadOnlySql('EXPLAIN (VERBOSE, ANALYZE) DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN (ANALYZE)')).toBe(false)
  })

  it('judges the statement a CTE list runs', () => {
    expect(isReadOnlySql('WITH c AS (SELECT 1) SELECT * FROM c')).toBe(true)
    expect(isReadOnlySql('with recursive c as (select 1) select 1 from c')).toBe(true)
    expect(isReadOnlySql('WITH a AS (SELECT 1), b AS (SELECT 2) SELECT * FROM a, b')).toBe(true)
    expect(isReadOnlySql('WITH c (id) AS (SELECT 1) SELECT * FROM c')).toBe(true)
    expect(isReadOnlySql('WITH c AS NOT MATERIALIZED (SELECT 1) SELECT 1')).toBe(true)
    // A CTE in front of a write must not pass.
    expect(isReadOnlySql('WITH c AS (SELECT id FROM t) DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('WITH c AS (SELECT 1) UPDATE t SET a = 1')).toBe(false)
    expect(isReadOnlySql('WITH c AS (SELECT 1) INSERT INTO t VALUES (1)')).toBe(false)
  })

  it('is not fooled by strings, comments or nesting inside the CTE', () => {
    expect(isReadOnlySql("WITH c AS (SELECT 'delete' AS x) SELECT * FROM c")).toBe(true)
    expect(isReadOnlySql("WITH c AS (SELECT ')' AS p) SELECT * FROM c")).toBe(true)
    expect(isReadOnlySql('WITH c AS (SELECT count(*) FROM (SELECT 1 AS a) x) SELECT 1')).toBe(true)
    expect(isReadOnlySql('WITH c AS (-- delete from t\nSELECT 1) SELECT * FROM c')).toBe(true)
    expect(isReadOnlySql('WITH c AS (/* delete */ SELECT 1) SELECT * FROM c')).toBe(true)
  })

  it('rejects a CTE list it cannot parse', () => {
    expect(isReadOnlySql('WITH c AS (SELECT 1)')).toBe(false)
    expect(isReadOnlySql('WITH delete FROM t')).toBe(false)
    expect(isReadOnlySql('WITH c (SELECT 1) SELECT 1')).toBe(false)
    expect(isReadOnlySql('WITH c AS SELECT 1 SELECT 1')).toBe(false)
    expect(isReadOnlySql('WITH c AS (SELECT 1')).toBe(false)
  })

  it('refuses a select that writes a file on the server', () => {
    expect(isReadOnlySql("SELECT * FROM users INTO OUTFILE '/tmp/users.txt'")).toBe(false)
    expect(isReadOnlySql("select 1 into dumpfile '/tmp/dump.bin'")).toBe(false)
    expect(isReadOnlySql("SELECT * FROM t INTO   OUTFILE '/tmp/x'")).toBe(false)
    // Mentioning the words in a string or a comment is not a file write.
    expect(isReadOnlySql("SELECT 'INTO OUTFILE' AS note")).toBe(true)
    expect(isReadOnlySql('SELECT 1 /* into outfile */')).toBe(true)
    // Selecting into a session variable stays a read.
    expect(isReadOnlySql('SELECT count(*) INTO @total FROM users')).toBe(true)
  })
})

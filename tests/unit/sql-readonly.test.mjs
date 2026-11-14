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

  it('accepts semicolons inside literals and comments', () => {
    expect(isReadOnlySql("select ';' as semi")).toBe(true)
    expect(isReadOnlySql("select 'a;b' from dual")).toBe(true)
    expect(isReadOnlySql('select "a;b" from t')).toBe(true)
    expect(isReadOnlySql('select 1 /* ; */ from dual')).toBe(true)
    expect(isReadOnlySql("select q'[it's; fine]' from dual")).toBe(true)
    expect(isReadOnlySql("select nq'[中文;值]' from dual")).toBe(true)
    expect(isReadOnlySql("select 'a;b'; delete from t")).toBe(false)
    expect(isReadOnlySql("select q'[it's; fine]' from dual; delete from t")).toBe(false)
  })

  it('accepts semicolons and INTO inside SQL Server bracket identifiers', () => {
    expect(isReadOnlySql('select [a;b] from t')).toBe(true)
    expect(isReadOnlySql('select [a into b] from t')).toBe(true)
    expect(isReadOnlySql('select [a]];b] from t')).toBe(true)
    expect(isReadOnlySql('select [a;b] from t; delete from t')).toBe(false)
    expect(isReadOnlySql('select [a;b')).toBe(false)
    expect(isReadOnlySql('WITH c AS (select [a)] as x from t) select * from c')).toBe(true)
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

  it('does not let comments hide EXPLAIN ANALYZE', () => {
    expect(isReadOnlySql('EXPLAIN /* run it */ ANALYZE DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN -- run it\nANALYZE DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN /* options */ (ANALYZE) DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN (ANALYZE) /* run it */ DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN ANALYZE /* run it */ DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN ANALYZE FORMAT=TREE /* run it */ DELETE FROM t')).toBe(false)
    // A plain EXPLAIN still only plans, with or without comments.
    expect(isReadOnlySql('EXPLAIN /* only plan */ SELECT 1')).toBe(true)
    expect(isReadOnlySql('EXPLAIN /* only plan */ DELETE FROM t')).toBe(true)
    expect(isReadOnlySql('EXPLAIN /* no statement */')).toBe(false)
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
    // PostgreSQL data-modifying CTE bodies run as part of a plain outer SELECT.
    expect(isReadOnlySql('WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d')).toBe(false)
    expect(isReadOnlySql('WITH u AS (UPDATE t SET a = 1 RETURNING *) SELECT 1')).toBe(false)
    expect(isReadOnlySql('WITH i AS (INSERT INTO t VALUES (1) RETURNING id) SELECT * FROM i')).toBe(false)
    expect(isReadOnlySql('WITH a AS (SELECT 1), d AS (DELETE FROM t RETURNING id) SELECT * FROM a, d')).toBe(false)
    expect(isReadOnlySql('WITH outer AS (WITH inner AS (DELETE FROM t RETURNING *) SELECT * FROM inner) SELECT * FROM outer')).toBe(false)
    expect(isReadOnlySql("WITH c AS (SELECT * FROM t INTO OUTFILE '/tmp/x') SELECT 1")).toBe(false)
    expect(isReadOnlySql('WITH a AS (SELECT 1), b AS (SELECT * FROM a) SELECT * FROM b')).toBe(true)
  })

  it('is not fooled by strings, comments or nesting inside the CTE', () => {
    expect(isReadOnlySql("WITH c AS (SELECT 'delete' AS x) SELECT * FROM c")).toBe(true)
    expect(isReadOnlySql("WITH c AS (SELECT ')' AS p) SELECT * FROM c")).toBe(true)
    expect(isReadOnlySql('WITH c AS (SELECT count(*) FROM (SELECT 1 AS a) x) SELECT 1')).toBe(true)
    expect(isReadOnlySql('WITH c AS (-- delete from t\nSELECT 1) SELECT * FROM c')).toBe(true)
    expect(isReadOnlySql('WITH c AS (/* delete */ SELECT 1) SELECT * FROM c')).toBe(true)
    expect(isReadOnlySql("WITH c AS (SELECT q'[it's; fine]' AS x FROM dual) SELECT * FROM c")).toBe(true)
  })

  it('rejects a CTE list it cannot parse', () => {
    expect(isReadOnlySql('WITH c AS (SELECT 1)')).toBe(false)
    expect(isReadOnlySql('WITH delete FROM t')).toBe(false)
    expect(isReadOnlySql('WITH c (SELECT 1) SELECT 1')).toBe(false)
    expect(isReadOnlySql('WITH c AS SELECT 1 SELECT 1')).toBe(false)
    expect(isReadOnlySql('WITH c AS (SELECT 1')).toBe(false)
  })

  it('rejects a select that creates a table', () => {
    // PostgreSQL: SELECT ... INTO [TEMP | UNLOGGED] [TABLE] name
    expect(isReadOnlySql('SELECT * INTO backup FROM users')).toBe(false)
    expect(isReadOnlySql('select 1 into new_table')).toBe(false)
    expect(isReadOnlySql('SELECT * INTO TEMP TABLE backup FROM users')).toBe(false)
    expect(isReadOnlySql('SELECT * INTO UNLOGGED TABLE backup FROM users')).toBe(false)
    expect(isReadOnlySql('SELECT * INTO "backup" FROM users')).toBe(false)
    // SQL Server: SELECT ... INTO #tmp
    expect(isReadOnlySql('SELECT * INTO #tmp FROM users')).toBe(false)
    // The same clause hidden inside a CTE body must not pass either.
    expect(isReadOnlySql('WITH c AS (SELECT * INTO backup FROM t) SELECT 1')).toBe(false)
    // Session variables and mentions in strings/comments stay reads.
    expect(isReadOnlySql('SELECT count(*) INTO @total FROM users')).toBe(true)
    expect(isReadOnlySql('SELECT 1 INTO @a, @b')).toBe(true)
    expect(isReadOnlySql("SELECT 'INTO backup' AS note")).toBe(true)
    expect(isReadOnlySql("SELECT q'[INTO backup it's]' AS note FROM dual")).toBe(true)
    expect(isReadOnlySql('SELECT 1 /* into backup */')).toBe(true)
  })

  it('accepts semicolons inside dollar-quoted strings', () => {
    expect(isReadOnlySql('select $$a;b$$')).toBe(true)
    expect(isReadOnlySql('select $tag$a;b$tag$')).toBe(true)
    expect(isReadOnlySql('select $fn$ begin; return 1; end $fn$')).toBe(true)
    expect(isReadOnlySql('with c as (select $tag$a;b$tag$ as x) select * from c')).toBe(true)
    // A semicolon after the literal still separates two statements.
    expect(isReadOnlySql('select $$;$$; delete from t')).toBe(false)
    // An unterminated delimiter is not a string.
    expect(isReadOnlySql('select 1 as $$; select 2')).toBe(false)
    expect(isReadOnlySql('select $1$; select 2')).toBe(false)
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

  it('rejects writes hidden in MySQL executable comments', () => {
    // MySQL runs `/*! ... */` bodies, so they are not inert comments.
    expect(isReadOnlySql("SELECT * FROM users /*!50000 INTO OUTFILE '/tmp/users.txt' */")).toBe(false)
    expect(isReadOnlySql("select 1 /*!50000 into dumpfile '/tmp/dump.bin' */")).toBe(false)
    expect(isReadOnlySql('/*!50000 delete from t */')).toBe(false)
    expect(isReadOnlySql('/*!50000 delete from t */ select 1')).toBe(false)
    // Ordinary executable hints and session variables remain reads.
    expect(isReadOnlySql('SELECT 1 /*!50000 SQL_NO_CACHE */')).toBe(true)
    expect(isReadOnlySql('SELECT count(*) /*!50000 INTO @total */ FROM users')).toBe(true)
  })
})

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

  it('accepts read-only SQLite pragmas', () => {
    expect(isReadOnlySql('PRAGMA table_info(users)', 'sqlite')).toBe(true)
    expect(isReadOnlySql("PRAGMA main.table_info('users')", 'sqlite')).toBe(true)
    expect(isReadOnlySql("PRAGMA \"main\".index_info('idx')", 'sqlite')).toBe(true)
    expect(isReadOnlySql('PRAGMA foreign_key_check', 'sqlite')).toBe(true)
    expect(isReadOnlySql('PRAGMA integrity_check(1)', 'sqlite')).toBe(true)
    expect(isReadOnlySql('PRAGMA schema_version', 'sqlite')).toBe(true)
    expect(isReadOnlySql('PRAGMA user_version', 'sqlite')).toBe(true)
    expect(isReadOnlySql('PRAGMA user_version /* keep */', 'sqlite')).toBe(true)
    expect(isReadOnlySql("PRAGMA table_info('a=b')", 'sqlite')).toBe(true)
    expect(isReadOnlySql('PRAGMA table_info("a=b")', 'sqlite')).toBe(true)
    expect(isReadOnlySql('PRAGMA table_info([a=b])', 'sqlite')).toBe(true)
    expect(isReadOnlySql('PRAGMA table_info(users) /* = */', 'sqlite')).toBe(true)
    // PRAGMA is not a read-only starter outside SQLite.
    expect(isReadOnlySql('PRAGMA table_info(users)')).toBe(false)
  })

  it('rejects mutating or ambiguous SQLite pragmas', () => {
    expect(isReadOnlySql('PRAGMA user_version = 1', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA user_version(1)', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA application_id(1234)', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA schema_version(7)', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA user_version /* x */ = 1', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA main.user_version = 1', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA journal_mode = WAL', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA writable_schema = ON', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA table_info(users) = 1', 'sqlite')).toBe(false)
    expect(isReadOnlySql('PRAGMA table_info(users); DROP TABLE users', 'sqlite')).toBe(false)
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
    expect(isReadOnlySql('select [a;b] from t', 'sqlite')).toBe(true)
    expect(isReadOnlySql('select [a;b] from t; delete from t', 'sqlite')).toBe(false)
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

  it('rejects Oracle EXPLAIN PLAN because it writes the plan table', () => {
    expect(isReadOnlySql('EXPLAIN PLAN FOR SELECT * FROM t', 'oracle')).toBe(false)
    expect(isReadOnlySql("EXPLAIN PLAN SET STATEMENT_ID = 'x' FOR SELECT 1", 'oracle')).toBe(false)
    expect(isReadOnlySql('EXPLAIN SELECT * FROM t', 'oceanbase-oracle')).toBe(false)
    // Other dialects keep their side-effect-free plain EXPLAIN.
    expect(isReadOnlySql('EXPLAIN SELECT * FROM t', 'postgres')).toBe(true)
  })

  it('judges an EXPLAIN (...) option list by whether ANALYZE runs the statement', () => {
    expect(isReadOnlySql('EXPLAIN (ANALYZE) SELECT 1')).toBe(true)
    expect(isReadOnlySql('EXPLAIN (ANALYZE, FORMAT JSON) DELETE FROM t')).toBe(false)
    expect(isReadOnlySql('EXPLAIN (ANALYZE) UPDATE t SET a = 1')).toBe(false)
    expect(isReadOnlySql('EXPLAIN (ANALYZE false) DELETE FROM t', 'postgres')).toBe(true)
    expect(isReadOnlySql('EXPLAIN (ANALYZE off, FORMAT JSON) DELETE FROM t', 'postgres')).toBe(true)
    expect(isReadOnlySql('EXPLAIN (ANALYZE true) DELETE FROM t', 'postgres')).toBe(false)
    expect(isReadOnlySql('EXPLAIN (ANALYZE 0) DELETE FROM t', 'postgres')).toBe(true)
    expect(isReadOnlySql('EXPLAIN (ANALYZE 1) DELETE FROM t', 'postgres')).toBe(false)
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

  it('accepts quoted CTE names', () => {
    expect(isReadOnlySql('WITH "recent sales" AS (SELECT 1) SELECT * FROM "recent sales"', 'postgres')).toBe(true)
    expect(isReadOnlySql('with [recent] as (select 1) select * from [recent]', 'mssql')).toBe(true)
    expect(isReadOnlySql('with `recent` as (select 1) select * from `recent`', 'mysql')).toBe(true)
    expect(isReadOnlySql('WITH "d" AS (DELETE FROM t RETURNING *) SELECT * FROM "d"', 'postgres')).toBe(false)
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
    expect(isReadOnlySql('select $$a;b$$', 'postgres')).toBe(true)
    expect(isReadOnlySql('select $tag$a;b$tag$', 'postgres')).toBe(true)
    expect(isReadOnlySql('select $fn$ begin; return 1; end $fn$', 'postgres')).toBe(true)
    expect(isReadOnlySql('with c as (select $tag$a;b$tag$ as x) select * from c', 'postgres')).toBe(true)
    // A semicolon after the literal still separates two statements.
    expect(isReadOnlySql('select $$;$$; delete from t', 'postgres')).toBe(false)
    // An unterminated delimiter is not a string.
    expect(isReadOnlySql('select 1 as $$; select 2', 'postgres')).toBe(false)
    expect(isReadOnlySql('select $1$; select 2', 'postgres')).toBe(false)
  })

  it('does not treat dollar identifiers as quotes outside PostgreSQL', () => {
    const sql = 'select 1 as $a$; delete from t; select 2 as $a$'
    expect(isReadOnlySql(sql, 'mysql')).toBe(false)
    expect(isReadOnlySql(sql, 'mssql')).toBe(false)
    expect(isReadOnlySql(sql, 'oracle')).toBe(false)
    expect(isReadOnlySql(sql)).toBe(false)
  })

  it('treats any -- as a comment outside MySQL', () => {
    // Oracle/SQLite/SQL Server/PostgreSQL all start a comment at `--` even
    // when the next character is a quote; treating the quote as a string
    // would hide the DELETE below.
    const sql = "SELECT 1 --'\n; DELETE FROM t; --'"
    for (const dialect of ['oracle', 'oceanbase-oracle', 'postgres', 'mssql', 'sqlite', 'dameng']) {
      expect(isReadOnlySql(sql, dialect)).toBe(false)
    }
    // MySQL requires whitespace after `--`; this is one SELECT with a string,
    // not a second statement.
    expect(isReadOnlySql(sql, 'mysql')).toBe(true)
  })

  it('does not treat MySQL executable comments as code outside MySQL', () => {
    // `/*!` is a normal block comment for every other dialect. Treating its
    // body as code lets a quote inside it start a string and hide the DELETE.
    const sql = "SELECT 1 /*! ' */; DELETE FROM t; SELECT 'x'"
    for (const dialect of ['oracle', 'oceanbase-oracle', 'postgres', 'mssql', 'sqlite', 'dameng']) {
      expect(isReadOnlySql(sql, dialect)).toBe(false)
    }
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
    expect(isReadOnlySql("SELECT * FROM users /*!50000 INTO OUTFILE '/tmp/users.txt' */", 'mysql')).toBe(false)
    // MySQL accepts the version number touching the first keyword; the guard
    // must still see `INTO OUTFILE` there.
    expect(isReadOnlySql("SELECT * FROM users /*!50000INTO OUTFILE '/tmp/users.txt' */", 'mysql')).toBe(false)
    expect(isReadOnlySql('SELECT 1 /*!50000INTO new_table*/', 'mysql')).toBe(false)
    expect(isReadOnlySql("select 1 /*!50000 into dumpfile '/tmp/dump.bin' */", 'mysql')).toBe(false)
    expect(isReadOnlySql('/*!50000 delete from t */', 'mysql')).toBe(false)
    expect(isReadOnlySql('/*!50000 delete from t */ select 1', 'mysql')).toBe(false)
    // Ordinary executable hints and session variables remain reads.
    expect(isReadOnlySql('SELECT 1 /*!50000 SQL_NO_CACHE */', 'mysql')).toBe(true)
    expect(isReadOnlySql('SELECT count(*) /*!50000 INTO @total */ FROM users', 'mysql')).toBe(true)
    // A versioned comment can also front a read-only statement. It must not be
    // rejected just because the whole text starts with `/*!`.
    expect(isReadOnlySql('/*!50000 SELECT 1 */', 'mysql')).toBe(true)
    expect(isReadOnlySql('/*!50000 SELECT 1 */;', 'mysql')).toBe(true)
    expect(isReadOnlySql('/*!50000 */ SELECT 1', 'mysql')).toBe(true)
    expect(isReadOnlySql('/*!50000 SELECT 1 */ DELETE FROM t', 'mysql')).toBe(false)
  })

  it('does not treat MySQL arithmetic minus minus as a line comment', () => {
    expect(isReadOnlySql('SELECT 1--3', 'mysql')).toBe(true)
    expect(isReadOnlySql("SELECT 1--3 INTO OUTFILE '/tmp/x'", 'mysql')).toBe(false)
    expect(isReadOnlySql('SELECT 1--3; DELETE FROM t', 'mysql')).toBe(false)
    // A real `--` comment still hides its content.
    expect(isReadOnlySql('SELECT 1 -- comment; delete from t\n', 'mysql')).toBe(true)
    expect(isReadOnlySql('SELECT 1 -- comment\n; delete from t', 'mysql')).toBe(false)
  })

  it('honours MySQL backslash escapes before a quote', () => {
    expect(isReadOnlySql("SELECT 'a\\''; DELETE FROM t", 'mysql')).toBe(false)
    expect(isReadOnlySql("SELECT 'a\\''; SELECT 1", 'mysql')).toBe(false)
    expect(isReadOnlySql("SELECT 'a\\''", 'mysql')).toBe(true)
    expect(isReadOnlySql("SELECT 'it\\'s fine'", 'mysql')).toBe(true)
    expect(isReadOnlySql("WITH c AS (SELECT 'a\\'' AS x) SELECT * FROM c", 'mysql')).toBe(true)
  })

  it('honours PostgreSQL escape-string backslashes before a quote', () => {
    expect(isReadOnlySql("SELECT E'a\\''; DELETE FROM t", 'postgres')).toBe(false)
    expect(isReadOnlySql("SELECT e'a\\''; SELECT 1", 'postgres')).toBe(false)
    expect(isReadOnlySql("SELECT E'a\\''", 'postgres')).toBe(true)
    expect(isReadOnlySql("SELECT E'it\\'s fine'", 'postgres')).toBe(true)
    expect(isReadOnlySql("WITH c AS (SELECT E'a\\'' AS x) SELECT * FROM c", 'postgres')).toBe(true)
    expect(isReadOnlySql("WITH c AS (SELECT E'it\\'s)' AS x) SELECT * FROM c", 'postgres')).toBe(true)
  })

  it('treats # as a comment only in MySQL-family dialects', () => {
    expect(isReadOnlySql('# fetch orders\nSELECT 1', 'mysql')).toBe(true)
    // Generic text cannot start with #; SQL Server allows #temp identifiers.
    expect(isReadOnlySql('# fetch orders\nSELECT 1')).toBe(false)
    expect(isReadOnlySql('SELECT 1 # comment', 'mysql')).toBe(true)
    expect(isReadOnlySql('SELECT 1 # comment\n; DELETE FROM t', 'mysql')).toBe(false)
    // The rest of the line is a comment, so this is only one (invalid) statement.
    expect(isReadOnlySql('SELECT 1 # ; DELETE FROM t', 'mysql')).toBe(true)
    // Outside MySQL the semicolon stays visible and a second statement is rejected.
    expect(isReadOnlySql('SELECT 1 # ; DELETE FROM t', 'mssql')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM #tmp; SELECT 2', 'mssql')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM #tmp; SELECT 2', 'mysql')).toBe(true)
  })

  it('rejects locking reads', () => {
    expect(isReadOnlySql('SELECT * FROM t FOR UPDATE', 'postgres')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t FOR NO KEY UPDATE', 'postgres')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t FOR KEY SHARE', 'postgres')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t FOR SHARE', 'postgres')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t LOCK IN SHARE MODE', 'mysql')).toBe(false)
    // SQL Server table hints can take the same kind of locks without FOR UPDATE.
    expect(isReadOnlySql('SELECT * FROM t WITH (UPDLOCK)', 'mssql')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t WITH (UPDLOCK, ROWLOCK)', 'mssql')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t WITH (TABLOCKX)', 'mssql')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t WITH (REPEATABLEREAD)', 'mssql')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t WITH (READCOMMITTEDLOCK)', 'mssql')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t WITH (NOLOCK)', 'mssql')).toBe(true)
    // WITH is optional before a table hint; the legacy shorthand still takes locks.
    expect(isReadOnlySql('SELECT * FROM t (UPDLOCK)', 'mssql')).toBe(false)
    expect(isReadOnlySql('SELECT * FROM t (NOLOCK)', 'mssql')).toBe(true)
    expect(isReadOnlySql("SELECT 'with (updlock)' AS note", 'mssql')).toBe(true)
    // The words in a string or comment, and a plain EXPLAIN, stay reads.
    expect(isReadOnlySql("SELECT 'for update' AS note", 'postgres')).toBe(true)
    expect(isReadOnlySql('SELECT 1 /* for update */', 'postgres')).toBe(true)
    expect(isReadOnlySql('EXPLAIN SELECT * FROM t FOR UPDATE', 'postgres')).toBe(true)
    // Locking reads inside a CTE body are checked too.
    expect(isReadOnlySql('WITH c AS (SELECT * FROM t FOR UPDATE) SELECT * FROM c', 'postgres')).toBe(false)
  })
})

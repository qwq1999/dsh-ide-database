import { describe, expect, it } from 'vitest'
import { splitStatements } from '../../src/client/multistatement.ts'

describe('splitStatements', () => {
  it('splits on top-level semicolons and drops empty trailing parts', () => {
    expect(splitStatements('select 1; select 2;\n')).toEqual(['select 1', 'select 2'])
  })

  it('keeps semicolons inside strings, quoted identifiers and escapes', () => {
    expect(splitStatements("select 'a;b', \"c;d\"; select `x;y`;")).toEqual([
      "select 'a;b', \"c;d\"",
      'select `x;y`',
    ])
    expect(splitStatements("select 'it''s; fine'; select 2")).toEqual(["select 'it''s; fine'", 'select 2'])
    expect(splitStatements("select 'back\\\\'; select 2")).toEqual(["select 'back\\\\'", 'select 2'])
  })

  it('treats backslash as an ordinary character outside MySQL', () => {
    const windowsPath = "select 'C:\\'; select 2"
    for (const dialect of ['generic', 'postgres', 'sqlite', 'mssql', 'oracle', 'dameng', 'oceanbase-oracle']) {
      expect(splitStatements(windowsPath, dialect)).toEqual(["select 'C:\\'", 'select 2'])
    }
    // MySQL reads `\'` as an escaped quote, so the rest stays inside the literal.
    expect(splitStatements(windowsPath, 'mysql')).toEqual(["select 'C:\\'; select 2"])
    // PostgreSQL E'' strings do escape, including the quote and the semicolon.
    expect(splitStatements("select E'it\\'s; ok'; select 2", 'postgres')).toEqual([
      "select E'it\\'s; ok'",
      'select 2',
    ])
  })

  it('keeps Oracle alternative-quoted literals in one statement', () => {
    const quoted = "insert into t values (q'[it's; fine]')"
    expect(splitStatements(`${quoted}; select 2`, 'oracle')).toEqual([quoted, 'select 2'])
    expect(splitStatements("select q'{a;b}', q'<c;d>', q'!e;f!' from dual; select 2", 'oracle')).toEqual([
      "select q'{a;b}', q'<c;d>', q'!e;f!' from dual",
      'select 2',
    ])
    expect(splitStatements("select nq'[中文;值]' from dual; select 2", 'oracle')).toEqual([
      "select nq'[中文;值]' from dual",
      'select 2',
    ])
    // Other dialects do not know the q prefix, so the inner quote still ends
    // the literal and the trailing statement is not separated cleanly.
    expect(splitStatements(`${quoted}; select 2`, 'mssql')).not.toEqual(splitStatements(`${quoted}; select 2`, 'oracle'))
  })

  it('ignores semicolons in line and block comments', () => {
    expect(splitStatements('select 1 -- one; two\n; select 2')).toEqual(['select 1 -- one; two', 'select 2'])
    expect(splitStatements('select 1 # hash; comment\n; select 2', 'mysql')).toEqual(['select 1 # hash; comment', 'select 2'])
    expect(splitStatements('/* a; b */ select 1; /* c; d */')).toEqual(['/* a; b */ select 1', '/* c; d */'])
  })

  it('applies MySQL comment rules only to MySQL', () => {
    // Without whitespace after `--`, MySQL reads arithmetic, not a comment.
    expect(splitStatements('select 5--3; select 2', 'mysql')).toEqual(['select 5--3', 'select 2'])
    // `#` is a MySQL comment, not a SQL Server temp-table prefix.
    expect(splitStatements('select * from #tmp; select 2', 'mssql')).toEqual(['select * from #tmp', 'select 2'])
    expect(splitStatements('select * from #tmp; select 2', 'generic')).toEqual(['select * from #tmp', 'select 2'])
    // The standard `-- ` comment still works on MySQL.
    expect(splitStatements('select 1 -- note; x\n; select 2', 'mysql')).toEqual(['select 1 -- note; x', 'select 2'])
  })

  it('honours MySQL DELIMITER directives', () => {
    const script = [
      '-- create the procedure',
      'DELIMITER $$',
      'CREATE PROCEDURE bump()',
      'BEGIN',
      "  UPDATE t SET note = 'a;b';",
      '  -- END$$ in a comment is not a terminator',
      '  SELECT 1;',
      'END$$',
      'DELIMITER ;',
      'SELECT 2;',
    ].join('\n')
    expect(splitStatements(script, 'mysql')).toEqual([
      "-- create the procedure\nCREATE PROCEDURE bump()\nBEGIN\n  UPDATE t SET note = 'a;b';\n  -- END$$ in a comment is not a terminator\n  SELECT 1;\nEND",
      'SELECT 2',
    ])

    const slash = ['delimiter //', 'select 1;', 'select 2//', 'DELIMITER ;', 'select 3;'].join('\n')
    expect(splitStatements(slash, 'mysql')).toEqual(['select 1;\nselect 2', 'select 3'])
  })

  it('does not treat DELIMITER in a statement as a client command', () => {
    expect(splitStatements("select 'DELIMITER $$'; select 2", 'mysql')).toEqual(["select 'DELIMITER $$'", 'select 2'])
    expect(splitStatements('select 1; DELIMITER $$', 'mysql')).toEqual(['select 1', 'DELIMITER $$'])
    expect(splitStatements('DELIMITER $$\nselect 1; select 2', 'generic')).toEqual(['DELIMITER $$\nselect 1', 'select 2'])
  })

  it('keeps SQL Server bracket identifiers in one statement', () => {
    expect(splitStatements('select [a;b] from t; select 2', 'mssql')).toEqual(['select [a;b] from t', 'select 2'])
    expect(splitStatements('select [a]];b] from t; select 2', 'mssql')).toEqual([
      'select [a]];b] from t',
      'select 2',
    ])
    // Other dialects have no bracket identifiers, so the semicolon still ends a statement.
    expect(splitStatements('select [a;b] from t', 'generic')).toEqual(['select [a', 'b] from t'])
  })

  it('keeps PostgreSQL dollar-quoted bodies in one statement', () => {
    const body = 'create function bump() returns int as $$ begin; return 1; end $$ language plpgsql;'
    expect(splitStatements(`${body}\nselect bump()`)).toEqual([body.slice(0, -1), 'select bump()'])
    expect(splitStatements('select $tag$a;b$tag$; select 2')).toEqual(['select $tag$a;b$tag$', 'select 2'])
    expect(splitStatements('select $outer$ $inner$; $inner$ $outer$; select 2')).toEqual([
      'select $outer$ $inner$; $inner$ $outer$',
      'select 2',
    ])
  })

  it('leaves an unmatched dollar delimiter and dollar identifiers alone', () => {
    expect(splitStatements('select 1 as $$; select 2')).toEqual(['select 1 as $$', 'select 2'])
    expect(splitStatements('select foo$bar$baz; select 2')).toEqual(['select foo$bar$baz', 'select 2'])
    expect(splitStatements('select $1$; select 2')).toEqual(['select $1$', 'select 2'])
  })

  it('separates SQL Server batches at GO lines', () => {
    expect(splitStatements('select 1\nGO\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    expect(splitStatements('select 1\n  go  -- next batch\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    expect(splitStatements('select 1\nGO\nGO\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    expect(splitStatements('select 1;\nGO\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    expect(splitStatements('select 1 GO\nselect 2', 'mssql')).toEqual(['select 1 GO\nselect 2'])
    expect(splitStatements("select 'GO' as x;\nGO\nselect 2", 'mssql')).toEqual(["select 'GO' as x", 'select 2'])
    // GO is a SQL Server client command, so other dialects leave it in the SQL.
    expect(splitStatements('select 1\nGO\nselect 2', 'generic')).toEqual(['select 1\nGO\nselect 2'])
    expect(splitStatements('select 1\nGO\nselect 2', 'mysql')).toEqual(['select 1\nGO\nselect 2'])
  })

  it('repeats a batch for a GO count', () => {
    expect(splitStatements('insert into t values (1)\nGO 3\nselect 1', 'mssql')).toEqual([
      'insert into t values (1)',
      'insert into t values (1)',
      'insert into t values (1)',
      'select 1',
    ])
    expect(splitStatements('select 1; select 2\nGO 2', 'mssql')).toEqual([
      'select 1',
      'select 2',
      'select 1',
      'select 2',
    ])
    expect(splitStatements('select 1\nGO 1', 'mssql')).toEqual(['select 1'])
  })

  it('keeps a SQL Server program body until its GO batch', () => {
    const procedure = [
      '-- define it',
      'CREATE PROCEDURE bump AS',
      'BEGIN',
      "  UPDATE t SET note = 'a;b';",
      '  SELECT 1;',
      'END',
      'GO',
      'SELECT 2;',
    ].join('\n')
    expect(splitStatements(procedure, 'mssql')).toEqual([
      "-- define it\nCREATE PROCEDURE bump AS\nBEGIN\n  UPDATE t SET note = 'a;b';\n  SELECT 1;\nEND",
      'SELECT 2',
    ])
    expect(splitStatements('CREATE OR ALTER PROC p AS BEGIN SELECT 1; END\nGO\nSELECT 2', 'mssql')).toEqual([
      'CREATE OR ALTER PROC p AS BEGIN SELECT 1; END',
      'SELECT 2',
    ])
    expect(splitStatements('CREATE FUNCTION f() RETURNS int AS BEGIN RETURN 1; END', 'mssql')).toEqual([
      'CREATE FUNCTION f() RETURNS int AS BEGIN RETURN 1; END',
    ])
    // A plain CREATE TABLE is still one statement per semicolon.
    expect(splitStatements('CREATE TABLE t (a int); SELECT 1', 'mssql')).toEqual(['CREATE TABLE t (a int)', 'SELECT 1'])
  })

  it('returns an empty list for blank scripts and keeps single statements intact', () => {
    expect(splitStatements('   \n\t ')).toEqual([])
    expect(splitStatements('select 1')).toEqual(['select 1'])
  })
})

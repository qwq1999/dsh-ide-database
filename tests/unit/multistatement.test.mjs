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

  it('ignores a trailing comment on a DELIMITER line', () => {
    const script = [
      'DELIMITER $$ -- switch to the procedure body',
      'CREATE PROCEDURE p() BEGIN SELECT 1; END$$',
      'DELIMITER ; -- restore the default',
      'SELECT 2;',
    ].join('\n')
    expect(splitStatements(script, 'mysql')).toEqual(['CREATE PROCEDURE p() BEGIN SELECT 1; END', 'SELECT 2'])

    const hash = [
      'DELIMITER $$ # switch to the procedure body',
      'CREATE PROCEDURE p() BEGIN SELECT 1; END$$',
      'DELIMITER ; # restore the default',
      'SELECT 2;',
    ].join('\n')
    expect(splitStatements(hash, 'mysql')).toEqual(['CREATE PROCEDURE p() BEGIN SELECT 1; END', 'SELECT 2'])
  })

  it('does not treat DELIMITER in a statement as a client command', () => {
    expect(splitStatements("select 'DELIMITER $$'; select 2", 'mysql')).toEqual(["select 'DELIMITER $$'", 'select 2'])
    expect(splitStatements('select 1; DELIMITER $$', 'mysql')).toEqual(['select 1', 'DELIMITER $$'])
    expect(splitStatements('DELIMITER $$\nselect 1; select 2', 'generic')).toEqual(['DELIMITER $$\nselect 1', 'select 2'])
  })

  it('keeps SQL Server bracket identifiers in one statement', () => {
    expect(splitStatements('select [a;b] from t; select 2', 'mssql')).toEqual(['select [a;b] from t', 'select 2'])
    expect(splitStatements('select [a;b] from t; select 2', 'sqlite')).toEqual(['select [a;b] from t', 'select 2'])
    expect(splitStatements('select [a]];b] from t; select 2', 'mssql')).toEqual([
      'select [a]];b] from t',
      'select 2',
    ])
    // Other dialects have no bracket identifiers, so the semicolon still ends a statement.
    expect(splitStatements('select [a;b] from t', 'generic')).toEqual(['select [a', 'b] from t'])
  })

  it('keeps PostgreSQL dollar-quoted bodies in one statement', () => {
    const body = 'create function bump() returns int as $$ begin; return 1; end $$ language plpgsql;'
    expect(splitStatements(`${body}\nselect bump()`, 'postgres')).toEqual([body.slice(0, -1), 'select bump()'])
    expect(splitStatements('select $tag$a;b$tag$; select 2', 'postgres')).toEqual(['select $tag$a;b$tag$', 'select 2'])
    expect(splitStatements('select $outer$ $inner$; $inner$ $outer$; select 2', 'postgres')).toEqual([
      'select $outer$ $inner$; $inner$ $outer$',
      'select 2',
    ])
  })

  it('leaves an unmatched dollar delimiter and dollar identifiers alone', () => {
    expect(splitStatements('select 1 as $$; select 2', 'postgres')).toEqual(['select 1 as $$', 'select 2'])
    expect(splitStatements('select foo$bar$baz; select 2', 'postgres')).toEqual(['select foo$bar$baz', 'select 2'])
    expect(splitStatements('select $1$; select 2', 'postgres')).toEqual(['select $1$', 'select 2'])
  })

  it('separates SQL Server batches at GO lines', () => {
    expect(splitStatements('select 1\nGO\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    // The GO line itself may contain comments (Microsoft sqlcmd semantics).
    expect(splitStatements('select 1\nGO /* end batch */\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    expect(splitStatements('select 1\nGO /* outer /* inner */ */ /* more */\nselect 2', 'mssql')).toEqual([
      'select 1',
      'select 2',
    ])
    expect(splitStatements('select 1\nGO 2 /* repeat */\nselect 2', 'mssql')).toEqual(['select 1', 'select 1', 'select 2'])
    expect(splitStatements('select 1\n  go  -- next batch\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    expect(splitStatements('select 1\nGO\nGO\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    expect(splitStatements('select 1;\nGO\nselect 2', 'mssql')).toEqual(['select 1', 'select 2'])
    expect(splitStatements('select 1 GO\nselect 2', 'mssql')).toEqual(['select 1 GO\nselect 2'])
    expect(splitStatements("select 'GO' as x;\nGO\nselect 2", 'mssql')).toEqual(["select 'GO' as x", 'select 2'])
    // GO is a SQL Server client command, so other dialects leave it in the SQL.
    expect(splitStatements('select 1\nGO\nselect 2', 'generic')).toEqual(['select 1\nGO\nselect 2'])
    expect(splitStatements('select 1\nGO\nselect 2', 'mysql')).toEqual(['select 1\nGO\nselect 2'])
  })

  it('does not treat dollar identifiers as PostgreSQL quotes', () => {
    const sql = 'select 1 as $a$; delete from t; select 2 as $a$'
    expect(splitStatements(sql, 'mysql')).toEqual(['select 1 as $a$', 'delete from t', 'select 2 as $a$'])
    expect(splitStatements(sql, 'generic')).toEqual(['select 1 as $a$', 'delete from t', 'select 2 as $a$'])
    expect(splitStatements(sql, 'mssql')).toEqual(['select 1 as $a$', 'delete from t', 'select 2 as $a$'])
  })

  it('finds a SQL Server program after a long comment', () => {
    const leading = `/* ${'x'.repeat(600)} */\nCREATE PROCEDURE long_proc AS BEGIN SELECT 1; SELECT 2; END`
    const parts = splitStatements(`${leading}\nGO\nSELECT 3`, 'mssql')
    expect(parts).toHaveLength(2)
    expect(parts[0]).toContain('CREATE PROCEDURE')
    expect(parts[0]).toContain('SELECT 1; SELECT 2;')
    expect(parts[1]).toBe('SELECT 3')
    expect(splitStatements('CREATE /* keep */ PROCEDURE p AS BEGIN SELECT 1; END\nGO', 'mssql')).toHaveLength(1)
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
    expect(splitStatements('ALTER PROCEDURE p AS BEGIN SELECT 1; END\nGO\nSELECT 2', 'mssql')).toEqual([
      'ALTER PROCEDURE p AS BEGIN SELECT 1; END',
      'SELECT 2',
    ])
    expect(splitStatements('ALTER VIEW v AS SELECT 1 AS a; -- still the view\nGO\nSELECT 2', 'mssql')).toEqual([
      'ALTER VIEW v AS SELECT 1 AS a; -- still the view',
      'SELECT 2',
    ])
    // A plain CREATE/ALTER TABLE is still one statement per semicolon.
    expect(splitStatements('CREATE TABLE t (a int); SELECT 1', 'mssql')).toEqual(['CREATE TABLE t (a int)', 'SELECT 1'])
    expect(splitStatements('ALTER TABLE t ADD c int; SELECT 1', 'mssql')).toEqual(['ALTER TABLE t ADD c int', 'SELECT 1'])
  })

  it('keeps a SQLite trigger body intact', () => {
    const trigger = [
      'CREATE TRIGGER bump AFTER INSERT ON t',
      'BEGIN',
      '  UPDATE t SET n = n + 1;',
      '  INSERT INTO log VALUES (NEW.id);',
      'END;',
    ].join('\n')
    expect(splitStatements(trigger, 'sqlite')).toEqual([trigger.slice(0, -1)])
    expect(splitStatements(`${trigger}\nSELECT 2;`, 'sqlite')).toEqual([trigger.slice(0, -1), 'SELECT 2'])

    const withCase = [
      'CREATE TEMP TRIGGER IF NOT EXISTS tr AFTER INSERT ON t',
      'BEGIN',
      '  UPDATE t SET x = CASE WHEN NEW.x > 0 THEN 1 ELSE 0 END;',
      '  INSERT INTO log VALUES (NEW.id);',
      'END;',
    ].join('\n')
    expect(splitStatements(withCase, 'sqlite')).toEqual([withCase.slice(0, -1)])
    const noisy = [
      'CREATE TRIGGER noisy AFTER INSERT ON t',
      'BEGIN',
      "  INSERT INTO log VALUES ('END; not a terminator');",
      '  -- END; in a comment is not a terminator',
      '  UPDATE t SET n = n + 1;',
      'END;',
    ].join('\n')
    expect(splitStatements(noisy, 'sqlite')).toEqual([noisy.slice(0, -1)])
    expect(splitStatements(trigger, 'generic').length).toBeGreaterThan(1)
  })

  it('keeps Oracle PL/SQL anonymous blocks intact', () => {
    const block = [
      'BEGIN',
      '  NULL;',
      '  IF 1 = 1 THEN',
      '    NULL;',
      '  END IF;',
      '  CASE WHEN 1 = 1 THEN',
      '    NULL;',
      '  ELSE',
      '    NULL;',
      '  END CASE;',
      '  FOR i IN 1..2 LOOP',
      '    NULL;',
      '  END LOOP;',
      'END;',
    ].join('\n')
    expect(splitStatements(block, 'oracle')).toEqual([block])
    expect(splitStatements(`${block}\nSELECT 2;`, 'oracle')).toEqual([block, 'SELECT 2'])
    expect(splitStatements(block, 'oceanbase-oracle')).toEqual([block])
    expect(splitStatements('SELECT 1;', 'oracle')).toEqual(['SELECT 1'])

    const declare = ['DECLARE', '  x NUMBER;', 'BEGIN', '  x := 1;', 'END;'].join('\n')
    expect(splitStatements(declare, 'oracle')).toEqual([declare])

    const noisy = [
      'BEGIN',
      "  DBMS_OUTPUT.PUT_LINE('END; not a terminator');",
      '  -- END; in a comment is not a terminator',
      '  NULL;',
      'END;',
    ].join('\n')
    expect(splitStatements(noisy, 'oracle')).toEqual([noisy])
    expect(splitStatements(block, 'generic').length).toBeGreaterThan(1)
  })

  it('keeps Oracle procedure, function and trigger bodies intact', () => {
    const procedure = [
      'CREATE OR REPLACE PROCEDURE p AS',
      '  x NUMBER;',
      'BEGIN',
      '  x := 1;',
      '  IF x > 0 THEN',
      '    x := 2;',
      '  END IF;',
      'END;',
    ].join('\n')
    expect(splitStatements(procedure, 'oracle')).toEqual([procedure])
    expect(splitStatements(`${procedure}\nSELECT 2;`, 'oracle')).toEqual([procedure, 'SELECT 2'])

    const fn = [
      'CREATE OR REPLACE FUNCTION f RETURN NUMBER AS',
      'BEGIN',
      '  RETURN 1;',
      'END;',
    ].join('\n')
    expect(splitStatements(fn, 'oracle')).toEqual([fn])

    const trigger = [
      'CREATE OR REPLACE TRIGGER t BEFORE INSERT ON tab FOR EACH ROW',
      'BEGIN',
      '  NULL;',
      'END;',
    ].join('\n')
    expect(splitStatements(trigger, 'oracle')).toEqual([trigger])

    // No PL/SQL block: Oracle SQL DDL still drops the terminator.
    const external = "CREATE OR REPLACE PROCEDURE p AS LANGUAGE JAVA NAME 'X.f()'; SELECT 2;"
    expect(splitStatements(external, 'oracle')).toEqual([
      "CREATE OR REPLACE PROCEDURE p AS LANGUAGE JAVA NAME 'X.f()'",
      'SELECT 2',
    ])
    const callTrigger = 'CREATE OR REPLACE TRIGGER t BEFORE INSERT ON tab FOR EACH ROW CALL p; SELECT 2;'
    expect(splitStatements(callTrigger, 'oracle')).toEqual([
      'CREATE OR REPLACE TRIGGER t BEFORE INSERT ON tab FOR EACH ROW CALL p',
      'SELECT 2',
    ])
  })

  it('keeps Oracle local subprograms inside the declaration section', () => {
    const procedure = [
      'CREATE OR REPLACE PROCEDURE p AS',
      '  PROCEDURE inner_proc AS',
      '  BEGIN',
      '    NULL;',
      '  END;',
      '  FUNCTION inner_fn RETURN NUMBER IS',
      '  BEGIN',
      '    RETURN 1;',
      '  END;',
      'BEGIN',
      '  inner_proc;',
      '  NULL;',
      'END;',
    ].join('\n')
    expect(splitStatements(procedure, 'oracle')).toEqual([procedure])

    const anonymous = [
      'DECLARE',
      '  PROCEDURE inner_proc AS',
      '  BEGIN',
      '    NULL;',
      '  END;',
      'BEGIN',
      '  inner_proc;',
      'END;',
    ].join('\n')
    expect(splitStatements(anonymous, 'oracle')).toEqual([anonymous])
  })

  it('keeps Oracle compound trigger sections intact', () => {
    const trigger = [
      'CREATE OR REPLACE TRIGGER tr',
      'FOR INSERT ON users',
      'COMPOUND TRIGGER',
      '  BEFORE STATEMENT IS',
      '  BEGIN',
      '    NULL;',
      '  END BEFORE STATEMENT;',
      '  AFTER EACH ROW IS',
      '  BEGIN',
      '    IF :NEW.id > 0 THEN',
      '      NULL;',
      '    END IF;',
      '  END AFTER EACH ROW;',
      'END;',
    ].join('\n')
    expect(splitStatements(trigger, 'oracle')).toEqual([trigger])
    expect(splitStatements(`${trigger}\nSELECT 2;`, 'oracle')).toEqual([trigger, 'SELECT 2'])
  })

  it('keeps Oracle package specifications and bodies intact', () => {
    const spec = [
      'CREATE OR REPLACE PACKAGE pkg AS',
      '  PROCEDURE p;',
      '  FUNCTION f RETURN NUMBER;',
      'END pkg;',
    ].join('\n')
    expect(splitStatements(spec, 'oracle')).toEqual([spec])

    const specWithCase = [
      'CREATE OR REPLACE PACKAGE pkg AS',
      '  c CONSTANT NUMBER := CASE WHEN 1 = 1 THEN 1 ELSE 0 END;',
      '  PROCEDURE p;',
      'END pkg;',
    ].join('\n')
    expect(splitStatements(specWithCase, 'oracle')).toEqual([specWithCase])

    const body = [
      'CREATE OR REPLACE PACKAGE BODY pkg AS',
      '  PROCEDURE p IS',
      '  BEGIN',
      '    NULL;',
      '  END;',
      '  FUNCTION f RETURN NUMBER IS',
      '  BEGIN',
      '    RETURN 1;',
      '  END;',
      'END pkg;',
    ].join('\n')
    expect(splitStatements(body, 'oracle')).toEqual([body])
    expect(splitStatements(`${body}\nSELECT 2;`, 'oracle')).toEqual([body, 'SELECT 2'])

    const withInit = [
      'CREATE OR REPLACE PACKAGE BODY pkg AS',
      '  PROCEDURE p IS',
      '  BEGIN',
      '    NULL;',
      '  END;',
      'BEGIN',
      '  p;',
      'END pkg;',
    ].join('\n')
    expect(splitStatements(withInit, 'oracle')).toEqual([withInit])

    const typeBody = [
      'CREATE OR REPLACE TYPE BODY t AS',
      '  MEMBER PROCEDURE p IS',
      '  BEGIN',
      '    NULL;',
      '  END;',
      'END;',
    ].join('\n')
    expect(splitStatements(typeBody, 'oracle')).toEqual([typeBody])
  })

  it('nests PostgreSQL and SQL Server block comments', () => {
    const script = 'SELECT 1 /* outer /* inner */ ; */; SELECT 2'
    expect(splitStatements(script, 'postgres')).toEqual(['SELECT 1 /* outer /* inner */ ; */', 'SELECT 2'])
    expect(splitStatements(script, 'mssql')).toEqual(['SELECT 1 /* outer /* inner */ ; */', 'SELECT 2'])
  })

  it('returns an empty list for blank scripts and keeps single statements intact', () => {
    expect(splitStatements('   \n\t ')).toEqual([])
    expect(splitStatements('select 1')).toEqual(['select 1'])
  })
})

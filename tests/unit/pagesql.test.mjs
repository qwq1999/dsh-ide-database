import { describe, expect, it } from 'vitest'

import { pageable, wrapPage } from '../../src/client/pagesql'

describe('pageable', () => {
  it('accepts a single plain SELECT', () => {
    expect(pageable('SELECT * FROM shop.orders')).toBe(true)
    expect(pageable('  select id from t; ')).toBe(true)
  })

  it('rejects statements that already page themselves', () => {
    expect(pageable('SELECT * FROM t LIMIT 10')).toBe(false)
    expect(pageable('SELECT * FROM t WHERE ROWNUM <= 5')).toBe(false)
    expect(pageable('SELECT * FROM t FETCH FIRST 5 ROWS ONLY')).toBe(false)
    expect(pageable('SELECT * FROM t ORDER BY id OFFSET 5 ROWS', 'mssql')).toBe(false)
    expect(pageable('SELECT * FROM t ORDER BY id OFFSET @skip ROWS', 'mssql')).toBe(false)
    expect(pageable('SELECT TOP 10 * FROM t', 'mssql')).toBe(false)
    expect(pageable('SELECT TOP (10) * FROM t', 'mssql')).toBe(false)
    expect(pageable('SELECT * FROM t FOR JSON PATH', 'mssql')).toBe(false)
    expect(pageable('SELECT * FROM t FOR BROWSE', 'mssql')).toBe(false)
    expect(pageable('SELECT * FROM t OPTION (MAXDOP 1)', 'mssql')).toBe(false)
    expect(pageable('SELECT top10 FROM t', 'mssql')).toBe(true)
  })

  it('rejects SELECT ... INTO and locking reads', () => {
    expect(pageable('SELECT last_id INTO @id FROM shop.orders')).toBe(false)
    expect(pageable('SELECT * FROM shop.orders FOR UPDATE')).toBe(false)
    expect(pageable('SELECT * FROM shop.orders FOR NO KEY UPDATE')).toBe(false)
    expect(pageable('SELECT * FROM shop.orders FOR SHARE')).toBe(false)
    expect(pageable('SELECT * FROM shop.orders LOCK IN SHARE MODE')).toBe(false)
  })

  it('ignores those words inside literals and comments', () => {
    expect(pageable("SELECT 'into @x' AS note FROM shop.orders")).toBe(true)
    expect(pageable('SELECT 1 -- for update\nFROM shop.orders')).toBe(true)
    expect(pageable('SELECT 1 /* into outfile */ FROM shop.orders')).toBe(true)
    // Paging keywords in data or comments must not disable paging either.
    expect(pageable("SELECT * FROM shop.orders WHERE note = 'limit'")).toBe(true)
    expect(pageable("SELECT * FROM shop.orders WHERE note = 'fetch first'")).toBe(true)
    expect(pageable("SELECT * FROM shop.orders WHERE note = 'rownum'")).toBe(true)
    expect(pageable('-- limit 10\nSELECT * FROM shop.orders')).toBe(true)
    expect(pageable('/* fetch first 5 rows */ SELECT * FROM shop.orders')).toBe(true)
  })

  it('pages a select whose terminator sits before a trailing comment', () => {
    expect(pageable('SELECT * FROM t; -- trailing remark')).toBe(true)
    expect(pageable('SELECT * FROM t;; /* trailing remark */')).toBe(true)
    expect(pageable('SELECT 1; SELECT 2; -- trailing remark')).toBe(false)
  })

  it('reads literals and comments with the connection dialect', () => {
    expect(pageable('SELECT $$a;b$$ FROM t', 'postgres')).toBe(true)
    expect(pageable("SELECT q'[it's; fine]' FROM dual", 'oracle')).toBe(true)
    // MySQL only starts `--` comments after whitespace, so this is two statements.
    expect(pageable('SELECT 5--3; SELECT 2', 'mysql')).toBe(false)
    // Outside MySQL a backslash is data; the closing quote must be found here.
    expect(pageable("SELECT 'C:\\'; SELECT 2", 'mssql')).toBe(false)
    // SQL Server bracket identifiers are names, not keywords or separators.
    expect(pageable('SELECT [limit] FROM t', 'mssql')).toBe(true)
    expect(pageable('SELECT [a;b] FROM t', 'mssql')).toBe(true)
    expect(pageable('SELECT [a;b] FROM t; SELECT 2', 'mssql')).toBe(false)
    expect(pageable('SELECT [a;b] FROM t', 'sqlite')).toBe(true)
    expect(pageable('SELECT [a;b] FROM t; SELECT 2', 'sqlite')).toBe(false)
  })

  it('rejects anything that is not one plain SELECT', () => {
    expect(pageable('UPDATE t SET a = 1')).toBe(false)
    expect(pageable('SELECT 1; SELECT 2')).toBe(false)
    expect(pageable('SELECT 1; DELETE FROM t')).toBe(false)
    expect(pageable('WITH x AS (SELECT 1) SELECT * FROM x')).toBe(false)
  })
})

describe('wrapPage', () => {
  it('keeps a trailing comment out of the appended page clause', () => {
    expect(wrapPage('generic', 'SELECT * FROM t; -- trailing remark', 10, 1)).toBe(
      'SELECT * FROM (\nSELECT * FROM t -- trailing remark\n) dshdb_page LIMIT 10 OFFSET 10',
    )
  })

  it('wraps with LIMIT on the generic dialects', () => {
    expect(wrapPage('mysql', 'SELECT * FROM t', 500, 2)).toBe(
      'SELECT * FROM (\nSELECT * FROM t\n) dshdb_page LIMIT 500 OFFSET 1000',
    )
  })

  it('wraps with OFFSET ... FETCH on Oracle-family dialects', () => {
    for (const dialect of ['oracle', 'oceanbase-oracle', 'dameng']) {
      expect(wrapPage(dialect, 'SELECT * FROM t', 100, 0)).toBe(
        'SELECT * FROM (\nSELECT * FROM t\n) dshdb_page OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY',
      )
    }
  })

  it('pages SQL Server in place instead of wrapping an ORDER BY in a derived table', () => {
    expect(wrapPage('mssql', 'SELECT * FROM t', 100, 2)).toBe(
      'SELECT * FROM t\nORDER BY (SELECT NULL) OFFSET 200 ROWS FETCH NEXT 100 ROWS ONLY',
    )
    expect(wrapPage('mssql', 'SELECT * FROM t ORDER BY id', 100, 0)).toBe(
      'SELECT * FROM t ORDER BY id\nOFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY',
    )
    expect(wrapPage('mssql', 'SELECT 1 -- 说明', 10, 0)).toBe(
      'SELECT 1 -- 说明\nORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY',
    )
    expect(wrapPage('mssql', "SELECT 'order by' AS note", 10, 0)).toBe(
      "SELECT 'order by' AS note\nORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY",
    )
    expect(wrapPage('mssql', 'SELECT * FROM (SELECT TOP 5 * FROM t ORDER BY id) s', 10, 0)).toBe(
      'SELECT * FROM (SELECT TOP 5 * FROM t ORDER BY id) s\nORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY',
    )
  })

  it('keeps a trailing line comment from swallowing the closing parenthesis', () => {
    const wrapped = wrapPage('mysql', 'SELECT 1 -- 说明', 10, 0)
    const lines = wrapped.split('\n')
    expect(lines[0]).toBe('SELECT * FROM (')
    expect(lines[1]).toBe('SELECT 1 -- 说明')
    expect(lines[2]).toBe(') dshdb_page LIMIT 10 OFFSET 0')
  })
})

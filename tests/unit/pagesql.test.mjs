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
  })

  it('rejects anything that is not one plain SELECT', () => {
    expect(pageable('UPDATE t SET a = 1')).toBe(false)
    expect(pageable('SELECT 1; SELECT 2')).toBe(false)
    expect(pageable('WITH x AS (SELECT 1) SELECT * FROM x')).toBe(false)
  })
})

describe('wrapPage', () => {
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

  it('keeps a trailing line comment from swallowing the closing parenthesis', () => {
    const wrapped = wrapPage('mysql', 'SELECT 1 -- 说明', 10, 0)
    const lines = wrapped.split('\n')
    expect(lines[0]).toBe('SELECT * FROM (')
    expect(lines[1]).toBe('SELECT 1 -- 说明')
    expect(lines[2]).toBe(') dshdb_page LIMIT 10 OFFSET 0')
  })
})

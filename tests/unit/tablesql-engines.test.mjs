import { describe, expect, it } from 'vitest'

import { orderByForPaging, pageClause, qualifiedName, quoteIdent, tableSelectSql } from '../../src/client/tablesql'

describe('identifiers and paging per dialect', () => {
  it('quotes identifiers the way each engine wants', () => {
    expect(quoteIdent('mysql', 'total')).toBe('`total`')
    expect(quoteIdent('mssql', 'total')).toBe('[total]')
    expect(quoteIdent('mssql', 'we]ird')).toBe('[we]]ird]')
    expect(quoteIdent('postgres', 'total')).toBe('"total"')
    expect(quoteIdent('sqlite', 'total')).toBe('"total"')
  })

  it('qualifies names only when a schema is set', () => {
    expect(qualifiedName('postgres', 'public', 'users')).toBe('"public"."users"')
    expect(qualifiedName('sqlite', 'main', 'users')).toBe('"main"."users"')
    expect(qualifiedName('mssql', '', 'users')).toBe('[users]')
  })

  it('pages with LIMIT or OFFSET FETCH', () => {
    expect(pageClause('postgres', 10, 20)).toBe('LIMIT 10 OFFSET 20')
    expect(pageClause('sqlite', 10, 20)).toBe('LIMIT 10 OFFSET 20')
    expect(pageClause('mssql', 10, 20)).toBe('OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY')
    expect(pageClause('oracle', 10, 20)).toBe('OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY')
  })

  it('gives SQL Server a stable dummy order for paging', () => {
    expect(orderByForPaging('mssql', '')).toBe(' ORDER BY (SELECT NULL)')
    expect(orderByForPaging('postgres', '')).toBe('')
    expect(orderByForPaging('mssql', 'id')).toBe(' ORDER BY id')
  })

  it('builds a first page for SQLite', () => {
    expect(tableSelectSql('sqlite', 'main', 'users', 'id > 1', 'id DESC', 50)).toBe(
      'SELECT * FROM "main"."users" WHERE id > 1 ORDER BY id DESC LIMIT 50 OFFSET 0',
    )
  })
})

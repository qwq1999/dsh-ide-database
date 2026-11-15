import { describe, expect, it } from 'vitest'

import { sqlDialectOf } from '../../src/shared/dialect.ts'

describe('sqlDialectOf', () => {
  it('uses the generic lexer for Redis and missing connections', () => {
    expect(sqlDialectOf('redis')).toBe('generic')
    expect(sqlDialectOf(undefined)).toBe('generic')
  })

  it('keeps every SQL dialect unchanged', () => {
    for (const dialect of ['mysql', 'postgres', 'mssql', 'oracle', 'sqlite']) {
      expect(sqlDialectOf(dialect)).toBe(dialect)
    }
  })
})

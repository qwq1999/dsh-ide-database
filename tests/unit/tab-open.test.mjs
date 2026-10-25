import { describe, expect, it } from 'vitest'

import { readConsoleTabParams, readTableTabParams } from '../../src/client/tab-open'

describe('readConsoleTabParams', () => {
  it('keeps a data source and a statement', () => {
    expect(readConsoleTabParams({ connectionId: 'mysql-1', sql: 'SELECT 1' })).toEqual({
      connectionId: 'mysql-1',
      sql: 'SELECT 1',
    })
  })

  it('drops an empty statement and an empty source', () => {
    expect(readConsoleTabParams({ connectionId: '', sql: '   ' })).toEqual({})
  })

  it('ignores values of the wrong type', () => {
    expect(readConsoleTabParams({ connectionId: 7, sql: 42 })).toEqual({})
  })

  it('has no parameters for a restored tab', () => {
    expect(readConsoleTabParams(undefined)).toBeUndefined()
    expect(readConsoleTabParams(null)).toBeUndefined()
    expect(readConsoleTabParams('mysql-1')).toBeUndefined()
  })
})

describe('readTableTabParams', () => {
  it('needs both a source and a table name', () => {
    expect(readTableTabParams({ connectionId: 'mysql-1', schema: 'shop', table: 'orders' })).toEqual({
      connectionId: 'mysql-1',
      schema: 'shop',
      table: 'orders',
    })
    expect(readTableTabParams({ connectionId: 'mysql-1', schema: 'shop', table: '' })).toBeUndefined()
    expect(readTableTabParams({ connectionId: '', schema: 'shop', table: 'orders' })).toBeUndefined()
  })
})

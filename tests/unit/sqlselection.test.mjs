import { describe, expect, it } from 'vitest'
import { pickStatement } from '../../src/client/sqlselection.ts'

describe('pickStatement', () => {
  it('uses the whole editor when nothing is selected', () => {
    const picked = pickStatement('select 1 from dual', 5, 5)
    expect(picked).toEqual({ statement: 'select 1 from dual', selected: false })
  })

  it('uses the highlighted range only', () => {
    const sql = 'select count(*) from shop.orders;\nselect count(*) from shop.customers'
    const picked = pickStatement(sql, 0, sql.indexOf(';') + 1)
    expect(picked).toEqual({ statement: 'select count(*) from shop.orders;', selected: true })
  })

  it('normalizes a reverse selection (dragging right to left)', () => {
    const sql = 'aaa bbb'
    expect(pickStatement(sql, 7, 4).statement).toBe('bbb')
  })

  it('ignores whitespace-only selections', () => {
    const picked = pickStatement('select 1', 6, 7)
    expect(picked).toEqual({ statement: 'select 1', selected: false })
  })
})

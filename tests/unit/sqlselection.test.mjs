import { describe, expect, it } from 'vitest'
import { pickStatement, statementAtCaret } from '../../src/client/sqlselection.ts'

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

describe('statementAtCaret', () => {
  const sql = ['select 1;', 'select 2 from dual;', 'select 3'].join(String.fromCharCode(10))

  it('finds the statement the caret sits in', () => {
    expect(statementAtCaret(sql, 3)).toEqual({ statement: 'select 1', index: 0 })
    expect(statementAtCaret(sql, sql.indexOf('dual'))).toEqual({ statement: 'select 2 from dual', index: 1 })
    expect(statementAtCaret(sql, sql.length)).toEqual({ statement: 'select 3', index: 2 })
  })

  it('treats a caret in the blanks between statements as the next one', () => {
    expect(statementAtCaret(sql, 9).index).toBe(1)
  })

  it('returns an empty statement for blank text', () => {
    const blank = ['   ', String.fromCharCode(9, 32)].join('')
    expect(statementAtCaret(blank, 2)).toEqual({ statement: '', index: -1 })
  })
})

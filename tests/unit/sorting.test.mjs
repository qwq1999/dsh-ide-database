import { describe, expect, it } from 'vitest'

import { nextOrderBy, parseOrderBy, quoteSortColumn, stripOrderBy } from '../../src/client/sorting.ts'

describe('table sorting expressions', () => {
  it('reads a single column with an optional direction', () => {
    expect(parseOrderBy('')).toBeUndefined()
    expect(parseOrderBy('id')).toEqual({ column: 'id', direction: 'asc' })
    expect(parseOrderBy(' id DESC ')).toEqual({ column: 'id', direction: 'desc' })
    expect(parseOrderBy('`user_id` asc')).toEqual({ column: 'user_id', direction: 'asc' })
  })

  it('ignores anything that is not one plain column', () => {
    expect(parseOrderBy('id DESC, name ASC')).toBeUndefined()
    expect(parseOrderBy('count(*) desc')).toBeUndefined()
    expect(parseOrderBy('LOWER(name)')).toBeUndefined()
  })

  it('cycles none -> ASC -> DESC -> none', () => {
    expect(nextOrderBy('', 'city', '`city`')).toBe('`city` ASC')
    expect(nextOrderBy('`city` ASC', 'city', '`city`')).toBe('`city` DESC')
    expect(nextOrderBy('`city` DESC', 'city', '`city`')).toBe('')
  })

  it('restarts at ASC when another column or an expression is active', () => {
    expect(nextOrderBy('`city` DESC', 'name', '`name`')).toBe('`name` ASC')
    expect(nextOrderBy('count(*) DESC', 'name', '`name`')).toBe('`name` ASC')
  })

  it('quotes per dialect', () => {
    expect(quoteSortColumn('mysql', 'order')).toBe('`order`')
    expect(quoteSortColumn('oracle', 'order')).toBe('"order"')
    expect(quoteSortColumn('dameng', 'a"b')).toBe('"a""b"')
  })
  it('strips a leading ORDER BY keyword, whatever its case or spelling', () => {
    expect(stripOrderBy('ORDER BY total DESC')).toBe('total DESC')
    expect(stripOrderBy('order by total desc;')).toBe('total desc')
    expect(stripOrderBy('  ORDER   BY  total  ')).toBe('total')
    expect(stripOrderBy('total DESC')).toBe('total DESC')
    expect(stripOrderBy('ORDER BY')).toBe('')
    expect(stripOrderBy('')).toBe('')
  })
})

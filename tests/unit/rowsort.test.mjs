import { describe, expect, it } from 'vitest'
import { nextRowSort, sortRowsWithOrder } from '../../src/client/rowsort'

const columns = [
  { name: 'id', typeName: 'INT' },
  { name: 'name', typeName: 'VARCHAR' },
]

describe('nextRowSort', () => {
  it('cycles none -> asc -> desc -> none on the same column', () => {
    expect(nextRowSort(null, 'id')).toEqual({ column: 'id', direction: 'asc' })
    expect(nextRowSort({ column: 'id', direction: 'asc' }, 'id')).toEqual({ column: 'id', direction: 'desc' })
    expect(nextRowSort({ column: 'id', direction: 'desc' }, 'id')).toBeNull()
  })

  it('starts a new column at ascending', () => {
    expect(nextRowSort({ column: 'id', direction: 'desc' }, 'name')).toEqual({ column: 'name', direction: 'asc' })
  })
})

describe('sortRows', () => {
  const rows = [
    [3, '陈静'],
    [1, '王芳'],
    [2, null],
  ]

  it('returns the page untouched when no sort is active', () => {
    expect(sortRowsWithOrder(columns, rows, null).rows).toBe(rows)
  })

  it('sorts numbers numerically', () => {
    expect(sortRowsWithOrder(columns, rows, { column: 'id', direction: 'asc' }).rows.map((row) => row[0])).toEqual([1, 2, 3])
    expect(sortRowsWithOrder(columns, rows, { column: 'id', direction: 'desc' }).rows.map((row) => row[0])).toEqual([3, 2, 1])
  })

  it('reports where each sorted row came from', () => {
    const sorted = sortRowsWithOrder(columns, rows, { column: 'id', direction: 'desc' })
    expect(sorted.rows.map((row) => row[0])).toEqual([3, 2, 1])
    expect(sorted.order).toEqual([0, 2, 1])
    expect(sortRowsWithOrder(columns, rows, null).order).toEqual([0, 1, 2])
  })

  it('keeps empty cells at the bottom in both directions', () => {
    expect(sortRowsWithOrder(columns, rows, { column: 'name', direction: 'asc' }).rows.map((row) => row[0])).toEqual([3, 1, 2])
    expect(sortRowsWithOrder(columns, rows, { column: 'name', direction: 'desc' }).rows.map((row) => row[0])).toEqual([1, 3, 2])
  })

  it('orders text with numeric and locale-aware collation', () => {
    const textRows = [
      ['x', 'item10'],
      ['x', 'item9'],
      ['x', 'Item1'],
    ]
    expect(sortRowsWithOrder(columns, textRows, { column: 'name', direction: 'asc' }).rows.map((row) => row[1])).toEqual([
      'Item1',
      'item9',
      'item10',
    ])
  })

  it('does not mutate the page it was given', () => {
    const page = [
      [2, 'b'],
      [1, 'a'],
    ]
    sortRowsWithOrder(columns, page, { column: 'id', direction: 'asc' }).rows
    expect(page).toEqual([
      [2, 'b'],
      [1, 'a'],
    ])
  })
})

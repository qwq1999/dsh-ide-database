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

  it('keeps duplicate column names on separate sort states', () => {
    expect(nextRowSort({ column: 'id', index: 0, direction: 'asc' }, 'id', 1)).toEqual({ column: 'id', direction: 'asc', index: 1 })
    expect(nextRowSort({ column: 'id', index: 0, direction: 'desc' }, 'id', 0)).toBeNull()
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

  it('sorts the column selected by index when two columns share a name', () => {
    const duplicate = [
      { name: 'id', typeName: 'INT' },
      { name: 'id', typeName: 'INT' },
    ]
    const page = [
      [1, 30],
      [2, 10],
      [3, 20],
    ]
    expect(sortRowsWithOrder(duplicate, page, { column: 'id', index: 1, direction: 'asc' }).rows.map((row) => row[0])).toEqual([2, 3, 1])
    expect(sortRowsWithOrder(duplicate, page, { column: 'id', direction: 'asc' }).rows.map((row) => row[0])).toEqual([1, 2, 3])
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

describe('NaN ordering', () => {
  const cols = [{ name: 'v', typeName: 'DOUBLE' }]

  it('sinks NaN to the bottom and keeps finite values ordered', () => {
    const page = [[2], [NaN], [1]]
    const out = sortRowsWithOrder(cols, page, { column: 'v', direction: 'asc' }).rows
    expect(out[0][0]).toBe(1)
    expect(out[1][0]).toBe(2)
    expect(Number.isNaN(out[2][0])).toBe(true)
  })

  it('sinks NaN to the bottom in descending order too', () => {
    const page = [[1], [NaN], [3]]
    const out = sortRowsWithOrder(cols, page, { column: 'v', direction: 'desc' }).rows
    expect(out[0][0]).toBe(3)
    expect(out[1][0]).toBe(1)
    expect(Number.isNaN(out[2][0])).toBe(true)
  })
})


describe('mixed number / numeric-string ordering', () => {
  const cols = [{ name: 'v', typeName: 'BIGINT' }]

  it('puts -2 before -1 / "-1" regardless of row order', () => {
    // -1 (number) and "-1" (string) compare equal (stable sort keeps their
    // relative order), but -2 must lead both. Before the fix the collator
    // ranked "-2" AFTER "-1", so -2 floated down whenever a string "-1" was
    // present — the sorted result depended on the original row order.
    const a = [[-2], [-1], ['-1']]
    const b = [['-1'], [-2], [-1]]
    const outA = sortRowsWithOrder(cols, a, { column: 'v', direction: 'asc' }).rows.map((r) => r[0])
    const outB = sortRowsWithOrder(cols, b, { column: 'v', direction: 'asc' }).rows.map((r) => r[0])
    expect(outA[0]).toBe(-2)
    expect(outB[0]).toBe(-2)
    // The two equal values follow, in their original relative order.
    expect(outA.slice(1)).toEqual([-1, '-1'])
    expect(outB.slice(1)).toEqual(['-1', -1])
  })

  it('orders negative numeric strings numerically, not by collator', () => {
    const page = [['-10'], ['-2'], [-1], ['-20']]
    const out = sortRowsWithOrder(cols, page, { column: 'v', direction: 'asc' }).rows.map((r) => r[0])
    expect(out).toEqual(['-20', '-10', '-2', -1])
  })
})


describe('large integer ordering', () => {
  const cols = [{ name: 'v', typeName: 'BIGINT' }]

  it('sorts >2^53 integer strings exactly (BIGINTs arrive as strings)', () => {
    // SqlExecutor.normalize returns >2^53 integers as strings to avoid JS
    // rounding. Number() folding collapses these onto one double, leaving the
    // page unsorted; BigInt keys keep them distinct and correctly ordered.
    const page = [
      ['1900000000000000003'],
      ['1900000000000000001'],
      ['1900000000000000002'],
      ['1900000000000000000'],
    ]
    const asc = sortRowsWithOrder(cols, page, { column: 'v', direction: 'asc' }).rows.map((r) => r[0])
    expect(asc).toEqual([
      '1900000000000000000',
      '1900000000000000001',
      '1900000000000000002',
      '1900000000000000003',
    ])
    const desc = sortRowsWithOrder(cols, page, { column: 'v', direction: 'desc' }).rows.map((r) => r[0])
    expect(desc).toEqual([...asc].reverse())
  })

  it('orders a numeric bigint string against a nearby number without depending on row order', () => {
    // 9007199254740993 > 9007199254740992, but Number("9007199254740993")
    // rounds down to 9007199254740992. The result must not depend on which
    // row came first.
    const a = [['9007199254740993'], [9007199254740992]]
    const b = [[9007199254740992], ['9007199254740993']]
    const outA = sortRowsWithOrder(cols, a, { column: 'v', direction: 'asc' }).rows.map((r) => r[0])
    const outB = sortRowsWithOrder(cols, b, { column: 'v', direction: 'asc' }).rows.map((r) => r[0])
    // The numeric 2^53 is smaller than the string 2^53+1 in both orders.
    expect(outA[0]).toBe(9007199254740992)
    expect(outB[0]).toBe(9007199254740992)
    expect(outA[1]).toBe('9007199254740993')
    expect(outB[1]).toBe('9007199254740993')
  })

  it('sorts negative big integer strings correctly', () => {
    const page = [['-9007199254740993'], ['-9007199254740992'], ['0'], ['9007199254740992']]
    const asc = sortRowsWithOrder(cols, page, { column: 'v', direction: 'asc' }).rows.map((r) => r[0])
    expect(asc).toEqual(['-9007199254740993', '-9007199254740992', '0', '9007199254740992'])
  })
})

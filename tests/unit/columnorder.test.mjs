import { describe, expect, it } from 'vitest'
import { columnSignature, identityOrder, moveColumn, orderColumns, orderRows } from '../../src/client/columnOrder.ts'

const column = (name) => ({ name, typeName: 'varchar', nullable: true, defaultValue: '', comment: '', primary: false })

describe('moveColumn', () => {
  it('moves a column and keeps the rest in order', () => {
    expect(moveColumn([0, 1, 2, 3], 0, 2)).toEqual([1, 2, 0, 3])
    expect(moveColumn([0, 1, 2, 3], 3, 0)).toEqual([3, 0, 1, 2])
  })

  it('clamps the target and ignores no-op moves', () => {
    expect(moveColumn([0, 1, 2], 1, 99)).toEqual([0, 2, 1])
    expect(moveColumn([0, 1, 2], 2, 2)).toEqual([0, 1, 2])
    expect(moveColumn([], 0, 1)).toEqual([])
  })
})

describe('orderColumns / orderRows', () => {
  const columns = [column('id'), column('name'), column('total')]
  const rows = [[1, '手机', '638.00'], [2, '电脑', null]]

  it('rearranges headers and every row by the same indices', () => {
    const order = [2, 0, 1]
    expect(orderColumns(columns, order).map((item) => item.name)).toEqual(['total', 'id', 'name'])
    expect(orderRows(rows, order)).toEqual([['638.00', 1, '手机'], [null, 2, '电脑']])
  })

  it('falls back to the original order when there is none or it is stale', () => {
    expect(orderColumns(columns, null)).toBe(columns)
    expect(orderColumns(columns, [0, 1])).toBe(columns)
    expect(orderRows(rows, null)).toBe(rows)
  })

  it('builds an identity order and a signature for resets', () => {
    expect(identityOrder(3)).toEqual([0, 1, 2])
    expect(columnSignature(columns)).toBe('id\u0000name\u0000total')
  })
})

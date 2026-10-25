import { describe, expect, it } from 'vitest'
import { planTextOf } from '../../src/client/plan'

function result(columns, rows) {
  return {
    columns: columns.map((name) => ({ name, typeName: 'VARCHAR' })),
    rows,
    rowCount: rows.length,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
    sql: 'EXPLAIN SELECT 1',
  }
}

describe('planTextOf', () => {
  it('returns null when there is no plan', () => {
    expect(planTextOf(null)).toBeNull()
    expect(planTextOf(undefined)).toBeNull()
  })

  it('returns null for tabular plans that read fine in a grid', () => {
    expect(planTextOf(result(['id', 'table'], [[1, 'orders']]))).toBeNull()
    expect(planTextOf(result(['plan'], []))).toBeNull()
  })

  it('returns null for a single short value that is not a tree', () => {
    expect(planTextOf(result(['plan'], [['1']]))).toBeNull()
    expect(planTextOf(result(['plan'], [['Simple table scan']]))).toBeNull()
  })

  it('keeps MySQL 8 TREE plans as multi-line text', () => {
    const text = '-> Nested loop inner join\n    -> Table scan on o\n    -> Index lookup on c'
    expect(planTextOf(result(['EXPLAIN'], [[text]]))).toBe(text)
  })

  it('joins multi-row text plans and drops trailing blank lines', () => {
    const text = planTextOf(result(['QUERY PLAN'], [['Seq Scan on orders'], ['  Filter: (id > 0)'], ['']]))
    expect(text).toBe('Seq Scan on orders\n  Filter: (id > 0)')
  })

  it('renders NULL lines as blank lines instead of "NULL"', () => {
    const text = planTextOf(result(['QUERY PLAN'], [['Seq Scan'], [null], ['Filter']]))
    expect(text).toBe('Seq Scan\n\nFilter')
  })
})

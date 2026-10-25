// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { hideColumns, isHidden, onlyColumn, pruneHidden, toggleHidden, HIDDEN_STORAGE_PREFIX, readHidden, writeHidden } from '../../src/client/columnhide'

const columns = [
  { name: 'id', typeName: 'INT' },
  { name: 'name', typeName: 'VARCHAR' },
  { name: 'total', typeName: 'DECIMAL' },
]
const rows = [
  [1, '手机', '638.00'],
  [2, null, '20.00'],
]

describe('column hiding helpers', () => {
  it('toggles one column and collapses an empty set to null', () => {
    expect(toggleHidden(null, 'name')).toEqual(['name'])
    expect(toggleHidden(['name'], 'name')).toBeNull()
    expect(toggleHidden(['name'], 'total')).toEqual(['name', 'total'])
  })

  it('reports hidden names', () => {
    expect(isHidden(null, 'name')).toBe(false)
    expect(isHidden(['name'], 'name')).toBe(true)
    expect(isHidden(['total'], 'name')).toBe(false)
  })

  it('hides every other column when one column is isolated', () => {
    expect(onlyColumn(columns, 'name')).toEqual(['id', 'total'])
    expect(onlyColumn(columns, 'missing')).toBeNull()
    expect(onlyColumn([columns[0]!], 'id')).toBeNull()
  })

  it('drops remembered names the current result no longer has', () => {
    expect(pruneHidden(['name', 'gone'], columns)).toEqual(['name'])
    expect(pruneHidden(['gone'], columns)).toBeNull()
    expect(pruneHidden(null, columns)).toBeNull()
  })

  it('narrows columns and rows while keeping positions', () => {
    const view = hideColumns(columns, rows, ['name'])
    expect(view.positions).toEqual([0, 2])
    expect(view.columns.map((column) => column.name)).toEqual(['id', 'total'])
    expect(view.rows).toEqual([
      [1, '638.00'],
      [2, '20.00'],
    ])
  })

  it('returns the input untouched when nothing is hidden', () => {
    const view = hideColumns(columns, rows, null)
    expect(view.columns).toBe(columns)
    expect(view.rows).toBe(rows)
    expect(view.positions).toEqual([0, 1, 2])
  })

  it('refuses to hide every column', () => {
    const view = hideColumns(columns, rows, ['id', 'name', 'total'])
    expect(view.columns).toBe(columns)
    expect(view.rows).toBe(rows)
  })

  it('persists a set per grid and clears it on null', () => {
    writeHidden('console:sql', ['name'])
    expect(window.localStorage.getItem(`${HIDDEN_STORAGE_PREFIX}console:sql`)).toBe('["name"]')
    expect(readHidden('console:sql')).toEqual(['name'])
    writeHidden('console:sql', ['name'])
    expect(readHidden('console:sql')).toEqual(['name'])
    writeHidden('console:sql', null)
    expect(readHidden('console:sql')).toBeNull()
  })

  it('ignores malformed storage', () => {
    window.localStorage.setItem(`${HIDDEN_STORAGE_PREFIX}bad`, '{not json')
    expect(readHidden('bad')).toBeNull()
    window.localStorage.setItem(`${HIDDEN_STORAGE_PREFIX}shape`, '{"a":1}')
    expect(readHidden('shape')).toBeNull()
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { hiddenColumnId, hideColumns, isHidden, onlyColumn, pruneHidden, toggleHidden, HIDDEN_STORAGE_PREFIX, readHidden, writeHidden } from '../../src/client/columnhide'

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

  it('keeps duplicate column names independent', () => {
    const duplicate = [
      { name: 'id', typeName: 'INT' },
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
    ]
    const first = hiddenColumnId(duplicate, 0)
    const second = hiddenColumnId(duplicate, 1)
    expect(first).toBe('id')
    expect(second).not.toBe('id')
    const view = hideColumns(duplicate, [[1, 2, '手机']], [second])
    expect(view.positions).toEqual([0, 2])
    expect(view.columns.map((column) => column.name)).toEqual(['id', 'name'])
    expect(onlyColumn(duplicate, second)).toEqual([first, 'name'])
    expect(pruneHidden([first, second], duplicate)).toEqual([first, second])
  })

  it('keeps duplicate column identities when columns are reordered', () => {
    const duplicate = [
      { name: 'id', typeName: 'INT' },
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
    ]
    const second = hiddenColumnId(duplicate, 1)
    const reordered = [duplicate[2]!, duplicate[1]!, duplicate[0]!]
    const view = hideColumns(reordered, [[20, '手机', 1]], [second], duplicate)
    expect(view.positions).toEqual([0, 2])
    expect(view.columns.map((column) => column.name)).toEqual(['name', 'id'])
    expect(view.columns[1]).toBe(duplicate[0])
    expect(onlyColumn(reordered, second, duplicate)).toEqual(['name', 'id'])
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

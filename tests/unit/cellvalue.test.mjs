import { describe, expect, it, vi } from 'vitest'

import { cellValueView, CELL_TEXT_LIMIT, expandTruncatedRows, isTruncatedCellText, TRUNCATED_SUFFIX } from '../../src/client/cellvalue'

describe('grid cell full value', () => {
  it('shows NULL for missing values', () => {
    expect(cellValueView('note', null)).toEqual({ column: 'note', text: 'NULL', pretty: false, truncated: null })
  })

  it('expands JSON containers over several lines', () => {
    const view = cellValueView('config', '{"a":1,"list":[2,3]}')
    expect(view.pretty).toBe(true)
    expect(view.text).toBe('{\n  "a": 1,\n  "list": [\n    2,\n    3\n  ]\n}')
  })

  it('keeps plain text and unparsable text as they are', () => {
    expect(cellValueView('note', 'hello')).toEqual({ column: 'note', text: 'hello', pretty: false, truncated: null })
    expect(cellValueView('note', '{oops}')).toEqual({ column: 'note', text: '{oops}', pretty: false, truncated: null })
    expect(cellValueView('note', '42').pretty).toBe(false)
  })

  it('formats scalar cells exactly like the grid', () => {
    expect(cellValueView('flag', true).text).toBe('true')
    expect(cellValueView('total', 93.02).text).toBe('93.02')
    expect(cellValueView('amount', 12n).text).toBe('12')
  })
})

describe('capped cell text', () => {
  const capped = `${'a'.repeat(CELL_TEXT_LIMIT)}${TRUNCATED_SUFFIX}`

  it('marks a cell the bridge cut so the dialog can ask for the rest', () => {
    expect(isTruncatedCellText(capped)).toBe(true)
    expect(cellValueView('config', capped)).toEqual({
      column: 'config',
      text: capped,
      pretty: false,
      truncated: capped,
    })
  })

  it('does not mistake a shorter value ending like a cut one for a cut one', () => {
    expect(isTruncatedCellText(`${'a'.repeat(10)}${TRUNCATED_SUFFIX}`)).toBe(false)
    expect(cellValueView('config', `${'a'.repeat(10)}${TRUNCATED_SUFFIX}`).truncated).toBeNull()
  })

  it('recognizes a cut whose prefix was shortened to keep a surrogate pair whole', () => {
    // The bridge drops one code unit when a surrogate pair straddles the limit.
    const splitPair = `${'a'.repeat(CELL_TEXT_LIMIT - 1)}${TRUNCATED_SUFFIX}`
    expect(splitPair).toHaveLength(CELL_TEXT_LIMIT - 1 + TRUNCATED_SUFFIX.length)
    expect(isTruncatedCellText(splitPair)).toBe(true)
    expect(cellValueView('config', splitPair).truncated).toBe(splitPair)
  })

  it('leaves complete values alone', () => {
    expect(cellValueView('config', '{"a":1}').truncated).toBeNull()
    expect(cellValueView('config', 'a'.repeat(CELL_TEXT_LIMIT)).truncated).toBeNull()
  })
})

describe('expanding capped cells for export', () => {
  const columns = (...names) => names.map((name) => ({ name, typeName: 'TEXT' }))
  const capped = `${'a'.repeat(CELL_TEXT_LIMIT)}${TRUNCATED_SUFFIX}`

  it('leaves rows untouched when nothing was capped', async () => {
    const cellText = vi.fn()
    const rows = [[1, 'hello'], [2, 'world']]
    expect(await expandTruncatedRows(columns('id', 'note'), rows, cellText)).toBe(rows)
    expect(cellText).not.toHaveBeenCalled()
  })

  it('replaces capped cells with full text and shares one lookup per value', async () => {
    const cellText = vi.fn(async (_column, text) => `full:${text.length}`)
    const rows = [['first', 1], [capped, 2], [capped, 3]]
    const expanded = await expandTruncatedRows(columns('note', 'id'), rows, cellText)

    expect(expanded).toEqual([['first', 1], [`full:${capped.length}`, 2], [`full:${capped.length}`, 3]])
    expect(cellText).toHaveBeenCalledTimes(1)
    expect(cellText).toHaveBeenCalledWith('note', capped)
  })

  it('keeps the capped text when the full value is gone or the lookup fails', async () => {
    const cellText = vi.fn(async (column) => (column === 'gone' ? null : Promise.reject(new Error('offline'))))
    const rows = [[capped, capped]]
    const expanded = await expandTruncatedRows(columns('gone', 'offline'), rows, cellText)

    expect(expanded).toEqual([[capped, capped]])
  })
})

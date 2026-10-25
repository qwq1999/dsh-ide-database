import { describe, expect, it } from 'vitest'

import { cellValueView } from '../../src/client/cellvalue'

describe('grid cell full value', () => {
  it('shows NULL for missing values', () => {
    expect(cellValueView('note', null)).toEqual({ column: 'note', text: 'NULL', pretty: false })
  })

  it('expands JSON containers over several lines', () => {
    const view = cellValueView('config', '{"a":1,"list":[2,3]}')
    expect(view.pretty).toBe(true)
    expect(view.text).toBe('{\n  "a": 1,\n  "list": [\n    2,\n    3\n  ]\n}')
  })

  it('keeps plain text and unparsable text as they are', () => {
    expect(cellValueView('note', 'hello')).toEqual({ column: 'note', text: 'hello', pretty: false })
    expect(cellValueView('note', '{oops}')).toEqual({ column: 'note', text: '{oops}', pretty: false })
    expect(cellValueView('note', '42').pretty).toBe(false)
  })

  it('formats scalar cells exactly like the grid', () => {
    expect(cellValueView('flag', true).text).toBe('true')
    expect(cellValueView('total', 93.02).text).toBe('93.02')
    expect(cellValueView('amount', 12n).text).toBe('12')
  })
})

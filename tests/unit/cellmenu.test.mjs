import { describe, expect, it } from 'vitest'
import { rowToTsv } from '../../src/client/cellmenu.js'

const columns = (...names) => names.map((name) => ({ name, typeName: 'text', kind: 'text' }))

describe('rowToTsv', () => {
  it('keeps one line even when a cell contains tabs or newlines', () => {
    expect(rowToTsv(columns('id', 'note'), [7, 'a\tb\nc'])).toBe('7\ta b c')
    expect(rowToTsv(columns('id', 'note'), [7, 'a\r\nb'])).toBe('7\ta b')
  })

  it('writes NULL as an empty cell', () => {
    expect(rowToTsv(columns('id', 'note'), [null, 'x'])).toBe('\tx')
  })

  it('escapes spreadsheet formulas in copied rows', () => {
    expect(rowToTsv(columns('note'), ['=HYPERLINK("http://evil.test")'])).toBe('\'=HYPERLINK("http://evil.test")')
    expect(rowToTsv(columns('amount'), ['-42'])).toBe('-42')
  })
})

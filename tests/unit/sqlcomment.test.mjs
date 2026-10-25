import { describe, expect, it } from 'vitest'

import { toggleSqlComment } from '../../src/client/sqlcomment'

const SQL = ['SELECT id,', '       name', 'FROM users'].join('\n')

describe('toggleSqlComment', () => {
  it('comments the line holding the caret', () => {
    const edited = toggleSqlComment(SQL, 7, 7)
    expect(edited.text).toBe(['-- SELECT id,', '       name', 'FROM users'].join('\n'))
    expect(edited.selectionStart).toBe(0)
    expect(edited.selectionEnd).toBe(13)
  })

  it('comments every selected line and keeps indentation', () => {
    const edited = toggleSqlComment(SQL, 0, SQL.length)
    expect(edited.text).toBe(['-- SELECT id,', '       -- name', '-- FROM users'].join('\n'))
  })

  it('leaves blank lines alone', () => {
    const text = ['SELECT 1;', '', 'SELECT 2;'].join('\n')
    const edited = toggleSqlComment(text, 0, text.length)
    expect(edited.text).toBe(['-- SELECT 1;', '', '-- SELECT 2;'].join('\n'))
  })

  it('toggles comments back off', () => {
    const text = ['-- SELECT 1;', '--   FROM users'].join('\n')
    const edited = toggleSqlComment(text, 0, text.length)
    expect(edited.text).toBe(['SELECT 1;', '  FROM users'].join('\n'))
  })

  it('removes a bare comment marker without eating code', () => {
    const edited = toggleSqlComment('--SELECT 1;', 0, 0)
    expect(edited.text).toBe('SELECT 1;')
  })

  it('comments the whole block when only some lines are commented', () => {
    const text = ['-- SELECT 1;', 'SELECT 2;'].join('\n')
    const edited = toggleSqlComment(text, 0, text.length)
    expect(edited.text).toBe(['-- -- SELECT 1;', '-- SELECT 2;'].join('\n'))
  })

  it('does not drag the next line in when the selection ends on a line break', () => {
    const text = ['SELECT 1;', 'SELECT 2;'].join('\n')
    const edited = toggleSqlComment(text, 0, 'SELECT 1;\n'.length)
    expect(edited.text).toBe(['-- SELECT 1;', 'SELECT 2;'].join('\n'))
  })

  it('keeps a selection that covers the block for the next toggle', () => {
    const once = toggleSqlComment(SQL, 0, SQL.length)
    const twice = toggleSqlComment(once.text, once.selectionStart, once.selectionEnd)
    expect(twice.text).toBe(SQL)
  })

  it('clamps offsets beyond the statement', () => {
    const edited = toggleSqlComment('SELECT 1;', 99, 200)
    expect(edited.text).toBe('-- SELECT 1;')
  })
})

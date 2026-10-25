import { describe, expect, it } from 'vitest'

import { MAX_SQL_IMPORT_BYTES, mergeSqlFile, scriptFileText } from '../../src/client/sqlfile'

describe('mergeSqlFile', () => {
  it('fills an empty editor with the script', () => {
    expect(mergeSqlFile('', 'SELECT 1;\n', 0)).toEqual({ text: 'SELECT 1;\n', caret: 9 })
  })

  it('starts on a fresh line when the caret sits after text', () => {
    expect(mergeSqlFile('SELECT 1', 'SELECT 2;', 8)).toEqual({
      text: 'SELECT 1\nSELECT 2;\n',
      caret: 18,
    })
  })

  it('keeps text after the caret on its own line', () => {
    expect(mergeSqlFile('a\nb', 'inserted', 2)).toEqual({ text: 'a\ninserted\nb', caret: 10 })
  })

  it('does not add a blank line when the text after the caret already breaks', () => {
    expect(mergeSqlFile('a\n\nrest', 'inserted', 2)).toEqual({ text: 'a\ninserted\nrest', caret: 10 })
  })

  it('normalises CRLF and trims surrounding blank lines', () => {
    expect(mergeSqlFile('', '\r\nSELECT 1;\r\nSELECT 2;\r\n\r\n', 0).text).toBe('SELECT 1;\nSELECT 2;\n')
  })

  it('leaves the editor alone for an empty file', () => {
    expect(mergeSqlFile('SELECT 1', '   \n\t\r\n', 4)).toEqual({ text: 'SELECT 1', caret: 4 })
  })

  it('clamps a caret that is out of range', () => {
    expect(mergeSqlFile('ab', 'cd', 99).text).toBe('ab\ncd\n')
    expect(mergeSqlFile('ab', 'cd', -3).text).toBe('cd\nab')
  })

  it('exposes a two megabyte ceiling for the file picker', () => {
    expect(MAX_SQL_IMPORT_BYTES).toBe(2 * 1024 * 1024)
  })
})

describe('scriptFileText', () => {
  it('ends the script with exactly one newline', () => {
    expect(scriptFileText('SELECT 1')).toBe('SELECT 1\n')
    expect(scriptFileText('SELECT 1\n\n\n')).toBe('SELECT 1\n')
  })

  it('keeps inner blank lines and comments untouched', () => {
    expect(scriptFileText('-- note\nSELECT 1;\n\nSELECT 2;\n')).toBe('-- note\nSELECT 1;\n\nSELECT 2;\n')
  })

  it('normalises CRLF so a Windows script round-trips as LF', () => {
    expect(scriptFileText('SELECT 1;\r\nSELECT 2;\r\n')).toBe('SELECT 1;\nSELECT 2;\n')
  })

  it('treats whitespace-only text as empty', () => {
    expect(scriptFileText(' \n\t\r\n ')).toBe('')
  })
})

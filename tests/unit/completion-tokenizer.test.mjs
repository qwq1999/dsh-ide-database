import { describe, expect, it } from 'vitest'

import { maskCommentsAndStrings, tokenize } from '../../src/client/completion/tokenizer'

const kinds = (text) => tokenize(text).map((token) => `${token.kind}:${token.text}`)

describe('tokenize', () => {
  it('lexes a simple statement with source offsets', () => {
    const tokens = tokenize('SELECT * FROM orders WHERE id = 1')
    expect(tokens[0]).toEqual({
      kind: 'keyword',
      text: 'SELECT',
      lower: 'select',
      start: 0,
      end: 6,
    })
    expect(tokens.map((token) => [token.kind, token.text, token.start, token.end])).toEqual([
      ['keyword', 'SELECT', 0, 6],
      ['punct', '*', 7, 8],
      ['keyword', 'FROM', 9, 13],
      ['ident', 'orders', 14, 20],
      ['keyword', 'WHERE', 21, 26],
      ['ident', 'id', 27, 29],
      ['punct', '=', 30, 31],
      ['number', '1', 32, 33],
    ])
  })

  it('keeps the case the user typed on keywords', () => {
    const token = tokenize('select 1').at(0)
    expect(token?.text).toBe('select')
    expect(token?.lower).toBe('select')
    expect(token?.kind).toBe('keyword')
  })

  it('unquotes double quoted, backtick and bracket identifiers', () => {
    const tokens = tokenize('SELECT * FROM "shop"."orders", `order_items`, [crm].[users]')
    const idents = tokens.filter((token) => token.kind === 'ident')
    expect(idents.map((token) => token.text)).toEqual([
      'shop',
      'orders',
      'order_items',
      'crm',
      'users',
    ])
    expect(idents.every((token) => token.quoted === true)).toBe(true)
    expect(idents[0]?.start).toBe(14)
    expect(idents[0]?.end).toBe(20)
  })

  it('lexes a multi-character unquoted identifier', () => {
    const tokens = tokenize('SELECT 订单, col$1, user_name FROM t')
    const idents = tokens.filter((token) => token.kind === 'ident')
    expect(idents.map((token) => token.text)).toEqual(['订单', 'col$1', 'user_name', 't'])
  })

  it('reports string literals and treats doubled quotes as an escape', () => {
    const tokens = tokenize("SELECT 'it''s', 1")
    expect(tokens.find((token) => token.kind === 'string')?.text).toBe("'it''s'")
    expect(tokens.filter((token) => token.kind === 'number').map((token) => token.text)).toEqual(['1'])
  })

  it('drops line and block comments instead of tokenizing them', () => {
    expect(kinds('SELECT 1 -- trailing comment\nFROM orders')).toEqual([
      'keyword:SELECT',
      'number:1',
      'keyword:FROM',
      'ident:orders',
    ])
    expect(kinds('SELECT /* block, with ; and FROM */ 2')).toEqual([
      'keyword:SELECT',
      'number:2',
    ])
  })

  it('never throws on half-written input', () => {
    expect(() => tokenize("SELECT 'unterminated")).not.toThrow()
    expect(() => tokenize('SELECT /* unterminated')).not.toThrow()
    expect(() => tokenize('SELECT "unterminated')).not.toThrow()
    expect(kinds("SELECT 'unterminated")).toEqual(['keyword:SELECT', "string:'unterminated"])
    expect(kinds('SELECT /* unterminated')).toEqual(['keyword:SELECT'])
  })

  it('lexes placeholders and the standard parameter prefixes', () => {
    expect(kinds('WHERE id = ? AND name = :name AND x = @x AND y = @@global')).toEqual([
      'keyword:WHERE',
      'ident:id',
      'punct:=',
      'param:?',
      'keyword:AND',
      'ident:name',
      'punct:=',
      'param::name',
      'keyword:AND',
      'ident:x',
      'punct:=',
      'param:@x',
      'keyword:AND',
      'ident:y',
      'punct:=',
      'param:@@global',
    ])
  })

  it('lexes :: and := one character at a time', () => {
    expect(kinds('a::int := b')).toEqual([
      'ident:a',
      'punct::',
      'punct::',
      'ident:int',
      'punct::',
      'punct:=',
      'ident:b',
    ])
  })

  it('lexes decimal numbers as one token', () => {
    expect(kinds('SELECT 3.14, 42')).toEqual(['keyword:SELECT', 'number:3.14', 'punct:,', 'number:42'])
  })
})

describe('maskCommentsAndStrings', () => {
  it('keeps the text length and blanks comments and string literals', () => {
    const text = "SELECT * FROM t -- note\nWHERE x = 'a;b' /* more */"
    const masked = maskCommentsAndStrings(text)
    expect(masked).toHaveLength(text.length)
    expect(masked).not.toContain('note')
    expect(masked).not.toContain('more')
    expect(masked).not.toContain("'a;b'")
    expect(masked).toContain('\n')
    expect(masked.split('\n')).toHaveLength(text.split('\n').length)
    expect(masked.indexOf('\n')).toBe(text.indexOf('\n'))
  })

  it('leaves quoted identifiers alone so qualified names still parse', () => {
    const text = 'SELECT * FROM "shop"."orders" WHERE `id` = 1'
    expect(maskCommentsAndStrings(text)).toBe(text)
  })

  it('does not throw on unterminated comments or strings', () => {
    expect(() => maskCommentsAndStrings('SELECT /* x')).not.toThrow()
    expect(() => maskCommentsAndStrings("SELECT 'x")).not.toThrow()
    expect(maskCommentsAndStrings("SELECT 'x").endsWith(' ')).toBe(true)
  })
})

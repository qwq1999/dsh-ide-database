import { describe, expect, it } from 'vitest'
import { applyCompletion, qualifierBefore, wordAtCaret } from '../../src/client/completion/edit'

describe('applyCompletion', () => {
  it('inserts snippets verbatim instead of quoting them as identifiers', () => {
    const result = applyCompletion('SELECT 1 ', 9, 'SELECT * FROM ', 'mysql', 'snippet')
    expect(result.statement).toBe('SELECT 1 SELECT * FROM ')
    expect(result.caret).toBe(result.statement.length)
    expect(result.statement).not.toContain('`')
  })

  it('replaces the partially typed word when a snippet is picked', () => {
    const result = applyCompletion('SELE', 4, 'SELECT * FROM ', 'mysql', 'snippet')
    expect(result.statement).toBe('SELECT * FROM ')
    expect(result.caret).toBe('SELECT * FROM '.length)
  })

  it('inserts plain identifiers without quotes', () => {
    const result = applyCompletion('SELECT * FROM ', 14, 'orders', 'mysql')
    expect(result.statement).toBe('SELECT * FROM orders')
    expect(result.caret).toBe('SELECT * FROM orders'.length)
  })

  it('quotes names that are not plain identifiers', () => {
    const result = applyCompletion('SELECT * FROM ', 14, 'order items', 'mysql')
    expect(result.statement).toBe('SELECT * FROM `order items`')
  })

  it('keeps the old behaviour for function candidates (kind is optional)', () => {
    const call = applyCompletion('SELECT ', 7, 'COUNT(', 'oracle', 'function')
    expect(call.statement).toBe('SELECT COUNT(')
    const legacy = applyCompletion('SELECT ', 7, 'COUNT(', 'oracle')
    expect(legacy.statement).toBe('SELECT COUNT(')
  })

  it('keeps the opening quote the user typed', () => {
    const result = applyCompletion('SELECT * FROM `ord', 18, 'orders', 'mysql')
    expect(result.statement).toBe('SELECT * FROM `orders`')
    expect(result.caret).toBe('SELECT * FROM `orders`'.length)
  })

  it('keeps case-sensitive quoted names quoted', () => {
    const result = applyCompletion('SELECT * FROM "Ord', 18, 'Orders', 'postgres')
    expect(result.statement).toBe('SELECT * FROM "Orders"')
  })
})

describe('wordAtCaret / qualifierBefore', () => {
  it('reports the word under the caret', () => {
    const statement = 'SELECT * FROM orders WHERE id'
    const word = wordAtCaret(statement, statement.length)
    expect(word.prefix).toBe('id')
  })

  it('reports the dotted qualifier before a dot', () => {
    expect(qualifierBefore('SELECT * FROM shop.orders.', 26)).toEqual(['shop', 'orders'])
  })
})

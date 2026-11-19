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

  it('inserts an explicit Completion.insert verbatim instead of quoting it as one identifier', () => {
    // A column expansion (name '*', insert 'id, total, created_at') and a join
    // expression are ready-to-use SQL fragments, not identifiers to backtick.
    const expanded = applyCompletion('SELECT ', 7, 'id, total, created_at', 'mysql', 'column', true)
    expect(expanded.statement).toBe('SELECT id, total, created_at')
    expect(expanded.caret).toBe(expanded.statement.length)

    const join = applyCompletion('SELECT * FROM o ', 16, 'customers c ON c.id = o.customer_id', 'mysql', 'table', true)
    expect(join.statement).toBe('SELECT * FROM o customers c ON c.id = o.customer_id')
    expect(join.statement).not.toContain('`')
  })

  it('closes an MSSQL bracket-quoted identifier the user started typing', () => {
    const word = wordAtCaret('SELECT * FROM [ord', 18)
    expect(word.quote).toBe('[')
    const result = applyCompletion('SELECT * FROM [ord', 18, 'orders', 'mssql', 'table')
    expect(result.statement).toBe('SELECT * FROM [orders]')
    expect(result.caret).toBe(result.statement.length)
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

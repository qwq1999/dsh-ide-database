import { describe, expect, it } from 'vitest'

import {
  aliasCandidates,
  columnCandidates,
  cteCandidates,
  schemaCandidates,
  snippetCandidates,
  starCandidate,
  tableCandidates,
} from '../../src/client/completion/providers'

describe('snippetCandidates', () => {
  it('offers 4 to 6 statement templates', () => {
    const snippets = snippetCandidates('mysql')
    expect(snippets.length).toBeGreaterThanOrEqual(4)
    expect(snippets.length).toBeLessThanOrEqual(6)
  })

  it('marks them as snippets with the template as insert text', () => {
    for (const snippet of snippetCandidates('mysql')) {
      expect(snippet.kind).toBe('snippet')
      expect(snippet.insert).toBe(snippet.name)
      expect(snippet.detail).toBeTruthy()
    }
  })

  it('contains the common query, insert and update templates', () => {
    const names = snippetCandidates('mysql').map((snippet) => snippet.name)
    expect(names).toContain('SELECT * FROM ')
    expect(names).toContain('INSERT INTO ')
    expect(names).toContain('UPDATE ')
    expect(names).toContain('DELETE FROM ')
  })

  it('does not repeat a template', () => {
    const names = snippetCandidates('oracle').map((snippet) => snippet.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('tableCandidates', () => {
  it('marks views and keeps catalog order', () => {
    const items = tableCandidates([
      { name: 'orders', kind: 'table' },
      { name: 'order_items', kind: 'view' },
    ])
    expect(items).toEqual([
      { name: 'orders', kind: 'table' },
      { name: 'order_items', kind: 'table', detail: '视图' },
    ])
  })

  it('shows the schema of a table when one is known', () => {
    expect(tableCandidates([{ name: 'orders', kind: 'table' }], 'shop')).toEqual([
      { name: 'orders', kind: 'table', detail: 'shop' },
    ])
  })
})

describe('catalog derived candidates', () => {
  it('turns schema names into schema candidates and skips the empty one', () => {
    expect(schemaCandidates(['shop', '', 'crm'])).toEqual([
      { name: 'shop', kind: 'schema' },
      { name: 'crm', kind: 'schema' },
    ])
  })

  it('deduplicates columns case-insensitively and keeps their type', () => {
    expect(
      columnCandidates([
        { name: 'id', typeName: 'INT' },
        { name: 'ID', typeName: 'INT' },
        { name: 'total', typeName: 'DECIMAL' },
      ]),
    ).toEqual([
      { name: 'id', kind: 'column', detail: 'INT' },
      { name: 'total', kind: 'column', detail: 'DECIMAL' },
    ])
  })

  it('builds the star candidate', () => {
    expect(starCandidate()).toEqual({ name: '*', kind: 'column', detail: '所有列' })
  })

  it('builds an expanding star candidate', () => {
    expect(starCandidate('id, total', 2)).toEqual({
      name: '*',
      kind: 'column',
      detail: '展开 2 列',
      insert: 'id, total',
    })
  })

  it('labels CTE names as tables with a CTE hint', () => {
    expect(cteCandidates(['x', 'x', ''])).toEqual([
      { name: 'x', kind: 'table', detail: 'CTE' },
    ])
  })

  it('labels derived table aliases as subqueries', () => {
    expect(aliasCandidates([{ table: '', alias: 'd' }])).toEqual([
      { name: 'd', kind: 'alias', detail: '子查询' },
    ])
  })

  it('labels relation aliases with the table they point at', () => {
    expect(aliasCandidates([{ schema: 'shop', table: 'orders', alias: 'o' }])).toEqual([
      { name: 'o', kind: 'alias', detail: 'shop.orders' },
    ])
  })
})

import { describe, expect, it } from 'vitest'

import { treeFilterSummary } from '../../src/client/views/tree-rows.ts'

const mysql = { id: 'c1', name: '演示 MySQL', dialect: 'mysql', redisDb: 0 }
const redis = { id: 'r1', name: '演示 Redis', dialect: 'redis', redisDb: 0 }

const schemas = { c1: [{ name: 'shop' }, { name: 'crm' }] }
const objects = {
  'c1:shop': [
    { name: 'orders', kind: 'table' },
    { name: 'customers', kind: 'table' },
  ],
  'c1:crm': [{ name: 'companies', kind: 'table' }],
}

function summary(overrides = {}) {
  return treeFilterSummary({
    connections: [mysql],
    schemas,
    objects,
    visibleSchemas: {},
    redisKeys: {},
    filter: '',
    ...overrides,
  })
}

describe('treeFilterSummary', () => {
  it('counts a schema-name hit even when no table matches', () => {
    // The tree shows the `shop` schema row; saying nothing matched would
    // contradict the rows right below the message.
    expect(summary({ filter: 'sho' })).toEqual({ connections: 1, objects: 0 })
  })

  it('counts the objects a plain filter matches', () => {
    expect(summary({ filter: 'cust' })).toEqual({ connections: 1, objects: 1 })
    expect(summary({ filter: 'c' })).toEqual({ connections: 1, objects: 2 })
  })

  it('applies both halves of a qualified filter', () => {
    expect(summary({ filter: 'shop.ord' })).toEqual({ connections: 1, objects: 1 })
    expect(summary({ filter: 'crm.ord' })).toEqual({ connections: 0, objects: 0 })
    expect(summary({ filter: 'shop.' })).toEqual({ connections: 1, objects: 2 })
  })

  it('counts a table whose comment matches the filter', () => {
    const commented = {
      'c1:shop': [
        { name: 'ec_contract_signatory', kind: 'table', comment: '合同签署方' },
        { name: 'customers', kind: 'table' },
      ],
      'c1:crm': [{ name: 'companies', kind: 'table' }],
    }

    expect(summary({ filter: '合同', objects: commented })).toEqual({ connections: 1, objects: 1 })
  })

  it('does not count objects inside a schema hidden by the row picker', () => {
    expect(summary({ filter: 'ord', visibleSchemas: { c1: ['crm'] } })).toEqual({ connections: 0, objects: 0 })
    expect(summary({ filter: 'ord', visibleSchemas: { c1: ['shop'] } })).toEqual({ connections: 1, objects: 1 })
  })

  it('counts a data-source-name hit as something visible', () => {
    expect(summary({ filter: 'mysql' })).toEqual({ connections: 1, objects: 0 })
  })

  it('reports nothing for a filter that matches no row', () => {
    expect(summary({ filter: 'zzz' })).toEqual({ connections: 0, objects: 0 })
    expect(summary({ filter: 'companies', objects: { 'c1:shop': objects['c1:shop'] } })).toEqual({
      connections: 0,
      objects: 0,
    })
  })

  it('treats a Redis key hit as a visible match', () => {
    expect(
      summary({
        connections: [redis],
        schemas: {},
        objects: {},
        redisKeys: { r1: { 0: [{ key: 'user:1', type: 'string' }] } },
        filter: 'user',
      }),
    ).toEqual({ connections: 1, objects: 0 })
  })

  it('waits for the first Redis scan instead of claiming no match', () => {
    expect(
      summary({ connections: [redis], schemas: {}, objects: {}, redisKeys: {}, filter: 'user' }),
    ).toEqual({ connections: 1, objects: 0 })
  })
})

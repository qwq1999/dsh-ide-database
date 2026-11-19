import { describe, expect, it } from 'vitest'
import { filterTargets, matchesFilteredObject, parseFilter } from '../../src/client/treefilter.ts'

const connections = [
  { id: 'demo-mysql', name: '演示 MySQL' },
  { id: 'demo-redis', name: '演示 Redis' },
]
const schemas = {
  'demo-mysql': [{ name: 'shop' }, { name: 'crm' }, { name: 'mysql' }],
}
const objects = {
  'demo-mysql:shop': [{ name: 'orders' }, { name: 'customers' }],
  'demo-mysql:crm': [{ name: 'companies' }],
}

describe('filterTargets', () => {
  it('opens the data source when its name matches', () => {
    expect(filterTargets('redis', connections, schemas, objects, {})).toEqual({
      connections: ['demo-redis'],
      schemas: [],
    })
  })

  it('opens matching schemas even when the data source is already expanded', () => {
    const targets = filterTargets('shop', connections, schemas, objects, { 'demo-mysql': true })
    expect(targets).toEqual({ connections: [], schemas: ['demo-mysql:shop'] })
  })

  it('opens the schema that contains an object match', () => {
    const targets = filterTargets('orders', connections, schemas, objects, { 'demo-mysql': true })
    expect(targets).toEqual({ connections: [], schemas: ['demo-mysql:shop'] })
  })

  it('skips branches that are already open and ignores unrelated filters', () => {
    const open = { 'demo-mysql': true, 'demo-mysql:shop': true }
    expect(filterTargets('orders', connections, schemas, objects, open)).toEqual({ connections: [], schemas: [] })
    expect(filterTargets('nothing', connections, schemas, objects, {})).toEqual({ connections: [], schemas: [] })
    expect(filterTargets('   ', connections, schemas, objects, {})).toEqual({ connections: [], schemas: [] })
  })

  it('does not mistake a folder of one schema for another schema being open', () => {
    const unusual = {
      'demo-mysql': [{ name: 'a' }, { name: 'a#columns' }],
    }
    const targets = filterTargets('a#columns', connections, unusual, {}, {
      'demo-mysql': true,
      // This is the folder key schema `a` used to produce, and the old schema
      // key of schema `a#columns`; they must no longer be the same branch.
      'demo-mysql:a#columns': true,
    })
    expect(targets).toEqual({ connections: [], schemas: ['demo-mysql:a#columns'] })
  })
})

describe('qualified filters', () => {
  it('splits 库.表 into schema and object halves', () => {
    expect(parseFilter('shop.orders')).toEqual({ schema: 'shop', name: 'orders' })
    expect(parseFilter('  Shop.Ord ')).toEqual({ schema: 'shop', name: 'ord' })
    expect(parseFilter('orders')).toEqual({ schema: '', name: 'orders' })
    expect(parseFilter('shop.')).toEqual({ schema: 'shop', name: '' })
    expect(parseFilter(' . ')).toEqual({ schema: '', name: '' })
  })

  it('matches objects by schema and name together', () => {
    const query = parseFilter('shop.ord')
    expect(matchesFilteredObject(query, 'shop', 'orders')).toBe(true)
    expect(matchesFilteredObject(query, 'crm', 'orders')).toBe(false)
    expect(matchesFilteredObject(query, 'shop', 'customers')).toBe(false)
    expect(matchesFilteredObject(parseFilter('ord'), 'crm', 'orders')).toBe(true)
    expect(matchesFilteredObject(parseFilter('shop.'), 'shop', 'customers')).toBe(true)
    expect(matchesFilteredObject(parseFilter('shop.'), 'crm', 'customers')).toBe(false)
  })

  it('opens the schema that holds a qualified match', () => {
    expect(filterTargets('shop.ord', connections, schemas, objects, { 'demo-mysql': true })).toEqual({
      connections: [],
      schemas: ['demo-mysql:shop'],
    })
    expect(filterTargets('shop.customers', connections, schemas, objects, { 'demo-mysql': true })).toEqual({
      connections: [],
      schemas: ['demo-mysql:shop'],
    })
  })

  it('does not treat an empty object half as a match for other schemas', () => {
    expect(filterTargets('crm.', connections, schemas, objects, {})).toEqual({
      connections: ['demo-mysql'],
      schemas: ['demo-mysql:crm'],
    })
  })
})

describe('comment matching', () => {
  const commented = {
    'demo-mysql:shop': [
      { name: 'orders', kind: 'table', comment: '订单主表' },
      { name: 'ec_contract_signatory', kind: 'table', comment: '合同签署方' },
    ],
  }

  it('matches an object by a fragment of its comment', () => {
    expect(matchesFilteredObject(parseFilter('合同'), 'shop', 'ec_contract_signatory', '合同签署方')).toBe(true)
    expect(matchesFilteredObject(parseFilter('签署'), 'shop', 'ec_contract_signatory', '合同签署方')).toBe(true)
    expect(matchesFilteredObject(parseFilter('合同'), 'shop', 'ec_contract_signatory')).toBe(false)
    expect(matchesFilteredObject(parseFilter('合同'), 'shop', 'orders', '订单主表')).toBe(false)
    expect(matchesFilteredObject(parseFilter('MASTER'), 'shop', 'sales', 'Order master')).toBe(true)
  })

  it('still requires the schema half of a qualified filter to match', () => {
    const query = parseFilter('shop.签署')
    expect(matchesFilteredObject(query, 'shop', 'ec_contract_signatory', '合同签署方')).toBe(true)
    expect(matchesFilteredObject(query, 'crm', 'ec_contract_signatory', '合同签署方')).toBe(false)
    expect(matchesFilteredObject(parseFilter('shop.'), 'shop', 'ec_contract_signatory', '合同签署方')).toBe(true)
  })

  it('opens the schema holding a comment hit', () => {
    expect(filterTargets('合同', connections, schemas, commented, {})).toEqual({
      connections: ['demo-mysql'],
      schemas: ['demo-mysql:shop'],
    })
    expect(filterTargets('合同', connections, schemas, commented, { 'demo-mysql': true })).toEqual({
      connections: [],
      schemas: ['demo-mysql:shop'],
    })
    expect(
      filterTargets('合同', connections, schemas, commented, { 'demo-mysql': true, 'demo-mysql:shop': true }),
    ).toEqual({ connections: [], schemas: [] })
  })
})


describe('parseFilter dotted halves', () => {
  it('trims whitespace around the dot', () => {
    expect(parseFilter('shop . orders')).toEqual({ schema: 'shop', name: 'orders' })
    expect(parseFilter('  SHOP . ORDERS  ')).toEqual({ schema: 'shop', name: 'orders' })
    expect(parseFilter('shop.')).toEqual({ schema: 'shop', name: '' })
  })
})

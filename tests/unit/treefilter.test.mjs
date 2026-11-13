import { describe, expect, it } from 'vitest'
import { filterTargets, matchTree, matchesFilteredObject, parseFilter } from '../../src/client/treefilter.ts'

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

describe('matchTree', () => {
  it('collects every hit key and count in one pass', () => {
    const result = matchTree('ord', connections, schemas, objects)
    expect(result.query).toEqual({ schema: '', name: 'ord' })
    expect([...result.objectHits]).toEqual(['demo-mysql|shop.orders'])
    expect([...result.schemaHits]).toEqual([])
    expect([...result.connectionHits]).toEqual(['demo-mysql'])
    expect(Object.keys(result.objectsBySchema)).toEqual(['demo-mysql:shop'])
    expect(result.objectsBySchema['demo-mysql:shop'].map((item) => item.name)).toEqual(['orders'])
    expect(result.counts).toEqual({ connections: 1, objects: 1 })
  })

  it('matches qualified filters case-insensitively without touching other schemas', () => {
    const result = matchTree('SHOP.ORD', connections, schemas, objects)
    expect([...result.objectHits]).toEqual(['demo-mysql|shop.orders'])
    expect([...result.schemaHits]).toEqual(['demo-mysql:shop'])
    expect(result.counts).toEqual({ connections: 1, objects: 1 })
    expect(matchTree('crm.', connections, schemas, objects).counts).toEqual({ connections: 1, objects: 1 })
    expect([...matchTree('crm.', connections, schemas, objects).objectHits]).toEqual([
      'demo-mysql|crm.companies',
    ])
  })

  it('treats an empty or blank filter as no match', () => {
    for (const filter of ['', '   ', ' . ']) {
      const result = matchTree(filter, connections, schemas, objects)
      expect(result.objectHits.size).toBe(0)
      expect(result.schemaHits.size).toBe(0)
      expect(result.connectionHits.size).toBe(0)
      expect(result.counts).toEqual({ connections: 0, objects: 0 })
    }
  })

  it('records a schema hit for the object half of a qualified filter', () => {
    const result = matchTree('shop.orders', connections, schemas, objects)
    expect([...result.schemaHits]).toEqual(['demo-mysql:shop'])
    expect([...result.connectionHits]).toEqual(['demo-mysql'])
    expect(result.counts).toEqual({ connections: 1, objects: 1 })
  })

  it('counts a data source once when several of its schemas match', () => {
    const manySchemas = { 'demo-mysql': [{ name: 'shop' }, { name: 'shop_archive' }] }
    const result = matchTree('shop.', connections, manySchemas, {})
    expect([...result.schemaHits]).toEqual(['demo-mysql:shop', 'demo-mysql:shop_archive'])
    expect(result.counts).toEqual({ connections: 1, objects: 0 })
  })
})

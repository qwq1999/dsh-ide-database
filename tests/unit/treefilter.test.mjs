import { describe, expect, it } from 'vitest'
import { filterTargets } from '../../src/client/treefilter.ts'

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

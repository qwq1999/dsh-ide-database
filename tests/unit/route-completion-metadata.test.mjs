import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'
import { completionColumnKey } from '../../src/shared/completionkey'

const servers = []
const calls = { structureGet: [], structureDescription: [], sql: [], redis: [] }

const mysql = {
  id: 'm1',
  name: '演示 MySQL',
  driver: 'mysql',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  hasPassword: true,
  database: 'shop',
  redisDb: 0,
  params: {},
  readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const uncached = { ...mysql, id: 'm2', name: '未缓存的 MySQL' }
const redis = { ...mysql, id: 'r1', name: '演示 Redis', driver: 'redis', dialect: 'redis', port: 6379, database: '' }
const proto = { ...mysql, id: 'm3', name: '特殊 schema' }

const PROTO_OBJECTS = Object.create(null)
PROTO_OBJECTS['__proto__'] = [{ name: 'orders', kind: 'table' }]

const PROTO_CACHED = {
  fetchedAt: '2026-02-01T00:00:00.000Z',
  schemas: [{ name: '__proto__' }],
  objects: PROTO_OBJECTS,
  descriptions: {},
}

const CACHED = {
  fetchedAt: '2026-02-01T00:00:00.000Z',
  schemas: [{ name: 'crm', system: true }, { name: 'shop' }],
  objects: {
    crm: [{ name: 'customers', kind: 'table' }],
    shop: [
      { name: 'orders', kind: 'table' },
      { name: 'order_items', kind: 'view' },
    ],
  },
  descriptions: {},
}

const DESCRIPTIONS = {
  [completionColumnKey('shop', 'orders')]: {
    schema: 'shop',
    table: 'orders',
    kind: 'table',
    columns: [
      { name: 'id', typeName: 'INT' },
      { name: 'total', typeName: 'DECIMAL' },
      { name: 'note', typeName: '' },
    ],
    indexes: [],
  },
  [completionColumnKey('a.b', 'c')]: {
    schema: 'a.b',
    table: 'c',
    kind: 'table',
    columns: [{ name: 'left' }],
    indexes: [],
  },
  [completionColumnKey('a', 'b.c')]: {
    schema: 'a',
    table: 'b.c',
    kind: 'table',
    columns: [{ name: 'right' }],
    indexes: [],
  },
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
  for (const list of Object.values(calls)) list.length = 0
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: {
      settings: () => ({}),
      snapshot: () => ({}),
      connection: (id) => ({ m1: mysql, m2: uncached, r1: redis, m3: proto })[id],
    },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {
      schemas: async () => {
        calls.sql.push('schemas')
        return []
      },
      objects: async () => {
        calls.sql.push('objects')
        return []
      },
      describe: async () => {
        calls.sql.push('describe')
        return {}
      },
    },
    redis: {},
    structure: {
      snapshotJson: () => '{}',
      fetchedAt: (id) => (id === 'm1' ? CACHED.fetchedAt : undefined),
      get: (id) => {
        calls.structureGet.push(id)
        return id === 'm1' ? CACHED : id === 'm3' ? PROTO_CACHED : undefined
      },
      getDescription: (id, schema, table) => {
        calls.structureDescription.push(`${id}:${schema}.${table}`)
        return id === 'm1' ? DESCRIPTIONS[completionColumnKey(schema, table)] : undefined
      },
    },
    log: () => undefined,
  }
}

async function start(path) {
  const handler = createRouteHandler(deps())
  const server = createServer((request, response) => {
    void handler(request, response)
  })
  servers.push(server)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  return `http://127.0.0.1:${String(address.port)}${ROUTE_PREFIX}${path}`
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)
    const request = httpRequest(
      url,
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          resolve({ status: response.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) })
        })
      },
    )
    request.on('error', reject)
    request.end(payload)
  })
}

describe('POST /completion/metadata over HTTP', () => {
  it('returns the cached schemas, tables and columns in one read', async () => {
    const url = await start('/completion/metadata')

    const result = await post(url, {
      id: 'm1',
      schemas: ['shop', 'crm', 'missing'],
      tables: [
        { schema: 'shop', table: 'orders' },
        { schema: 'crm', table: 'customers' },
        { schema: 'shop', table: 'unknown' },
      ],
    })

    expect(result.status).toBe(200)
    expect(result.body).toEqual({
      ok: true,
      data: {
        cached: true,
        schemas: CACHED.schemas,
        tables: { shop: CACHED.objects.shop, crm: CACHED.objects.crm },
        columns: {
          [completionColumnKey('shop', 'orders')]: [{ name: 'id', typeName: 'INT' }, { name: 'total', typeName: 'DECIMAL' }, { name: 'note' }],
        },
      },
    })
    // Pure cache read: no SQL bridge call, only the requested descriptions.
    expect(calls.sql).toEqual([])
    expect(calls.structureDescription).toEqual([
      'm1:shop.orders',
      'm1:crm.customers',
      'm1:shop.unknown',
    ])
  })

  it('keeps dotted schemas and tables apart in the column map', async () => {
    const url = await start('/completion/metadata')

    const result = await post(url, {
      id: 'm1',
      tables: [
        { schema: 'a.b', table: 'c' },
        { schema: 'a', table: 'b.c' },
      ],
    })

    expect(result.status).toBe(200)
    expect(result.body.data.columns).toEqual({
      [completionColumnKey('a.b', 'c')]: [{ name: 'left' }],
      [completionColumnKey('a', 'b.c')]: [{ name: 'right' }],
    })
  })

  it('keeps a schema named __proto__ in the table map', async () => {
    const url = await start('/completion/metadata')

    const result = await post(url, {
      id: 'm3',
      schemas: ['__proto__'],
      tables: [{ schema: '__proto__', table: 'orders' }],
    })

    expect(result.status).toBe(200)
    expect(Object.prototype.hasOwnProperty.call(result.body.data.tables, '__proto__')).toBe(true)
    expect(result.body.data.tables['__proto__']).toEqual(PROTO_OBJECTS['__proto__'])
  })

  it('reports cached:false and empty maps for a connection without a cached tree', async () => {
    const url = await start('/completion/metadata')

    const result = await post(url, {
      id: 'm2',
      schemas: ['shop'],
      tables: [{ schema: 'shop', table: 'orders' }],
    })

    expect(result.status).toBe(200)
    expect(result.body).toEqual({
      ok: true,
      data: { cached: false, schemas: [], tables: {}, columns: {} },
    })
  })

  it('ignores schemas/tables that are not arrays instead of failing', async () => {
    const url = await start('/completion/metadata')

    const result = await post(url, { id: 'm1', schemas: 'shop', tables: { schema: 'shop', table: 'orders' } })

    expect(result.status).toBe(200)
    expect(result.body).toEqual({
      ok: true,
      data: { cached: true, schemas: CACHED.schemas, tables: {}, columns: {} },
    })
  })

  it('drops invalid entries from the arrays instead of failing', async () => {
    const url = await start('/completion/metadata')

    const result = await post(url, {
      id: 'm1',
      schemas: ['shop', 7, null],
      tables: [{ schema: 'shop', table: 'orders' }, { schema: 7, table: 'x' }, null, { schema: '', table: 'users' }],
    })

    expect(result.status).toBe(200)
    expect(result.body.data.tables).toEqual({ shop: CACHED.objects.shop })
    expect(result.body.data.columns).toEqual({
      [completionColumnKey('shop', 'orders')]: [{ name: 'id', typeName: 'INT' }, { name: 'total', typeName: 'DECIMAL' }, { name: 'note' }],
    })
  })

  it('rejects a non-SQL connection before touching the cache', async () => {
    const url = await start('/completion/metadata')

    const result = await post(url, { id: 'r1', schemas: ['shop'] })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'unsupported' } })
    expect(calls.structureGet).toEqual([])
  })

  it('reports an unknown connection as not found', async () => {
    const url = await start('/completion/metadata')

    const result = await post(url, { id: 'nope' })

    expect(result.status).toBe(404)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'not-found' } })
  })
})

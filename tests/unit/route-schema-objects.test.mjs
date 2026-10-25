import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { objects: [], describe: [], putObjects: [], putDescription: [] }

const connection = {
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

let live = { objects: true, describe: true }
let cache

const objects = [{ name: 'orders', kind: 'table' }]
const description = { schema: 'shop', table: 'orders', kind: 'table', columns: [], indexes: [], primaryKey: [] }

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
  live = { objects: true, describe: true }
  cache = undefined
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: { settings: () => ({}), snapshot: () => ({}), connection: (id) => (id === 'm1' ? connection : undefined) },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {
      objects: async (...args) => {
        calls.objects.push(args)
        if (!live.objects) throw new Error('查询超时')
        return objects
      },
      describe: async (...args) => {
        calls.describe.push(args)
        if (!live.describe) throw new Error('表不存在')
        return { ...description, kind: args[3] }
      },
    },
    redis: {},
    structure: {
      snapshotJson: () => '{}',
      get: () => cache,
      putObjects: (...args) => calls.putObjects.push(args),
      putDescription: (...args) => calls.putDescription.push(args),
      getDescription: () => cache?.description,
      fetchedAt: () => '2026-01-01T00:00:00.000Z',
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

describe('POST /schema/objects over HTTP', () => {
  it('caches a live read', async () => {
    const url = await start('/schema/objects')

    const result = await post(url, { id: 'm1', schema: 'shop' })

    expect(result.body).toMatchObject({ ok: true, data: { cached: false, objects } })
    expect(calls.putObjects).toEqual([['m1', 'shop', objects]])
  })

  it('requires a schema', async () => {
    const url = await start('/schema/objects')

    const result = await post(url, { id: 'm1' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'invalid' } })
    expect(calls.objects).toHaveLength(0)
  })

  it('falls back to the cached list when the read fails', async () => {
    cache = { schemas: [], objects: { shop: objects }, fetchedAt: '2026-01-01T00:00:00.000Z' }
    live = { objects: false, describe: true }
    const url = await start('/schema/objects')

    const result = await post(url, { id: 'm1', schema: 'shop' })

    expect(result.body).toMatchObject({ ok: true, data: { cached: true, objects } })
    expect(result.body.data.error).toContain('查询超时')
  })

  it('surfaces the failure when the schema was never cached', async () => {
    live = { objects: false, describe: true }
    const url = await start('/schema/objects')

    const result = await post(url, { id: 'm1', schema: 'crm' })

    expect(result.status).toBeGreaterThanOrEqual(400)
  })
})

describe('POST /schema/describe over HTTP', () => {
  it('defaults the kind to table and caches the description', async () => {
    const url = await start('/schema/describe')

    const result = await post(url, { id: 'm1', schema: 'shop', table: 'orders' })

    expect(result.body).toMatchObject({ ok: true, data: { cached: false, kind: 'table' } })
    expect(calls.describe).toEqual([['m1', 'shop', 'orders', 'table']])
    expect(calls.putDescription).toHaveLength(1)
  })

  it('does not cache routine descriptions', async () => {
    const url = await start('/schema/describe')

    await post(url, { id: 'm1', schema: 'shop', table: 'proc', kind: 'procedure' })

    expect(calls.describe).toEqual([['m1', 'shop', 'proc', 'procedure']])
    expect(calls.putDescription).toHaveLength(0)
  })

  it('requires both schema and table', async () => {
    const url = await start('/schema/describe')

    const result = await post(url, { id: 'm1', schema: 'shop' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'invalid' } })
  })

  it('falls back to the cached description when the read fails', async () => {
    cache = { schemas: [], objects: {}, description, fetchedAt: '2026-01-01T00:00:00.000Z' }
    live = { objects: true, describe: false }
    const url = await start('/schema/describe')

    const result = await post(url, { id: 'm1', schema: 'shop', table: 'orders' })

    expect(result.body).toMatchObject({ ok: true, data: { cached: true, kind: 'table' } })
  })
})

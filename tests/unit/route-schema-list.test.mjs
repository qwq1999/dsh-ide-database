import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { schemas: [], put: [] }

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

let live = { ok: true, schemas: [{ name: 'shop' }, { name: 'crm' }] }
let cache

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
  calls.schemas.length = 0
  calls.put.length = 0
  live = { ok: true, schemas: [{ name: 'shop' }, { name: 'crm' }] }
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
      schemas: async (...args) => {
        calls.schemas.push(args)
        if (!live.ok) throw new Error('连接被拒绝')
        return live.schemas
      },
    },
    redis: {},
    structure: {
      snapshotJson: () => '{}',
      get: () => cache,
      putSchemas: (...args) => calls.put.push(args),
    },
    log: () => undefined,
  }
}

async function start() {
  const handler = createRouteHandler(deps())
  const server = createServer((request, response) => {
    void handler(request, response)
  })
  servers.push(server)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  return `http://127.0.0.1:${String(address.port)}${ROUTE_PREFIX}/schema/list`
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

describe('POST /schema/list over HTTP', () => {
  it('caches a full read but not a filtered one', async () => {
    const url = await start()

    const full = await post(url, { id: 'm1' })
    const filtered = await post(url, { id: 'm1', filter: 'sh' })

    expect(full.body).toMatchObject({ ok: true, data: { cached: false } })
    expect(filtered.body).toMatchObject({ ok: true, data: { cached: false } })
    expect(calls.schemas).toEqual([
      ['m1', ''],
      ['m1', 'sh'],
    ])
    expect(calls.put).toHaveLength(1)
    expect(calls.put[0][1]).toEqual([{ name: 'shop' }, { name: 'crm' }])
  })

  it('falls back to the cached list when the server cannot be reached', async () => {
    cache = { schemas: [{ name: 'shop' }, { name: 'crm' }], objects: {}, fetchedAt: '2026-01-01T00:00:00.000Z' }
    live = { ok: false }
    const url = await start()

    const result = await post(url, { id: 'm1', filter: 'cr' })

    expect(result.body).toMatchObject({
      ok: true,
      data: { cached: true, schemas: [{ name: 'crm' }] },
    })
    expect(result.body.data.error).toContain('连接被拒绝')
    expect(calls.put).toHaveLength(0)
  })

  it('surfaces the failure when nothing is cached yet', async () => {
    live = { ok: false }
    const url = await start()

    const result = await post(url, { id: 'm1' })

    expect(result.status).toBeGreaterThanOrEqual(400)
    expect(result.body).toMatchObject({ ok: false })
  })
})

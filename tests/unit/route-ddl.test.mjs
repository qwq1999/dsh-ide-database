import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { ddl: [] }

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

const redis = {
  ...mysql,
  id: 'r1',
  name: '演示 Redis',
  driver: 'redis',
  dialect: 'redis',
  port: 6379,
  user: '',
  hasPassword: false,
  database: '',
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
  calls.ddl.length = 0
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: {
      settings: () => ({}),
      snapshot: () => ({}),
      connection: (id) => (id === 'm1' ? mysql : id === 'r1' ? redis : undefined),
    },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {
      ddl: async (...args) => {
        calls.ddl.push(args)
        return { schema: args[2], table: args[3], kind: args[4], ddl: 'CREATE VIEW v AS SELECT 1', source: 'server', warnings: [] }
      },
    },
    redis: {},
    structure: { snapshotJson: () => '{}' },
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
  return `http://127.0.0.1:${String(address.port)}${ROUTE_PREFIX}/schema/ddl`
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

describe('POST /schema/ddl over HTTP', () => {
  it('passes the object kind through to the service', async () => {
    const url = await start()

    const result = await post(url, { id: 'm1', schema: 'shop', table: 'v_orders', kind: 'view' })

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({ ok: true, data: { kind: 'view' } })
    expect(calls.ddl).toEqual([['m1', 'mysql', 'shop', 'v_orders', 'view']])
  })

  it('rejects requests without a table name', async () => {
    const url = await start()

    const result = await post(url, { id: 'm1', schema: 'shop' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'invalid' } })
    expect(calls.ddl).toHaveLength(0)
  })

  it('refuses DDL for Redis connections', async () => {
    const url = await start()

    const result = await post(url, { id: 'r1', schema: 'shop', table: 'x' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'unsupported' } })
    expect(calls.ddl).toHaveLength(0)
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { test: [], sqlConnect: [], redisConnect: [], sqlDisconnect: [], redisDisconnect: [] }

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
  for (const list of Object.values(calls)) list.length = 0
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: {
      settings: () => ({}),
      snapshot: () => ({}),
      connection: (id) => ({ m1: mysql, r1: redis })[id],
    },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {
      test: async (draft) => {
        calls.test.push(draft)
        return { ok: true, server: 'MySQL 8.0', latencyMs: 3 }
      },
      connect: async (id) => {
        calls.sqlConnect.push(id)
        return { version: '8.0.35', user: 'root' }
      },
      disconnect: async (id) => {
        calls.sqlDisconnect.push(id)
      },
    },
    redis: {
      connect: async (id) => {
        calls.redisConnect.push(id)
        return { version: '7.2.4', user: 'default' }
      },
      disconnect: async (id) => {
        calls.redisDisconnect.push(id)
      },
    },
    structure: { snapshotJson: () => '{}' },
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

describe('POST /connections/test over HTTP', () => {
  it('hands the draft to the driver layer untouched', async () => {
    const url = await start('/connections/test')
    const draft = { driver: 'mysql', host: '127.0.0.1', port: 3306, user: 'root', password: 'x' }

    const result = await post(url, { draft })

    expect(result.body).toMatchObject({ ok: true, data: { ok: true, server: 'MySQL 8.0' } })
    expect(calls.test).toEqual([draft])
  })

  it('rejects a request without a draft', async () => {
    const url = await start('/connections/test')

    const result = await post(url, {})

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'invalid' } })
    expect(calls.test).toHaveLength(0)
  })
})

describe('POST /connections/connect over HTTP', () => {
  it('picks the Redis client for a Redis connection', async () => {
    const url = await start('/connections/connect')

    const result = await post(url, { id: 'r1' })

    expect(result.body).toMatchObject({ ok: true, data: { version: '7.2.4' } })
    expect(calls.redisConnect).toEqual(['r1'])
    expect(calls.sqlConnect).toHaveLength(0)
  })

  it('uses SQL for everything else', async () => {
    const url = await start('/connections/connect')

    const result = await post(url, { id: 'm1' })

    expect(result.body).toMatchObject({ ok: true, data: { version: '8.0.35' } })
    expect(calls.sqlConnect).toEqual(['m1'])
  })
})

describe('POST /connections/disconnect over HTTP', () => {
  it('closes both pools so a stale JDBC session cannot linger', async () => {
    const url = await start('/connections/disconnect')

    await post(url, { id: 'm1' })

    expect(calls.sqlDisconnect).toEqual(['m1'])
    expect(calls.redisDisconnect).toEqual(['m1'])
  })
})

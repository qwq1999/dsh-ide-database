import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { transaction: [], databases: [], putRedisDatabases: [] }

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
  redisDb: 4,
}

let live = { ok: true, databases: 16 }
let cachedDatabases

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
  calls.transaction.length = 0
  calls.databases.length = 0
  calls.putRedisDatabases.length = 0
  live = { ok: true, databases: 16 }
  cachedDatabases = undefined
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
      transaction: async (...args) => {
        calls.transaction.push(args)
        return { ok: true }
      },
    },
    redis: {
      databases: async (id) => {
        calls.databases.push(id)
        if (!live.ok) throw new Error('Redis 连接失败')
        return live.databases
      },
    },
    structure: {
      snapshotJson: () => '{}',
      putRedisDatabases: (...args) => calls.putRedisDatabases.push(args),
      redisDatabases: () => cachedDatabases,
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

describe('POST /tx over HTTP', () => {
  it('forwards the three transaction actions', async () => {
    const url = await start('/tx')

    await post(url, { id: 'm1', action: 'start' })
    await post(url, { id: 'm1', action: 'commit' })
    await post(url, { id: 'm1', action: 'rollback' })

    expect(calls.transaction).toEqual([
      ['m1', 'start'],
      ['m1', 'commit'],
      ['m1', 'rollback'],
    ])
  })

  it('rejects an unknown action without calling the service', async () => {
    const url = await start('/tx')

    const result = await post(url, { id: 'm1', action: 'begin' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'invalid' } })
    expect(calls.transaction).toHaveLength(0)
  })
})

describe('POST /redis/databases over HTTP', () => {
  it('reads the real count and caches it', async () => {
    const url = await start('/redis/databases')

    const result = await post(url, { id: 'r1' })

    expect(result.body).toMatchObject({ ok: true, data: { databases: 16, redisDb: 4, cached: false } })
    expect(calls.putRedisDatabases).toEqual([['r1', 16]])
  })

  it('falls back to the cached count when Redis is unreachable', async () => {
    cachedDatabases = 8
    live = { ok: false }
    const url = await start('/redis/databases')

    const result = await post(url, { id: 'r1' })

    expect(result.body).toMatchObject({ ok: true, data: { databases: 8, cached: true } })
    expect(result.body.data.error).toContain('Redis 连接失败')
  })

  it('refuses non-Redis connections', async () => {
    const url = await start('/redis/databases')

    const result = await post(url, { id: 'm1' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'unsupported' } })
  })
})

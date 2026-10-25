import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'
import { DbError } from '../../lib/host/errors.js'

const servers = []
const calls = { explain: [], inspect: [] }

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
  redisDb: 2,
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
  calls.explain.length = 0
  calls.inspect.length = 0
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
      explain: async (...args) => {
        if (args[0] === 'r1') throw new DbError('unsupported', '该连接不是 SQL 连接')
        calls.explain.push(args)
        return { sql: args[1], columns: [{ name: 'id', type: 'INT' }], rows: [[1]], elapsedMs: 1 }
      },
    },
    redis: {
      inspect: async (...args) => {
        calls.inspect.push(args)
        return { key: args[2], db: args[1], type: 'string', ttl: -1, value: 'hello' }
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

describe('POST /explain over HTTP', () => {
  it('always caps the plan at 500 rows and only forwards a chosen schema', async () => {
    const url = await start('/explain')

    await post(url, { id: 'm1', sql: 'SELECT 1' })
    await post(url, { id: 'm1', sql: 'SELECT 1', schema: 'shop' })

    expect(calls.explain).toEqual([
      ['m1', 'SELECT 1', { maxRows: 500 }],
      ['m1', 'SELECT 1', { maxRows: 500, schema: 'shop' }],
    ])
  })

  it('rejects a blank statement before touching the database', async () => {
    const url = await start('/explain')

    const result = await post(url, { id: 'm1', sql: '   ' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'invalid' } })
    expect(calls.explain).toHaveLength(0)
  })

  it('surfaces the service refusal for Redis connections', async () => {
    const url = await start('/explain')

    const result = await post(url, { id: 'r1', sql: 'PING' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'unsupported' } })
  })
})

describe('POST /redis/key over HTTP', () => {
  it('defaults to the connection database and truncates an explicit one', async () => {
    const url = await start('/redis/key')

    await post(url, { id: 'r1', key: 'user:1' })
    await post(url, { id: 'r1', db: 3.9, key: 'user:1' })

    expect(calls.inspect).toEqual([
      ['r1', 2, 'user:1'],
      ['r1', 3, 'user:1'],
    ])
  })

  it('rejects a missing key', async () => {
    const url = await start('/redis/key')

    const result = await post(url, { id: 'r1' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'invalid' } })
    expect(calls.inspect).toHaveLength(0)
  })

  it('refuses non-Redis connections', async () => {
    const url = await start('/redis/key')

    const result = await post(url, { id: 'm1', key: 'user:1' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'unsupported' } })
  })
})

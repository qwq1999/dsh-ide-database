import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { scan: [], put: [] }

const redis = {
  id: 'r1',
  name: '演示 Redis',
  driver: 'redis',
  dialect: 'redis',
  host: '127.0.0.1',
  port: 6379,
  user: '',
  hasPassword: false,
  database: '',
  redisDb: 3,
  params: {},
  readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
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
  calls.scan.length = 0
  calls.put.length = 0
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: {
      settings: () => ({ redisScanCount: 321 }),
      snapshot: () => ({}),
      connection: (id) => (id === 'r1' ? redis : undefined),
    },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {},
    redis: {
      scan: async (...args) => {
        calls.scan.push(args)
        return { keys: [{ key: 'user:1', db: 3, type: 'string', ttl: -1 }], cursor: '0' }
      },
    },
    structure: {
      snapshotJson: () => '{}',
      putRedisKeys: (...args) => {
        calls.put.push(args)
      },
      redisDatabases: () => 16,
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
  return `http://127.0.0.1:${String(address.port)}${ROUTE_PREFIX}/redis/scan`
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
          resolve({ status: response.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') })
        })
      },
    )
    request.on('error', reject)
    request.end(payload)
  })
}

describe('POST /redis/scan over HTTP', () => {
  it('falls back to the connection database and the configured page size', async () => {
    const url = await start()

    const result = await post(url, { id: 'r1' })

    expect(result.status).toBe(200)
    expect(JSON.parse(result.text)).toMatchObject({ ok: true })
    expect(calls.scan).toEqual([['r1', 3, '0', '*', undefined, 321]])
    expect(calls.put).toHaveLength(1)
  })

  it('passes an explicit database, pattern and type through', async () => {
    const url = await start()

    await post(url, { id: 'r1', db: 7, cursor: '12', pattern: 'user:*', type: 'hash', count: 50 })

    expect(calls.scan).toEqual([['r1', 7, '12', 'user:*', 'hash', 50]])
    expect(calls.put[0][1]).toBe(7)
  })

  it('treats a blank pattern as match-all', async () => {
    const url = await start()

    await post(url, { id: 'r1', pattern: '   ' })

    expect(calls.scan).toEqual([['r1', 3, '0', '*', undefined, 321]])
  })
})

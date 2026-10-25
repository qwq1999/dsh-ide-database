import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { command: [] }

const base = {
  id: 'r1',
  name: '演示 Redis',
  driver: 'redis',
  dialect: 'redis',
  host: '127.0.0.1',
  port: 6379,
  user: '',
  hasPassword: false,
  database: '',
  redisDb: 2,
  params: {},
  readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

let connections = {}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
  calls.command.length = 0
  connections = {}
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: {
      settings: () => ({}),
      snapshot: () => ({}),
      connection: (id) => connections[id],
    },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {},
    redis: {
      command: async (...args) => {
        calls.command.push(args)
        return { command: args[2], value: 'PONG', elapsedMs: 1, readOnly: !args[3] }
      },
    },
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
  return `http://127.0.0.1:${String(address.port)}${ROUTE_PREFIX}/redis/command`
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

describe('POST /redis/command over HTTP', () => {
  it('never lets a read-only connection write, whatever the client asks', async () => {
    connections = { r1: { ...base, readOnly: true } }
    const url = await start()

    await post(url, { id: 'r1', command: 'SET user:1 x', allowWrite: true })

    expect(calls.command).toEqual([['r1', 2, 'SET user:1 x', false]])
  })

  it('accepts writes only for a writable connection that asked for them', async () => {
    connections = { r1: base }
    const url = await start()

    await post(url, { id: 'r1', db: 5, command: 'SET user:1 x', allowWrite: true })
    await post(url, { id: 'r1', command: 'GET user:1' })

    expect(calls.command).toEqual([
      ['r1', 5, 'SET user:1 x', true],
      ['r1', 2, 'GET user:1', false],
    ])
  })

  it('refuses non-Redis connections', async () => {
    connections = { r1: { ...base, dialect: 'mysql', driver: 'mysql' } }
    const url = await start()

    const result = await post(url, { id: 'r1', command: 'PING' })

    expect(result.status).toBe(400)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'unsupported' } })
    expect(calls.command).toHaveLength(0)
  })
})

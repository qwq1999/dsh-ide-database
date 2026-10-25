import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { query: [] }

const base = {
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
  calls.query.length = 0
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
    sql: {
      query: async (...args) => {
        calls.query.push(args)
        return { sql: args[1], columns: [{ name: 'n', type: 'INT' }], rows: [[1]], elapsedMs: 1 }
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
  return `http://127.0.0.1:${String(address.port)}${ROUTE_PREFIX}/query`
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

describe('POST /query over HTTP', () => {
  it('strips write permission from read-only connections', async () => {
    connections = { m1: { ...base, readOnly: true } }
    const url = await start()

    await post(url, { id: 'm1', sql: 'UPDATE users SET n = 1', allowWrite: true })

    expect(calls.query).toEqual([['m1', 'UPDATE users SET n = 1', { allowWrite: false }]])
  })

  it('forwards only the options that were actually sent', async () => {
    connections = { m1: base }
    const url = await start()

    await post(url, { id: 'm1', sql: 'SELECT 1', maxRows: 10, schema: 'shop', stmtKey: 'q-1', allowWrite: true })

    expect(calls.query).toEqual([
      ['m1', 'SELECT 1', { maxRows: 10, schema: 'shop', stmtKey: 'q-1', allowWrite: true }],
    ])
  })

  it('ignores numeric options sent as strings', async () => {
    connections = { m1: base }
    const url = await start()

    await post(url, { id: 'm1', sql: 'SELECT 1', maxRows: '10', timeoutSec: 'x' })

    expect(calls.query).toEqual([['m1', 'SELECT 1', { allowWrite: false }]])
  })
})

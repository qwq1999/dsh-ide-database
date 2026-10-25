import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { save: [], delete: [], sqlDisconnect: [], redisDisconnect: [], clear: [] }

const saved = {
  id: 'c1',
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

let previous

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
  previous = undefined
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: {
      settings: () => ({}),
      snapshot: () => ({ connections: [saved] }),
      connection: () => previous,
      saveConnection: (draft) => {
        calls.save.push(draft)
        return saved
      },
      deleteConnection: (id) => calls.delete.push(id),
    },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {
      disconnect: async (id) => {
        calls.sqlDisconnect.push(id)
      },
    },
    redis: {
      disconnect: async (id) => {
        calls.redisDisconnect.push(id)
      },
    },
    structure: {
      snapshotJson: () => '{}',
      clear: (id) => calls.clear.push(id),
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

describe('POST /connections/save over HTTP', () => {
  it('does not tear down anything for a brand new connection', async () => {
    const url = await start('/connections/save')

    const result = await post(url, { name: '演示 MySQL', driver: 'mysql', host: '127.0.0.1', port: 3306 })

    expect(result.body).toMatchObject({ ok: true, data: { connection: { id: 'c1' } } })
    expect(calls.sqlDisconnect).toHaveLength(0)
    expect(calls.redisDisconnect).toHaveLength(0)
    expect(calls.clear).toHaveLength(0)
  })

  it('closes the old session when the target moved', async () => {
    previous = { ...saved, host: '10.0.0.8' }
    const url = await start('/connections/save')

    await post(url, { id: 'c1', name: '演示 MySQL', driver: 'mysql', host: '127.0.0.1', port: 3306 })

    expect(calls.sqlDisconnect).toEqual(['c1'])
    expect(calls.redisDisconnect).toEqual(['c1'])
    expect(calls.clear).toEqual(['c1'])
  })

  it('keeps the cached structure when only the name changed', async () => {
    previous = { ...saved }
    const url = await start('/connections/save')

    await post(url, { id: 'c1', name: '改了名字', driver: 'mysql', host: '127.0.0.1', port: 3306 })

    expect(calls.sqlDisconnect).toHaveLength(0)
    expect(calls.clear).toHaveLength(0)
  })

  it('reconnects when a new password was supplied', async () => {
    previous = { ...saved }
    const url = await start('/connections/save')

    await post(url, { id: 'c1', name: '演示 MySQL', driver: 'mysql', host: '127.0.0.1', port: 3306, password: 's3cret' })

    expect(calls.sqlDisconnect).toEqual(['c1'])
    expect(calls.clear).toEqual(['c1'])
  })
})

describe('POST /connections/delete over HTTP', () => {
  it('disconnects, forgets the config and drops the cached structure', async () => {
    const url = await start('/connections/delete')

    await post(url, { id: 'c1' })

    expect(calls.sqlDisconnect).toEqual(['c1'])
    expect(calls.redisDisconnect).toEqual(['c1'])
    expect(calls.delete).toEqual(['c1'])
    expect(calls.clear).toEqual(['c1'])
  })
})

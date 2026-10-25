import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { ensureJars: [], resolvePreset: [], resolveCustom: [] }

const mysqlStatus = {
  id: 'mysql',
  name: 'MySQL',
  preset: 'mysql',
  needsJava: true,
  jars: [],
  ready: false,
  version: null,
  path: null,
  error: null,
}

let statuses = [mysqlStatus]

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
  calls.ensureJars.length = 0
  calls.resolvePreset.length = 0
  calls.resolveCustom.length = 0
  statuses = [mysqlStatus]
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '1.2.3' },
    config: { settings: () => ({ javaPath: '/usr/bin/java' }), snapshot: () => ({ connections: [] }), connection: () => undefined },
    secrets: {},
    drivers: {
      statuses: () => statuses,
      resolvePreset: (preset) => {
        calls.resolvePreset.push(preset)
        return { id: 'mysql', jars: ['mysql-connector-j.jar'] }
      },
      resolveCustom: (id) => {
        calls.resolveCustom.push(id)
        return { id, jars: ['custom.jar'] }
      },
      ensureJars: async (driver) => {
        calls.ensureJars.push(driver.id)
        statuses = statuses.map((entry) => (entry.id === driver.id ? { ...entry, ready: true } : entry))
      },
    },
    java: { locate: () => ({ available: true, version: '1.8.0_472', major: 8, source: 'path' }), bridgeReady: () => true },
    sql: { connectedIds: () => ['mysql-1'] },
    redis: {},
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

describe('POST /status over HTTP', () => {
  it('reports the config snapshot, driver statuses and environment together', async () => {
    const url = await start('/status')

    const result = await post(url, {})

    expect(result.body).toMatchObject({ ok: true })
    expect(result.body.data.config).toEqual({ connections: [] })
    expect(result.body.data.drivers).toHaveLength(1)
    expect(result.body.data.env.pluginVersion).toBe('1.2.3')
    expect(result.body.data.env.bridgeBuilt).toBe(true)
  })
})

describe('POST /env over HTTP', () => {
  it('describes the runtime without touching the database', async () => {
    const url = await start('/env')

    const result = await post(url, {})

    expect(result.body).toMatchObject({
      ok: true,
      data: { dataDir: '/tmp', configPath: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', pluginVersion: '1.2.3' },
    })
    expect(result.body.data.platform).toBe(`${process.platform}-${process.arch}`)
  })
})

describe('POST /drivers/download over HTTP', () => {
  it('resolves the preset jars when the driver needs Java', async () => {
    const url = await start('/drivers/download')

    const result = await post(url, { driverId: 'mysql' })

    expect(result.body).toMatchObject({ ok: true, data: { id: 'mysql', ready: true } })
    expect(calls.resolvePreset).toEqual(['mysql'])
    expect(calls.ensureJars).toEqual(['mysql'])
  })

  it('returns the status untouched for a pure JS driver', async () => {
    statuses = [{ ...mysqlStatus, id: 'redis', preset: 'redis', needsJava: false }]
    const url = await start('/drivers/download')

    const result = await post(url, { driverId: 'redis' })

    expect(result.body).toMatchObject({ ok: true, data: { id: 'redis' } })
    expect(calls.ensureJars).toHaveLength(0)
  })

  it('rejects an unknown driver', async () => {
    const url = await start('/drivers/download')

    const result = await post(url, { driverId: 'nope' })

    expect(result.status).toBe(404)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'not-found' } })
  })
})

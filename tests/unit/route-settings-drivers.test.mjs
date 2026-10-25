import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { cancel: [], invalidate: [], upsertDriver: [], deleteDriver: [], ping: [] }

let settings = { javaPath: '/usr/bin/java', redisScanCount: 200 }
let java = { available: true, bridgeReady: true }

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
  settings = { javaPath: '/usr/bin/java', redisScanCount: 200 }
  java = { available: true, bridgeReady: true }
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: {
      settings: () => settings,
      snapshot: () => ({}),
      connection: () => undefined,
      updateSettings: (next) => {
        settings = { ...settings, ...next }
        return settings
      },
      upsertDriver: (driver) => {
        calls.upsertDriver.push(driver)
        return { id: 'drv-1', ...driver }
      },
      deleteDriver: (id) => calls.deleteDriver.push(id),
    },
    secrets: {},
    drivers: { statuses: () => [{ id: 'mysql', name: 'MySQL' }] },
    java: {
      locate: () => ({ ...java }),
      bridgeReady: () => java.bridgeReady,
      invalidate: () => calls.invalidate.push(true),
    },
    sql: {
      cancel: async (key) => {
        calls.cancel.push(key)
        return true
      },
      ping: async () => {
        calls.ping.push(true)
        return { bridge: 1, java: '1.8.0_472', vm: 'OpenJDK', threads: 2 }
      },
      connectedIds: () => [],
    },
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

describe('POST /query/cancel over HTTP', () => {
  it('forwards the statement key and reports whether anything was cancelled', async () => {
    const url = await start('/query/cancel')

    const result = await post(url, { stmtKey: 'q-1' })

    expect(result.body).toMatchObject({ ok: true, data: { cancelled: true } })
    expect(calls.cancel).toEqual(['q-1'])
  })
})

describe('POST /settings/update over HTTP', () => {
  it('drops the cached Java path only when it changed', async () => {
    const url = await start('/settings/update')

    await post(url, { settings: { javaPath: '/other/java' } })
    await post(url, { settings: { redisScanCount: 500 } })

    expect(calls.invalidate).toHaveLength(1)
    expect(settings.redisScanCount).toBe(500)
  })
})

describe('custom driver routes over HTTP', () => {
  it('saves the submitted driver and returns the new status list', async () => {
    const url = await start('/drivers/custom/save')

    const result = await post(url, { driver: { name: '私有 JDBC', driverClass: 'com.acme.Driver', jarPaths: [] } })

    expect(result.body).toMatchObject({ ok: true, data: { driver: { id: 'drv-1' } } })
    expect(calls.upsertDriver).toEqual([{ name: '私有 JDBC', driverClass: 'com.acme.Driver', jarPaths: [] }])
  })

  it('deletes by id', async () => {
    const url = await start('/drivers/custom/delete')

    await post(url, { id: 'drv-1' })

    expect(calls.deleteDriver).toEqual(['drv-1'])
  })
})

describe('POST /health over HTTP', () => {
  it('skips the bridge ping when Java or the jar is missing', async () => {
    java = { available: false, bridgeReady: false }
    const url = await start('/health')

    const result = await post(url, {})

    expect(result.body).toMatchObject({ ok: true, data: { bridgePing: null } })
    expect(calls.ping).toHaveLength(0)
  })
})

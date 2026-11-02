import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { DbError } from '../../lib/host/errors.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
})

const missingJava = { available: false, source: 'missing', message: '未找到 Java', candidates: [] }
const downloadedJava = {
  available: true,
  path: '/data/jre/bin/java',
  version: '21.0.5',
  major: 21,
  source: 'downloaded',
  candidates: [{ path: '/data/jre/bin/java', version: '21.0.5', major: 21, source: 'downloaded' }],
}

function harness(overrides = {}) {
  const calls = { install: 0, invalidate: 0 }
  const state = { java: missingJava }
  const deps = {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '1.2.3' },
    config: { settings: () => ({ javaPath: '' }), snapshot: () => ({ connections: [] }), connection: () => undefined },
    secrets: {},
    drivers: { statuses: () => [] },
    java: {
      locate: () => state.java,
      bridgeReady: () => true,
      invalidate: () => {
        calls.invalidate += 1
      },
    },
    jre: {
      install: async () => {
        calls.install += 1
        state.java = downloadedJava
      },
    },
    sql: {},
    redis: {},
    structure: { snapshotJson: () => '{}' },
    log: () => undefined,
    ...overrides,
  }
  return { deps, calls, state }
}

async function start(deps, path) {
  const handler = createRouteHandler(deps)
  const server = createServer((request, response) => {
    void handler(request, response)
  })
  servers.push(server)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  return `http://127.0.0.1:${String(address.port)}${ROUTE_PREFIX}${path}`
}

function post(url) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': 2 } },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          resolve({ status: response.statusCode ?? 0, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) })
        })
      },
    )
    request.on('error', reject)
    request.end('{}')
  })
}

describe('POST /java/download over HTTP', () => {
  it('installs the runtime, drops the discovery cache and returns the fresh env', async () => {
    const { deps, calls } = harness()
    const url = await start(deps, '/java/download')

    const result = await post(url)

    expect(calls).toEqual({ install: 1, invalidate: 1 })
    expect(result.body).toMatchObject({
      ok: true,
      data: { pluginVersion: '1.2.3', java: { available: true, source: 'downloaded' } },
    })
  })

  it('reports a failed download as 502 download-failed', async () => {
    const { deps } = harness({
      jre: {
        install: async () => {
          throw new DbError('download-failed', '下载 Java 运行环境失败（HTTP 404）')
        },
      },
    })
    const url = await start(deps, '/java/download')

    const result = await post(url)

    expect(result.status).toBe(502)
    expect(result.body).toMatchObject({ ok: false, error: { code: 'download-failed' } })
  })
})

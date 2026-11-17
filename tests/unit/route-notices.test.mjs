import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'

import { DbError } from '../../lib/host/errors.js'
import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
import { createRouteHandler } from '../../lib/host/routes.js'

const servers = []
const calls = { dismiss: [] }
let dismissed = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
  calls.dismiss.length = 0
  dismissed = []
})

function deps() {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: {
      settings: () => ({}),
      snapshot: () => ({}),
      connection: () => undefined,
      dismissedNotices: () => [...dismissed],
      dismissNotice: (id) => {
        if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new DbError('invalid', '提示标识无效')
        calls.dismiss.push(id)
        if (!dismissed.includes(id)) dismissed.push(id)
        return [...dismissed]
      },
    },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {},
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
  const payload = Buffer.from(JSON.stringify(body), 'utf8')
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      { method: 'POST', headers: { 'content-type': 'application/json', 'content-length': payload.length } },
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

describe('POST /notices/dismiss over HTTP', () => {
  it('remembers the dismissal and answers with what is still visible', async () => {
    const url = await start('/notices/dismiss')

    const result = await post(url, { id: 'table-comments' })

    expect(result.body).toEqual({ ok: true, data: { notices: [] } })
    expect(calls.dismiss).toEqual(['table-comments'])
  })

  it('reports the dismissal through the next status read', async () => {
    const statusUrl = await start('/status')
    const dismissUrl = await start('/notices/dismiss')

    await post(dismissUrl, { id: 'table-comments' })
    const status = await post(statusUrl, {})

    expect(status.body.data.notices).toEqual([])
  })

  it('rejects an id that is not a notice id', async () => {
    const url = await start('/notices/dismiss')

    const result = await post(url, { id: 'Not An Id' })

    expect(result.status).toBe(400)
    expect(result.body.error.message).toBe('提示标识无效')
    expect(calls.dismiss).toEqual([])
  })
})

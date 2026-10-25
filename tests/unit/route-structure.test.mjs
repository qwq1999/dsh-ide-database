import { afterEach, describe, expect, it } from 'vitest'
import { createServer, request as httpRequest } from 'node:http'
import { gunzipSync } from 'node:zlib'

import { ROUTE_PREFIX } from '../../lib/shared/presets.js'
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

function structureDeps(structuresJson) {
  return {
    ctx: {},
    paths: { dataDir: '/tmp', configFile: '/tmp/config.json', bridgeJar: '/tmp/bridge.jar', version: '0.0.0' },
    config: { settings: () => ({}), snapshot: () => ({}) },
    secrets: {},
    drivers: { statuses: () => [] },
    java: { locate: () => ({}), bridgeReady: () => false },
    sql: {},
    redis: {},
    structure: { snapshotJson: () => structuresJson },
    log: () => undefined,
  }
}

async function start(structuresJson) {
  const handler = createRouteHandler(structureDeps(structuresJson))
  const server = createServer((request, response) => {
    void handler(request, response)
  })
  servers.push(server)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (address === null || typeof address === 'string') throw new Error('no port')
  return { url: `http://127.0.0.1:${String(address.port)}${ROUTE_PREFIX}/structure` }
}

function post(url, acceptEncoding) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      { method: 'POST', headers: acceptEncoding === undefined ? {} : { 'accept-encoding': acceptEncoding } },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          const raw = Buffer.concat(chunks)
          const encoding = response.headers['content-encoding']
          const body = encoding === 'gzip' ? gunzipSync(raw).toString('utf8') : raw.toString('utf8')
          resolve({ status: response.statusCode ?? 0, headers: response.headers, body, raw })
        })
      },
    )
    request.on('error', reject)
    request.end()
  })
}

describe('POST /structure over HTTP', () => {
  it('sends a large snapshot compressed for gzip clients', async () => {
    const entries = Array.from({ length: 600 }, (_, index) => ({ name: `orders_${String(index)}`, kind: 'table' }))
    const structures = JSON.stringify({ 'mysql-1': { schemas: entries } })
    const { url } = await start(structures)

    const reply = await post(url, 'gzip, deflate, br')

    expect(reply.status).toBe(200)
    expect(reply.headers['content-encoding']).toBe('gzip')
    expect(reply.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(reply.raw.length).toBeLessThan(structures.length / 2)
    expect(JSON.parse(reply.body)).toEqual({ ok: true, data: { structures: JSON.parse(structures) } })
  })

  it('sends the same snapshot uncompressed without gzip support', async () => {
    const structures = JSON.stringify({ 'mysql-1': { schemas: [{ name: 'orders' }] } })
    const { url } = await start(structures)

    const reply = await post(url, 'identity')

    expect(reply.headers['content-encoding']).toBeUndefined()
    expect(JSON.parse(reply.body)).toEqual({ ok: true, data: { structures: JSON.parse(structures) } })
  })
})

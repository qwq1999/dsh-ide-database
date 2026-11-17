import { describe, expect, it, vi } from 'vitest'

import { SqlService } from '../../lib/host/sql.js'

/** Build a SqlService whose bridge records the connId of every request. */
function harness() {
  const settings = {
    maxRows: 200,
    queryTimeoutSec: 30,
    connectTimeoutSec: 10,
    javaPath: '',
    mavenMirror: 'central',
    allowAgentWrites: false,
    redisScanCount: 200,
    confirmDestructive: true,
  }
  const live = {
    id: 'live-1',
    name: 'MySQL',
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: 'shop',
    redisDb: 0,
    params: {},
    readOnly: false,
    secretName: 'secret-1',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
  const calls = []
  const request = vi.fn(async (method, payload) => {
    calls.push({ method, connId: payload.connId })
    if (method === 'connect') return { version: '8.0' }
    return undefined
  })
  const driver = {
    id: 'mysql',
    name: 'MySQL',
    preset: 'mysql',
    dialect: 'mysql',
    driverClass: 'com.mysql.cj.jdbc.Driver',
    urlTemplate: 'jdbc:mysql://{{host}}:{{port}}/{{database}}',
    jars: [],
    needsJava: false,
  }
  const service = new SqlService({}, {}, {}, {}, {}, () => {})
  service.config = {
    connection: (reference) => (reference === live.id ? live : undefined),
    settings: () => settings,
  }
  service.drivers = {
    resolveDriver: () => driver,
    assertJarsPresent: () => undefined,
  }
  service.java = { locate: () => ({ available: true, path: '/java' }) }
  service.secrets = { resolve: () => ({ value: 's3cr3t' }) }
  service.ensureBridge = async () => ({ request })
  service.connected.set(live.id, { driver: { dialect: 'mysql' }, server: { connected: true } })
  return { service, calls, live }
}

describe('db_test_connection probe id', () => {
  it('never reuses the live connection id for a bridge probe', async () => {
    const { service, calls, live } = harness()
    const result = await service.test({ id: live.id, name: 'MySQL', driver: 'mysql', host: 'db', port: 3306, database: 'shop' })

    expect(result.ok).toBe(true)
    expect(calls.length).toBe(2) // connect + disconnect
    expect(calls[0].method).toBe('connect')
    expect(calls[1].method).toBe('disconnect')
    // A probe must not evict or disturb the live session keyed by the real id.
    expect(calls[0].connId).not.toBe(live.id)
    expect(calls[1].connId).toBe(calls[0].connId)
    expect(calls[0].connId).toMatch(/^probe-/)
    // The live session is untouched.
    expect(service.connected.has(live.id)).toBe(true)
  })

  it('still resolves the stored secret via the draft id', async () => {
    const { service, live } = harness()
    const resolve = vi.fn(() => ({ value: 's3cr3t' }))
    service.secrets = { resolve }
    await service.test({ id: live.id, name: 'MySQL', driver: 'mysql', host: 'db', port: 3306, database: 'shop' })
    expect(resolve).toHaveBeenCalledWith('secret-1')
  })
})

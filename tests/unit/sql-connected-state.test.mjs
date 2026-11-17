import { describe, expect, it, vi } from 'vitest'

import { DbError } from '../../lib/host/errors.js'
import { SqlService } from '../../lib/host/sql.js'

function baseService() {
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
    id: 'c1',
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
    touchConnection: () => undefined,
  }
  service.drivers = {
    resolveDriver: () => driver,
    assertJarsPresent: () => undefined,
  }
  service.secrets = { resolve: () => ({ value: 's3cr3t' }) }
  return { service, live }
}

describe('SqlService connected-map consistency', () => {
  it('drops all connected entries when a Java path change disposes the bridge', async () => {
    const { service, live } = baseService()
    const disposed = vi.fn()
    const oldBridge = { dispose: disposed, start: vi.fn(async () => {}) }
    service.bridge = oldBridge
    service.bridgeJavaPath = '/OLD/JAVA'
    service.paths = { bridgeJar: '/bridge.jar' }
    service.java = {
      // path now differs from bridgeJavaPath -> triggers the dispose branch
      locate: () => ({ available: true, path: '/NEW/JAVA' }),
      bridgeReady: () => true,
    }
    // Stub the newly-created bridge's start so no real JVM is spawned.
    const newBridge = { start: vi.fn(async () => {}), request: vi.fn() }
    service.bridgeStarting = undefined
    // ensureBridge creates a BridgeClient and calls start(); intercept by
    // pre-seeding via the real class is not possible, so verify the observable
    // effect: connected is cleared before dispose regardless of what start does.
    service.connected.set('c1', { driver: { dialect: 'mysql' }, server: {} })
    service.connected.set('c2', { driver: { dialect: 'mysql' }, server: {} })

    // Drive the private method through ping(), which calls ensureBridge().
    await service.ping().catch(() => {})

    expect(disposed).toHaveBeenCalledTimes(1)
    expect(service.connected.size).toBe(0)
  })

  it('removes a connection from connected when a non-bridge connect error evicted its session', async () => {
    const { service, live } = baseService()
    service.ensureBridge = async () => ({
      request: async () => { throw new DbError('sql', 'Access denied for user') },
    })
    service.connected.set(live.id, { driver: { dialect: 'mysql' }, server: {} })

    await expect(service.connect(live.id)).rejects.toThrow()
    expect(service.connected.has(live.id)).toBe(false)
  })

  it('still clears the whole map on a bridge-level connect failure', async () => {
    const { service, live } = baseService()
    service.ensureBridge = async () => ({
      request: async () => { throw new DbError('bridge', 'bridge died') },
    })
    service.connected.set(live.id, { driver: { dialect: 'mysql' }, server: {} })
    service.connected.set('c2', { driver: { dialect: 'mysql' }, server: {} })

    await expect(service.connect(live.id)).rejects.toThrow()
    expect(service.connected.size).toBe(0)
  })
})

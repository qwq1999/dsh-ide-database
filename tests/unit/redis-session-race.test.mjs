import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ created: [], gate: null }))

vi.mock('ioredis', () => {
  class FakeRedis {
    constructor(options) {
      this.options = options
      this.db = options.db
      this.status = 'connecting'
      this.quitCalls = 0
      this.disconnectCalls = 0
      state.created.push(this)
    }
    async connect() {
      if (state.gate !== null) await state.gate
      this.status = 'ready'
    }
    async ping() {
      return 'PONG'
    }
    quit() {
      this.quitCalls += 1
      this.status = 'end'
      return Promise.resolve('OK')
    }
    disconnect() {
      this.disconnectCalls += 1
      this.status = 'end'
    }
  }
  return { Redis: FakeRedis, default: { Redis: FakeRedis } }
})

import { ConfigStore } from '../../lib/host/config.js'
import { RedisManager } from '../../lib/host/redis.js'
import { SecretStore } from '../../lib/host/secrets.js'

const dirs = []

function manager() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-redis-race-'))
  dirs.push(dir)
  const secrets = new SecretStore(join(dir, 'secrets.json'))
  const config = new ConfigStore(join(dir, 'connections.json'), secrets)
  config.load()
  config.saveConnection({ name: 'Redis', driver: 'redis', host: '127.0.0.1', port: 6379, database: '' })
  const id = config.snapshot().connections[0].id
  const redis = new RedisManager(config, secrets)
  return { id, redis }
}

afterEach(() => {
  state.created.length = 0
  state.gate = null
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('Redis session lifecycle under concurrency', () => {
  it('opens a single client when two commands race to the same new db', async () => {
    const { id, redis } = manager()
    // A live db0 session so ensureSession accepts the request.
    redis.sessions.set(`${id}\u00000`, { client: { status: 'ready', disconnect() {} }, readOnly: false, db: 0 })

    let release
    state.gate = new Promise((resolve) => { release = resolve })
    const first = redis.ensureSession(id, 3)
    const second = redis.ensureSession(id, 3)
    release()
    const [a, b] = await Promise.all([first, second])

    const db3 = state.created.filter((c) => c.db === 3)
    expect(db3).toHaveLength(1)
    expect(a.client).toBe(b.client)
    expect(a.client.status).toBe('ready')
  })

  it('does not resurrect a session after disconnect while an open is in flight', async () => {
    const { id, redis } = manager()
    const old = { status: 'ready', quit: vi.fn(() => Promise.resolve('OK')) }
    redis.sessions.set(`${id}\u00000`, { client: old, readOnly: false, db: 0 })

    let release
    state.gate = new Promise((resolve) => { release = resolve })
    const opening = redis.ensureSession(id, 7)
    // Let the open reach the gate (client constructed, connect awaiting).
    await Promise.resolve()
    await redis.disconnect(id)
    release()
    await expect(opening).rejects.toThrow(/连接尚未打开/)

    const db7 = state.created.filter((c) => c.db === 7)
    expect(db7).toHaveLength(1)
    expect(db7[0].disconnectCalls).toBeGreaterThan(0)
    expect(redis.sessions.has(`${id}\u00007`)).toBe(false)
    expect(() => redis.session(id, 7)).toThrow(/连接尚未打开/)
  })
})

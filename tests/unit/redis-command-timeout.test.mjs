import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ created: [] }))

vi.mock('ioredis', () => {
  class FakeRedis {
    constructor(options) {
      this.options = options
      this.db = options.db
      state.created.push(this)
    }
    async connect() {}
    async ping() { return 'PONG' }
    quit() { return Promise.resolve('OK') }
    disconnect() {}
  }
  return { Redis: FakeRedis, default: { Redis: FakeRedis } }
})

import { ConfigStore } from '../../lib/host/config.js'
import { RedisManager } from '../../lib/host/redis.js'
import { SecretStore } from '../../lib/host/secrets.js'

const dirs = []

afterEach(() => {
  state.created.length = 0
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function manager(queryTimeoutSec) {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-redis-timeout-'))
  dirs.push(dir)
  const secrets = new SecretStore(join(dir, 'secrets.json'))
  const config = new ConfigStore(join(dir, 'connections.json'), secrets)
  config.load()
  config.updateSettings({ queryTimeoutSec, connectTimeoutSec: 10 })
  config.saveConnection({ name: 'Redis', driver: 'redis', host: '127.0.0.1', port: 6379, database: '' })
  const id = config.snapshot().connections[0].id
  return { id, redis: new RedisManager(config, secrets) }
}

describe('Redis command timeout units', () => {
  it('converts queryTimeoutSec (seconds) to milliseconds for ioredis commandTimeout', () => {
    const { id, redis } = manager(30)
    const conn = redis.config.connection(id)
    expect(conn).toBeDefined()
    // options() is a plain method at runtime; inspect the exact object handed
    // to ioredis for a connection.
    const opts = redis.options(conn, 0)
    expect(opts.commandTimeout).toBe(30000)
    expect(opts.connectTimeout).toBe(10000)
  })
})

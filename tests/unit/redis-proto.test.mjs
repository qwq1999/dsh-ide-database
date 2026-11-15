import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { ConfigStore } from '../../lib/host/config.js'
import { RedisManager, toJsonValue } from '../../lib/host/redis.js'
import { SecretStore } from '../../lib/host/secrets.js'

const dirs = []

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-redis-proto-'))
  dirs.push(dir)
  const secrets = new SecretStore(join(dir, 'secrets.json'))
  const config = new ConfigStore(join(dir, 'connections.json'), secrets)
  config.load()
  config.saveConnection({ name: 'Redis', driver: 'redis', host: '127.0.0.1', port: 6379, database: '' })
  return { id: config.snapshot().connections[0].id, redis: new RedisManager(config, secrets) }
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function hashClient() {
  return {
    status: 'ready',
    pipeline() {
      const queue = []
      const chain = {
        type: (key) => queue.push(['type', key]) && chain,
        ttl: (key) => queue.push(['ttl', key]) && chain,
        hlen: (key) => queue.push(['hlen', key]) && chain,
        exec: async () =>
          queue[0][0] === 'type'
            ? [
                [null, 'hash'],
                [null, -1],
              ]
            : [[null, 1]],
      }
      return chain
    },
    async hscan() {
      return ['0', ['__proto__', 'polluted', 'safe', '1']]
    },
  }
}

describe('Redis prototype-safe maps', () => {
  it('keeps __proto__ fields from a JSON-like value without changing its prototype', () => {
    const input = JSON.parse('{"__proto__":{"polluted":true},"safe":1}')
    const value = toJsonValue(input)

    expect(Object.getPrototypeOf(value)).toBeNull()
    expect(Object.hasOwn(value, '__proto__')).toBe(true)
    expect(value.__proto__).toEqual({ polluted: true })
    expect(value.safe).toBe(1)
    expect({}.polluted).toBeUndefined()
  })

  it('shows a __proto__ hash field as data, not as the object prototype', async () => {
    const { id, redis } = setup()
    const client = hashClient()
    redis.sessions.set(`${id}\u00000`, { client, readOnly: false, db: 0 })

    const result = await redis.inspect(id, 0, 'profile')

    expect(Object.getPrototypeOf(result.value)).toBeNull()
    expect(Object.hasOwn(result.value, '__proto__')).toBe(true)
    expect(result.value.__proto__).toBe('polluted')
    expect(result.value.safe).toBe('1')
    expect(result.preview).toContain('"__proto__":"polluted"')
    expect({}.polluted).toBeUndefined()
  })
})

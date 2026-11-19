import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { ConfigStore } from '../../lib/host/config.js'
import { RedisManager } from '../../lib/host/redis.js'
import { SecretStore } from '../../lib/host/secrets.js'

const dirs = []

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-redis-utf8-'))
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

/** A string client whose payload is large and whose GETRANGE slice ends mid-character. */
function stringClient(calls) {
  const total = 70_000
  const limit = 64 * 1024
  return {
    status: 'ready',
    pipeline() {
      const queue = []
      const chain = {
        type: () => queue.push(['type']) && chain,
        ttl: () => queue.push(['ttl']) && chain,
        strlen: () => queue.push(['strlen']) && chain,
        exec: async () => (queue[0][0] === 'type' ? [[null, 'string'], [null, -1]] : [[null, total]]),
      }
      return chain
    },
    async getrangeBuffer(key, start, stop) {
      calls.push({ key, start, stop })
      // 65534 ASCII bytes + the first 2 bytes of a 3-byte UTF-8 char (中 = E4 B8 AD).
      // GETRANGE is byte-based, so the slice ends in the middle of that character.
      return Buffer.concat([Buffer.from('a'.repeat(limit - 2)), Buffer.from([0xe4, 0xb8])])
    },
    async get() {
      throw new Error('get() should not be used for a value above the preview limit')
    },
  }
}

describe('inspecting a large UTF-8 string', () => {
  it('decodes a byte-truncated slice without a replacement character', async () => {
    const { id, redis } = setup()
    const calls = []
    redis.sessions.set(`${id}\u00000`, { client: stringClient(calls), readOnly: false, db: 0 })

    const result = await redis.inspect(id, 0, 'big')

    expect(calls[0]).toEqual({ key: 'big', start: 0, stop: 64 * 1024 - 1 })
    expect(result.truncated).toBe(true)
    // The incomplete trailing E4 B8 sequence is held back, not turned into U+FFFD.
    expect(result.value).toBe('a'.repeat(64 * 1024 - 2))
    expect(String(result.value)).not.toContain('\ufffd')
  })
})

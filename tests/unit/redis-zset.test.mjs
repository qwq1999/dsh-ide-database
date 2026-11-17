import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { ConfigStore } from '../../lib/host/config.js'
import { RedisManager, zsetEntries } from '../../lib/host/redis.js'
import { SecretStore } from '../../lib/host/secrets.js'

const dirs = []

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-redis-zset-'))
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

/** A zset client with 250 members that honours ZRANGE's inclusive stop. */
function zsetClient(calls) {
  const total = 250
  return {
    status: 'ready',
    pipeline() {
      const queue = []
      const chain = {
        type: () => queue.push(['type']) && chain,
        ttl: () => queue.push(['ttl']) && chain,
        zcard: () => queue.push(['zcard']) && chain,
        exec: async () => (queue[0][0] === 'type' ? [[null, 'zset'], [null, -1]] : [[null, total]]),
      }
      return chain
    },
    async zrange(key, start, stop, mode) {
      calls.push({ key, start, stop, mode })
      const entries = []
      for (let i = 0; i < total; i += 1) entries.push(`m${i}`, String(i))
      return entries.slice(Number(start) * 2, (Number(stop) + 1) * 2)
    },
  }
}

describe('zsetEntries', () => {
  it('parses the flat WITHSCORES reply', () => {
    expect(zsetEntries(['SKU-0031', '155', 'SKU-0042', '120.5', 'SKU-0100', '99'])).toEqual([
      { member: 'SKU-0031', score: 155 },
      { member: 'SKU-0042', score: 120.5 },
      { member: 'SKU-0100', score: 99 },
    ])
  })

  it('parses the RESP3 [member, score] pair reply', () => {
    expect(
      zsetEntries([
        ['SKU-0031', '155'],
        ['SKU-0042', '120.5'],
      ]),
    ).toEqual([
      { member: 'SKU-0031', score: 155 },
      { member: 'SKU-0042', score: 120.5 },
    ])
  })

  it('preserves the special inf / -inf / nan scores verbatim', () => {
    expect(zsetEntries(['hi', 'inf', 'lo', '-inf', 'mid', 'nan', 'garbage', 'abc'])).toEqual([
      { member: 'hi', score: 'inf' },
      { member: 'lo', score: '-inf' },
      { member: 'mid', score: 'nan' },
      { member: 'garbage', score: 0 },
    ])
  })

  it('keeps members with non-numeric scores at zero and ignores lonely entries', () => {
    expect(zsetEntries(['SKU-1', 'abc', 'SKU-2'])).toEqual([{ member: 'SKU-1', score: 0 }])
    expect(zsetEntries(null)).toEqual([])
  })
})

describe('inspecting a zset', () => {
  it('returns at most maxRows members and flags the rest as truncated', async () => {
    const { id, redis } = setup()
    const calls = []
    redis.sessions.set(`${id}\u00000`, { client: zsetClient(calls), readOnly: false, db: 0 })

    const result = await redis.inspect(id, 0, 'z')

    expect(calls[0].stop).toBe('199')
    expect(result.value).toHaveLength(200)
    expect(result.value[0]).toEqual({ member: 'm0', score: 0 })
    expect(result.value[199]).toEqual({ member: 'm199', score: 199 })
    expect(result.truncated).toBe(true)
  })
})

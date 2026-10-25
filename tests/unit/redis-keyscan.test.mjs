import { describe, expect, it } from 'vitest'

import { keyInfos } from '../../lib/host/redis.js'

/**
 * A Redis stand-in that records the commands of every pipeline, so the test can
 * prove a page of keys costs two batches instead of one round trip per key.
 */
function fakeClient(entries) {
  const calls = []
  const pipelines = []
  return {
    calls,
    pipelines,
    pipeline() {
      const queue = []
      pipelines.push(queue)
      const chain = {
        type: (key) => queue.push(['type', key]) && chain,
        ttl: (key) => queue.push(['ttl', key]) && chain,
        strlen: (key) => queue.push(['strlen', key]) && chain,
        llen: (key) => queue.push(['llen', key]) && chain,
        scard: (key) => queue.push(['scard', key]) && chain,
        zcard: (key) => queue.push(['zcard', key]) && chain,
        hlen: (key) => queue.push(['hlen', key]) && chain,
        xlen: (key) => queue.push(['xlen', key]) && chain,
        exec: async () =>
          queue.map(([command, key]) => {
            calls.push([command, key])
            const entry = entries[key]
            if (entry === undefined) return command === 'ttl' ? [null, -2] : [null, command === 'type' ? 'none' : null]
            if (command === 'type') return entry.typeError === true ? [new Error('ERR type failed'), null] : [null, entry.type]
            if (command === 'ttl') return [null, entry.ttl ?? -1]
            return entry.sizeError === true ? [new Error('ERR size failed'), null] : [null, entry.size]
          }),
      }
      return chain
    },
  }
}

describe('keyInfos', () => {
  it('reads type, ttl and size of a mixed page in two pipelines', async () => {
    const client = fakeClient({
      'user:1': { type: 'string', ttl: 120, size: 42 },
      'queue': { type: 'list', ttl: -1, size: 9 },
      'tags': { type: 'set', ttl: 60, size: 3 },
      'rank': { type: 'zset', ttl: -1, size: 1200 },
      'profile': { type: 'hash', ttl: 5, size: 7 },
      'events': { type: 'stream', ttl: -1, size: 2 },
    })
    const infos = await keyInfos(client, ['user:1', 'queue', 'tags', 'rank', 'profile', 'events', 'missing'])
    expect(infos).toEqual([
      { key: 'user:1', type: 'string', ttl: 120, size: 42 },
      { key: 'queue', type: 'list', ttl: -1, size: 9 },
      { key: 'tags', type: 'set', ttl: 60, size: 3 },
      { key: 'rank', type: 'zset', ttl: -1, size: 1200 },
      { key: 'profile', type: 'hash', ttl: 5, size: 7 },
      { key: 'events', type: 'stream', ttl: -1, size: 2 },
      { key: 'missing', type: 'none', ttl: -2 },
    ])
    // Two round trips: TYPE/TTL for seven keys, then the six size commands.
    expect(client.pipelines).toHaveLength(2)
    expect(client.pipelines[0]).toHaveLength(14)
    expect(client.pipelines[1]).toHaveLength(6)
  })

  it('skips the size pipeline when no key has a size', async () => {
    const client = fakeClient({})
    const infos = await keyInfos(client, ['a', 'b'])
    expect(infos).toEqual([
      { key: 'a', type: 'none', ttl: -2 },
      { key: 'b', type: 'none', ttl: -2 },
    ])
    expect(client.pipelines).toHaveLength(1)
  })

  it('does not call Redis for an empty page', async () => {
    const client = fakeClient({})
    expect(await keyInfos(client, [])).toEqual([])
    expect(client.pipelines).toHaveLength(0)
  })

  it('degrades a failed TTL or size instead of failing the page', async () => {
    const client = fakeClient({
      'a': { type: 'string', ttl: -1, size: undefined, sizeError: true },
      'b': { type: 'hash', ttl: 30, size: 2 },
    })
    const infos = await keyInfos(client, ['a', 'b'])
    expect(infos).toEqual([
      { key: 'a', type: 'string', ttl: -1 },
      { key: 'b', type: 'hash', ttl: 30, size: 2 },
    ])
  })

  it('reports a failed TYPE with the key name', async () => {
    const client = fakeClient({ 'bad': { type: 'string', typeError: true } })
    await expect(keyInfos(client, ['bad'])).rejects.toThrow('读取键 bad 的类型失败')
  })
})

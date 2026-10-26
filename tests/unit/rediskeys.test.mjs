import { describe, expect, it } from 'vitest'

import { filterRedisKeys } from '../../src/client/rediskeys'

const keys = [
  { key: 'user:1', db: 0, type: 'string', ttl: -1, size: 5 },
  { key: 'user:2', db: 0, type: 'string', ttl: 60, size: 5 },
  { key: 'order:1', db: 0, type: 'hash', ttl: -1, size: 5 },
]

describe('filterRedisKeys', () => {
  it('matches the key name case-insensitively', () => {
    expect(filterRedisKeys(keys, { needle: 'USER', ttlOnly: false }).map((info) => info.key)).toEqual(['user:1', 'user:2'])
    expect(filterRedisKeys(keys, { needle: 'order', ttlOnly: false }).map((info) => info.key)).toEqual(['order:1'])
  })

  it('keeps only keys with a ttl when asked', () => {
    expect(filterRedisKeys(keys, { needle: '', ttlOnly: true }).map((info) => info.key)).toEqual(['user:2'])
    expect(filterRedisKeys(keys, { needle: 'user', ttlOnly: true }).map((info) => info.key)).toEqual(['user:2'])
  })

  it('treats a blank needle as no filter and ignores surrounding spaces', () => {
    expect(filterRedisKeys(keys, { needle: '   ', ttlOnly: false })).toHaveLength(3)
    expect(filterRedisKeys(keys, { needle: ' user:1 ', ttlOnly: false }).map((info) => info.key)).toEqual(['user:1'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterRedisKeys(keys, { needle: 'missing', ttlOnly: false })).toEqual([])
  })
})

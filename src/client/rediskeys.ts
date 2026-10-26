import type { RedisKeyInfo } from '../shared/types'

/** Options for narrowing the key list that was already scanned. */
export interface RedisKeyFilter {
  /** Substring, matched case-insensitively against the key name; blank keeps everything. */
  needle: string
  /** Keep only keys that expire at some point. */
  ttlOnly: boolean
}

/** Narrows an already scanned page of keys without going back to Redis. */
export function filterRedisKeys(keys: RedisKeyInfo[], options: RedisKeyFilter): RedisKeyInfo[] {
  const needle = options.needle.trim().toLowerCase()
  return keys.filter(
    (info) => (!options.ttlOnly || info.ttl >= 0) && (needle === '' || info.key.toLowerCase().includes(needle)),
  )
}

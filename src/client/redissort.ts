/** Cycle a key column between scan order, ascending, and descending. */
import type { RedisKeyInfo } from '../shared/types'

export type KeySort = 'none' | 'asc' | 'desc'

// Key names are usually ASCII, so compare them case-insensitively and treat
// embedded numbers by value: "user:9" comes before "user:10".
const COLLATOR = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

export function nextKeySort(current: KeySort): KeySort {
  if (current === 'none') return 'asc'
  if (current === 'asc') return 'desc'
  return 'none'
}

/** Return a sorted copy; scan order is returned untouched. */
export function sortKeys<T extends { key: string }>(keys: T[], sort: KeySort): T[] {
  if (sort === 'none') return keys
  const sorted = [...keys]
  sorted.sort((left, right) =>
    sort === 'asc' ? COLLATOR.compare(left.key, right.key) : COLLATOR.compare(right.key, left.key),
  )
  return sorted
}

/** Return a copy ordered by value length; entries of equal size keep their order. */
export function sortKeysBySize(keys: RedisKeyInfo[], sort: KeySort): RedisKeyInfo[] {
  if (sort === 'none') return keys
  const sorted = [...keys]
  sorted.sort((left, right) => {
    const leftSize = left.size ?? 0
    const rightSize = right.size ?? 0
    return sort === 'asc' ? leftSize - rightSize : rightSize - leftSize
  })
  return sorted
}

/** Return a copy ordered by remaining lifetime; keys without expiry go last. */
export function sortKeysByTtl(keys: RedisKeyInfo[], sort: KeySort): RedisKeyInfo[] {
  if (sort === 'none') return keys
  const sorted = [...keys]
  const ttlOf = (info: RedisKeyInfo): number => (info.ttl < 0 ? Number.POSITIVE_INFINITY : info.ttl)
  sorted.sort((left, right) => {
    const leftTtl = ttlOf(left)
    const rightTtl = ttlOf(right)
    // "No expiry" is not a very long lifetime: keep those keys at the end in both directions.
    if (leftTtl === Number.POSITIVE_INFINITY || rightTtl === Number.POSITIVE_INFINITY) {
      if (leftTtl === rightTtl) return 0
      return leftTtl === Number.POSITIVE_INFINITY ? 1 : -1
    }
    return sort === 'asc' ? leftTtl - rightTtl : rightTtl - leftTtl
  })
  return sorted
}

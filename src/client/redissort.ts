/** Cycle a key column between scan order, ascending, and descending. */
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

import { describe, expect, it } from 'vitest'

import { collectRows } from '../../src/client/pagedrows'

/** Fake fetch: hands out `pages`, each an array of row indices. */
function walker(pages, options) {
  const calls = []
  return {
    calls,
    run: () =>
      collectRows({
        ...options,
        fetch: async (paging) => {
          calls.push(paging)
          return pages[paging.page] ?? []
        },
      }),
  }
}

describe('collectRows', () => {
  it('stops after a short batch', async () => {
    const fake = walker([[1, 2]], { limit: 10, batch: 3 })
    await expect(fake.run()).resolves.toEqual([1, 2])
    expect(fake.calls).toHaveLength(1)
  })

  it('stops at the row cap even when every batch is full', async () => {
    const fake = walker([[1, 2], [3, 4], [5, 6]], { limit: 5, batch: 2 })
    await expect(fake.run()).resolves.toEqual([1, 2, 3, 4, 5])
    expect(fake.calls).toHaveLength(3)
  })

  it('reports how many rows each batch has collected', async () => {
    const seen = []
    const fake = walker([[1, 2], [3, 4], [5]], { limit: 100, batch: 2, onProgress: (count) => seen.push(count) })
    await expect(fake.run()).resolves.toEqual([1, 2, 3, 4, 5])
    expect(seen).toEqual([2, 4, 5])
  })

  it('hands out page numbers and row offsets', async () => {
    const fake = walker([[1, 2, 3], [4, 5, 6]], { limit: 100, batch: 3 })
    await fake.run()
    expect(fake.calls).toEqual([
      { page: 0, offset: 0 },
      { page: 1, offset: 3 },
      { page: 2, offset: 6 },
    ])
  })

  it('treats an empty first batch as the end', async () => {
    const fake = walker([[]], { limit: 10, batch: 5 })
    await expect(fake.run()).resolves.toEqual([])
    expect(fake.calls).toHaveLength(1)
  })

  it('asks for nothing when the cap is zero', async () => {
    const fake = walker([[1]], { limit: 0, batch: 5 })
    await expect(fake.run()).resolves.toEqual([])
    expect(fake.calls).toHaveLength(0)
  })

  it('never uses a batch smaller than one row', async () => {
    const fake = walker([[1], [2], [3]], { limit: 2, batch: 0 })
    await expect(fake.run()).resolves.toEqual([1, 2])
    expect(fake.calls).toEqual([
      { page: 0, offset: 0 },
      { page: 1, offset: 1 },
    ])
  })

  it('keeps the rows collected before the user cancels', async () => {
    let checks = 0
    const fake = walker([[1, 2], [3, 4]], { limit: 10, batch: 2, cancelled: () => { checks += 1; return checks > 1 } })
    await expect(fake.run()).resolves.toEqual([1, 2])
    expect(fake.calls).toHaveLength(1)
  })

  it('propagates a failing batch', async () => {
    await expect(
      collectRows({
        limit: 10,
        batch: 5,
        fetch: async () => {
          throw new Error('连接已断开')
        },
      }),
    ).rejects.toThrow('连接已断开')
  })
})

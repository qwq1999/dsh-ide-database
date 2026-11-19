import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schemas: vi.fn(),
  objects: vi.fn(),
  describe: vi.fn(),
  completionMetadata: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: {
    schemas: mocks.schemas,
    objects: mocks.objects,
    describe: mocks.describe,
    completionMetadata: mocks.completionMetadata,
  },
}))

import {
  CATALOG_COLUMN_LIMIT,
  CATALOG_TABLE_LIMIT,
  ConsoleCompletionCatalog,
} from '../../src/client/completion/catalog'
import { completionColumnKey } from '../../src/shared/completionkey'

const EMPTY_METADATA = { cached: false, schemas: [], tables: {}, columns: {} }

const catalog = (known = []) => new ConsoleCompletionCatalog('mysql-1', () => known)

describe('ConsoleCompletionCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.completionMetadata.mockResolvedValue(EMPTY_METADATA)
  })

  it('uses the schemas the sidebar already loaded', async () => {
    const subject = catalog(['shop', 'audit'])
    await expect(subject.schemas()).resolves.toEqual(['shop', 'audit'])
    expect(mocks.schemas).not.toHaveBeenCalled()
    expect(mocks.completionMetadata).not.toHaveBeenCalled()
  })

  it('falls back to the server for schemas and caches the result', async () => {
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    const subject = catalog()
    await expect(subject.schemas()).resolves.toEqual(['shop'])
    await expect(subject.schemas()).resolves.toEqual(['shop'])
    expect(mocks.schemas).toHaveBeenCalledTimes(1)
  })

  it('reads schemas, relations and columns straight from the host cache', async () => {
    mocks.completionMetadata
      .mockResolvedValueOnce({ cached: true, schemas: [{ name: 'shop' }], tables: {}, columns: {} })
      .mockResolvedValueOnce({
        cached: true,
        schemas: [],
        tables: { shop: [{ name: 'orders', kind: 'table' }] },
        columns: {},
      })
      .mockResolvedValueOnce({
        cached: true,
        schemas: [],
        tables: {},
        columns: { [completionColumnKey('shop', 'orders')]: [{ name: 'id', typeName: 'INT' }] },
      })
    const subject = catalog()
    await expect(subject.schemas()).resolves.toEqual(['shop'])
    await expect(subject.tables('shop')).resolves.toEqual([{ name: 'orders', kind: 'table' }])
    await expect(subject.columns('shop', 'orders')).resolves.toEqual([{ name: 'id', typeName: 'INT' }])
    expect(mocks.schemas).not.toHaveBeenCalled()
    expect(mocks.objects).not.toHaveBeenCalled()
    expect(mocks.describe).not.toHaveBeenCalled()
  })

  it('keeps dotted schema/table pairs in separate column caches', async () => {
    mocks.completionMetadata.mockResolvedValue({
      cached: true,
      schemas: [],
      tables: {},
      columns: {
        [completionColumnKey('a.b', 'c')]: [{ name: 'left' }],
        [completionColumnKey('a', 'b.c')]: [{ name: 'right' }],
      },
    })
    const subject = catalog(['a.b', 'a'])
    await expect(subject.columns('a.b', 'c')).resolves.toEqual([{ name: 'left' }])
    await expect(subject.columns('a', 'b.c')).resolves.toEqual([{ name: 'right' }])
  })

  it('caches relation lists per schema', async () => {
    mocks.objects.mockResolvedValue({
      objects: [
        { name: 'orders', kind: 'table' },
        { name: 'recent_orders', kind: 'view' },
        { name: 'price', kind: 'function' },
      ],
    })
    const subject = catalog(['shop'])
    const first = await subject.tables('shop')
    const second = await subject.tables('shop')
    expect(first).toEqual([
      { name: 'orders', kind: 'table' },
      { name: 'recent_orders', kind: 'view' },
    ])
    expect(second).toBe(first)
    expect(mocks.objects).toHaveBeenCalledTimes(1)
  })

  it('falls back to the object list when the host cache misses a schema', async () => {
    mocks.completionMetadata.mockResolvedValue({
      cached: true,
      schemas: [],
      tables: {},
      columns: {},
    })
    mocks.objects.mockResolvedValue({ objects: [{ name: 'orders', kind: 'table' }] })
    const subject = catalog(['shop'])
    await expect(subject.tables('shop')).resolves.toEqual([{ name: 'orders', kind: 'table' }])
    await expect(subject.tables('shop')).resolves.toEqual([{ name: 'orders', kind: 'table' }])
    expect(mocks.objects).toHaveBeenCalledTimes(1)
    expect(mocks.completionMetadata).toHaveBeenCalledTimes(1)
  })

  it('falls back to /schema/describe when the host cache misses a column list', async () => {
    mocks.describe.mockResolvedValue({ columns: [{ name: 'id', typeName: 'INT' }] })
    const subject = catalog(['shop'])
    await expect(subject.columns('shop', 'orders')).resolves.toEqual([{ name: 'id', typeName: 'INT' }])
    expect(mocks.describe).toHaveBeenCalledTimes(1)
  })

  it('falls back to the old endpoints when the metadata read fails', async () => {
    mocks.completionMetadata.mockRejectedValue(new Error('cache offline'))
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [{ name: 'orders', kind: 'table' }] })
    mocks.describe.mockResolvedValue({ columns: [{ name: 'id', typeName: 'INT' }] })
    const subject = catalog()
    await expect(subject.schemas()).resolves.toEqual(['shop'])
    await expect(subject.tables('shop')).resolves.toEqual([{ name: 'orders', kind: 'table' }])
    await expect(subject.columns('shop', 'orders')).resolves.toEqual([{ name: 'id', typeName: 'INT' }])
    expect(mocks.schemas).toHaveBeenCalledTimes(1)
    expect(mocks.objects).toHaveBeenCalledTimes(1)
    expect(mocks.describe).toHaveBeenCalledTimes(1)
  })

  it('remembers a schema whose relation list failed instead of retrying every popup', async () => {
    mocks.objects.mockRejectedValue(new Error('unknown database'))
    const subject = catalog(['shop'])
    await expect(subject.tables('shop')).resolves.toEqual([])
    await expect(subject.tables('shop')).resolves.toEqual([])
    expect(mocks.objects).toHaveBeenCalledTimes(1)
  })

  it('remembers a failed column read (qualifier fallbacks do not repeat it)', async () => {
    mocks.describe.mockRejectedValue(new Error('not a table'))
    const subject = catalog(['shop'])
    await expect(subject.columns('shop', 'shop')).resolves.toEqual([])
    await expect(subject.columns('shop', 'shop')).resolves.toEqual([])
    expect(mocks.describe).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight read between concurrent requests', async () => {
    let release
    mocks.objects.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    const subject = catalog(['shop'])
    const first = subject.tables('shop')
    const second = subject.tables('shop')
    // The host-cache probe is async, so the fallback read starts on a microtask.
    await vi.waitFor(() => expect(mocks.objects).toHaveBeenCalledTimes(1))
    release?.({ objects: [{ name: 'orders', kind: 'table' }] })
    await expect(first).resolves.toEqual([{ name: 'orders', kind: 'table' }])
    await expect(second).resolves.toEqual([{ name: 'orders', kind: 'table' }])
  })

  it('clear() forgets positive and negative entries', async () => {
    mocks.objects.mockRejectedValueOnce(new Error('gone')).mockResolvedValueOnce({
      objects: [{ name: 'orders', kind: 'table' }],
    })
    const subject = catalog(['shop'])
    await expect(subject.tables('shop')).resolves.toEqual([])
    subject.clear()
    await expect(subject.tables('shop')).resolves.toEqual([{ name: 'orders', kind: 'table' }])
    expect(mocks.objects).toHaveBeenCalledTimes(2)
  })

  it('a load in flight before clear() cannot overwrite the fresh cache', async () => {
    // P1 starts, then DDL calls clear(), then P2 loads fresh data. When P1
    // finally resolves it must not replace what P2 wrote into the cache.
    const gates = []
    mocks.objects.mockImplementation(
      () =>
        new Promise((resolve) => {
          gates.push(resolve)
        }),
    )
    const subject = catalog(['shop'])
    const stale = subject.tables('shop')
    await vi.waitFor(() => expect(gates.length).toBe(1))
    subject.clear()
    const fresh = subject.tables('shop')
    await vi.waitFor(() => expect(gates.length).toBe(2))
    gates[1]({ objects: [{ name: 'fresh_table', kind: 'table' }] })
    await expect(fresh).resolves.toEqual([{ name: 'fresh_table', kind: 'table' }])
    gates[0]({ objects: [{ name: 'stale_table', kind: 'table' }] })
    await expect(stale).resolves.toEqual([{ name: 'stale_table', kind: 'table' }])
    // The cache still holds P2's data, not P1's stale result.
    await expect(subject.tables('shop')).resolves.toEqual([{ name: 'fresh_table', kind: 'table' }])
    expect(mocks.objects).toHaveBeenCalledTimes(2)
  })

  it('evicts the least recently used schema from the relation cache', async () => {
    mocks.objects.mockResolvedValue({ objects: [{ name: 'orders', kind: 'table' }] })
    const subject = catalog(['shop'])
    for (let index = 0; index < CATALOG_TABLE_LIMIT + 1; index += 1) {
      await subject.tables(`schema_${index}`)
    }
    expect(mocks.objects).toHaveBeenCalledTimes(CATALOG_TABLE_LIMIT + 1)
    // Still cached: `tables()` caches by name, not by the schema list.
    await subject.tables(`schema_${CATALOG_TABLE_LIMIT}`)
    expect(mocks.objects).toHaveBeenCalledTimes(CATALOG_TABLE_LIMIT + 1)
    // Evicted by the LRU, so it is read again.
    await subject.tables('schema_0')
    expect(mocks.objects).toHaveBeenCalledTimes(CATALOG_TABLE_LIMIT + 2)
  })

  it('evicts the least recently used relation from the column cache', async () => {
    mocks.describe.mockResolvedValue({ columns: [{ name: 'id', typeName: 'INT' }] })
    const subject = catalog(['shop'])
    for (let index = 0; index < CATALOG_COLUMN_LIMIT + 1; index += 1) {
      await subject.columns('shop', `table_${index}`)
    }
    expect(mocks.describe).toHaveBeenCalledTimes(CATALOG_COLUMN_LIMIT + 1)
    await subject.columns('shop', `table_${CATALOG_COLUMN_LIMIT}`)
    expect(mocks.describe).toHaveBeenCalledTimes(CATALOG_COLUMN_LIMIT + 1)
    await subject.columns('shop', 'table_0')
    expect(mocks.describe).toHaveBeenCalledTimes(CATALOG_COLUMN_LIMIT + 2)
  })
})

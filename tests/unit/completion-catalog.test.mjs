import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  schemas: vi.fn(),
  objects: vi.fn(),
  describe: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: {
    schemas: mocks.schemas,
    objects: mocks.objects,
    describe: mocks.describe,
  },
}))

import { ConsoleCompletionCatalog } from '../../src/client/completion/catalog'

const catalog = (known = []) => new ConsoleCompletionCatalog('mysql-1', () => known)

describe('ConsoleCompletionCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the schemas the sidebar already loaded', async () => {
    const subject = catalog(['shop', 'audit'])
    await expect(subject.schemas()).resolves.toEqual(['shop', 'audit'])
    expect(mocks.schemas).not.toHaveBeenCalled()
  })

  it('falls back to the server for schemas and caches the result', async () => {
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    const subject = catalog()
    await expect(subject.schemas()).resolves.toEqual(['shop'])
    await expect(subject.schemas()).resolves.toEqual(['shop'])
    expect(mocks.schemas).toHaveBeenCalledTimes(1)
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
    expect(mocks.objects).toHaveBeenCalledTimes(1)
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
})

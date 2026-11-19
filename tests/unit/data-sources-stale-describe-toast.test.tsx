// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  structure: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  connect: vi.fn(),
  describe: vi.fn(),
  prefetchConnection: vi.fn(),
  redisDatabases: vi.fn(),
  redisScan: vi.fn(),
  redisKey: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    status: mocks.status,
    structure: mocks.structure,
    schemas: mocks.schemas,
    objects: mocks.objects,
    connect: mocks.connect,
    describe: mocks.describe,
    prefetchConnection: mocks.prefetchConnection,
    redisDatabases: mocks.redisDatabases,
    redisScan: mocks.redisScan,
    redisKey: mocks.redisKey,
    disconnect: mocks.disconnect,
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

function connection(id: string) {
  return {
    id, name: id, driver: 'mysql', dialect: 'mysql',
    host: '127.0.0.1', port: 3306, user: 'root', hasPassword: false,
    database: '', redisDb: 0, params: {}, readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const settings = {
  maxRows: 200, queryTimeoutSec: 30, connectTimeoutSec: 10, javaPath: '',
  mavenMirror: 'central', allowAgentWrites: false, redisScanCount: 200, confirmDestructive: false,
}

type Description = { schema: string; table: string; kind: string; columns: unknown[]; indexes: unknown[] }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const oldObject = { name: 'old_table', kind: 'table' as const }
const newObject = { name: 'new_table', kind: 'table' as const }

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({
    config: { connections: [connection('a')], trash: [], settings, drivers: [] },
    drivers: [], env: {}, prefetch: [],
  })
  mocks.structure.mockResolvedValue({ structures: {} })
  mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  mocks.objects.mockResolvedValue({ objects: [] })
  mocks.connect.mockResolvedValue({ product: 'MySQL', version: '8.0' })
  mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
  mocks.redisDatabases.mockResolvedValue({ databases: 16 })
  mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
  mocks.disconnect.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('stale describe failures must not notify after an object switch', () => {
  it('stays silent when a superseded describe rejects (connected)', async () => {
    const oldDescribe = deferred<Description>()
    const fresh: Description = { schema: 'shop', table: 'new_table', kind: 'table', columns: [], indexes: [] }
    // First describe (old_table) hangs; the next (new_table) succeeds.
    mocks.describe
      .mockImplementationOnce(() => oldDescribe.promise)
      .mockResolvedValue(fresh)

    const notify = vi.fn()
    const hook = renderHook(() => useDataSources(notify))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    await act(async () => { await hook.result.current.connect('a') })

    let first!: Promise<void>
    act(() => { first = hook.result.current.selectObject('a', 'shop', oldObject) })
    await waitFor(() => expect(hook.result.current.detailLoading).toBe(true))

    // Switch to the new object while the old describe is still pending.
    await act(async () => { await hook.result.current.selectObject('a', 'shop', newObject) })
    await waitFor(() => expect(hook.result.current.detail?.table).toBe('new_table'))

    const before = notify.mock.calls.length
    // Now the abandoned describe fails - no toast should surface.
    await act(async () => {
      oldDescribe.reject(new Error('STALE-SCHEMA-ERROR'))
      await first
    })
    expect(notify.mock.calls.slice(before)).toEqual([])
  })

  it('stays silent when a superseded describe rejects while offline', async () => {
    const oldDescribe = deferred<Description>()
    mocks.describe
      .mockImplementationOnce(() => oldDescribe.promise)
      .mockResolvedValue({ schema: 'shop', table: 'new_table', kind: 'table', columns: [], indexes: [] })

    const notify = vi.fn()
    const hook = renderHook(() => useDataSources(notify))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    // Do NOT connect - connection stays offline.

    let first!: Promise<void>
    act(() => { first = hook.result.current.selectObject('a', 'shop', oldObject) })
    await waitFor(() => expect(hook.result.current.detailLoading).toBe(true))

    await act(async () => { await hook.result.current.selectObject('a', 'shop', newObject) })
    await waitFor(() => expect(hook.result.current.detail?.table).toBe('new_table'))

    const before = notify.mock.calls.length
    await act(async () => {
      oldDescribe.reject(new Error('offline'))
      await first
    })
    expect(notify.mock.calls.slice(before)).toEqual([])
  })
})

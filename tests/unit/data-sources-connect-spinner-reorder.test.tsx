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
  reorderConnections: vi.fn(),
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
    reorderConnections: mocks.reorderConnections,
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
  maxRows: 200, queryTimeoutSec: 30, connectTimeoutSec: 10,
  javaPath: '', mavenMirror: 'central', allowAgentWrites: false,
  redisScanCount: 200, confirmDestructive: false,
}

function statusPayload(ids: string[]) {
  return {
    config: { connections: ids.map(connection), trash: [], settings, drivers: [] },
    drivers: [], env: {}, prefetch: [],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

describe('connect spinner and reorder late-response guards', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue(statusPayload(['a', 'b']))
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ product: 'MySQL', version: '8.0' })
    mocks.describe.mockResolvedValue({ schema: 'shop', table: 'users', kind: 'table', columns: [], indexes: [] })
    mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    mocks.redisKey.mockResolvedValue({ value: null, type: 'string' })
    mocks.disconnect.mockResolvedValue(undefined)
    mocks.reorderConnections.mockResolvedValue({ config: { connections: [], trash: [], settings, drivers: [] } })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('clears the connect spinner when a disconnect interrupts the in-flight connect', async () => {
    const connectResult = deferred<{ product: string; version: string }>()
    mocks.connect.mockReturnValue(connectResult.promise)

    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    let pending!: Promise<boolean>
    act(() => { pending = hook.result.current.connect('a') })
    await waitFor(() => expect(hook.result.current.connectingId).toBe('a'))

    await act(async () => { await hook.result.current.disconnect('a') })
    // The disconnect bumped the generation; the connect's finally guard no
    // longer runs, so the spinner must be cleared explicitly by disconnect.
    expect(hook.result.current.connectingId).toBe('')

    await act(async () => { connectResult.resolve({ product: 'MySQL', version: '8.0' }); await pending })
    expect(hook.result.current.connectingId).toBe('')
    expect(hook.result.current.servers['a']).toBeFalsy()
  })

  it('does not resurrect a deleted connection from a late reorder response', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    // Establish ['a','b'] (mount status already did).
    await waitFor(() => expect(hook.result.current.snapshot?.connections.map((c) => c.id)).toEqual(['a', 'b']))

    const reorderResult = deferred<{ config: typeof settings & { connections: unknown[]; trash: unknown[]; drivers: unknown[] } }>()
    mocks.reorderConnections.mockReturnValue(reorderResult.promise)

    act(() => { hook.result.current.reorderConnections(['b', 'a']) })
    // Optimistic order applied at once.
    await waitFor(() => expect(hook.result.current.snapshot?.connections.map((c) => c.id)).toEqual(['b', 'a']))

    // A fresh status lands while reorder is in flight: connection b is gone.
    mocks.status.mockResolvedValue(statusPayload(['a']))
    await act(async () => { await hook.result.current.refresh() })
    await waitFor(() => expect(hook.result.current.snapshot?.connections.map((c) => c.id)).toEqual(['a']))

    // The stale reorder response carries the old ['b','a'] list and must be ignored.
    await act(async () => {
      reorderResult.resolve({ config: { connections: [connection('b'), connection('a')], trash: [], settings, drivers: [] } } as never)
      await Promise.resolve()
    })
    await waitFor(() => expect(hook.result.current.snapshot?.connections.map((c) => c.id)).toEqual(['a']))
  })
})

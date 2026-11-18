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

function connection(id: string, dialect = 'mysql') {
  return {
    id, name: id, driver: dialect, dialect, host: '127.0.0.1',
    port: dialect === 'redis' ? 6379 : 3306, user: 'root', hasPassword: false,
    database: '', redisDb: 0, params: {}, readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function settings(maxRows: number) {
  return {
    maxRows, queryTimeoutSec: 30, connectTimeoutSec: 10, javaPath: '',
    mavenMirror: 'central', allowAgentWrites: false, redisScanCount: 200,
    confirmDestructive: false,
  }
}

function status(connections: ReturnType<typeof connection>[], maxRows: number) {
  return {
    config: { connections, trash: [], settings: settings(maxRows), drivers: [] },
    drivers: [], env: {}, prefetch: [],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

describe('refresh and connect request tokens', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue(status([connection('a'), connection('b')], 200))
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ product: 'MySQL', version: '8.0' })
    mocks.describe.mockResolvedValue({ schema: 'shop', table: 'users', kind: 'table', columns: [], indexes: [] })
    mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    mocks.disconnect.mockResolvedValue(undefined)
    mocks.reorderConnections.mockResolvedValue({ connections: [] })
  })
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('a late refresh cannot restore a connection deleted by a newer refresh', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.connections.map((c) => c.id)).toEqual(['a', 'b']))

    // A (older) refresh starts first; B (newer) starts after it but resolves
    // first. Only B's snapshot may win.
    const a = deferred<ReturnType<typeof status>>()
    const b = deferred<ReturnType<typeof status>>()
    mocks.status.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise)
    const pendingA = hook.result.current.refresh()
    const pendingB = hook.result.current.refresh()
    await act(async () => { b.resolve(status([connection('b')], 200)); await pendingB })
    await waitFor(() => expect(hook.result.current.connections.map((c) => c.id)).toEqual(['b']))
    await act(async () => { a.resolve(status([connection('a'), connection('b')], 200)); await pendingA })
    expect(hook.result.current.connections.map((c) => c.id)).toEqual(['b'])
  })

  it('a late refresh cannot roll back a freshly saved settings value', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.snapshot?.settings.maxRows).toBe(200))

    const old = deferred<ReturnType<typeof status>>()
    const fresh = deferred<ReturnType<typeof status>>()
    mocks.status.mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise)
    const pendingOld = hook.result.current.refresh()
    const pendingFresh = hook.result.current.refresh()
    await act(async () => { fresh.resolve(status([connection('a')], 999)); await pendingFresh })
    await waitFor(() => expect(hook.result.current.snapshot?.settings.maxRows).toBe(999))
    await act(async () => { old.resolve(status([connection('a')], 200)); await pendingOld })
    expect(hook.result.current.snapshot?.settings.maxRows).toBe(999)
  })

  it('a connect that resolves after disconnect does not mark the source online', async () => {
    const connectResult = deferred<{ product: string; version: string }>()
    mocks.connect.mockReturnValue(connectResult.promise)
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    let pending!: Promise<boolean>
    act(() => { pending = hook.result.current.connect('a') })
    await act(async () => { await hook.result.current.disconnect('a') })
    await act(async () => { connectResult.resolve({ product: 'MySQL', version: '8.0' }); await pending })

    expect(hook.result.current.servers['a']).toBeFalsy()
  })
})

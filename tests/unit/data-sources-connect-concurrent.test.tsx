// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(), structure: vi.fn(), schemas: vi.fn(), objects: vi.fn(),
  connect: vi.fn(), describe: vi.fn(), prefetchConnection: vi.fn(),
  redisDatabases: vi.fn(), redisScan: vi.fn(), redisKey: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    status: mocks.status, structure: mocks.structure, schemas: mocks.schemas, objects: mocks.objects,
    connect: mocks.connect, describe: mocks.describe, prefetchConnection: mocks.prefetchConnection,
    redisDatabases: mocks.redisDatabases, redisScan: mocks.redisScan, redisKey: mocks.redisKey,
    disconnect: mocks.disconnect,
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

function connection(id: string) {
  return {
    id, name: id, driver: 'mysql', dialect: 'mysql', host: '127.0.0.1', port: 3306,
    user: 'root', hasPassword: false, database: '', redisDb: 0, params: {}, readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const settings = {
  maxRows: 200, queryTimeoutSec: 30, connectTimeoutSec: 10, javaPath: '', mavenMirror: 'central',
  allowAgentWrites: false, redisScanCount: 200, confirmDestructive: false,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

describe('concurrent connect spinner lifetime (regression r21 BUG3)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [connection('a'), connection('b')], trash: [], settings, drivers: [] },
      drivers: [], env: {}, prefetch: [],
    })
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue(undefined)
    mocks.describe.mockResolvedValue({ schema: '', table: '', kind: 'table', columns: [], indexes: [] })
    mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    mocks.disconnect.mockResolvedValue(undefined)
  })
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('the first connect finishing must not clear the spinner of a still-running connect', async () => {
    const connA = deferred<void>()
    const connB = deferred<void>()
    mocks.connect.mockImplementation((id: string) => (id === 'a' ? connA.promise : connB.promise))

    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    // Start A, then B; B is the latest connect.
    let pendingA!: Promise<boolean>
    let pendingB!: Promise<boolean>
    act(() => { pendingA = hook.result.current.connect('a') })
    await waitFor(() => expect(hook.result.current.connectingId).toBe('a'))
    act(() => { pendingB = hook.result.current.connect('b') })
    await waitFor(() => expect(hook.result.current.connectingId).toBe('b'))

    // A resolves first. The token guard must leave connectingId === 'b'.
    await act(async () => { connA.resolve(); await pendingA })
    expect(hook.result.current.connectingId).toBe('b')

    // B resolves last; only now may the spinner clear.
    await act(async () => { connB.resolve(); await pendingB })
    expect(hook.result.current.connectingId).toBe('')
  })
})

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

const KEY = 'dsh-ide-database.last-connection.v1'

function connection(id: string, dialect = 'mysql') {
  return {
    id,
    name: id,
    driver: dialect,
    dialect,
    host: '127.0.0.1',
    port: dialect === 'redis' ? 6379 : 3306,
    user: 'root',
    hasPassword: false,
    database: '',
    redisDb: 0,
    params: {},
    readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const settings = {
  maxRows: 200,
  queryTimeoutSec: 30,
  connectTimeoutSec: 10,
  javaPath: '',
  mavenMirror: 'central',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: false,
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

const object = { name: 'users', kind: 'table' as const }

describe('detail invalidation across navigation and disconnect', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [connection('a'), connection('b')], trash: [], settings, drivers: [] },
      drivers: [],
      env: {},
      prefetch: [],
    })
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ product: 'MySQL', version: '8.0' })
    mocks.describe.mockResolvedValue({ schema: 'shop', table: 'users', kind: 'table', columns: [], indexes: [] })
    mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    mocks.disconnect.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('clears detailLoading when navigation supersedes an in-flight describe', async () => {
    const describeResult = deferred<{ schema: string; table: string; kind: string; columns: unknown[]; indexes: unknown[] }>()
    mocks.describe.mockReturnValue(describeResult.promise)

    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    await act(async () => {
      await hook.result.current.connect('a')
    })

    let pending!: Promise<void>
    act(() => {
      pending = hook.result.current.selectObject('a', 'shop', object)
    })
    await waitFor(() => expect(hook.result.current.detailLoading).toBe(true))

    // Navigate to the other connection while the describe is still pending.
    act(() => {
      hook.result.current.selectConnection('b')
    })
    expect(hook.result.current.detailLoading).toBe(false)

    // The stale response must not repopulate the detail or re-show the spinner.
    await act(async () => {
      describeResult.resolve({ schema: 'shop', table: 'users', kind: 'table', columns: [], indexes: [] })
      await pending
    })
    expect(hook.result.current.detail).toBeNull()
    expect(hook.result.current.detailLoading).toBe(false)
  })

  it('drops in-flight detail and spinners on disconnect', async () => {
    const describeResult = deferred<{ schema: string; table: string; kind: string; columns: unknown[]; indexes: unknown[] }>()
    mocks.describe.mockReturnValue(describeResult.promise)

    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    await act(async () => {
      await hook.result.current.connect('a')
    })

    let pending!: Promise<void>
    act(() => {
      pending = hook.result.current.selectObject('a', 'shop', object)
    })
    await waitFor(() => expect(hook.result.current.detailLoading).toBe(true))

    await act(async () => {
      await hook.result.current.disconnect('a')
    })
    expect(hook.result.current.detailLoading).toBe(false)

    await act(async () => {
      describeResult.resolve({ schema: 'shop', table: 'users', kind: 'table', columns: [], indexes: [] })
      await pending
    })
    expect(hook.result.current.detail).toBeNull()
    expect(hook.result.current.detailLoading).toBe(false)
  })

  it('persists the last connection when selecting an object directly', async () => {
    window.localStorage.setItem(KEY, 'a')
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    await act(async () => {
      await hook.result.current.connect('b')
    })
    await act(async () => {
      await hook.result.current.selectObject('b', 'shop', object)
    })
    expect(window.localStorage.getItem(KEY)).toBe('b')
  })
})

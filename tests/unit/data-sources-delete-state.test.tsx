// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  connect: vi.fn(),
  describe: vi.fn(),
  structure: vi.fn(),
  prefetchConnection: vi.fn(),
  redisDatabases: vi.fn(),
  redisScan: vi.fn(),
  redisKey: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    status: mocks.status,
    schemas: mocks.schemas,
    objects: mocks.objects,
    connect: mocks.connect,
    describe: mocks.describe,
    structure: mocks.structure,
    prefetchConnection: mocks.prefetchConnection,
    redisDatabases: mocks.redisDatabases,
    redisScan: mocks.redisScan,
    redisKey: mocks.redisKey,
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

const KEY = 'dsh-ide-database.last-connection.v1'

function connection(id: string) {
  return {
    id,
    name: id,
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
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

function statusOf(ids: string[]) {
  return {
    config: { connections: ids.map(connection), trash: [], settings, drivers: [] },
    drivers: [],
    env: {},
    prefetch: [],
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe('delete-state consistency across client and host', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue(statusOf(['a', 'b']))
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ product: 'MySQL', version: '8.0' })
    mocks.describe.mockResolvedValue({ schema: '', table: '', kind: 'table', columns: [], indexes: [] })
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('keeps other connections online when the selected one is deleted', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    await act(async () => {
      await hook.result.current.connect('a')
    })
    await act(async () => {
      await hook.result.current.connect('b')
    })
    expect(hook.result.current.servers['a']).toBeTruthy()
    expect(hook.result.current.servers['b']).toBeTruthy()

    // Simulate deleting the selected connection A: host now reports only B.
    mocks.status.mockResolvedValue(statusOf(['b']))
    await act(async () => {
      await hook.result.current.refresh()
    })

    // B must stay online; only A should be dropped.
    expect(hook.result.current.selectedId).toBe('b')
    expect(hook.result.current.servers['a']).toBeFalsy()
    expect(hook.result.current.servers['b']).toBeTruthy()
  })

  it('does not resurrect a deleted connection from a late connect response', async () => {
    const connectResult = deferred<{ product: string; version: string }>()
    mocks.connect.mockImplementation(() => connectResult.promise as never)

    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    let pending!: Promise<boolean>
    act(() => {
      pending = hook.result.current.connect('a')
    })

    // Delete A while the connect request is still in flight.
    mocks.status.mockResolvedValue(statusOf(['b']))
    await act(async () => {
      await hook.result.current.refresh()
    })

    await act(async () => {
      connectResult.resolve({ product: 'MySQL', version: '8.0' })
      await pending
    })

    expect(hook.result.current.servers['a']).toBeFalsy()
  })
})

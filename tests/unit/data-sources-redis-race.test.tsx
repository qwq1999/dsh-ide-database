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

function redisConnection(id: string) {
  return {
    id,
    name: id,
    driver: 'redis',
    dialect: 'redis',
    host: '127.0.0.1',
    port: 6379,
    user: '',
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

describe('Redis key detail request cancellation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [redisConnection('r1'), redisConnection('r2')], trash: [], settings, drivers: [] },
      drivers: [],
      env: {},
      prefetch: [],
    })
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ product: 'Redis', version: '7.2.0' })
    mocks.describe.mockResolvedValue({ schema: '', table: '', kind: 'table', columns: [], indexes: [] })
    mocks.prefetchConnection.mockResolvedValue({ id: 'r1' })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    mocks.disconnect.mockResolvedValue(undefined)
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('drops a stale key response after navigating to another database', async () => {
    const keyResult = deferred<{ type: 'string'; value: string }>()
    mocks.redisKey.mockReturnValue(keyResult.promise)

    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('r1'))

    await act(async () => {
      await hook.result.current.connect('r1')
    })

    let selectKey!: Promise<void>
    act(() => {
      selectKey = hook.result.current.selectRedisKey('r1', 0, 'old-key')
    })
    await waitFor(() => expect(hook.result.current.redisDetailLoading).toBe(true))

    // Navigating to another DB supersedes the in-flight key request.
    act(() => {
      hook.result.current.selectRedisDb('r1', 1)
    })
    expect(hook.result.current.redisDetailLoading).toBe(false)

    // The old key response arrives late and must not repopulate the detail panel.
    await act(async () => {
      keyResult.resolve({ type: 'string', value: 'stale' })
      await selectKey
    })
    expect(hook.result.current.redisDetail).toBe(null)
  })

  it('drops a stale key response after switching connections', async () => {
    const keyResult = deferred<{ type: 'string'; value: string }>()
    mocks.redisKey.mockReturnValue(keyResult.promise)

    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('r1'))
    await act(async () => {
      await hook.result.current.connect('r1')
    })

    let selectKey!: Promise<void>
    act(() => {
      selectKey = hook.result.current.selectRedisKey('r1', 0, 'old-key')
    })
    await waitFor(() => expect(hook.result.current.redisDetailLoading).toBe(true))

    act(() => {
      hook.result.current.selectConnection('r2')
    })
    expect(hook.result.current.redisDetailLoading).toBe(false)

    await act(async () => {
      keyResult.resolve({ type: 'string', value: 'stale' })
      await selectKey
    })
    expect(hook.result.current.redisDetail).toBe(null)
  })
})

// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  connect: vi.fn(),
  reorderConnections: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    status: mocks.status,
    schemas: mocks.schemas,
    objects: mocks.objects,
    connect: mocks.connect,
    reorderConnections: mocks.reorderConnections,
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

function connection(id: string, name: string) {
  return {
    id,
    name,
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    hasPassword: false,
    database: 'shop',
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

function statusOf(connections: ReturnType<typeof connection>[]) {
  return { config: { connections, settings, drivers: [] }, drivers: [], env: {} }
}

describe('data source reordering', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue(statusOf([connection('a', '库 A'), connection('b', '库 B')]))
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.reorderConnections.mockResolvedValue({
      config: { connections: [connection('b', '库 B'), connection('a', '库 A')], settings, drivers: [] },
    })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('applies the dropped order immediately and persists it', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.connections.map((item) => item.id)).toEqual(['a', 'b']))

    act(() => {
      hook.result.current.reorderConnections(['b', 'a'])
    })

    expect(hook.result.current.connections.map((item) => item.id)).toEqual(['b', 'a'])
    expect(mocks.reorderConnections).toHaveBeenCalledWith(['b', 'a'])
  })

  it('reloads the saved order when the host rejects the write', async () => {
    const notify = vi.fn()
    mocks.reorderConnections.mockRejectedValueOnce(new Error('boom'))
    const hook = renderHook(() => useDataSources(notify))
    await waitFor(() => expect(hook.result.current.connections.map((item) => item.id)).toEqual(['a', 'b']))
    const statusCalls = mocks.status.mock.calls.length

    act(() => {
      hook.result.current.reorderConnections(['b', 'a'])
    })

    await waitFor(() => expect(notify).toHaveBeenCalledWith('排序失败：boom', 'error'))
    await waitFor(() => expect(hook.result.current.connections.map((item) => item.id)).toEqual(['a', 'b']))
    expect(mocks.status.mock.calls.length).toBeGreaterThan(statusCalls)
  })
})

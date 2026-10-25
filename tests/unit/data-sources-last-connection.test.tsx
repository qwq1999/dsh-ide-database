// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  connect: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    status: mocks.status,
    schemas: mocks.schemas,
    objects: mocks.objects,
    connect: mocks.connect,
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

const KEY = 'dsh-ide-database.last-connection.v1'

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

describe('data sources remember the last connection', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [connection('a', '库 A'), connection('b', '库 B')], settings, drivers: [] },
      drivers: [],
      env: {},
    })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('falls back to the first connection and stores the next pick', async () => {
    const first = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(first.result.current.selectedId).toBe('a'))

    act(() => {
      first.result.current.selectConnection('b')
    })
    expect(window.localStorage.getItem(KEY)).toBe('b')
    first.unmount()

    const second = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(second.result.current.selectedId).toBe('b'))
  })

  it('ignores a stored connection that was removed', async () => {
    window.localStorage.setItem(KEY, 'gone')
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
  })
})

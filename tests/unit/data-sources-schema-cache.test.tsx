// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  structure: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  connect: vi.fn(),
  prefetchConnection: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    status: mocks.status,
    structure: mocks.structure,
    schemas: mocks.schemas,
    objects: mocks.objects,
    connect: mocks.connect,
    prefetchConnection: mocks.prefetchConnection,
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

const SCHEMAS_KEY = 'dsh-ide-database:visible-schemas:'

function connection(id: string, database: string) {
  return {
    id,
    name: id,
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    hasPassword: false,
    database,
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

describe('data sources cache only visible schemas', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [connection('a', 'shop')], settings, drivers: [] },
      drivers: [],
      env: {},
      prefetch: [],
    })
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.schemas.mockResolvedValue({
      schemas: [{ name: 'audit', system: false }, { name: 'shop', system: false }],
    })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ version: '8.0.35', user: 'root' })
    mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('starts a new data source with only its default schema visible', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    await act(async () => {
      await hook.result.current.connect('a')
    })

    await waitFor(() => expect(hook.result.current.visibleSchemas.a).toEqual(['shop']))
    expect(mocks.prefetchConnection).toHaveBeenCalledWith('a', { refresh: false, schemas: ['shop'] })
    expect(window.localStorage.getItem(`${SCHEMAS_KEY}a`)).toBe('["shop"]')
  })

  it('keeps a saved schema selection instead of resetting it', async () => {
    window.localStorage.setItem(`${SCHEMAS_KEY}a`, '["audit"]')
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    await act(async () => {
      await hook.result.current.connect('a')
    })

    await waitFor(() => expect(hook.result.current.visibleSchemas.a).toEqual(['audit']))
    expect(mocks.prefetchConnection).toHaveBeenCalledWith('a', { refresh: false, schemas: ['audit'] })
  })

  it('caches a schema as soon as it is made visible', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    await act(async () => {
      await hook.result.current.connect('a')
    })
    await waitFor(() => expect(hook.result.current.visibleSchemas.a).toEqual(['shop']))
    mocks.prefetchConnection.mockClear()

    act(() => {
      hook.result.current.toggleSchemaVisible('a', 'audit')
    })

    expect(mocks.objects).toHaveBeenCalledWith('a', 'audit')
    expect(mocks.prefetchConnection).toHaveBeenCalledWith('a', { schemas: ['audit'] })
    expect(hook.result.current.visibleSchemas.a).toEqual(['shop', 'audit'])
  })

  it('refreshes every description when the data source is refreshed', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    await act(async () => {
      await hook.result.current.connect('a')
    })
    await waitFor(() => expect(hook.result.current.visibleSchemas.a).toEqual(['shop']))
    mocks.prefetchConnection.mockClear()

    await act(async () => {
      await hook.result.current.refreshSelected()
    })

    expect(mocks.prefetchConnection).toHaveBeenCalledWith('a', { refresh: true, schemas: ['shop'] })
  })
})

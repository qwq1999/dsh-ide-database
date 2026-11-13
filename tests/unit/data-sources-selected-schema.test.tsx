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
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

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

describe('the tree reports the schema its selection belongs to', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [connection('a', 'shop'), connection('b', 'audit')], settings, drivers: [] },
      drivers: [],
      env: {},
      prefetch: [],
    })
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }, { name: 'audit' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ version: '8.0.35', user: 'root' })
    mocks.describe.mockResolvedValue({ schema: 'shop', table: 'orders', kind: 'table', columns: [], indexes: [] })
    mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('follows a schema, a folder and an object to their schema', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    expect(hook.result.current.selectedSchema).toBe('')

    act(() => {
      hook.result.current.selectSchema('a', 'shop')
    })
    expect(hook.result.current.selectedSchema).toBe('shop')

    act(() => {
      hook.result.current.selectFolder('a', 'sales', 'table')
    })
    expect(hook.result.current.selectedSchema).toBe('sales')

    await act(async () => {
      await hook.result.current.selectObject('a', 'crm', { name: 'leads', kind: 'table' })
    })
    expect(hook.result.current.selectedSchema).toBe('crm')
  })

  it('drops the schema when a plain data source is selected', async () => {
    const hook = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))
    act(() => {
      hook.result.current.selectSchema('a', 'shop')
    })
    expect(hook.result.current.selectedSchema).toBe('shop')

    act(() => {
      hook.result.current.selectConnection('b')
    })
    expect(hook.result.current.selectedSchema).toBe('')
  })
})

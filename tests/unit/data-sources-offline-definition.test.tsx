// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  structure: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  ddl: vi.fn(),
  connect: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    status: mocks.status,
    structure: mocks.structure,
    schemas: mocks.schemas,
    objects: mocks.objects,
    ddl: mocks.ddl,
    connect: mocks.connect,
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

const connection = {
  id: 'a',
  name: 'a',
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

describe('offline object definitions', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [connection], settings, drivers: [] },
      drivers: [],
      env: {},
      prefetch: [],
    })
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.objects.mockResolvedValue({ objects: [] })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('asks the host for a cached routine definition even while offline', async () => {
    mocks.ddl.mockResolvedValue({
      schema: 'shop',
      table: 'P_MIGRATE',
      kind: 'procedure',
      ddl: 'CREATE PROCEDURE P_MIGRATE() BEGIN END',
      source: 'server',
      warnings: ['显示的是上次读取的缓存定义'],
    })
    const notify = vi.fn()
    const hook = renderHook(() => useDataSources(notify))
    await waitFor(() => expect(hook.result.current.selectedId).toBe('a'))

    await act(async () => {
      await hook.result.current.selectObject('a', 'shop', { name: 'P_MIGRATE', kind: 'procedure' })
    })

    expect(mocks.ddl).toHaveBeenCalledWith('a', 'shop', 'P_MIGRATE', 'procedure')
    expect(hook.result.current.detail?.ddl).toBe('CREATE PROCEDURE P_MIGRATE() BEGIN END')
    expect(hook.result.current.detail?.ddlWarnings).toContain('显示的是上次读取的缓存定义')
    expect(notify).not.toHaveBeenCalledWith(expect.stringContaining('数据源未连接'), 'info')
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  redisScan: vi.fn(),
  redisDatabases: vi.fn(),
  redisKey: vi.fn(),
  redisCommand: vi.fn(),
  explain: vi.fn(),
  cancel: vi.fn(),
}))

vi.mock('../../src/client/api', () => {
  class ApiError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }
  return {
    ApiError,
    api: {
      status: mocks.status,
      schemas: mocks.schemas,
      objects: mocks.objects,
      query: mocks.query,
      connect: mocks.connect,
      redisScan: mocks.redisScan,
      redisDatabases: mocks.redisDatabases,
      redisKey: mocks.redisKey,
      redisCommand: mocks.redisCommand,
      explain: mocks.explain,
      cancel: mocks.cancel,
    },
  }
})

import { ConsoleTab } from '../../src/client/ConsoleTab'

const redis = {
  id: 'redis-1',
  name: '演示 Redis',
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

const tabWith = (connectionId: string) => () => ({ tab: { navigation: { params: { connectionId } } } })

describe('redis command switching', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
  })

  it('drops a command result that arrives after the logical database changed', async () => {
    let resolveCommand: (value: unknown) => void = () => undefined
    mocks.redisCommand.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCommand = resolve
        }),
    )

    render(<ConsoleTab useTabInfo={tabWith('redis-1')} />)
    const input = await screen.findByPlaceholderText('例如 GET shop:customer:42', undefined, { timeout: 4000 })
    fireEvent.change(input, { target: { value: 'GET stale:key' } })
    fireEvent.click(screen.getByRole('button', { name: '执行' }))

    await waitFor(() => expect(mocks.redisCommand).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('Redis 逻辑库'), { target: { value: '1' } })
    const runButton = screen.getByRole('button', { name: '执行' }) as HTMLButtonElement
    await waitFor(() => expect(runButton.disabled).toBe(false))

    resolveCommand({ command: 'GET stale:key', value: 'STALE-VALUE', elapsedMs: 1, readOnly: true })
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())
    expect(screen.queryByText('STALE-VALUE')).toBeNull()
  })
})

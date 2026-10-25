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

const tab = () => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })

describe('redis scan continuation', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({
      keys: [{ key: 'shop:1', type: 'string', ttl: -1, size: 3 }],
      cursor: '9',
    })
  })

  it('stops continuing once the pattern changes', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await screen.findByLabelText('数据源')
    await waitFor(() => expect(mocks.schemas.mock.calls.length).toBeGreaterThan(0))

    fireEvent.click(screen.getByRole('button', { name: '扫描' }))
    const more = await screen.findByRole('button', { name: '继续' })
    await waitFor(() => expect((more as HTMLButtonElement).disabled).toBe(false))
    expect(screen.queryByText(/条件已改/)).toBeNull()

    fireEvent.change(screen.getByPlaceholderText(/键模式/), { target: { value: 'user:*' } })
    await waitFor(() => expect((more as HTMLButtonElement).disabled).toBe(true))
    expect(screen.getByText(/条件已改，点「扫描」重新开始/)).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '扫描' }))
    await waitFor(() => expect((more as HTMLButtonElement).disabled).toBe(false))
  })
})

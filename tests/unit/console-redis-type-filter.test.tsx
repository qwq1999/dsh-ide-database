// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
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

describe('redis key type filter', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
  })

  it('rescans from the first cursor with the picked type', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)

    const picker = screen.getByLabelText('键类型') as HTMLSelectElement
    expect(picker.value).toBe('')
    // The first scan runs on mount; wait it out before measuring the picker's scan.
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())
    mocks.redisScan.mockClear()
    fireEvent.change(picker, { target: { value: 'hash' } })

    await waitFor(() =>
      expect(mocks.redisScan).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'redis-1', db: 0, cursor: '0', pattern: '*', type: 'hash' }),
      ),
    )
  })

  it('keeps the type across the scan button and pages', async () => {
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '42' })
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)

    const picker = screen.getByLabelText('键类型') as HTMLSelectElement
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())
    fireEvent.change(picker, { target: { value: 'zset' } })
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())

    mocks.redisScan.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '扫描' }))
    await waitFor(() =>
      expect(mocks.redisScan).toHaveBeenCalledWith(expect.objectContaining({ cursor: '0', type: 'zset' })),
    )

    mocks.redisScan.mockClear()
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    await waitFor(() =>
      expect(mocks.redisScan).toHaveBeenCalledWith(expect.objectContaining({ cursor: '42', type: 'zset' })),
    )
  })
})

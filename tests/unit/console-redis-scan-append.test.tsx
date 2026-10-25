// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

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

function key(name: string) {
  return { key: name, type: 'string', ttl: -1, size: 1 }
}

describe('redis scan pages', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
  })

  it('keeps every key when the last page ends the cursor', async () => {
    mocks.redisScan
      .mockResolvedValueOnce({ keys: [key('alpha'), key('beta')], cursor: '7' })
      .mockResolvedValueOnce({ keys: [key('beta'), key('gamma')], cursor: '0' })

    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(screen.getByText('alpha')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    await waitFor(() => expect(screen.getByText('gamma')).toBeTruthy())

    expect(screen.queryByText('alpha')).toBeTruthy()
    expect(screen.getAllByText('beta')).toHaveLength(1)
  })
})

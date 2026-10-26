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
  copies: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
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
  ApiError: class ApiError extends Error {},
}))

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/colmenu')>()
  return { ...actual, copyText: mocks.copies }
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

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
  mocks.copies.mockResolvedValue(true)
  mocks.status.mockResolvedValue({
    config: {
      connections: [redis],
      settings: {
        maxRows: 200,
        queryTimeoutSec: 30,
        connectTimeoutSec: 10,
        javaPath: '',
        mavenMirror: 'central',
        allowAgentWrites: false,
        redisScanCount: 200,
        confirmDestructive: false,
      },
      drivers: [],
    },
    drivers: [],
    env: {},
  })
  mocks.schemas.mockResolvedValue({ schemas: [] })
  mocks.redisDatabases.mockResolvedValue({ databases: 16 })
  mocks.redisScan.mockResolvedValue({
    keys: [
      { key: 'user:1', type: 'string', ttl: -1, size: 3 },
      { key: 'user:2', type: 'string', ttl: 60, size: 4 },
    ],
    cursor: '0',
  })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('redis copy key names', () => {
  it('copies the visible key names one per line', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())
    // The button stays disabled until the rows are actually on screen.
    await screen.findByText('user:1')

    fireEvent.click(screen.getByRole('button', { name: /复制键名/ }))

    await waitFor(() => expect(mocks.copies).toHaveBeenCalledWith(['user:1', 'user:2'].join(String.fromCharCode(10))))
    expect(await screen.findByText('键名（2 个） 已复制')).not.toBeNull()
  })
})

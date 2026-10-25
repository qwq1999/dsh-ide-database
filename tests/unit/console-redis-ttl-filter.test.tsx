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

vi.mock('../../src/client/api', () => ({
  api: { ...mocks },
  ApiError: class ApiError extends Error {},
}))

import { ConsoleTab } from '../../src/client/ConsoleTab'

const redis = {
  id: 'redis-1',
  name: '本地 Redis',
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
  createdAt: '2026-10-23T00:00:00.000Z',
}

const settings = {
  maxRows: 5000,
  queryTimeoutSec: 60,
  connectTimeoutSec: 15,
  javaPath: '',
  mavenMirror: '',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
  mocks.redisDatabases.mockResolvedValue({ databases: 16 })
  mocks.redisScan.mockResolvedValue({
    keys: [
      { key: 'user:forever', type: 'string', ttl: -1, size: 1 },
      { key: 'user:session', type: 'string', ttl: 60, size: 1 },
    ],
    cursor: '0',
  })
})

afterEach(() => {
  cleanup()
})

describe('Redis key filters', () => {
  it('shows only keys with an expiry when the box is ticked', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    await screen.findByText('user:forever')
    expect(screen.getByText('user:session')).toBeTruthy()
    expect(screen.getByText(/\d+ ms/)).toBeTruthy()
    expect(screen.getByText(/已全部加载/)).toBeTruthy()

    fireEvent.click(screen.getByLabelText('只看有 TTL'))
    await waitFor(() => expect(screen.queryByText('user:forever')).toBeNull())
    expect(screen.getByText('user:session')).toBeTruthy()
    expect(screen.getByText(/1 \/ 2 个键/)).toBeTruthy()

    fireEvent.click(screen.getByLabelText('只看有 TTL'))
    await waitFor(() => expect(screen.getByText('user:forever')).toBeTruthy())
  })

  it('narrows the loaded keys by a substring of their names', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    await screen.findByText('user:forever')

    fireEvent.change(screen.getByPlaceholderText('筛选键名'), { target: { value: 'SESS' } })
    await waitFor(() => expect(screen.queryByText('user:forever')).toBeNull())
    expect(screen.getByText('user:session')).toBeTruthy()
    expect(screen.getByText(/1 \/ 2 个键/)).toBeTruthy()

    fireEvent.change(screen.getByPlaceholderText('筛选键名'), { target: { value: 'nothing' } })
    await waitFor(() => expect(screen.queryByText('没有包含这个关键字的键')).not.toBeNull())
  })

  it('remembers the tick between visits', async () => {
    const props = (): { useTabInfo: () => { tab: { navigation: { params: { connectionId: string } } } } } => ({
      useTabInfo: () => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } }),
    })
    render(<ConsoleTab {...props()} />)
    await waitForConsoleSource(mocks)
    await screen.findByText('user:forever')

    fireEvent.click(screen.getByLabelText('只看有 TTL'))
    await waitFor(() => expect(window.localStorage.getItem('dsh-ide-database.redis.ttl-only.v1')).toBe('1'))

    cleanup()
    render(<ConsoleTab {...props()} />)
    await waitForConsoleSource(mocks)
    await screen.findByText('user:session')
    expect(screen.queryByText('user:forever')).toBeNull()
  })
})

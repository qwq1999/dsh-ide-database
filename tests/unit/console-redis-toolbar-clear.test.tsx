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

describe('Redis toolbar clear buttons', () => {
  it('resets the key pattern and scans again', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    await screen.findByText('user:forever')

    const pattern = screen.getByPlaceholderText('键模式，例如 shop:*') as HTMLInputElement
    expect(screen.queryByLabelText('清空键模式')).toBeNull()

    fireEvent.change(pattern, { target: { value: 'shop:*' } })
    fireEvent.click(screen.getByLabelText('清空键模式'))

    await waitFor(() => expect(pattern.value).toBe('*'))
    const last = mocks.redisScan.mock.calls.at(-1)
    expect(last?.[0]).toMatchObject({ pattern: '*' })
    expect(screen.queryByLabelText('清空键模式')).toBeNull()
  })

  it('clears the key-name filter and shows every loaded key again', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    await screen.findByText('user:forever')

    const filter = screen.getByPlaceholderText('筛选键名') as HTMLInputElement
    expect(screen.queryByLabelText('清空键名筛选')).toBeNull()

    fireEvent.change(filter, { target: { value: 'SESS' } })
    await waitFor(() => expect(screen.queryByText('user:forever')).toBeNull())

    fireEvent.click(screen.getByLabelText('清空键名筛选'))
    await waitFor(() => expect(screen.getByText('user:forever')).toBeTruthy())
    expect(filter.value).toBe('')
    expect(screen.queryByLabelText('清空键名筛选')).toBeNull()
  })
})

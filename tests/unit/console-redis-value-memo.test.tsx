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
  tables: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
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
  ApiError: class ApiError extends Error {},
}))

vi.mock('../../src/client/redisvalue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/redisvalue')>()
  return { ...actual, redisValueTable: mocks.tables }
})

import { ConsoleTab } from '../../src/client/ConsoleTab'
import { waitForConsoleSource } from '../stubs/console-ready'

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

const storedValue = {
  key: 'user:1',
  type: 'string',
  ttl: -1,
  size: 5,
  value: 'hello',
  truncated: false,
  preview: 'hello',
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.tables.mockReturnValue({ headers: ['值'], rows: [['hello']] })
  mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
  mocks.redisDatabases.mockResolvedValue({ databases: 16 })
  mocks.redisScan.mockResolvedValue({
    keys: [{ key: 'user:1', type: 'string', ttl: -1, size: 5 }],
    cursor: '0',
  })
  mocks.redisKey.mockResolvedValue(storedValue)
})

afterEach(() => {
  cleanup()
})

describe('Redis value panel rendering', () => {
  it('does not redraw the stored value while typing another command', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    const row = await screen.findByText('user:1')
    fireEvent.click(row)
    await waitFor(() => expect(mocks.redisKey).toHaveBeenCalledWith('redis-1', 'user:1', 0))
    await screen.findByText('hello')
    const redraws = mocks.tables.mock.calls.length
    expect(redraws).toBeGreaterThan(0)

    const box = screen.getByPlaceholderText(/例如 GET/)
    fireEvent.change(box, { target: { value: 'GET user:2' } })
    await waitFor(() => expect((box as HTMLInputElement).value).toBe('GET user:2'))
    expect(mocks.tables.mock.calls.length).toBe(redraws)
  })
})

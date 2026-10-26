// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

vi.mock('../../src/client/api', () => ({ api: { ...mocks } }))

const { ConsoleTab } = await import('../../src/client/ConsoleTab')

const redis = {
  id: 'redis-1',
  name: '缓存',
  preset: 'redis',
  dialect: 'redis',
  host: '127.0.0.1',
  port: 6379,
  user: '',
  database: '0',
  readOnly: false,
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
  mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
})

afterEach(() => {
  cleanup()
})

describe('Redis console toolbar', () => {
  it('hides the SQL-only controls on a Redis connection', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())

    expect(screen.getByRole('button', { name: '执行' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '执行计划' })).toBeNull()
    expect(screen.queryByRole('button', { name: '事务' })).toBeNull()
    expect(screen.queryByRole('button', { name: '打开数据表' })).toBeNull()
  })
})

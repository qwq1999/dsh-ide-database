// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

vi.mock('../../src/client/api', () => ({
  api: { ...mocks },
  ApiError: class ApiError extends Error {},
}))

import { ConsoleTab } from '../../src/client/ConsoleTab'
import { waitForConsoleSource } from '../stubs/console-ready'

const KEY = 'dsh-ide-database.redis-db.v1:redis-1'

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({
    config: {
      connections: [
        {
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
        },
      ],
      settings: {
        maxRows: 500,
        queryTimeoutSec: 60,
        connectTimeoutSec: 15,
        javaPath: '',
        mavenMirror: '',
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
  mocks.redisDatabases.mockResolvedValue({ databases: 2 })
  mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('console redis db fallback', () => {
  it('falls back when the remembered logical database no longer exists', async () => {
    window.localStorage.setItem(KEY, '5')
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    const picker = await screen.findByLabelText('Redis 逻辑库')
    await waitFor(() => expect(picker).toHaveProperty('value', '0'))
    // The write is a separate effect, so it can land a tick after the select updates.
    await waitFor(() => expect(window.localStorage.getItem(KEY)).toBe('0'))
  })
})

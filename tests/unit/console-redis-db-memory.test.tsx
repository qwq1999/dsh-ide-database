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

vi.mock('../../src/client/api', () => ({
  api: { ...mocks },
  ApiError: class ApiError extends Error {},
}))

import { ConsoleTab } from '../../src/client/ConsoleTab'
import { waitForConsoleSource } from '../stubs/console-ready'

function consoleTab(): JSX.Element {
  return <ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />
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

const KEY = 'dsh-ide-database.redis-db.v1:redis-1'

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({
    config: {
      connections: [
        {
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
        },
      ],
      settings,
      drivers: [],
    },
    drivers: [],
    env: {},
  })
  mocks.redisDatabases.mockResolvedValue({ databases: 16 })
  mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('redis logical database memory', () => {
  it('scans the picked database and remembers it for the next console', async () => {
    render(consoleTab())
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())

    fireEvent.change(screen.getByLabelText('Redis 逻辑库'), { target: { value: '3' } })
    await waitFor(() => expect(mocks.redisScan.mock.calls.at(-1)?.[0]).toMatchObject({ id: 'redis-1', db: 3 }))
    expect(window.localStorage.getItem(KEY)).toBe('3')

    cleanup()
    render(consoleTab())
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(screen.getByLabelText('Redis 逻辑库')).toHaveProperty('value', '3'))
  })
})

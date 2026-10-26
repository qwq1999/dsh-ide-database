// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ConsoleTab } from '../../src/client/ConsoleTab'
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
  cancel: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({ api: mocks }))

const DB_KEY = 'dsh-ide-database.redis-db.v1:redis-1'

function settings() {
  return {
    maxRows: 500,
    queryTimeoutSec: 30,
    connectTimeoutSec: 10,
    javaPath: '',
    mavenMirror: '',
    allowAgentWrites: false,
    redisScanCount: 200,
    confirmDestructive: true,
  }
}

describe('remembered Redis database', () => {
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('falls back to database 0 when the server has fewer databases', async () => {
    localStorage.setItem(DB_KEY, '5')
    mocks.status.mockResolvedValue({
      config: {
        connections: [
          {
            id: 'redis-1',
            name: '缓存',
            dialect: 'redis',
            host: '127.0.0.1',
            port: 6379,
            user: '',
            database: '',
            readOnly: false,
          },
        ],
        settings: settings(),
        drivers: [],
      },
      drivers: [],
      env: {},
    })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    mocks.redisDatabases.mockResolvedValue({ databases: 2 })

    render(
      <ConsoleTab
        useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })}
      />,
    )
    await waitForConsoleSource(mocks)

    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())
    const select = (await screen.findByLabelText('Redis 逻辑库')) as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe('0'), { timeout: 10_000 })
    expect(localStorage.getItem(DB_KEY)).toBe('0')
  })
})

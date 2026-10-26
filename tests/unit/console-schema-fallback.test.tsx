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

const SCHEMA_KEY = 'dsh-ide-database.schema.v1:mysql-1'

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

describe('remembered schema', () => {
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('falls back to the connection default when the remembered schema is gone', async () => {
    localStorage.setItem(SCHEMA_KEY, 'gone')
    mocks.status.mockResolvedValue({
      config: {
        connections: [
          {
            id: 'mysql-1',
            name: '演示 MySQL',
            dialect: 'mysql',
            host: '127.0.0.1',
            port: 3306,
            user: 'root',
            database: 'shop',
            readOnly: false,
          },
        ],
        settings: settings(),
        drivers: [],
      },
      drivers: [],
      env: {},
    })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.query.mockResolvedValue({ columns: [], rows: [], elapsedMs: 1, sql: 'SELECT 1' })

    render(
      <ConsoleTab
        useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })}
      />,
    )
    await waitForConsoleSource(mocks)

    const select = (await screen.findByLabelText('数据库')) as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe('shop'))
    expect(localStorage.getItem(SCHEMA_KEY)).toBe('shop')
  })
})

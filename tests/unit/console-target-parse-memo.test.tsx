// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConsoleTab as ConsoleTabType } from '../../src/client/ConsoleTab'
import type { AppConfig, QueryResult } from '../../src/shared/types'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  query: vi.fn(),
  describe: vi.fn(),
  connect: vi.fn(),
  redisScan: vi.fn(),
  redisDatabases: vi.fn(),
  redisKey: vi.fn(),
  redisCommand: vi.fn(),
  explain: vi.fn(),
  tableFromStatement: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: {
    status: mocks.status,
    schemas: mocks.schemas,
    objects: mocks.objects,
    query: mocks.query,
    describe: mocks.describe,
    connect: mocks.connect,
    redisScan: mocks.redisScan,
    redisDatabases: mocks.redisDatabases,
    redisKey: mocks.redisKey,
    redisCommand: mocks.redisCommand,
    explain: mocks.explain,
  },
}))

vi.mock('../../src/client/tablesql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/tablesql')>()
  return {
    ...actual,
    tableFromStatement: (text: string) => {
      mocks.tableFromStatement(text)
      return actual.tableFromStatement(text)
    },
  }
})

const { ConsoleTab } = (await import('../../src/client/ConsoleTab')) as { ConsoleTab: typeof ConsoleTabType }

const connection = {
  id: 'mysql-1',
  name: '演示 MySQL',
  driver: 'mysql',
  host: '127.0.0.1',
  port: 33061,
  user: 'root',
  database: 'shop',
  dialect: 'mysql',
}

const config = {
  connections: [connection],
  settings: {
    maxRows: 200,
    queryTimeoutSec: 30,
    connectTimeoutSec: 10,
    javaPath: '',
    mavenMirror: '',
    allowAgentWrites: false,
    redisScanCount: 200,
    confirmDestructive: true,
  },
  drivers: [],
} as unknown as AppConfig

function result(rows: QueryResult['rows']): QueryResult {
  return {
    columns: [{ name: 'name', type: 'VARCHAR' }],
    rows,
    elapsedMs: 1,
    sql: 'SELECT name FROM orders',
    truncated: false,
  }
}

describe('console statement parsing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.query.mockResolvedValue(result([['alpha']]))
  })

  it('parses the statement once per render instead of per menu item', async () => {
    const { waitForConsoleSource } = await import('../stubs/console-ready')
    render(
      <ConsoleTab
        useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })}
      />,
    )
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT * FROM orders' } })

    await screen.findByRole('button', { name: '执行' })
    mocks.tableFromStatement.mockClear()
    fireEvent.change(editor, { target: { value: 'SELECT * FROM orders WHERE id = 1' } })

    // One render, two derived targets (executed and edited statement).
    expect(mocks.tableFromStatement.mock.calls.length).toBeLessThanOrEqual(2)
    expect(mocks.tableFromStatement).toHaveBeenCalled()
  })
})

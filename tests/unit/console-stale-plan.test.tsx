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
}))

vi.mock('../../src/client/api', () => {
  class ApiError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }
  return {
    ApiError,
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
  }
})

import { ConsoleTab } from '../../src/client/ConsoleTab'

const mysql = {
  id: 'mysql-1',
  name: '演示 MySQL',
  driver: 'mysql',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  hasPassword: true,
  database: 'shop',
  redisDb: 0,
  params: {},
  readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const other = { ...mysql, id: 'mysql-2', name: '备用 MySQL', port: 3307 }

const settings = {
  maxRows: 200,
  queryTimeoutSec: 30,
  connectTimeoutSec: 10,
  javaPath: '',
  mavenMirror: 'central',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: false,
}

function treeExplain(text: string) {
  return {
    dialect: 'mysql',
    statements: ['EXPLAIN FORMAT=TREE SELECT * FROM orders'],
    plan: {
      sql: 'EXPLAIN FORMAT=TREE SELECT * FROM orders',
      columns: [{ name: 'EXPLAIN', typeName: 'VARCHAR' }],
      rows: [[text]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    },
    warnings: [],
  }
}

describe('console stale plans', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql, other], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  it('drops an execution plan that arrives after the source changed', async () => {
    let releasePlan: (value: unknown) => void = () => undefined
    mocks.explain.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releasePlan = resolve
        }),
    )

    render(
      <ConsoleTab
        useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })}
      />,
    )
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'EXPLAIN FORMAT=TREE SELECT * FROM orders' } })
    fireEvent.click(await screen.findByRole('button', { name: '执行计划' }))
    await waitFor(() => expect(mocks.explain).toHaveBeenCalledTimes(1))

    fireEvent.change(screen.getByLabelText('数据源'), { target: { value: 'mysql-2' } })
    // Switching sources asks for the new schema list; the plan must be dropped by then.
    await waitFor(() => expect(mocks.schemas.mock.calls.length).toBeGreaterThan(1))

    releasePlan(treeExplain('-> Stale table scan\n    -> Filter: STALE PLAN'))
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(screen.queryByLabelText('执行计划文本')).toBeNull()
  })
})

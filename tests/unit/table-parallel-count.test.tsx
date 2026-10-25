// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
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
    api: { status: mocks.status, query: mocks.query, connect: mocks.connect },
  }
})

import { TableTab } from '../../src/client/TableTab'

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

function pageResult(request: { sql: string }) {
  return {
    sql: request.sql,
    columns: [
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
    ],
    rows: [[1, '手机数码']],
    rowCount: 1,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  }
}

function countResult(request: { sql: string }) {
  return {
    sql: request.sql,
    columns: [{ name: 'COUNT(*)', typeName: 'BIGINT' }],
    rows: [[42]],
    rowCount: 1,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  }
}

describe('table page and row count', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  })

  it('starts counting while the page is still running', async () => {
    let release: (value: unknown) => void = () => undefined
    const pendingCount = new Promise((resolve) => {
      release = resolve
    })
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.startsWith('SELECT COUNT')) return pendingCount
      return Promise.resolve(pageResult(request))
    })

    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    // The page arrives first, but the count was already issued: it did not wait
    // for the page query to settle.
    await screen.findByText('手机数码')
    const issued = mocks.query.mock.calls.map((call) => (call[0] as { sql: string }).sql)
    expect(issued).toHaveLength(2)
    expect(issued[0]).toContain('COUNT(*)')
    expect(issued[1]).toContain('SELECT * FROM')
    expect(screen.queryByText('/42')).toBeNull()

    release(countResult({ sql: issued[0] ?? '' }))
    await waitFor(() => expect(screen.getByText('/42')).toBeTruthy())
  })

  it('hides the total when counting fails', async () => {
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.startsWith('SELECT COUNT')) return Promise.reject(new Error('count blocked'))
      return Promise.resolve(pageResult(request))
    })

    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    await screen.findByText('手机数码')
    await waitFor(() => expect(screen.queryByText(/^\//)).toBeNull())
  })
})

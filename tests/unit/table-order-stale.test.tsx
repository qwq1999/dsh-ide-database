// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  ddl: vi.fn(),
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
    api: { status: mocks.status, query: mocks.query, connect: mocks.connect, ddl: mocks.ddl },
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
  hasPassword: false,
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

const tab = () => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })
const ORDER_KEY = 'dsh-ide-database.table-order.v1:shop.orders'

describe('remembered ORDER BY', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation((request: { sql: string }) =>
      Promise.resolve({
        columns: [
          { name: 'id', type: 'int' },
          { name: 'total', type: 'decimal' },
        ],
        rows: [[1, 9]],
        elapsedMs: 1,
        sql: request.sql,
      }),
    )
  })

  it('drops an order that names a column the table no longer has', async () => {
    localStorage.setItem(ORDER_KEY, 'gone DESC')
    render(<TableTab useTabInfo={tab} />)

    const box = (await screen.findByLabelText('排序列')) as HTMLInputElement
    await waitFor(() => expect(screen.queryByRole('columnheader', { name: /^total/ })).not.toBeNull())
    await waitFor(() => expect(localStorage.getItem(ORDER_KEY)).toBe(''))
    expect(box.value).toBe('')
    const sqls = mocks.query.mock.calls.map((call) => (call[0] as { sql: string }).sql)
    expect(sqls.some((sql) => sql.includes('ORDER BY gone'))).toBe(false)
  })

  it('still applies an order whose column exists', async () => {
    localStorage.setItem(ORDER_KEY, 'total DESC')
    render(<TableTab useTabInfo={tab} />)

    const box = (await screen.findByLabelText('排序列')) as HTMLInputElement
    await waitFor(() => expect(box.value).toBe('total DESC'))
    await waitFor(() => {
      const sqls = mocks.query.mock.calls.map((call) => (call[0] as { sql: string }).sql)
      expect(sqls.some((sql) => sql.includes('ORDER BY total DESC'))).toBe(true)
    })
    expect(localStorage.getItem(ORDER_KEY)).toBe('total DESC')
  })
})

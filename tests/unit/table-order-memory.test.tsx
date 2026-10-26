// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    api: {
      status: mocks.status,
      query: mocks.query,
      connect: mocks.connect,
      ddl: mocks.ddl,
    },
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

function pageSqls(): string[] {
  return mocks.query.mock.calls
    .map((call: unknown[]) => (call[0] as { sql: string }).sql)
    .filter((sql: string) => sql.includes('SELECT * FROM'))
}

describe('table sort order memory', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation(async (request: { sql: string }) =>
      request.sql.includes('COUNT(*)')
        ? { dialect: 'mysql', columns: [], rows: [[2]], rowCount: 1, truncated: false, elapsedMs: 1, warnings: [] }
        : {
            dialect: 'mysql',
            columns: [
              { name: 'id', typeName: 'INTEGER' },
              { name: 'name', typeName: 'VARCHAR' },
            ],
            rows: [
              [1, 'alpha'],
              [2, 'beta'],
            ],
            rowCount: 2,
            truncated: false,
            elapsedMs: 1,
            warnings: [],
          },
    )
  })

  it('queries with the order remembered for this table', async () => {
    window.localStorage.setItem(ORDER_KEY, 'id DESC')
    render(<TableTab useTabInfo={tab} />)

    await screen.findByText('alpha')
    // The ordering is applied once the first page has told us the columns exist.
    await waitFor(() => expect(pageSqls().at(-1)).toContain('ORDER BY id DESC'))
    expect((screen.getByLabelText('排序列') as HTMLInputElement).value).toBe('id DESC')
  })

  it('forgets the order when the sort is cleared', async () => {
    render(<TableTab useTabInfo={tab} />)
    await screen.findByText('alpha')

    const orderInput = screen.getByLabelText('排序列')
    fireEvent.change(orderInput, { target: { value: 'id DESC' } })
    fireEvent.keyDown(orderInput, { key: 'Enter' })

    await waitFor(() => expect(window.localStorage.getItem(ORDER_KEY)).toBe('id DESC'))
    fireEvent.click(screen.getByRole('button', { name: '清空排序' }))

    await waitFor(() => expect(window.localStorage.getItem(ORDER_KEY)).toBe(''))
    await waitFor(() => expect(pageSqls().at(-1)).not.toContain('ORDER BY'))
  })
})

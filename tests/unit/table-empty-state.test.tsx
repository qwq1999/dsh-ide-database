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

describe('table empty grid', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.includes('COUNT(*)')) {
        return Promise.resolve({ columns: [{ name: 'count', type: 'bigint' }], rows: [[0]], elapsedMs: 1, sql: request.sql })
      }
      return Promise.resolve({
        columns: [{ name: 'id', type: 'int' }],
        rows: [],
        elapsedMs: 1,
        sql: request.sql,
      })
    })
  })

  it('says the table has no rows when no condition is set', async () => {
    render(<TableTab useTabInfo={tab} />)
    await waitFor(() => expect(screen.queryByText('这张表还没有数据')).not.toBeNull())
    expect(screen.queryByText('没有匹配的行')).toBeNull()
  })

  it('says no row matches once a where condition is applied', async () => {
    render(<TableTab useTabInfo={tab} />)
    const where = (await screen.findByPlaceholderText(/过滤条件/)) as HTMLInputElement
    fireEvent.change(where, { target: { value: "id = 9" } })
    fireEvent.click(screen.getByRole('button', { name: '应用查询条件' }))
    await waitFor(() => expect(screen.queryByText('没有匹配的行')).not.toBeNull())
    expect(screen.queryByText('这张表还没有数据')).toBeNull()
  })
})

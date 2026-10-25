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
    api: { status: mocks.status, query: mocks.query, connect: mocks.connect, ddl: mocks.ddl },
  }
})

vi.mock('../../src/client/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/export')>()
  return { ...actual, downloadText: vi.fn() }
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

const page = (count: number) => Array.from({ length: count }, (_, index) => [index])

describe('closing the table tab during a full export', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  })

  it('stops asking for more pages once the tab is gone', async () => {
    let releaseSecondPage: (value: unknown) => void = () => undefined
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.includes('COUNT(*)')) {
        return Promise.resolve({ columns: [{ name: 'count' }], rows: [[5000]], elapsedMs: 1, sql: request.sql })
      }
      if (request.sql.includes('OFFSET 2000')) {
        return new Promise((resolve) => {
          releaseSecondPage = resolve
        })
      }
      return Promise.resolve({
        columns: [{ name: 'id', type: 'int' }],
        rows: page(2000),
        elapsedMs: 1,
        sql: request.sql,
      })
    })

    const view = render(<TableTab useTabInfo={tab} />)
    await waitFor(() => expect(screen.getAllByRole('row').length).toBeGreaterThan(1))

    fireEvent.click(screen.getByRole('button', { name: '导出结果' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /^全部 CSV/ }))
    await waitFor(() => expect(mocks.query.mock.calls.some(([request]) => request.sql.includes('OFFSET 2000'))).toBe(true))

    view.unmount()
    releaseSecondPage({
      columns: [{ name: 'id', type: 'int' }],
      rows: page(2000),
      elapsedMs: 1,
      sql: 'SELECT * FROM `shop`.`orders` LIMIT 2000 OFFSET 2000',
    })
    await new Promise((resolve) => setTimeout(resolve, 40))

    const offsets = mocks.query.mock.calls.map(([request]) => request.sql).filter((sql: string) => sql.includes('OFFSET'))
    expect(offsets.some((sql: string) => sql.includes('OFFSET 4000'))).toBe(false)
  })
})

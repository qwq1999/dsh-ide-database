// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const columns = [
  { name: 'id', typeName: 'INT' },
  { name: 'name', typeName: 'VARCHAR' },
  { name: 'slug', typeName: 'VARCHAR' },
]

describe('table column filter', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    // A fresh result object per call, like the real bridge: the previous
    // implementation re-ran the debounce effect whenever columns changed.
    mocks.query.mockImplementation(async (request: { sql: string }) => ({
      sql: request.sql,
      columns: columns.map((column) => ({ ...column })),
      rows: [[1, '手机数码', 'digital']],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    }))
  })

  it('queries once per typing pause instead of polling after every load', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    // Initial page + best-effort count.
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const filterButton = await screen.findByLabelText('列筛选') as HTMLButtonElement
    await waitFor(() => expect(filterButton.disabled).toBe(false))

    fireEvent.click(filterButton)
    fireEvent.change(await screen.findByLabelText('筛选 name'), { target: { value: '手机' } })

    // The debounce re-queries the page and recounts exactly once.
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(4), { timeout: 3000 })
    const settled = mocks.query.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 700))
    expect(mocks.query.mock.calls.length).toBe(settled)
  })
})

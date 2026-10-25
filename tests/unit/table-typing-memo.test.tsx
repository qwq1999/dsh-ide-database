// @vitest-environment jsdom
/**
 * Typing into the WHERE / ORDER BY boxes only edits text: the result grid must
 * stay untouched until the query is applied again. The grid is memoized, so a
 * keystroke that leaves every prop identical should not repaint any cell —
 * counted through formatCell, which runs once per cell per paint.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  formatCell: vi.fn(),
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

vi.mock('../../src/client/format', async () => {
  const actual = await vi.importActual<typeof import('../../src/client/format')>('../../src/client/format')
  return {
    ...actual,
    formatCell: (value: Parameters<typeof actual.formatCell>[0]): string => {
      mocks.formatCell(value)
      return actual.formatCell(value)
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

function result(sql: string) {
  return {
    sql,
    columns: [
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
    ],
    rows: [
      [1, 'Alice'],
      [2, 'Bob'],
      [3, 'Cara'],
    ],
    rowCount: 3,
    truncated: false,
    elapsedMs: 2,
    warnings: [],
  }
}

describe('table result grid memoization', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [mysql], settings, drivers: [] },
      drivers: [],
      env: {},
    })
    mocks.query.mockImplementation(async (request: { sql: string }) => {
      if (request.sql.includes('COUNT(*)')) {
        return { ...result(request.sql), columns: [{ name: 'COUNT(*)', typeName: 'BIGINT' }], rows: [[3]], rowCount: 1 }
      }
      return result(request.sql)
    })
  })

  it('repaints no cell while the condition text is edited', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    expect(await screen.findByText('Alice')).toBeTruthy()
    await waitFor(() => expect(mocks.formatCell).toHaveBeenCalled())

    mocks.formatCell.mockClear()
    const where = screen.getByPlaceholderText(/过滤条件/) as HTMLInputElement
    fireEvent.change(where, { target: { value: 'i' } })
    fireEvent.change(where, { target: { value: 'id > 1' } })

    expect(mocks.formatCell).not.toHaveBeenCalled()

    const before = mocks.query.mock.calls.length
    fireEvent.click(screen.getByLabelText('应用查询条件'))
    await waitFor(() => expect(mocks.query.mock.calls.length).toBeGreaterThan(before))
    await waitFor(() => expect(mocks.formatCell).toHaveBeenCalled())
  })
})

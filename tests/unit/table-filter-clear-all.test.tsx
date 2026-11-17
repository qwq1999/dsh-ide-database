// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: { status: mocks.status, query: mocks.query, connect: mocks.connect },
  ApiError: class ApiError extends Error {},
}))

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
]

function lastSelect(): string {
  const calls = mocks.query.mock.calls as Array<[{ sql: string }]>
  for (let index = calls.length - 1; index >= 0; index -= 1) {
    const sql = calls[index]?.[0]?.sql ?? ''
    if (sql.includes('SELECT *')) return sql
  }
  return ''
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  mocks.query.mockImplementation(async (request: { sql: string }) => ({
    sql: request.sql,
    columns: columns.map((column) => ({ ...column })),
    rows: [[1, '手机数码']],
    rowCount: 1,
    truncated: false,
    elapsedMs: 2,
    warnings: [],
  }))
})

afterEach(() => {
  cleanup()
})

describe('clearing every column filter', () => {
  it('drops all filters in one click and re-queries without them', async () => {
    render(
      <TableTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })} />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const toggle = (await screen.findByLabelText('列筛选')) as HTMLButtonElement
    await waitFor(() => expect(toggle.disabled).toBe(false))
    expect(screen.queryByLabelText('清除列筛选')).toBeNull()

    fireEvent.click(toggle)
    fireEvent.change(await screen.findByLabelText('筛选 name'), { target: { value: '手机' } })
    await waitFor(() => expect(lastSelect()).toContain('手机'))
    const clear = await screen.findByLabelText('清除列筛选')

    fireEvent.click(clear)
    await waitFor(() => expect(lastSelect()).not.toContain('手机'))
    await waitFor(() => expect(screen.queryByLabelText('清除列筛选')).toBeNull())
  })
})

describe('EmptyState clear-conditions with the filter row closed', () => {
  it('re-queries without column filters after the filter row is closed', async () => {
    // The previous test persisted `filtersOpen=true` to localStorage; start
    // from a closed filter row so the toggle below opens it.
    localStorage.removeItem('dsh-ide-database.table.filters-open.v1')
    // Mock: a filtered query returns no rows, an unfiltered one returns data.
    mocks.query.mockImplementation(async (request: { sql: string }) => ({
      sql: request.sql,
      columns: columns.map((column) => ({ ...column })),
      rows: request.sql.includes('LIKE') ? [] : [[1, '手机数码']],
      rowCount: request.sql.includes('LIKE') ? 0 : 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    }))
    render(
      <TableTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })} />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBeGreaterThan(0))

    // Open the filter row and enter a value that matches nothing. Re-query the
    // button each time: React replaces the DOM node on re-render.
    await waitFor(() => expect((screen.getByLabelText('列筛选') as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByLabelText('列筛选'))
    await waitFor(() => expect(screen.getByLabelText('列筛选').getAttribute('aria-pressed')).toBe('true'))
    fireEvent.change(await screen.findByLabelText('筛选 name'), { target: { value: 'zzz' } })
    await waitFor(() => expect(lastSelect()).toContain('zzz'))
    await waitFor(() => expect(screen.queryByText('没有匹配的行')).not.toBeNull())

    // Close the filter row. The filter is still in effect (EmptyState remains).
    fireEvent.click(screen.getByLabelText('列筛选'))
    await waitFor(() => expect(screen.queryByLabelText('筛选 name')).toBeNull())
    expect(screen.queryByText('没有匹配的行')).not.toBeNull()

    // Clear conditions from the EmptyState. The re-query must drop the column
    // filter, otherwise the empty result is a dead end with no obvious recovery.
    const clear = screen.getByTitle('清掉过滤条件、列筛选与排序再查一次')
    fireEvent.click(clear)
    await waitFor(() => expect(lastSelect()).not.toContain('zzz'))
    await waitFor(() => expect(screen.queryByText('手机数码')).not.toBeNull())
  })
})

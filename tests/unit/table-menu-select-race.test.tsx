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

function renderTable() {
  return render(
    <TableTab
      useTabInfo={() => ({
        tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } },
      })}
    />,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  mocks.query.mockImplementation(async (request: { sql: string }) => ({
    sql: request.sql,
    columns: columns.map((column) => ({ ...column })),
    rows: [[1, '手机数码'], [2, '手机配件'], [3, '电脑']],
    rowCount: 3,
    truncated: false,
    elapsedMs: 2,
    warnings: [],
  }))
})

afterEach(() => cleanup())

describe('table cell menu and range selection', () => {
  it('re-queries without the filter when clearing it from the cell menu', async () => {
    renderTable()
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const toggle = (await screen.findByLabelText('列筛选')) as HTMLButtonElement
    await waitFor(() => expect(toggle.disabled).toBe(false))
    // Set a filter through the column-filter panel.
    fireEvent.click(toggle)
    fireEvent.change(await screen.findByLabelText('筛选 name'), { target: { value: '手机' } })
    await waitFor(() => expect(lastSelect()).toContain('手机'))

    // Clear it from the cell context menu (the filter is still active in the UI).
    const cell = screen.getByText('手机数码').closest('td')
    if (cell === null) throw new Error('missing cell')
    fireEvent.contextMenu(cell)
    fireEvent.click(await screen.findByRole('menuitem', { name: '取消「name」列的筛选' }))
    await waitFor(() => expect(lastSelect()).not.toContain('手机'))
  })

  it('extends a range from the anchor on shift-click instead of collapsing it', async () => {
    renderTable()
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const row1 = (await screen.findByLabelText('选择第 1 行')) as HTMLInputElement
    const row2 = (await screen.findByLabelText('选择第 2 行')) as HTMLInputElement
    const row3 = (await screen.findByLabelText('选择第 3 行')) as HTMLInputElement

    // Anchor on row 1, then shift-click row 3: rows 1-3 must all be selected.
    fireEvent.click(row1)
    fireEvent.click(row3, { shiftKey: true })
    expect(row1.checked).toBe(true)
    expect(row2.checked).toBe(true)
    expect(row3.checked).toBe(true)
  })
})

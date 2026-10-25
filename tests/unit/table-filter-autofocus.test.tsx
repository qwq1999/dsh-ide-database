// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  ddl: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: {
    status: mocks.status,
    schemas: mocks.schemas,
    objects: mocks.objects,
    query: mocks.query,
    connect: mocks.connect,
    ddl: mocks.ddl,
  },
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
  { name: 'id', type: 'int' },
  { name: 'name', type: 'varchar' },
]

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  mocks.query.mockImplementation(async (request: { sql: string }) => ({
    sql: request.sql,
    columns: columns.map((column) => ({ ...column })),
    rows: [[1, '手机']],
    rowCount: 1,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  }))
})

afterEach(() => {
  cleanup()
})

describe('column filter row focus', () => {
  it('puts the caret in the first filter box when the row opens', async () => {
    render(
      <TableTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })} />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const toggle = (await screen.findByLabelText('列筛选')) as HTMLButtonElement
    await waitFor(() => expect(toggle.disabled).toBe(false))

    fireEvent.click(toggle)
    const box = await screen.findByLabelText('筛选 id')
    await waitFor(() => expect(document.activeElement).toBe(box))
  })

  it('closes the filter row on Escape without dropping what is already applied', async () => {
    render(
      <TableTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })} />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const toggle = (await screen.findByLabelText('列筛选')) as HTMLButtonElement
    await waitFor(() => expect(toggle.disabled).toBe(false))

    fireEvent.click(toggle)
    const box = await screen.findByLabelText('筛选 id')
    fireEvent.change(box, { target: { value: '9' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(screen.queryByLabelText('筛选 id')).not.toBeNull())

    fireEvent.keyDown(box, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByLabelText('筛选 id')).toBeNull())
    const last = mocks.query.mock.calls[mocks.query.mock.calls.length - 1]?.[0] as { sql: string }
    expect(last.sql).toContain('id')
  })

  it('opens the filter row again on the next visit', async () => {
    window.localStorage.setItem('dsh-ide-database.table.filters-open.v1', '1')
    render(
      <TableTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })} />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    expect(await screen.findByLabelText('筛选 id')).toBeTruthy()
  })
})

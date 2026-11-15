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

const mysql2 = { ...mysql, id: 'mysql-2', name: '另一个 MySQL' }

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
  { name: 'payload', typeName: 'BLOB' },
]

describe('table column filter', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql, mysql2], settings, drivers: [] }, drivers: [], env: {} })
    // A fresh result object per call, like the real bridge: the previous
    // implementation re-ran the debounce effect whenever columns changed.
    mocks.query.mockImplementation(async (request: { sql: string }) => ({
      sql: request.sql,
      columns: columns.map((column) => ({ ...column })),
      rows: [[1, '手机数码', 'digital', '<binary 3 bytes>']],
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

  it('does not carry column filters to another table', async () => {
    const view = (table: string) => (
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table } } },
        })}
      />
    )
    const rendered = render(view('orders'))

    const filterButton = await screen.findByLabelText('列筛选') as HTMLButtonElement
    await waitFor(() => expect(filterButton.disabled).toBe(false))
    fireEvent.click(filterButton)
    fireEvent.change(await screen.findByLabelText('筛选 name'), { target: { value: '手机' } })
    await waitFor(
      () => expect(mocks.query.mock.calls.some((call) => String(call[0]?.sql).includes("`name` LIKE"))).toBe(true),
      { timeout: 3000 },
    )

    rendered.rerender(view('customers'))
    const name = await screen.findByLabelText('筛选 name') as HTMLInputElement
    expect(name.value).toBe('')
  })

  it('does not offer a text filter for a binary column', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    const filterButton = await screen.findByLabelText('列筛选') as HTMLButtonElement
    await waitFor(() => expect(filterButton.disabled).toBe(false))
    fireEvent.click(filterButton)

    const payload = await screen.findByLabelText('筛选 payload') as HTMLInputElement
    expect(payload.disabled).toBe(true)
    expect(payload.title).toContain('二进制列')
  })

  it('does not apply hidden columns from another connection', async () => {
    window.localStorage.setItem(
      'dsh-ide-database.hidden.v1:table:mysql-1:shop.orders',
      JSON.stringify(['id']),
    )
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: 'mysql-2', schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    await waitFor(() => {
      const headers = screen.getAllByRole('columnheader').map((cell) => cell.textContent ?? '')
      expect(headers.some((text) => text.startsWith('id'))).toBe(true)
    })
  })

  it('aligns binary detection with the visible columns when an earlier column is hidden', async () => {
    window.localStorage.setItem(
      'dsh-ide-database.hidden.v1:table:mysql-1:shop.orders',
      JSON.stringify(['id']),
    )
    const bitColumns = [
      { name: 'id', typeName: 'INT' },
      { name: 'flags', typeName: 'BIT' },
    ]
    mocks.query.mockImplementation(async (request: { sql: string }) => ({
      sql: request.sql,
      columns: bitColumns.map((column) => ({ ...column })),
      rows: [[1, '<binary 1 bytes>']],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    }))
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    const filterButton = await screen.findByLabelText('列筛选') as HTMLButtonElement
    await waitFor(() => expect(filterButton.disabled).toBe(false))
    fireEvent.click(filterButton)

    expect(screen.queryByLabelText('筛选 id')).toBeNull()
    const flags = await screen.findByLabelText('筛选 flags') as HTMLInputElement
    expect(flags.disabled).toBe(true)
    expect(flags.title).toContain('二进制列')
  })

  it('handles columns named like object prototype properties', async () => {
    const oddColumns = [
      { name: 'constructor', typeName: 'TEXT' },
      { name: '__proto__', typeName: 'TEXT' },
    ]
    mocks.query.mockImplementation(async (request: { sql: string }) => ({
      sql: request.sql,
      columns: oddColumns.map((column) => ({ ...column })),
      rows: [['a', 'b']],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    }))
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    const filterButton = await screen.findByLabelText('列筛选') as HTMLButtonElement
    await waitFor(() => expect(filterButton.disabled).toBe(false))
    fireEvent.click(filterButton)

    const constructor = await screen.findByLabelText('筛选 constructor') as HTMLInputElement
    expect(constructor.value).toBe('')
    expect((await screen.findByLabelText('筛选 __proto__') as HTMLInputElement).value).toBe('')
    fireEvent.change(constructor, { target: { value: 'a' } })

    await waitFor(
      () => expect(mocks.query.mock.calls.some((call) => String(call[0]?.sql).includes('`constructor`'))).toBe(true),
      { timeout: 3000 },
    )
  })

  it('disables a filter whose vague type renders binary placeholders', async () => {
    const bitColumns = [
      { name: 'id', typeName: 'INT' },
      { name: 'flags', typeName: 'BIT' },
    ]
    mocks.query.mockImplementation(async (request: { sql: string }) => ({
      sql: request.sql,
      columns: bitColumns.map((column) => ({ ...column })),
      rows: [[1, '<binary 1 bytes>']],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    }))
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    const filterButton = await screen.findByLabelText('列筛选') as HTMLButtonElement
    await waitFor(() => expect(filterButton.disabled).toBe(false))
    fireEvent.click(filterButton)

    const flags = await screen.findByLabelText('筛选 flags') as HTMLInputElement
    expect(flags.disabled).toBe(true)
    expect(flags.title).toContain('二进制列')
  })
})

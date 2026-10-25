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
import { setConsoleTabOpener } from '../../src/client/tab-open'

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

describe('table export menu', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation(async (request: { sql: string }) => ({
      sql: request.sql,
      columns: [{ name: 'total', typeName: 'DECIMAL' }],
      rows: [[93.02]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    }))
  })

  it('offers page JSON and closes on an outside click or Escape', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )

    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const trigger = await screen.findByLabelText('导出结果') as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    fireEvent.click(trigger)
    expect(await screen.findByRole('menuitem', { name: /当前页 JSON/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /当前页 SQL/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /当前页 CSV/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /全部 CSV/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /全部 JSON/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /全部 SQL/ })).toBeTruthy()

    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

    fireEvent.click(trigger)
    expect(await screen.findByRole('menu')).toBeTruthy()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  it('hands the table and its filters to the query console', async () => {
    const opened: unknown[] = []
    setConsoleTabOpener((params) => opened.push(params))
    try {
      render(
        <TableTab
          useTabInfo={() => ({
            tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
          })}
        />,
      )
      await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))

      const button = (await screen.findByLabelText('在查询控制台打开')) as HTMLButtonElement
      await waitFor(() => expect(button.disabled).toBe(false))
      fireEvent.click(button)

      expect(opened).toEqual([
        { connectionId: mysql.id, sql: 'SELECT * FROM `shop`.`orders` LIMIT 500 OFFSET 0' },
      ])
    } finally {
      setConsoleTabOpener(undefined)
    }
  })

  it('opens the console with a WHERE clause for one cell value', async () => {
    const opened: unknown[] = []
    setConsoleTabOpener((params) => opened.push(params))
    try {
      render(
        <TableTab
          useTabInfo={() => ({
            tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
          })}
        />,
      )
      await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))

      fireEvent.contextMenu(await screen.findByText('93.02'))
      const item = await screen.findByRole('menuitem', { name: '在控制台按该值查询' })
      fireEvent.click(item)

      expect(opened).toEqual([
        {
          connectionId: mysql.id,
          sql: 'SELECT * FROM `shop`.`orders` WHERE `total` = 93.02 LIMIT 500 OFFSET 0',
        },
      ])
    } finally {
      setConsoleTabOpener(undefined)
    }
  })
})

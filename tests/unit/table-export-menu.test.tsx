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

const copies = vi.hoisted(() => vi.fn(() => Promise.resolve(true)))
const downloads = vi.hoisted(() => vi.fn())

vi.mock('../../src/client/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/export')>()
  return { ...actual, downloadText: downloads }
})

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/colmenu')>()
  return { ...actual, copyText: copies }
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
    mocks.ddl.mockResolvedValue({
      schema: 'shop',
      table: 'orders',
      kind: 'table',
      ddl: 'CREATE TABLE `orders` (`total` DECIMAL)',
      source: 'query',
      warnings: [],
    })
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
    expect(await screen.findByRole('menuitem', { name: /^当前页 JSON/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /^当前页 SQL/ })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: /^当前页 CSV/ })).toBeTruthy()
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

  it('closes the menu after picking an item', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制当前页 Markdown' }))
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
  })

  it('copies the current page as a Markdown table', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制当前页 Markdown' }))

    await waitFor(() => expect(copies).toHaveBeenCalled())
    const expected = ['| total |', '| --- |', '| 93.02 |', ''].join(String.fromCharCode(10))
    expect(copies.mock.calls.at(-1)?.[0]).toBe(expected)
  })

  it('copies the current page as JSON', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制当前页 JSON' }))

    await waitFor(() => expect(copies).toHaveBeenCalled())
    const text = String(copies.mock.calls.at(-1)?.[0] ?? '')
    expect(text).toContain('"total"')
    expect(text).toContain('93.02')
  })

  it('copies the current page as INSERT statements', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制当前页 SQL' }))

    await waitFor(() => expect(copies).toHaveBeenCalled())
    const text = String(copies.mock.calls.at(-1)?.[0] ?? '')
    expect(text).toContain('INSERT INTO `shop`.`orders`')
    expect(text).toContain('93.02')
  })

  it('copies the current page as CSV text', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制当前页 CSV' }))

    await waitFor(() => expect(copies).toHaveBeenCalled())
    const crlf = String.fromCharCode(13, 10)
    const expected = ['total', '93.02'].join(crlf) + crlf
    expect(copies.mock.calls.at(-1)?.[0]).toBe(expected)
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

  it('opens the console with a group-by count for one cell column', async () => {
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
      fireEvent.click(await screen.findByRole('menuitem', { name: '按此列分组计数' }))

      expect(opened).toEqual([
        {
          connectionId: mysql.id,
          sql: 'SELECT `total`, COUNT(*) AS `count` FROM `shop`.`orders` GROUP BY `total` ORDER BY `count` DESC',
        },
      ])
    } finally {
      setConsoleTabOpener(null)
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

  it('copies a SELECT listing every column from the header menu', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))

    const header = screen
      .getAllByRole('columnheader')
      .find((cell) => (cell.textContent ?? '').startsWith('total'))
    if (header === undefined) throw new Error('missing total header')

    fireEvent.contextMenu(header)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制查询语句（1 列）' }))

    expect(copies).toHaveBeenCalledWith('SELECT `total` FROM `shop`.`orders`')
  })

  it('exports the table as a runnable script with its DDL', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))
    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: '整表脚本（建表 + 数据）' }))

    await waitFor(() => expect(downloads).toHaveBeenCalled())
    const call = downloads.mock.calls.at(-1) ?? []
    expect(String(call[0])).toMatch(/^shop\.orders-\d{8}-\d{6}\.sql$/)
    expect(call[1]).toBe('application/sql')
    expect(String(call[2])).toContain('CREATE TABLE `orders`')
    expect(String(call[2])).toContain('INSERT INTO `shop`.`orders`')
    expect(mocks.ddl).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table')
  })
})

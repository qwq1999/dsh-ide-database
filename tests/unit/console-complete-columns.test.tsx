// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  describe: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  redisScan: vi.fn(),
  redisDatabases: vi.fn(),
  redisKey: vi.fn(),
  redisCommand: vi.fn(),
  explain: vi.fn(),
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
      schemas: mocks.schemas,
      objects: mocks.objects,
      describe: mocks.describe,
      query: mocks.query,
      connect: mocks.connect,
      redisScan: mocks.redisScan,
      redisDatabases: mocks.redisDatabases,
      redisKey: mocks.redisKey,
      redisCommand: mocks.redisCommand,
      explain: mocks.explain,
    },
  }
})

import { ConsoleTab } from '../../src/client/ConsoleTab'

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

const tabWith = (connectionId: string) => () => ({ tab: { navigation: { params: { connectionId } } } })

function editor(): HTMLTextAreaElement {
  const area = document.querySelector('textarea')
  if (area === null) throw new Error('missing SQL editor')
  return area
}

function caret(area: HTMLTextAreaElement, at: number): void {
  area.focus()
  area.setSelectionRange(at, at)
  fireEvent.select(area)
}

describe('console column completion', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }, { name: 'crm' }] })
    mocks.objects.mockResolvedValue({ objects: [{ name: 'orders', kind: 'table' }, { name: 'customers', kind: 'table' }] })
    mocks.describe.mockResolvedValue({
      schema: 'shop',
      table: 'orders',
      kind: 'table',
      columns: [
        { name: 'id', typeName: 'INT', nullable: false },
        { name: 'total', typeName: 'DECIMAL', nullable: true },
        { name: 'created_at', typeName: 'DATETIME', nullable: true },
      ],
      indexes: [],
      warnings: [],
    })
    mocks.query.mockResolvedValue({
      sql: 'SELECT 1',
      columns: [{ name: 'ok', typeName: 'INT' }],
      rows: [[1]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    })
  })

  it('offers the columns of the table before the dot', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    fireEvent.change(area, { target: { value: 'SELECT * FROM orders WHERE orders.' } })
    caret(area, area.value.length)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })

    const list = await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table'))
    const names = Array.from(list.querySelectorAll('.dshdb-complete-name')).map((item) => item.textContent)
    expect(names).toEqual(['id', 'total', 'created_at'])
    const kinds = Array.from(list.querySelectorAll('.dshdb-complete-kind')).map((item) => item.textContent)
    expect(kinds).toEqual(['列', '列', '列'])

    fireEvent.mouseDown(screen.getByText('total'))
    await waitFor(() => expect(editor().value).toBe('SELECT * FROM orders WHERE orders.total'))
  })

  it('keeps the schema the user typed', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    fireEvent.change(area, { target: { value: 'SELECT * FROM shop.orders.' } })
    caret(area, area.value.length)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })

    await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table'))
    fireEvent.mouseDown(screen.getByText('id'))
    await waitFor(() => expect(editor().value).toBe('SELECT * FROM shop.orders.id'))
  })

  it('lists the tables of a schema qualifier', async () => {
    mocks.describe.mockRejectedValue(new Error('表不存在'))
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    fireEvent.change(area, { target: { value: 'SELECT * FROM shop.' } })
    caret(area, area.value.length)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })

    const list = await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.objects).toHaveBeenCalledWith('mysql-1', 'shop'))
    const names = Array.from(list.querySelectorAll('.dshdb-complete-name')).map((item) => item.textContent)
    expect(names).toEqual(['orders', 'customers'])

    fireEvent.mouseDown(screen.getByText('orders'))
    await waitFor(() => expect(editor().value).toBe('SELECT * FROM shop.orders'))
  })

  it('refetches columns after a statement that changes the table', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    fireEvent.change(area, { target: { value: 'SELECT * FROM orders.' } })
    caret(area, area.value.length)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledTimes(1))

    fireEvent.keyDown(area, { key: 'Escape' })
    fireEvent.change(area, { target: { value: 'ALTER TABLE orders ADD COLUMN x INT' } })
    fireEvent.keyDown(area, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(mocks.schemas.mock.calls.length).toBeGreaterThan(1))

    fireEvent.change(area, { target: { value: 'SELECT * FROM orders.' } })
    caret(area, area.value.length)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledTimes(2))
  })
})

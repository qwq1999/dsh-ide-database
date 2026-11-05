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

/** Put the caret at `at` and let the editor publish its position. */
function typeSql(area: HTMLTextAreaElement, value: string): void {
  fireEvent.change(area, { target: { value } })
  area.focus()
  area.setSelectionRange(value.length, value.length)
  fireEvent.select(area)
}

describe('console context-aware completion', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({
      objects: [{ name: 'orders', kind: 'table' }, { name: 'customers', kind: 'table' }],
    })
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

  it('offers the columns of the tables the statement already mentions', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM orders WHERE ')
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })

    const list = await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table'))
    const names = Array.from(list.querySelectorAll('.dshdb-complete-name')).map((item) => item.textContent)
    expect(names.slice(0, 3)).toEqual(['id', 'total', 'created_at'])
    const details = Array.from(list.querySelectorAll('.dshdb-complete-detail')).map((item) => item.textContent)
    expect(details.slice(0, 3)).toEqual(['INT', 'DECIMAL', 'DATETIME'])
  })

  it('resolves an alias before the dot to its table', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM orders o WHERE o.')
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })

    const list = await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table'))
    const names = Array.from(list.querySelectorAll('.dshdb-complete-name')).map((item) => item.textContent)
    expect(names).toEqual(['id', 'total', 'created_at'])
  })

  it('finds a column from a partial subsequence', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM orders WHERE crat')
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })

    await waitFor(() => expect(screen.getByText('created_at')).toBeTruthy())
  })

  it('offers SQL functions and inserts the opening parenthesis', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM orders WHERE cou')
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })

    await waitFor(() => expect(screen.getByText('COUNT')).toBeTruthy())
    fireEvent.mouseDown(screen.getByText('COUNT'))
    await waitFor(() => expect(editor().value).toBe('SELECT * FROM orders WHERE COUNT('))
  })
})
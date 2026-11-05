// @vitest-environment jsdom
/**
 * End-to-end completion behaviour of the real `ConsoleTab`.
 *
 * The core engine has its own unit tests; these tests render the console with a
 * mocked HTTP API and check what a user actually sees in the popup: which
 * metadata is requested, which rows are listed first, and that a stale (slow)
 * response cannot overwrite the suggestions of the newest request.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

/** Put the caret at the end, let the editor publish its position, ask for the popup. */
function typeSql(area: HTMLTextAreaElement, value: string): void {
  fireEvent.change(area, { target: { value } })
  area.focus()
  area.setSelectionRange(value.length, value.length)
  fireEvent.select(area)
}

function completeAt(area: HTMLTextAreaElement): void {
  fireEvent.keyDown(area, { key: ' ', ctrlKey: true })
}

function popup(): HTMLElement {
  return screen.getByRole('listbox', { name: '补全候选' })
}

function names(): (string | null)[] {
  return Array.from(popup().querySelectorAll('.dshdb-complete-name')).map((item) => item.textContent)
}

function details(): (string | null)[] {
  return Array.from(popup().querySelectorAll('.dshdb-complete-detail')).map((item) => item.textContent)
}

function kinds(): (string | null)[] {
  return Array.from(popup().querySelectorAll('.dshdb-complete-kind')).map((item) => item.textContent)
}

interface TableColumn {
  name: string
  typeName: string
  nullable: boolean
}

const COLUMNS: Record<string, TableColumn[]> = {
  orders: [
    { name: 'id', typeName: 'INT', nullable: false },
    { name: 'total', typeName: 'DECIMAL', nullable: true },
    { name: 'created_at', typeName: 'DATETIME', nullable: true },
  ],
  customers: [
    { name: 'id', typeName: 'INT', nullable: false },
    { name: 'name', typeName: 'VARCHAR', nullable: false },
    { name: 'email', typeName: 'VARCHAR', nullable: true },
  ],
}

function describeResult(schema: string, table: string) {
  const columns = COLUMNS[table]
  if (columns === undefined) throw new Error(`表 ${schema}.${table} 不存在`)
  return { schema, table, kind: 'table', columns, indexes: [], warnings: [] }
}

/** A promise a test can resolve by hand, to control the response order. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

describe('console completion integration', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({
      objects: [
        { name: 'orders', kind: 'table' },
        { name: 'customers', kind: 'table' },
      ],
    })
    mocks.describe.mockImplementation(async (_connectionId: string, schema: string, table: string) =>
      describeResult(schema, table),
    )
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

  it('lists tables before keywords after FROM', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM ')
    completeAt(area)

    await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.objects).toHaveBeenCalledWith('mysql-1', 'shop'))

    // Tables first, then the schema, then keywords: no columns or stray words
    // sneak in front of the relations the caret can hold.
    expect(names().slice(0, 3)).toEqual(['orders', 'customers', 'shop'])
    expect(kinds().slice(0, 3)).toEqual(['表', '表', '库'])
    // Relation completion never reads column metadata.
    expect(mocks.describe).not.toHaveBeenCalled()
  })

  it('lists the columns of every table a JOIN mentions, with their types', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM orders o JOIN customers c WHERE ')
    completeAt(area)

    await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => {
      expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table')
      expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'customers', 'table')
    })

    expect(names().slice(0, 5)).toEqual(['id', 'total', 'created_at', 'name', 'email'])
    expect(details().slice(0, 5)).toEqual(['INT', 'DECIMAL', 'DATETIME', 'VARCHAR', 'VARCHAR'])
    expect(kinds().slice(0, 5)).toEqual(['列', '列', '列', '列', '列'])
  })

  it('only offers the alias table columns after alias dot', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM orders o WHERE o.')
    completeAt(area)

    await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table'))

    expect(names()).toEqual(['id', 'total', 'created_at'])
    // The other relation of the statement (if any) must not leak in, and the
    // alias itself resolves through `orders`, not through the alias name.
    expect(mocks.describe).toHaveBeenCalledTimes(1)
    expect(mocks.describe).not.toHaveBeenCalledWith('mysql-1', 'shop', 'o', 'table')
  })

  it('lists the tables of a schema qualifier', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM shop.')
    completeAt(area)

    await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.objects).toHaveBeenCalledWith('mysql-1', 'shop'))

    // `shop` is also the current schema, so the engine tries it as a table
    // first and falls back to the object list when that read fails.
    expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'shop', 'table')
    expect(names()).toEqual(['orders', 'customers'])
    expect(details()).toEqual(['shop', 'shop'])
    expect(kinds()).toEqual(['表', '表'])
  })

  it('lists the target table columns inside an INSERT column list', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'INSERT INTO orders (')
    completeAt(area)

    await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table'))

    expect(names().slice(0, 3)).toEqual(['id', 'total', 'created_at'])
    expect(details().slice(0, 3)).toEqual(['INT', 'DECIMAL', 'DATETIME'])
    expect(kinds().slice(0, 3)).toEqual(['列', '列', '列'])
  })

  it('ignores a slow earlier request when the user keeps typing', async () => {
    const slowOrders = deferred<ReturnType<typeof describeResult>>()
    const fastCustomers = deferred<ReturnType<typeof describeResult>>()
    mocks.describe.mockImplementation((_connectionId: string, _schema: string, table: string) =>
      table === 'orders' ? slowOrders.promise : fastCustomers.promise,
    )

    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * FROM orders WHERE ')
    completeAt(area)
    // The first popup is now stuck on the orders read.
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table'))

    // Keep typing: the second request must cancel the first one.
    typeSql(area, 'SELECT * FROM customers WHERE ')
    completeAt(area)
    await waitFor(() => expect(mocks.describe).toHaveBeenCalledWith('mysql-1', 'shop', 'customers', 'table'))

    // The newest metadata arrives first; the popup shows its columns.
    await act(async () => {
      fastCustomers.resolve(describeResult('shop', 'customers'))
    })
    await screen.findByRole('listbox', { name: '补全候选' })
    await waitFor(() => expect(names().slice(0, 3)).toEqual(['id', 'name', 'email']))

    // The stale orders response lands last. It must be discarded (aborted
    // controller / request id), not replace the customers list.
    await act(async () => {
      slowOrders.resolve(describeResult('shop', 'orders'))
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(names().slice(0, 3)).toEqual(['id', 'name', 'email'])
    expect(details().slice(0, 3)).toEqual(['INT', 'VARCHAR', 'VARCHAR'])
  })

  it('keeps keywords reachable when the schema has hundreds of tables', async () => {
    mocks.objects.mockResolvedValue({
      objects: Array.from({ length: 200 }, (_, index) => ({ name: `业务表_${index}`, kind: 'table' })),
    })
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, '')
    completeAt(area)

    await screen.findByRole('listbox', { name: '补全候选' })
    // A big table list must not eat every row of the capped popup: the words
    // that start the next clause have to stay reachable.
    expect(names()).toContain('FROM')
    expect(kinds()).toContain('关键字')
  })

  it('offers FROM at the end of a select list', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * ')
    completeAt(area)

    await screen.findByRole('listbox', { name: '补全候选' })
    expect(names()).toContain('FROM')
  })

  it('recomputes the popup when the caret reaches a new clause', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, 'SELECT * ')
    completeAt(area)
    await screen.findByRole('listbox', { name: '补全候选' })

    // Type `from` and press space one character at a time while the popup from
    // the empty context is still open: the paused list must be replaced with
    // the tables the new clause can hold.
    for (const text of ['SELECT * f', 'SELECT * fr', 'SELECT * fro', 'SELECT * from', 'SELECT * from ']) {
      typeSql(area, text)
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 140))
      })
    }

    await waitFor(() => expect(names()).toContain('orders'), { timeout: 2000 })
    expect(kinds().slice(0, 2)).toEqual(['表', '表'])
  })

  it('does not open the popup inside a string literal or comment', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, "SELECT 'he")
    completeAt(area)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(screen.queryByRole('listbox', { name: '补全候选' })).toBeNull()

    typeSql(area, 'SELECT * FROM orders -- note')
    completeAt(area)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(screen.queryByRole('listbox', { name: '补全候选' })).toBeNull()
  })

  it('completes again after the string literal closes', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    typeSql(area, "SELECT 'hi' ")
    completeAt(area)

    await screen.findByRole('listbox', { name: '补全候选' })
    expect(names().length).toBeGreaterThan(0)
  })
})

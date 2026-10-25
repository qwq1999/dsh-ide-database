// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  redisScan: vi.fn(),
  redisDatabases: vi.fn(),
  redisKey: vi.fn(),
  redisCommand: vi.fn(),
  explain: vi.fn(),
  copies: vi.fn(),
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

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, copyText: mocks.copies }
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

function treeExplain(text) {
  return {
    dialect: 'mysql',
    statements: ['EXPLAIN FORMAT=TREE SELECT * FROM orders'],
    plan: {
      sql: 'EXPLAIN FORMAT=TREE SELECT * FROM orders',
      columns: [{ name: 'EXPLAIN', typeName: 'VARCHAR' }],
      rows: [[text]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    },
    warnings: [],
  }
}

describe('console tree-shaped execution plan', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  it('shows a single-column tree plan as preformatted text', async () => {
    const tree = '-> Nested loop inner join\n    -> Table scan on o\n    -> Index lookup on c'
    mocks.explain.mockResolvedValue(treeExplain(tree))

    render(<ConsoleTab />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'EXPLAIN FORMAT=TREE SELECT * FROM orders' } })
    fireEvent.click(await screen.findByRole('button', { name: '执行计划' }))

    const pre = await screen.findByLabelText('执行计划文本')
    expect(pre.tagName).toBe('PRE')
    expect(pre.textContent).toBe(tree)
    expect(document.querySelector('[role="grid"]')).toBeNull()
  })

  it('copies the plan text from the plan bar', async () => {
    const tree = '-> Table scan on o'
    mocks.explain.mockResolvedValue(treeExplain(tree))

    render(<ConsoleTab />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'EXPLAIN FORMAT=TREE SELECT * FROM orders' } })
    fireEvent.click(await screen.findByRole('button', { name: '执行计划' }))

    await screen.findByLabelText('执行计划文本')
    fireEvent.click(screen.getByRole('button', { name: '复制计划' }))
    expect(mocks.copies).toHaveBeenCalledWith(tree)
  })

  it('keeps tabular plans in the grid', async () => {
    mocks.explain.mockResolvedValue({
      dialect: 'mysql',
      statements: ['EXPLAIN SELECT * FROM orders'],
      plan: {
        sql: 'EXPLAIN SELECT * FROM orders',
        columns: [
          { name: 'id', typeName: 'INT' },
          { name: 'table', typeName: 'VARCHAR' },
        ],
        rows: [[1, 'orders']],
        rowCount: 1,
        truncated: false,
        elapsedMs: 2,
        warnings: [],
      },
      warnings: [],
    })

    render(<ConsoleTab />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'EXPLAIN SELECT * FROM orders' } })
    fireEvent.click(await screen.findByRole('button', { name: '执行计划' }))

    await waitFor(() => expect(mocks.explain).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByLabelText('执行计划文本')).toBeNull())
    expect(await screen.findByText('orders')).toBeTruthy()
  })
})

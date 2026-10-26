// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
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
    detail?: string
    constructor(code: string, message: string, detail?: string) {
      super(message)
      this.code = code
      this.detail = detail
    }
  }
  return {
    ApiError,
    api: {
      status: mocks.status,
      schemas: mocks.schemas,
      objects: mocks.objects,
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

const copies = vi.hoisted(() => vi.fn(() => Promise.resolve(true)))

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/colmenu')>()
  return { ...actual, copyText: copies }
})

import { ApiError } from '../../src/client/api'
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

const tab = () => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })

describe('console failure banner', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
  })

  it('copies the whole error, including the server detail', async () => {
    mocks.query.mockRejectedValueOnce(new ApiError('sql', 'Unknown column', "Column 'nope' not found"))
    render(<ConsoleTab useTabInfo={tab} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT nope' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

    const text = await screen.findByText(/Unknown column/)
    expect(text).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '复制' }))
    await waitFor(() => expect(copies).toHaveBeenCalledWith("Unknown column\nColumn 'nope' not found"))
  })
  it('copies the statement that actually ran', async () => {
    mocks.query.mockResolvedValue({
      columns: [{ name: 'id' }],
      rows: [[1]],
      elapsedMs: 1,
      sql: 'SELECT `id` FROM `shop`.`orders`',
    })
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT id FROM orders' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

    await screen.findByRole('button', { name: '复制实际执行的 SQL' })
    fireEvent.click(screen.getByRole('button', { name: '复制实际执行的 SQL' }))
    await waitFor(() => expect(copies).toHaveBeenCalledWith('SELECT `id` FROM `shop`.`orders`'))
  })

  it('retries the failing statement from the banner', async () => {
    mocks.query.mockRejectedValueOnce(new ApiError('sql', 'boom'))
    mocks.query.mockResolvedValue({ columns: [{ name: 'name', type: 'varchar' }], rows: [['beta']], elapsedMs: 5, sql: 'SELECT * FROM users' })
    render(<ConsoleTab useTabInfo={tab} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT * FROM users' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

    await screen.findByText(/boom/)
    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    await waitFor(() => expect(screen.queryByText(/boom/)).toBeNull())
    expect(await screen.findByText('beta')).not.toBeNull()
  })
})

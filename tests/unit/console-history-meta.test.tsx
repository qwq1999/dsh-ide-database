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

describe('console history annotations', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.query.mockResolvedValue({
      dialect: 'mysql',
      columns: [{ name: 'n', typeName: 'INT' }],
      rows: [[1]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 7,
      sql: 'SELECT 1',
      warnings: [],
    })
  })

  it('shows the row count and duration next to a statement that ran', async () => {
    render(<ConsoleTab />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT 1' } })
    fireEvent.click(screen.getByRole('button', { name: '执行' }))

    await waitFor(() => expect(mocks.query).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: '历史' }))

    await waitFor(() => expect(screen.getByText(/1 行 · 7 ms/)).toBeTruthy())
  })
})

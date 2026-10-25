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

const tab = () => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })

function resultFor(sql: string): { columns: { name: string; type: string }[]; rows: (string | number)[][]; elapsedMs: number; sql: string } {
  // A full page keeps the pager open; the next offset is past the end.
  if (sql.includes('OFFSET 500')) return { columns: [{ name: 'name', type: 'varchar' }], rows: [], elapsedMs: 1, sql }
  const rows = Array.from({ length: 500 }, (_, index) => [`alpha${index}`])
  return { columns: [{ name: 'name', type: 'varchar' }], rows, elapsedMs: 1, sql }
}

describe('console page fallback', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.query.mockImplementation((request: { sql: string }) => Promise.resolve(resultFor(request.sql)))
  })

  it('falls back to the first page when the requested page is past the end', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT * FROM orders' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(mocks.query.mock.calls.length).toBeGreaterThan(0))
    // Wait for the first page to render: the next-page button stays disabled
    // until then, and a click on a disabled button would be dropped.
    await screen.findByText('alpha0')

    // Page 2 asks for OFFSET 500, which the mock answers with no rows.
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))

    await waitFor(() => expect(screen.getByText(/这一页没有数据，已回到第一页/)).toBeTruthy(), { timeout: 10000 })
    expect(screen.getByText('alpha0')).toBeTruthy()
    const offsetQueries = mocks.query.mock.calls
      .map((call) => (call[0] as { sql: string }).sql)
      .filter((sql) => sql.includes('SELECT * FROM orders'))
    expect(offsetQueries[offsetQueries.length - 1]).toContain('OFFSET 0')
  })
})

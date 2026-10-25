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

vi.mock('../../src/client/api', () => ({
  api: { ...mocks },
  ApiError: class ApiError extends Error {},
}))

import { ConsoleTab } from '../../src/client/ConsoleTab'

const base = {
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

const first = { ...base, id: 'mysql-1', name: '演示 MySQL' }
const second = { ...base, id: 'mysql-2', name: '备份 MySQL' }

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

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [first, second], settings, drivers: [] }, drivers: [], env: {} })
  mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  mocks.objects.mockResolvedValue({ objects: [] })
  mocks.query.mockImplementation((request: { sql: string }) => {
    // A full first page keeps the pager open; the next offset is past the end.
    if (request.sql.includes('OFFSET 500')) {
      return Promise.resolve({ sql: request.sql, columns: [{ name: 'name', type: 'varchar' }], rows: [], rowCount: 0, truncated: false, elapsedMs: 1, warnings: [] })
    }
    const rows = Array.from({ length: request.sql.includes('SELECT * FROM orders') ? 500 : 1 }, (_, index) => [`alpha${index}`])
    return Promise.resolve({ sql: request.sql, columns: [{ name: 'name', type: 'varchar' }], rows, rowCount: rows.length, truncated: false, elapsedMs: 1, warnings: [] })
  })
})

afterEach(() => {
  cleanup()
})

describe('console page fallback after a data source switch', () => {
  it('drops the fallback notice when another data source is picked', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT * FROM orders' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await screen.findByText('alpha0')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    await waitFor(() => expect(screen.getByText(/这一页没有数据，已回到第一页/)).toBeTruthy(), { timeout: 10000 })

    fireEvent.change(screen.getByLabelText('数据源'), { target: { value: 'mysql-2' } })
    await waitFor(() => expect(screen.queryByText(/这一页没有数据，已回到第一页/)).toBeNull())
  })
})

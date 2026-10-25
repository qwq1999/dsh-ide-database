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
  copies: vi.fn(async () => true),
}))

vi.mock('../../src/client/api', () => ({
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
  ApiError: class ApiError extends Error {},
}))

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/colmenu')>()
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

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  mocks.objects.mockResolvedValue({ objects: [] })
  mocks.query.mockResolvedValue({
    sql: 'SELECT * FROM orders',
    columns: [
      { name: 'id', type: 'int' },
      { name: 'total', type: 'decimal' },
    ],
    rows: [[1, 93.02]],
    rowCount: 1,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  })
})

afterEach(() => {
  cleanup()
})

describe('console page export copies', () => {
  it('copies the page as INSERT statements for the queried table', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT * FROM orders' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await screen.findByText('93.02')

    fireEvent.click(screen.getByLabelText('导出结果'))
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制当前页 SQL' }))

    await waitFor(() => expect(mocks.copies).toHaveBeenCalled())
    const text = String(mocks.copies.mock.calls.at(-1)?.[0] ?? '')
    expect(text).toContain('INSERT INTO `shop`.`orders`')
    expect(text).toContain('93.02')
  })
})

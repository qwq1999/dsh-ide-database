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
    sql: 'SELECT * FROM t',
    columns: [{ name: 'name', type: 'varchar' }],
    rows: [['alpha']],
    rowCount: 1,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  })
})

afterEach(() => {
  cleanup()
})

describe('result filter shortcut', () => {
  it('focuses the filter box on Ctrl+F instead of the browser find bar', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })} />)
    await waitForConsoleSource(mocks)
    const editor = (await screen.findByPlaceholderText(/输入 SQL/)) as HTMLTextAreaElement
    fireEvent.change(editor, { target: { value: 'SELECT * FROM t' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await screen.findByText('alpha')

    editor.focus()
    fireEvent.keyDown(editor, { key: 'f', ctrlKey: true })
    const filter = screen.getByLabelText('筛选结果')
    await waitFor(() => expect(document.activeElement).toBe(filter))
  })
})

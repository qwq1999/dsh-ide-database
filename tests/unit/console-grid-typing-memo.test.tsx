// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  cells: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: { ...mocks },
  ApiError: class ApiError extends Error {},
}))

vi.mock('../../src/client/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/format')>()
  return { ...actual, formatCell: mocks.cells }
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
  mocks.cells.mockImplementation((value: unknown) => (value === null || value === undefined ? 'NULL' : String(value)))
  mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  mocks.objects.mockResolvedValue({ objects: [] })
  mocks.query.mockResolvedValue({
    sql: 'SELECT * FROM t',
    columns: [
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
    ],
    rows: [
      [1, 'alpha'],
      [2, 'beta'],
    ],
    rowCount: 2,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  })
})

afterEach(() => {
  cleanup()
})

describe('console grid rendering', () => {
  it('does not repaint the result grid while typing in the editor', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'SELECT * FROM t' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await screen.findByText('alpha')
    // Let any state updates queued by the first render land before counting.
    await act(async () => {})

    const painted = mocks.cells.mock.calls.length
    expect(painted).toBeGreaterThan(0)

    fireEvent.change(editor, { target: { value: 'SELECT * FROM t /* note */' } })
    await waitFor(() => expect((editor as HTMLTextAreaElement).value).toContain('note'))
    await act(async () => {})
    expect(mocks.cells.mock.calls.length).toBe(painted)
  })
})

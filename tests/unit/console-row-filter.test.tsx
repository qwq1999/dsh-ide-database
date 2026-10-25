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

async function runQuery(): Promise<void> {
  mocks.query.mockResolvedValueOnce({
    sql: 'SELECT * FROM t',
    columns: [{ name: 'name', typeName: 'VARCHAR' }],
    rows: [['alpha'], ['beta'], ['gamma']],
    rowCount: 3,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  })
  render(<ConsoleTab useTabInfo={tab} />)
  await screen.findByLabelText('数据源')
  await waitForConsoleSource(mocks)
  const editor = document.querySelector('textarea')
  if (editor === null) throw new Error('missing SQL editor')
  fireEvent.change(editor, { target: { value: 'SELECT * FROM t' } })
  fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
  await screen.findByText('alpha')
}

describe('console row filter', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
  })

  it('shows only the rows that contain the typed text', async () => {
    await runQuery()
    fireEvent.change(screen.getByLabelText('筛选结果'), { target: { value: 'bet' } })
    await waitFor(() => expect(screen.queryByText('alpha')).toBeNull())
    expect(screen.getByText('beta')).toBeTruthy()
    expect(screen.queryByText('gamma')).toBeNull()
    await waitFor(() => expect(screen.getByText(/1 \/ 3 行/)).toBeTruthy())
  })

  it('keeps the original page numbers on the rows that stay', async () => {
    await runQuery()
    fireEvent.change(screen.getByLabelText('筛选结果'), { target: { value: 'gamma' } })
    await waitFor(() => expect(screen.queryByText('beta')).toBeNull())
    const rows = screen.getAllByRole('row')
    const dataRow = rows[rows.length - 1]
    expect(dataRow?.textContent).toContain('3')
    expect(dataRow?.textContent).toContain('gamma')
  })

  it('restores every row when Escape clears the filter', async () => {
    await runQuery()
    const input = screen.getByLabelText('筛选结果')
    fireEvent.change(input, { target: { value: 'gamma' } })
    await waitFor(() => expect(screen.queryByText('beta')).toBeNull())
    fireEvent.keyDown(input, { key: 'Escape' })
    await waitFor(() => expect(screen.getByText('alpha')).toBeTruthy())
    expect(screen.getByText('beta')).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('')
  })
})

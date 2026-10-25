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

describe('filter by a cell value', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
  })

  it('fills the row filter with the clicked value', async () => {
    await runQuery()
    const cell = screen.getByText('beta').closest('td')
    if (cell === null) throw new Error('missing cell')
    fireEvent.contextMenu(cell)
    fireEvent.click(await screen.findByRole('menuitem', { name: '用该值筛选当前页' }))

    const filter = (await screen.findByLabelText('筛选结果')) as HTMLInputElement
    await waitFor(() => expect(filter.value).toBe('beta'))
    await waitFor(() => expect(screen.queryByText('alpha')).toBeNull())
    expect(screen.getByText('beta')).toBeTruthy()
    expect(screen.queryByText('gamma')).toBeNull()
  })
})

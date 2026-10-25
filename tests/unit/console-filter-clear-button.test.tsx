// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
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
  hasPassword: false,
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

describe('console result filter clear button', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.query.mockImplementation((request: { sql: string }) =>
      Promise.resolve({
        columns: [{ name: 'name', type: 'varchar' }],
        rows: [['beta']],
        elapsedMs: 1,
        sql: request.sql,
      }),
    )
  })

  it('clears the filter from the small button', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    const editor = (await screen.findByPlaceholderText(/输入 SQL/)) as HTMLTextAreaElement
    await waitForConsoleSource(mocks)

    fireEvent.change(editor, { target: { value: 'SELECT name FROM users' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    const filter = (await screen.findByLabelText('筛选结果')) as HTMLInputElement
    expect(screen.queryByRole('button', { name: '清空筛选' })).toBeNull()

    fireEvent.change(filter, { target: { value: 'zzz' } })
    expect(screen.getByText('当前页没有匹配筛选条件的行')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '清空筛选' }))
    expect(filter.value).toBe('')
    expect(screen.getByText('beta')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '清空筛选' })).toBeNull()
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  ddl: vi.fn(),
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
      query: mocks.query,
      connect: mocks.connect,
      ddl: mocks.ddl,
    },
  }
})

import { TableTab } from '../../src/client/TableTab'

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

const tab = () => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })

function pageSqls(): string[] {
  return mocks.query.mock.calls
    .map((call) => (call[0] as { sql: string }).sql)
    .filter((sql) => sql.includes('SELECT * FROM'))
}

describe('table where bar', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.includes('COUNT(*)')) {
        return Promise.resolve({ columns: [{ name: 'count', type: 'bigint' }], rows: [[1]], elapsedMs: 1, sql: request.sql })
      }
      return Promise.resolve({ columns: [{ name: 'id', type: 'int' }], rows: [[1]], elapsedMs: 1, sql: request.sql })
    })
  })

  it('clears the manual condition and re-runs the page', async () => {
    render(<TableTab useTabInfo={tab} />)
    const input = (await screen.findByPlaceholderText(/过滤条件/)) as HTMLInputElement
    expect(screen.queryByRole('button', { name: '清空过滤条件' })).toBeNull()

    fireEvent.change(input, { target: { value: 'id = 9' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(pageSqls().at(-1)).toContain('id = 9'))

    fireEvent.click(screen.getByRole('button', { name: '清空过滤条件' }))
    await waitFor(() => expect(input.value).toBe(''))
    await waitFor(() => expect(pageSqls().at(-1)).not.toContain('WHERE'))
    expect(screen.queryByRole('button', { name: '清空过滤条件' })).toBeNull()
  })

  it('clears the condition with Escape as well', async () => {
    render(<TableTab useTabInfo={tab} />)
    const box = (await screen.findByPlaceholderText(/过滤条件/)) as HTMLInputElement
    fireEvent.change(box, { target: { value: 'id = 9' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(pageSqls().at(-1)).toContain('id = 9'))

    fireEvent.keyDown(box, { key: 'Escape' })
    await waitFor(() => expect(box.value).toBe(''))
    expect(pageSqls().at(-1)).not.toContain('WHERE')
  })

  it('marks the tab as read only when the connection is', async () => {
    mocks.status.mockResolvedValue({ config: { connections: [{ ...mysql, readOnly: true }], settings, drivers: [] }, drivers: [], env: {} })
    render(<TableTab useTabInfo={tab} />)
    expect(await screen.findByText('只读')).not.toBeNull()
  })
})

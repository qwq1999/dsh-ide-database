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

describe('table refresh after the data shrank', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  })

  it('falls back to the last page when the current one is empty', async () => {
    let total = 1200
    let shrank = false
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.includes('COUNT(*)')) {
        return Promise.resolve({ columns: [{ name: 'count', type: 'bigint' }], rows: [[total]], elapsedMs: 1, sql: request.sql })
      }
      const offset = Number(/OFFSET (\d+)/u.exec(request.sql)?.[1] ?? '0')
      const rows = shrank && offset >= 1000 ? [] : [[1]]
      return Promise.resolve({ columns: [{ name: 'id', type: 'int' }], rows, elapsedMs: 1, sql: request.sql })
    })

    render(<TableTab useTabInfo={tab} />)
    const input = (await screen.findByLabelText('页码')) as HTMLInputElement
    await waitFor(() => expect(screen.queryByText('/1,200')).not.toBeNull())

    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(pageSqls().at(-1)).toContain('OFFSET 1000'))

    total = 600
    shrank = true
    fireEvent.click(screen.getByRole('button', { name: '刷新' }))

    await waitFor(() => expect(screen.queryByText('/600')).not.toBeNull())
    await waitFor(() => expect(input.value).toBe('2'))
    expect(pageSqls().at(-1)).toContain('OFFSET 500')
  })
})

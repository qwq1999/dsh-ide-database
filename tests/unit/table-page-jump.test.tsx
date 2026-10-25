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

function offsetOf(): string[] {
  return mocks.query.mock.calls
    .map((call) => (call[0] as { sql: string }).sql)
    .filter((sql) => sql.includes('SELECT * FROM'))
}

describe('table page jump', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.includes('COUNT(*)')) {
        return Promise.resolve({ columns: [{ name: 'count', type: 'bigint' }], rows: [[1200]], elapsedMs: 1, sql: request.sql })
      }
      return Promise.resolve({
        columns: [{ name: 'id', type: 'int' }],
        rows: [[1]],
        elapsedMs: 1,
        sql: request.sql,
      })
    })
  })

  it('jumps to a typed page and clamps to the last page', async () => {
    render(<TableTab useTabInfo={tab} />)
    const input = (await screen.findByLabelText('页码')) as HTMLInputElement
    await waitFor(() => expect(input.value).toBe('1'))
    await waitFor(() => expect(screen.queryByText('/1,200')).not.toBeNull())

    fireEvent.change(input, { target: { value: '9' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // 1200 rows at 500 per page means page 3 is the last one.
    await waitFor(() => expect(offsetOf().at(-1)).toContain('LIMIT 500 OFFSET 1000'))
    await waitFor(() => expect(input.value).toBe('3'))

    fireEvent.click(screen.getByRole('button', { name: '上一页' }))
    await waitFor(() => expect(offsetOf().at(-1)).toContain('LIMIT 500 OFFSET 500'))
    await waitFor(() => expect(input.value).toBe('2'))

    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(offsetOf().at(-1)).toContain('LIMIT 500 OFFSET 1000'))
    await waitFor(() => expect(input.value).toBe('3'))
  })
})

// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
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
    api: { status: mocks.status, query: mocks.query, connect: mocks.connect, ddl: mocks.ddl },
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

describe('table auto refresh memory', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation((request: { sql: string }) =>
      Promise.resolve({ columns: [{ name: 'id', type: 'int' }], rows: [[1]], elapsedMs: 1, sql: request.sql }),
    )
  })

  it('starts from the interval remembered last time', async () => {
    window.localStorage.setItem('dsh-ide-database.auto-refresh.v1', '10000')
    render(<TableTab useTabInfo={tab} />)

    const select = (await screen.findByLabelText('自动刷新')) as HTMLSelectElement
    expect(select.value).toBe('10000')
  })

  it('ignores a stored interval that is no longer offered', async () => {
    window.localStorage.setItem('dsh-ide-database.auto-refresh.v1', '7')
    render(<TableTab useTabInfo={tab} />)

    const select = (await screen.findByLabelText('自动刷新')) as HTMLSelectElement
    expect(select.value).toBe('0')
  })
})

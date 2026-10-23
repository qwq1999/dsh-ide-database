// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
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

const redis = {
  ...mysql,
  id: 'redis-1',
  name: '演示 Redis',
  driver: 'redis',
  dialect: 'redis',
  port: 6379,
  database: '',
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

describe('console database target', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql, redis], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }, { name: 'crm' }] })
    mocks.query.mockResolvedValue({
      sql: 'SELECT 1',
      columns: [{ name: 'ok', typeName: 'INT' }],
      rows: [[1]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    })
  })

  it('lists schemas and runs SQL in the chosen schema', async () => {
    render(<ConsoleTab />)

    const source = await screen.findByLabelText('数据源')
    expect(source).toBeTruthy()
    const target = await screen.findByLabelText('数据库')
    await screen.findByRole('option', { name: /crm/ })

    fireEvent.change(target, { target: { value: 'crm' } })
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'SELECT * FROM customers' } })
    fireEvent.click(await screen.findByRole('button', { name: '执行' }))

    await waitFor(() => expect(mocks.query).toHaveBeenCalled())
    expect(mocks.query.mock.calls[0]?.[0]).toMatchObject({ id: 'mysql-1', schema: 'crm' })
  })

  it('offers the Redis logical databases and scans the chosen one', async () => {
    mocks.redisDatabases.mockResolvedValue({ databases: 8, redisDb: 0, cached: false })
    mocks.redisScan.mockResolvedValue({ cursor: '0', done: true, scanned: 0, keys: [] })

    render(<ConsoleTab />)
    const source = await screen.findByLabelText('数据源')
    fireEvent.change(source, { target: { value: 'redis-1' } })

    const db = await screen.findByLabelText('Redis 逻辑库', {}, { timeout: 3000 })
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())
    fireEvent.change(db, { target: { value: '2' } })

    await waitFor(() => expect(mocks.redisScan.mock.calls.some((call) => call[0]?.db === 2)).toBe(true))
  })
})

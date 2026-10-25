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

function answer(name: string) {
  return {
    sql: `SELECT ${name}`,
    columns: [{ name, typeName: 'INT' }],
    rows: [[1]],
    rowCount: 1,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  }
}

describe('console script results', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.query.mockImplementation((request: { sql: string }) =>
      Promise.resolve(answer(request.sql.includes('SELECT 2') ? 'two' : 'one')),
    )
  })

  it('keeps each statement result and lets the grid flip back', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = document.querySelector('textarea')
    if (area === null) throw new Error('missing editor')
    fireEvent.change(area, { target: { value: 'SELECT 1;\nSELECT 2' } })
    fireEvent.keyDown(area, { key: 'Enter', ctrlKey: true })

    await screen.findByText('two')
    expect(mocks.query).toHaveBeenCalledTimes(2)

    const picker = screen.getByLabelText('语句结果')
    expect(Array.from(picker.querySelectorAll('option')).map((item) => item.textContent)).toEqual([
      '第 1 条',
      '第 2 条',
    ])
    expect((picker as HTMLSelectElement).value).toBe('1')

    fireEvent.change(picker, { target: { value: '0' } })
    await waitFor(() => expect(screen.getByText('one')).toBeTruthy())
    expect(screen.queryByText('two')).toBeNull()
  })
})

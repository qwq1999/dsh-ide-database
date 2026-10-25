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

const page = {
  columns: [{ name: 'id', typeName: 'INT' }],
  rows: [
    [1],
    [2],
  ],
  rowCount: 2,
  truncated: false,
  elapsedMs: 1,
  warnings: [],
}

async function runPageQuery(): Promise<HTMLInputElement> {
  mocks.query.mockResolvedValue(page)
  render(<ConsoleTab useTabInfo={tab} />)
  await screen.findByLabelText('数据源')
  await waitForConsoleSource(mocks)
  const editor = document.querySelector('textarea')
  if (editor === null) throw new Error('missing SQL editor')
  fireEvent.change(editor, { target: { value: 'SELECT id FROM orders' } })
  fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
  await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(1))
  return screen.getByLabelText('页码') as HTMLInputElement
}

describe('console page jump', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({
      config: { connections: [mysql], settings, drivers: [] },
      drivers: [],
      env: {},
    })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
  })

  it('runs the offset for the page typed in the box', async () => {
    const box = await runPageQuery()
    expect(box.value).toBe('1')

    fireEvent.change(box, { target: { value: '4' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2))

    const last = mocks.query.mock.calls[1]?.[0] as { sql: string }
    expect(last.sql).toContain('LIMIT 500 OFFSET 1500')
    await waitFor(() => expect((screen.getByLabelText('页码') as HTMLInputElement).value).toBe('4'))
  })

  it('puts the box back when the number is not a page', async () => {
    const box = await runPageQuery()

    fireEvent.change(box, { target: { value: '0' } })
    fireEvent.keyDown(box, { key: 'Enter' })

    await waitFor(() => expect((screen.getByLabelText('页码') as HTMLInputElement).value).toBe('1'))
    expect(mocks.query).toHaveBeenCalledTimes(1)
  })
})

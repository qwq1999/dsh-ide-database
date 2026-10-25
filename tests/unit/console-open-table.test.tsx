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
import { setTableTabOpener } from '../../src/client/tab-open'

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

describe('open the target table from the console', () => {
  afterEach(() => {
    cleanup()
    setTableTabOpener(undefined)
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
  })

  it('opens the table the statement reads from', async () => {
    const open = vi.fn()
    setTableTabOpener(open)
    render(<ConsoleTab useTabInfo={tab} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'SELECT * FROM orders' } })

    const button = (await screen.findByRole('button', { name: '打开数据表' })) as HTMLButtonElement
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)

    expect(open).toHaveBeenCalledWith({ connectionId: 'mysql-1', schema: 'shop', table: 'orders', kind: 'table' })
  })

  it('is disabled while the statement names no table', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'SELECT 1' } })
    const button = (await screen.findByRole('button', { name: '打开数据表' })) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })
})

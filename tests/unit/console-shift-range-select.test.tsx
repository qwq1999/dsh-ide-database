// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

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

describe('console result range selection', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.query.mockResolvedValue({
      sql: 'SELECT * FROM shop.orders',
      columns: [
        { name: 'id', typeName: 'INT' },
        { name: 'name', typeName: 'VARCHAR' },
      ],
      rows: [[1, '手机'], [2, '配件'], [3, '电脑']],
      rowCount: 3,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    })
  })

  it('extends the range from the anchor even when the updater is deferred', async () => {
    render(<ConsoleTab />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'SELECT * FROM shop.orders' } })
    fireEvent.click(await screen.findByRole('button', { name: '执行' }))
    await waitFor(() => expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(1), { timeout: 4000 })

    const row1 = (await screen.findByLabelText('选择第 1 行')) as HTMLInputElement
    const row2 = (await screen.findByLabelText('选择第 2 行')) as HTMLInputElement
    const row3 = (await screen.findByLabelText('选择第 3 行')) as HTMLInputElement

    // Dispatch both clicks as raw events inside a single act so React batches
    // them: the first setState leaves a pending update, forcing the second
    // updater to defer to the render phase, by which time the ref has been
    // reassigned to row 3. The fixed version captured the anchor synchronously
    // so the range holds; the buggy version reads the reassigned ref and
    // collapses to row 3 alone.
    act(() => {
      row1.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      row3.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))
    })

    expect(row1.checked).toBe(true)
    expect(row2.checked).toBe(true)
    expect(row3.checked).toBe(true)
  })
})

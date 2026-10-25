// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

const tab = { tab: { navigation: { params: { connectionId: 'mysql-1' } } } }

describe('run the statement under the caret', () => {
  afterEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.query.mockImplementation(async (request: { sql: string }) =>
      request.sql.includes('SELECT 2')
        ? { columns: [{ name: 'label', type: 'VARCHAR' }], rows: [['two']], elapsedMs: 1, sql: request.sql }
        : { columns: [{ name: 'label', type: 'VARCHAR' }], rows: [['one']], elapsedMs: 1, sql: request.sql },
    )
  })

  it('runs the second statement when the caret sits in it', async () => {
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)

    const editor = screen.getByPlaceholderText(/输入 SQL/) as HTMLTextAreaElement
    const script = ['SELECT 1', 'SELECT 2'].join(';' + String.fromCharCode(10))
    fireEvent.change(editor, { target: { value: script } })
    editor.setSelectionRange(script.indexOf('SELECT 2') + 3, script.indexOf('SELECT 2') + 3)
    fireEvent.select(editor)

    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true, shiftKey: true })

    expect(await screen.findByText('two')).toBeTruthy()
    expect(mocks.query).toHaveBeenCalledTimes(1)
    const first = mocks.query.mock.calls[0] as unknown as [{ sql: string }]
    expect(first[0].sql).toContain('SELECT 2')
  })

  it('still runs the whole script on Ctrl+Enter', async () => {
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)

    const editor = screen.getByPlaceholderText(/输入 SQL/) as HTMLTextAreaElement
    const script = ['SELECT 1', 'SELECT 2'].join(';' + String.fromCharCode(10))
    fireEvent.change(editor, { target: { value: script } })

    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

    expect(await screen.findByText('two')).toBeTruthy()
    expect(mocks.query).toHaveBeenCalledTimes(2)
  })
})

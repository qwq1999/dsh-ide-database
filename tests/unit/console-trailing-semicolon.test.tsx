// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

const oracle = {
  id: 'oracle-1',
  name: '演示 Oracle',
  driver: 'oracle',
  dialect: 'oracle',
  host: '127.0.0.1',
  port: 1521,
  user: 'demo',
  hasPassword: false,
  database: 'orcl',
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

const tab = { tab: { navigation: { params: { connectionId: 'oracle-1' } } } }

describe('trailing statement terminator', () => {
  afterEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [oracle], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'DEMO' }] })
    // Oracle's JDBC driver parses the text itself: a trailing `;` is ORA-00933.
    mocks.query.mockImplementation(async (request: { sql: string }) => {
      if (request.sql.trimEnd().endsWith(';')) throw new Error('ORA-00933: SQL 命令未正确结束')
      return { columns: [], rows: [], rowCount: 0, updateCount: 0, elapsedMs: 1, warnings: [] }
    })
  })

  it('sends a single statement without the trailing semicolon', async () => {
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)

    const editor = (await screen.findByPlaceholderText(/输入 SQL/)) as HTMLTextAreaElement
    const sql = 'delete from ma_watercutoffacc where id in (9100000001, 9100000002, 9100000003);'
    fireEvent.change(editor, { target: { value: sql } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(1))
    const [request] = mocks.query.mock.calls[0] as unknown as [{ sql: string }]
    expect(request.sql).toBe('delete from ma_watercutoffacc where id in (9100000001, 9100000002, 9100000003)')
  })

  it('keeps a select pageable and still works from the caret in the middle', async () => {
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)

    const editor = (await screen.findByPlaceholderText(/输入 SQL/)) as HTMLTextAreaElement
    const script = ['delete from t where id = 1;', 'select * from t;'].join(String.fromCharCode(10))
    // Caret on the first line: run only that statement, still terminator-free.
    fireEvent.change(editor, { target: { value: script } })
    editor.setSelectionRange(2, 2)
    fireEvent.select(editor)
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true, shiftKey: true })

    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(1))
    const [request] = mocks.query.mock.calls[0] as unknown as [{ sql: string }]
    expect(request.sql).toBe('delete from t where id = 1')
  })
})

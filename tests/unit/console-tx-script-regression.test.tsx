// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

const mocks = vi.hoisted(() => {
  class ApiError extends Error {
    code: string
    constructor(code: string, message: string) {
      super(message)
      this.code = code
    }
  }
  return {
    ApiError,
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
  tx: vi.fn(),
  }
})

vi.mock('../../src/client/api', () => ({
  ApiError: mocks.ApiError,
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
    tx: mocks.tx,
  },
}))

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

function readSqlHistory(): string[] {
  const raw = globalThis.localStorage.getItem('dsh-ide-database.history.v1')
  if (raw === null) return []
  const parsed = JSON.parse(raw) as { sql?: { statement: string }[] }
  return (parsed.sql ?? []).map((item) => item.statement)
}

describe('console transaction and script regressions', () => {
  afterEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ product: 'MySQL', version: '8.0' })
    mocks.tx.mockResolvedValue({ ok: true })
  })

  it('writes history even when a later statement of a script fails', async () => {
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.includes('SELECT 2')) return Promise.reject(new Error('boom'))
      return Promise.resolve(answer('one'))
    })
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)

    const area = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(area, { target: { value: 'SELECT 1;\\nSELECT 2' } })
    fireEvent.keyDown(area, { key: 'Enter', ctrlKey: true })

    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(readSqlHistory().length).toBe(1))
    expect(readSqlHistory()[0]).toContain('SELECT 1')
    expect(readSqlHistory()[0]).toContain('SELECT 2')
  })

  it('reports a lost transaction instead of claiming commit after a dropped session', async () => {
    // First commit raises not-connected; a reconnect + retry would silently
    // commit on a brand-new session and lie about success.
    mocks.tx.mockImplementation((id: string, action: string) => {
      if (action === 'commit') return Promise.reject(new mocks.ApiError('not-connected', '连接尚未打开'))
      return Promise.resolve({ ok: true })
    })
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)

    // Start the transaction.
    fireEvent.click(screen.getByTitle('发送 BEGIN，开启手动事务'))
    await waitFor(() => expect(mocks.tx).toHaveBeenCalledWith('mysql-1', 'start'))
    await waitFor(() => expect(screen.queryByText('事务已开始，提交前可回滚')).toBeTruthy())

    // Commit: must not reconnect-retry, and must warn that the tx may be lost.
    fireEvent.click(screen.getByTitle('提交当前事务'))
    await waitFor(() => expect(screen.getByText(/事务可能已丢失/)).toBeTruthy())
    expect(mocks.connect).not.toHaveBeenCalled()
    expect(mocks.tx.mock.calls.filter((c) => c[1] === 'commit')).toHaveLength(1)
    expect(screen.queryByText('事务已提交')).toBeNull()
  })

  it('does not send an extra rollback right after a successful commit', async () => {
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)

    fireEvent.click(screen.getByTitle('发送 BEGIN，开启手动事务'))
    await waitFor(() => expect(screen.queryByText('事务已开始，提交前可回滚')).toBeTruthy())
    fireEvent.click(screen.getByTitle('提交当前事务'))
    await waitFor(() => expect(screen.getByText('事务已提交')).toBeTruthy())

    // The only tx calls should be the explicit start + commit; no fire-and-forget
    // rollback triggered by the tx:'open' -> 'idle' state transition.
    const actions = mocks.tx.mock.calls.map((c) => c[1])
    expect(actions.filter((a) => a === 'rollback')).toHaveLength(0)
    expect(actions).toEqual(['start', 'commit'])
  })
})

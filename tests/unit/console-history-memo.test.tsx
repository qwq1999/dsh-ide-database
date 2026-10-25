// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
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

// The list renders relative times; counting those calls shows whether typing in
// the editor repainted the history rows.
vi.mock('../../src/client/history', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/history')>()
  return { ...actual, historyAgo: vi.fn(actual.historyAgo) }
})

import { ConsoleTab } from '../../src/client/ConsoleTab'
import { historyAgo } from '../../src/client/history'

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

describe('console history memo', () => {
  afterEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.localStorage.setItem(
      'dsh-ide-database.history.v1',
      JSON.stringify({ sql: [{ statement: 'SELECT 1', at: 1 }], redis: [] }),
    )
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  it('leaves the history list alone while the editor changes', async () => {
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)

    const editor = (await screen.findByPlaceholderText(/输入 SQL/)) as HTMLTextAreaElement
    fireEvent.click(screen.getByRole('button', { name: '历史' }))
    expect(await screen.findByText('最近执行 · 1')).toBeTruthy()
    // Let any effect queued while the tab settled run before we start counting.
    await act(async () => undefined)

    const spy = historyAgo as unknown as { mock: { calls: unknown[] } }
    const before = spy.mock.calls.length
    expect(before).toBeGreaterThan(0)

    fireEvent.change(editor, { target: { value: 'SELECT 2' } })
    await waitFor(() => expect(editor.value).toBe('SELECT 2'))
    await act(async () => undefined)

    expect(spy.mock.calls.length).toBe(before)
  })
})

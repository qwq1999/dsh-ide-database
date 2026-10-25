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

describe('sql editor history recall', () => {
  afterEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.localStorage.setItem(
      'dsh-ide-database.history.v1',
      JSON.stringify({
        sql: [
          { statement: 'SELECT 2', at: 2 },
          { statement: 'SELECT 1', at: 1 },
        ],
        redis: [],
      }),
    )
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  it('walks the executed statements and returns to the draft', async () => {
    render(<ConsoleTab useTabInfo={() => tab} />)
    await waitForConsoleSource(mocks)
    // The schemas call can land a tick before React commits the editor, so wait
    // for the field itself instead of reading it synchronously.
    const box = (await screen.findByPlaceholderText(/输入 SQL/)) as HTMLTextAreaElement

    fireEvent.change(box, { target: { value: 'SELECT 99' } })
    expect(box.value).toBe('SELECT 99')

    const recallIn = (key: 'ArrowUp' | 'ArrowDown'): void => {
      fireEvent.keyDown(box, { key, ctrlKey: true })
    }
    recallIn('ArrowUp')
    expect(box.value).toBe('SELECT 2')
    recallIn('ArrowUp')
    expect(box.value).toBe('SELECT 1')
    recallIn('ArrowDown')
    expect(box.value).toBe('SELECT 2')
    recallIn('ArrowDown')
    expect(box.value).toBe('SELECT 99')
  })
})

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

function editor(): HTMLTextAreaElement {
  return screen.getByPlaceholderText(/输入 SQL/) as HTMLTextAreaElement
}

function recall(key: 'ArrowUp' | 'ArrowDown'): void {
  fireEvent.keyDown(editor(), { key, ctrlKey: true })
}

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

    fireEvent.change(editor(), { target: { value: 'SELECT 99' } })
    expect(editor().value).toBe('SELECT 99')

    recall('ArrowUp')
    expect(editor().value).toBe('SELECT 2')
    recall('ArrowUp')
    expect(editor().value).toBe('SELECT 1')
    recall('ArrowDown')
    expect(editor().value).toBe('SELECT 2')
    recall('ArrowDown')
    expect(editor().value).toBe('SELECT 99')
  })
})

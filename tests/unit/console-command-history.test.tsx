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

const redis = {
  id: 'redis-1',
  name: '演示 Redis',
  driver: 'redis',
  dialect: 'redis',
  host: '127.0.0.1',
  port: 6379,
  user: '',
  hasPassword: false,
  database: '',
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

const tab = () => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })

async function commandInput(): Promise<HTMLInputElement> {
  return (await screen.findByPlaceholderText('例如 GET shop:customer:42')) as HTMLInputElement
}

function press(input: HTMLInputElement, key: string): void {
  fireEvent.keyDown(input, { key })
}

describe('redis command history', () => {
  afterEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.localStorage.setItem(
      'dsh-ide-database.history.v1',
      JSON.stringify({
        sql: [{ statement: 'SELECT 9', at: 1 }],
        redis: [
          { statement: 'GET a', at: 3 },
          { statement: 'GET b', at: 2 },
        ],
      }),
    )
    mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    mocks.redisCommand.mockResolvedValue({ command: 'PING', value: 'PONG', elapsedMs: 1, readOnly: true })
  })

  it('walks the executed commands and returns to what was being typed', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)

    const input = await commandInput()
    fireEvent.change(input, { target: { value: 'GET c' } })

    press(input, 'ArrowUp')
    expect(input.value).toBe('GET a')
    press(input, 'ArrowUp')
    expect(input.value).toBe('GET b')
    press(input, 'ArrowDown')
    expect(input.value).toBe('GET a')
    press(input, 'ArrowDown')
    expect(input.value).toBe('GET c')

    fireEvent.change(input, { target: { value: 'GET d' } })
    press(input, 'ArrowUp')
    expect(input.value).toBe('GET a')
  })

  it('starts again from the newest command after executing one', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)

    const input = await commandInput()
    fireEvent.change(input, { target: { value: 'PING' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(mocks.redisCommand).toHaveBeenCalled())
    await waitFor(() => expect(input.value).toBe('PING'))

    press(input, 'ArrowUp')
    expect(input.value).toBe('PING')
    press(input, 'ArrowUp')
    expect(input.value).toBe('GET a')
  })
})

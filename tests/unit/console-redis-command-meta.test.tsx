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
  copies: vi.fn(async () => true),
}))

vi.mock('../../src/client/api', () => ({
  api: { ...mocks },
  ApiError: class ApiError extends Error {},
}))

vi.mock('../../src/client/colmenu', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/client/colmenu')>()),
  copyText: mocks.copies,
}))

import { ConsoleTab } from '../../src/client/ConsoleTab'

const redis = {
  id: 'redis-1',
  name: '本地 Redis',
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
  createdAt: '2026-10-23T00:00:00.000Z',
}

const settings = {
  maxRows: 5000,
  queryTimeoutSec: 60,
  connectTimeoutSec: 15,
  javaPath: '',
  mavenMirror: '',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
  mocks.redisDatabases.mockResolvedValue({ databases: 16 })
  mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
  mocks.redisCommand.mockResolvedValue({ command: 'GET user:1', value: 'hello', elapsedMs: 7, readOnly: true })
})

afterEach(() => {
  cleanup()
})

describe('Redis command output', () => {
  it('shows how long the command took and whether it wrote', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())

    const box = screen.getByPlaceholderText(/例如 GET/)
    fireEvent.change(box, { target: { value: 'GET user:1' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await screen.findByText('hello')
    expect(screen.getByText('7 ms')).toBeTruthy()
    expect(screen.queryByText(/写命令/)).toBeNull()

    mocks.copies.mockResolvedValue(true)
    fireEvent.click(screen.getByRole('button', { name: '复制结果' }))
    expect(mocks.copies).toHaveBeenCalledWith('hello')
    expect(await screen.findByRole('button', { name: '已复制' })).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

vi.mock('../../src/client/api', () => ({
  api: { ...mocks },
  ApiError: class ApiError extends Error {},
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

const tab = () => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [redis], settings, drivers: [] }, drivers: [], env: {} })
  mocks.redisDatabases.mockResolvedValue({ databases: 16 })
  mocks.redisScan.mockResolvedValue({
    keys: [{ key: 'user:1', type: 'string', ttl: -1, size: 5 }],
    cursor: '0',
  })
})

afterEach(() => {
  cleanup()
})

describe('Redis value refresh', () => {
  it('updates the key row when the value now carries an expiry', async () => {
    mocks.redisKey
      .mockResolvedValueOnce({ key: 'user:1', type: 'string', ttl: -1, size: 5, value: 'hello', truncated: false, preview: 'hello' })
      .mockResolvedValueOnce({ key: 'user:1', type: 'string', ttl: 60, size: 7, value: 'hello!', truncated: false, preview: 'hello!' })

    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    const [keyCell] = await screen.findAllByText('user:1')
    if (keyCell === undefined) throw new Error('missing key cell')
    fireEvent.click(keyCell)
    await waitFor(() => expect(mocks.redisKey).toHaveBeenCalledTimes(1))
    const row = keyCell.closest('tr')
    if (row === null) throw new Error('missing key row')
    expect(within(row).getByText('永久')).toBeTruthy()

    fireEvent.click(await screen.findByLabelText('刷新键值'))
    await waitFor(() => expect(mocks.redisKey).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(within(row).getByText('1m')).toBeTruthy())
    expect(within(row).queryByText('永久')).toBeNull()
  })
})

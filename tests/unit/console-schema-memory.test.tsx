// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
import { waitForConsoleSource } from '../stubs/console-ready'

function consoleTab(): JSX.Element {
  return <ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })} />
}

const settings = {
  maxRows: 500,
  queryTimeoutSec: 60,
  connectTimeoutSec: 15,
  javaPath: '',
  mavenMirror: '',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: false,
}

const KEY = 'dsh-ide-database.schema.v1:mysql-1'

beforeEach(() => {
  window.localStorage.clear()
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({
    config: {
      connections: [
        {
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
        },
      ],
      settings,
      drivers: [],
    },
    drivers: [],
    env: {},
  })
  mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }, { name: 'other' }] })
  mocks.objects.mockResolvedValue({ objects: [] })
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('console schema memory', () => {
  it('opens the next console in the schema picked last time', async () => {
    render(consoleTab())
    await waitForConsoleSource(mocks)
    const picker = screen.getByLabelText('数据库')
    await waitFor(() => expect(picker).toHaveProperty('value', 'shop'))

    fireEvent.change(picker, { target: { value: 'other' } })
    expect(window.localStorage.getItem(KEY)).toBe('other')

    cleanup()
    render(consoleTab())
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(screen.getByLabelText('数据库')).toHaveProperty('value', 'other'))
  })
})

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
  cancel: vi.fn(),
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
      objects: mocks.objects,
      query: mocks.query,
      connect: mocks.connect,
      redisScan: mocks.redisScan,
      redisDatabases: mocks.redisDatabases,
      redisKey: mocks.redisKey,
      redisCommand: mocks.redisCommand,
      explain: mocks.explain,
      cancel: mocks.cancel,
    },
  }
})

import { ConsoleTab } from '../../src/client/ConsoleTab'

const base = {
  driver: 'mysql',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  hasPassword: true,
  redisDb: 0,
  params: {},
  readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const shop = { ...base, id: 'mysql-1', name: '演示 MySQL', database: 'shop' }
const crm = { ...base, id: 'mysql-2', name: 'CRM', database: 'crm' }

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

const tabWith = (connectionId: string) => () => ({ tab: { navigation: { params: { connectionId } } } })

describe('console source switching', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [shop, crm], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockImplementation(async (id: string) => ({ schemas: [{ name: id === 'mysql-2' ? 'crm' : 'shop' }] }))
  })

  it('drops the result of a query that was still running when the source changed', async () => {
    let resolveQuery: (value: unknown) => void = () => undefined
    mocks.query.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQuery = resolve
        }),
    )

    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = document.querySelector('textarea') as HTMLTextAreaElement
    fireEvent.change(area, { target: { value: 'SELECT * FROM orders' } })
    fireEvent.click(screen.getByRole('button', { name: '执行' }))

    const executeButton = screen.getByRole('button', { name: '执行' }) as HTMLButtonElement
    await waitFor(() => expect(executeButton.disabled).toBe(true))

    fireEvent.change(screen.getByLabelText('数据源'), { target: { value: 'mysql-2' } })
    await waitFor(() => expect(executeButton.disabled).toBe(false))
    expect(mocks.cancel).toHaveBeenCalledWith(expect.stringMatching(/^console-/))

    resolveQuery({
      sql: 'SELECT * FROM orders',
      columns: [{ name: 'secret', typeName: 'VARCHAR' }],
      rows: [['STALE-ROW']],
      rowCount: 1,
      truncated: false,
      elapsedMs: 4,
      warnings: [],
    })
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('STALE-ROW')).toBeNull()
  })
})

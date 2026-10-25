// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  ddl: vi.fn(),
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
    api: { status: mocks.status, query: mocks.query, connect: mocks.connect, ddl: mocks.ddl },
  }
})

const copies = vi.hoisted(() => vi.fn(() => Promise.resolve(true)))

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/colmenu')>()
  return { ...actual, copyText: copies }
})

import { TableTab } from '../../src/client/TableTab'

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

const tab = () => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })

const DDL = 'CREATE TABLE `orders` (\n  `id` int NOT NULL,\n  PRIMARY KEY (`id`)\n)'

describe('table DDL dialog', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation((request: { sql: string }) =>
      Promise.resolve({
        columns: [{ name: 'id', type: 'int' }],
        rows: [[1]],
        elapsedMs: 1,
        sql: request.sql,
      }),
    )
    mocks.ddl.mockResolvedValue({ schema: 'shop', table: 'orders', kind: 'table', ddl: DDL, source: 'generated', warnings: [] })
  })

  it('shows the create statement and copies it', async () => {
    render(<TableTab useTabInfo={tab} />)
   

    const button = (await screen.findByLabelText('查看建表语句')) as HTMLButtonElement
    await waitFor(() => expect(button.disabled).toBe(false))
    fireEvent.click(button)

    const pre = await screen.findByLabelText('建表语句')
    expect(pre.textContent).toBe(DDL)
    expect(mocks.ddl).toHaveBeenCalledWith('mysql-1', 'shop', 'orders', 'table')

    fireEvent.click(screen.getByRole('button', { name: '复制' }))
    await waitFor(() => expect(copies).toHaveBeenCalledWith(DDL))
    expect(await screen.findByRole('button', { name: '已复制' })).not.toBeNull()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByLabelText('建表语句')).toBeNull())
  })
})

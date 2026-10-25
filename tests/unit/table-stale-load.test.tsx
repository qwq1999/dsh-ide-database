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
    api: {
      status: mocks.status,
      query: mocks.query,
      connect: mocks.connect,
      ddl: mocks.ddl,
    },
  }
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

const result = (sql: string, rows: unknown[][]) => ({
  columns: [{ name: 'total', type: 'int' }],
  rows,
  elapsedMs: 1,
  sql,
})

function header(label: string): HTMLElement {
  const found = screen
    .getAllByRole('columnheader')
    .find((cell) => (cell.textContent ?? '').startsWith(label))
  if (found === undefined) throw new Error(`missing ${label} header`)
  return found
}

describe('table stale loads', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  })

  it('keeps the newest sort result when an older page arrives later', async () => {
    let releaseAsc: (value: unknown) => void = () => undefined
    const ascPending = new Promise((resolve) => {
      releaseAsc = resolve
    })
    mocks.query.mockImplementation((request: { sql: string }) => {
      if (request.sql.includes('COUNT(*)')) {
        return Promise.resolve(result(request.sql, [[1]]))
      }
      if (request.sql.includes('ASC')) return ascPending
      if (request.sql.includes('DESC')) return Promise.resolve(result(request.sql, [['FAST']]))
      return Promise.resolve(result(request.sql, [['OLD']]))
    })

    render(<TableTab useTabInfo={tab} />)
    await waitFor(() => expect(screen.queryByText('OLD')).not.toBeNull())

    fireEvent.contextMenu(header('total'))
    fireEvent.click(await screen.findByRole('menuitem', { name: '按此列升序' }))
    await waitFor(() =>
      expect(mocks.query.mock.calls.some((call) => (call[0] as { sql: string }).sql.includes('ASC'))).toBe(true),
    )

    fireEvent.contextMenu(header('total'))
    fireEvent.click(await screen.findByRole('menuitem', { name: '按此列降序' }))
    await waitFor(() => expect(screen.queryByText('FAST')).not.toBeNull())

    releaseAsc(result('SELECT * FROM `shop`.`orders` ORDER BY `total` ASC', [['SLOW']]))
    await new Promise((resolve) => setTimeout(resolve, 30))

    expect(screen.queryByText('SLOW')).toBeNull()
    expect(screen.queryByText('FAST')).not.toBeNull()
  })
})

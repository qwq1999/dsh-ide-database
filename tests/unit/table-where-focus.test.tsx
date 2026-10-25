// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  ddl: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: {
    status: mocks.status,
    schemas: mocks.schemas,
    objects: mocks.objects,
    query: mocks.query,
    connect: mocks.connect,
    ddl: mocks.ddl,
  },
  ApiError: class ApiError extends Error {},
}))

import { TableTab } from '../../src/client/TableTab'

const mysql = {
  id: 'mysql-1',
  name: '演示 MySQL',
  driver: 'mysql',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  hasPassword: true,
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

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  mocks.query.mockImplementation((request: { sql: string }) =>
    Promise.resolve({
      sql: request.sql,
      columns: [{ name: 'id', type: 'int' }],
      rows: [[1]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 1,
      warnings: [],
    }),
  )
})

afterEach(() => {
  cleanup()
})

describe('table filter shortcut', () => {
  it('focuses the WHERE box on Ctrl+F', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBeGreaterThan(0))
    const where = (await screen.findByPlaceholderText(/过滤条件/) as HTMLInputElement)
    const refresh = screen.getByRole('button', { name: /刷新/ })
    refresh.focus()
    fireEvent.keyDown(refresh, { key: 'f', ctrlKey: true })
    await waitFor(() => expect(document.activeElement).toBe(where))
  })
})

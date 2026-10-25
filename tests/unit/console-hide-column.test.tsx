// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
import { HIDDEN_STORAGE_PREFIX } from '../../src/client/columnhide'

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

function header(label: string): HTMLElement {
  const found = screen.getAllByRole('columnheader').find((cell) => (cell.textContent ?? '').startsWith(label))
  if (found === undefined) throw new Error(`missing column header ${label}`)
  return found
}

function hasHeader(label: string): boolean {
  return screen.queryAllByRole('columnheader').some((cell) => (cell.textContent ?? '').startsWith(label))
}

async function runQuery() {
  render(<ConsoleTab />)
  await screen.findByLabelText('数据源')
  const editor = document.querySelector('textarea')
  if (editor === null) throw new Error('missing SQL editor')
  fireEvent.change(editor, { target: { value: 'SELECT id, name, total FROM orders' } })
  fireEvent.click(await screen.findByRole('button', { name: '执行' }))
  await waitFor(() => expect(hasHeader('name')).toBe(true), { timeout: 4000 })
}

describe('console column hiding', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.query.mockResolvedValue({
      sql: 'SELECT id, name, total FROM orders',
      columns: [
        { name: 'id', typeName: 'INT' },
        { name: 'name', typeName: 'VARCHAR' },
        { name: 'total', typeName: 'DECIMAL' },
      ],
      rows: [[1, '手机', '638.00']],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    })
  })

  it('hides a column from its header menu and can restore it', async () => {
    await runQuery()

    fireEvent.contextMenu(header('name'))
    fireEvent.click(screen.getByRole('menuitem', { name: '隐藏列「name」' }))

    await waitFor(() => expect(hasHeader('name')).toBe(false), { timeout: 4000 })
    expect(hasHeader('id')).toBe(true)
    expect(window.localStorage.getItem(`${HIDDEN_STORAGE_PREFIX}console:sql`)).toBe('["name"]')

    fireEvent.contextMenu(header('id'))
    fireEvent.click(screen.getByRole('menuitem', { name: '显示全部列（已隐藏 1 列）' }))

    await waitFor(() => expect(hasHeader('name')).toBe(true), { timeout: 4000 })
    expect(window.localStorage.getItem(`${HIDDEN_STORAGE_PREFIX}console:sql`)).toBeNull()
  })
})

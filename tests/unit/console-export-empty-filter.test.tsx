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
}))

vi.mock('../../src/client/api', () => ({
  api: { ...mocks },
  ApiError: class ApiError extends Error {},
}))

import { ConsoleTab } from '../../src/client/ConsoleTab'

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
  mocks.objects.mockResolvedValue({ objects: [] })
})

afterEach(() => {
  cleanup()
})

describe('export menu with an empty filter result', () => {
  it('refuses to export the current page when the filter hides every row', async () => {
    mocks.query.mockResolvedValueOnce({
      sql: 'SELECT * FROM t',
      columns: [{ name: 'name', typeName: 'VARCHAR' }],
      rows: [['alpha'], ['beta']],
      rowCount: 2,
      truncated: false,
      elapsedMs: 1,
      warnings: [],
    })
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'SELECT * FROM t' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await screen.findByText('alpha')

    fireEvent.click(screen.getByLabelText('导出结果'))
    const csv = await screen.findByRole('menuitem', { name: /^当前页 CSV/ })
    expect((csv as HTMLButtonElement).disabled).toBe(false)

    fireEvent.change(screen.getByLabelText('筛选结果'), { target: { value: 'zzz' } })
    await waitFor(() => expect(screen.getByText(/当前页没有匹配筛选条件的行/)).toBeTruthy())
    expect((screen.getByRole('menuitem', { name: /^当前页 CSV/ }) as HTMLButtonElement).disabled).toBe(true)
  })
})

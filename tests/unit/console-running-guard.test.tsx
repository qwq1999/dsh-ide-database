// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueryResult } from '../../src/shared/types'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  describe: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  ddl: vi.fn(),
  explain: vi.fn(),
  redisScan: vi.fn(),
  redisDatabases: vi.fn(),
  redisKey: vi.fn(),
  redisCommand: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({ api: mocks }))

const { ConsoleTab } = await import('../../src/client/ConsoleTab')
const { waitForConsoleSource } = await import('../stubs/console-ready')

const connection = {
  id: 'mysql-1',
  name: '演示 MySQL',
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
  maxRows: 500,
  queryTimeoutSec: 30,
  connectTimeoutSec: 10,
  javaPath: '',
  mavenMirror: 'central',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: false,
}

const tab = () => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })

const result = (): QueryResult => ({
  columns: [{ name: 'id', type: 'INTEGER' }],
  rows: [[1]],
  elapsedMs: 3,
  sql: 'SELECT 1',
})

describe('running query guard', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [connection], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  it('ignores a second run while the first statement is still in flight', async () => {
    let release: (value: QueryResult) => void = () => undefined
    mocks.query.mockReturnValueOnce(new Promise<QueryResult>((resolve) => { release = resolve }))
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    fireEvent.change(editor, { target: { value: 'SELECT 1' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(1))
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await act(async () => {})
    expect(mocks.query).toHaveBeenCalledTimes(1)
    release(result())
    await waitFor(() => expect((screen.getByRole('button', { name: '执行' }) as HTMLButtonElement).disabled).toBe(false))
    mocks.query.mockResolvedValueOnce(result())
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2))
  })
})

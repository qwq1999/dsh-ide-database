// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { QueryResult } from '../../src/shared/types'

import { waitForConsoleSource } from '../stubs/console-ready'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  schemas: vi.fn(),
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

import { ConsoleTab } from '../../src/client/ConsoleTab'

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
const other = { ...mysql, id: 'mysql-2', name: '备用 MySQL', port: 3307 }

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

function grid(marker: string): QueryResult {
  return {
    columns: [{ name: 'v', type: 'VARCHAR' }],
    rows: [[marker]],
    rowCount: 1,
    truncated: false,
    warnings: [],
    elapsedMs: 3,
    sql: 'SELECT 1',
  }
}

function plan(text: string) {
  return {
    dialect: 'mysql',
    statements: ['EXPLAIN FORMAT=TREE SELECT 1'],
    plan: {
      sql: 'EXPLAIN FORMAT=TREE SELECT 1',
      columns: [{ name: 'EXPLAIN', typeName: 'VARCHAR' }],
      rows: [[text]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    },
    warnings: [],
  }
}

async function switchSource(name: RegExp): Promise<void> {
  fireEvent.click(screen.getByLabelText('数据源'))
  fireEvent.click(await screen.findByRole('option', { name }))
  await waitForConsoleSource(mocks)
}

describe('console source-switch races', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql, other], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  it('runs on the new source even while the old source query is still in flight', async () => {
    let releaseOld: (value: QueryResult) => void = () => undefined
    mocks.query.mockImplementationOnce(
      () =>
        new Promise<QueryResult>((resolve) => {
          releaseOld = resolve
        }),
    )
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)

    fireEvent.change(editor, { target: { value: 'SELECT 1' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(1))

    await switchSource(/备用 MySQL/)

    mocks.query.mockResolvedValueOnce(grid('SOURCE-B-DATA'))
    fireEvent.change(editor, { target: { value: 'SELECT 2' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    // The second run must be dispatched, not silently blocked by the stale
    // runningRef slot left behind by the voided first query.
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2))
    await act(async () => { releaseOld(grid('OLD')) })
  })

  it('does not restore the previous source grid when closing a plan', async () => {
    mocks.query.mockResolvedValueOnce(grid('SOURCE-A-DATA'))
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)

    fireEvent.change(editor, { target: { value: 'SELECT 1' } })
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
    await screen.findByText('SOURCE-A-DATA')

    mocks.explain.mockResolvedValueOnce(plan('PLAN-A'))
    fireEvent.click(screen.getByRole('button', { name: '执行计划' }))
    await waitFor(() => expect(mocks.explain).toHaveBeenCalledTimes(1))

    await switchSource(/备用 MySQL/)
    expect(screen.queryByText('SOURCE-A-DATA')).toBeNull()

    // The source switch clears the editor, so enter a fresh statement before
    // opening the second plan. No query is run on source B, so the saved
    // pre-plan result must stay null.
    fireEvent.change(editor, { target: { value: 'SELECT 2' } })
    mocks.explain.mockResolvedValueOnce(plan('PLAN-B'))
    fireEvent.click(screen.getByRole('button', { name: '执行计划' }))
    await waitFor(() => expect(mocks.explain).toHaveBeenCalledTimes(2))

    fireEvent.click(screen.getByRole('button', { name: '关闭计划' }))
    await act(async () => {})
    // The grid saved before source A's plan must not reappear in source B's tab.
    expect(screen.queryByText('SOURCE-A-DATA')).toBeNull()
  })
})

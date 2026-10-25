// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function pageCalls(): number {
  return mocks.query.mock.calls.filter((call) => (call[0] as { sql: string }).sql.includes('SELECT * FROM')).length
}

describe('table auto refresh', () => {
  const timers: { run: () => void; ms: number }[] = []

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    timers.length = 0
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
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((handler: () => void, ms: number) => {
      timers.push({ run: handler, ms })
      return timers.length as unknown as ReturnType<typeof setInterval>
    }) as unknown as typeof setInterval)
    vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => undefined)
  })

  it('refreshes on the chosen period and skips a tick while a load is running', async () => {
    render(<TableTab useTabInfo={tab} />)
    await waitFor(() => expect(pageCalls()).toBe(1))

    fireEvent.change(screen.getByLabelText('自动刷新'), { target: { value: '5000' } })
    expect(timers.at(-1)?.ms).toBe(5000)

    // A background tab does not re-query the database.
    const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    const parked = pageCalls()
    await act(async () => {
      timers.at(-1)?.run()
    })
    expect(pageCalls()).toBe(parked)
    if (visibility === undefined) delete (document as { visibilityState?: string }).visibilityState
    else Object.defineProperty(document, 'visibilityState', visibility)

    // The interval is skipped while the previous load is still in flight.
    let releaseRefresh: (value: unknown) => void = () => undefined
    mocks.query.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseRefresh = resolve
        }),
    )
    await act(async () => {
      timers.at(-1)?.run()
    })
    await waitFor(() => expect(pageCalls()).toBe(2))
    const before = pageCalls()

    await act(async () => {
      timers.at(-1)?.run()
    })
    expect(pageCalls()).toBe(before)

    await act(async () => {
      releaseRefresh({
        columns: [{ name: 'id', type: 'int' }],
        rows: [[2]],
        elapsedMs: 1,
        sql: 'SELECT * FROM `shop`.`orders` LIMIT 500 OFFSET 0',
      })
    })
    await waitFor(() => expect(screen.queryByText('2')).not.toBeNull())
  })

  it('refreshes as soon as the tab becomes visible again', async () => {
    render(<TableTab useTabInfo={tab} />)
    await waitFor(() => expect(pageCalls()).toBe(1))

    fireEvent.change(screen.getByLabelText('自动刷新'), { target: { value: '10000' } })
    expect(timers.at(-1)?.ms).toBe(10000)

    // No timer tick happens while the tab is away; coming back should not wait
    // for the next whole interval.
    const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(pageCalls()).toBe(2))
    if (visibility === undefined) delete (document as { visibilityState?: string }).visibilityState
    else Object.defineProperty(document, 'visibilityState', visibility)
  })

  it('does not refresh the grid while an export is running', async () => {
    render(<TableTab useTabInfo={tab} />)
    await waitFor(() => expect(pageCalls()).toBe(1))
    fireEvent.change(screen.getByLabelText('自动刷新'), { target: { value: '5000' } })

    // Hold the export's first batch so the export stays in flight.
    let releaseExport: (value: unknown) => void = () => undefined
    mocks.query.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseExport = resolve
        }),
    )
    fireEvent.click(screen.getByLabelText('导出结果'))
    fireEvent.click(screen.getByRole('menuitem', { name: /全部 CSV/ }))
    const before = pageCalls()
    await act(async () => {
      timers.at(-1)?.run()
    })
    expect(pageCalls()).toBe(before)
    await act(async () => {
      releaseExport({
        columns: [{ name: 'id', type: 'int' }],
        rows: [[1]],
        elapsedMs: 1,
        sql: 'SELECT * FROM `shop`.`orders` LIMIT 500 OFFSET 0',
      })
    })
  })
})

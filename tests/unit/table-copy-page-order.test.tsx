// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
      super(code, message)
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
  const found = screen.getAllByRole('columnheader').find((cell) => (cell.textContent ?? '').trim() === label)
  if (found === undefined) throw new Error(`missing column header ${label}`)
  return found
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
  mocks.query.mockImplementation(async (request: { sql: string }) => ({
    sql: request.sql,
    columns: [
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
      { name: 'age', typeName: 'INT' },
    ],
    rows: [[1, 'Alice', 30]],
    rowCount: 1,
    truncated: false,
    elapsedMs: 1,
    warnings: [],
  }))
  mocks.ddl.mockResolvedValue({
    schema: 'shop', table: 'orders', kind: 'table',
    ddl: 'CREATE TABLE `orders` (`id` INT)', source: 'query', warnings: [],
  })
})

afterEach(() => cleanup())

describe('table copy page respects column reorder', () => {
  it('pairs reordered headers with reordered values in CSV', async () => {
    render(
      <TableTab
        useTabInfo={() => ({
          tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
        })}
      />,
    )
    await waitFor(() => expect(mocks.query.mock.calls.length).toBeGreaterThanOrEqual(1))
    await waitFor(() => expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(1))

    // Drag "id" (position 0) onto "age" (position 2): display order [name, age, id].
    const idHeader = header('id')
    const ageHeader = header('age')
    const dragEvent = createEvent.dragStart(idHeader)
    Object.assign(dragEvent, { dataTransfer: { effectAllowed: '', setData: vi.fn() } })
    fireEvent(idHeader, dragEvent)
    fireEvent.dragOver(ageHeader)
    fireEvent.drop(ageHeader)

    await waitFor(() => expect(header('name').compareDocumentPosition(ageHeader) & 4).toBeTruthy())

    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制当前页 CSV' }))

    await waitFor(() => expect(copies).toHaveBeenCalled())
    const text = String(copies.mock.calls.at(-1)?.[0] ?? '')
    const lines = text.split('\n').map((line) => line.replace(/\r$/, ''))
    expect(lines[0]).toBe('name,age,id')
    expect(lines[1]).toBe('Alice,30,1')
  })
})

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

const downloads = vi.hoisted(() => vi.fn())
const copies = vi.hoisted(() => vi.fn(() => Promise.resolve(true)))

vi.mock('../../src/client/export', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/export')>()
  return { ...actual, downloadText: downloads }
})

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

function renderTable(): void {
  render(
    <TableTab
      useTabInfo={() => ({
        tab: { navigation: { params: { connectionId: mysql.id, schema: 'shop', table: 'orders' } } },
      })}
    />,
  )
}

describe('exporting selected table rows', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.query.mockImplementation(async (request: { sql: string }) => {
      if (request.sql.startsWith('SELECT COUNT(*)')) {
        return {
          sql: request.sql,
          columns: [{ name: 'COUNT(*)', typeName: 'BIGINT' }],
          rows: [[3]],
          rowCount: 1,
          truncated: false,
          elapsedMs: 1,
          warnings: [],
        }
      }
      return {
        sql: request.sql,
        columns: [{ name: 'name', typeName: 'VARCHAR' }],
        rows: [['alpha'], ['beta'], ['gamma']],
        rowCount: 3,
        truncated: false,
        elapsedMs: 2,
        warnings: [],
      }
    })
    mocks.connect.mockResolvedValue({ connected: true })
    mocks.ddl.mockResolvedValue({
      schema: 'shop',
      table: 'orders',
      kind: 'table',
      ddl: 'CREATE TABLE `orders` (`name` VARCHAR(20))',
      source: 'query',
      warnings: [],
    })
  })

  it('offers selected-row formats and exports only the checked rows', async () => {
    renderTable()
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))

    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    fireEvent.click(screen.getByLabelText('选择第 1 行'))
    fireEvent.click(screen.getByLabelText('选择第 3 行'))

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: /^已选 JSON/ }))

    await waitFor(() => expect(downloads).toHaveBeenCalledTimes(1))
    const [, mime, text] = downloads.mock.calls[0] as [string, string, string]
    expect(mime).toBe('application/json')
    expect(text).toContain('alpha')
    expect(text).toContain('gamma')
    expect(text).not.toContain('beta')
  })

  it('keeps hidden columns in a selected-row export', async () => {
    const columns = [
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
    ]
    const rows = [
      [1, 'alpha'],
      [2, 'beta'],
    ]
    mocks.query.mockImplementation(async (request: { sql: string }) => ({
      sql: request.sql,
      columns: request.sql.startsWith('SELECT COUNT(*)') ? [{ name: 'COUNT(*)', typeName: 'BIGINT' }] : columns,
      rows: request.sql.startsWith('SELECT COUNT(*)') ? [[2]] : rows,
      rowCount: request.sql.startsWith('SELECT COUNT(*)') ? 1 : 2,
      truncated: false,
      elapsedMs: 1,
      warnings: [],
    }))
    renderTable()
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))

    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))

    const idHeader = screen.getAllByRole('columnheader').find((cell) => (cell.textContent ?? '').startsWith('id'))
    if (idHeader === undefined) throw new Error('missing id header')
    fireEvent.contextMenu(idHeader)
    fireEvent.click(await screen.findByRole('menuitem', { name: '隐藏列「id」' }))
    await waitFor(() =>
      expect(screen.getAllByRole('columnheader').filter((cell) => (cell.textContent ?? '').startsWith('id'))).toHaveLength(0),
    )

    fireEvent.click(screen.getByLabelText('选择第 1 行'))
    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: /^已选 CSV/ }))

    await waitFor(() => expect(downloads).toHaveBeenCalledTimes(1))
    const [, , text] = downloads.mock.calls[0] as [string, string, string]
    expect(text).toContain('id,name')
    expect(text).toContain('1,alpha')
    expect(text).not.toContain('2,beta')
  })

  it('does not offer selected-row exports before a row is checked', async () => {
    renderTable()
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))

    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))
    fireEvent.click(trigger)
    expect(await screen.findByRole('menuitem', { name: /^当前页 CSV/ })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /^已选 / })).toBeNull()
  })

  it('copies only the checked rows', async () => {
    renderTable()
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))

    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))
    fireEvent.click(screen.getByLabelText('选择第 1 行'))
    fireEvent.click(screen.getByLabelText('选择第 3 行'))

    fireEvent.click(trigger)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制已选' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制已选 CSV' }))

    await waitFor(() => expect(copies).toHaveBeenCalledTimes(1))
    const text = copies.mock.calls[0]![0] as string
    expect(text).toContain('alpha')
    expect(text).toContain('gamma')
    expect(text).not.toContain('beta')
  })

  it('groups the export formats into flyout submenus', async () => {
    renderTable()
    await waitFor(() => expect(mocks.query.mock.calls.length).toBe(2))

    const trigger = (await screen.findByLabelText('导出结果')) as HTMLButtonElement
    await waitFor(() => expect(trigger.disabled).toBe(false))
    fireEvent.click(trigger)

    const page = await screen.findByRole('menuitem', { name: '导出当前页' })
    expect(page.getAttribute('aria-expanded')).toBe('false')
    expect(screen.getByRole('menuitem', { name: '整表脚本' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: /建表 \+ 数据/ })).toBeNull()
    fireEvent.pointerEnter(page)
    expect(page.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('group', { name: '导出当前页' }).getAttribute('data-open')).toBe('true')

    fireEvent.click(await screen.findByRole('menuitem', { name: /^当前页 CSV/ }))
    await waitFor(() => expect(downloads).toHaveBeenCalledTimes(1))
  })
})

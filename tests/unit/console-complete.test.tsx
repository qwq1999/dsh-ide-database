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
      objects: mocks.objects,
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

const tabWith = (connectionId: string) => () => ({ tab: { navigation: { params: { connectionId } } } })

function editor(): HTMLTextAreaElement {
  const area = document.querySelector('textarea')
  if (area === null) throw new Error('missing SQL editor')
  return area
}

function caret(area: HTMLTextAreaElement, at: number): void {
  area.focus()
  area.setSelectionRange(at, at)
  fireEvent.select(area)
}

describe('console table completion', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }, { name: 'crm' }] })
    mocks.objects.mockResolvedValue({
      objects: [
        { name: 'orders', kind: 'table' },
        { name: 'order_items', kind: 'view' },
        { name: 'customers', kind: 'table' },
      ],
    })
    mocks.query.mockResolvedValue({
      sql: 'SELECT 1',
      columns: [{ name: 'ok', typeName: 'INT' }],
      rows: [[1]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    })
  })

  it('offers the tables of the current schema and inserts the picked one', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    fireEvent.change(area, { target: { value: 'SELECT * FROM ord' } })
    caret(area, 18)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })

    const list = await screen.findByRole('listbox', { name: '补全候选' })
    expect(mocks.objects).toHaveBeenCalledWith('mysql-1', 'shop')
    const names = Array.from(list.querySelectorAll('.dshdb-complete-name')).map((item) => item.textContent)
    expect(names).toEqual(['orders', 'order_items', 'ORDER'])

    fireEvent.mouseDown(screen.getByText('orders'))
    await waitFor(() => expect(editor().value).toBe('SELECT * FROM orders'))
  })

  it('moves the selection with the arrow keys and inserts with Enter', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    fireEvent.change(area, { target: { value: 'SELECT * FROM ord' } })
    caret(area, 18)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })
    await screen.findByRole('listbox', { name: '补全候选' })

    fireEvent.keyDown(area, { key: 'ArrowDown' })
    fireEvent.keyDown(area, { key: 'Enter' })
    await waitFor(() => expect(editor().value).toBe('SELECT * FROM order_items'))
  })

  it('keeps Enter working after the typed prefix narrows the list', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    fireEvent.change(area, { target: { value: 'SELECT * FROM ord' } })
    caret(area, 18)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })
    await screen.findByRole('listbox', { name: '补全候选' })

    fireEvent.keyDown(area, { key: 'ArrowDown' })
    fireEvent.keyDown(area, { key: 'ArrowDown' })

    // Only one candidate starts with `order_i`, so the stale index 2 must clamp
    // back to the first row instead of picking nothing.
    fireEvent.change(area, { target: { value: 'SELECT * FROM order_i' } })
    caret(area, 22)
    fireEvent.keyDown(area, { key: 'Enter' })
    await waitFor(() => expect(editor().value).toBe('SELECT * FROM order_items'))
  })

  it('closes on Escape and reuses the cached object list', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    fireEvent.change(area, { target: { value: 'SELECT * FROM ' } })
    caret(area, 14)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })
    await screen.findByRole('listbox', { name: '补全候选' })

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('listbox', { name: '补全候选' })).toBeNull())

    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })
    await screen.findByRole('listbox', { name: '补全候选' })
    expect(mocks.objects).toHaveBeenCalledTimes(1)
  })
  it('points assistive tech at the highlighted candidate', async () => {
    render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })} />)
    await waitForConsoleSource(mocks)
    const area = (await screen.findByPlaceholderText(/输入 SQL/)) as HTMLTextAreaElement
    fireEvent.change(area, { target: { value: 'SELECT * FROM ord' } })
    caret(area, area.value.length)
    fireEvent.keyDown(area, { key: ' ', ctrlKey: true })
    await screen.findByRole('listbox', { name: '补全候选' })

    expect(area.getAttribute('aria-controls')).toBe('dshdb-complete-list')
    const first = area.getAttribute('aria-activedescendant')
    expect(first).toBe(document.querySelector('.dshdb-complete-active')?.id)

    fireEvent.keyDown(area, { key: 'ArrowDown' })
    const second = area.getAttribute('aria-activedescendant')
    expect(second).not.toBe(first)
    expect(second).toBe(document.querySelector('.dshdb-complete-active')?.id)
  })

  it('scrolls the highlighted candidate into view', async () => {
    const scrolled = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrolled
    try {
      render(<ConsoleTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1' } } } })} />)
      await waitForConsoleSource(mocks)
      const editor = await screen.findByPlaceholderText(/输入 SQL/)
      fireEvent.change(editor, { target: { value: 'SELECT * FROM ord' } })
      caret(editor as HTMLTextAreaElement, (editor as HTMLTextAreaElement).value.length)
      fireEvent.keyDown(editor, { key: ' ', ctrlKey: true })
      await screen.findByRole('listbox', { name: '补全候选' })
      expect(scrolled).toHaveBeenCalled()
      const calls = scrolled.mock.calls.length
      fireEvent.keyDown(editor, { key: 'ArrowDown' })
      expect(scrolled.mock.calls.length).toBeGreaterThan(calls)
      expect(scrolled).toHaveBeenLastCalledWith({ block: 'nearest' })
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })
})

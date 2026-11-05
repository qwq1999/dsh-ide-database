// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
  consoleAutoComplete: true,
}

const tabWith = (connectionId: string) => () => ({ tab: { navigation: { params: { connectionId } } } })

function editor(): HTMLTextAreaElement {
  const area = document.querySelector('textarea')
  if (area === null) throw new Error('missing SQL editor')
  return area
}

/** Simulate typing one character at a time, keeping the caret at the end. */
function type(area: HTMLTextAreaElement, value: string): void {
  fireEvent.change(area, { target: { value } })
  area.focus()
  area.setSelectionRange(value.length, value.length)
  fireEvent.select(area)
}

describe('console auto complete', () => {
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
  })

  it('opens the completion popup after typing a character', async () => {
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    type(area, 'o')
    type(area, 'or')
    type(area, 'ord')

    const list = await screen.findByRole('listbox', { name: '补全候选' })
    expect(mocks.objects).toHaveBeenCalledWith('mysql-1', 'shop')
    const names = Array.from(list.querySelectorAll('.dshdb-complete-name')).map((item) => item.textContent)
    expect(names).toEqual(['orders', 'order_items', 'ORDER'])
  })

  it('stays closed while the setting is off', async () => {
    mocks.status.mockResolvedValue({
      config: { connections: [mysql], settings: { ...settings, consoleAutoComplete: false }, drivers: [] },
      drivers: [],
      env: {},
    })
    render(<ConsoleTab useTabInfo={tabWith('mysql-1')} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const area = editor()
    type(area, 'o')
    type(area, 'or')

    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(mocks.objects).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox', { name: '补全候选' })).toBeNull()
  })
})

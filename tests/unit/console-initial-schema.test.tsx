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

const SCHEMA_KEY = 'dsh-ide-database.schema.v1:mysql-1'

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
  confirmDestructive: true,
}

const tab = (params: Record<string, unknown>) => () => ({ tab: { navigation: { params } } })

describe('the console opens in the schema picked in the tree', () => {
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }, { name: 'ihive_sdgy_cmocr_cmocr' }] })
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.query.mockResolvedValue({
      sql: 'SELECT 1',
      columns: [{ name: 'x', typeName: 'INT' }],
      rows: [[1]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 2,
      warnings: [],
    })
  })

  it('starts on the schema of the selection and runs queries in it', async () => {
    render(<ConsoleTab useTabInfo={tab({ connectionId: 'mysql-1', schema: 'ihive_sdgy_cmocr_cmocr', sql: 'SELECT 1' })} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const picker = await screen.findByLabelText('数据库')
    await waitFor(() => expect(picker.textContent).toBe('ihive_sdgy_cmocr_cmocr'))
    // The pick survives the tab, so the next console opens there too.
    expect(window.localStorage.getItem(SCHEMA_KEY)).toBe('ihive_sdgy_cmocr_cmocr')

    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

    await waitFor(() =>
      expect(mocks.query).toHaveBeenCalledWith(expect.objectContaining({ id: 'mysql-1', schema: 'ihive_sdgy_cmocr_cmocr' })),
    )
  })

  it('keeps the remembered schema when no selection was carried over', async () => {
    window.localStorage.setItem(SCHEMA_KEY, 'ihive_sdgy_cmocr_cmocr')
    render(<ConsoleTab useTabInfo={tab({ connectionId: 'mysql-1' })} />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)

    const picker = await screen.findByLabelText('数据库')
    await waitFor(() => expect(picker.textContent).toBe('ihive_sdgy_cmocr_cmocr'))
  })
})

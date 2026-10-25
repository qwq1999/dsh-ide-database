// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

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

const RAW = '{"a":1,"list":[2,3]}'
const PRETTY = '{\n  "a": 1,\n  "list": [\n    2,\n    3\n  ]\n}'

describe('console cell full value dialog', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
    mocks.query.mockResolvedValue({
      sql: 'SELECT * FROM configs',
      columns: [{ name: 'config', typeName: 'TEXT' }],
      rows: [[RAW]],
      rowCount: 1,
      truncated: false,
      elapsedMs: 3,
      warnings: [],
    })
  })

  it('opens a JSON cell as pretty-printed text and closes again', async () => {
    render(<ConsoleTab />)
    await screen.findByLabelText('数据源')
    await waitForConsoleSource(mocks)
    const editor = document.querySelector('textarea')
    if (editor === null) throw new Error('missing SQL editor')
    fireEvent.change(editor, { target: { value: 'SELECT * FROM configs' } })
    fireEvent.click(await screen.findByRole('button', { name: '执行' }))

    fireEvent.doubleClick(await screen.findByText(RAW))
    const block = await screen.findByLabelText('单元格完整值')
    expect(block.textContent).toBe(PRETTY)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByLabelText('单元格完整值')).toBeNull()
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

async function openEditor(): Promise<HTMLTextAreaElement> {
  render(<ConsoleTab />)
  await screen.findByLabelText('数据源')
  await waitForConsoleSource(mocks)
  const editor = document.querySelector('textarea')
  if (editor === null) throw new Error('missing SQL editor')
  return editor
}

function type(editor: HTMLTextAreaElement, value: string): void {
  fireEvent.change(editor, { target: { value } })
}

describe('console comment shortcut', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [mysql], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  it('comments the line holding the caret on Ctrl+/', async () => {
    const editor = await openEditor()
    type(editor, 'SELECT 1;\nSELECT 2;')
    editor.setSelectionRange(7, 7)
    fireEvent.select(editor)
    fireEvent.keyDown(editor, { key: '/', ctrlKey: true })

    expect(editor.value).toBe('-- SELECT 1;\nSELECT 2;')
  })

  it('comments every selected line and toggles back', async () => {
    const editor = await openEditor()
    type(editor, 'SELECT 1;\nSELECT 2;')
    editor.setSelectionRange(0, editor.value.length)
    fireEvent.select(editor)
    fireEvent.keyDown(editor, { key: '/', metaKey: true })

    await waitFor(() => expect(editor.value).toBe('-- SELECT 1;\n-- SELECT 2;'))

    fireEvent.keyDown(editor, { key: '/', metaKey: true })
    await waitFor(() => expect(editor.value).toBe('SELECT 1;\nSELECT 2;'))
  })
})

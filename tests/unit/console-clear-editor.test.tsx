// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
    api: { ...mocks },
  }
})

import { ConsoleTab } from '../../src/client/ConsoleTab'
import { setKeybindings } from '../../src/client/keymap'
import { waitForConsoleSource } from '../stubs/console-ready'

const connection = {
  id: 'mysql-1',
  name: '演示 MySQL',
  driver: 'mysql',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 33061,
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

describe('clear editor', () => {
  afterEach(() => {
    cleanup()
    setKeybindings({})
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config: { connections: [connection], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  it('empties the editor from the toolbar button', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    // The schemas response may land a tick before React commits the editor.
    const editor = await screen.findByPlaceholderText(/输入 SQL/)
    const clear = screen.getByRole('button', { name: '清空' })
    expect((clear as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(editor, { target: { value: 'SELECT 1' } })
    expect((clear as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(clear)
    expect((editor as HTMLTextAreaElement).value).toBe('')
    expect((clear as HTMLButtonElement).disabled).toBe(true)
  })

  it('empties the editor with Ctrl/⌘ + L', async () => {
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)

    fireEvent.change(editor, { target: { value: 'SELECT 1' } })
    fireEvent.keyDown(editor, { key: 'l', ctrlKey: true })

    expect((editor as HTMLTextAreaElement).value).toBe('')
  })

  it('follows a rebound shortcut and forgets the built-in one', async () => {
    setKeybindings({ 'console.clear': 'mod+k' })
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    const editor = await screen.findByPlaceholderText(/输入 SQL/)

    fireEvent.change(editor, { target: { value: 'SELECT 1' } })
    fireEvent.keyDown(editor, { key: 'l', ctrlKey: true })
    expect((editor as HTMLTextAreaElement).value).toBe('SELECT 1')

    fireEvent.keyDown(editor, { key: 'k', ctrlKey: true })
    expect((editor as HTMLTextAreaElement).value).toBe('')
  })
})

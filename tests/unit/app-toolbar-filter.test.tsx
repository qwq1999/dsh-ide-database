// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ status: vi.fn() }))

vi.mock('../../src/client/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/api')>()
  return { ...actual, api: { ...actual.api, status: mocks.status } }
})

import { App } from '../../src/client/App'
import type { ClientConnection, DbSettings } from '../../src/shared/types'

const connection: ClientConnection = {
  id: 'conn-36a8d2bec9',
  name: '192.168.49.49',
  driver: 'mysql',
  dialect: 'mysql',
  host: '192.168.49.49',
  port: 3306,
  user: 'root',
  hasPassword: false,
  database: '',
  redisDb: 0,
  params: {},
  readOnly: false,
  createdAt: '2026-11-05T04:00:00.000Z',
}

const settings: DbSettings = {
  maxRows: 200,
  queryTimeoutSec: 30,
  connectTimeoutSec: 10,
  javaPath: '',
  mavenMirror: 'central',
  allowAgentWrites: true,
  redisScanCount: 200,
  confirmDestructive: true,
  keybindings: {},
}

function mockStatus(connections: ClientConnection[] = [connection]): void {
  mocks.status.mockResolvedValue({
    config: { connections, trash: [], drivers: [], settings: { ...settings } },
    drivers: [],
    env: {
      java: { available: false, source: 'missing' },
      dataDir: '',
      configPath: '',
      bridgeJar: '',
      bridgeBuilt: false,
      pluginVersion: '0.3.2',
      platform: 'win32',
    },
  })
}

async function filterButton(): Promise<HTMLButtonElement> {
  await waitFor(() => expect(document.querySelector('[data-toolbar-action="filter"] button')).not.toBeNull())
  return document.querySelector<HTMLButtonElement>('[data-toolbar-action="filter"] button') as HTMLButtonElement
}

describe('data-source toolbar filter button', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('reveals the tree filter and puts the caret in it', async () => {
    mockStatus()
    render(<App />)
    const button = await filterButton()
    // The box stays hidden until asked for, exactly like the Ctrl+F path.
    expect(screen.queryByLabelText('筛选库表')).toBeNull()
    fireEvent.click(button)
    const input = await screen.findByLabelText('筛选库表')
    expect(document.activeElement).toBe(input)
  })

  it('puts the box away on a second click', async () => {
    mockStatus()
    render(<App />)
    const button = await filterButton()
    fireEvent.click(button)
    const input = await screen.findByLabelText('筛选库表')
    fireEvent.change(input, { target: { value: '192' } })
    await waitFor(() => expect(button.getAttribute('aria-pressed')).toBe('true'))
    fireEvent.click(button)
    await waitFor(() => expect(screen.queryByLabelText('筛选库表')).toBeNull())
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('reopens with an empty term after the box was put away', async () => {
    mockStatus()
    render(<App />)
    const button = await filterButton()
    fireEvent.click(button)
    const input = await screen.findByLabelText('筛选库表')
    fireEvent.change(input, { target: { value: '192' } })
    fireEvent.click(button)
    await waitFor(() => expect(screen.queryByLabelText('筛选库表')).toBeNull())
    // Putting the box away ends the filter, so the next press starts clean.
    fireEvent.click(button)
    const reopened = await screen.findByLabelText('筛选库表')
    expect((reopened as HTMLInputElement).value).toBe('')
  })

  it('keeps the caret in the box when the trigger itself is pressed', async () => {
    mockStatus()
    render(<App />)
    const button = await filterButton()
    fireEvent.click(button)
    const input = await screen.findByLabelText('筛选库表')
    expect(document.activeElement).toBe(input)
    // Stealing focus would blur the field, and an empty box closes on blur:
    // the click would then read "closed" and open it again instead of closing.
    const press = createEvent.mouseDown(button)
    fireEvent(button, press)
    expect(press.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(input)
  })

  it('is disabled while there is no data source to filter', async () => {
    mockStatus([])
    render(<App />)
    const button = await filterButton()
    expect(button.hasAttribute('disabled')).toBe(true)
  })
})

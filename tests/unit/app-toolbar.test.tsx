// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function mockStatus(toolbarActions?: string[], connections: ClientConnection[] = [connection]): void {
  mocks.status.mockResolvedValue({
    config: { connections, trash: [], drivers: [], settings: { ...settings, toolbarActions } },
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

function slots(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-toolbar-action]'))
}

function slotIds(): string[] {
  return slots().map((slot) => slot.getAttribute('data-toolbar-action') ?? '')
}

function moreSlot(): HTMLElement {
  return screen.getByLabelText('更多操作').closest('.dshdb-toolbar-slot') as HTMLElement
}

describe('data-source toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders the saved order and appends actions it does not mention', async () => {
    mockStatus(['trash', 'settings'])
    render(<App />)
    await waitFor(() => expect(slots()).toHaveLength(7))
    await waitFor(() => expect(slotIds()[0]).toBe('trash'))
    expect(slotIds()).toEqual([
      'trash',
      'settings',
      'add',
      'edit',
      'refresh',
      'delete',
      'console',
    ])
  })

  it('keeps the "…" button hidden while every action fits', async () => {
    mockStatus()
    render(<App />)
    await waitFor(() => expect(slots()).toHaveLength(7))
    expect(moreSlot().className).toContain('dshdb-toolbar-slot-hidden')
  })

  it('folds the actions that do not fit into the "…" menu', async () => {
    // No selected connection, so the folded edit/delete entries must stay grey.
    mockStatus(undefined, [])
    const rect = { width: 40, height: 24, top: 0, left: 0, right: 40, bottom: 24, x: 0, y: 0 }
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      toJSON: () => rect,
    } as DOMRect)
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
    Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 100 })
    try {
      render(<App />)
      await waitFor(() => expect(moreSlot().className).not.toContain('dshdb-toolbar-slot-hidden'))
      fireEvent.click(screen.getByLabelText('更多操作'))
      const items = await screen.findAllByRole('menuitem')
      expect(items.length).toBeGreaterThan(0)
      const item = (label: string): HTMLElement | undefined =>
        items.find((entry) => entry.textContent?.includes(label))
      expect(item('编辑')?.hasAttribute('disabled')).toBe(true)
      expect(item('删除')?.hasAttribute('disabled')).toBe(true)
      expect(item('设置')?.hasAttribute('disabled')).toBe(false)
      expect(screen.getByLabelText('更多操作').getAttribute('aria-expanded')).toBe('true')
    } finally {
      if (original === undefined) delete (Element.prototype as { clientWidth?: unknown }).clientWidth
      else Object.defineProperty(Element.prototype, 'clientWidth', original)
    }
  })
})

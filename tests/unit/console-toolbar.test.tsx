// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  copyText: vi.fn(async () => true),
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

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/colmenu')>()
  return { ...actual, copyText: mocks.copyText }
})

import { ConsoleTab } from '../../src/client/ConsoleTab'
import { CSS } from '../../src/client/styles'
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

function mockStatus(consoleActions?: string[]): void {
  mocks.status.mockResolvedValue({
    config: {
      connections: [connection],
      settings: consoleActions === undefined ? settings : { ...settings, consoleActions },
      drivers: [],
    },
    drivers: [],
    env: {},
  })
}

function slots(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-console-action]'))
}

function slotIds(): string[] {
  return slots().map((slot) => slot.getAttribute('data-console-action') ?? '')
}

function moreSlot(): HTMLElement {
  return screen.getByLabelText('更多操作').closest('.dshdb-qbar-slot') as HTMLElement
}

describe('console toolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }] })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('gives every action an icon and a text label, export included', async () => {
    mockStatus()
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(slots()).toHaveLength(14))
    for (const slot of slots()) {
      const button = slot.querySelector('button')
      expect(button, slot.getAttribute('data-console-action') ?? '').not.toBeNull()
      expect(button?.querySelector('svg'), slot.getAttribute('data-console-action') ?? '').not.toBeNull()
      expect((button?.textContent ?? '').trim().length).toBeGreaterThan(0)
    }
    const exportButton = screen.getByLabelText('导出结果')
    expect(exportButton.textContent).toContain('导出')
    expect(exportButton.querySelector('svg')).not.toBeNull()
  })

  it('follows the saved order and puts unmentioned actions last', async () => {
    mockStatus(['export', 'run', 'save'])
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(slotIds()[0]).toBe('export'))
    expect(slotIds().slice(0, 3)).toEqual(['export', 'run', 'save'])
    expect(slotIds().slice(3)).toEqual([
      'cancel',
      'history',
      'format',
      'import',
      'clear',
      'copy',
      'explain',
      'openTable',
      'txStart',
      'txCommit',
      'txRollback',
    ])
  })

  it('keeps the "…" button hidden while everything fits', async () => {
    mockStatus()
    render(<ConsoleTab useTabInfo={tab} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(slots()).toHaveLength(14))
    expect(moreSlot().className).toContain('dshdb-qbar-slot-hidden')
  })

  it('folds the actions that do not fit into the "…" menu', async () => {
    mockStatus()
    const rect = { width: 40, height: 22, top: 0, left: 0, right: 40, bottom: 22, x: 0, y: 0 }
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      ...rect,
      toJSON: () => rect,
    } as DOMRect)
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth')
    Object.defineProperty(Element.prototype, 'clientWidth', { configurable: true, get: () => 100 })
    try {
      render(<ConsoleTab useTabInfo={tab} />)
      await waitForConsoleSource(mocks)
      await waitFor(() => expect(moreSlot().className).not.toContain('dshdb-qbar-slot-hidden'))
      fireEvent.click(screen.getByLabelText('更多操作'))
      const items = await screen.findAllByRole('menuitem')
      expect(items).toHaveLength(13)
      expect(items[0]?.textContent).toContain('取消')
      // Hidden toolbar buttons keep their disabled state inside the menu.
      const item = (label: string) => items.find((entry) => entry.textContent?.includes(label))
      expect(item('取消')?.hasAttribute('disabled')).toBe(true)
      expect(item('导出')?.hasAttribute('disabled')).toBe(true)
      expect(screen.getByLabelText('更多操作').getAttribute('aria-expanded')).toBe('true')
      // Right-aligned to the trigger, otherwise the menu would run past the
      // panel edge when the "…" button sits near the right side.
      expect(screen.getByRole('menu').className).not.toContain('dshdb-menu-start')
    } finally {
      if (original === undefined) delete (Element.prototype as { clientWidth?: unknown }).clientWidth
      else Object.defineProperty(Element.prototype, 'clientWidth', original)
    }
  })

  it('does not clip the "…" menu when it drops below the toolbar', () => {
    // jsdom cannot paint, so guard the CSS invariant instead: the menu is an
    // absolutely-positioned child of the actions row and must not be clipped.
    const actions = /\.dshdb-qbar-actions\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    expect(actions).not.toMatch(/overflow\s*:\s*hidden/)
    const menu = /\.dshdb-menu\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? ''
    expect(menu).toMatch(/position\s*:\s*absolute/)
    expect(menu).toMatch(/right\s*:\s*0/)
    expect(menu).not.toMatch(/left\s*:\s*0/)
    // Hug the widest item instead of a fixed 190px minimum width.
    expect(menu).toMatch(/width\s*:\s*max-content/)
    expect(menu).not.toMatch(/min-width\s*:\s*190px/)
    // Disabled entries are greyed out like their toolbar counterparts.
    expect(CSS).toMatch(
      /\.dshdb-menu button:disabled\s*\{[^}]*color\s*:\s*var\(--dsw-alias-label-tertiary\)/,
    )
  })
})

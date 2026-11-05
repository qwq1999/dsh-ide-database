// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
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

const env = {
  java: { available: false, source: 'missing' },
  dataDir: '',
  configPath: '',
  bridgeJar: '',
  bridgeBuilt: false,
  pluginVersion: '0.3.2',
  platform: 'win32',
}

beforeEach(() => {
  mocks.status.mockResolvedValue({
    config: { connections: [connection], trash: [], drivers: [], settings },
    drivers: [],
    env,
    prefetch: [],
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('App status bar', () => {
  it('shows the selected connection id between its name and its address', async () => {
    render(<App />)
    await screen.findByText('conn-36a8d2bec9')
    const bar = document.querySelector('.dshdb-statusbar')
    expect(bar).not.toBeNull()
    const text = bar?.textContent ?? ''
    const nameAt = text.indexOf('192.168.49.49')
    const idAt = text.indexOf('conn-36a8d2bec9')
    const addressAt = text.lastIndexOf('192.168.49.49:3306')
    expect(nameAt).toBeGreaterThanOrEqual(0)
    expect(idAt).toBeGreaterThan(nameAt)
    expect(addressAt).toBeGreaterThan(idAt)
  })

  it('hides the background cache counter when nothing is running', async () => {
    render(<App />)
    await screen.findByText('conn-36a8d2bec9')
    expect(document.querySelector('.dshdb-statusbar-prefetch')).toBeNull()
  })

  it('shows a spinner and live progress while descriptions are cached', async () => {
    mocks.status.mockResolvedValue({
      config: { connections: [connection], trash: [], drivers: [], settings },
      drivers: [],
      env,
      prefetch: [{ connectionId: connection.id, total: 120, done: 45 }],
    })

    render(<App />)

    await screen.findByText('缓存结构 45/120')
    const indicator = document.querySelector('.dshdb-statusbar-prefetch')
    expect(indicator?.querySelector('.dshdb-spinner')).not.toBeNull()
  })

  it('picks the selected data source out of several running walks', async () => {
    mocks.status.mockResolvedValue({
      config: { connections: [connection], trash: [], drivers: [], settings },
      drivers: [],
      env,
      prefetch: [
        { connectionId: 'conn-other', total: 80, done: 20 },
        { connectionId: connection.id, total: 120, done: 45 },
      ],
    })

    render(<App />)

    await screen.findByText('缓存结构 45/120')
    expect(screen.queryByText('缓存结构 20/80')).toBeNull()
  })

  it('hides the counter when only another data source is caching', async () => {
    mocks.status.mockResolvedValue({
      config: { connections: [connection], trash: [], drivers: [], settings },
      drivers: [],
      env,
      prefetch: [{ connectionId: 'conn-other', total: 80, done: 20 }],
    })

    render(<App />)

    await screen.findByText('conn-36a8d2bec9')
    expect(document.querySelector('.dshdb-statusbar-prefetch')).toBeNull()
  })
})

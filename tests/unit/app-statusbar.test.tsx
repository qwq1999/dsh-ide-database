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

beforeEach(() => {
  mocks.status.mockResolvedValue({
    config: { connections: [connection], trash: [], drivers: [], settings },
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
})

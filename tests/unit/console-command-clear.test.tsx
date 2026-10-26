// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConsoleTab } from '../../src/client/ConsoleTab'
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
  cancel: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({ api: mocks }))

function redisSettings() {
  return {
    maxRows: 500,
    queryTimeoutSec: 30,
    connectTimeoutSec: 10,
    javaPath: '',
    mavenMirror: '',
    allowAgentWrites: false,
    redisScanCount: 200,
    confirmDestructive: true,
  }
}

describe('Redis command box', () => {
  it('clears the box when Ctrl/⌘ + L is pressed', async () => {
    mocks.status.mockResolvedValue({
      config: {
        connections: [
          {
            id: 'redis-1',
            name: '缓存',
            dialect: 'redis',
            host: '127.0.0.1',
            port: 6379,
            user: '',
            database: '',
            readOnly: false,
          },
        ],
        settings: redisSettings(),
        drivers: [],
      },
      drivers: [],
      env: {},
    })
    mocks.schemas.mockResolvedValue({ schemas: [] })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    mocks.redisCommand.mockResolvedValue({ command: 'PING', value: 'PONG', elapsedMs: 1, readOnly: true })
    mocks.cancel.mockResolvedValue({ cancelled: false })

    render(
      <ConsoleTab
        useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'redis-1' } } } })}
      />,
    )
    await waitForConsoleSource(mocks)

    const box = (await screen.findByPlaceholderText(/例如 GET/)) as HTMLTextAreaElement
    fireEvent.change(box, { target: { value: 'GET app:config' } })
    expect(box.value).toBe('GET app:config')

    fireEvent.keyDown(box, { key: 'l', ctrlKey: true })
    expect(box.value).toBe('')
  })
})

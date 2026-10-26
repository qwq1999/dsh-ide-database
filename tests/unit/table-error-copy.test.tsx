// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppConfig } from '../../src/shared/types'
import { ApiError } from '../../src/client/api'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  query: vi.fn(),
  connect: vi.fn(),
  ddl: vi.fn(),
  copyText: vi.fn(),
}))

vi.mock('../../src/client/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/api')>()
  return { ...actual, api: { status: mocks.status, query: mocks.query, connect: mocks.connect, ddl: mocks.ddl } }
})

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/colmenu')>()
  return { ...actual, copyText: mocks.copyText }
})

const { TableTab } = await import('../../src/client/TableTab')

const config = {
  connections: [
    {
      id: 'mysql-1',
      name: '演示 MySQL',
      driver: 'mysql',
      host: '127.0.0.1',
      port: 33061,
      user: 'root',
      database: 'shop',
      dialect: 'mysql',
    },
  ],
  settings: {
    maxRows: 200,
    queryTimeoutSec: 30,
    connectTimeoutSec: 10,
    javaPath: '',
    mavenMirror: '',
    allowAgentWrites: false,
    redisScanCount: 200,
    confirmDestructive: true,
  },
  drivers: [],
} as unknown as AppConfig

describe('table error banner', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()
    mocks.status.mockResolvedValue({ config, drivers: [], env: {} })
    mocks.copyText.mockResolvedValue(true)
  })

  it('copies the whole failure including the server detail', async () => {
    mocks.query.mockRejectedValue(new ApiError('sql', 'Unknown column', "Column 'nope' not found"))
    render(<TableTab useTabInfo={() => ({ tab: { navigation: { params: { connectionId: 'mysql-1', schema: 'shop', table: 'orders' } } } })} />)

    await screen.findByText(/Unknown column/)
    fireEvent.click(screen.getByRole('button', { name: '复制' }))

    await waitFor(() => expect(mocks.copyText).toHaveBeenCalled())
    expect(mocks.copyText.mock.calls[0]?.[0]).toBe("Unknown column\nColumn 'nope' not found")
  })

})

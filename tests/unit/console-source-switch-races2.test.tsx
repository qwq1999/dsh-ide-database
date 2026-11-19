// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { waitForConsoleSource } from '../stubs/console-ready'

const mocks = vi.hoisted(() => ({
  status: vi.fn(), schemas: vi.fn(), objects: vi.fn(), query: vi.fn(), connect: vi.fn(),
  ddl: vi.fn(), explain: vi.fn(), redisScan: vi.fn(), redisDatabases: vi.fn(),
  redisKey: vi.fn(), redisCommand: vi.fn(), cancel: vi.fn(), tx: vi.fn(),
  cellText: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({ api: { ...mocks }, ApiError: class ApiError extends Error {} }))

import { ConsoleTab } from '../../src/client/ConsoleTab'

const mysqlA = {
  id: 'db-A', name: '源A', driver: 'mysql', dialect: 'mysql', host: 'h', port: 3306,
  user: 'root', hasPassword: false, database: 'schemaA', redisDb: 0, params: {}, readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}
const mysqlB = { ...mysqlA, id: 'db-B', name: '源B', database: 'schemaB' }
const redisA = {
  id: 'redis-A', name: 'RedisA', driver: 'redis', dialect: 'redis', host: 'h', port: 6379,
  user: '', hasPassword: false, database: '', redisDb: 0, params: {}, readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}
const redisB = { ...redisA, id: 'redis-B', name: 'RedisB' }

const settings = {
  maxRows: 500, queryTimeoutSec: 30, connectTimeoutSec: 10, javaPath: '', mavenMirror: 'central',
  allowAgentWrites: false, redisScanCount: 200, confirmDestructive: false,
}

const tabMysql = () => ({ tab: { navigation: { params: { connectionId: 'db-A' } } } })
const tabRedis = () => ({ tab: { navigation: { params: { connectionId: 'redis-A' } } } })

function keyValue(ttl = -1) {
  return { key: 'user:1', type: 'string', ttl, size: 5, value: 'v', truncated: false, preview: 'v' }
}

function optionLabels(label: string): string[] {
  const trigger = screen.getByRole('button', { name: label })
  fireEvent.click(trigger)
  const labels = screen.getAllByRole('option').map((node) => node.textContent ?? '')
  fireEvent.click(trigger) // close so repeated reads don't stack listboxes
  return labels
}

async function switchSource(name: RegExp): Promise<void> {
  fireEvent.click(screen.getByLabelText('数据源'))
  fireEvent.click(await screen.findByRole('option', { name }))
  await waitForConsoleSource(mocks)
}

describe('console source-switch async races (regression r21)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.query.mockResolvedValue({ columns: [], rows: [], rowCount: 0, truncated: false, warnings: [], elapsedMs: 1, sql: '' })
    mocks.cancel.mockResolvedValue(undefined)
    mocks.tx.mockResolvedValue(undefined)
    mocks.connect.mockResolvedValue(undefined)
    mocks.explain.mockResolvedValue({ statements: [], warnings: [] })
    mocks.redisCommand.mockResolvedValue({ output: '' })
    mocks.cellText.mockResolvedValue('')
  })
  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('BUG1: an in-flight schema list from the old source must not overwrite the new source', async () => {
    let releaseA!: (value: { schemas: { name: string }[] }) => void
    mocks.status.mockResolvedValue({ config: { connections: [mysqlA, mysqlB], settings, drivers: [] }, drivers: [], env: {} })
    mocks.schemas.mockImplementation((id: string) =>
      id === 'db-A'
        ? new Promise((resolve) => { releaseA = resolve })
        : Promise.resolve({ schemas: [{ name: 'onlyB' }] }),
    )

    render(<ConsoleTab useTabInfo={tabMysql} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(mocks.schemas).toHaveBeenCalledWith('db-A'))

    // Switch to B while A's schema request is still pending.
    await switchSource(/源B/)
    await waitFor(() => expect(mocks.schemas).toHaveBeenCalledWith('db-B'))
    await waitFor(() => expect(optionLabels('数据库')).toContain('onlyB'))

    // A's slow response lands last; its schemas must be discarded (schemaRequest token).
    await act(async () => { releaseA({ schemas: [{ name: 'onlyA' }] }) })

    const labels = optionLabels('数据库')
    expect(labels.some((text) => text.includes('onlyA'))).toBe(false)
    expect(labels.some((text) => text.includes('onlyB'))).toBe(true)
  })

  it('BUG2: switching Redis logical db resets valueRefreshing so the refresh button is usable again', async () => {
    mocks.status.mockResolvedValue({ config: { connections: [redisA], settings, drivers: [] }, drivers: [], env: {} })
    mocks.redisDatabases.mockResolvedValue({ databases: 16 })
    mocks.redisScan.mockResolvedValue({ keys: [{ key: 'user:1', type: 'string', ttl: -1, size: 5 }], cursor: '0' })

    let resolveRefresh!: (value: ReturnType<typeof keyValue>) => void
    let calls = 0
    mocks.redisKey.mockImplementation(() => {
      calls += 1
      if (calls === 2) return new Promise((resolve) => { resolveRefresh = resolve })
      return Promise.resolve(keyValue())
    })

    render(<ConsoleTab useTabInfo={tabRedis} />)
    await waitForConsoleSource(mocks)

    // Select the key and start a refresh that we hold pending.
    fireEvent.click((await screen.findAllByText('user:1'))[0] as HTMLElement)
    await waitFor(() => expect(mocks.redisKey).toHaveBeenCalledTimes(1))
    await screen.findByLabelText('刷新键值')
    fireEvent.click(screen.getByLabelText('刷新键值'))
    await waitFor(() => expect(mocks.redisKey).toHaveBeenCalledTimes(2))
    expect(screen.getByLabelText('正在刷新键值')).toBeTruthy()

    // Switch logical db while the refresh is in flight (invalidateRun bumps runToken).
    fireEvent.change(screen.getByLabelText('Redis 逻辑库'), { target: { value: '1' } })
    await act(async () => { await Promise.resolve() })

    // The stale refresh resolves; its token-guarded finally is skipped, so the
    // only thing that can clear the spinner is invalidateRun's setValueRefreshing(false).
    await act(async () => { resolveRefresh(keyValue()); await Promise.resolve() })

    // Return to db0 and reselect the key so the value panel (and refresh button) remounts.
    fireEvent.change(screen.getByLabelText('Redis 逻辑库'), { target: { value: '0' } })
    await act(async () => { await Promise.resolve() })
    fireEvent.click((await screen.findAllByText('user:1'))[0] as HTMLElement)
    await waitFor(() => expect(screen.queryByLabelText('刷新键值')).not.toBeNull())

    const button = screen.queryByLabelText('正在刷新键值')
    expect(button).toBeNull()
    expect((screen.getByLabelText('刷新键值') as HTMLButtonElement).disabled).toBe(false)
  })

  it('BUG4: an in-flight redisDatabases count from the old source must not overwrite the new source', async () => {
    let releaseA!: (value: { databases: number }) => void
    mocks.status.mockResolvedValue({ config: { connections: [redisA, redisB], settings, drivers: [] }, drivers: [], env: {} })
    mocks.redisScan.mockResolvedValue({ keys: [], cursor: '0' })
    const dbsA = new Promise<{ databases: number }>((resolve) => { releaseA = resolve })
    mocks.redisDatabases.mockImplementation((id: string) => (id === 'redis-A' ? dbsA : Promise.resolve({ databases: 3 })))

    render(<ConsoleTab useTabInfo={tabRedis} />)
    await waitForConsoleSource(mocks)
    await waitFor(() => expect(mocks.redisScan).toHaveBeenCalled())
    await waitFor(() => expect(mocks.redisDatabases).toHaveBeenCalledWith('redis-A'))

    // Switch to B (its count is 3), then release A's slow count (16).
    await switchSource(/RedisB/)
    await waitFor(() => expect(mocks.redisDatabases).toHaveBeenCalledWith('redis-B'))
    await act(async () => { await Promise.resolve() })
    await act(async () => { releaseA({ databases: 16 }); await Promise.resolve() })

    const select = screen.getByLabelText('Redis 逻辑库') as HTMLSelectElement
    const count = select.querySelectorAll('option').length
    expect(count).toBe(3)
  })
})

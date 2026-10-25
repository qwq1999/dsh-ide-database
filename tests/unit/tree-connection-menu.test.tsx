// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection } from '../../src/shared/types'

const copy = vi.hoisted(() => vi.fn(async () => true))
vi.mock('../../src/client/colmenu', () => ({ copyText: copy }))

const connection = {
  id: 'c1',
  name: '演示 MySQL',
  driver: 'mysql',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 33061,
  user: 'root',
  hasPassword: true,
  database: 'shop',
  redisDb: 0,
  params: {},
  readOnly: false,
  createdAt: '2026-10-23T00:00:00.000Z',
} as ClientConnection

function props(overrides: Partial<DataViewProps> = {}): DataViewProps {
  const noop = (): void => undefined
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: {},
    connectingId: '',
    schemas: { c1: [] },
    objects: {},
    expanded: { c1: true },
    loadingSchemas: {},
    loadingObjects: {},
    cachedAt: {},
    descriptions: {},
    loadingDescriptions: {},
    detail: null,
    detailLoading: false,
    selectedKey: '',
    redisKeys: {},
    redisCursor: {},
    loadingRedisKeys: {},
    redisDatabases: {},
    redisDbs: {},
    visibleSchemas: {},
    redisDetail: null,
    redisDetailDb: -1,
    redisDetailLoading: false,
    onAddConnection: noop,
    onSelectConnection: noop,
    onToggleConnection: noop,
    onConnect: noop,
    onToggleSchema: noop,
    onLoadObjects: noop,
    onToggleFolder: noop,
    onToggleKey: noop,
    onSelectObject: noop,
    onSelectSchema: noop,
    onSelectFolder: noop,
    onSelectRedisDb: noop,
    onSelectRedisKey: noop,
    onToggleRedisDb: noop,
    onLoadRedisKeys: noop,
    onToggleSchemaVisible: noop,
    onToggleAllSchemasVisible: noop,
    onToggleRedisDbVisible: noop,
    onToggleAllRedisDbsVisible: noop,
    onShowDdl: noop,
    onOpenTable: noop,
    ...overrides,
  }
}

function connectionRow(): HTMLElement {
  const row = screen.getAllByRole('treeitem').find((item) => item.textContent?.startsWith('演示 MySQL'))
  if (row === undefined) throw new Error('missing connection row')
  return row
}

describe('connection context menu', () => {
  afterEach(() => {
    cleanup()
  })

  it('copies the name and the address', async () => {
    render(<DataView {...props()} />)
    fireEvent.contextMenu(connectionRow())
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制连接名' }))
    await waitFor(() => expect(copy).toHaveBeenCalledWith('演示 MySQL'))

    fireEvent.contextMenu(connectionRow())
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制地址' }))
    await waitFor(() => expect(copy).toHaveBeenCalledWith('127.0.0.1:33061'))
  })

  it('reconnects from the menu', async () => {
    const onConnect = vi.fn()
    render(<DataView {...props({ onConnect })} />)
    fireEvent.contextMenu(connectionRow())
    fireEvent.click(await screen.findByRole('menuitem', { name: '重新连接' }))
    expect(onConnect).toHaveBeenCalledWith('c1')
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection, SchemaObject } from '../../src/shared/types'

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

const orders = { name: 'orders', kind: 'table' } as SchemaObject
const users = { name: 'users', kind: 'table' } as SchemaObject

function props(overrides: Partial<DataViewProps> = {}): DataViewProps {
  const noop = (): void => undefined
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: {},
    connectingId: '',
    schemas: { c1: [{ name: 'shop', objectCount: 2 }] },
    objects: { 'c1:shop': [orders, users] },
    expanded: { c1: true, 'c1:shop': true, 'c1:shop#table': true },
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

function schemaRow(): HTMLElement {
  const row = screen.getAllByRole('treeitem').find((item) => item.textContent?.startsWith('shop'))
  if (row === undefined) throw new Error('missing schema row')
  return row
}

describe('schema context menu', () => {
  afterEach(() => {
    cleanup()
  })

  it('copies the schema name', async () => {
    render(<DataView {...props()} />)
    fireEvent.contextMenu(schemaRow())
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制库名' }))
    await waitFor(() => expect(copy).toHaveBeenCalledWith('shop'))
  })

  it('filters the tree down to that schema', async () => {
    render(<DataView {...props()} />)
    fireEvent.contextMenu(schemaRow())
    fireEvent.click(await screen.findByRole('menuitem', { name: '只看这个库' }))
    const filter = screen.getAllByPlaceholderText(/筛选/)[0] as HTMLInputElement
    await waitFor(() => expect(filter.value).toBe('shop.'))
  })
})

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
    detail: {
      schema: 'shop',
      table: 'orders',
      kind: 'table',
      columns: [
        { name: 'id', typeName: 'int', nullable: false, primaryKey: true },
        { name: 'total', typeName: 'decimal(10,2)', nullable: true },
      ],
      indexes: [],
    },
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

describe('detail panel', () => {
  it('copies the column names from the detail header', async () => {
    render(<DataView {...props()} />)

    fireEvent.click(screen.getByRole('button', { name: '复制列名' }))

    await waitFor(() => expect(copy).toHaveBeenCalledWith('id, total'))
  })

  it('copies a SELECT that lists every column', async () => {
    render(<DataView {...props()} />)

    const [button] = screen.getAllByTitle('复制一条把列名写全的 SELECT')
    if (button === undefined) throw new Error('copy-query button missing')
    fireEvent.click(button)

    await waitFor(() =>
      expect(copy).toHaveBeenLastCalledWith('SELECT `id`, `total` FROM `shop`.`orders`'),
    )
  })
})

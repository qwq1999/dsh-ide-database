// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

function props(overrides: Partial<DataViewProps> = {}): DataViewProps {
  const noop = (): void => undefined
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: {},
    connectingId: '',
    schemas: { c1: [{ name: 'shop', objectCount: 1 }] },
    objects: { 'c1:shop': [orders] },
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
    onOpenConsole: noop,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  copy.mockClear()
})

function openMenu(): void {
  fireEvent.contextMenu(screen.getByText('orders'), { clientX: 10, clientY: 10 })
}

describe('tree row context menu', () => {
  it('offers the actions of one object', () => {
    render(<DataView {...props()} />)
    openMenu()
    expect(screen.getByRole('menu', { name: '对象操作' })).toBeTruthy()
    for (const label of ['打开数据', '查看 DDL', '复制名称', '复制限定名']) {
      expect(screen.getByRole('menuitem', { name: label })).toBeTruthy()
    }
  })

  it('copies a paged SELECT for the table', () => {
    render(<DataView {...props()} />)
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '复制查询语句' }))
    expect(copy).toHaveBeenCalledWith('SELECT * FROM `shop`.`orders` LIMIT 500 OFFSET 0')
  })

  it('copies the qualified name and closes', () => {
    render(<DataView {...props()} />)
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '复制限定名' }))
    expect(copy).toHaveBeenCalledWith('shop.orders')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('hands the object to the host callbacks', () => {
    const calls: string[] = []
    render(
      <DataView
        {...props({
          onShowDdl: (connectionId, schema, table, kind) => calls.push(`ddl:${connectionId}:${schema}:${table}:${kind}`),
          onOpenTable: (connectionId, schema, object) => calls.push(`open:${connectionId}:${schema}:${object.name}`),
        })}
      />,
    )
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '打开数据' }))
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '查看 DDL' }))
    expect(calls).toEqual(['open:c1:shop:orders', 'ddl:c1:shop:orders:table'])
  })

  it('opens the console for a table', () => {
    const calls: string[] = []
    render(
      <DataView
        {...props({
          onOpenConsole: (connectionId, schema, table) => calls.push(`console:${connectionId}:${schema}:${table}`),
        })}
      />,
    )
    openMenu()
    fireEvent.click(screen.getByRole('menuitem', { name: '在控制台查询' }))
    expect(calls).toEqual(['console:c1:shop:orders'])
  })

  it('closes on Escape', () => {
    render(<DataView {...props()} />)
    openMenu()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('leaves out 打开数据 for objects that hold no rows', () => {
    render(
      <DataView
        {...props({
          objects: { 'c1:shop': [{ name: 'nextval', kind: 'sequence' } as SchemaObject] },
          expanded: { c1: true, 'c1:shop': true, 'c1:shop#sequence': true },
        })}
      />,
    )
    fireEvent.contextMenu(screen.getByText('nextval'), { clientX: 10, clientY: 10 })
    expect(screen.queryByRole('menuitem', { name: '打开数据' })).toBeNull()
    expect(screen.getByRole('menuitem', { name: '查看 DDL' })).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import { buildTreeRows, type TreeRowsState } from '../../src/client/views/tree-rows'
import { TREE_ROW_HEIGHT } from '../../src/client/useWindow'
import type { ClientConnection, SchemaObject, TableDescription } from '../../src/shared/types'

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

const server = { product: 'MySQL', version: '8.0.36' }

const tables: SchemaObject[] = Array.from({ length: 500 }, (_, index) => ({
  name: `t${String(index + 1).padStart(3, '0')}`,
  kind: 'table',
}) as SchemaObject)

function treeState(overrides: Partial<TreeRowsState> = {}): TreeRowsState {
  return {
    connections: [connection],
    servers: { c1: server },
    connectingId: '',
    schemas: { c1: [{ name: 'shop', objectCount: tables.length }] },
    objects: { 'c1:shop': tables },
    expanded: { c1: true, 'c1:shop': true, 'c1:shop#table': true },
    loadingSchemas: {},
    loadingObjects: {},
    cachedAt: {},
    descriptions: {},
    loadingDescriptions: {},
    redisKeys: {},
    redisCursor: {},
    loadingRedisKeys: {},
    redisDatabases: {},
    redisDbs: {},
    visibleSchemas: {},
    filter: '',
    objectExtra: {},
    ...overrides,
  }
}

function viewProps(overrides: Partial<DataViewProps> = {}): DataViewProps {
  const noop = (): void => undefined
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: { c1: server },
    connectingId: '',
    schemas: { c1: [{ name: 'shop', objectCount: tables.length }] },
    objects: { 'c1:shop': tables },
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

function tree(): HTMLElement {
  return screen.getByRole('tree', { name: '数据源' })
}

afterEach(() => cleanup())

describe('virtualized object tree', () => {
  it('只挂载窗口内的行，而不是 500 张表', () => {
    render(<DataView {...viewProps()} />)
    const mounted = screen.getAllByRole('treeitem').length
    expect(mounted).toBeGreaterThan(10)
    // 500 tables, one 200-object page, three ancestor rows and the "more" row:
    // the flat list is 204 rows, and only the viewport + overscan may be mounted.
    expect(mounted).toBeLessThan(120)
    expect(mounted * 5).toBeLessThan(500)
    expect(screen.getByText('t001')).toBeTruthy()
  })

  it('滚动后换窗口，容器高度按完整行数撑开', () => {
    render(<DataView {...viewProps()} />)
    const expected = buildTreeRows(treeState()).length
    const body = document.querySelector<HTMLElement>('.dshdb-tree-body')
    expect(body?.style.height).toBe(`${expected * TREE_ROW_HEIGHT}px`)

    const element = tree()
    element.scrollTop = 100000
    fireEvent.scroll(element)
    expect(screen.getByText('t200')).toBeTruthy()
    expect(screen.queryByText('t001')).toBeNull()
    expect(screen.getAllByRole('treeitem').length).toBeLessThan(120)
  })

  it('键盘移动到窗口外的行会自动滚动', () => {
    render(<DataView {...viewProps()} />)
    const element = tree()
    element.focus()
    fireEvent.keyDown(element, { key: 'End' })
    const expected = buildTreeRows(treeState()).length
    expect(element.scrollTop).toBeGreaterThan(0)
    expect(element.getAttribute('aria-activedescendant')).toBe(`dshdb-tree-row-${expected - 1}`)
    expect(screen.getByText('再显示 200 个（还有 300 个）')).toBeTruthy()
  })

  it('扁平行数组保持过滤、展开与分页语义', () => {
    const orders = { name: 'orders', kind: 'table' } as SchemaObject
    const customers = { name: 'customers', kind: 'table' } as SchemaObject
    const view = { name: 'v_products', kind: 'view' } as SchemaObject
    const description = {
      schema: 'shop',
      table: 'orders',
      kind: 'table',
      columns: [
        { name: 'id', typeName: 'int', primaryKey: true },
        { name: 'total', typeName: 'decimal' },
      ],
      indexes: [],
    } as unknown as TableDescription

    // 只保留命中对象及其祖先：视图不命中，所以“视图”分组也消失。
    const filtered = buildTreeRows(
      treeState({
        objects: { 'c1:shop': [orders, customers, view] },
        filter: 'shop.orders',
      }),
    )
    expect(filtered.map((row) => row.label ?? row.kind)).toEqual(['演示 MySQL', 'shop', '表', 'orders'])
    expect(filtered.map((row) => row.kind)).toEqual(['connection', 'schema', 'folder', 'object'])

    // 展开对象后：列分组 + 两列，列行不参与键盘导航。
    const expandedRows = buildTreeRows(
      treeState({
        objects: { 'c1:shop': [orders] },
        descriptions: { 'c1|shop.orders': description },
        expanded: {
          c1: true,
          'c1:shop': true,
          'c1:shop#table': true,
          'c1|shop.orders': true,
          'c1|shop.orders#columns': true,
        },
      }),
    )
    expect(expandedRows.map((row) => row.kind)).toEqual([
      'connection',
      'schema',
      'folder',
      'object',
      'detail-folder',
      'column',
      'column',
    ])
    expect(expandedRows[4]?.label).toBe('列')
    expect(expandedRows.slice(5).every((row) => row.navigable === false)).toBe(true)

    // 分页仍然是 200 条一页，“显示更多”本身也是一行。
    const paged = buildTreeRows(treeState())
    expect(paged).toHaveLength(3 + 200 + 1)
    expect(paged[paged.length - 1]?.kind).toBe('more')
    expect(paged[paged.length - 1]?.label).toBe('再显示 200 个（还有 300 个）')
  })
})

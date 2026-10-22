import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

import { DataView } from '../../src/client/views/DataView.tsx'

const noop = () => {}

function connection(overrides = {}) {
  return {
    id: 'c1',
    name: '演示 MySQL',
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 33061,
    user: 'root',
    hasPassword: true,
    database: '',
    redisDb: 0,
    params: {},
    readOnly: false,
    createdAt: '2026-10-22T00:00:00.000Z',
    ...overrides,
  }
}

function render(props = {}) {
  return renderToStaticMarkup(
    createElement(DataView, {
      connections: [],
      selectedId: '',
      servers: {},
      connectingId: '',
      schemas: {},
      objects: {},
      expanded: {},
      loadingSchemas: {},
      loadingObjects: {},
      cachedAt: {},
      descriptions: {},
      loadingDescriptions: {},
      detail: null,
      detailLoading: false,
      selectedKey: '',
      onAddConnection: noop,
      onSelectConnection: noop,
      onToggleConnection: noop,
      onConnect: noop,
      onToggleSchema: noop,
      onToggleFolder: noop,
      onToggleKey: noop,
      onSelectObject: noop,
      onShowDdl: noop,
      onOpenTable: noop,
      ...props,
    }),
  )
}

function strip(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

describe('DataView 渲染', () => {
  it('没有数据源时显示空状态', () => {
    const text = strip(render())
    expect(text).toContain('还没有数据源')
  })

  it('离线缓存的数据源显示数据源名、缓存提示与 schema', () => {
    const text = strip(
      render({
        connections: [connection()],
        expired: false,
        cachedAt: { c1: new Date().toISOString() },
        schemas: { c1: [{ name: 'shop' }, { name: 'crm' }] },
        expanded: { c1: true },
      }),
    )
    expect(text).toContain('演示 MySQL')
    expect(text).toContain('离线缓存')
    expect(text).toContain('shop')
    expect(text).toContain('crm')
  })

  it('展开的 schema 按表 / 视图 / 例程分组并给出数量', () => {
    const objects = [
      { name: 'customers', kind: 'table' },
      { name: 'orders', kind: 'table' },
      { name: 'v_order_totals', kind: 'view' },
      { name: 'sp_top_products', kind: 'procedure' },
      { name: 'fn_customer_total', kind: 'function' },
      { name: 'seq_invoice', kind: 'sequence' },
    ]
    const text = strip(
      render({
        connections: [connection()],
        cachedAt: { c1: new Date().toISOString() },
        schemas: { c1: [{ name: 'shop' }] },
        objects: { 'c1:shop': objects },
        expanded: { c1: true, 'c1:shop': true },
      }),
    )
    expect(text).toContain('表 2')
    expect(text).toContain('视图 1')
    expect(text).toContain('例程 2')
    expect(text).toContain('序列 1')
    expect(text).not.toContain('触发器 1')
  })

  it('已连接的数据源不再显示离线缓存提示', () => {
    const text = strip(
      render({
        connections: [connection()],
        servers: { c1: { connected: false, dialect: 'mysql', version: '' } },
        cachedAt: { c1: new Date().toISOString() },
        schemas: { c1: [{ name: 'shop' }] },
        expanded: { c1: true },
      }),
    )
    expect(text).not.toContain('离线缓存')
  })
})

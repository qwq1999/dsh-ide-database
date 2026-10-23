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

function redisConnection(overrides = {}) {
  return connection({
    id: 'r1',
    name: '演示 Redis',
    driver: 'redis',
    dialect: 'redis',
    port: 6380,
    hasPassword: false,
    redisDb: 0,
    ...overrides,
  })
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

  it('未连接的 Redis 数据源在行尾给出连接按钮', () => {
    const text = strip(render({ connections: [redisConnection()], expanded: { r1: true } }))
    expect(text).toContain('演示 Redis')
    expect(text).toContain('连接')
    expect(text).toContain('连接到 127.0.0.1:6380')
    expect(text).not.toContain('没有 schema')
  })

  it('已连接的 Redis 以可展开的 db0 + 键行展示键空间', () => {
    const text = strip(
      render({
        connections: [redisConnection()],
        servers: { r1: { connected: true, dialect: 'redis', version: '7.2.0' } },
        expanded: { r1: true },
        redisDatabases: { r1: 16 },
        redisDbs: { r1: [0] },
        redisKeys: {
          r1: {
            '0': [
              { key: 'shop:customer:42', type: 'hash', ttl: -1, size: 2 },
              { key: 'shop:orders:queue', type: 'list', ttl: 3600, size: 3 },
            ],
          },
        },
        redisCursor: { r1: { '0': '0' } },
      }),
    )
    expect(text).toContain('db0')
    expect(text).toContain('2 个键')
    expect(text).toContain('shop:customer:42')
    expect(text).toContain('hash')
    expect(text).toContain('shop:orders:queue')
    expect(text).not.toContain('没有 schema')
  })

  it('多个逻辑库各自展示键与游标', () => {
    const text = strip(
      render({
        connections: [redisConnection()],
        servers: { r1: { connected: true, dialect: 'redis', version: '7.2.0' } },
        expanded: { r1: true },
        redisDatabases: { r1: 16 },
        redisDbs: { r1: [0, 6] },
        redisKeys: {
          r1: {
            '0': [{ key: 'demo:zero', type: 'string', ttl: -1 }],
            '6': [{ key: 'demo:six', type: 'hash', ttl: -1 }],
          },
        },
        redisCursor: { r1: { '0': '0', '6': '21' } },
      }),
    )
    expect(text).toContain('db0')
    expect(text).toContain('db6')
    expect(text).toContain('demo:zero')
    expect(text).toContain('demo:six')
    expect(text).toContain('加载更多键')
  })

  it('收起的 db 节点只显示库行，不展开键', () => {
    const text = strip(
      render({
        connections: [redisConnection()],
        servers: { r1: { connected: true, dialect: 'redis', version: '7.2.0' } },
        expanded: { r1: true, 'r1:redis:db0': false },
        redisDatabases: { r1: 16 },
        redisDbs: { r1: [0] },
        redisKeys: { r1: { '0': [{ key: 'hidden:key', type: 'string', ttl: -1 }] } },
        redisCursor: { r1: { '0': '0' } },
      }),
    )
    expect(text).toContain('db0')
    expect(text).not.toContain('hidden:key')
  })

  it('扫描到更多键时显示「加载更多键」', () => {
    const text = strip(
      render({
        connections: [redisConnection()],
        servers: { r1: { connected: true, dialect: 'redis', version: '7.2.0' } },
        expanded: { r1: true },
        redisDbs: { r1: [0] },
        redisKeys: { r1: { '0': [{ key: 'a', type: 'string', ttl: -1 }] } },
        redisCursor: { r1: { '0': '17' } },
      }),
    )
    expect(text).toContain('加载更多键')
  })

  it('空的键空间提示「没有键」', () => {
    const text = strip(
      render({
        connections: [redisConnection()],
        servers: { r1: { connected: true, dialect: 'redis', version: '7.2.0' } },
        expanded: { r1: true },
        redisDbs: { r1: [0] },
        redisKeys: { r1: { '0': [] } },
        redisCursor: { r1: { '0': '0' } },
      }),
    )
    expect(text).toContain('没有键')
  })

  it('已缓存的 Redis 键空间在离线时仍可浏览', () => {
    const text = strip(
      render({
        connections: [redisConnection()],
        cachedAt: { r1: new Date().toISOString() },
        expanded: { r1: true },
        redisDatabases: { r1: 16 },
        redisDbs: { r1: [0] },
        redisKeys: { r1: { '0': [{ key: 'cached:key', type: 'string', ttl: -1 }] } },
        redisCursor: { r1: { '0': '0' } },
      }),
    )
    expect(text).toContain('缓存')
    expect(text).toContain('cached:key')
    expect(text).not.toContain('连接到 127.0.0.1:6380')
  })

  it('选中的 Redis 键在下方展开值和类型', () => {
    const text = strip(
      render({
        connections: [redisConnection()],
        servers: { r1: { connected: true, dialect: 'redis', version: '7.2.0' } },
        expanded: { r1: true },
        redisDbs: { r1: [0] },
        redisKeys: { r1: { '0': [{ key: 'shop:customer:42', type: 'hash', ttl: -1, size: 2 }] } },
        redisCursor: { r1: { '0': '0' } },
        selectedKey: 'r1|redis:0:shop:customer:42',
        redisDetailDb: 0,
        redisDetail: {
          key: 'shop:customer:42',
          type: 'hash',
          ttl: -1,
          size: 2,
          value: { name: '张伟', city: '北京' },
          truncated: false,
          preview: '',
        },
      }),
    )
    expect(text).toContain('shop:customer:42')
    expect(text).toContain('永久')
    expect(text).toContain('张伟')
    expect(text).toContain('北京')
  })
})

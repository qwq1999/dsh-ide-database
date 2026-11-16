// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection, SchemaObject } from '../../src/shared/types'

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

const objects: SchemaObject[] = [
  { name: 'customers', kind: 'table', comment: '客户' },
  { name: 'orders', kind: 'table' },
]

const noop = (): void => undefined

/** The tree with every branch open, so the object rows are on screen. */
function setup(showTableComments?: boolean): void {
  const props: DataViewProps = {
    connections: [connection],
    selectedId: 'c1',
    servers: { c1: { product: 'MySQL', version: '8.0.36' } },
    connectingId: '',
    schemas: { c1: [{ name: 'crm', objectCount: objects.length } as never] },
    objects: { 'c1:crm': objects },
    expanded: { c1: true, 'c1:crm': true, 'c1:crm#table': true },
    loadingSchemas: {},
    loadingObjects: {},
    showTableComments,
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
  }
  render(<DataView {...props} />)
}

function tree(): ReturnType<typeof within> {
  return within(document.querySelector('.dshdb-tree') as HTMLElement)
}

function commentOf(name: string): Element | null {
  return tree().getByText(name).closest('button')!.querySelector('.dshdb-row-comment')
}

afterEach(cleanup)

describe('数据源树的表注释', () => {
  it('默认不显示，即使对象带注释', () => {
    setup()
    expect(commentOf('customers')).toBeNull()
    expect(screen.queryByText(/客户/)).toBeNull()
  })

  it('开启后注释跟在表名后面，并沿用弱化样式类', () => {
    setup(true)
    const comment = commentOf('customers')
    expect(comment?.textContent).toBe('客户')
    // The comment sits inside the label so the label's ellipsis trims it last.
    expect(comment?.parentElement?.className).toContain('dshdb-row-label')
  })

  it('没有注释的对象不留空白', () => {
    setup(true)
    expect(commentOf('orders')).toBeNull()
  })
})

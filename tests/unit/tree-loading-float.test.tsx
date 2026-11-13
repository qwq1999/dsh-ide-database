// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
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

const customers = { name: 'customers', kind: 'table', comment: '客户' } as SchemaObject

function props(overrides: Partial<DataViewProps> = {}): DataViewProps {
  const noop = (): void => {}
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: { c1: { product: 'MySQL', version: '8.0.36' } },
    connectingId: '',
    schemas: { c1: [{ name: 'crm', objectCount: 1 } as never] },
    objects: { 'c1:crm': [customers] },
    expanded: { c1: true, 'c1:crm': true, 'c1:crm#table': true },
    loadingSchemas: {},
    loadingObjects: {},
    cachedAt: {},
    descriptions: {} as Record<string, TableDescription>,
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

afterEach(cleanup)

describe('tree detail spinner', () => {
  it('floats above the tree instead of taking a row of its own', () => {
    const view = render(<DataView {...props({ detailLoading: true })} />)

    const floats = document.querySelector('.dshdb-tree-floats') as HTMLElement
    expect(floats).not.toBeNull()
    const chip = screen.getByRole('status')
    expect(chip.textContent).toContain('读取结构')
    expect(floats.contains(chip)).toBe(true)
    // A toolbar row here was what used to shove the tree down while loading.
    expect(document.querySelector('.dshdb-toolbar')).toBeNull()

    view.unmount()
  })

  it('keeps the tree mounted when the spinner comes and goes', () => {
    const view = render(<DataView {...props()} />)
    const before = document.querySelector('.dshdb-tree')

    view.rerender(<DataView {...props({ detailLoading: true })} />)
    view.rerender(<DataView {...props()} />)

    expect(document.querySelector('.dshdb-tree')).toBe(before)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('names the redis key read when the spinner is about keys', () => {
    render(<DataView {...props({ redisDetailLoading: true })} />)
    expect(screen.getByRole('status').textContent).toContain('读取键值')
  })
})

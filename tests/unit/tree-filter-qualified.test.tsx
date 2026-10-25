// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection, SchemaObject } from '../../src/shared/types'

vi.mock('../../src/client/colmenu', () => ({ copyText: vi.fn(async () => true) }))

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
const customers = { name: 'customers', kind: 'table' } as SchemaObject
const companies = { name: 'companies', kind: 'table' } as SchemaObject

function props(overrides: Partial<DataViewProps> = {}): DataViewProps {
  const noop = (): void => undefined
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: {},
    connectingId: '',
    schemas: { c1: [{ name: 'shop', objectCount: 2 }, { name: 'crm', objectCount: 1 }] },
    objects: { 'c1:shop': [orders, customers], 'c1:crm': [companies] },
    expanded: { c1: true, 'c1:shop': true, 'c1:crm': true, 'c1:shop#table': true, 'c1:crm#table': true },
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

// Highlight splits names into several text nodes, so compare the whole text content.
function shown(text: string): boolean {
  return screen.queryAllByText((_, element) => element?.textContent === text).length > 0
}

function typeFilter(value: string): void {
  fireEvent.change(screen.getByLabelText('筛选库表'), { target: { value } })
}

afterEach(() => {
  cleanup()
})

describe('qualified tree filter', () => {
  it('narrows objects by schema when the filter contains a dot', async () => {
    render(<DataView {...props()} />)
    typeFilter('shop.ord')

    await waitFor(() => expect(shown('customers')).toBe(false))
    expect(shown('orders')).toBe(true)
    expect(shown('companies')).toBe(false)
    expect(shown('shop')).toBe(true)
    expect(shown('crm')).toBe(false)
  })

  it('shows every object of the schema when only the schema half is typed', async () => {
    render(<DataView {...props()} />)
    typeFilter('crm.')

    await waitFor(() => expect(shown('orders')).toBe(false))
    expect(shown('companies')).toBe(true)
    expect(shown('crm')).toBe(true)
  })

  it('keeps unqualified filters matching object names only', async () => {
    render(<DataView {...props()} />)
    typeFilter('cust')

    await waitFor(() => expect(shown('orders')).toBe(false))
    expect(shown('customers')).toBe(true)
  })
})

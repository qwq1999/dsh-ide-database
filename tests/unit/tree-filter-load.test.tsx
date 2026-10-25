// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

const customers = { name: 'customers', kind: 'table', comment: '客户' } as SchemaObject

function nothing(): void {}

/**
 * While the tree filter searches inside collapsed schemas it fetches object
 * names once. A list that is already loaded (or already loading) must not be
 * queried again: every extra call is another metadata round trip to the server.
 */
function Harness({
  objects,
  loadingObjects,
  calls,
}: {
  objects: DataViewProps['objects']
  loadingObjects: Record<string, boolean>
  calls: { load: number }
}): JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    c1: true,
    'c1:crm': true,
    'c1:crm#table': true,
  })
  const toggle = (key: string): void => setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  const props: DataViewProps = {
    connections: [connection],
    selectedId: 'c1',
    servers: { c1: { product: 'MySQL', version: '8.0.36' } },
    connectingId: '',
    schemas: { c1: [{ name: 'crm', objectCount: 1 }] },
    objects,
    expanded,
    loadingSchemas: {},
    loadingObjects,
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
    onAddConnection: nothing,
    onSelectConnection: nothing,
    onToggleConnection: (id) => toggle(id),
    onConnect: nothing,
    onToggleSchema: (connectionId, schema) => toggle(`${connectionId}:${schema}`),
    onLoadObjects: () => {
      calls.load += 1
    },
    onToggleFolder: (connectionId, schema, folder) => toggle(`${connectionId}:${schema}#${folder}`),
    onToggleKey: (key) => toggle(key),
    onSelectObject: nothing,
    onSelectSchema: nothing,
    onSelectFolder: nothing,
    onSelectRedisDb: nothing,
    onSelectRedisKey: nothing,
    onToggleRedisDb: nothing,
    onLoadRedisKeys: nothing,
    onToggleSchemaVisible: nothing,
    onToggleAllSchemasVisible: nothing,
    onToggleRedisDbVisible: nothing,
    onToggleAllRedisDbsVisible: nothing,
    onShowDdl: nothing,
    onOpenTable: nothing,
  }
  return <DataView {...props} />
}

function typeFilter(value: string): void {
  fireEvent.change(screen.getByLabelText('筛选库表'), { target: { value } })
}

afterEach(() => {
  cleanup()
})

describe('筛选时加载对象列表', () => {
  it('does not reload a schema whose objects are already in memory', () => {
    const calls = { load: 0 }
    render(<Harness objects={{ 'c1:crm': [customers] }} loadingObjects={{}} calls={calls} />)
    typeFilter('cus')
    typeFilter('cust')
    expect(calls.load).toBe(0)
  })

  it('loads an untouched schema once per filter term', () => {
    const calls = { load: 0 }
    render(<Harness objects={{}} loadingObjects={{}} calls={calls} />)
    typeFilter('cus')
    expect(calls.load).toBe(1)
  })

  it('does not ask again while the same list is still loading', () => {
    const calls = { load: 0 }
    render(<Harness objects={{}} loadingObjects={{ 'c1:crm': true }} calls={calls} />)
    typeFilter('cus')
    expect(calls.load).toBe(0)
  })
})

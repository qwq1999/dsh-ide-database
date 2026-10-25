// @vitest-environment jsdom
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

const objects: SchemaObject[] = Array.from({ length: 201 }, (_, index) => ({
  name: `t${String(index + 1).padStart(3, '0')}`,
  kind: 'table',
}) as SchemaObject)

function props(overrides: Partial<DataViewProps> = {}): DataViewProps {
  const noop = (): void => undefined
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: {},
    connectingId: '',
    schemas: { c1: [{ name: 'crm', objectCount: objects.length }] },
    objects: { 'c1:crm': objects },
    expanded: { c1: true, 'c1:crm': true, 'c1:crm#table': true },
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

afterEach(() => cleanup())

describe('tree object folding', () => {
  it('shows one page of objects and unfolds the rest on demand', () => {
    render(<DataView {...props()} />)
    expect(screen.getByText('t200')).toBeTruthy()
    expect(screen.queryByText('t201')).toBeNull()
    const more = screen.getByText('显示剩余 1 个')
    fireEvent.click(more)
    expect(screen.getByText('t201')).toBeTruthy()
    expect(screen.queryByText(/显示剩余/)).toBeNull()
  })

  it('shows every object when the list already fits', () => {
    render(<DataView {...props({ objects: { 'c1:crm': objects.slice(0, 5) } })} />)
    expect(screen.queryByText(/再显示/)).toBeNull()
    expect(screen.getByText('t005')).toBeTruthy()
  })
})

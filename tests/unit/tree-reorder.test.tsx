// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ClientConnection } from '../../src/shared/types'
import { DataView, type DataViewProps } from '../../src/client/views/DataView'

function connection(id: string, name: string): ClientConnection {
  return {
    id,
    name,
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    hasPassword: false,
    database: 'shop',
    redisDb: 0,
    params: {},
    readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function props(onReorderConnections: DataViewProps['onReorderConnections']): DataViewProps {
  return {
    connections: [connection('a', '库 A'), connection('b', '库 B'), connection('c', '库 C')],
    selectedId: 'a',
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
    redisDetailDb: 0,
    redisDetailLoading: false,
    onAddConnection: () => undefined,
    onSelectConnection: () => undefined,
    onToggleConnection: () => undefined,
    onConnect: () => undefined,
    onToggleSchema: () => undefined,
    onLoadObjects: () => undefined,
    onToggleFolder: () => undefined,
    onToggleKey: () => undefined,
    onSelectObject: () => undefined,
    onSelectSchema: () => undefined,
    onSelectFolder: () => undefined,
    onSelectRedisDb: () => undefined,
    onSelectRedisKey: () => undefined,
    onToggleRedisDb: () => undefined,
    onLoadRedisKeys: () => undefined,
    onToggleSchemaVisible: () => undefined,
    onToggleAllSchemasVisible: () => undefined,
    onToggleRedisDbVisible: () => undefined,
    onToggleAllRedisDbsVisible: () => undefined,
    onShowDdl: () => undefined,
    onOpenTable: () => undefined,
    onOpenConsole: () => undefined,
    onReorderConnections,
  }
}

function rows(): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button[data-kind="datasource"]'))
}

function transfer() {
  return { effectAllowed: '', dropEffect: '', setData: vi.fn() }
}

function dragStart(row: HTMLElement): void {
  const event = createEvent.dragStart(row)
  Object.defineProperty(event, 'dataTransfer', { value: transfer() })
  fireEvent(row, event)
}

function dragOver(row: HTMLElement, clientY: number): void {
  const event = createEvent.dragOver(row)
  Object.defineProperties(event, {
    clientY: { value: clientY },
    dataTransfer: { value: transfer() },
  })
  fireEvent(row, event)
}

afterEach(() => cleanup())

describe('data source drag reorder', () => {
  it('drops a row below the row it hovers and reports the new order', () => {
    const onReorderConnections = vi.fn()
    render(<DataView {...props(onReorderConnections)} />)
    const list = rows()
    expect(list).toHaveLength(3)
    expect(list[0]?.getAttribute('draggable')).toBe('true')

    dragStart(list[0]!)
    // jsdom reports a zero-height row, so any positive clientY means the lower half.
    dragOver(list[2]!, 100)
    expect(list[2]?.className).toContain('dshdb-row-drop-after')
    fireEvent.drop(list[2]!)

    expect(onReorderConnections).toHaveBeenCalledWith(['b', 'c', 'a'])
  })

  it('drops above the target when the pointer is in its top half', () => {
    const onReorderConnections = vi.fn()
    render(<DataView {...props(onReorderConnections)} />)
    const list = rows()

    dragStart(list[2]!)
    dragOver(list[0]!, -1)
    expect(list[0]?.className).toContain('dshdb-row-drop-before')
    fireEvent.drop(list[0]!)

    expect(onReorderConnections).toHaveBeenCalledWith(['c', 'a', 'b'])
  })

  it('keeps rows undraggable when sorting is not wired up', () => {
    render(<DataView {...props(undefined)} />)

    expect(rows()[0]?.getAttribute('draggable')).toBe('false')
  })
})

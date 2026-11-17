// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection, SchemaInfo } from '../../src/shared/types'

const mysql = {
  id: 'c1',
  name: '演示 MySQL',
  driver: 'mysql',
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  hasPassword: false,
  database: '',
  params: {},
  readOnly: false,
  createdAt: '2026-10-23T00:00:00.000Z',
} as ClientConnection

type Calls = { loadObjects: Array<[string, string]> }

function baseProps(calls: Calls, schemas: Record<string, SchemaInfo[]>): DataViewProps {
  const nothing = (): void => {}
  return {
    connections: [mysql],
    selectedId: '',
    servers: { c1: { product: 'MySQL', version: '8.0' } },
    connectingId: '',
    schemas,
    objects: {},
    expanded: { c1: true },
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
    onAddConnection: nothing,
    onSelectConnection: nothing,
    onToggleConnection: nothing,
    onConnect: nothing,
    onToggleSchema: nothing,
    onLoadObjects: (connectionId, schema) => { calls.loadObjects.push([connectionId, schema]) },
    onToggleFolder: nothing,
    onToggleKey: nothing,
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
}

function FilterHarness({ calls, schemas }: { calls: Calls; schemas: Record<string, SchemaInfo[]> }): JSX.Element {
  const [request, setRequest] = useState(0)
  return (
    <div>
      <button type="button" onClick={() => setRequest((n) => n + 1)}>open-filter</button>
      <DataView {...baseProps(calls, schemas)} filterRequest={request} />
    </div>
  )
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('DataView tree filter focus restore', () => {
  it('returns focus to the tree when the filter is closed with Escape', () => {
    const calls: Calls = { loadObjects: [] }
    render(<FilterHarness calls={calls} schemas={{ c1: [{ name: 'crm' }] }} />)
    const openBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'open-filter')!
    const tree = document.querySelector('[role="tree"]') as HTMLElement

    // Open the filter; the input autofocuses.
    fireEvent.click(openBtn)
    const input = document.querySelector('[role="search"] input') as HTMLInputElement
    expect(document.activeElement).toBe(input)

    // Escape closes the floating filter and must return focus to the tree.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('[role="search"] input')).toBeNull()
    expect(document.activeElement).toBe(tree)
  })
})

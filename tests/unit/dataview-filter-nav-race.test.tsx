// @vitest-environment jsdom
import { useState } from 'react'
import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
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

describe('DataView filter / navigation races', () => {
  it('searches a schema that appears while the same filter is active', () => {
    const calls: Calls = { loadObjects: [] }
    const view = render(<FilterHarness calls={calls} schemas={{ c1: [{ name: 'crm' }] }} />)
    fireEvent.click(screenGetButton('open-filter'))
    const input = document.querySelector('[role="search"] input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'ord' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    act(() => { vi.advanceTimersByTime(400) })
    // First schema searched.
    expect(calls.loadObjects).toContainEqual(['c1', 'crm'])

    // A new schema appears while the filter text is unchanged.
    view.rerender(<FilterHarness calls={calls} schemas={{ c1: [{ name: 'crm' }, { name: 'sales' }] }} />)
    act(() => { vi.advanceTimersByTime(400) })
    // The new schema must be searched too (dedup key is per-schema, not per-connection).
    expect(calls.loadObjects).toContainEqual(['c1', 'sales'])
  })
})

function screenGetButton(label: string): HTMLElement {
  const el = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === label)
  if (!el) throw new Error(`button ${label} not found`)
  return el
}

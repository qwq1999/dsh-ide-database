// @vitest-environment jsdom
import { useState } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection } from '../../src/shared/types'

const redis = {
  id: 'r1',
  name: 'Redis 会话',
  driver: 'redis',
  dialect: 'redis',
  host: '127.0.0.1',
  port: 6379,
  user: '',
  hasPassword: false,
  database: '',
  params: {},
  readOnly: false,
  createdAt: '2026-10-23T00:00:00.000Z',
} as ClientConnection

type Calls = { toggleConnection: string[]; toggleRedisDb: Array<[string, number]> }

function baseProps(calls: Calls, expanded: Record<string, boolean>): DataViewProps {
  const nothing = (): void => {}
  return {
    connections: [redis],
    selectedId: '',
    servers: {},
    connectingId: '',
    schemas: {},
    objects: {},
    expanded,
    loadingSchemas: {},
    loadingObjects: {},
    cachedAt: {},
    descriptions: {},
    loadingDescriptions: {},
    detail: null,
    detailLoading: false,
    selectedKey: '',
    // Two DBs each hold a matching key.
    redisKeys: { r1: { 0: [{ key: 'session:a', type: 'string', ttl: -1 }], 1: [{ key: 'session:b', type: 'string', ttl: -1 }] } },
    redisCursor: {},
    loadingRedisKeys: {},
    redisDatabases: {},
    redisDbs: { r1: [0, 1] },
    visibleSchemas: {},
    redisDetail: null,
    redisDetailDb: -1,
    redisDetailLoading: false,
    onAddConnection: nothing,
    onSelectConnection: nothing,
    onToggleConnection: (id) => { calls.toggleConnection.push(id) },
    onConnect: nothing,
    onToggleSchema: nothing,
    onLoadObjects: nothing,
    onToggleFolder: nothing,
    onToggleKey: nothing,
    onSelectObject: nothing,
    onSelectSchema: nothing,
    onSelectFolder: nothing,
    onSelectRedisDb: nothing,
    onSelectRedisKey: nothing,
    onToggleRedisDb: (id, db) => { calls.toggleRedisDb.push([id, db]) },
    onLoadRedisKeys: nothing,
    onToggleSchemaVisible: nothing,
    onToggleAllSchemasVisible: nothing,
    onToggleRedisDbVisible: nothing,
    onToggleAllRedisDbsVisible: nothing,
    onShowDdl: nothing,
    onOpenTable: nothing,
  }
}

// Mirror the real useDataSources toggle: functional state flip.
function Wrapper({ calls, filterRequest }: { calls: Calls; filterRequest: number }): JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const props = baseProps(calls, expanded)
  return (
    <DataView
      {...props}
      filterRequest={filterRequest}
      onToggleConnection={(id) => {
        calls.toggleConnection.push(id)
        setExpanded((previous) => ({ ...previous, [id]: previous[id] !== true }))
      }}
      onToggleRedisDb={(id, db) => {
        calls.toggleRedisDb.push([id, db])
        setExpanded((previous) => ({ ...previous, [`${id}:redis:db${db}`]: previous[`${id}:redis:db${db}`] !== true }))
      }}
    />
  )
}

function Harness({ calls }: { calls: Calls }): JSX.Element {
  const [request, setRequest] = useState(0)
  return (
    <div>
      <button type="button" onClick={() => setRequest((n) => n + 1)}>open-filter</button>
      <Wrapper calls={calls} filterRequest={request} />
    </div>
  )
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('Redis filter auto-expand', () => {
  it('opens a collapsed Redis connection exactly once when several DBs match', () => {
    const calls: Calls = { toggleConnection: [], toggleRedisDb: [] }
    render(<Harness calls={calls} />)
    const open = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'open-filter')
    if (!open) throw new Error('open-filter button not found')
    fireEvent.click(open)
    const input = document.querySelector('[role="search"] input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'session' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    act(() => { vi.advanceTimersByTime(500) })

    // The connection toggle must be idempotent here: toggling once per matching
    // DB (twice) flips it back to closed and the hits stay hidden.
    expect(calls.toggleConnection).toEqual(['r1'])
  })
})

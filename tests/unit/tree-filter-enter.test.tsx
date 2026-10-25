// @vitest-environment jsdom
import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection } from '../../src/shared/types'

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

const noop = (): void => undefined

/**
 * The filter normally waits for a 200ms pause before matching. Enter and
 * Escape are explicit commands and must take effect right away.
 */
function Harness({ calls }: { calls: { load: number } }): JSX.Element {
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
    onToggleConnection: (id) => toggle(id),
    onConnect: noop,
    onToggleSchema: (connectionId, schema) => toggle(`${connectionId}:${schema}`),
    onLoadObjects: () => {
      calls.load += 1
    },
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
  return <DataView {...props} />
}

describe('tree filter keys', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('matches as soon as Enter is pressed', async () => {
    const calls = { load: 0 }
    render(<Harness calls={calls} />)
    const box = screen.getByLabelText('筛选库表')
    fireEvent.change(box, { target: { value: 'cus' } })
    expect(calls.load).toBe(0)

    fireEvent.keyDown(box, { key: 'Enter' })
    await act(async () => {})

    expect(calls.load).toBe(1)
  })

  it('clears the box and the matches with Escape', async () => {
    render(<Harness calls={{ load: 0 }} />)
    const box = screen.getByLabelText('筛选库表') as HTMLInputElement
    fireEvent.change(box, { target: { value: 'cus' } })
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(box.value).toBe('')
  })
})

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
    onRefresh: () => {
      calls.refreshed = (calls.refreshed ?? 0) + 1
    },
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

/** The box is collapsed behind a funnel button until Ctrl+F or a click. */
function openFilter(): HTMLInputElement {
  if (screen.queryByLabelText('筛选库表') === null) fireEvent.click(screen.getByLabelText('筛选'))
  return screen.getByLabelText('筛选库表') as HTMLInputElement
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
    const box = openFilter()
    fireEvent.change(box, { target: { value: 'cus' } })
    expect(calls.load).toBe(0)

    fireEvent.keyDown(box, { key: 'Enter' })
    await act(async () => {})

    expect(calls.load).toBe(1)
  })

  it('focuses the filter box from Ctrl+F inside the tree', async () => {
    render(<Harness calls={{ load: 0 }} />)
    const tree = screen.getByRole('tree', { name: '数据源' })
    expect(screen.queryByLabelText('筛选库表')).toBeNull()
    const row = screen.getAllByRole('treeitem')[0]
    row.focus()
    fireEvent.keyDown(tree, { key: 'f', ctrlKey: true })
    expect(document.activeElement).toBe(screen.getByLabelText('筛选库表'))
  })

  it('reveals the box from the funnel button and hides it again when emptied', async () => {
    render(<Harness calls={{ load: 0 }} />)
    expect(screen.queryByLabelText('筛选库表')).toBeNull()
    fireEvent.click(screen.getByLabelText('筛选'))
    const box = screen.getByLabelText('筛选库表')
    await act(async () => {})
    expect(document.activeElement).toBe(box)
    fireEvent.blur(box)
    await act(async () => {})
    expect(screen.queryByLabelText('筛选库表')).toBeNull()
  })

  it('re-reads the tree on Ctrl+R instead of reloading the app', () => {
    const calls = { load: 0 }
    render(<Harness calls={calls} />)
    const tree = screen.getByRole('tree', { name: '数据源' })

    fireEvent.keyDown(tree, { key: 'r', ctrlKey: true })

    expect(calls.refreshed).toBe(1)
  })

  it('clears the box from the small clear button', async () => {
    render(<Harness calls={{ load: 0 }} />)
    const box = openFilter()
    fireEvent.change(box, { target: { value: 'cus' } })
    fireEvent.click(screen.getByLabelText('清空筛选'))
    await act(async () => {})
    expect(box.value).toBe('')
    expect(screen.queryByLabelText('清空筛选')).toBeNull()
  })

  it('clears the box and the matches with Escape', async () => {
    render(<Harness calls={{ load: 0 }} />)
    const box = openFilter()
    fireEvent.change(box, { target: { value: 'cus' } })
    fireEvent.keyDown(box, { key: 'Escape' })
    // Escape clears and collapses the box in one step...
    expect(screen.queryByLabelText('筛选库表')).toBeNull()
    // ...so it reopens empty instead of remembering the old term.
    fireEvent.click(screen.getByLabelText('筛选'))
    expect((screen.getByLabelText('筛选库表') as HTMLInputElement).value).toBe('')
  })
})

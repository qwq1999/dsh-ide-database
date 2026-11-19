// @vitest-environment jsdom
import { useState } from 'react'
import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection } from '../../src/shared/types'

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

function Harness({ filterRequest = 0 }: { filterRequest?: number }): JSX.Element {
  // Expansion is owned here; DataView calls onToggleSchema to change it.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ c1: true })
  const toggleSchema = (id: string, schema: string): void => {
    const key = `${id}:${encodeURIComponent(schema)}`
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  }
  const nothing = (): void => {}
  const props: DataViewProps = {
    connections: [mysql],
    selectedId: '',
    servers: { c1: { product: 'MySQL', version: '8.0' } },
    connectingId: '',
    schemas: { c1: [{ name: 'weird#schema' }] },
    objects: { 'c1:weird#schema': [{ name: 'orders' }] },
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
    filterRequest,
    onAddConnection: nothing,
    onSelectConnection: nothing,
    onToggleConnection: (id) => setExpanded((p) => ({ ...p, [id]: p[id] !== true })),
    onConnect: nothing,
    onToggleSchema: toggleSchema,
    onLoadObjects: nothing,
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
  return <DataView {...props} />
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('树筛选期间折叠特殊字符 schema', () => {
  it('用户折叠命中分支后，300ms 自动展开不再把它打开', () => {
    const view = render(<Harness filterRequest={0} />)
    // Bump filterRequest so DataView reveals the floating filter box.
    view.rerender(<Harness filterRequest={1} />)
    const tree = within(document.querySelector('.dshdb-tree') as HTMLElement)
    const input = document.querySelector('[role="search"] input') as HTMLInputElement
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { value: 'ord' } })
    // Enter commits the filter immediately (skips the typing debounce).
    fireEvent.keyDown(input, { key: 'Enter' })
    // First autofill pass expands the matching schema branch.
    act(() => { vi.advanceTimersByTime(400) })
    const schemaRow = tree.getByText('weird#schema').closest('button') as HTMLButtonElement
    expect(schemaRow.getAttribute('aria-expanded')).toBe('true')

    // User deliberately folds it via the RowToggle (a plain row click only selects).
    const toggle = tree.getByTitle('收起 Schema') as HTMLButtonElement
    expect(toggle).toBeTruthy()
    fireEvent.click(toggle)
    expect(tree.getByText('weird#schema').closest('button')!.getAttribute('aria-expanded')).toBe('false')

    // A later autofill pass must respect the remembered fold (encoded key).
    act(() => { vi.advanceTimersByTime(400) })
    expect(tree.getByText('weird#schema').closest('button')!.getAttribute('aria-expanded')).toBe('false')
  })
})

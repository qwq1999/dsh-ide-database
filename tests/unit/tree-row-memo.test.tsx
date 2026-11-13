// @vitest-environment jsdom
import { useCallback, useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection, SchemaObject, TableDescription } from '../../src/shared/types'

const format = vi.hoisted(() => ({ calls: 0 }))
vi.mock('../../src/client/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/format')>()
  return {
    ...actual,
    objectKindLabel: (kind: Parameters<typeof actual.objectKindLabel>[0]): string => {
      format.calls += 1
      return actual.objectKindLabel(kind)
    },
  }
})

const connection = {
  id: 'c1',
  name: '演示 MySQL',
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
  createdAt: '2026-10-23T00:00:00.000Z',
} as ClientConnection

const objects: SchemaObject[] = Array.from({ length: 30 }, (_, index) => ({
  name: `t${String(index + 1).padStart(2, '0')}`,
  kind: 'table',
}))

function props(overrides: Partial<DataViewProps> = {}): DataViewProps {
  const noop = (): void => undefined
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: {},
    connectingId: '',
    schemas: { c1: [{ name: 'shop', objectCount: objects.length }] },
    objects: { 'c1:shop': objects },
    expanded: { c1: true, 'c1:shop': true, 'c1:shop#table': true },
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

afterEach(() => {
  cleanup()
  format.calls = 0
})

describe('tree rows', () => {
  it('only repaints the rows whose selection changed', () => {
    const noop = (): void => undefined
    render(<DataView {...props({ onSelectObject: noop })} />)
    expect(screen.getByText('t30')).toBeTruthy()
    const before = format.calls
    expect(before).toBe(30)

    fireEvent.click(screen.getByText('t02'))

    const repainted = format.calls - before
    // Selecting t02 repaints the old and the new selected row only; without
    // memo every one of the 30 rows would be formatted again.
    expect(repainted).toBeLessThan(6)
  })

  it('leaves the other rows alone when one row opens a detail folder', () => {
    const description: TableDescription = {
      schema: 'shop',
      table: 't02',
      kind: 'table',
      columns: [{ name: 'id', typeName: 'int', primaryKey: true }],
      indexes: [],
    }

    function Harness(): JSX.Element {
      const [expanded, setExpanded] = useState<Record<string, boolean>>({
        c1: true,
        'c1:shop': true,
        'c1:shop#table': true,
        'c1|shop.t02': true,
      })
      // Keep the static half of the props stable: rebuilding `connections`
      // would invalidate the match index and repaint every row for real.
      const base = useState(() => props())[0]
      const toggleKey = useCallback((key: string) => {
        setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
      }, [])
      return (
        <DataView
          {...base}
          expanded={expanded}
          descriptions={{ 'c1|shop.t02': description }}
          onToggleKey={toggleKey}
        />
      )
    }

    render(<Harness />)
    const before = format.calls
    expect(before).toBe(30)

    fireEvent.click(screen.getByTitle('展开列'))

    // The folder really opened...
    expect(screen.getByText('id')).toBeTruthy()
    // ...and only t02 itself was formatted again. The old shared `expanded`
    // record would repaint all 30 rows here.
    expect(format.calls - before).toBeLessThan(3)
  })
})

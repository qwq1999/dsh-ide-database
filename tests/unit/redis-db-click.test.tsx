// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection } from '../../src/shared/types'

const redis = {
  id: 'r1',
  name: '演示 Redis',
  driver: 'redis',
  dialect: 'redis',
  host: '127.0.0.1',
  port: 6380,
  user: '',
  hasPassword: false,
  database: '',
  redisDb: 0,
  params: {},
  readOnly: false,
  createdAt: '2026-10-23T00:00:00.000Z',
} as ClientConnection

function Harness(): JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ r1: true })
  const toggle = (key: string): void => setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
  // An unset Redis database key means expanded; toggling mirrors the hook.
  const toggleDb = (key: string): void => setExpanded((previous) => ({ ...previous, [key]: previous[key] === false }))
  const nothing = (): void => {}
  const props: DataViewProps = {
    connections: [redis],
    selectedId: '',
    servers: { r1: { product: 'Redis', version: '7.2.0' } },
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
    redisKeys: { r1: { '0': [] } },
    redisCursor: { r1: { '0': '0' } },
    loadingRedisKeys: {},
    redisDatabases: { r1: 16 },
    redisDbs: { r1: [0] },
    visibleSchemas: {},
    redisDetail: null,
    redisDetailDb: -1,
    redisDetailLoading: false,
    onAddConnection: nothing,
    onSelectConnection: nothing,
    onToggleConnection: (id) => toggle(id),
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
    onToggleRedisDb: (connectionId, db) => toggleDb(`${connectionId}:redis:db${db}`),    onLoadRedisKeys: nothing,
    onToggleSchemaVisible: nothing,
    onToggleAllSchemasVisible: nothing,
    onToggleRedisDbVisible: nothing,
    onToggleAllRedisDbsVisible: nothing,
    onShowDdl: nothing,
    onOpenTable: nothing,
  }
  return <DataView {...props} />
}

afterEach(cleanup)

describe('Redis 逻辑库行：双击展开收起', () => {
  it('双击 db0 展开/收起，而不是只选中', () => {
    render(<Harness />)
    const tree = within(document.querySelector('.dshdb-tree') as HTMLElement)
    const row = tree.getByText('db0').closest('button') as HTMLButtonElement

    fireEvent.dblClick(tree.getByText('db0'))
    expect(row.getAttribute('aria-expanded')).toBe('false')

    fireEvent.dblClick(tree.getByText('db0'))
    expect(row.getAttribute('aria-expanded')).toBe('true')
  })
})

// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

function Harness({ onLoadRedisKeys }: { onLoadRedisKeys: (id: string, db: number, more: boolean) => void }): JSX.Element {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ r1: true })
  const toggle = (key: string): void => setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }))
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
    // No entry for db 0 and not loading => the "扫描键" retry action row.
    redisKeys: { r1: {} },
    redisCursor: { r1: {} },
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
    onToggleRedisDb: (connectionId, db) => toggleDb(`${connectionId}:redis:db${db}`),
    onLoadRedisKeys,
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

describe('Redis 扫描键重试', () => {
  it('点击"扫描键"走全新扫描 (more=false)，不复用空游标', () => {
    const onLoadRedisKeys = vi.fn()
    render(<Harness onLoadRedisKeys={onLoadRedisKeys} />)
    const tree = within(document.querySelector('.dshdb-tree') as HTMLElement)
    const scan = tree.getByText('扫描键')
    fireEvent.click(scan)
    expect(onLoadRedisKeys).toHaveBeenCalledWith('r1', 0, false)
  })
})

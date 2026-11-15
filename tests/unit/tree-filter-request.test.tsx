// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

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

const baseProps: DataViewProps = {
  connections: [connection],
  selectedId: 'c1',
  servers: { c1: { product: 'MySQL', version: '8.0.36' } },
  connectingId: '',
  schemas: { c1: [{ name: 'crm', objectCount: 0 }] },
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
}

/** A stand-in for the toolbar: the request is a counter, not a boolean. */
function Harness({ initial = 0 }: { initial?: number }): JSX.Element {
  const [request, setRequest] = useState(initial)
  return (
    <div>
      <button type="button" onClick={() => setRequest((count) => count + 1)}>
        筛选
      </button>
      <DataView {...baseProps} filterRequest={request} />
    </div>
  )
}

describe('tree filter request', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens the filter only when the request changes', () => {
    // Mounting with an old counter must not pop the box open behind the user.
    render(<Harness initial={4} />)
    expect(screen.queryByLabelText('筛选库表')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '筛选' }))
    const input = screen.getByLabelText('筛选库表')
    expect(document.activeElement).toBe(input)
  })
})

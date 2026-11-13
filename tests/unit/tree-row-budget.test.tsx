// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Rendering two thousand real rows is slow and tests the same arithmetic as a
// small budget would; the default MAX_TREE_ROWS is covered in objectlimit.test.mjs.
vi.mock('../../src/client/views/objectlimit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/views/objectlimit')>()
  return { ...actual, MAX_TREE_ROWS: 50 }
})

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import { MAX_TREE_ROWS } from '../../src/client/views/objectlimit'
import type { ClientConnection, SchemaObject } from '../../src/shared/types'

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

const SCHEMAS = 3
const PER_SCHEMA = 20

const schemas = Array.from({ length: SCHEMAS }, (_, index) => ({
  name: `s${String(index + 1).padStart(2, '0')}`,
  objectCount: PER_SCHEMA,
}))

const objects: DataViewProps['objects'] = {}
const expanded: Record<string, boolean> = { c1: true }
for (const schema of schemas) {
  const key = `c1:${schema.name}`
  objects[key] = Array.from({ length: PER_SCHEMA }, (_, index) => ({
    name: `${schema.name}_t${String(index + 1).padStart(3, '0')}`,
    kind: 'table',
  })) as SchemaObject[]
  expanded[key] = true
  expanded[`${key}#table`] = true
}

function props(): DataViewProps {
  const noop = (): void => undefined
  return {
    connections: [connection],
    selectedId: 'c1',
    servers: { c1: { product: 'MySQL', version: '8.0.36' } },
    connectingId: '',
    schemas: { c1: schemas },
    objects,
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
}

afterEach(() => {
  cleanup()
})

describe('whole-tree row budget', () => {
  it('stops at MAX_TREE_ROWS and says how to see the rest', () => {
    const { container } = render(<DataView {...props()} />)

    const objectRows = container.querySelectorAll('[role="treeitem"][aria-level="4"]')
    // 1 connection + 2 complete schemas (each 1 schema + 1 folder + 20 objects)
    // leaves 5 rows: the third schema and its folder, then 3 object rows.
    expect(objectRows.length).toBe(2 * PER_SCHEMA + (MAX_TREE_ROWS - 1 - 2 * 22 - 2))
    expect(objectRows.length).toBeLessThan(SCHEMAS * PER_SCHEMA)
    expect(screen.getByText(`已显示前 ${MAX_TREE_ROWS} 行，请缩小筛选范围`)).toBeTruthy()
    expect(screen.getByText('s01_t020')).toBeTruthy()
    expect(screen.queryByText('s03_t004')).toBeNull()
  })
})

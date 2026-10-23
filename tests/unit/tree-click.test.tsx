// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataView, type DataViewProps } from '../../src/client/views/DataView'
import type { ClientConnection, SchemaObject, TableDescription } from '../../src/shared/types'

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

const customers = { name: 'customers', kind: 'table', comment: '客户' } as SchemaObject

const descriptions: Record<string, TableDescription> = {
  'c1|crm.customers': {
    schema: 'crm',
    table: 'customers',
    kind: 'table',
    columns: [{ name: 'id', type: 'bigint', nullable: false, comment: '主键' } as never],
    indexes: [],
  },
}

type Calls = Record<string, number>

function Harness({ calls }: { calls: Calls }): JSX.Element {
  const bump = (name: string): void => {
    calls[name] = (calls[name] ?? 0) + 1
  }
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    c1: true,
    'c1:crm': true,
    'c1:crm#table': true,
  })
  const [selectedKey, setSelectedKey] = useState('')
  const [detail, setDetail] = useState<TableDescription | null>(null)
  const toggle = (key: string): void => setExpanded((prev) => ({ ...prev, [key]: prev[key] !== true }))

  const props: DataViewProps = {
    connections: [connection],
    selectedId: 'c1',
    servers: { c1: { product: 'MySQL', version: '8.0.36' } },
    connectingId: '',
    schemas: { c1: [{ name: 'crm', objectCount: 1 } as never] },
    objects: { 'c1:crm': [customers] },
    expanded,
    loadingSchemas: {},
    loadingObjects: {},
    cachedAt: {},
    descriptions,
    loadingDescriptions: {},
    detail,
    detailLoading: false,
    selectedKey,
    redisKeys: {},
    redisCursor: {},
    loadingRedisKeys: {},
    redisDetail: null,
    redisDetailLoading: false,
    onAddConnection: () => bump('add'),
    onSelectConnection: () => bump('selectConnection'),
    onToggleConnection: () => {
      bump('toggleConnection')
      toggle('c1')
    },
    onConnect: () => bump('connect'),
    onToggleSchema: (_connectionId, schema) => {
      bump('toggleSchema')
      toggle(`c1:${schema}`)
    },
    onLoadObjects: () => bump('loadObjects'),
    onToggleFolder: (_connectionId, schema, folder) => {
      bump('toggleFolder')
      toggle(`c1:${schema}#${folder}`)
    },
    onToggleKey: (key) => {
      bump('toggleKey')
      toggle(key)
    },
    onSelectObject: (connectionId, schema, object) => {
      bump('selectObject')
      const key = `${connectionId}|${schema}.${object.name}`
      setSelectedKey(key)
      setDetail(descriptions[key] ?? null)
    },
    onSelectSchema: (connectionId, schema) => {
      bump('selectSchema')
      setSelectedKey(`${connectionId}|schema:${schema}`)
      setDetail(null)
    },
    onSelectFolder: (connectionId, schema, folder) => {
      bump('selectFolder')
      setSelectedKey(`${connectionId}|${schema}#${folder}`)
      setDetail(null)
    },
    onSelectRedisKey: () => bump('selectRedisKey'),
    onLoadRedisKeys: () => bump('loadRedisKeys'),
    onShowDdl: () => bump('showDdl'),
    onOpenTable: () => bump('openTable'),
  }

  return <DataView {...props} />
}

function setup(): { calls: Calls } {
  const calls: Calls = {}
  render(<Harness calls={calls} />)
  return { calls }
}

/** Queries inside the tree only: the detail panel reuses the same labels. */
function tree(): ReturnType<typeof within> {
  return within(document.querySelector('.dshdb-tree') as HTMLElement)
}

afterEach(cleanup)

describe('数据源树：选中与展开分离', () => {
  it('点击表名只选中，不展开；点击箭头才展开', () => {
    const { calls } = setup()
    const row = tree().getByText('customers').closest('button') as HTMLButtonElement

    fireEvent.click(tree().getByText('customers'))
    expect(calls.selectObject).toBe(1)
    expect(calls.toggleKey).toBeUndefined()
    expect(row.getAttribute('aria-expanded')).toBe('false')
    expect(row.getAttribute('data-active')).toBe('true')

    fireEvent.click(row.querySelector('.dshdb-row-toggle-action') as HTMLElement)
    expect(calls.toggleKey).toBe(1)
    expect(calls.selectObject).toBe(2)
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(tree().getByText('列')).toBeTruthy()
  })

  it('点击 schema 名只选中，不收起；点击箭头才收起', () => {
    const { calls } = setup()
    const row = tree().getByText('crm').closest('button') as HTMLButtonElement

    fireEvent.click(tree().getByText('crm'))
    expect(calls.selectSchema).toBe(1)
    expect(calls.toggleSchema).toBeUndefined()
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(row.getAttribute('data-active')).toBe('true')

    fireEvent.click(row.querySelector('.dshdb-row-toggle-action') as HTMLElement)
    expect(calls.toggleSchema).toBe(1)
    expect(row.getAttribute('aria-expanded')).toBe('false')
  })

  it('方向键通过箭头展开/收起，当前行保持选中', () => {
    const { calls } = setup()
    const row = tree().getByText('customers').closest('button') as HTMLButtonElement

    fireEvent.click(tree().getByText('customers'))
    row.focus()
    fireEvent.keyDown(row, { key: 'ArrowRight' })
    expect(row.getAttribute('aria-expanded')).toBe('true')
    expect(calls.toggleKey).toBe(1)
    expect(calls.selectObject).toBe(2)

    fireEvent.keyDown(row, { key: 'ArrowLeft' })
    expect(row.getAttribute('aria-expanded')).toBe('false')
    expect(calls.toggleKey).toBe(2)
  })

  it('点击明细里的文件夹名不折叠，点箭头才折叠', () => {
    setup()
    fireEvent.click(tree().getByText('customers'))
    const toggle = screen
      .getByText('customers')
      .closest('button')!
      .querySelector('.dshdb-row-toggle-action') as HTMLElement
    fireEvent.click(toggle)

    const columns = tree().getByText('列').closest('button') as HTMLButtonElement
    fireEvent.click(tree().getByText('列'))
    expect(columns.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(columns.querySelector('.dshdb-row-toggle-action') as HTMLElement)
    expect(columns.getAttribute('aria-expanded')).toBe('true')

    fireEvent.dblClick(tree().getByText('列'))
    expect(columns.getAttribute('aria-expanded')).toBe('false')
  })

  it('双击数据源、Schema、分组行同样展开收起', () => {
    const { calls } = setup()
    const row = (text: string): HTMLButtonElement =>
      tree().getByText(text).closest('button') as HTMLButtonElement

    fireEvent.dblClick(row('演示 MySQL'))
    expect(calls.toggleConnection).toBe(1)
    expect(row('演示 MySQL').getAttribute('aria-expanded')).toBe('false')
    fireEvent.dblClick(row('演示 MySQL'))
    expect(row('演示 MySQL').getAttribute('aria-expanded')).toBe('true')

    fireEvent.dblClick(row('crm'))
    expect(calls.toggleSchema).toBe(1)
    expect(row('crm').getAttribute('aria-expanded')).toBe('false')
    fireEvent.dblClick(row('crm'))
    expect(row('crm').getAttribute('aria-expanded')).toBe('true')

    fireEvent.dblClick(row('表'))
    expect(calls.toggleFolder).toBe(1)
    expect(row('表').getAttribute('aria-expanded')).toBe('false')
    fireEvent.dblClick(row('表'))
    expect(row('表').getAttribute('aria-expanded')).toBe('true')
  })

  it('双击表仍是打开数据表标签页，不展开也不折叠', () => {
    const { calls } = setup()
    const row = tree().getByText('customers').closest('button') as HTMLButtonElement

    fireEvent.dblClick(tree().getByText('customers'))
    expect(calls.openTable).toBe(1)
    expect(calls.selectObject).toBe(1)
    expect(calls.toggleKey).toBeUndefined()
    expect(row.getAttribute('aria-expanded')).toBe('false')
  })
})

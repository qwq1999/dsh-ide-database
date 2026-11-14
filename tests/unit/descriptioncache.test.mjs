import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { DESCRIPTION_COMPACT_LINES, DescriptionCache } from '../../lib/host/descriptioncache.js'

const dirs = []

function cache() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-descriptions-'))
  dirs.push(dir)
  const messages = []
  return { dir, messages, instance: new DescriptionCache(dir, (message) => messages.push(message)) }
}

function description(schema, table) {
  return { schema, table, kind: 'table', columns: [{ name: 'id', typeName: 'INT', nullable: false }], indexes: [] }
}

function logFile(dir, connectionId) {
  return join(dir, `${connectionId}.ndjson`)
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('DescriptionCache', () => {
  it('appends entries and reloads them in a fresh instance', () => {
    const { dir, instance } = cache()
    instance.put('c1', 'app', 'orders', description('app', 'orders'))
    instance.put('c1', 'app', 'order_items', description('app', 'order_items'))
    instance.put('c2', 'crm', 'leads', description('crm', 'leads'))
    instance.flush()

    expect(instance.has('c1', 'app', 'orders')).toBe(true)
    expect(instance.get('c1', 'app', 'orders')?.describedAt).toBeDefined()

    const reloaded = new DescriptionCache(dir, () => {})
    expect(reloaded.get('c1', 'app', 'orders')?.columns).toHaveLength(1)
    expect(reloaded.get('c2', 'crm', 'leads')?.table).toBe('leads')
    expect(reloaded.get('c1', 'app', 'missing')).toBeUndefined()
  })

  it('keeps the last value when a table is described twice', () => {
    const { dir, instance } = cache()
    instance.put('c1', 'app', 'orders', { ...description('app', 'orders'), columns: [] })
    instance.put('c1', 'app', 'orders', description('app', 'orders'))
    instance.flush()

    const reloaded = new DescriptionCache(dir, () => {})
    expect(reloaded.get('c1', 'app', 'orders')?.columns).toHaveLength(1)
  })

  it('persists pruned objects as tombstones', () => {
    const { dir, instance } = cache()
    instance.put('c1', 'app', 'a', description('app', 'a'))
    instance.put('c1', 'app', 'b', description('app', 'b'))
    instance.flush()

    instance.pruneObjects('c1', 'app', new Set(['app.b']))
    instance.flush()
    expect(instance.has('c1', 'app', 'a')).toBe(false)

    const reloaded = new DescriptionCache(dir, () => {})
    expect(reloaded.has('c1', 'app', 'a')).toBe(false)
    expect(reloaded.has('c1', 'app', 'b')).toBe(true)
  })

  it('prunes schemas the server no longer lists', () => {
    const { instance } = cache()
    instance.put('c1', 'app', 'a', description('app', 'a'))
    instance.put('c1', 'crm', 'b', description('crm', 'b'))

    instance.pruneSchemas('c1', ['app'])
    expect(instance.has('c1', 'app', 'a')).toBe(true)
    expect(instance.has('c1', 'crm', 'b')).toBe(false)
  })

  it('compacts duplicates once the log grows past the live set', () => {
    const { dir, instance } = cache()
    for (let index = 0; index < DESCRIPTION_COMPACT_LINES + 1; index += 1) {
      instance.put('c1', 'app', 'orders', description('app', 'orders'))
    }
    instance.flush()

    const lines = readFileSync(logFile(dir, 'c1'), 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    const reloaded = new DescriptionCache(dir, () => {})
    expect(reloaded.has('c1', 'app', 'orders')).toBe(true)
  })

  it('imports legacy descriptions as one compact log line each', () => {
    const { dir, instance } = cache()
    instance.import('c1', {
      'app.orders': description('app', 'orders'),
      'app.items': description('app', 'items'),
    })

    const lines = readFileSync(logFile(dir, 'c1'), 'utf8').trim().split('\n')
    expect(lines).toHaveLength(2)
  })

  it('keeps schema and table names that contain dots', () => {
    const { dir, instance } = cache()
    const schema = 'sales.eu'
    const table = 'orders.2024'
    instance.import('c1', { [`${schema}.${table}`]: description(schema, table) })

    const lines = readFileSync(logFile(dir, 'c1'), 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    const record = JSON.parse(lines[0])
    expect(record.s).toBe(schema)
    expect(record.t).toBe(table)

    const reloaded = new DescriptionCache(dir, () => {})
    expect(reloaded.get('c1', schema, table)?.schema).toBe(schema)
    expect(reloaded.get('c1', schema, table)?.table).toBe(table)
    reloaded.pruneSchemas('c1', [schema])
    expect(reloaded.has('c1', schema, table)).toBe(true)
  })

  it('ignores a corrupted line instead of dropping the whole log', () => {
    const { dir, messages } = cache()
    writeFileSync(
      logFile(dir, 'c1'),
      `not json\n${JSON.stringify({ s: 'app', t: 'orders', d: description('app', 'orders') })}\n`,
    )
    const instance = new DescriptionCache(dir, (message) => messages.push(message))
    expect(instance.has('c1', 'app', 'orders')).toBe(true)
    expect(messages.some((message) => message.includes('无法解析'))).toBe(true)
  })

  it('removes the log when a connection is cleared', () => {
    const { dir, instance } = cache()
    instance.put('c1', 'app', 'orders', description('app', 'orders'))
    instance.flush()
    instance.clear('c1')

    expect(existsSync(logFile(dir, 'c1'))).toBe(false)
    expect(instance.has('c1', 'app', 'orders')).toBe(false)
  })

  it('stamps describedAt on every write', () => {
    const { instance } = cache()
    instance.put('c1', 'app', 'orders', description('app', 'orders'))
    const stored = instance.get('c1', 'app', 'orders')
    expect(typeof stored?.describedAt).toBe('string')
  })
})

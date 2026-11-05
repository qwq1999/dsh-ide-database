import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { StructureStore } from '../../lib/host/structure.js'

const dirs = []

function store() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-structure-'))
  dirs.push(dir)
  const file = join(dir, 'structure.json')
  const messages = []
  return { file, messages, instance: new StructureStore(file, (message) => messages.push(message)) }
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('StructureStore accessors', () => {
  it('reads the timestamp and database count without cloning the entry', () => {
    const { instance } = store()
    expect(instance.fetchedAt('c1')).toBeUndefined()
    expect(instance.redisDatabases('c1')).toBeUndefined()

    instance.putRedisDatabases('c1', 32)
    expect(instance.redisDatabases('c1')).toBe(32)
    expect(typeof instance.fetchedAt('c1')).toBe('string')
    expect(instance.redisDatabases('other')).toBeUndefined()
  })

  it('reuses the serialized snapshot until the structure changes', () => {
    const { instance } = store()
    instance.putSchemas('c1', [{ name: 'shop' }])
    const first = instance.snapshotJson()
    expect(first).toBe(instance.snapshotJson())
    expect(JSON.parse(first).c1.schemas.map((schema) => schema.name)).toEqual(['shop'])

    instance.putSchemas('c1', [{ name: 'shop' }, { name: 'crm' }])
    const second = instance.snapshotJson()
    expect(second).not.toBe(first)
    expect(JSON.parse(second).c1.schemas).toHaveLength(2)
    expect(instance.snapshot().c1.schemas).toHaveLength(2)
  })

  it('defaults the database count when a key page creates the Redis entry', () => {
    const { instance } = store()
    instance.putRedisKeys('c1', 2, [{ key: 'k', type: 'string', ttl: -1, size: 3 }], '17', true)
    expect(instance.redisDatabases('c1')).toBe(16)
    expect(instance.get('c1')?.redis?.dbs['2']).toMatchObject({ cursor: '17', keys: [{ key: 'k' }] })
  })

  it('hands out copies so a caller cannot corrupt the cache', () => {
    const { instance } = store()
    instance.putRedisDatabases('c1', 8)
    const copy = instance.get('c1')
    copy.redis.databases = 99
    copy.schemas.push({ name: 'injected' })
    expect(instance.redisDatabases('c1')).toBe(8)
    expect(instance.get('c1')?.schemas).toEqual([])
  })

  it('persists on flush and reloads the same data', () => {
    const { file, instance } = store()
    instance.putSchemas('c1', [{ name: 'app' }])
    instance.putRedisKeys('c1', 0, [{ key: 'session:1', type: 'hash', ttl: 60, size: 4 }], '0', true)
    instance.flush()
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    expect(raw.c1.schemas).toEqual([{ name: 'app' }])
    expect(raw.c1.redis.dbs['0'].keys[0].key).toBe('session:1')

    const reloaded = new StructureStore(file, () => {})
    expect(reloaded.redisDatabases('c1')).toBe(16)
    expect(reloaded.get('c1')?.schemas).toEqual([{ name: 'app' }])
  })

  it('stamps a description with when it was read and reloads it', () => {
    const { file, instance } = store()
    instance.putSchemas('c1', [{ name: 'app' }])
    instance.putObjects('c1', 'app', [{ name: 'orders', kind: 'table' }])
    instance.putDescription('c1', 'app', 'orders', { schema: 'app', table: 'orders', kind: 'table', columns: [], indexes: [] })

    const stored = instance.getDescription('c1', 'app', 'orders')
    expect(typeof stored.describedAt).toBe('string')

    instance.flush()
    const reloaded = new StructureStore(file, () => {})
    expect(reloaded.getDescription('c1', 'app', 'orders')?.describedAt).toBe(stored.describedAt)
  })

  it('drops descriptions of relations that disappeared from the object list', () => {
    const { instance } = store()
    instance.putSchemas('c1', [{ name: 'app' }])
    instance.putObjects('c1', 'app', [{ name: 'a', kind: 'table' }, { name: 'b', kind: 'view' }])
    for (const table of ['a', 'b']) {
      instance.putDescription('c1', 'app', table, { schema: 'app', table, kind: 'table', columns: [], indexes: [] })
    }

    instance.putObjects('c1', 'app', [{ name: 'b', kind: 'view' }])

    expect(instance.getDescription('c1', 'app', 'a')).toBeUndefined()
    expect(instance.getDescription('c1', 'app', 'b')).toBeDefined()
  })

  it('drops descriptions of schemas the server no longer lists', () => {
    const { instance } = store()
    instance.putSchemas('c1', [{ name: 'app' }, { name: 'crm' }])
    instance.putObjects('c1', 'app', [{ name: 'a', kind: 'table' }])
    instance.putObjects('c1', 'crm', [{ name: 'b', kind: 'table' }])
    instance.putDescription('c1', 'app', 'a', { schema: 'app', table: 'a', kind: 'table', columns: [], indexes: [] })
    instance.putDescription('c1', 'crm', 'b', { schema: 'crm', table: 'b', kind: 'table', columns: [], indexes: [] })

    instance.putSchemas('c1', [{ name: 'app' }])

    expect(instance.getDescription('c1', 'app', 'a')).toBeDefined()
    expect(instance.getDescription('c1', 'crm', 'b')).toBeUndefined()
  })

  it('keeps descriptions out of the tree snapshot payload', () => {
    const { instance } = store()
    instance.putSchemas('c1', [{ name: 'app' }])
    instance.putObjects('c1', 'app', [{ name: 'orders', kind: 'table' }])
    instance.putDescription('c1', 'app', 'orders', {
      schema: 'app',
      table: 'orders',
      kind: 'table',
      columns: [{ name: 'id', typeName: 'INT', nullable: false }],
      indexes: [],
    })

    const snapshot = JSON.parse(instance.snapshotJson())
    expect(snapshot.c1.schemas).toEqual([{ name: 'app' }])
    expect(snapshot.c1.objects.app).toHaveLength(1)
    expect(snapshot.c1.descriptions).toBeUndefined()
  })

  it('splits a legacy single-file cache into a tree file and description logs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dshdb-structure-'))
    dirs.push(dir)
    const file = join(dir, 'structure.json')
    writeFileSync(
      file,
      JSON.stringify({
        c1: {
          fetchedAt: '2026-11-05T11:00:00.000Z',
          schemas: [{ name: 'app' }],
          objects: { app: [{ name: 'orders', kind: 'table' }] },
          descriptions: {
            'app.orders': {
              schema: 'app',
              table: 'orders',
              kind: 'table',
              columns: [{ name: 'id', typeName: 'INT', nullable: false }],
              indexes: [],
            },
          },
        },
      }),
    )

    const instance = new StructureStore(file, () => {})
    expect(instance.getDescription('c1', 'app', 'orders')?.columns).toHaveLength(1)

    instance.flush()
    const raw = JSON.parse(readFileSync(file, 'utf8'))
    expect(raw.c1.schemas).toEqual([{ name: 'app' }])
    expect(raw.c1.descriptions).toBeUndefined()
    expect(existsSync(join(dir, 'descriptions', 'c1.ndjson'))).toBe(true)

    const reloaded = new StructureStore(file, () => {})
    expect(reloaded.getDescription('c1', 'app', 'orders')?.columns).toHaveLength(1)
  })
})

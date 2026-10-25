import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
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
})

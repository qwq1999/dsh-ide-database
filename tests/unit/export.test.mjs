import { describe, expect, it } from 'vitest'
import { exportFilename, jsonValue, toJson } from '../../src/client/export.js'

const columns = (...names) => names.map((name) => ({ name, typeName: 'varchar', kind: 'text' }))

describe('toJson', () => {
  it('keeps native types and nulls', () => {
    const text = toJson(columns('id', 'name', 'ok'), [[7, 'a', true], [null, 'b', null]])
    expect(JSON.parse(text)).toEqual([
      { id: 7, name: 'a', ok: true },
      { id: null, name: 'b', ok: null },
    ])
  })

  it('suffixes duplicate column names instead of dropping them', () => {
    const text = toJson(columns('id', 'id', 'name'), [[1, 2, 'x']])
    expect(JSON.parse(text)).toEqual([{ id: 1, id_2: 2, name: 'x' }])
  })

  it('serialises bigints without throwing', () => {
    expect(JSON.parse(toJson(columns('big'), [[BigInt('9007199254740993')]]))[0].big).toBe('9007199254740993')
    expect(JSON.parse(toJson(columns('small'), [[BigInt(42)]]))[0].small).toBe(42)
  })
})

describe('jsonValue', () => {
  it('stringifies dates as ISO text', () => {
    expect(jsonValue(new Date('2026-10-23T00:00:00Z'))).toBe('2026-10-23T00:00:00.000Z')
  })
})

describe('exportFilename', () => {
  it('stamps schema.table with the export time', () => {
    expect(exportFilename('shop', 'orders', 'json', new Date(2026, 9, 23, 1, 2, 3))).toBe('shop.orders-20261023-010203.json')
    expect(exportFilename('shop', 'orders', 'sql', new Date(2026, 9, 23, 1, 2, 3))).toBe('shop.orders-20261023-010203.sql')
  })
})

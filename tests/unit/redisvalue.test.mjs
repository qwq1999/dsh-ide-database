import { describe, expect, it } from 'vitest'
import { redisTtlLabel, redisValueTable } from '../../src/client/redisvalue.js'

const value = (type, raw) => ({ key: 'k', type, ttl: -1, value: raw, truncated: false, preview: '' })

describe('redisValueTable', () => {
  it('renders a string as a single row', () => {
    expect(redisValueTable(value('string', '42'))).toEqual({ headers: ['值'], rows: [['42']] })
  })

  it('renders a hash as field / value rows', () => {
    expect(redisValueTable(value('hash', { name: '张伟', city: '北京' }))).toEqual({
      headers: ['字段', '值'],
      rows: [
        ['name', '张伟'],
        ['city', '北京'],
      ],
    })
  })

  it('renders lists and sets with a row number column', () => {
    expect(redisValueTable(value('list', ['a', 'b'])).rows).toEqual([
      ['1', 'a'],
      ['2', 'b'],
    ])
    expect(redisValueTable(value('set', ['x'])).headers).toEqual(['#', '成员'])
  })

  it('renders a sorted set with member and score', () => {
    expect(redisValueTable(value('zset', [{ member: 'a', score: 3 }]))).toEqual({
      headers: ['成员', '分数'],
      rows: [['a', '3']],
    })
  })

  it('renders stream entries as id / fields', () => {
    expect(redisValueTable(value('stream', [['1-0', ['name', 'x']]]))).toEqual({
      headers: ['ID', '字段'],
      rows: [['1-0', '["name","x"]']],
    })
  })

  it('returns null for unknown shapes', () => {
    expect(redisValueTable(value('module', {}))).toBeNull()
  })
})

describe('redisTtlLabel', () => {
  it('formats permanent, expired and expiring keys', () => {
    expect(redisTtlLabel(-1)).toBe('永久')
    expect(redisTtlLabel(-2)).toBe('已过期')
    expect(redisTtlLabel(59.6)).toBe('60s')
  })
})

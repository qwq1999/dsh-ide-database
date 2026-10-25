import { describe, expect, it } from 'vitest'
import { prettyJsonText, redisTtlLabel, redisValueTable, redisValueText } from '../../src/client/redisvalue.js'

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
    expect(redisTtlLabel(3600)).toBe('1h')
    expect(redisTtlLabel(90000)).toBe('1d')
  })
})

describe('redis JSON payloads', () => {
  it('indents a stored JSON object so it can be read as a block', () => {
    const stored = JSON.stringify({ name: '张伟', tags: ['a', 'b'] })
    expect(prettyJsonText(stored)).toBe(JSON.stringify({ name: '张伟', tags: ['a', 'b'] }, null, 2))
  })

  it('leaves plain text, broken JSON and scalar text untouched', () => {
    expect(prettyJsonText('hello')).toBe('hello')
    expect(prettyJsonText('{ not json')).toBe('{ not json')
    expect(prettyJsonText('42')).toBe('42')
    expect(prettyJsonText('[1, 2')).toBe('[1, 2')
  })

  it('prints string values as they are and NULL for a missing value', () => {
    expect(redisValueText('hello')).toBe('hello')
    expect(redisValueText(JSON.stringify({ a: 1 }))).toBe(JSON.stringify({ a: 1 }, null, 2))
    expect(redisValueText(42)).toBe('42')
    expect(redisValueText(null)).toBe('NULL')
  })

  it('sends JSON strings to the block view instead of a one-cell table', () => {
    expect(redisValueTable(value('string', JSON.stringify({ a: 1 })))).toBeNull()
    expect(redisValueTable(value('string', '[1, 2]'))).toBeNull()
    expect(redisValueTable(value('string', 'hello'))).toEqual({ headers: ['值'], rows: [['hello']] })
    expect(redisValueTable(value('string', '42'))).toEqual({ headers: ['值'], rows: [['42']] })
  })
})

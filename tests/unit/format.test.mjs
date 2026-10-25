import { describe, expect, it } from 'vitest'

import {
  dialectLabel,
  formatBytes,
  formatCell,
  formatMs,
  looksLikeRedisWrite,
  looksLikeWrite,
} from '../../src/client/format.ts'

describe('format helpers', () => {
  it('labels dialects', () => {
    expect(dialectLabel('mysql')).toBe('MySQL')
    expect(dialectLabel('oceanbase-oracle')).toBe('OceanBase (Oracle)')
    expect(dialectLabel(undefined)).toBe('未选择')
  })

  it('formats timings and sizes', () => {
    expect(formatMs(undefined)).toBe('—')
    expect(formatMs(3)).toBe('3 ms')
    expect(formatMs(2500)).toBe('2.50 s')
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
  })

  it('formats nullable cells', () => {
    expect(formatCell(null)).toBe('NULL')
    expect(formatCell(true)).toBe('true')
    expect(formatCell(42)).toBe('42')
  })

  it('detects write statements in client-side hints', () => {
    expect(looksLikeWrite('SELECT * FROM users')).toBe(false)
    expect(looksLikeWrite('SELECT * FROM users; DELETE FROM users')).toBe(true)
    expect(looksLikeWrite('-- delete later\nUPDATE users SET age = 1')).toBe(true)
    expect(looksLikeWrite('/* comment */ INSERT INTO t VALUES (1)')).toBe(true)
    expect(looksLikeWrite('EXPLAIN SELECT 1')).toBe(false)
    expect(looksLikeWrite('EXPLAIN ANALYZE SELECT 1')).toBe(false)
    expect(looksLikeWrite('EXPLAIN ANALYZE DELETE FROM t')).toBe(true)
    expect(looksLikeWrite('explain analyze format=tree update t set a = 1')).toBe(true)
    expect(looksLikeWrite('EXPLAIN DELETE FROM t')).toBe(false)
    expect(looksLikeRedisWrite('GET foo')).toBe(false)
    expect(looksLikeRedisWrite('SET foo bar')).toBe(true)
    expect(looksLikeRedisWrite('DEL foo')).toBe(true)
  })
})

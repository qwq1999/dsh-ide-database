import { describe, expect, it } from 'vitest'

import {
  dialectLabel,
  formatBytes,
  formatCell,
  formatCount,
  formatTtl,
  formatMs,
  looksLikeDdl,
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
    expect(formatMs(Number.NaN)).toBe('—')
    expect(formatMs(0)).toBe('1 ms')
    expect(formatMs(999.6)).toBe('1.00 s')
    expect(formatMs(60_000)).toBe('1m 0s')
    expect(formatMs(65_400)).toBe('1m 5s')
    expect(formatMs(65000)).toBe('1m 5s')
    expect(formatMs(600000)).toBe('10m 0s')
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
    expect(looksLikeWrite('WITH recent AS (SELECT 1) DELETE FROM users')).toBe(true)
    expect(looksLikeWrite('with a as (select 1), b (id) as (select 2) select * from a')).toBe(false)
    expect(looksLikeWrite('WITH a AS (SELECT 1), b AS (SELECT 2) UPDATE users SET age = 1')).toBe(true)
    expect(looksLikeWrite('EXPLAIN ANALYZE WITH a AS (SELECT 1) DELETE FROM users')).toBe(true)
    expect(looksLikeWrite('WITH x')).toBe(true)
    expect(looksLikeRedisWrite('GET foo')).toBe(false)
    expect(looksLikeRedisWrite('SET foo bar')).toBe(true)
    expect(looksLikeRedisWrite('DEL foo')).toBe(true)
  })

  it('detects statements that change the schema layout', () => {
    expect(looksLikeDdl('SELECT * FROM users')).toBe(false)
    expect(looksLikeDdl('INSERT INTO users VALUES (1)')).toBe(false)
    expect(looksLikeDdl("SELECT 'drop table users' AS note")).toBe(false)
    expect(looksLikeDdl('select `drop` from t')).toBe(false)
    expect(looksLikeDdl('CREATE TABLE users (id INT)')).toBe(true)
    expect(looksLikeDdl('  -- tidy up\nDROP TABLE users')).toBe(true)
    expect(looksLikeDdl('ALTER TABLE users ADD COLUMN age INT')).toBe(true)
    expect(looksLikeDdl('SELECT 1; TRUNCATE TABLE users')).toBe(true)
    expect(looksLikeDdl('EXPLAIN ANALYZE DROP TABLE users')).toBe(true)
  })

  it('groups counts with thousands separators', () => {
    expect(formatCount(999)).toBe('999')
    expect(formatCount(1234567)).toBe('1,234,567')
  })

  it('shortens remaining TTL to the largest whole unit', () => {
    expect(formatTtl(-1)).toBe('永久')
    expect(formatTtl(0)).toBe('0s')
    expect(formatTtl(59)).toBe('59s')
    expect(formatTtl(60)).toBe('1m')
    expect(formatTtl(3599)).toBe('59m')
    expect(formatTtl(3600)).toBe('1h')
    expect(formatTtl(86399)).toBe('23h')
    expect(formatTtl(86400)).toBe('1d')
    expect(formatTtl(Number.NaN)).toBe('—')
  })
})

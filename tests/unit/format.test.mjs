import { describe, expect, it } from 'vitest'

import {
  dialectLabel,
  formatBytes,
  formatCell,
  formatCount,
  formatDateTime,
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
    expect(formatBytes(1023.6)).toBe('1.0 KB')
    expect(formatBytes(2048)).toBe('2.0 KB')
  })

  it('formats nullable cells', () => {
    expect(formatCell(null)).toBe('NULL')
    expect(formatCell(true)).toBe('true')
    expect(formatCell(42)).toBe('42')
  })

  it('formats recycle bin timestamps in local time', () => {
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDateTime('')).toBe('—')
    expect(formatDateTime('not a date')).toBe('—')
    expect(formatDateTime('2026-10-30T12:34:00')).toBe('2026-10-30 12:34')
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

  it('looks inside CTEs and files when deciding whether to confirm', () => {
    expect(looksLikeWrite('WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d')).toBe(true)
    expect(looksLikeWrite('WITH d AS (SELECT 1) SELECT * FROM d')).toBe(false)
    expect(looksLikeWrite('WITH "recent sales" AS (SELECT 1) SELECT * FROM "recent sales"')).toBe(false)
    expect(looksLikeWrite('WITH `recent sales` AS (SELECT 1) SELECT * FROM `recent sales`')).toBe(false)
    expect(looksLikeWrite('WITH [recent sales] AS (SELECT 1) SELECT * FROM [recent sales]')).toBe(false)
    expect(looksLikeWrite('WITH "d" AS (DELETE FROM t RETURNING *) SELECT * FROM "d"')).toBe(true)
    expect(looksLikeWrite('WITH "x"("id") AS (SELECT 1) SELECT * FROM "x"')).toBe(false)
    expect(looksLikeWrite('WITH c AS NOT MATERIALIZED (SELECT 1) SELECT * FROM c')).toBe(false)
    expect(looksLikeWrite('WITH c AS MATERIALIZED (SELECT 1) SELECT * FROM c')).toBe(false)
    expect(looksLikeWrite('WITH c AS (SELECT [a)] FROM t) SELECT * FROM c', 'mssql')).toBe(false)
    expect(looksLikeWrite('WITH c AS (SELECT [a)] FROM t) DELETE FROM users', 'mssql')).toBe(true)
    expect(looksLikeWrite('WITH c AS (DELETE FROM [a)] OUTPUT deleted.id) SELECT * FROM c', 'mssql')).toBe(true)
    expect(looksLikeWrite("SELECT 1 INTO OUTFILE '/tmp/x'")).toBe(true)
    expect(looksLikeWrite('SELECT 1 INTO new_table')).toBe(true)
    expect(looksLikeWrite('SELECT 1 INTO @total')).toBe(false)
    expect(looksLikeWrite('EXPLAIN /* note */ ANALYZE DELETE FROM t')).toBe(true)
    expect(looksLikeWrite('EXPLAIN (ANALYZE) DELETE FROM t')).toBe(true)
    expect(looksLikeWrite('EXPLAIN (FORMAT JSON) DELETE FROM t')).toBe(false)
    expect(looksLikeWrite("SELECT replace(name, 'a', 'b') FROM users")).toBe(false)
    expect(looksLikeWrite("SELECT '=DELETE FROM t'")).toBe(false)
    expect(looksLikeWrite('SELECT 1 /*!50000 DELETE FROM t */', 'mysql')).toBe(true)
    expect(looksLikeWrite('/*!50000DELETE FROM t*/', 'mysql')).toBe(true)
    expect(looksLikeWrite('SELECT 1 /*!50000 SQL_NO_CACHE */', 'mysql')).toBe(false)
    expect(looksLikeWrite('SELECT 1 /*!50000 DELETE FROM t */', 'sqlite')).toBe(false)
    expect(looksLikeWrite("SELECT q'[delete]' FROM dual", 'oracle')).toBe(false)
  })

  it('recognizes bulk-load statements as writes', () => {
    expect(looksLikeWrite("LOAD DATA INFILE '/tmp/users.csv' INTO TABLE users", 'mysql')).toBe(true)
    expect(looksLikeWrite("COPY users FROM '/tmp/users.csv'", 'postgres')).toBe(true)
    expect(looksLikeWrite("COPY users TO '/tmp/users.csv'", 'postgres')).toBe(false)
  })

  it('checks every batch separated by GO or DELIMITER', () => {
    expect(looksLikeWrite('select 1\nGO\ndelete from t', 'mssql')).toBe(true)
    expect(looksLikeWrite('select 1\nGO\nselect 2', 'mssql')).toBe(false)
    expect(looksLikeWrite('DELIMITER //\nselect 1//\ndelete from t//', 'mysql')).toBe(true)
    expect(looksLikeWrite('DELIMITER //\nselect 1//\nselect 2//', 'mysql')).toBe(false)
    expect(looksLikeWrite('select 1 as "a;DELETE FROM t"', 'generic')).toBe(false)
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
    expect(formatTtl(59.5)).toBe('1m')
    expect(formatTtl(3599.6)).toBe('1h')
    expect(formatTtl(86_399.5)).toBe('1d')
    expect(formatTtl(Number.NaN)).toBe('—')
  })
})

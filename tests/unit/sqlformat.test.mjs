import { describe, expect, it } from 'vitest'

import { formatSql } from '../../src/client/sqlformat.ts'

describe('formatSql', () => {
  it('大写关键字并给主要子句换行', () => {
    const sql = "select id, status, total from shop.orders where id > 100 and status = 'paid' order by id desc limit 20"
    expect(formatSql(sql)).toBe(
      [
        'SELECT id, status, total',
        'FROM shop.orders',
        "WHERE id > 100 AND status = 'paid'",
        'ORDER BY id DESC',
        'LIMIT 20',
      ].join('\n'),
    )
  })

  it('字符串与注释里的内容原样保留', () => {
    const sql = "select 'from where select' as label, 1 -- keep me\nfrom t /* block */ where label = 'x'"
    expect(formatSql(sql)).toBe(
      [
        "SELECT 'from where select' AS label, 1 -- keep me",
        'FROM t /* block */',
        "WHERE label = 'x'",
      ].join('\n'),
    )
  })

  it('保留反引号标识符，不把其中的词大写', () => {
    expect(formatSql('select * from `select from` limit 5')).toBe('SELECT *\nFROM `select from`\nLIMIT 5')
  })

  it('子查询换行缩进', () => {
    expect(formatSql('select * from t where id in (select id from u)')).toBe(
      ['SELECT *', 'FROM t', 'WHERE id IN (', '  SELECT id', '  FROM u)'].join('\n'),
    )
  })

  it('函数调用与聚合括号不拆开', () => {
    expect(formatSql('select count(*), max(total) from orders where id in (1, 2)')).toBe(
      ['SELECT COUNT(*), MAX(total)', 'FROM orders', 'WHERE id IN (1, 2)'].join('\n'),
    )
  })

  it('空输入与已排版输入保持稳定', () => {
    expect(formatSql('   ')).toBe('')
    const sql = 'select a from t where b = 1'
    expect(formatSql(formatSql(sql))).toBe(formatSql(sql))
  })

  it('多字符运算符保持连写', () => {
    const sql = "select * from t where a>=1 and b<=2 and c<>3 and d!=4 and e||f='x'"
    expect(formatSql(sql)).toBe(
      ['SELECT *', 'FROM t', "WHERE a >= 1 AND b <= 2 AND c <> 3 AND d != 4 AND e || f = 'x'"].join('\n'),
    )
    expect(formatSql('select * from t where a<=>b')).toBe('SELECT *\nFROM t\nWHERE a <=> b')
  })

  it('日期区间条件排版后仍可执行', () => {
    const sql =
      "select orgid, SUM(succcount) from moc_orctrans where createtime>='2026-11-01 00:00:00' and createtime<'2026-11-30 00:00:00' group by orgid"
    const once = formatSql(sql)
    expect(once).toContain("createtime >= '2026-11-01 00:00:00'")
    expect(once).toContain("createtime < '2026-11-30 00:00:00'")
    expect(once).not.toContain('> =')
    expect(formatSql(once)).toBe(once)
  })

  it('标准 SQL 中反斜杠是普通字符，不吞掉相邻字符串', () => {
    // Standard SQL: 'a\' is a complete literal, the next quote starts another.
    // Treating the backslash as an escape merged the two and changed meaning.
    expect(formatSql("select 'a" + String.fromCharCode(92) + "', 'b' from t").split(String.fromCharCode(10))).toEqual(["SELECT 'a" + String.fromCharCode(92) + "', 'b'", "FROM t"])
  })

  it('MySQL 中反斜杠仍是转义', () => {
    expect(formatSql("select 'it" + String.fromCharCode(92) + "'s', 'b' from t", 'mysql').split(String.fromCharCode(10))).toEqual(["SELECT 'it" + String.fromCharCode(92) + "'s', 'b'", "FROM t"])
  })

  it("PostgreSQL 只在 E'' 字符串里把反斜杠当转义", () => {
    expect(formatSql("select 'a" + String.fromCharCode(92) + "', 'b' from t", 'postgres').split(String.fromCharCode(10))).toEqual(["SELECT 'a" + String.fromCharCode(92) + "', 'b'", "FROM t"])
    expect(formatSql("select E'a" + String.fromCharCode(92) + "'b', 'c' from t", 'postgres').split(String.fromCharCode(10))).toEqual(["SELECT E 'a" + String.fromCharCode(92) + "'b', 'c'", "FROM t"])
  })

  it('多条语句各占一行', () => {
    expect(formatSql('select 1; select 2')).toBe('SELECT 1;\nSELECT 2')
  })
})

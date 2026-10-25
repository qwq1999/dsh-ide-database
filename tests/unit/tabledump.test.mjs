import { describe, expect, it } from 'vitest'

import { tableDumpText } from '../../src/client/tabledump'

const columns = [
  { name: 'id', typeName: 'INT' },
  { name: 'name', typeName: 'VARCHAR' },
  { name: 'total', typeName: 'DECIMAL' },
]

function dump(overrides = {}) {
  return {
    dialect: 'mysql',
    schema: 'shop',
    table: 'orders',
    ddl: 'CREATE TABLE `orders` (\n  `id` INT NOT NULL,\n  PRIMARY KEY (`id`)\n)',
    columns,
    rows: [
      [1, '手机', '638.00'],
      [2, null, '0'],
    ],
    ...overrides,
  }
}

const LF = String.fromCharCode(10)

describe('tableDumpText', () => {
  it('writes a header, the CREATE statement and one INSERT per row', () => {
    const text = tableDumpText(dump())
    const lines = text.split(LF)
    expect(lines.slice(0, 2)).toEqual(['-- shop.orders', '-- 由 dsh-ide-database 导出'])
    expect(text).toContain('CREATE TABLE `orders` (')
    expect(text).toContain('PRIMARY KEY (`id`)')
    expect(text).toContain(');')
    expect(text).toContain("INSERT INTO `shop`.`orders` (`id`, `name`, `total`) VALUES (1, '手机', 638.00);")
    expect(text).toContain("INSERT INTO `shop`.`orders` (`id`, `name`, `total`) VALUES (2, NULL, 0);")
    expect(text.endsWith(`);${LF}`)).toBe(true)
  })

  it('adds the missing semicolon to a DDL that lacks one', () => {
    const text = tableDumpText(dump({ ddl: 'CREATE TABLE `orders` (`id` INT)' }))
    expect(text).toContain('CREATE TABLE `orders` (`id` INT);')
    expect(text).not.toContain(');;')
  })

  it('explains a missing DDL instead of writing an empty block', () => {
    const text = tableDumpText(dump({ ddl: null }))
    expect(text).toContain('-- 未能取到建表语句，只导出数据')
    expect(text).toContain('INSERT INTO `shop`.`orders`')
    expect(text).not.toContain('CREATE TABLE')
  })

  it('does not leave a blank separator when there are no rows', () => {
    const text = tableDumpText(dump({ rows: [] }))
    expect(text).not.toContain('INSERT INTO')
    expect(text.endsWith(`;${LF}`)).toBe(true)
  })

  it('quotes identifiers for non-MySQL dialects and keeps numbers exact', () => {
    const text = tableDumpText(
      dump({
        dialect: 'oracle',
        schema: 'SHOP',
        table: 'ORDERS',
        ddl: 'CREATE TABLE "ORDERS" ("ID" NUMBER)',
        columns: [
          { name: 'ID', typeName: 'NUMBER' },
          { name: 'TOTAL', typeName: 'NUMBER' },
        ],
        rows: [[7, '12.5']],
      }),
    )
    expect(text).toContain('-- SHOP.ORDERS')
    expect(text).toContain('INSERT INTO "SHOP"."ORDERS" ("ID", "TOTAL") VALUES (7, 12.5);')
  })
})

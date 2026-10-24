import { describe, expect, it } from 'vitest'
import {
  composeWhere,
  filterExpression,
  insertStatement,
  insertStatements,
  isNumericType,
  pageClause,
  qualifiedName,
  quoteIdent,
  quoteLiteral,
  stripKeyword,
} from '../../src/client/tablesql.ts'

const column = (name, typeName) => ({ name, typeName, nullable: true, defaultValue: '', comment: '', primary: false })

describe('tablesql quoting', () => {
  it('quotes identifiers per dialect', () => {
    expect(quoteIdent('mysql', 'order')).toBe('`order`')
    expect(quoteIdent('oracle', 'ORDER')).toBe('"ORDER"')
    expect(qualifiedName('mysql', 'shop', 'orders')).toBe('`shop`.`orders`')
    expect(qualifiedName('oracle', '', 'orders')).toBe('"orders"')
  })

  it('escapes single quotes in literals', () => {
    expect(quoteLiteral("O'Brien")).toBe("'O''Brien'")
  })

  it('builds the page clause per dialect', () => {
    expect(pageClause('mysql', 500, 1000)).toBe('LIMIT 500 OFFSET 1000')
    expect(pageClause('oracle', 200, 0)).toBe('OFFSET 0 ROWS FETCH NEXT 200 ROWS ONLY')
    expect(pageClause('oceanbase-oracle', 100, 300)).toBe('OFFSET 300 ROWS FETCH NEXT 100 ROWS ONLY')
  })
})

describe('stripKeyword', () => {
  it('removes a leading keyword case-insensitively', () => {
    expect(stripKeyword('where id > 3', 'WHERE')).toBe('id > 3')
    expect(stripKeyword('ORDER BY id DESC;', 'ORDER\\s+BY')).toBe('id DESC')
  })

  it('keeps plain expressions and blanks empty input', () => {
    expect(stripKeyword('1 = 1', 'WHERE')).toBe('1 = 1')
    expect(stripKeyword('   ', 'WHERE')).toBe('')
  })
})

describe('filterExpression', () => {
  it('builds LIKE, equality and IS NULL filters', () => {
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'like', text: '北' })).toBe(
      "`city` LIKE '%北%'",
    )
    expect(filterExpression('mysql', column('id', 'int(11)'), { op: 'eq', text: '30' })).toBe('`id` = 30')
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'eq', text: '北京' })).toBe("`city` = '北京'")
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'isnull', text: '' })).toBe('`city` IS NULL')
  })

  it('treats a numeric string on a text column as a literal and skips empty text', () => {
    expect(filterExpression('mysql', column('code', 'varchar(10)'), { op: 'eq', text: '42' })).toBe("`code` = '42'")
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'like', text: '  ' })).toBeUndefined()
  })
})

describe('composeWhere', () => {
  const columns = [column('city', 'varchar(20)'), column('id', 'int')]

  it('joins the manual WHERE with column filters', () => {
    const where = composeWhere('mysql', 'WHERE id > 10', columns, { city: { op: 'like', text: '北' } })
    expect(where).toBe("(id > 10) AND `city` LIKE '%北%'")
  })

  it('returns just the filters when the manual box is empty', () => {
    expect(composeWhere('mysql', '', columns, { id: { op: 'eq', text: '7' } })).toBe('`id` = 7')
  })

  it('returns an empty string when nothing is set', () => {
    expect(composeWhere('mysql', '', columns, {})).toBe('')
  })
})

describe('isNumericType', () => {
  it('recognises numeric type names', () => {
    expect(isNumericType('int(11)')).toBe(true)
    expect(isNumericType('bigint unsigned')).toBe(true)
    expect(isNumericType('decimal(10,2)')).toBe(true)
    expect(isNumericType('varchar(20)')).toBe(false)
    expect(isNumericType('datetime')).toBe(false)
  })
})

describe('insertStatement', () => {
  const columns = [
    column('id', 'int'),
    column('name', 'varchar(20)'),
    column('price', 'decimal(10,2)'),
    column('note', 'varchar(100)'),
    column('active', 'tinyint(1)'),
  ]

  it('builds a MySQL INSERT with quoted literals, NULL and exact decimals', () => {
    expect(
      insertStatement('mysql', 'shop', 'orders', columns, [7, "O'Brien", '12.50', null, true]),
    ).toBe(
      "INSERT INTO `shop`.`orders` (`id`, `name`, `price`, `note`, `active`) VALUES (7, 'O''Brien', 12.50, NULL, TRUE);",
    )
  })

  it('uses double quotes for Oracle identifiers and keeps numeric strings raw', () => {
    const oracleColumns = [column('ID', 'NUMBER'), column('NAME', 'VARCHAR2(20)')]
    expect(insertStatement('oracle', 'SHOP', 'ORDERS', oracleColumns, ['7', '手机'])).toBe(
      'INSERT INTO "SHOP"."ORDERS" ("ID", "NAME") VALUES (7, \'手机\');',
    )
  })

  it('writes one INSERT per row and a trailing newline for the SQL export', () => {
    const exportColumns = [column('id', 'int'), column('name', 'varchar(20)')]
    expect(insertStatements('mysql', 'shop', 'categories', exportColumns, [[1, '手机'], [2, null]])).toBe(
      "INSERT INTO `shop`.`categories` (`id`, `name`) VALUES (1, '手机');\nINSERT INTO `shop`.`categories` (`id`, `name`) VALUES (2, NULL);\n",
    )
    expect(insertStatements('mysql', 'shop', 'categories', exportColumns, [])).toBe('')
  })
})

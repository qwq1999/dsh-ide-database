import { describe, expect, it } from 'vitest'
import {
  cellWhere,
  columnNames,
  composeWhere,
  filterExpression,
  insertStatement,
  insertStatements,
  isNumericType,
  isTemporalType,
  isTextType,
  temporalLiteral,
  pageClause,
  qualifiedName,
  quoteIdent,
  quoteLiteral,
  groupCountSql,
  inListOf,
  selectColumnsSql,
  stripWhere,
  tableFromStatement,
  tableSelectSql,
} from '../../src/client/tablesql.ts'

const column = (name, typeName) => ({ name, typeName, nullable: true, defaultValue: '', comment: '', primary: false })

describe('tablesql quoting', () => {
  it('quotes identifiers per dialect', () => {
    expect(quoteIdent('mysql', 'order')).toBe('`order`')
    expect(quoteIdent('oracle', 'ORDER')).toBe('"ORDER"')
    expect(qualifiedName('mysql', 'shop', 'orders')).toBe('`shop`.`orders`')
    expect(qualifiedName('oracle', '', 'orders')).toBe('"orders"')
  })

  it('escapes the dialect quote character inside identifiers', () => {
    expect(quoteIdent('mysql', 'a`b')).toBe('`a``b`')
    expect(quoteIdent('mssql', 'a]b')).toBe('[a]]b]')
    expect(quoteIdent('postgres', 'a"b')).toBe('"a""b"')
    expect(quoteIdent('oracle', 'a"b')).toBe('"a""b"')
  })

  it('escapes single quotes in literals', () => {
    expect(quoteLiteral("O'Brien")).toBe("'O''Brien'")
  })

  it('escapes backslashes as MySQL does but leaves standard SQL alone', () => {
    expect(quoteLiteral('C:\\temp', 'mysql')).toBe("'C:\\\\temp'")
    expect(quoteLiteral('C:\\temp', 'oracle')).toBe("'C:\\temp'")
    expect(quoteLiteral("O'Brien", 'mysql')).toBe("'O''Brien'")
  })

  it('builds the page clause per dialect', () => {
    expect(pageClause('mysql', 500, 1000)).toBe('LIMIT 500 OFFSET 1000')
    expect(pageClause('oracle', 200, 0)).toBe('OFFSET 0 ROWS FETCH NEXT 200 ROWS ONLY')
    expect(pageClause('oceanbase-oracle', 100, 300)).toBe('OFFSET 300 ROWS FETCH NEXT 100 ROWS ONLY')
  })
})

describe('stripWhere', () => {
  it('removes a leading keyword case-insensitively', () => {
    expect(stripWhere('where id > 3')).toBe('id > 3')
    expect(stripWhere('  WHERE   id > 3;  ')).toBe('id > 3')
  })

  it('keeps plain expressions and blanks empty input', () => {
    expect(stripWhere('1 = 1')).toBe('1 = 1')
    expect(stripWhere('   ')).toBe('')
  })
})

describe('filterExpression', () => {
  it('builds LIKE, equality and IS NULL filters', () => {
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'like', text: '北' })).toBe(
      "`city` LIKE '%北%' ESCAPE '!'",
    )
    expect(filterExpression('mysql', column('id', 'int(11)'), { op: 'eq', text: '30' })).toBe('`id` = 30')
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'eq', text: '北京' })).toBe("`city` = '北京'")
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'isnull', text: '' })).toBe('`city` IS NULL')
  })

  it('treats a numeric string on a text column as a literal and skips empty text', () => {
    expect(filterExpression('mysql', column('code', 'varchar(10)'), { op: 'eq', text: '42' })).toBe("`code` = '42'")
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'like', text: '  ' })).toBeUndefined()
  })

  it('matches LIKE metacharacters in the typed text literally', () => {
    expect(filterExpression('mysql', column('city', 'varchar(20)'), { op: 'like', text: '50%' })).toBe(
      "`city` LIKE '%50!%%' ESCAPE '!'",
    )
    expect(filterExpression('postgres', column('name', 'text'), { op: 'like', text: 'a_b' })).toBe(
      `"name" LIKE '%a!_b%' ESCAPE '!'`,
    )
    expect(filterExpression('oracle', column('name', 'VARCHAR2(20)'), { op: 'like', text: 'a!b' })).toBe(
      `"name" LIKE '%a!!b%' ESCAPE '!'`,
    )
  })

  it('casts non-text columns before a contains filter', () => {
    expect(filterExpression('postgres', column('id', 'integer'), { op: 'like', text: '12' })).toBe(
      `CAST("id" AS TEXT) LIKE '%12%' ESCAPE '!'`,
    )
    expect(filterExpression('postgres', column('created', 'timestamp(6)'), { op: 'like', text: '2024' })).toBe(
      `CAST("created" AS TEXT) LIKE '%2024%' ESCAPE '!'`,
    )
    expect(filterExpression('mysql', column('id', 'int'), { op: 'like', text: '12' })).toBe(
      "CAST(`id` AS CHAR) LIKE '%12%' ESCAPE '!'",
    )
    expect(filterExpression('oracle', column('ID', 'NUMBER'), { op: 'like', text: '12' })).toBe(
      `TO_CHAR("ID") LIKE '%12%' ESCAPE '!'`,
    )
    expect(filterExpression('oracle', column('created', 'DATE'), { op: 'like', text: '2024' })).toBe(
      `TO_CHAR("created", 'YYYY-MM-DD HH24:MI:SS') LIKE '%2024%' ESCAPE '!'`,
    )
    expect(filterExpression('mssql', column('created', 'datetime'), { op: 'like', text: '2024' })).toBe(
      `CONVERT(VARCHAR(23), [created], 121) LIKE '%2024%' ESCAPE '!'`,
    )
    expect(filterExpression('postgres', column('name', 'text'), { op: 'like', text: 'ab' })).toBe(
      `"name" LIKE '%ab%' ESCAPE '!'`,
    )
  })
})

describe('composeWhere', () => {
  const columns = [column('city', 'varchar(20)'), column('id', 'int')]

  it('joins the manual WHERE with column filters', () => {
    const where = composeWhere('mysql', 'WHERE id > 10', columns, { city: { op: 'like', text: '北' } })
    expect(where).toBe("(id > 10) AND `city` LIKE '%北%' ESCAPE '!'")
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

  it('matches the whole type name rather than a prefix', () => {
    expect(isNumericType('interval')).toBe(false)
    expect(isNumericType('integer[]')).toBe(false)
    expect(isNumericType('numeric[]')).toBe(false)
    expect(isNumericType('decimal(10,2)[]')).toBe(false)
    expect(isNumericType('numeric(10,2)[]')).toBe(false)
    expect(isNumericType('int identity')).toBe(true)
    expect(isNumericType('int4')).toBe(true)
    expect(isNumericType('float8')).toBe(true)
    expect(isNumericType('serial')).toBe(true)
    expect(isNumericType('bigserial')).toBe(true)
    expect(isNumericType('double precision')).toBe(true)
  })
})

describe('type families', () => {
  it('does not treat arrays as scalar character or temporal types', () => {
    expect(isTextType('character varying')).toBe(true)
    expect(isTextType('character varying(50)')).toBe(true)
    expect(isTextType('character varying[]')).toBe(false)
    expect(isTextType('text[]')).toBe(false)
    expect(isTemporalType('date[]')).toBe(false)
    expect(isTemporalType('smalldatetime')).toBe(true)
    expect(isTemporalType('timestamp(6) with local time zone')).toBe(true)
    expect(isTemporalType('timestamp(6) with time zone')).toBe(true)
    expect(isTemporalType('timestamp[]')).toBe(false)
  })

  it('casts a character varying array before a contains filter', () => {
    const tags = column('tags', 'character varying[]')
    expect(filterExpression('postgres', tags, { op: 'like', text: 'red' })).toBe(
      `CAST("tags" AS TEXT) LIKE '%red%' ESCAPE '!'`,
    )
    const span = column('span', 'interval')
    expect(filterExpression('postgres', span, { op: 'eq', text: '1' })).toBe(`"span" = '1'`)
  })
})

describe('tableFromStatement', () => {
  it('finds the table of plain SELECT / UPDATE / INSERT statements', () => {
    expect(tableFromStatement('select * from orders')).toEqual({ schema: '', table: 'orders' })
    expect(tableFromStatement('SELECT * FROM `shop`.`orders` WHERE id > 3')).toEqual({ schema: 'shop', table: 'orders' })
    expect(tableFromStatement('update "shop"."orders" set status = \'paid\'')).toEqual({ schema: 'shop', table: 'orders' })
    expect(tableFromStatement('insert into [shop].[orders] (id) values (1)')).toEqual({ schema: 'shop', table: 'orders' })
  })

  it('keeps quoted names with spaces and dots intact', () => {
    expect(tableFromStatement('insert into [Order Details] (id) values (1)', 'mssql')).toEqual({
      schema: '',
      table: 'Order Details',
    })
    expect(tableFromStatement('select * from [shop].[Order Details]', 'mssql')).toEqual({
      schema: 'shop',
      table: 'Order Details',
    })
    expect(tableFromStatement('select * from `order details`', 'mysql')).toEqual({ schema: '', table: 'order details' })
    expect(tableFromStatement('select * from "order details"')).toEqual({ schema: '', table: 'order details' })
    expect(tableFromStatement('select * from [my.table]', 'mssql')).toEqual({ schema: '', table: 'my.table' })
    expect(tableFromStatement('select * from [a]]b]', 'mssql')).toEqual({ schema: '', table: 'a]b' })
    expect(tableFromStatement('select * from [from orders]', 'mssql')).toEqual({ schema: '', table: 'from orders' })
  })

  it('uses the last two parts of a three-part SQL Server name', () => {
    expect(tableFromStatement('select * from [app].[dbo].[Order Details]', 'mssql')).toEqual({
      schema: 'dbo',
      table: 'Order Details',
    })
    expect(tableFromStatement('select * from app.dbo.orders')).toEqual({ schema: 'dbo', table: 'orders' })
  })

  it('skips subqueries without a plain table and returns null otherwise', () => {
    const nested = 'select * from (select * from shop.orders) x'
    expect(tableFromStatement(nested)).toEqual({ schema: 'shop', table: 'orders' })
    expect(tableFromStatement('select 1 + 1')).toBeNull()
    expect(tableFromStatement('begin')).toBeNull()
  })

  it('prefers the outer table over a subquery in the select list', () => {
    expect(tableFromStatement('select (select count(*) from logs) as n from users')).toEqual({
      schema: '',
      table: 'users',
    })
    expect(tableFromStatement('with recent as (select * from logs) select * from users')).toEqual({
      schema: '',
      table: 'users',
    })
    expect(tableFromStatement('select * from users where exists (select 1 from logs)')).toEqual({
      schema: '',
      table: 'users',
    })
  })

  it('ignores literals and comments that mention another table', () => {
    expect(tableFromStatement("select 'from users' as note, id from orders")).toEqual({ schema: '', table: 'orders' })
    expect(tableFromStatement('select 1 -- from users\nfrom orders')).toEqual({ schema: '', table: 'orders' })
    expect(tableFromStatement('select /* from users */ id from orders')).toEqual({ schema: '', table: 'orders' })
    expect(tableFromStatement('select $$from users$$ as note from orders', 'postgres')).toEqual({ schema: '', table: 'orders' })
    expect(tableFromStatement("select q'[from users]' as note from orders", 'oracle')).toEqual({ schema: '', table: 'orders' })
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

  it('writes SQL Server bit values as 1 and 0', () => {
    const mssqlColumns = [column('id', 'int'), column('active', 'bit')]
    expect(insertStatement('mssql', 'dbo', 'users', mssqlColumns, [1, true])).toBe(
      'INSERT INTO [dbo].[users] ([id], [active]) VALUES (1, 1);',
    )
    expect(insertStatement('mssql', 'dbo', 'users', mssqlColumns, [2, false])).toBe(
      'INSERT INTO [dbo].[users] ([id], [active]) VALUES (2, 0);',
    )
    expect(insertStatement('postgres', 'public', 'users', mssqlColumns, [3, true])).toBe(
      'INSERT INTO "public"."users" ("id", "active") VALUES (3, TRUE);',
    )
  })

  it('writes Oracle boolean values as 1 and 0', () => {
    const oracleColumns = [column('ID', 'NUMBER'), column('ACTIVE', 'NUMBER(1)')]
    expect(insertStatement('oracle', 'SHOP', 'USERS', oracleColumns, ['1', true])).toBe(
      'INSERT INTO "SHOP"."USERS" ("ID", "ACTIVE") VALUES (1, 1);',
    )
    expect(insertStatement('oceanbase-oracle', 'SHOP', 'USERS', oracleColumns, ['2', false])).toBe(
      'INSERT INTO "SHOP"."USERS" ("ID", "ACTIVE") VALUES (2, 0);',
    )
  })

  it('writes Oracle temporal values with typed literals', () => {
    const temporal = [column('ID', 'NUMBER'), column('DAY', 'DATE'), column('AT', 'TIMESTAMP(6)')]
    expect(
      insertStatement('oracle', 'SHOP', 'EVENTS', temporal, ['1', '2024-11-11 09:54:33', '2024-11-11 09:54:33.123']),
    ).toBe(
      `INSERT INTO "SHOP"."EVENTS" ("ID", "DAY", "AT") VALUES (1, TO_DATE('2024-11-11 09:54:33', 'YYYY-MM-DD HH24:MI:SS'), TO_TIMESTAMP('2024-11-11 09:54:33.123', 'YYYY-MM-DD HH24:MI:SS.FF'));`,
    )
    expect(
      insertStatement('oracle', 'SHOP', 'EVENTS', temporal, ['2', '2024-11-12 10:00', '2024-11-12 10:00']),
    ).toBe(
      `INSERT INTO "SHOP"."EVENTS" ("ID", "DAY", "AT") VALUES (2, TO_DATE('2024-11-12 10:00', 'YYYY-MM-DD HH24:MI'), TO_TIMESTAMP('2024-11-12 10:00', 'YYYY-MM-DD HH24:MI'));`,
    )
  })

  it('leaves server-generated columns out while keeping value positions aligned', () => {
    const generated = [
      { ...column('total', 'int'), generated: true },
      column('id', 'int'),
      column('name', 'varchar(20)'),
    ]
    expect(insertStatement('mysql', 'shop', 'orders', generated, [99, 7, "O'Brien"])).toBe(
      "INSERT INTO `shop`.`orders` (`id`, `name`) VALUES (7, 'O''Brien');",
    )
  })
})

describe('insert fidelity', () => {
  const path = 'C:\\temp'
  it('replays a backslash path unchanged on MySQL', () => {
    expect(insertStatement('mysql', 'shop', 'files', [column('id', 'int'), column('path', 'varchar(100)')], [1, path])).toBe(
      "INSERT INTO `shop`.`files` (`id`, `path`) VALUES (1, 'C:\\\\temp');",
    )
  })
  it('keeps the backslash as written on standard SQL', () => {
    expect(insertStatement('oracle', 'SHOP', 'FILES', [column('ID', 'NUMBER'), column('PATH', 'VARCHAR2(100)')], [1, path])).toBe(
      "INSERT INTO \"SHOP\".\"FILES\" (\"ID\", \"PATH\") VALUES (1, 'C:\\temp');",
    )
  })
})

describe('tableSelectSql', () => {
  it('builds the statement a table tab hands to the console', () => {
    expect(tableSelectSql('mysql', 'shop', 'orders', '', '', 500)).toBe(
      'SELECT * FROM `shop`.`orders` LIMIT 500 OFFSET 0',
    )
  })

  it('keeps the WHERE and ORDER BY the user typed', () => {
    expect(tableSelectSql('mysql', 'shop', 'orders', "status = 'paid'", 'created_at DESC', 200)).toBe(
      "SELECT * FROM `shop`.`orders` WHERE status = 'paid' ORDER BY created_at DESC LIMIT 200 OFFSET 0",
    )
  })

  it('uses the Oracle paging form and always asks for at least one row', () => {
    expect(tableSelectSql('oracle', 'SHOP', 'ORDERS', '', '', 0)).toBe(
      'SELECT * FROM "SHOP"."ORDERS" OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY',
    )
  })
})

describe('groupCountSql', () => {
  it('counts one column per group, quoted for the dialect', () => {
    const status = { name: 'status', typeName: 'VARCHAR' }
    expect(groupCountSql('mysql', 'shop', 'orders', status)).toBe(
      'SELECT `status`, COUNT(*) AS `count` FROM `shop`.`orders` GROUP BY `status` ORDER BY `count` DESC',
    )
    expect(groupCountSql('oracle', 'SHOP', 'ORDERS', status)).toBe(
      'SELECT "status", COUNT(*) AS "count" FROM "SHOP"."ORDERS" GROUP BY "status" ORDER BY "count" DESC',
    )
  })
})

describe('selectColumnsSql', () => {
  it('quotes the column list for the connection dialect', () => {
    const columns = [
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
    ]
    expect(selectColumnsSql('mysql', 'shop', 'orders', columns)).toBe(
      'SELECT `id`, `name` FROM `shop`.`orders`',
    )
    expect(selectColumnsSql('oracle', 'SHOP', 'ORDERS', columns)).toBe(
      'SELECT "id", "name" FROM "SHOP"."ORDERS"',
    )
  })

  it('falls back to a star when no columns are known yet', () => {
    expect(selectColumnsSql('mysql', 'shop', 'orders', [])).toBe('SELECT * FROM `shop`.`orders`')
  })
})

describe('cellWhere', () => {
  const column = { name: 'total', typeName: 'DECIMAL' }

  it('keeps numeric cells unquoted so indexes still match', () => {
    expect(cellWhere('mysql', column, 93.02)).toBe('`total` = 93.02')
    expect(cellWhere('oracle', column, 7)).toBe('"total" = 7')
  })

  it('quotes text and escapes backslashes on MySQL', () => {
    const backslash = String.fromCharCode(92)
    const path = 'C:' + backslash + "temp's"
    expect(cellWhere('mysql', { name: 'note', typeName: 'VARCHAR' }, path)).toBe(
      '`note` = ' + "'C:" + backslash + backslash + "temp''s'",
    )
    expect(cellWhere('oracle', { name: 'note', typeName: 'VARCHAR' }, "it's")).toBe(`"note" = 'it''s'`)
  })

  it('matches NULL and boolean cells', () => {
    expect(cellWhere('mysql', { name: 'note', typeName: 'VARCHAR' }, null)).toBe('`note` IS NULL')
    expect(cellWhere('mysql', { name: 'paid', typeName: 'BIT' }, true)).toBe('`paid` = TRUE')
    expect(cellWhere('mssql', { name: 'paid', typeName: 'BIT' }, true)).toBe('[paid] = 1')
    expect(cellWhere('mssql', { name: 'paid', typeName: 'BIT' }, false)).toBe('[paid] = 0')
    expect(cellWhere('oracle', { name: 'paid', typeName: 'NUMBER(1)' }, true)).toBe('"paid" = 1')
    expect(cellWhere('oceanbase-oracle', { name: 'paid', typeName: 'NUMBER(1)' }, false)).toBe('"paid" = 0')
    expect(cellWhere('generic', { name: 'paid', typeName: 'BIT' }, false)).toBe('"paid" = FALSE')
  })
})

describe('inListOf', () => {
  it('keeps numbers and NULLs bare and quotes text per dialect', () => {
    expect(inListOf('mysql', [[1], [2.5], [null], ['x']], 0)).toBe("(1, 2.5, NULL, 'x')")
    expect(inListOf('oracle', [['a'], [true]], 0)).toBe("('a', 1)")
    expect(inListOf('oceanbase-oracle', [[false]], 0)).toBe('(0)')
    expect(inListOf('mssql', [[true], [false]], 0)).toBe('(1, 0)')
  })

  it('escapes backslashes for MySQL literal text', () => {
    const backslash = String.fromCharCode(92)
    expect(inListOf('mysql', [['C:' + backslash + 'temp']], 0)).toBe("('C:" + backslash + backslash + "temp')")
  })

  it('uses the column type for typed values when it is known', () => {
    const day = column('D', 'DATE')
    expect(inListOf('oracle', [['2024-11-11 09:54:33'], ['2024-11-12 10:00']], 0, day)).toBe(
      `(TO_DATE('2024-11-11 09:54:33', 'YYYY-MM-DD HH24:MI:SS'), TO_DATE('2024-11-12 10:00', 'YYYY-MM-DD HH24:MI'))`,
    )
    expect(inListOf('oracle', [['7'], [null]], 0, column('N', 'NUMBER'))).toBe('(7, NULL)')
  })
})

describe('temporal literals', () => {
  it('wraps Oracle timestamp filters in TO_TIMESTAMP with an explicit format', () => {
    const timestamp = { name: 'CREATETIME', typeName: 'TIMESTAMP(6)' }
    expect(filterExpression('oracle', timestamp, { op: 'eq', text: '2024-11-11 09:54:33' })).toBe(
      `"CREATETIME" = TO_TIMESTAMP('2024-11-11 09:54:33', 'YYYY-MM-DD HH24:MI:SS')`,
    )
    expect(filterExpression('oracle', timestamp, { op: 'eq', text: '2024-11-11 09:54' })).toBe(
      `"CREATETIME" = TO_TIMESTAMP('2024-11-11 09:54', 'YYYY-MM-DD HH24:MI')`,
    )
    expect(filterExpression('oracle', timestamp, { op: 'eq', text: '2024-11-11 09:54:33.123' })).toBe(
      `"CREATETIME" = TO_TIMESTAMP('2024-11-11 09:54:33.123', 'YYYY-MM-DD HH24:MI:SS.FF')`,
    )
    expect(filterExpression('oracle', timestamp, { op: 'eq', text: '2024-11-11' })).toBe(
      `"CREATETIME" = TO_TIMESTAMP('2024-11-11', 'YYYY-MM-DD')`,
    )
  })

  it('uses TO_DATE for Oracle DATE columns and keeps time zone offsets typed', () => {
    const date = { name: 'DAY', typeName: 'DATE' }
    expect(cellWhere('oracle', date, '2024-11-11 09:54:33')).toBe(
      `"DAY" = TO_DATE('2024-11-11 09:54:33', 'YYYY-MM-DD HH24:MI:SS')`,
    )
    expect(cellWhere('oracle', date, '2024-11-11 09:54')).toBe(
      `"DAY" = TO_DATE('2024-11-11 09:54', 'YYYY-MM-DD HH24:MI')`,
    )
    const stamp = { name: 'AT', typeName: 'TIMESTAMP WITH TIME ZONE' }
    expect(temporalLiteral('oracle', stamp.typeName, '2024-11-11 09:54:33.123 +08:00')).toBe(
      `TO_TIMESTAMP_TZ('2024-11-11 09:54:33.123 +08:00', 'YYYY-MM-DD HH24:MI:SS.FF TZH:TZM')`,
    )
    expect(temporalLiteral('oracle', stamp.typeName, '2024-11-11 09:54 +8:00')).toBe(
      `TO_TIMESTAMP_TZ('2024-11-11 09:54 +8:00', 'YYYY-MM-DD HH24:MI TZH:TZM')`,
    )
    expect(temporalLiteral('oracle', stamp.typeName, '2024-11-11 +8:00')).toBe(
      `TO_TIMESTAMP_TZ('2024-11-11 +8:00', 'YYYY-MM-DD TZH:TZM')`,
    )
    // Oracle's own TIMESTAMP WITH TIME ZONE text uses a one-digit hour offset.
    const bridged = '2024-11-11 09:54:00.0 +8:00'
    expect(temporalLiteral('oracle', stamp.typeName, bridged)).toBe(
      `TO_TIMESTAMP_TZ('${bridged}', 'YYYY-MM-DD HH24:MI:SS.FF TZH:TZM')`,
    )
  })

  it('leaves other dialects and non-temporal text alone', () => {
    const column = { name: 'city', typeName: 'VARCHAR(20)' }
    expect(filterExpression('oracle', column, { op: 'eq', text: '2024-11-11' })).toBe(`"city" = '2024-11-11'`)
    expect(filterExpression('mysql', { name: 'CREATETIME', typeName: 'datetime' }, { op: 'eq', text: '2024-11-11 09:54:33' })).toBe(
      "`CREATETIME` = '2024-11-11 09:54:33'",
    )
    expect(temporalLiteral('oracle', 'VARCHAR(20)', '2024-11-11')).toBe("'2024-11-11'")
    expect(isTemporalType('DATETIME(3)')).toBe(true)
    expect(isTemporalType('VARCHAR(20)')).toBe(false)
  })
})

describe('columnNames', () => {
  it('joins quoted names and stays empty without columns', () => {
    const columns = [
      { name: 'id', typeName: 'INT' },
      { name: 'name', typeName: 'VARCHAR' },
    ]
    expect(columnNames('mysql', columns)).toBe('`id`, `name`')
    expect(columnNames('oracle', columns)).toBe('"id", "name"')
    expect(columnNames('mysql', [])).toBe('')
  })
})

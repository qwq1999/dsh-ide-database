import { describe, expect, it } from 'vitest'

import { complete } from '../../src/client/completion/engine'

const SCHEMAS = ['shop', 'crm']
const SHOP_TABLES = [
  { name: 'orders', kind: 'table' },
  { name: 'order_items', kind: 'view' },
  { name: 'customers', kind: 'table' },
]
const ORDER_COLUMNS = [
  { name: 'id', typeName: 'INT' },
  { name: 'total', typeName: 'DECIMAL' },
  { name: 'created_at', typeName: 'DATETIME' },
]
const ITEM_COLUMNS = [
  { name: 'order_id', typeName: 'INT' },
  { name: 'product_id', typeName: 'INT' },
]
const CUSTOMER_COLUMNS = [
  { name: 'id', typeName: 'INT' },
  { name: 'name', typeName: 'VARCHAR' },
]

function createCatalog(overrides = {}) {
  const calls = { schemas: 0, tables: [], columns: [] }
  const catalog = {
    schemas: async () => {
      calls.schemas += 1
      return SCHEMAS
    },
    tables: async (schema) => {
      calls.tables.push(schema)
      if (schema === 'shop') return SHOP_TABLES
      if (schema === 'crm') return [{ name: 'leads', kind: 'table' }]
      return []
    },
    columns: async (schema, table) => {
      calls.columns.push(`${schema}.${table}`)
      if (schema === 'shop' && table === 'orders') return ORDER_COLUMNS
      if (schema === 'shop' && table === 'order_items') return ITEM_COLUMNS
      if (schema === 'shop' && table === 'customers') return CUSTOMER_COLUMNS
      return []
    },
  }
  return Object.assign(catalog, overrides, { calls })
}

function request(statement, overrides = {}) {
  return {
    statement,
    caret: statement.length,
    dialect: 'mysql',
    schema: 'shop',
    catalog: createCatalog(overrides.catalog),
    ...overrides,
  }
}

const names = (result) => result.items.map((item) => item.name)

describe('complete relation context', () => {
  it('suggests tables of the current schema, then schemas, then keywords', async () => {
    const result = await complete(request('SELECT * FROM ord'))

    expect(result.analysis.expectation).toBe('relation')
    expect(names(result)).toEqual(['orders', 'order_items', 'ORDER'])
    // The identifier under the caret is not part of the already-typed context.
    expect(result.analysis.relations).toEqual([])
  })

  it('loads the tables of the current schema', async () => {
    const req = request('SELECT * FROM ord')
    await complete(req)
    expect(req.catalog.calls.tables).toContain('shop')
  })

  it('describes views', async () => {
    const result = await complete(request('SELECT * FROM order_items'))
    const view = result.items.find((item) => item.name === 'order_items')
    expect(view).toMatchObject({ name: 'order_items', kind: 'table', detail: '视图' })
  })

  it('suggests tables and keywords for a bare word too', async () => {
    const result = await complete(request('ord'))
    expect(result.analysis.expectation).toBe('any')
    expect(names(result)).toEqual(['orders', 'order_items', 'ORDER'])
  })
})

describe('complete column context', () => {
  it('suggests the columns of the referenced table with their types', async () => {
    const req = request('SELECT * FROM orders WHERE ')
    const result = await complete(req)

    expect(result.analysis.expectation).toBe('column')
    expect(result.items.slice(0, 3)).toEqual([
      { name: 'id', kind: 'column', detail: 'INT' },
      { name: 'total', kind: 'column', detail: 'DECIMAL' },
      { name: 'created_at', kind: 'column', detail: 'DATETIME' },
    ])
    expect(result.items.some((item) => item.name === '*')).toBe(true)
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('resolves an alias qualifier to its table columns', async () => {
    const req = request('SELECT * FROM orders o WHERE o.')
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('resolves a schema qualified table', async () => {
    const req = request('SELECT * FROM shop.orders.')
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('resolves a trailing qualified table name', async () => {
    const req = request('SELECT * FROM orders.')
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('falls back to the tables of a schema when the qualifier is a schema', async () => {
    const req = request('SELECT * FROM shop.')
    const result = await complete(req)
    expect(req.catalog.calls.columns).toContain('shop.shop')
    expect(req.catalog.calls.tables).toContain('shop')
    expect(names(result)).toEqual(['orders', 'order_items', 'customers'])
  })

  it('suggests functions and keywords at the end of a column list', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE cou'))
    expect(result.items[0]).toMatchObject({ name: 'COUNT', kind: 'function', insert: 'COUNT(' })
  })
})

describe('complete other contexts', () => {
  it('suggests statement keywords for bare input', async () => {
    const result = await complete(request('sel'))
    expect(result.analysis.expectation).toBe('any')
    expect(result.items[0]).toMatchObject({ name: 'SELECT', kind: 'keyword' })
  })

  it('suggests schemas for DDL', async () => {
    const result = await complete(request('CREATE '))
    expect(result.analysis.expectation).toBe('schema')
    expect(result.items.filter((item) => item.kind === 'schema').map((item) => item.name)).toEqual(
      SCHEMAS,
    )
  })
})

describe('complete failure handling', () => {
  it('degrades silently when the catalog fails', async () => {
    const catalog = createCatalog()
    catalog.columns = async () => {
      throw new Error('metadata unavailable')
    }
    const result = await complete(
      request('SELECT * FROM orders WHERE ', { catalog }),
    )
    expect(result.items.some((item) => item.name === 'COUNT')).toBe(true)
    expect(result.items.some((item) => item.name === 'created_at')).toBe(false)
  })

  it('degrades silently when the schema list fails', async () => {
    const catalog = createCatalog()
    catalog.schemas = async () => {
      throw new Error('metadata unavailable')
    }
    const result = await complete(request('SELECT * FROM ', { catalog }))
    expect(result.items.some((item) => item.name === 'orders')).toBe(true)
  })

  it('rejects with an AbortError when the request is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      complete(request('SELECT * FROM ord', { signal: controller.signal })),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('rejects with an AbortError when aborted mid-flight', async () => {
    const controller = new AbortController()
    let started
    const startedPromise = new Promise((resolve) => {
      started = resolve
    })
    const catalog = createCatalog()
    catalog.columns = () => {
      started()
      return new Promise(() => {})
    }
    const pending = complete(
      request('SELECT * FROM orders WHERE ', { catalog, signal: controller.signal }),
    )
    await startedPromise
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  })
})

describe('complete CTEs and derived tables', () => {
  it('uses CTE columns without asking the catalog', async () => {
    const req = request(
      'WITH x AS (SELECT id, total FROM orders) SELECT * FROM x WHERE ',
    )
    const result = await complete(req)
    expect(names(result).slice(0, 2)).toEqual(['id', 'total'])
    expect(req.catalog.calls.columns).not.toContain('shop.x')
  })

  it('resolves a cte. qualifier to the inferred columns', async () => {
    const req = request(
      'WITH x AS (SELECT id, total FROM orders) SELECT * FROM x WHERE x.',
    )
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'total'])
    expect(req.catalog.calls.columns).not.toContain('shop.x')
  })

  it('honours an explicit CTE column list', async () => {
    const result = await complete(
      request('WITH x(a, b) AS (SELECT id, total FROM orders) SELECT * FROM x WHERE x.'),
    )
    expect(names(result)).toEqual(['a', 'b'])
  })

  it('resolves a derived table alias to its inferred columns', async () => {
    const req = request(
      'SELECT * FROM (SELECT id, total AS amount FROM orders) d WHERE d.',
    )
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'amount'])
    expect(req.catalog.calls.columns).toEqual([])
  })

  it('suggests CTE names after FROM, before the catalog tables', async () => {
    const result = await complete(
      request('WITH x AS (SELECT id FROM orders) SELECT * FROM '),
    )
    expect(result.analysis.expectation).toBe('relation')
    expect(result.items[0]).toMatchObject({ name: 'x', kind: 'table', detail: 'CTE' })
  })

  it('merges CTE columns with a concrete table in WHERE', async () => {
    const req = request(
      'WITH x AS (SELECT id, total FROM orders) SELECT * FROM customers c JOIN x ON ',
    )
    const result = await complete(req)
    expect(names(result).slice(0, 3)).toEqual(['id', 'name', 'total'])
    expect(req.catalog.calls.columns).toContain('shop.customers')
    expect(req.catalog.calls.columns).not.toContain('shop.x')
  })

  it('includes a derived relation in an unqualified WHERE column list', async () => {
    const result = await complete(
      request('SELECT * FROM (SELECT id, total AS amount FROM orders) d WHERE '),
    )
    expect(names(result).slice(0, 2)).toEqual(['id', 'amount'])
  })

  it('expands a SELECT * CTE through the catalog', async () => {
    const req = request(
      'WITH recent AS (SELECT * FROM orders) SELECT * FROM recent r WHERE r.',
    )
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('expands a SELECT * derived table through the catalog', async () => {
    const req = request('SELECT * FROM (SELECT * FROM orders) d WHERE d.')
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('offers the columns of a SELECT * derived table without a qualifier', async () => {
    const req = request('SELECT * FROM (SELECT * FROM orders) d WHERE ')
    const result = await complete(req)
    expect(names(result).slice(0, 3)).toEqual(['id', 'total', 'created_at'])
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('follows a chained CTE through SELECT *', async () => {
    const req = request(
      'WITH a AS (SELECT * FROM orders), b AS (SELECT * FROM a) SELECT * FROM b WHERE b.',
    )
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('inherits CTE columns inside a derived table', async () => {
    const req = request(
      'WITH recent AS (SELECT * FROM orders) SELECT * FROM (SELECT * FROM recent) d WHERE d.',
    )
    const result = await complete(req)
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
  })
})

describe('complete snippets', () => {
  it('offers templates at the start of an empty statement', async () => {
    const result = await complete(request(''))
    expect(result.items[0]).toMatchObject({
      name: 'SELECT * FROM ',
      kind: 'snippet',
      insert: 'SELECT * FROM ',
    })
    expect(result.items.filter((item) => item.kind === 'snippet').length).toBeGreaterThanOrEqual(4)
  })

  it('offers templates on a fresh statement after a semicolon', async () => {
    const result = await complete(request('SELECT 1; '))
    expect(result.items[0].kind).toBe('snippet')
  })

  it('offers templates after only whitespace', async () => {
    const result = await complete(request('   '))
    expect(result.items[0].kind).toBe('snippet')
  })

  it('does not offer templates while typing a keyword', async () => {
    const result = await complete(request('sel'))
    expect(result.items.some((item) => item.kind === 'snippet')).toBe(false)
    expect(result.items[0]).toMatchObject({ name: 'SELECT', kind: 'keyword' })
  })

  it('does not offer templates inside a statement', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE '))
    expect(result.items.some((item) => item.kind === 'snippet')).toBe(false)
  })

  it('keeps insert equal to the template text for every snippet', async () => {
    const result = await complete(request(' '))
    const snippets = result.items.filter((item) => item.kind === 'snippet')
    expect(snippets.length).toBeGreaterThan(0)
    for (const snippet of snippets) expect(snippet.insert).toBe(snippet.name)
  })
})

const JOIN_TABLES = [
  { name: 'orders', kind: 'table' },
  { name: 'users', kind: 'table' },
  { name: 'customers', kind: 'table' },
]

const JOIN_COLUMNS = {
  'shop.orders': [
    { name: 'id', typeName: 'INT' },
    { name: 'user_id', typeName: 'INT' },
    { name: 'total', typeName: 'DECIMAL' },
  ],
  'shop.users': [
    { name: 'id', typeName: 'INT' },
    { name: 'name', typeName: 'VARCHAR' },
  ],
  'shop.customers': [
    { name: 'id', typeName: 'INT' },
    { name: 'name', typeName: 'VARCHAR' },
  ],
}

function createJoinCatalog() {
  const calls = { schemas: 0, tables: [], columns: [] }
  const catalog = {
    schemas: async () => ['shop'],
    tables: async (schema) => {
      calls.tables.push(schema)
      return schema === 'shop' ? JOIN_TABLES : []
    },
    columns: async (schema, table) => {
      calls.columns.push(`${schema}.${table}`)
      return JOIN_COLUMNS[`${schema}.${table}`] ?? []
    },
  }
  return Object.assign(catalog, { calls })
}

describe('complete JOIN suggestions', () => {
  it('suggests the table behind an _id column as a complete JOIN clause', async () => {
    const req = request('SELECT * FROM orders o JOIN ', { catalog: createJoinCatalog() })
    const result = await complete(req)

    expect(result.items[0]).toMatchObject({
      name: 'users',
      kind: 'table',
      detail: '关联 orders.user_id',
    })
    expect(result.items[0].insert).toMatch(/^users u\d* ON u\d*\.id = o\.user_id$/)
    expect(req.catalog.calls.tables).toContain('shop')
    expect(req.catalog.calls.columns).toContain('shop.orders')
    expect(req.catalog.calls.columns).toContain('shop.users')
  })

  it('uses the table name as the owner reference when there is no alias', async () => {
    const result = await complete(
      request('SELECT * FROM orders JOIN ', { catalog: createJoinCatalog() }),
    )
    expect(result.items[0]).toMatchObject({ name: 'users', detail: '关联 orders.user_id' })
    expect(result.items[0].insert).toContain('= orders.user_id')
  })

  it('does not suggest a table the statement already joined', async () => {
    const result = await complete(
      request('SELECT * FROM orders o JOIN users u ON u.id = o.user_id JOIN ', {
        catalog: createJoinCatalog(),
      }),
    )
    expect(result.items.every((item) => item.insert === undefined)).toBe(true)
  })

  it('keeps the ordinary candidates when no foreign key matches', async () => {
    const result = await complete(request('SELECT * FROM customers c JOIN '))
    expect(result.items.every((item) => item.insert === undefined)).toBe(true)
    expect(result.items[0]).toMatchObject({ name: 'c', kind: 'alias' })
    expect(names(result)).toContain('orders')
  })

  it('only suggests JOIN clauses in a JOIN position, not after FROM or a comma', async () => {
    const req = request('SELECT * FROM orders o, ', { catalog: createJoinCatalog() })
    const result = await complete(req)
    expect(result.items.every((item) => item.insert === undefined)).toBe(true)
    expect(names(result)).toContain('users')
  })

  it('degrades silently when the metadata fails', async () => {
    const catalog = createJoinCatalog()
    catalog.columns = async () => {
      throw new Error('metadata unavailable')
    }
    const result = await complete(request('SELECT * FROM orders o JOIN ', { catalog }))
    expect(result.items.every((item) => item.insert === undefined)).toBe(true)
    expect(names(result)).toContain('orders')
  })
})

describe('complete * expansion', () => {
  const star = (result) => result.items.find((item) => item.name === '*')

  it('expands * to the columns of a single referenced table', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE '))
    expect(star(result)).toMatchObject({
      name: '*',
      kind: 'column',
      detail: '展开 3 列',
      insert: 'id, total, created_at',
    })
  })

  it('qualifies the expansion with the alias', async () => {
    const result = await complete(request('SELECT * FROM orders o WHERE '))
    expect(star(result)?.insert).toBe('o.id, o.total, o.created_at')
  })

  it('expands every joined relation with its own qualifier', async () => {
    const result = await complete(
      request('SELECT * FROM orders o JOIN order_items i ON i.order_id = o.id WHERE '),
    )
    expect(star(result)?.insert).toBe(
      'o.id, o.total, o.created_at, i.order_id, i.product_id',
    )
  })

  it('keeps the plain * when a relation cannot be resolved', async () => {
    const result = await complete(
      request('SELECT * FROM orders o JOIN missing m ON m.id = o.id WHERE '),
    )
    expect(star(result)).toEqual({ name: '*', kind: 'column', detail: '所有列' })
  })
})

describe('complete ranking', () => {
  it('floats a recently picked name above an equally good match', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE ', { recent: ['total'] }))
    expect(result.items[0]?.name).toBe('total')
  })

  it('floats a frequently picked name above an equally good match', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE ', { frequency: { total: 2 } }))
    expect(result.items[0]?.name).toBe('total')
  })

  it('keeps catalog order when nothing was picked before', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE '))
    expect(result.items[0]?.name).toBe('id')
  })
})

describe('complete inside literals and comments', () => {
  it('returns no candidates without touching the catalog', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'SELECT * FROM orders -- note',
      caret: 27,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.inLiteral).toBe(true)
    expect(result.items).toEqual([])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('completes again once the literal is closed', async () => {
    const result = await complete(request("SELECT 'hi' "))
    expect(result.analysis.inLiteral).toBeUndefined()
    expect(result.items.length).toBeGreaterThan(0)
  })
})

describe('complete values and column definitions', () => {
  it('offers values instead of table columns inside VALUES', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'INSERT INTO orders VALUES (',
      caret: 27,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('value')
    expect(names(result)).toContain('DEFAULT')
    expect(names(result)).toContain('NOW')
    expect(names(result)).not.toContain('orders')
    expect(result.items.some((item) => item.kind === 'column' || item.kind === 'table')).toBe(false)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers DDL words instead of relations inside a CREATE TABLE body', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'CREATE TABLE new_table (',
      caret: 24,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('definition')
    expect(names(result)).toContain('PRIMARY')
    expect(names(result)).toContain('AUTO_INCREMENT')
    expect(names(result)).not.toContain('orders')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers ALTER actions instead of tables after the table name', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'ALTER TABLE orders ',
      caret: 19,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('alter')
    expect(names(result)).toContain('ADD')
    expect(names(result)).toContain('DROP')
    expect(names(result)).toContain('MODIFY')
    expect(names(result)).not.toContain('orders')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete ALTER TABLE objects', () => {
  it('offers object words instead of schema names after DROP', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'ALTER TABLE orders DROP ',
      caret: 24,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('alterObject')
    expect(names(result)).toContain('COLUMN')
    expect(names(result)).toContain('INDEX')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers columns to drop', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'ALTER TABLE orders DROP COLUMN ',
      caret: 31,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('column')
    expect(names(result).slice(0, 3)).toEqual(['id', 'total', 'created_at'])
    expect(catalog.calls.columns).toContain('shop.orders')
  })

  it('offers a definition for an added column', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'ALTER TABLE orders ADD COLUMN ',
      caret: 30,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('definition')
    expect(names(result)).toContain('NOT')
    expect(names(result)).toContain('DEFAULT')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
  })

  it('offers columns to modify or change', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'ALTER TABLE orders MODIFY COLUMN ',
      caret: 33,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('column')
    expect(names(result).slice(0, 3)).toEqual(['id', 'total', 'created_at'])
  })
})

describe('complete statement targets', () => {
  it('offers tables after GRANT ... ON', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'GRANT SELECT ON ',
      caret: 16,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('relation')
    expect(names(result)[0]).toBe('orders')
    expect(catalog.calls.tables).toContain('shop')
  })

  it('offers tables after DESC', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'DESC ',
      caret: 5,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('relation')
    expect(names(result)).toContain('orders')
  })

  it('offers tables after DROP INDEX ... ON', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'DROP INDEX idx ON ',
      caret: 18,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('relation')
    expect(names(result)[0]).toBe('orders')
  })

  it('offers the columns of the indexed table in ALTER TABLE ADD INDEX', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'ALTER TABLE orders ADD INDEX idx (',
      caret: 34,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('column')
    expect(names(result).slice(0, 3)).toEqual(['id', 'total', 'created_at'])
    expect(catalog.calls.columns).toContain('shop.orders')
  })
})

describe('complete CTE qualifiers', () => {
  it('offers the columns of a SELECT * CTE used as a qualifier', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'WITH recent AS (SELECT * FROM orders) SELECT recent.',
      caret: 52,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.qualifier).toEqual(['recent'])
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
    expect(catalog.calls.columns).toContain('shop.orders')
  })

  it('offers explicit CTE columns used as a qualifier', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'WITH recent AS (SELECT id, total FROM orders) SELECT recent.',
      caret: 60,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(names(result)).toEqual(['id', 'total'])
  })

  it('stays quiet for a CTE whose columns are unknown', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'WITH recent AS (SELECT 1) SELECT recent.',
      caret: 40,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.items).toEqual([])
  })

  it('does not mistake a CTE name for a schema with tables', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'WITH orders AS (SELECT 1) SELECT orders.',
      caret: 40,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.items).toEqual([])
  })
})

describe('complete DDL tails', () => {
  it('offers tables after IF EXISTS', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'DROP TABLE IF EXISTS ',
      caret: 21,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('tableName')
    expect(result.analysis.relations).toEqual([])
    expect(names(result)[0]).toBe('orders')
    expect(catalog.calls.tables).toContain('shop')
  })

  it('offers table options after a CREATE TABLE body', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'CREATE TABLE t (id INT) ',
      caret: 24,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('tableOptions')
    expect(names(result)).toContain('ENGINE')
    expect(names(result)).toContain('COMMENT')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers a statement keyword after CREATE TABLE ... AS', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'CREATE TABLE t (id INT) AS ',
      caret: 27,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('keyword')
    expect(names(result)).toContain('SELECT')
    expect(result.items.some((item) => item.kind === 'table')).toBe(false)
  })
})

describe('complete CREATE INDEX', () => {
  it('offers tables after ON', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'CREATE INDEX idx ON ',
      caret: 20,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('tableName')
    expect(names(result)).toContain('orders')
    expect(result.items.some((item) => item.kind === 'table')).toBe(true)
  })

  it('offers the columns of the indexed table', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'CREATE INDEX idx ON orders (',
      caret: 28,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('column')
    expect(names(result).slice(0, 3)).toEqual(['id', 'total', 'created_at'])
    expect(catalog.calls.columns).toContain('shop.orders')
  })
})

describe('complete subquery bodies', () => {
  it('offers statement keywords at the start of a CTE body', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'WITH recent AS (',
      caret: 16,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('keyword')
    expect(names(result)).toContain('SELECT')
    expect(result.items.some((item) => item.kind === 'table')).toBe(false)
  })

  it('offers statement keywords at the start of a derived table', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'SELECT * FROM (',
      caret: 15,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('keyword')
    expect(names(result)).toContain('SELECT')
    expect(result.items.some((item) => item.kind === 'table')).toBe(false)
  })
})

describe('complete LIMIT/OFFSET and ENGINE positions', () => {
  it('stays quiet after LIMIT and OFFSET', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'SELECT * FROM orders LIMIT ',
      caret: 27,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('number')
    expect(result.items).toEqual([])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('stays quiet after OFFSET', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'SELECT * FROM orders LIMIT 10 OFFSET ',
      caret: 37,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('number')
    expect(result.items).toEqual([])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers storage engines after ENGINE =', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'CREATE TABLE t (id INT) ENGINE = ',
      caret: 33,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('engine')
    expect(names(result)).toContain('InnoDB')
    expect(names(result)).toContain('MyISAM')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete SET and CAST positions', () => {
  it('offers SET words instead of functions', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('SET '), catalog })
    expect(result.analysis.expectation).toBe('set')
    expect(names(result)).toContain('NAMES')
    expect(names(result)).toContain('SESSION')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers character sets after SET NAMES', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('SET NAMES '), catalog })
    expect(result.analysis.expectation).toBe('charset')
    expect(names(result)).toContain('utf8mb4')
    expect(names(result)).toContain('gbk')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers cast types after AS inside CAST', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('SELECT CAST(id AS '), catalog })
    expect(result.analysis.expectation).toBe('type')
    expect(names(result)).toContain('SIGNED')
    expect(names(result)).toContain('DECIMAL')
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers inserted table columns after ON DUPLICATE KEY UPDATE', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('INSERT INTO orders (id) VALUES (1) ON DUPLICATE KEY UPDATE '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('column')
    expect(names(result).slice(0, 3)).toEqual(['id', 'total', 'created_at'])
    expect(catalog.calls.columns).toContain('shop.orders')
  })
})

describe('complete CREATE TABLE option values', () => {
  it('offers character sets after DEFAULT CHARSET', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('CREATE TABLE t (id INT) DEFAULT CHARSET '), catalog })
    expect(result.analysis.expectation).toBe('charset')
    expect(names(result)).toContain('utf8mb4')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('returns to table options after an engine name', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('CREATE TABLE t (id INT) ENGINE = InnoDB '), catalog })
    expect(result.analysis.expectation).toBe('tableOptions')
    expect(names(result)).toContain('COMMENT')
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete name-only and statement positions', () => {
  it('stays quiet where only a new name makes sense', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('DROP INDEX '), catalog })
    expect(result.analysis.expectation).toBe('name')
    expect(result.items).toEqual([])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers statement starters after EXPLAIN', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('EXPLAIN '), catalog })
    expect(result.analysis.expectation).toBe('statement')
    expect(names(result)).toContain('SELECT')
    expect(names(result)).not.toContain('FROM')
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers SHOW subcommands', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('SHOW '), catalog })
    expect(result.analysis.expectation).toBe('show')
    expect(names(result)).toContain('TABLES')
    expect(names(result)).toContain('STATUS')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete statement continuation positions', () => {
  it('offers statement starters after UNION and CREATE TABLE AS', async () => {
    for (const statement of ['SELECT * FROM orders UNION ', 'CREATE TABLE t AS ']) {
      const catalog = createCatalog()
      const result = await complete({ ...request(statement), catalog })
      expect(result.analysis.expectation).toBe('statement')
      expect(names(result)).toContain('SELECT')
      expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
    }
  })

  it('offers the explained statement after EXPLAIN ANALYZE', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('EXPLAIN ANALYZE '), catalog })
    expect(result.analysis.expectation).toBe('statement')
    expect(names(result)).toContain('SELECT')
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('stays quiet after a completed SHOW command', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('SHOW ENGINES '), catalog })
    expect(result.analysis.expectation).toBe('number')
    expect(result.items).toEqual([])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers tables for SHOW CREATE TABLE', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('SHOW CREATE TABLE '), catalog })
    expect(result.analysis.expectation).toBe('tableName')
    expect(names(result)).toContain('orders')
    expect(catalog.calls.tables.length).toBeGreaterThan(0)
  })

  it('stays quiet after a completed SHOW COLUMNS target', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('SHOW COLUMNS FROM orders '), catalog })
    expect(result.analysis.expectation).toBe('name')
    expect(result.items).toEqual([])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete DDL and tail leftovers', () => {
  it('offers table option values only where they apply', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('CREATE TABLE t (id INT) DEFAULT '), catalog })
    expect(result.analysis.expectation).toBe('value')
    expect(names(result)).toContain('NULL')
    expect(result.items.some((item) => item.kind === 'table')).toBe(false)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('stays quiet after COMMENT and DESCRIBE targets', async () => {
    for (const statement of [
      'CREATE TABLE t (id INT) COMMENT ',
      'DESCRIBE orders ',
      'CREATE USER ',
      'SELECT * FROM orders LIMIT 10 ',
    ]) {
      const catalog = createCatalog()
      const result = await complete({ ...request(statement), catalog })
      expect(result.items).toEqual([])
      expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
    }
  })

  it('offers statements after a CTE or CREATE VIEW header', async () => {
    for (const statement of ['WITH x AS (SELECT 1) ', 'CREATE VIEW v AS ', 'EXPLAIN FORMAT=TREE ']) {
      const catalog = createCatalog()
      const result = await complete({ ...request(statement), catalog })
      expect(result.analysis.expectation).toBe('statement')
      expect(names(result)).toContain('SELECT')
      expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
    }
  })

  it('offers source tables for CREATE TABLE ... LIKE', async () => {
    const catalog = createCatalog()
    const result = await complete({ ...request('CREATE TABLE t LIKE '), catalog })
    expect(result.analysis.expectation).toBe('tableName')
    expect(names(result)).toContain('orders')
    expect(catalog.calls.tables.length).toBeGreaterThan(0)
  })
})

describe('complete condition and ordering tails', () => {
  it('offers comparison words after a condition operand', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('SELECT * FROM orders WHERE total '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('comparison')
    for (const word of ['LIKE', 'IN', 'IS', 'BETWEEN']) {
      expect(names(result)).toContain(word)
    }
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers connectors after a finished comparison', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('SELECT * FROM orders WHERE id = 1 '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('boolean')
    expect(names(result)).toEqual(['AND', 'OR'])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers sort directions after an ORDER BY item', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('SELECT * FROM orders ORDER BY total '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('direction')
    expect(names(result)).toEqual(['ASC', 'DESC'])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers LIMIT and OFFSET after a sort direction', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('SELECT * FROM orders ORDER BY total DESC '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('orderTail')
    expect(names(result)).toEqual(['LIMIT', 'OFFSET'])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete finished expressions and parameters', () => {
  it('offers connectors after a parameter comparison', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('SELECT * FROM orders WHERE id = ? '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('boolean')
    expect(names(result)).toEqual(['AND', 'OR'])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers connectors after a finished IN list', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('SELECT * FROM orders WHERE id IN (1, 2) '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('boolean')
    expect(names(result)).toEqual(['AND', 'OR'])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers clauses after a complete select-list expression', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('SELECT COUNT(*) '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('expressionTail')
    for (const word of ['AS', 'FROM', 'WHERE', 'GROUP']) {
      expect(names(result)).toContain(word)
    }
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers clauses after a whole CASE expression', async () => {
    const result = await complete({
      ...request('SELECT CASE WHEN id = 1 THEN 1 END '),
    })
    expect(result.analysis.expectation).toBe('expressionTail')
    expect(names(result)).toContain('AS')
  })

  it('offers column options after a finished ALTER COLUMN definition', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('ALTER TABLE orders ADD COLUMN x INT '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('definition')
    expect(names(result)).toContain('NOT')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete grouping and table tails', () => {
  it('offers GROUP BY clauses after a grouped column', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('SELECT * FROM orders GROUP BY status '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('groupTail')
    expect(names(result)).toEqual(['HAVING', 'ORDER', 'LIMIT', 'WITH'])
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers the duplicate key clause after an INSERT tuple', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request('INSERT INTO orders VALUES (1, 2) '),
      catalog,
    })
    expect(result.analysis.expectation).toBe('insertTail')
    expect(names(result)).toEqual(['ON DUPLICATE KEY UPDATE'])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers statement keywords inside EXISTS parentheses', async () => {
    const result = await complete({
      ...request('SELECT * FROM orders WHERE NOT EXISTS ('),
    })
    expect(result.analysis.expectation).toBe('keyword')
    expect(names(result)).toContain('SELECT')
  })

  it('quiets completed table statements', async () => {
    const dropped = await complete({ ...request('DROP TABLE orders ') })
    expect(dropped.analysis.expectation).toBe('number')
    expect(dropped.items).toEqual([])
    const renamed = await complete({ ...request('RENAME TABLE orders TO ') })
    expect(renamed.analysis.expectation).toBe('name')
    expect(renamed.items).toEqual([])
  })

  it('quiets a closed CREATE INDEX column list', async () => {
    const result = await complete({ ...request('CREATE INDEX idx ON orders (id) ') })
    expect(result.analysis.expectation).toBe('number')
    expect(result.items).toEqual([])
  })
})

describe('complete literal comparisons and lock tails', () => {
  it('offers connectors after a string comparison', async () => {
    const catalog = createCatalog()
    const result = await complete({
      ...request("SELECT * FROM orders WHERE status = 'paid' "),
      catalog,
    })
    expect(result.analysis.expectation).toBe('boolean')
    expect(names(result)).toEqual(['AND', 'OR'])
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers connectors after a LIKE literal', async () => {
    const result = await complete({
      ...request("SELECT * FROM orders WHERE name LIKE 'a%' "),
    })
    expect(result.analysis.expectation).toBe('boolean')
    expect(names(result)).toEqual(['AND', 'OR'])
  })

  it('quiets a trailing lock clause', async () => {
    const result = await complete({ ...request('SELECT * FROM orders FOR UPDATE ') })
    expect(result.analysis.expectation).toBe('number')
    expect(result.items).toEqual([])
  })

  it('offers values after INSERT ... SET col =', async () => {
    const result = await complete({ ...request('INSERT INTO orders SET total = ') })
    expect(result.analysis.expectation).toBe('value')
    expect(names(result)).toContain('NULL')
  })
})

describe('complete aliases written after the caret', () => {
  it('expands a select-list alias whose FROM is typed later', async () => {
    const req = request('SELECT o. FROM orders o', { caret: 9 })
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('column')
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('finds the alias among several later relations', async () => {
    const result = await complete(
      request('SELECT o. , c.name FROM orders o JOIN customers c ON c.id = o.user_id', {
        caret: 9,
      }),
    )
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
  })

  it('resolves an alias inside a function call', async () => {
    const result = await complete(request('SELECT COUNT(o. ) FROM orders o', { caret: 15 }))
    expect(names(result)).toEqual(['id', 'total', 'created_at'])
  })

  it('still treats a schema qualifier as a schema', async () => {
    const result = await complete(request('SELECT shop. FROM orders o', { caret: 12 }))
    expect(names(result)).toEqual(['orders', 'order_items', 'customers'])
    expect(result.items.every((item) => item.kind === 'table')).toBe(true)
  })
})

describe('complete boolean, insert and join tails', () => {
  it('offers literals after IS', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE id IS '))
    expect(result.analysis.expectation).toBe('value')
    expect(names(result).slice(0, 4)).toEqual(['DEFAULT', 'NULL', 'TRUE', 'FALSE'])
  })

  it('offers operators after NOT', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE id NOT '))
    expect(result.analysis.expectation).toBe('comparison')
    expect(names(result)).toEqual(['LIKE', 'IN', 'IS', 'NOT', 'BETWEEN', 'REGEXP'])
  })

  it('offers the row source after an INSERT column list', async () => {
    const result = await complete(request('INSERT INTO orders (id) '))
    expect(result.analysis.expectation).toBe('insertSource')
    expect(names(result)).toEqual(['VALUES', 'SELECT', 'SET'])
  })

  it('offers clause tails after JOIN USING', async () => {
    const result = await complete(
      request('SELECT * FROM orders o JOIN customers c USING (id) '),
    )
    expect(result.analysis.expectation).toBe('joinTail')
    expect(names(result)).toContain('JOIN')
    expect(names(result)).toContain('WHERE')
  })

  it('offers SELECT inside an IN parenthesis', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE id IN ('))
    expect(result.analysis.expectation).toBe('keyword')
    expect(names(result)).toContain('SELECT')
    expect(result.items.some((item) => item.kind === 'table')).toBe(false)
  })
})

describe('complete alias names, window tails and early select lists', () => {
  it('stays quiet while a name is typed after AS', async () => {
    const result = await complete(request('SELECT id AS '))
    expect(result.analysis.expectation).toBe('name')
    expect(result.items).toEqual([])
  })

  it('offers AS/FROM after a window expression', async () => {
    const result = await complete(request('SELECT ROW_NUMBER() OVER (PARTITION BY user_id) '))
    expect(result.analysis.expectation).toBe('expressionTail')
    expect(names(result)).toEqual(['AS', 'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'UNION', 'AND', 'OR'])
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
  })

  it('offers SELECT after ANY parentheses', async () => {
    const result = await complete(request('SELECT * FROM orders WHERE id = ANY ('))
    expect(result.analysis.expectation).toBe('keyword')
    expect(names(result)).toContain('SELECT')
    expect(result.items.some((item) => item.kind === 'table')).toBe(false)
  })

  it('uses a FROM written after the select list', async () => {
    const req = request('SELECT id FROM orders', { caret: 9 })
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('column')
    // The caret prefix still narrows the list, but the later FROM supplied the columns.
    expect(names(result)).toContain('id')
    expect(req.catalog.calls.columns).toContain('shop.orders')
  })

  it('does not invent relations before any FROM exists', async () => {
    const result = await complete(request('SELECT id '))
    expect(result.analysis.relations).toEqual([])
    expect(names(result)).not.toContain('id')
  })
})

describe('complete USING, OVER and GRANT positions', () => {
  it('offers only the columns both sides share in USING', async () => {
    const req = request('SELECT * FROM orders o JOIN customers c USING (')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('using')
    expect(names(result)).toEqual(['id'])
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ name: 'id', kind: 'column', detail: 'INT' })
    expect(req.catalog.calls.columns).toContain('shop.orders')
    expect(req.catalog.calls.columns).toContain('shop.customers')
  })

  it('offers window keywords inside OVER', async () => {
    const req = request('SELECT ROW_NUMBER() OVER (')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('over')
    expect(names(result)).toEqual(['PARTITION', 'ORDER', 'RANGE', 'ROWS', 'GROUPS'])
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(req.catalog.calls.columns).toEqual([])
  })

  it('offers privileges for GRANT and REVOKE', async () => {
    const grant = await complete(request('GRANT '))
    expect(grant.analysis.expectation).toBe('privilege')
    expect(names(grant)).toContain('SELECT')
    expect(names(grant)).toContain('ALL')
    expect(grant.items.every((item) => item.kind === 'keyword')).toBe(true)

    const revoke = await complete(request('REVOKE '))
    expect(names(revoke)).toContain('DELETE')
    expect(revoke.items.every((item) => item.kind === 'keyword')).toBe(true)
  })

  it('stays quiet after LIKE and after a typed grantee', async () => {
    const like = request('SELECT * FROM orders WHERE name LIKE ')
    const likeResult = await complete(like)
    expect(likeResult.analysis.expectation).toBe('number')
    expect(likeResult.items).toEqual([])
    expect(like.catalog.calls.columns).toEqual([])

    const grantee = await complete(request('GRANT SELECT ON orders TO alice '))
    expect(grantee.analysis.expectation).toBe('number')
    expect(grantee.items).toEqual([])
  })
})


describe('complete collation, grant option and lock positions', () => {
  it('offers collation names after COLLATE', async () => {
    const req = request('SELECT * FROM orders ORDER BY name COLLATE ')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('collation')
    expect(names(result)).toContain('utf8mb4_general_ci')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(req.catalog.calls.columns).toEqual([])
  })

  it('offers GRANT/ADMIN then OPTION after WITH', async () => {
    const withOption = await complete(request('GRANT SELECT ON orders TO alice WITH '))
    expect(names(withOption)).toEqual(['GRANT', 'ADMIN'])

    const option = await complete(request('GRANT SELECT ON orders TO alice WITH GRANT '))
    expect(names(option)).toEqual(['OPTION'])
  })

  it('lists databases when dropping one', async () => {
    const result = await complete(request('DROP DATABASE '))
    expect(result.analysis.expectation).toBe('database')
    expect(names(result)).toEqual(SCHEMAS)
  })

  it('offers the lock clause after FOR', async () => {
    const result = await complete(request('SELECT * FROM orders FOR '))
    expect(result.analysis.expectation).toBe('lock')
    expect(names(result)).toEqual(['UPDATE', 'SHARE'])
  })
})

describe('complete database names and index collations', () => {
  it('offers only existing databases for USE', async () => {
    const req = request('USE ')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('database')
    expect(names(result)).toEqual(SCHEMAS)
    expect(result.items.every((item) => item.kind === 'schema')).toBe(true)
  })

  it('offers collations inside index and column definitions', async () => {
    for (const statement of [
      'CREATE INDEX idx ON orders (name COLLATE ',
      'CREATE TABLE t (name COLLATE ',
    ]) {
      const req = request(statement)
      const result = await complete(req)
      expect(result.analysis.expectation).toBe('collation')
      expect(names(result)).toContain('utf8mb4_general_ci')
      expect(req.catalog.calls.columns).toEqual([])
    }
  })
})

describe('complete CREATE names and ALTER column tails', () => {
  it('quietly names a new table, view or procedure', async () => {
    for (const statement of ['CREATE TABLE ', 'CREATE VIEW ']) {
      const req = request(statement)
      const result = await complete(req)
      expect(result.analysis.expectation).toBe('name')
      expect(result.items).toEqual([])
      expect(req.catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
    }
    const call = await complete(request('CALL my_proc('))
    expect(call.analysis.expectation).toBe('number')
    expect(call.items).toEqual([])
  })

  it('offers table options once a new table is named', async () => {
    const req = request('CREATE TABLE t ')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('tableOptions')
    expect(names(result)).toContain('AS')
    expect(names(result)).toContain('ENGINE')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(req.catalog.calls.tables).toEqual([])
  })

  it('keeps DROP VIEW a relation list', async () => {
    const req = request('DROP VIEW ')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('tableName')
    expect(names(result)[0]).toBe('orders')
    expect(req.catalog.calls.tables).toContain('shop')
  })

  it('follows ALTER TABLE column renames and changes', async () => {
    const rename = await complete(request('ALTER TABLE orders RENAME COLUMN id TO '))
    expect(rename.analysis.expectation).toBe('name')
    expect(rename.items).toEqual([])

    const constraint = await complete(request('ALTER TABLE orders ADD CONSTRAINT '))
    expect(constraint.analysis.expectation).toBe('name')
    expect(constraint.items).toEqual([])

    const change = await complete(request('ALTER TABLE orders CHANGE COLUMN id new_id '))
    expect(change.analysis.expectation).toBe('definition')
    expect(names(change)).toContain('NOT')

    const another = await complete(request('ALTER TABLE orders DROP PRIMARY KEY, '))
    expect(another.analysis.expectation).toBe('alter')
    expect(names(another)).toEqual(['ADD', 'DROP', 'MODIFY', 'CHANGE', 'RENAME', 'ALTER'])
  })
})

describe('complete window and interval positions', () => {
  it('offers window parts at the start of a specification', async () => {
    const result = await complete(request('SELECT ROW_NUMBER() OVER ('))
    expect(result.analysis.expectation).toBe('over')
    expect(names(result)).toEqual(['PARTITION', 'ORDER', 'RANGE', 'ROWS', 'GROUPS'])
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
  })

  it('offers frame bounds after ROWS', async () => {
    const result = await complete(request('SELECT SUM(total) OVER (ROWS '))
    expect(result.analysis.expectation).toBe('frame')
    expect(names(result)).toEqual(['BETWEEN', 'UNBOUNDED', 'CURRENT', 'ROW', 'PRECEDING', 'FOLLOWING'])
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
  })

  it('offers interval units', async () => {
    for (const statement of ['SELECT CURRENT_DATE + INTERVAL ', 'SELECT DATE_ADD(created_at, INTERVAL 1 ']) {
      const result = await complete(request(statement))
      expect(result.analysis.expectation).toBe('interval')
      expect(names(result)).toContain('DAY')
      expect(names(result)).toContain('YEAR')
      expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    }
  })

  it('stays quiet after a SHOW FULL COLUMNS object', async () => {
    const req = request('SHOW FULL COLUMNS FROM orders ')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('name')
    expect(result.items).toEqual([])
    expect(req.catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete VALUES, index and window-name tails', () => {
  it('waits for the next VALUES tuple without offering a value', async () => {
    const req = request('INSERT INTO orders VALUES (1, 2), ')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('number')
    expect(result.items).toEqual([])
    expect(req.catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers index methods after CREATE INDEX ... USING', async () => {
    const req = request('CREATE INDEX idx ON orders (id) USING ')
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('indexMethod')
    expect(names(result)).toEqual(['BTREE', 'HASH'])
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
  })

  it('stays quiet after complete ADD/DROP INDEX specifications', async () => {
    for (const statement of [
      'ALTER TABLE orders ADD INDEX idx (id) ',
      'ALTER TABLE orders DROP INDEX idx ',
    ]) {
      const req = request(statement)
      const result = await complete(req)
      expect(result.analysis.expectation).toBe('number')
      expect(result.items).toEqual([])
      expect(req.catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
    }
    const named = await complete(request('ALTER TABLE orders ADD INDEX '))
    expect(named.analysis.expectation).toBe('name')
    expect(named.items).toEqual([])
  })

  it('finishes named window references', async () => {
    for (const statement of [
      'SELECT SUM(total) OVER w ',
      'SELECT SUM(total) OVER w FROM orders WINDOW w AS (PARTITION BY status ORDER BY id) ',
    ]) {
      const req = request(statement)
      const result = await complete(req)
      expect(result.analysis.expectation).toBe('expressionTail')
      expect(names(result).slice(0, 2)).toEqual(['AS', 'FROM'])
      expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
      expect(req.catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
    }
  })

  it('stays quiet after a SHOW LIKE pattern', async () => {
    const req = request("SHOW VARIABLES LIKE 'max%' ")
    const result = await complete(req)
    expect(result.analysis.expectation).toBe('number')
    expect(result.items).toEqual([])
    expect(req.catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })
})

describe('complete relation name and literal tails', () => {
  it('offers only catalog rows for a DDL table name', async () => {
    for (const statement of [
      'ANALYZE TABLE ',
      'TRUNCATE TABLE ',
      'DROP TABLE ',
      'SHOW CREATE TABLE ',
    ]) {
      const catalog = createCatalog()
      const result = await complete({
        statement,
        caret: statement.length,
        dialect: 'mysql',
        schema: 'shop',
        catalog,
      })
      expect(result.analysis.expectation).toBe('tableName')
      expect(names(result)).toContain('orders')
      expect(names(result)).not.toContain('WHERE')
      expect(result.items.some((item) => item.kind === 'keyword')).toBe(false)
    }
  })

  it('stays quiet where only user text fits', async () => {
    const catalog = createCatalog()
    for (const statement of [
      'SELECT * FROM orders INTO OUTFILE ',
      'PREPARE stmt FROM ',
      'UNLOCK TABLES ',
    ]) {
      const result = await complete({
        statement,
        caret: statement.length,
        dialect: 'mysql',
        schema: 'shop',
        catalog,
      })
      expect(result.analysis.expectation).toBe('number')
      expect(result.items).toEqual([])
    }
    expect(catalog.calls).toEqual({ schemas: 0, tables: [], columns: [] })
  })

  it('offers the clauses left after WITH ROLLUP', async () => {
    const catalog = createCatalog()
    const result = await complete({
      statement: 'SELECT * FROM orders GROUP BY status WITH ROLLUP ',
      caret: 50,
      dialect: 'mysql',
      schema: 'shop',
      catalog,
    })
    expect(result.analysis.expectation).toBe('rollupTail')
    expect(names(result)).toEqual(['HAVING', 'ORDER', 'LIMIT'])
  })
})

describe('complete alter options, lock tables and duplicate updates', () => {
  it('offers engine names after ALTER TABLE ... ENGINE =', async () => {
    const req = request('ALTER TABLE orders ENGINE = ')
    const result = await complete(req)

    expect(result.analysis.expectation).toBe('engine')
    expect(names(result)).toContain('InnoDB')
    expect(result.items.every((item) => item.kind === 'keyword')).toBe(true)
    expect(req.catalog.calls.schemas).toBe(0)
    expect(req.catalog.calls.tables).toEqual([])
    expect(req.catalog.calls.columns).toEqual([])
  })

  it('continues with table options after the engine name', async () => {
    const result = await complete(request('ALTER TABLE orders ENGINE = InnoDB '))

    expect(result.analysis.expectation).toBe('tableOptions')
    expect(names(result)).toContain('COMMENT')
  })

  it('assigns a value in ON DUPLICATE KEY UPDATE', async () => {
    const req = request('INSERT INTO orders VALUES (1) ON DUPLICATE KEY UPDATE total = ')
    const result = await complete(req)

    expect(result.analysis.expectation).toBe('value')
    expect(names(result)).toContain('DEFAULT')
    expect(req.catalog.calls.columns).toEqual([])
  })

  it('keeps RENAME INDEX names quiet', async () => {
    const req = request('ALTER TABLE orders RENAME INDEX idx TO ')
    const result = await complete(req)

    expect(result.analysis.expectation).toBe('name')
    expect(result.items).toEqual([])
    expect(req.catalog.calls.columns).toEqual([])
  })

  it('offers LOCK TABLES access modes and the next table', async () => {
    const modes = await complete(request('LOCK TABLES orders '))
    expect(modes.analysis.expectation).toBe('lockTable')
    expect(names(modes)).toEqual(['READ', 'WRITE', 'LOW_PRIORITY', 'AS'])

    const next = await complete(request('LOCK TABLES orders READ, '))
    expect(next.analysis.expectation).toBe('tableName')
    expect(names(next)).toContain('orders')
  })

  it('reads CREATE TABLE option assignments', async () => {
    const auto = await complete(request('CREATE TABLE t (id INT) AUTO_INCREMENT = '))
    expect(auto.analysis.expectation).toBe('number')
    expect(auto.items).toEqual([])

    const rowFormat = await complete(request('CREATE TABLE t (id INT) ROW_FORMAT = '))
    expect(rowFormat.analysis.expectation).toBe('rowFormat')
    expect(names(rowFormat)).toContain('DYNAMIC')

    const charset = await complete(request('CREATE TABLE t (id INT) DEFAULT CHARSET = '))
    expect(charset.analysis.expectation).toBe('charset')
    expect(names(charset)).toContain('utf8mb4')

    const partition = await complete(request('CREATE TABLE t (id INT) PARTITION BY '))
    expect(partition.analysis.expectation).toBe('partition')
    expect(names(partition)).toEqual(['HASH', 'KEY', 'RANGE', 'LIST', 'LINEAR'])
  })
})

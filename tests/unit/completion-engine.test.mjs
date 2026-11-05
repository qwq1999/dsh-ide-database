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
    expect(result.analysis.expectation).toBe('relation')
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

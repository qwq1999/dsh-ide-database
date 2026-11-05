/**
 * Completion performance benchmark.
 *
 * The engine is pure: all metadata enters through the injected catalog, so a
 * plain in-memory catalog is enough to time the full request path without any
 * network or DOM involvement. The dataset is a mid-size database
 * (5 schemas x 40 tables x 12 columns) so ranking and de-duplication do real
 * work instead of running over three rows.
 *
 * The thresholds are deliberately loose (a local run is one or two orders of
 * magnitude below them) because CI machines are noisy. The single-request
 * maximum is allowed to reach 250 ms: a GC pause must not fail the suite.
 */
import { describe, expect, it } from 'vitest'

import { complete } from '../../src/client/completion/engine'

const SCHEMAS = ['shop', 'crm', 'analytics', 'warehouse', 'audit']
const TABLES_PER_SCHEMA = 40
const COLUMNS_PER_TABLE = 12
const BASE_TABLES = ['orders', 'order_items', 'customers', 'users']

const ITERATIONS = 100
const WARMUP = 5
const RANK_LIMIT = 60
const MEDIAN_BUDGET_MS = 10
const P95_BUDGET_MS = 25
const MAX_BUDGET_MS = 250

const WITH_COLUMNS = 'SELECT * FROM orders WHERE '
const WITH_JOIN = 'SELECT * FROM orders o JOIN order_items i ON '
const WITH_QUALIFIER = 'SELECT * FROM shop.'
const SCENARIOS = [WITH_COLUMNS, WITH_JOIN, WITH_QUALIFIER]

function singular(table) {
  if (table.endsWith('ies')) return `${table.slice(0, -3)}y`
  if (table.endsWith('s')) return table.slice(0, -1)
  return table
}

function tableNames() {
  const names = [...BASE_TABLES]
  for (let index = names.length; index < TABLES_PER_SCHEMA; index += 1) {
    names.push(`table_${String(index).padStart(2, '0')}`)
  }
  return names
}

function columnsFor(table) {
  const names = [
    'id',
    `${singular(table)}_id`,
    'name',
    'created_at',
    'updated_at',
    'amount',
    'status',
    'note',
    'code',
    'kind',
    'active',
    'sort_order',
  ]
  return names.slice(0, COLUMNS_PER_TABLE).map((name, index) => ({
    name,
    typeName: index === 0 || name.endsWith('_id') ? 'INT' : 'VARCHAR',
  }))
}

const TABLE_NAMES = tableNames()
const TABLES_BY_SCHEMA = new Map(
  SCHEMAS.map((schema) => [schema, TABLE_NAMES.map((name) => ({ name, kind: 'table' }))]),
)
const COLUMNS_BY_KEY = new Map()
for (const schema of SCHEMAS) {
  for (const table of TABLE_NAMES) {
    COLUMNS_BY_KEY.set(`${schema}.${table}`, columnsFor(table))
  }
}

/**
 * In-memory catalog with the same caching contract the real catalog follows:
 * every entry is materialised once and then handed out again. `loads` counts
 * the expensive reads, `calls` counts the interface calls the engine makes.
 */
function createMemoryCatalog() {
  const stats = {
    loads: { schemas: 0, tables: 0, columns: 0 },
    calls: { schemas: 0, tables: 0, columns: 0 },
  }
  const schemaCache = []
  const tableCache = new Map()
  const columnCache = new Map()

  return {
    stats,
    async schemas() {
      stats.calls.schemas += 1
      if (schemaCache.length === 0) {
        schemaCache.push(...SCHEMAS)
        stats.loads.schemas += 1
      }
      return schemaCache
    },
    async tables(schema) {
      stats.calls.tables += 1
      if (!tableCache.has(schema)) {
        tableCache.set(schema, TABLES_BY_SCHEMA.get(schema) ?? [])
        stats.loads.tables += 1
      }
      return tableCache.get(schema)
    },
    async columns(schema, table) {
      stats.calls.columns += 1
      const key = `${schema}.${table}`
      if (!columnCache.has(key)) {
        columnCache.set(key, COLUMNS_BY_KEY.get(key) ?? [])
        stats.loads.columns += 1
      }
      return columnCache.get(key)
    },
  }
}

function request(statement, catalog) {
  return {
    statement,
    caret: statement.length,
    dialect: 'mysql',
    schema: 'shop',
    catalog,
  }
}

function percentile(sortedSamples, ratio) {
  const index = Math.min(sortedSamples.length - 1, Math.ceil(sortedSamples.length * ratio) - 1)
  return sortedSamples[index]
}

async function measure(statement, catalog) {
  for (let index = 0; index < WARMUP; index += 1) {
    await complete(request(statement, catalog))
  }

  const samples = []
  let maxItems = 0
  for (let index = 0; index < ITERATIONS; index += 1) {
    const start = performance.now()
    const result = await complete(request(statement, catalog))
    samples.push(performance.now() - start)
    maxItems = Math.max(maxItems, result.items.length)
  }

  samples.sort((left, right) => left - right)
  return {
    median: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    max: samples[samples.length - 1],
    maxItems,
  }
}

function report(label, metrics) {
  console.log(
    `[completion benchmark] ${label}: median=${metrics.median.toFixed(3)}ms ` +
      `p95=${metrics.p95.toFixed(3)}ms max=${metrics.max.toFixed(3)}ms ` +
      `items<=${metrics.maxItems}`,
  )
}

function expectBudget(metrics) {
  expect(metrics.median).toBeLessThan(MEDIAN_BUDGET_MS)
  expect(metrics.p95).toBeLessThan(P95_BUDGET_MS)
  expect(metrics.max).toBeLessThan(MAX_BUDGET_MS)
  expect(metrics.maxItems).toBeLessThanOrEqual(RANK_LIMIT)
}

describe('completion performance benchmark', () => {
  it('answers a WHERE column caret quickly', async () => {
    const metrics = await measure(WITH_COLUMNS, createMemoryCatalog())
    report('WHERE columns', metrics)
    expectBudget(metrics)
  })

  it('answers a JOIN column caret with several referenced relations quickly', async () => {
    const metrics = await measure(WITH_JOIN, createMemoryCatalog())
    report('JOIN columns', metrics)
    expectBudget(metrics)
  })

  it('answers a schema-qualified caret quickly', async () => {
    const metrics = await measure(WITH_QUALIFIER, createMemoryCatalog())
    report('qualified', metrics)
    expectBudget(metrics)
  })

  it('never returns more candidates than the rank limit', async () => {
    const catalog = createMemoryCatalog()
    for (const statement of SCENARIOS) {
      const result = await complete(request(statement, catalog))
      expect(result.items.length).toBeLessThanOrEqual(RANK_LIMIT)
    }
  })

  it('reuses cached metadata for repeated requests instead of reloading it', async () => {
    const catalog = createMemoryCatalog()

    for (const statement of SCENARIOS) {
      await complete(request(statement, catalog))
    }
    const loadsAfterWarmUp = { ...catalog.stats.loads }
    const callsAfterWarmUp = { ...catalog.stats.calls }

    for (let round = 0; round < 10; round += 1) {
      for (const statement of SCENARIOS) {
        await complete(request(statement, catalog))
      }
    }

    // No new expensive read happened: the cache (including the negative entry
    // for `shop.shop`) served every later request.
    expect(catalog.stats.loads).toEqual(loadsAfterWarmUp)
    // The engine really did run the requests again, the counts are not frozen
    // because of an early return.
    expect(catalog.stats.calls.columns).toBeGreaterThan(callsAfterWarmUp.columns)
    expect(catalog.stats.calls.tables).toBeGreaterThan(callsAfterWarmUp.tables)
  })

  it('returns the same candidates for identical requests', async () => {
    const catalog = createMemoryCatalog()
    for (const statement of SCENARIOS) {
      await complete(request(statement, catalog))
    }
    for (const statement of SCENARIOS) {
      const first = await complete(request(statement, catalog))
      const second = await complete(request(statement, catalog))
      expect(second.items.map((item) => item.name)).toEqual(
        first.items.map((item) => item.name),
      )
    }
  })
})

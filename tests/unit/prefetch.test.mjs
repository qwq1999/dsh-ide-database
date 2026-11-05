import { describe, expect, it, vi } from 'vitest'

import { DbError } from '../../lib/host/errors.js'
import { DESCRIPTION_CONCURRENCY, DescriptionPrefetcher } from '../../lib/host/prefetch.js'

function description(overrides = {}) {
  return { schema: 'app', table: 'x', kind: 'table', columns: [], indexes: [], ...overrides }
}

/** Minimal structure cache whose `get()` returns the same mutable entry. */
function fakeStructure({ objects = {}, descriptions = {} } = {}) {
  const state = { descriptions, puts: [] }
  return {
    state,
    structure: {
      get: () => ({
        fetchedAt: '2026-11-05T11:00:00.000Z',
        schemas: [{ name: 'app' }],
        objects,
        descriptions: state.descriptions,
      }),
      putDescription: (id, schema, table, value) => {
        state.puts.push(`${schema}.${table}`)
        state.descriptions[`${schema}.${table}`] = { ...value, describedAt: new Date().toISOString() }
      },
      hasDescription: (id, schema, table) => state.descriptions[`${schema}.${table}`] !== undefined,
    },
  }
}

describe('DescriptionPrefetcher', () => {
  it('fills only relations that have no cached description yet', async () => {
    const { structure, state } = fakeStructure({
      objects: {
        app: [
          { name: 'orders', kind: 'table' },
          { name: 'order_view', kind: 'view' },
          { name: 'fn_total', kind: 'function' },
        ],
      },
      descriptions: { 'app.order_view': description({ table: 'order_view', kind: 'view' }) },
    })
    const calls = []
    const prefetch = new DescriptionPrefetcher({
      structure,
      sql: {
        describe: async (id, schema, table, kind) => {
          calls.push(`${schema}.${table}`)
          return description({ schema, table, kind })
        },
      },
      log: () => undefined,
    })

    prefetch.schedule('c1')

    await vi.waitFor(() => expect(calls).toEqual(['app.orders']))
    expect(state.puts).toEqual(['app.orders'])
    expect(state.descriptions['app.orders'].describedAt).toBeDefined()
  })

  it('does not start a second walk while one is already running', async () => {
    const { structure } = fakeStructure({
      objects: { app: [{ name: 'orders', kind: 'table' }, { name: 'items', kind: 'table' }] },
    })
    const calls = []
    const prefetch = new DescriptionPrefetcher({
      structure,
      sql: {
        describe: async (id, schema, table, kind) => {
          calls.push(table)
          await new Promise((resolve) => setTimeout(resolve, 5))
          return description({ schema, table, kind })
        },
      },
      log: () => undefined,
    })

    prefetch.schedule('c1')
    prefetch.schedule('c1')

    await vi.waitFor(() => expect(calls).toHaveLength(2))
    expect(calls.sort()).toEqual(['items', 'orders'])
  })

  it('re-reads every relation when a refresh is requested', async () => {
    const { structure, state } = fakeStructure({
      objects: { app: [{ name: 'orders', kind: 'table' }, { name: 'items', kind: 'table' }] },
      descriptions: {
        'app.orders': description({ table: 'orders', describedAt: '2020-01-01T00:00:00.000Z' }),
        'app.items': description({ table: 'items', describedAt: new Date().toISOString() }),
      },
    })
    const calls = []
    const prefetch = new DescriptionPrefetcher({
      structure,
      sql: {
        describe: async (id, schema, table, kind) => {
          calls.push(table)
          return description({ schema, table, kind })
        },
      },
      log: () => undefined,
    })

    prefetch.schedule('c1', { refreshAll: true })

    await vi.waitFor(() => expect(calls.sort()).toEqual(['items', 'orders']))
    expect(state.puts.sort()).toEqual(['app.items', 'app.orders'])
  })

  it('walks only the schemas the user made visible', async () => {
    const { structure } = fakeStructure({
      objects: {
        app: [{ name: 'orders', kind: 'table' }],
        audit: [{ name: 'events', kind: 'table' }],
      },
    })
    const calls = []
    const prefetch = new DescriptionPrefetcher({
      structure,
      sql: {
        describe: async (id, schema, table, kind) => {
          calls.push(`${schema}.${table}`)
          return description({ schema, table, kind })
        },
      },
      log: () => undefined,
    })

    prefetch.schedule('c1', { schemas: ['app'] })

    await vi.waitFor(() => expect(calls).toEqual(['app.orders']))
  })

  it('stops quietly when the connection closes and logs other failures', async () => {
    const { structure, state } = fakeStructure({
      objects: {
        app: [
          { name: 'closed', kind: 'table' },
          { name: 'broken', kind: 'table' },
          { name: 'later', kind: 'table' },
        ],
      },
    })
    const logs = []
    const calls = []
    const prefetch = new DescriptionPrefetcher({
      structure,
      sql: {
        describe: async (id, schema, table) => {
          calls.push(table)
          if (table === 'closed') throw new DbError('not-connected', '连接尚未打开')
          if (table === 'broken') throw new Error('boom')
          return description({ schema, table })
        },
      },
      log: (message) => logs.push(message),
    })

    prefetch.schedule('c1')
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0))
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(calls.length).toBeLessThanOrEqual(3)
    expect(state.puts).not.toContain('app.closed')
    expect(logs.some((message) => message.includes('boom'))).toBe(true)
  })

  it('limits concurrency to the documented worker count', async () => {
    const { structure } = fakeStructure({
      objects: { app: Array.from({ length: 6 }, (_, index) => ({ name: `t${String(index)}`, kind: 'table' })) },
    })
    let inFlight = 0
    let peak = 0
    let completed = 0
    const prefetch = new DescriptionPrefetcher({
      structure,
      sql: {
        describe: async (id, schema, table, kind) => {
          inFlight += 1
          peak = Math.max(peak, inFlight)
          await new Promise((resolve) => setTimeout(resolve, 2))
          inFlight -= 1
          completed += 1
          return description({ schema, table, kind })
        },
      },
      log: () => undefined,
    })

    prefetch.schedule('c1')

    await vi.waitFor(() => expect(completed).toBe(6))
    expect(peak).toBeLessThanOrEqual(DESCRIPTION_CONCURRENCY)
  })

  it('reports live progress and clears it when the walk ends', async () => {
    const { structure } = fakeStructure({
      objects: { app: [{ name: 'orders', kind: 'table' }, { name: 'items', kind: 'table' }] },
    })
    const prefetch = new DescriptionPrefetcher({
      structure,
      sql: {
        describe: async (id, schema, table, kind) => {
          await new Promise((resolve) => setTimeout(resolve, 5))
          return description({ schema, table, kind })
        },
      },
      log: () => undefined,
    })

    prefetch.schedule('c1')
    expect(prefetch.progress()).toEqual([{ connectionId: 'c1', total: 2, done: 0 }])

    await vi.waitFor(() => expect(prefetch.progress()).toEqual([]))
  })
})

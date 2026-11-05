import { describe, expect, it, vi } from 'vitest'

import { DbError } from '../../lib/host/errors.js'
import { DESCRIPTION_CONCURRENCY, DescriptionPrefetcher, needsDescription } from '../../lib/host/prefetch.js'

const now = Date.parse('2026-11-05T12:00:00.000Z')

function description(overrides = {}) {
  return { schema: 'app', table: 'x', kind: 'table', columns: [], indexes: [], ...overrides }
}

/** Minimal structure cache whose `get()` returns the same mutable entry. */
function fakeStructure({ objects = {}, descriptions = {} } = {}) {
  const state = { descriptions, puts: [] }
  return {
    state,
    structure: {
      get: () => ({ fetchedAt: '2026-11-05T11:00:00.000Z', schemas: [{ name: 'app' }], objects, descriptions: state.descriptions }),
      putDescription: (id, schema, table, value) => {
        state.puts.push(`${schema}.${table}`)
        state.descriptions[`${schema}.${table}`] = { ...value, describedAt: new Date().toISOString() }
      },
    },
  }
}

describe('needsDescription', () => {
  it('treats missing and unreadable entries as stale, fresh ones as current', () => {
    expect(needsDescription(undefined, now)).toBe(true)
    expect(needsDescription(description(), now)).toBe(true)
    expect(needsDescription(description({ describedAt: 'not-a-date' }), now)).toBe(true)
    expect(needsDescription(description({ describedAt: new Date(now - 60_000).toISOString() }), now)).toBe(false)
    expect(needsDescription(description({ describedAt: new Date(now - 25 * 60 * 60 * 1000).toISOString() }), now)).toBe(true)
  })
})

describe('DescriptionPrefetcher', () => {
  it('reads only missing tables and views, never routines', async () => {
    const fresh = new Date().toISOString()
    const { structure, state } = fakeStructure({
      objects: {
        app: [
          { name: 'orders', kind: 'table' },
          { name: 'order_view', kind: 'view' },
          { name: 'fn_total', kind: 'function' },
        ],
      },
      descriptions: { 'app.order_view': description({ table: 'order_view', kind: 'view', describedAt: fresh }) },
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

  it('refreshes entries older than the staleness window', async () => {
    const { structure, state } = fakeStructure({
      objects: { app: [{ name: 'orders', kind: 'table' }] },
      descriptions: { 'app.orders': description({ table: 'orders', describedAt: '2020-01-01T00:00:00.000Z' }) },
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

    prefetch.schedule('c1')

    await vi.waitFor(() => expect(calls).toEqual(['orders']))
    expect(state.puts).toEqual(['app.orders'])
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
})

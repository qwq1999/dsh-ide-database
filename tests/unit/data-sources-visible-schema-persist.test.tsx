// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  structure: vi.fn(),
  schemas: vi.fn(),
  objects: vi.fn(),
  connect: vi.fn(),
  describe: vi.fn(),
  prefetchConnection: vi.fn(),
  saveVisibleSchema: vi.fn(),
  saveVisibleRedisDbs: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    status: mocks.status,
    structure: mocks.structure,
    schemas: mocks.schemas,
    objects: mocks.objects,
    connect: mocks.connect,
    describe: mocks.describe,
    prefetchConnection: mocks.prefetchConnection,
    saveVisibleSchema: mocks.saveVisibleSchema,
    saveVisibleRedisDbs: mocks.saveVisibleRedisDbs,
  },
}))

import { useDataSources } from '../../src/client/hooks/useDataSources'

const KEY = 'dsh-ide-database:visible-schemas:'

function connection(id: string, database: string) {
  return {
    id, name: id, driver: 'mysql', dialect: 'mysql',
    host: '127.0.0.1', port: 3306, user: 'root', hasPassword: false,
    database, redisDb: 0, params: {}, readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

const settings = {
  maxRows: 200, queryTimeoutSec: 30, connectTimeoutSec: 10, javaPath: '',
  mavenMirror: 'central', allowAgentWrites: false, redisScanCount: 200,
  confirmDestructive: false,
}

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

describe('visible-schema persistence on startup', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.clearAllMocks()
    mocks.objects.mockResolvedValue({ objects: [] })
    mocks.connect.mockResolvedValue({ version: '8.0.35', user: 'root' })
    mocks.describe.mockResolvedValue({ schema: 'shop', table: 'orders', kind: 'table', columns: [], indexes: [] })
    mocks.prefetchConnection.mockResolvedValue({ id: 'a' })
    mocks.schemas.mockResolvedValue({ schemas: [{ name: 'shop' }, { name: 'audit' }] })
    mocks.saveVisibleSchema.mockResolvedValue({ visibleSchemas: {} })
    mocks.saveVisibleRedisDbs.mockResolvedValue({ visibleRedisDbs: {} })
  })

  afterEach(() => {
    cleanup()
    window.localStorage.clear()
  })

  it('keeps a saved schema choice when cached structure precedes status', async () => {
    // User previously chose only "audit" for connection a, whose database
    // default would otherwise be "shop".
    window.localStorage.setItem(`${KEY}a`, JSON.stringify(['audit']))

    // Cached structure arrives and populates schemas['a'] before status.
    mocks.structure.mockResolvedValue({
      structures: {
        a: {
          schemas: [{ name: 'shop' }, { name: 'audit' }],
          objects: {},
          descriptions: {},
          fetchedAt: new Date().toISOString(),
        },
      },
    })
    // Hold status so applyStructures settles first.
    const status = deferred<unknown>()
    mocks.status.mockReturnValue(status.promise)

    renderHook(() => useDataSources(() => undefined))
    // Wait until the structure effect has applied the cached schemas.
    await waitFor(() => expect(mocks.structure).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 50))

    // Now status resolves: snapshot and schemas are ready in the same commit.
    status.resolve({
      config: { connections: [connection('a', 'shop')], settings, drivers: [] },
      drivers: [], env: {}, prefetch: [],
    })
    await waitFor(() => expect(mocks.status).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 80))

    // The saved choice must survive; the hydration effect applies it and the
    // "default schema" effect must not overwrite the stored value with "shop".
    expect(JSON.parse(window.localStorage.getItem(`${KEY}a`) as string)).toEqual(['audit'])
  })

  it('hydrates the picker from the host config file without rewriting it', async () => {
    // A previous DSH session saved "audit" in the host file, while the browser
    // storage still holds the older default "shop". The saved file must win.
    window.localStorage.setItem(`${KEY}a`, JSON.stringify(['shop']))
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.status.mockResolvedValue({
      config: {
        connections: [connection('a', 'shop')], settings, drivers: [],
        visibleSchemas: { a: ['audit'] },
      },
      drivers: [], env: {}, prefetch: [],
    })

    const { result } = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(result.current.visibleSchemas.a).toEqual(['audit']))
    await new Promise((r) => setTimeout(r, 80))

    // Host value is authoritative: no migration write and no default overwrite.
    expect(mocks.saveVisibleSchema).not.toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem(`${KEY}a`) as string)).toEqual(['shop'])
  })

  it('migrates a legacy browser choice into the host file once', async () => {
    window.localStorage.setItem(`${KEY}a`, JSON.stringify(['audit']))
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.status.mockResolvedValue({
      config: { connections: [connection('a', 'shop')], settings, drivers: [] },
      drivers: [], env: {}, prefetch: [],
    })

    renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(mocks.saveVisibleSchema).toHaveBeenCalledWith('a', ['audit']))
    await new Promise((r) => setTimeout(r, 80))

    // The migration runs when the snapshot arrives; the picker hydration and
    // default-schema effects must not overwrite the saved choice.
    expect(mocks.saveVisibleSchema).toHaveBeenCalledTimes(1)
    expect(JSON.parse(window.localStorage.getItem(`${KEY}a`) as string)).toEqual(['audit'])
  })

  it('keeps an explicit host null ("show all") when cached structure arrives first', async () => {
    // Status is held back while cached structure populates schemas['a']; the
    // host file already says "show every schema" (null). The default-schema
    // effect must NOT overwrite it with ["shop"].
    mocks.structure.mockResolvedValue({
      structures: {
        a: { schemas: [{ name: 'shop' }, { name: 'audit' }], objects: {}, descriptions: {}, fetchedAt: new Date().toISOString() },
      },
    })
    const status = deferred<unknown>()
    mocks.status.mockReturnValue(status.promise)

    renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(mocks.structure).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 50))
    // No persisted signal yet -> the buggy guard would write the default here.
    expect(mocks.saveVisibleSchema).not.toHaveBeenCalled()

    status.resolve({
      config: {
        connections: [connection('a', 'shop')], settings, drivers: [],
        visibleSchemas: { a: null },
      },
      drivers: [], env: {}, prefetch: [],
    })
    await new Promise((r) => setTimeout(r, 80))

    expect(mocks.saveVisibleSchema).not.toHaveBeenCalled()
  })

  it('preserves an explicit host null through connect instead of resetting to the default schema', async () => {
    mocks.structure.mockResolvedValue({ structures: {} })
    mocks.status.mockResolvedValue({
      config: {
        connections: [connection('a', 'shop')], settings, drivers: [],
        visibleSchemas: { a: null },
      },
      drivers: [], env: {}, prefetch: [],
    })

    const { result } = renderHook(() => useDataSources(() => undefined))
    await waitFor(() => expect(result.current.selectedId).toBe('a'))
    await waitFor(() => expect(result.current.visibleSchemas.a).toBeNull())
    await act(async () => { await result.current.connect('a') })

    expect(result.current.visibleSchemas.a).toBeNull()
    expect(mocks.saveVisibleSchema).not.toHaveBeenCalled()
    // null means "all schemas"; with no cached names yet, prefetch uses undefined.
    expect(mocks.prefetchConnection).toHaveBeenCalledWith('a', { refresh: false, schemas: undefined })
  })
})

import { describe, expect, it, vi } from 'vitest'

import { createDatabaseTools } from '../../lib/host/tools.js'

function connection(overrides = {}) {
  return {
    id: 'c1',
    name: 'MySQL',
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: 'app',
    redisDb: 0,
    params: {},
    readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    hasPassword: true,
    ...overrides,
  }
}

function harness(initial = {}) {
  const sqlConnection = connection(initial.connection)
  const redisConnection = connection({ id: 'r1', name: 'Redis', driver: 'redis', dialect: 'redis', port: 6379 })
  const settings = {
    maxRows: 200,
    queryTimeoutSec: 30,
    connectTimeoutSec: 10,
    javaPath: '',
    mavenMirror: 'central',
    allowAgentWrites: false,
    redisScanCount: 200,
    confirmDestructive: true,
    ...(initial.settings ?? {}),
  }
  const query = vi.fn(async () => ({
    sql: 'SELECT 1',
    columns: [{ name: 'x', typeName: 'INT' }],
    rows: [[1]],
    rowCount: 1,
    truncated: false,
    elapsedMs: 3,
    warnings: [],
  }))
  const saveConnection = vi.fn((draft) => ({ ...connection(draft), id: draft.id ?? 'new1' }))
  const deleteConnection = vi.fn()
  const trashConnection = vi.fn(() => ({ ...sqlConnection, deletedAt: '2026-10-30T12:00:00.000Z' }))
  const purgeConnection = vi.fn(() => sqlConnection)
  const config = {
    snapshot: () => ({ connections: [sqlConnection, redisConnection], trash: [], settings, drivers: [] }),
    settings: () => settings,
    connection: (reference) => [sqlConnection, redisConnection].find((entry) => entry.id === reference || entry.name === reference),
    get: () => ({ connections: [sqlConnection, redisConnection], trash: [], settings, drivers: [] }),
    saveConnection,
    deleteConnection,
    trashConnection,
    purgeConnection,
  }
  const structure = { clear: vi.fn(), putSchemas: vi.fn(), get: vi.fn(() => undefined) }
  const deps = {
    config,
    drivers: { statuses: () => [{ id: 'mysql', allJarsPresent: true, jars: [] }] },
    sql: {
      isConnected: () => true,
      query,
      explain: vi.fn(async () => ({ dialect: 'mysql', statements: ['EXPLAIN SELECT 1'], plan: await query(), warnings: [] })),
      schemas: vi.fn(),
      objects: vi.fn(),
      describe: vi.fn(),
      ddl: vi.fn(async () => ({ schema: 'shop', table: 'users', kind: 'table', ddl: 'CREATE TABLE users (id INT)', source: 'generated', warnings: [] })),
      cancel: vi.fn(),
      connect: vi.fn(async () => ({ version: '8.0' })),
      disconnect: vi.fn(async () => undefined),
    },
    redis: { scan: vi.fn(), inspect: vi.fn(), command: vi.fn(), connect: vi.fn(), disconnect: vi.fn(async () => undefined) },
    structure,
  }
  const tools = createDatabaseTools(deps)
  const byName = (name) => {
    const found = tools.find((tool) => tool.name === name)
    if (found === undefined) throw new Error(`missing tool ${name}`)
    return found
  }
  return {
    tools,
    byName,
    query,
    deps,
    settings,
    sqlConnection,
    redisConnection,
    saveConnection,
    deleteConnection,
    trashConnection,
    purgeConnection,
    structure,
  }
}

describe('createDatabaseTools', () => {
  it('registers the full agent tool set', () => {
    const { tools } = harness()
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      'db_create_connection',
      'db_delete_connection',
      'db_describe_table',
      'db_download_driver',
      'db_execute_sql',
      'db_explain',
      'db_get_ddl',
      'db_list_connections',
      'db_list_objects',
      'db_list_schemas',
      'db_redis_command',
      'db_redis_inspect',
      'db_redis_scan',
      'db_refresh_connection',
      'db_test_connection',
      'db_update_connection',
    ])
    for (const tool of tools) {
      expect(tool.description.length).toBeGreaterThan(20)
      expect(tool.output?.schema).toEqual({ type: 'json' })
      expect(typeof tool.output?.render).toBe('function')
    }
  })

  it('lists connections with driver status by default', async () => {
    const { byName } = harness()
    const value = await byName('db_list_connections').execute({})
    expect(value.connections.map((entry) => entry.id)).toEqual(['c1', 'r1'])
    expect(value.drivers[0].id).toBe('mysql')
    const withoutDrivers = await byName('db_list_connections').execute({ includeDrivers: false })
    expect(withoutDrivers.drivers).toBeUndefined()
  })

  it('runs read-only SQL with agent writes disabled', async () => {
    const { byName, query } = harness()
    const result = await byName('db_execute_sql').execute({ connection: 'MySQL', sql: 'SELECT * FROM users' })
    expect(result.rowCount).toBe(1)
    expect(query).toHaveBeenCalledTimes(1)
    expect(query.mock.calls[0][2]).toMatchObject({ allowWrite: false, maxRows: 200, timeoutSec: 30 })
  })

  it('blocks write SQL unless allowAgentWrites is enabled', async () => {
    const { byName } = harness()
    await expect(byName('db_execute_sql').execute({ connection: 'c1', sql: 'DELETE FROM users' })).rejects.toThrow(/不允许代理执行写语句/)
    const writable = harness({ settings: { allowAgentWrites: true } })
    await writable.byName('db_execute_sql').execute({ connection: 'c1', sql: 'DELETE FROM users' })
    expect(writable.query.mock.calls[0][2].allowWrite).toBe(true)
  })

  it('never writes on a read-only connection', async () => {
    const { byName } = harness({ connection: { readOnly: true }, settings: { allowAgentWrites: true } })
    await expect(byName('db_execute_sql').execute({ connection: 'c1', sql: 'UPDATE users SET age = 1' })).rejects.toThrow(/只读/)
  })

  it('routes redis connections away from SQL tools', async () => {
    const { byName } = harness()
    await expect(byName('db_execute_sql').execute({ connection: 'r1', sql: 'SELECT 1' })).rejects.toThrow(/db_redis_command/)
  })

  it('forwards the chosen redis logical database to commands', async () => {
    const { byName, deps } = harness()
    deps.redis.command.mockResolvedValue({ command: 'GET a', value: 'x', elapsedMs: 1, readOnly: true })
    await byName('db_redis_command').execute({ connection: 'r1', command: 'GET a', db: 3 })
    expect(deps.redis.command).toHaveBeenCalledWith('r1', 3, 'GET a', false)
  })

  it('delegates execution plans to the sql service', async () => {
    const { byName, deps } = harness()
    const value = await byName('db_explain').execute({ connection: 'c1', sql: 'SELECT * FROM users' })
    expect(deps.sql.explain).toHaveBeenCalledWith('c1', 'SELECT * FROM users', {})
    expect(value.connection.id).toBe('c1')
    expect(value.statements).toEqual(['EXPLAIN SELECT 1'])
    expect(value.plan.rowCount).toBe(1)
  })

  it('returns the DDL of a table and keeps redis out', async () => {
    const { byName, deps } = harness()
    const value = await byName('db_get_ddl').execute({ connection: 'c1', schema: 'shop', object: 'users' })
    expect(deps.sql.ddl).toHaveBeenCalledWith('c1', 'mysql', 'shop', 'users', 'table')
    expect(value.ddl).toBe('CREATE TABLE users (id INT)')
    expect(value.source).toBe('generated')
    await expect(byName('db_get_ddl').execute({ connection: 'r1', schema: '0', object: 'k' })).rejects.toThrow(/Redis/)
  })

  it('creates a connection through the agent tool', async () => {
    const { byName, saveConnection } = harness()
    await byName('db_create_connection').execute({
      name: '演示 MySQL',
      driver: 'mysql',
      host: '127.0.0.1',
      port: 33061,
      user: 'root',
      password: 'dshdemo',
    })
    expect(saveConnection).toHaveBeenCalledTimes(1)
    expect(saveConnection.mock.calls[0][0]).toMatchObject({
      name: '演示 MySQL',
      driver: 'mysql',
      host: '127.0.0.1',
      port: 33061,
      password: 'dshdemo',
    })
  })

  it('updates only the provided connection fields', async () => {
    const { byName, saveConnection } = harness()
    await byName('db_update_connection').execute({ connection: 'c1', port: 3307 })
    const draft = saveConnection.mock.calls[0][0]
    expect(draft).toMatchObject({ id: 'c1', name: 'MySQL', host: '127.0.0.1', port: 3307, user: 'root', database: 'app' })
    expect(draft.password).toBeUndefined()
  })

  it('asks for confirmation before moving a connection to the recycle bin', async () => {
    const { byName, trashConnection, purgeConnection, deps } = harness()
    await expect(byName('db_delete_connection').execute({ connection: 'c1' })).rejects.toThrow(/confirm: true/)
    const value = await byName('db_delete_connection').execute({ connection: 'c1', confirm: true })
    expect(trashConnection).toHaveBeenCalledWith('c1')
    expect(purgeConnection).not.toHaveBeenCalled()
    expect(deps.structure.clear).not.toHaveBeenCalled()
    expect(value).toMatchObject({ deleted: { id: 'c1' }, trashed: true, trashCount: 0 })
  })

  it('purges a connection permanently when asked', async () => {
    const { byName, trashConnection, purgeConnection, deps } = harness()
    const value = await byName('db_delete_connection').execute({ connection: 'c1', confirm: true, permanent: true })
    expect(purgeConnection).toHaveBeenCalledWith('c1')
    expect(trashConnection).not.toHaveBeenCalled()
    expect(deps.structure.clear).toHaveBeenCalledWith('c1')
    expect(value).toMatchObject({ deleted: { id: 'c1' }, trashed: false })
  })

  it('refreshes schemas and rewrites the structure cache', async () => {
    const { byName, deps } = harness()
    deps.sql.schemas.mockResolvedValue([{ name: 'shop', objectCount: 5 }])
    const value = await byName('db_refresh_connection').execute({ connection: 'c1' })
    expect(value.schemaCount).toBe(1)
    expect(deps.structure.clear).toHaveBeenCalledWith('c1')
    expect(deps.structure.putSchemas).toHaveBeenCalledWith('c1', [{ name: 'shop', objectCount: 5 }])
  })

  it('renders JSON output for the generic tool card', async () => {
    const { byName } = harness()
    const tool = byName('db_list_connections')
    const value = await tool.execute({})
    const blocks = tool.output.render({}, value)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].type).toBe('text')
    expect(JSON.parse(blocks[0].text).connections).toHaveLength(2)
  })

  it('masks credential-like connection params', async () => {
    const { byName } = harness({ connection: { params: { password: 'p@ss', sslMode: 'require', apiToken: 't' } } })
    const value = await byName('db_list_connections').execute({})
    const masked = value.connections.find((entry) => entry.id === 'c1')
    expect(masked.params).toEqual({ password: '***', sslMode: 'require', apiToken: '***' })
  })

  it('lets the preset supply host and port', async () => {
    const { byName } = harness()
    await expect(byName('db_create_connection').execute({ name: 'pg', driver: 'postgres' })).rejects.toThrow(/缺少参数 host/)

    const sqlite = harness()
    await sqlite.byName('db_create_connection').execute({ name: 'local', driver: 'sqlite', database: '/tmp/app.db' })
    expect(sqlite.saveConnection.mock.calls[0][0]).toMatchObject({ driver: 'sqlite', host: '', port: 0, database: '/tmp/app.db' })

    const postgres = harness()
    await postgres.byName('db_create_connection').execute({ name: 'pg', driver: 'postgres', host: 'db', database: 'app' })
    expect(postgres.saveConnection.mock.calls[0][0]).toMatchObject({ port: 5432 })
  })

  it('truncates a large object listing', async () => {
    const { byName, deps } = harness()
    deps.sql.objects.mockResolvedValue([
      { schema: 'shop', name: 'a', kind: 'table' },
      { schema: 'shop', name: 'b', kind: 'table' },
      { schema: 'shop', name: 'c', kind: 'view' },
    ])
    const value = await byName('db_list_objects').execute({ connection: 'c1', schema: 'shop', kind: 'table', limit: 1 })
    expect(value.count).toBe(2)
    expect(value.truncated).toBe(true)
    expect(value.objects).toHaveLength(1)
  })

  it('rejects an empty statement instead of a confusing write refusal', async () => {
    const { byName } = harness()
    await expect(byName('db_execute_sql').execute({ connection: 'c1', sql: '   ' })).rejects.toThrow(/SQL 不能为空/)
    await expect(byName('db_explain').execute({ connection: 'c1', sql: '' })).rejects.toThrow(/SQL 不能为空/)
  })

  it('drops the cached session after an update', async () => {
    const { byName, deps } = harness()
    await byName('db_update_connection').execute({ connection: 'c1', port: 3307 })
    expect(deps.sql.disconnect).toHaveBeenCalledWith('c1')
  })

  it('guards EXPLAIN ANALYZE like a write', async () => {
    const { byName } = harness()
    await expect(byName('db_explain').execute({ connection: 'c1', sql: 'EXPLAIN ANALYZE DELETE FROM users' })).rejects.toThrow(
      /不允许代理执行/,
    )
  })
})

import { describe, expect, it } from 'vitest'

import { SqlService } from '../../lib/host/sql.js'

function connection(id, driver, dialect, database) {
  return {
    id,
    name: id,
    driver,
    dialect,
    host: '127.0.0.1',
    port: 1,
    user: 'user',
    hasPassword: false,
    database,
    redisDb: 0,
    params: {},
    readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeService(connectionConfig, ddlText) {
  const calls = []
  const config = { connection: (id) => (id === connectionConfig.id ? connectionConfig : undefined) }
  const service = new SqlService({}, config, {}, {}, {}, () => {})
  service.connected.set(connectionConfig.id, { driver: {}, server: {} })
  service.query = async (connId, sql, options) => {
    calls.push({ sql, options })
    return { sql, columns: [{ name: 'sql' }], rows: [[ddlText]], rowCount: 1, truncated: false, elapsedMs: 1 }
  }
  return { service, calls }
}

describe('server side DDL for the newer engines', () => {
  it('reads a SQLite table definition from sqlite_master', async () => {
    const { service, calls } = makeService(connection('lite', 'sqlite', 'sqlite', './app.db'), 'CREATE TABLE users (id INT)')

    const result = await service.ddl('lite', 'sqlite', 'main', 'users', 'table')

    expect(calls).toHaveLength(1)
    expect(calls[0].sql).toBe("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    expect(result).toMatchObject({ schema: 'main', table: 'users', kind: 'table', source: 'server' })
    expect(result.ddl).toBe('CREATE TABLE users (id INT)')
  })

  it('reads a SQLite view definition with the same query', async () => {
    const { service, calls } = makeService(connection('lite', 'sqlite', 'sqlite', './app.db'), 'CREATE VIEW v_users AS SELECT 1')

    const result = await service.ddl('lite', 'sqlite', 'main', 'v_users', 'view')

    expect(calls[0].sql).toBe("SELECT sql FROM sqlite_master WHERE type = 'view' AND name = 'v_users'")
    expect(result.ddl).toBe('CREATE VIEW v_users AS SELECT 1')
  })

  it('asks PostgreSQL for the view body', async () => {
    const { service, calls } = makeService(connection('pg', 'postgres', 'postgres', 'app'), ' SELECT 1;')

    const result = await service.ddl('pg', 'postgres', 'public', 'v_users', 'view')

    expect(calls[0].sql).toBe("SELECT pg_get_viewdef(to_regclass('\"public\".\"v_users\"') , true) AS ddl")
    expect(result).toMatchObject({ schema: 'public', table: 'v_users', kind: 'view', source: 'server' })
  })
})

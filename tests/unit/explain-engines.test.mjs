import { describe, expect, it } from 'vitest'

import { SqlService } from '../../lib/host/sql.js'

function connection(dialect) {
  return {
    id: 'c1',
    name: 'c1',
    driver: dialect,
    dialect,
    host: '127.0.0.1',
    port: 1,
    user: 'user',
    hasPassword: false,
    database: 'app',
    redisDb: 0,
    params: {},
    readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeService(dialect, planRows = [['plan']]) {
  const calls = []
  const config = { connection: () => connection(dialect) }
  const service = new SqlService({}, config, {}, {}, {}, () => {})
  service.connected.set('c1', { driver: {}, server: {} })
  service.query = async (connId, sql, options) => {
    calls.push({ sql, options })
    return { sql, columns: [{ name: 'plan' }], rows: planRows, rowCount: planRows.length, truncated: false, elapsedMs: 1 }
  }
  return { service, calls }
}

describe('explain plans for the newer engines', () => {
  it('uses EXPLAIN QUERY PLAN on SQLite', async () => {
    const { service, calls } = makeService('sqlite')

    const result = await service.explain('c1', 'SELECT 1')

    expect(calls.map((call) => call.sql)).toEqual(['EXPLAIN QUERY PLAN SELECT 1'])
    expect(result).toMatchObject({ dialect: 'sqlite', statements: ['EXPLAIN QUERY PLAN SELECT 1'] })
    expect(result.plan.rows).toEqual([['plan']])
  })

  it('uses EXPLAIN on PostgreSQL', async () => {
    const { service, calls } = makeService('postgres')

    await service.explain('c1', 'SELECT 1')

    expect(calls[0].sql).toBe('EXPLAIN SELECT 1')
  })

  it('turns SHOWPLAN_ALL on and off around the statement on SQL Server', async () => {
    const { service, calls } = makeService('mssql')

    const result = await service.explain('c1', 'SELECT 1')

    expect(calls.map((call) => call.sql)).toEqual([
      'SET SHOWPLAN_ALL ON',
      'SELECT 1',
      'SET SHOWPLAN_ALL OFF',
    ])
    expect(calls[0].options.allowWrite).toBe(true)
    expect(calls[2].options.allowWrite).toBe(true)
    expect(result.statements).toEqual(['SET SHOWPLAN_ALL ON', 'SELECT 1', 'SET SHOWPLAN_ALL OFF'])
  })

  it('still turns SHOWPLAN_ALL off when the statement fails', async () => {
    const config = { connection: () => connection('mssql') }
    const service = new SqlService({}, config, {}, {}, {}, () => {})
    service.connected.set('c1', { driver: {}, server: {} })
    const calls = []
    service.query = async (connId, sql) => {
      calls.push(sql)
      if (sql === 'SELECT 1') throw new Error('syntax error')
      return { sql, columns: [], rows: [], rowCount: 0, truncated: false, elapsedMs: 1 }
    }

    await expect(service.explain('c1', 'SELECT 1')).rejects.toThrow('syntax error')
    expect(calls).toEqual(['SET SHOWPLAN_ALL ON', 'SELECT 1', 'SET SHOWPLAN_ALL OFF'])
  })
})

import { describe, expect, it } from 'vitest'

import { SqlService } from '../../lib/host/sql.js'

const connection = {
  id: 'mssql-1',
  name: '演示 SQL Server',
  driver: 'mssql',
  dialect: 'mssql',
  host: '127.0.0.1',
  port: 1433,
  user: 'sa',
  hasPassword: true,
  database: 'master',
  redisDb: 0,
  params: {},
  readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function makeService(calls) {
  const config = { connection: (id) => (id === 'mssql-1' ? connection : undefined) }
  const service = new SqlService({}, config, {}, {}, {}, () => {})
  service.connected.set('mssql-1', { driver: {}, server: {} })
  service.query = async (connId, sql, options) => {
    calls.push({ sql, allowWrite: options?.allowWrite === true })
    if (sql.startsWith('SET ')) return { sql, columns: [], rows: [], rowCount: 0, truncated: false, elapsedMs: 1 }
    return {
      sql,
      columns: [{ name: 'StmtText' }],
      rows: [['SELECT 1']],
      rowCount: 1,
      truncated: false,
      elapsedMs: 1,
    }
  }
  return service
}

describe('SQL Server execution plan', () => {
  it('turns SHOWPLAN_ALL on, compiles the statement and turns it off again', async () => {
    const calls = []
    const service = makeService(calls)
    const result = await service.explain('mssql-1', 'SELECT 1')

    expect(calls).toEqual([
      { sql: 'SET SHOWPLAN_ALL ON', allowWrite: true },
      { sql: 'SELECT 1', allowWrite: false },
      { sql: 'SET SHOWPLAN_ALL OFF', allowWrite: true },
    ])
    expect(result.dialect).toBe('mssql')
    expect(result.statements).toEqual(['SET SHOWPLAN_ALL ON', 'SELECT 1', 'SET SHOWPLAN_ALL OFF'])
    expect(result.plan.rows).toEqual([['SELECT 1']])
  })

  it('still turns SHOWPLAN_ALL off when compiling the statement fails', async () => {
    const calls = []
    const service = makeService(calls)
    service.query = async (connId, sql, options) => {
      calls.push({ sql, allowWrite: options?.allowWrite === true })
      if (sql.startsWith('SET ')) return { sql, columns: [], rows: [], rowCount: 0, truncated: false, elapsedMs: 1 }
      throw new Error('Incorrect syntax near')
    }

    await expect(service.explain('mssql-1', 'SELECT FROM')).rejects.toThrow('Incorrect syntax near')
    expect(calls.map((call) => call.sql)).toEqual(['SET SHOWPLAN_ALL ON', 'SELECT FROM', 'SET SHOWPLAN_ALL OFF'])
  })
})

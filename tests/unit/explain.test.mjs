import { describe, expect, it, vi } from 'vitest'

import { SqlService } from '../../lib/host/sql.js'

function connection(overrides = {}) {
  return {
    id: 'c1',
    name: 'DM',
    driver: 'dameng',
    dialect: 'dameng',
    host: '127.0.0.1',
    port: 5236,
    user: 'SYSDBA',
    database: 'SYSDBA',
    redisDb: 0,
    params: {},
    readOnly: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function harness(options = {}) {
  const settings = {
    maxRows: 200,
    queryTimeoutSec: 30,
    connectTimeoutSec: 10,
    javaPath: '',
    mavenMirror: 'central',
    allowAgentWrites: false,
    redisScanCount: 200,
    confirmDestructive: true,
  }
  const conn = connection(options.connection)
  const calls = []
  const request = vi.fn(async (method, payload, timeoutMs) => {
    calls.push({ method, payload, timeoutMs })
    if (method === 'explain') return options.plan ?? { columns: [], rows: [], rowCount: 0 }
    return { columns: [], rows: options.rows ?? [], rowCount: (options.rows ?? []).length }
  })
  const service = new SqlService({}, {}, {}, {}, {}, () => {})
  service.config = {
    connection: (reference) => (reference === conn.id ? conn : undefined),
    settings: () => settings,
  }
  service.ensureBridge = async () => ({ request })
  service.connected.set(conn.id, { driver: { dialect: conn.dialect }, server: { connected: true } })
  return { service, calls, request, conn }
}

describe('执行计划 (EXPLAIN)', () => {
  it('达梦走桥的 explain 接口，而不是通用的 EXPLAIN 语句', async () => {
    const plan = {
      columns: [{ name: '执行计划', typeName: 'VARCHAR', jdbcType: 12, nullable: true }],
      rows: [['1   #NSET2: [1, 5, 64]'], ['2     #PRJT2: [1, 5, 64]']],
      rowCount: 2,
    }
    const { service, calls, request } = harness({ plan })
    const result = await service.explain('c1', ' SELECT * FROM t ')
    expect(request).toHaveBeenCalledTimes(1)
    expect(calls[0]).toMatchObject({
      method: 'explain',
      payload: { connId: 'c1', sql: 'SELECT * FROM t' },
      timeoutMs: 60000,
    })
    expect(result.statements).toEqual(['EXPLAIN SELECT * FROM t'])
    expect(result.plan).toBe(plan)
    expect(result.warnings).toEqual([])
  })

  it('MySQL 仍然发通用的 EXPLAIN 语句', async () => {
    const { service, request } = harness({
      connection: { id: 'c1', name: 'MySQL', driver: 'mysql', dialect: 'mysql', database: 'shop' },
      rows: [['1', 'SIMPLE', 't', 'ALL']],
    })
    const result = await service.explain('c1', 'SELECT * FROM t')
    expect(request).toHaveBeenCalledWith(
      'query',
      expect.objectContaining({ sql: 'EXPLAIN SELECT * FROM t' }),
      expect.any(Number),
    )
    expect(result.plan.rows).toHaveLength(1)
  })
})

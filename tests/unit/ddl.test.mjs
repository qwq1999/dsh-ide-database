import { describe, expect, it, vi } from 'vitest'

import { DbError } from '../../lib/host/errors.js'
import { SqlService } from '../../lib/host/sql.js'

function connection(overrides = {}) {
  return {
    id: 'c1',
    name: 'MySQL',
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: 'shop',
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
  const queries = []
  const request = vi.fn(async (method, payload) => {
    if (method !== 'query') throw new Error(`unexpected bridge method ${method}`)
    queries.push(payload.sql)
    if (options.onQuery) return options.onQuery(payload.sql)
    return { columns: [], rows: options.rows ?? [], rowCount: (options.rows ?? []).length }
  })
  const service = new SqlService({}, {}, {}, {}, {}, () => {})
  service.config = {
    connection: (reference) => (reference === conn.id ? conn : undefined),
    settings: () => settings,
  }
  service.ensureBridge = async () => ({ request })
  service.connected.set(conn.id, { driver: { dialect: conn.dialect }, server: { connected: true } })
  return { service, queries, request, conn }
}

describe('对象定义 (DDL)', () => {
  it('MySQL 函数使用 SHOW CREATE FUNCTION 并取最长文本作为定义', async () => {
    const { service, queries } = harness({
      rows: [
        [
          'fn_customer_total',
          'ONLY_FULL_GROUP_BY',
          'CREATE DEFINER=`root`@`%` FUNCTION `fn_customer_total`() RETURNS decimal(12,2)\nBEGIN\n  RETURN 0;\nEND',
          'utf8mb4',
        ],
      ],
    })
    const result = await service.ddl('c1', 'mysql', 'shop', 'fn_customer_total', 'function')
    expect(queries[0]).toBe('SHOW CREATE FUNCTION `shop`.`fn_customer_total`')
    expect(result.source).toBe('server')
    expect(result.ddl).toContain('CREATE DEFINER')
    expect(result.ddl).toContain('END')
  })

  it('MySQL 触发器使用 SHOW CREATE TRIGGER', async () => {
    const { service, queries } = harness({
      rows: [['trg_orders_status', '', 'CREATE DEFINER=`root`@`%` TRIGGER `trg_orders_status` BEFORE UPDATE ON `orders` FOR EACH ROW SET NEW.updated_at = NOW()']],
    })
    const result = await service.ddl('c1', 'mysql', 'shop', 'trg_orders_status', 'trigger')
    expect(queries[0]).toBe('SHOW CREATE TRIGGER `shop`.`trg_orders_status`')
    expect(result.ddl).toContain('CREATE DEFINER')
  })

  it('Oracle 序列请求 DBMS_METADATA.GET_DDL 的 SEQUENCE 类型', async () => {
    const { service, queries } = harness({
      connection: { id: 'c1', driver: 'oracle', dialect: 'oracle', database: 'ORCL' },
      rows: [['  CREATE SEQUENCE "SHOP"."SEQ_ORDER" START WITH 1 INCREMENT BY 1']],
    })
    const result = await service.ddl('c1', 'oracle', 'SHOP', 'SEQ_ORDER', 'sequence')
    expect(queries[0]).toContain("DBMS_METADATA.GET_DDL('SEQUENCE', 'SEQ_ORDER', 'SHOP')")
    expect(result.ddl).toContain('CREATE SEQUENCE')
  })

  it('服务器取不到例程定义时按不支持处理，而不是生成假 DDL', async () => {
    const { service } = harness({
      onQuery: () => {
        throw new Error('Access denied; you need the SHOW_ROUTINE privilege')
      },
    })
    await expect(service.ddl('c1', 'mysql', 'shop', 'fn_customer_total', 'function')).rejects.toMatchObject({
      code: 'unsupported',
      message: '服务器没有返回函数的定义',
    })
    const error = await service
      .ddl('c1', 'mysql', 'shop', 'fn_customer_total', 'function')
      .catch((caught) => caught)
    expect(error).toBeInstanceOf(DbError)
    expect(error.detail).toContain('SHOW_ROUTINE')
  })

  it('不支持的对象类型直接拒绝且不请求服务器', async () => {
    const { service, request } = harness()
    await expect(service.ddl('c1', 'mysql', 'shop', 'x', 'other')).rejects.toMatchObject({ code: 'unsupported' })
    expect(request).not.toHaveBeenCalled()
  })
})

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

describe('SQL Server view definitions', () => {
  it('reads a procedure body with the same catalog function', async () => {
    const { service, calls } = makeService(connection('ms', 'mssql', 'mssql', 'app'), 'CREATE PROCEDURE dbo.rebuild AS SELECT 1')

    const result = await service.ddl('ms', 'mssql', 'dbo', 'rebuild', 'procedure')

    expect(calls[0].sql).toBe("SELECT OBJECT_DEFINITION(OBJECT_ID('[dbo].[rebuild]')) AS ddl")
    expect(result).toMatchObject({ kind: 'procedure', source: 'server' })
  })

  it('reads a view body from OBJECT_DEFINITION', async () => {
    const { service, calls } = makeService(connection('ms', 'mssql', 'mssql', 'app'), 'CREATE VIEW dbo.v_users AS SELECT 1')

    const result = await service.ddl('ms', 'mssql', 'dbo', 'v_users', 'view')

    expect(calls[0].sql).toBe("SELECT OBJECT_DEFINITION(OBJECT_ID('[dbo].[v_users]')) AS ddl")
    expect(result).toMatchObject({ schema: 'dbo', table: 'v_users', kind: 'view', source: 'server' })
    expect(result.ddl).toBe('CREATE VIEW dbo.v_users AS SELECT 1')
  })
})

describe('trigger definitions', () => {
  it('reads a PostgreSQL trigger with pg_get_triggerdef', async () => {
    const { service, calls } = makeService(connection('pg', 'postgres', 'postgres', 'app'), 'CREATE TRIGGER t AFTER INSERT ON users FOR EACH ROW EXECUTE FUNCTION f()')

    const result = await service.ddl('pg', 'postgres', 'public', 't', 'trigger')

    expect(calls[0].sql).toBe(
      "SELECT pg_get_triggerdef(t.oid) AS ddl FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE t.tgname = 't' AND n.nspname = 'public' LIMIT 1",
    )
    expect(result).toMatchObject({ kind: 'trigger', source: 'server' })
  })

  it('reads a SQLite trigger from sqlite_master', async () => {
    const { service, calls } = makeService(connection('lite', 'sqlite', 'sqlite', './app.db'), 'CREATE TRIGGER t AFTER INSERT ON users BEGIN SELECT 1; END')

    const result = await service.ddl('lite', 'sqlite', 'main', 't', 'trigger')

    expect(calls[0].sql).toBe("SELECT sql FROM sqlite_master WHERE type = 'trigger' AND name = 't'")
    expect(result).toMatchObject({ kind: 'trigger', source: 'server' })
  })
})

describe('sequence definitions', () => {
  it('builds a CREATE SEQUENCE for PostgreSQL from pg_sequences', async () => {
    const { service, calls } = makeService(connection('pg', 'postgres', 'postgres', 'app'), 'CREATE SEQUENCE public.s START WITH 1 INCREMENT BY 1')

    const result = await service.ddl('pg', 'postgres', 'public', 's', 'sequence')

    expect(calls[0].sql).toContain('FROM pg_sequences WHERE schemaname = \'public\' AND sequencename = \'s\'')
    expect(result).toMatchObject({ kind: 'sequence', source: 'server' })
    expect(result.ddl).toBe('CREATE SEQUENCE public.s START WITH 1 INCREMENT BY 1')
  })

  it('builds a CREATE SEQUENCE for SQL Server from sys.sequences', async () => {
    const { service, calls } = makeService(connection('ms', 'mssql', 'mssql', 'app'), 'CREATE SEQUENCE [dbo].[s] START WITH 1 INCREMENT BY 1')

    const result = await service.ddl('ms', 'mssql', 'dbo', 's', 'sequence')

    expect(calls[0].sql).toContain('FROM sys.sequences WHERE SCHEMA_NAME(schema_id) = \'dbo\' AND name = \'s\'')
    expect(result).toMatchObject({ kind: 'sequence', source: 'server' })
  })
})

describe('MariaDB style sequences', () => {
  it('asks for SHOW CREATE SEQUENCE on the MySQL dialect', async () => {
    const { service, calls } = makeService(connection('my', 'mysql', 'mysql', 'shop'), 'CREATE SEQUENCE `s` START WITH 1')

    const result = await service.ddl('my', 'mysql', 'shop', 's', 'sequence')

    expect(calls[0].sql).toBe('SHOW CREATE SEQUENCE `shop`.`s`')
    expect(result).toMatchObject({ kind: 'sequence', source: 'server' })
  })
})

describe('comments missing from the server DDL', () => {
  function makeDameng(ddlText, description) {
    const { service, calls } = makeService(connection('dm', 'dameng', 'dameng', 'APP'), ddlText)
    service.describe = async () => description
    return { service, calls }
  }

  const description = {
    schema: 'APP',
    table: 'BL_CHANGE',
    kind: 'table',
    comment: '账务工单',
    columns: [
      { name: 'ID', typeName: 'NUMBER(20,0)', nullable: false, comment: 'ID' },
      { name: 'ORGID', typeName: 'VARCHAR2(144)', nullable: false, comment: '水司ID' },
      { name: 'PLAIN', typeName: 'VARCHAR2(20)', nullable: false },
      { name: 'SPACED', typeName: 'VARCHAR2(20)', nullable: true, comment: '   ' },
    ],
    indexes: [],
  }

  const serverDdl = 'CREATE TABLE "APP"."BL_CHANGE" (\n  "ID" NUMBER(20,0) NOT NULL\n)\nSTORAGE(ON "MAIN", CLUSTERBTR);'

  it('appends the COMMENT ON statements the structure panel shows', async () => {
    const { service } = makeDameng(serverDdl, description)

    const result = await service.ddl('dm', 'dameng', 'APP', 'BL_CHANGE', 'table')

    expect(result.source).toBe('server')
    expect(result.ddl.startsWith(serverDdl)).toBe(true)
    expect(result.ddl).toContain('COMMENT ON TABLE "APP"."BL_CHANGE" IS \'账务工单\';')
    expect(result.ddl).toContain('COMMENT ON COLUMN "APP"."BL_CHANGE"."ORGID" IS \'水司ID\';')
    // Columns without a comment, and blank ones, add nothing.
    expect(result.ddl).not.toContain('"PLAIN"')
    expect(result.ddl).not.toContain('"SPACED"')
    expect(result.warnings).toContain('表与列的注释按数据字典补充为 COMMENT ON 语句')
  })

  it('doubles quotes so the appended statement stays valid', async () => {
    const { service } = makeDameng(serverDdl, { ...description, comment: 'it\'s "fine"' })

    const result = await service.ddl('dm', 'dameng', 'APP', 'BL_CHANGE', 'table')

    expect(result.ddl).toContain(`COMMENT ON TABLE "APP"."BL_CHANGE" IS 'it''s "fine"';`)
  })

  it('leaves DDL that already carries comments alone', async () => {
    const withComment = `${serverDdl}\nCOMMENT ON TABLE "APP"."BL_CHANGE" IS '账务工单';`
    const { service } = makeDameng(withComment, description)

    const result = await service.ddl('dm', 'dameng', 'APP', 'BL_CHANGE', 'table')

    expect(result.ddl).toBe(withComment)
    expect(result.warnings).toEqual([])
  })

  it('still returns the server DDL when the comments cannot be read', async () => {
    const { service } = makeService(connection('dm', 'dameng', 'dameng', 'APP'), serverDdl)
    service.describe = async () => {
      throw new Error('columns failed')
    }

    const result = await service.ddl('dm', 'dameng', 'APP', 'BL_CHANGE', 'table')

    expect(result.ddl).toBe(serverDdl)
    expect(result.warnings).toEqual([])
  })

  it('does not touch DDL for other kinds', async () => {
    const schema = 'CREATE TABLE "APP"."BL_CHANGE" (\n  "ID" NUMBER(20,0) NOT NULL\n);'
    const { service } = makeDameng(schema, description)

    const result = await service.ddl('dm', 'dameng', 'APP', 'BL_CHANGE', 'view')

    expect(result.ddl).toBe(schema)
  })
})

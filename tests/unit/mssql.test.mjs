import { describe, expect, it } from 'vitest'

import {
  jarCoordinates,
  jarRelativePath,
  PRESET_ORDER,
  PRESETS,
  SQL_DIALECT_LABEL,
} from '../../src/shared/presets.ts'
import { wrapPage } from '../../src/client/pagesql.ts'
import {
  orderByForPaging,
  pageClause,
  qualifiedName,
  quoteIdent,
  tableSelectSql,
} from '../../src/client/tablesql.ts'

describe('SQL Server preset', () => {
  it('pins the jre8 build of mssql-jdbc', () => {
    const preset = PRESETS.mssql
    expect(preset.id).toBe('mssql')
    expect(preset.dialect).toBe('mssql')
    expect(preset.defaultPort).toBe(1433)
    expect(preset.driverClass).toBe('com.microsoft.sqlserver.jdbc.SQLServerDriver')
    expect(preset.urlTemplate).toContain('jdbc:sqlserver://{{host}}:{{port}}')
    expect(preset.urlTemplate).toContain('databaseName={{database}}')
    const jar = preset.jar
    if (jar === undefined) throw new Error('missing jar')
    expect(jar.version).toBe('9.4.1.jre8')
    expect(jar.classifier).toBeUndefined()
    expect(jarCoordinates(jar)).toBe('com.microsoft.sqlserver:mssql-jdbc:9.4.1.jre8')
    expect(jarRelativePath(jar)).toBe(
      'com/microsoft/sqlserver/mssql-jdbc/9.4.1.jre8/mssql-jdbc-9.4.1.jre8.jar',
    )
  })

  it('sits after SQLite in the picker', () => {
    expect(PRESET_ORDER.indexOf('mssql')).toBe(PRESET_ORDER.indexOf('sqlite') + 1)
    expect(SQL_DIALECT_LABEL.mssql).toBe('SQL Server')
  })
})

describe('SQL Server SQL text', () => {
  it('quotes identifiers with brackets', () => {
    expect(quoteIdent('mssql', 'orders')).toBe('[orders]')
    expect(quoteIdent('mssql', 'odd]name')).toBe('[odd]]name]')
    expect(qualifiedName('mssql', 'dbo', 'orders')).toBe('[dbo].[orders]')
  })

  it('always has an ORDER BY before OFFSET / FETCH', () => {
    expect(orderByForPaging('mssql', '')).toBe(' ORDER BY (SELECT NULL)')
    expect(orderByForPaging('mssql', 'id DESC')).toBe(' ORDER BY id DESC')
    expect(orderByForPaging('mysql', '')).toBe('')
    expect(pageClause('mssql', 10, 20)).toBe('OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY')
    expect(tableSelectSql('mssql', 'dbo', 'orders', 'id > 1', '', 50)).toBe(
      'SELECT * FROM [dbo].[orders] WHERE id > 1 ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY',
    )
    expect(wrapPage('mssql', 'SELECT * FROM [dbo].[orders]', 10, 2)).toContain(
      ') dshdb_page ORDER BY (SELECT NULL) OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY',
    )
  })
})

import { describe, expect, it } from 'vitest'

import { PRESET_ORDER, PRESETS, SQL_DIALECT_LABEL } from '../../src/shared/presets.ts'
import { pageClause, qualifiedName, quoteIdent, tableSelectSql } from '../../src/client/tablesql.ts'

describe('SQLite preset', () => {
  it('opens a database file instead of a host and port', () => {
    const preset = PRESETS.sqlite
    expect(preset.id).toBe('sqlite')
    expect(preset.dialect).toBe('sqlite')
    expect(preset.defaultPort).toBe(0)
    expect(preset.hostOptional).toBe(true)
    expect(preset.driverClass).toBe('org.sqlite.JDBC')
    expect(preset.urlTemplate).toBe('jdbc:sqlite:{{database}}')
    expect(preset.jar).toEqual({ group: 'org.xerial', artifact: 'sqlite-jdbc', version: '3.46.1.3' })
    expect(preset.databaseHint).toContain('数据库文件路径')
  })

  it('sits after PostgreSQL in the picker', () => {
    expect(PRESET_ORDER.indexOf('sqlite')).toBe(PRESET_ORDER.indexOf('postgres') + 1)
    expect(SQL_DIALECT_LABEL.sqlite).toBe('SQLite')
  })
})

describe('SQLite SQL text', () => {
  it('quotes identifiers with double quotes', () => {
    expect(quoteIdent('sqlite', 'orders')).toBe('"orders"')
    expect(qualifiedName('sqlite', 'main', 'orders')).toBe('"main"."orders"')
  })

  it('pages with LIMIT / OFFSET', () => {
    expect(pageClause('sqlite', 25, 50)).toBe('LIMIT 25 OFFSET 50')
    expect(tableSelectSql('sqlite', 'main', 'orders', '', '', 100)).toBe(
      'SELECT * FROM "main"."orders" LIMIT 100 OFFSET 0',
    )
  })
})

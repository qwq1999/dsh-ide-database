import { describe, expect, it } from 'vitest'

import { DIALECT_LABEL, PRESET_ORDER, PRESETS, SQL_DIALECT_LABEL } from '../../src/shared/presets.ts'
import { pageClause, qualifiedName, quoteIdent, tableSelectSql } from '../../src/client/tablesql.ts'

describe('PostgreSQL preset', () => {
  it('ships a preset with the driver and URL the server expects', () => {
    const preset = PRESETS.postgres
    expect(preset.id).toBe('postgres')
    expect(preset.dialect).toBe('postgres')
    expect(preset.defaultPort).toBe(5432)
    expect(preset.driverClass).toBe('org.postgresql.Driver')
    expect(preset.urlTemplate).toBe('jdbc:postgresql://{{host}}:{{port}}/{{database}}')
    expect(preset.jar).toEqual({ group: 'org.postgresql', artifact: 'postgresql', version: '42.7.4' })
    expect(preset.needsJava).toBe(true)
  })

  it('shows up in the picker before Redis', () => {
    expect(PRESET_ORDER).toContain('postgres')
    expect(PRESET_ORDER.indexOf('postgres')).toBeLessThan(PRESET_ORDER.indexOf('sqlite'))
    expect(PRESET_ORDER.indexOf('sqlite')).toBeLessThan(PRESET_ORDER.indexOf('redis'))
    expect(SQL_DIALECT_LABEL.postgres).toBe('PostgreSQL')
    expect(DIALECT_LABEL.postgres).toBe('PostgreSQL')
  })
})

describe('PostgreSQL SQL text', () => {
  it('quotes identifiers with double quotes', () => {
    expect(quoteIdent('postgres', 'orders')).toBe('"orders"')
    expect(quoteIdent('postgres', 'Order Items')).toBe('"Order Items"')
    expect(qualifiedName('postgres', 'public', 'orders')).toBe('"public"."orders"')
  })

  it('pages with LIMIT / OFFSET', () => {
    expect(pageClause('postgres', 50, 0)).toBe('LIMIT 50 OFFSET 0')
    expect(pageClause('postgres', 100, 200)).toBe('LIMIT 100 OFFSET 200')
  })

  it('builds a paged SELECT for the table tab', () => {
    expect(tableSelectSql('postgres', 'public', 'orders', '', '', 500)).toBe(
      'SELECT * FROM "public"."orders" LIMIT 500 OFFSET 0',
    )
  })
})

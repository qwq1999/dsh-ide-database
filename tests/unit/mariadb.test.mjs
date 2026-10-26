import { describe, expect, it } from 'vitest'

import { PRESET_ORDER, PRESETS, SQL_DIALECT_LABEL } from '../../src/shared/presets.ts'
import { qualifiedName, quoteIdent, tableSelectSql } from '../../src/client/tablesql.ts'
import { tableFromStatement } from '../../src/client/tablesql.ts'

describe('MariaDB preset', () => {
  it('uses the MariaDB driver and URL but the MySQL dialect', () => {
    const preset = PRESETS.mariadb
    expect(preset.id).toBe('mariadb')
    expect(preset.dialect).toBe('mysql')
    expect(preset.defaultPort).toBe(3306)
    expect(preset.driverClass).toBe('org.mariadb.jdbc.Driver')
    expect(preset.urlTemplate).toBe('jdbc:mariadb://{{host}}:{{port}}/{{database}}')
    expect(preset.jar).toEqual({ group: 'org.mariadb.jdbc', artifact: 'mariadb-java-client', version: '3.4.1' })
    expect(preset.needsJava).toBe(true)
    expect(SQL_DIALECT_LABEL.mysql).toBe('MySQL')
  })

  it('sits next to MySQL in the picker', () => {
    expect(PRESET_ORDER.indexOf('mariadb')).toBe(PRESET_ORDER.indexOf('mysql') + 1)
    expect(PRESET_ORDER.indexOf('mariadb')).toBeLessThan(PRESET_ORDER.indexOf('oceanbase-mysql'))
  })
})

describe('MariaDB uses MySQL SQL text', () => {
  it('quotes with backticks and pages with LIMIT / OFFSET', () => {
    expect(quoteIdent('mysql', 'orders')).toBe('`orders`')
    expect(qualifiedName('mysql', 'shop', 'orders')).toBe('`shop`.`orders`')
    expect(tableSelectSql('mysql', 'shop', 'orders', '', '', 100)).toBe(
      'SELECT * FROM `shop`.`orders` LIMIT 100 OFFSET 0',
    )
    expect(tableFromStatement('SELECT * FROM `shop`.`orders`')).toEqual({ schema: 'shop', table: 'orders' })
  })
})

import { describe, expect, it } from 'vitest'

import { isPresetId, isSqlDialect, jarCacheName, PRESET_LABEL, PRESET_ORDER, presetOf } from '../../src/shared/presets.ts'

describe('preset labels', () => {
  it('names each preset after itself instead of falling back to another engine', () => {
    expect(Object.keys(PRESET_LABEL).sort()).toEqual([...PRESET_ORDER].sort())
    expect(new Set(Object.values(PRESET_LABEL)).size).toBe(PRESET_ORDER.length)
    expect(PRESET_LABEL.mariadb).toBe('MariaDB')
    expect(PRESET_LABEL.sqlite).toBe('SQLite')
    expect(PRESET_LABEL.mssql).toBe('SQL Server')
  })
})

describe('preset lookup', () => {
  it('recognises only own preset ids', () => {
    expect(isPresetId('mysql')).toBe(true)
    expect(isPresetId('sqlite')).toBe(true)
    expect(isPresetId('custom')).toBe(false)
    expect(isPresetId('nope')).toBe(false)
    for (const inherited of ['toString', 'constructor', '__proto__', 'hasOwnProperty', 'valueOf']) {
      expect(isPresetId(inherited)).toBe(false)
      expect(presetOf(inherited)).toBeUndefined()
    }
  })

  it('returns the matching preset spec for a real id', () => {
    expect(presetOf('sqlite')).toMatchObject({ id: 'sqlite', hostOptional: true, defaultPort: 0 })
    expect(presetOf('mysql')?.defaultPort).toBe(3306)
  })
})

describe('isSqlDialect', () => {
  it('accepts only real SQL dialects, not arbitrary strings', () => {
    for (const dialect of ['mysql', 'oracle', 'dameng', 'postgres', 'sqlite', 'mssql', 'oceanbase-oracle', 'generic']) {
      expect(isSqlDialect(dialect)).toBe(true)
    }
    for (const bogus of ['redis', '', 'bogus', 'postgress', '__proto__', 'toString', 'constructor']) {
      expect(isSqlDialect(bogus)).toBe(false)
    }
  })
})


describe('jarCacheName', () => {
  it('gives each classifier of the same coordinates its own cache file', () => {
    const base = { group: 'com.microsoft.sqlserver', artifact: 'mssql-jdbc', version: '9.4.1' }
    const plain = jarCacheName(base)
    const jre8 = jarCacheName({ ...base, classifier: 'jre8' })
    const jre11 = jarCacheName({ ...base, classifier: 'jre11' })
    expect(jre8).not.toBe(jre11)
    expect(jre8).not.toBe(plain)
    expect(jre11).not.toBe(plain)
    expect(jre8).toContain('jre8')
    expect(jre11).toContain('jre11')
  })


  it('keeps groups with literal underscores distinct from dot-separated ones', () => {
    // JAR_PART_PATTERN allows `_` inside a group, so `com.acme.team` and
    // `com_acme_team` are distinct Maven coordinates and must not share a
    // cache file (otherwise one loads the other's jar bytecode).
    const dotted = { group: 'com.acme.team', artifact: 'jdbc', version: '1.0' }
    const underscored = { group: 'com_acme_team', artifact: 'jdbc', version: '1.0' }
    expect(jarCacheName(dotted)).not.toBe(jarCacheName(underscored))
    // A custom group must not collide with a built-in driver's cache either.
    const mysql = { group: 'com.mysql', artifact: 'mysql-connector-j', version: '8.4.0' }
    const fakeMysql = { group: 'com_mysql', artifact: 'mysql-connector-j', version: '8.4.0' }
    expect(jarCacheName(mysql)).not.toBe(jarCacheName(fakeMysql))
    // Groups without `_` keep their historic name (cache compatibility).
    expect(jarCacheName(mysql)).toBe('com_mysql__mysql-connector-j__8.4.0.jar')
  })
})

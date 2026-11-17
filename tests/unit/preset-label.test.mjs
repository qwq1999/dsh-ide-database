import { describe, expect, it } from 'vitest'

import { isPresetId, PRESET_LABEL, PRESET_ORDER, presetOf } from '../../src/shared/presets.ts'

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

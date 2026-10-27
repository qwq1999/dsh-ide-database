import { describe, expect, it } from 'vitest'

import { PRESET_LABEL, PRESET_ORDER } from '../../src/shared/presets.ts'

describe('preset labels', () => {
  it('names each preset after itself instead of falling back to another engine', () => {
    expect(Object.keys(PRESET_LABEL).sort()).toEqual([...PRESET_ORDER].sort())
    expect(new Set(Object.values(PRESET_LABEL)).size).toBe(PRESET_ORDER.length)
    expect(PRESET_LABEL.mariadb).toBe('MariaDB')
    expect(PRESET_LABEL.sqlite).toBe('SQLite')
    expect(PRESET_LABEL.mssql).toBe('SQL Server')
  })
})

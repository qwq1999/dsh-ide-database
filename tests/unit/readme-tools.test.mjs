import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * The overview sentence drifts whenever a tool is added, so keep the stated
 * count and the table below it in sync.
 */
describe('README agent tools', () => {
  const text = readFileSync('README.md', 'utf8')

  it('states the same number of tools as the table lists', () => {
    const stated = /：(\d+) 个 `db_\*` 工具/u.exec(text)
    const listed = text.split('\n').filter((line) => line.startsWith('| `db_')).length
    expect(stated).not.toBeNull()
    expect(Number(stated?.[1])).toBe(listed)
  })
})

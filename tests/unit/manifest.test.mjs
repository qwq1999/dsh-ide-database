import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { createDatabaseTools } from '../../lib/host/tools.js'

/**
 * The manifest ships the tool list and the version the Host displays; both
 * drifted in the past (0.2.0 declared 11 tools while 16 were registered).
 */
describe('plugin manifest', () => {
  const manifest = JSON.parse(readFileSync('dsh.plugin.json', 'utf8'))
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  const tools = createDatabaseTools({})

  it('declares every registered tool', () => {
    const registered = tools.map((tool) => tool.name).sort()
    expect([...manifest.contributes.tools].sort()).toEqual(registered)
  })

  it('keeps the manifest version in sync with package.json', () => {
    expect(manifest.version).toBe(packageJson.version)
  })
})

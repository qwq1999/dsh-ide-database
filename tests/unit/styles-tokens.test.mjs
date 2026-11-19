import { describe, expect, it } from 'vitest'
import { CSS } from '../../src/client/styles'

describe('stylesheet CSS custom properties', () => {
  it('defines every plugin-private variable it references', () => {
    // --dshdb-depth is deliberately set via inline style on tree rows, not in CSS.
    const inlineDefined = new Set(['--dshdb-depth'])
    const referenced = new Set()
    for (const match of CSS.matchAll(/var\((--dshdb-[a-z0-9-]+)/gu)) {
      referenced.add(match[1])
    }
    const defined = new Set()
    for (const match of CSS.matchAll(/(--dshdb-[a-z0-9-]+)\s*:/gu)) {
      defined.add(match[1])
    }
    for (const name of referenced) {
      if (inlineDefined.has(name)) continue
      expect(defined.has(name), `${name} is referenced but never defined`).toBe(true)
    }
  })

  it('does not reference a misspelled business-primary token', () => {
    // The correct token is --dsw-alias-state-business-primary; the short form is
    // undefined and used to make the resize grip hover indicator disappear.
    expect(CSS).not.toMatch(/var\(--dsw-alias-business-primary\)/u)
  })

  it('gives the redis key panel a monospace, dimmed, bordered style', () => {
    const panel = CSS.match(/\.dshdb-redis-value\s*\{[^}]*\}/u)?.[0] ?? ''
    expect(panel).toMatch(/border-top:\s*1px solid var\(--dsw-alias-border-l1\)/u)
    const key = CSS.match(/\.dshdb-redis-key\s*\{[^}]*\}/u)?.[0] ?? ''
    expect(key).toMatch(/color:\s*var\(--dsw-alias-label-tertiary\)/u)
    expect(key).toMatch(/font-family:\s*var\(--ds-font-family-code/u)
  })
})

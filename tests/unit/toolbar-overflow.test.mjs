import { describe, expect, it } from 'vitest'

import { TOOLBAR_GAP, fitActionCount } from '../../src/client/toolbaroverflow.ts'

const widths = [40, 40, 40]

describe('fitActionCount', () => {
  it('keeps every action when they all fit', () => {
    expect(fitActionCount(widths, 200, 30)).toBe(3)
  })

  it('reserves room for the overflow button once a cut is needed', () => {
    // 40 + gap 6 + overflow button 30 does not fit into 100.
    expect(fitActionCount(widths, 100, 30)).toBe(1)
    // But 40 + 46 = 86 is fine in 100.
    expect(fitActionCount(widths, 86, 30)).toBe(1)
  })

  it('hides everything when not even the first action plus "…" fits', () => {
    expect(fitActionCount(widths, 70, 30)).toBe(0)
  })

  it('shows everything when nothing has been measured yet (jsdom, hidden tab)', () => {
    expect(fitActionCount(widths, 0, 30)).toBe(3)
    expect(fitActionCount(widths, -12, 30)).toBe(3)
  })

  it('handles empty toolbars and the default gap', () => {
    expect(fitActionCount([], 200, 30)).toBe(0)
    expect(fitActionCount([40, 40], 86, 30)).toBe(2)
    expect(TOOLBAR_GAP).toBe(6)
  })
})

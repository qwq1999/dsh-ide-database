import { describe, expect, it } from 'vitest'

import { OBJECT_PAGE, objectWindow } from '../../src/client/views/objectlimit'

describe('objectWindow', () => {
  it('shows the first page and folds the rest', () => {
    expect(objectWindow(OBJECT_PAGE + 5, 0)).toEqual({ visible: OBJECT_PAGE, hidden: 5 })
  })

  it('shows everything when the list fits', () => {
    expect(objectWindow(3, 0)).toEqual({ visible: 3, hidden: 0 })
  })

  it('unfolds as many rows as were asked for', () => {
    expect(objectWindow(500, OBJECT_PAGE)).toEqual({ visible: OBJECT_PAGE * 2, hidden: 500 - OBJECT_PAGE * 2 })
  })

  it('never shows more rows than the list has', () => {
    expect(objectWindow(250, 10_000)).toEqual({ visible: 250, hidden: 0 })
  })

  it('treats a broken counter as zero', () => {
    expect(objectWindow(OBJECT_PAGE + 1, Number.NaN)).toEqual({ visible: OBJECT_PAGE, hidden: 1 })
    expect(objectWindow(OBJECT_PAGE + 1, -50)).toEqual({ visible: OBJECT_PAGE, hidden: 1 })
  })
})

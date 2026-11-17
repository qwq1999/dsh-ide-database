import { describe, expect, it } from 'vitest'

import { UPDATE_NOTICES, visibleNotices } from '../../lib/shared/notices.js'

describe('update notices', () => {
  it('announces the tree table comments', () => {
    expect(UPDATE_NOTICES.map((notice) => notice.id)).toEqual(['table-comments'])
    const [notice] = UPDATE_NOTICES
    expect(notice.level).toBe('success')
    expect(notice.settingsAction).toBe(true)
    expect(notice.body).toContain('设置')
  })

  it('shows every notice while the user has not closed one', () => {
    expect(visibleNotices([])).toEqual(UPDATE_NOTICES)
  })

  it('drops the ids the user closed', () => {
    expect(visibleNotices(['table-comments'])).toEqual([])
  })

  it('ignores ids it does not ship', () => {
    // A notice dropped in a later version leaves its dismissal behind; it must
    // neither hide a live notice nor reorder the rest.
    expect(visibleNotices(['removed-notice'])).toEqual(UPDATE_NOTICES)
  })
})

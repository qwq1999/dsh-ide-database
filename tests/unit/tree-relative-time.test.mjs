// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { relativeTime } from '../../src/client/views/DataView.tsx'

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const at = (secondsAgo) => new Date(Date.parse('2026-03-01T12:00:00.000Z') - secondsAgo * 1000).toISOString()

  it('rounds minutes, hours and days', () => {
    expect(relativeTime(at(10))).toBe('刚刚')
    expect(relativeTime(at(90))).toBe('2 分钟前')
    expect(relativeTime(at(3 * 3600))).toBe('3 小时前')
    expect(relativeTime(at(86399))).toBe('1 天前')
    expect(relativeTime(at(3 * 86400))).toBe('3 天前')
  })

  it('shows nothing for an unreadable stamp', () => {
    expect(relativeTime('not a date')).toBe('')
  })
})

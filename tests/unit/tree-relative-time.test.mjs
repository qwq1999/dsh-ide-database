// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { relativeTime } from '../../src/client/views/DataView.tsx'
import { historyAgo } from '../../src/client/history.ts'

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const at = (secondsAgo) => new Date(Date.parse('2026-03-01T12:00:00.000Z') - secondsAgo * 1000).toISOString()

  it('floors per unit so an age never rounds up into the next unit', () => {
    expect(relativeTime(at(10))).toBe('刚刚')
    expect(relativeTime(at(90))).toBe('1 分钟前')
    expect(relativeTime(at(3 * 3600))).toBe('3 小时前')
    expect(relativeTime(at(86399))).toBe('23 小时前')
    expect(relativeTime(at(3 * 86400))).toBe('3 天前')
  })

  it('agrees with the history rows at the same age', () => {
    const now = Date.parse('2026-03-01T12:00:00.000Z')
    for (const seconds of [10, 90, 3 * 3600, 86399, 3 * 86400]) {
      expect(historyAgo(now - seconds * 1000, now)).toBe(relativeTime(at(seconds)))
    }
  })

  it('shows nothing for an unreadable stamp', () => {
    expect(relativeTime('not a date')).toBe('')
  })
})

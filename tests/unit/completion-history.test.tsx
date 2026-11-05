// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  completionDebugEnabled,
  logCompletionMetrics,
  recentCompletions,
  rememberCompletion,
} from '../../src/client/completionhistory'

const HISTORY_KEY = 'dsh-ide-database:completion-history'
const DEBUG_KEY = 'dsh-ide-database:completion-debug'

describe('completion history', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('starts empty', () => {
    expect(recentCompletions()).toEqual([])
  })

  it('ignores corrupt stored values', () => {
    localStorage.setItem(HISTORY_KEY, '{oops')
    expect(recentCompletions()).toEqual([])

    localStorage.setItem(HISTORY_KEY, JSON.stringify(['orders', 7, '', 'orders']))
    expect(recentCompletions()).toEqual(['orders'])
  })

  it('moves a remembered name to the front', () => {
    rememberCompletion('orders')
    rememberCompletion('customers')
    rememberCompletion('orders')

    expect(recentCompletions()).toEqual(['orders', 'customers'])
  })

  it('deduplicates case-insensitively', () => {
    rememberCompletion('Orders')
    rememberCompletion('orders')

    expect(recentCompletions()).toEqual(['orders'])
  })

  it('skips stars and keeps the list bounded', () => {
    rememberCompletion('*')
    for (let index = 0; index < 120; index += 1) rememberCompletion(`name-${index}`)

    const names = recentCompletions()
    expect(names).toHaveLength(100)
    expect(names[0]).toBe('name-119')
    expect(names).not.toContain('*')
  })

  it('starts with the debug log off', () => {
    expect(completionDebugEnabled()).toBe(false)

    const spy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    logCompletionMetrics(12, 5, 'ord')

    expect(spy).not.toHaveBeenCalled()
  })

  it('logs one local line when the debug switch is on', () => {
    localStorage.setItem(DEBUG_KEY, '1')
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => undefined)

    logCompletionMetrics(12, 5, 'ord')

    expect(spy).toHaveBeenCalledTimes(1)
    const line = String(spy.mock.calls[0]?.[0] ?? '')
    expect(line).toContain('12 ms')
    expect(line).toContain('5')
    expect(line).toContain('ord')
  })
})

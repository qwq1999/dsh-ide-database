// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  completionDebugEnabled,
  completionFrequency,
  logCompletionMetrics,
  recentCompletions,
  rememberCompletion,
} from '../../src/client/completionhistory'

const HISTORY_KEY = 'dsh-ide-database:completion-history'
const FREQUENCY_KEY = 'dsh-ide-database:completion-frequency'
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

  it('counts picks per name, case-insensitively', () => {
    expect(completionFrequency()).toEqual({})
    rememberCompletion('Orders')
    rememberCompletion('orders')
    rememberCompletion('total')

    expect(completionFrequency()).toEqual({ orders: 2, total: 1 })
  })

  it('ignores corrupt frequency entries', () => {
    localStorage.setItem(FREQUENCY_KEY, '[1, 2]')
    expect(completionFrequency()).toEqual({})

    localStorage.setItem(
      FREQUENCY_KEY,
      JSON.stringify({ orders: 'many', total: -2, id: 3, '': 1 }),
    )
    expect(completionFrequency()).toEqual({ id: 3 })
  })

  it('keeps the most picked names when the frequency map is full', () => {
    for (let index = 0; index < 220; index += 1) rememberCompletion(`name-${index}`)
    rememberCompletion('hot')
    rememberCompletion('hot')

    const counts = completionFrequency()
    expect(Object.keys(counts).length).toBeLessThanOrEqual(200)
    expect(counts.hot).toBe(2)
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

import { describe, expect, it } from 'vitest'

import {
  CONSOLE_ACTION_IDS,
  isConsoleActionId,
  orderConsoleActions,
  readConsoleActionOrder,
} from '../../src/shared/consoleactions.ts'

describe('console action order', () => {
  it('keeps the saved order while dropping unknown and repeated ids', () => {
    expect(readConsoleActionOrder(['export', 'nope', 'export', 'run'])).toEqual(['export', 'run'])
  })

  it('returns an empty order for junk instead of throwing', () => {
    expect(readConsoleActionOrder(undefined)).toEqual([])
    expect(readConsoleActionOrder('export')).toEqual([])
    expect(readConsoleActionOrder([1, 'save', null])).toEqual(['save'])
  })

  it('appends actions the saved order does not mention', () => {
    const order = orderConsoleActions(['export', 'run'])
    expect(order.slice(0, 2)).toEqual(['export', 'run'])
    expect(order).toHaveLength(CONSOLE_ACTION_IDS.length)
    expect(new Set(order).size).toBe(CONSOLE_ACTION_IDS.length)
    expect(order.slice(2)).toEqual(CONSOLE_ACTION_IDS.filter((id) => id !== 'export' && id !== 'run'))
  })

  it('uses the default order when nothing is saved', () => {
    expect(orderConsoleActions(undefined)).toEqual([...CONSOLE_ACTION_IDS])
    expect(orderConsoleActions([])).toEqual([...CONSOLE_ACTION_IDS])
  })

  it('recognises only the ids this version knows', () => {
    expect(isConsoleActionId('save')).toBe(true)
    expect(isConsoleActionId('nope')).toBe(false)
    expect(isConsoleActionId(3)).toBe(false)
  })
})

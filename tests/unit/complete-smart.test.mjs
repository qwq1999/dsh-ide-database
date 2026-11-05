import { describe, expect, it } from 'vitest'

import { completionCandidates, functionCompletions } from '../../src/client/complete'

const column = (name) => ({ name, kind: 'column' })

describe('completion ranking', () => {
  const items = [column('order_id'), column('created_at'), column('id'), column('customer')]

  it('matches the start of a later word part', () => {
    expect(completionCandidates('id', items).map((item) => item.name)).toEqual(['id', 'order_id'])
  })

  it('matches a subsequence as a last resort', () => {
    expect(completionCandidates('crat', items).map((item) => item.name)).toEqual(['created_at'])
  })

  it('keeps prefix matches ahead of later matches', () => {
    const list = [column('created_at'), column('cat')]
    expect(completionCandidates('cat', list).map((item) => item.name)).toEqual(['cat', 'created_at'])
  })

  it('offers functions with their opening parenthesis', () => {
    const [first] = functionCompletions()
    expect(first.kind).toBe('function')
    expect(first.insert.endsWith('(')).toBe(true)
  })
})
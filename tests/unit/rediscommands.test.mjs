import { describe, expect, it } from 'vitest'
import { applyCommandCompletion, commandCompletion, REDIS_COMMANDS } from '../../src/client/rediscommands'

describe('commandCompletion', () => {
  it('completes the first word from a prefix', () => {
    expect(commandCompletion('ge', 2)).toEqual({ start: 0, end: 2, command: 'GET' })
    expect(commandCompletion('  in', 4)).toEqual({ start: 2, end: 4, command: 'INCR' })
  })

  it('leaves a command that is already complete alone', () => {
    expect(commandCompletion('GET', 3)).toBeNull()
  })

  it('ignores the caret once the command word is typed', () => {
    expect(commandCompletion('GET shop:1', 8)).toBeNull()
    expect(commandCompletion('GET ', 4)).toBeNull()
    expect(commandCompletion('', 0)).toBeNull()
  })

  it('returns nothing for a prefix it does not know', () => {
    expect(commandCompletion('zz', 2)).toBeNull()
  })

  it('offers the command names the host knows about', () => {
    expect(REDIS_COMMANDS).toContain('HGETALL')
    expect(REDIS_COMMANDS).toContain('SCAN')
  })
})

describe('applyCommandCompletion', () => {
  it('replaces the command word and reports where the caret goes', () => {
    const completion = commandCompletion('ge shop:1', 2)
    if (completion === null) throw new Error('missing completion')
    const next = applyCommandCompletion('ge shop:1', completion)
    expect(next.text).toBe('GET shop:1')
    expect(next.caret).toBe(3)
  })

  it('keeps the rest of the line untouched', () => {
    const completion = { start: 0, end: 2, command: 'DEL' }
    expect(applyCommandCompletion('de user:1 user:2', completion).text).toBe('DEL user:1 user:2')
  })
})

import { describe, expect, it } from 'vitest'
import { txButtonDisabled, txStatement } from '../../src/client/transaction.js'

describe('txStatement', () => {
  it('maps the three actions to SQL', () => {
    expect(txStatement('start')).toBe('BEGIN')
    expect(txStatement('commit')).toBe('COMMIT')
    expect(txStatement('rollback')).toBe('ROLLBACK')
  })
})

describe('txButtonDisabled', () => {
  it('only allows start when idle', () => {
    expect(txButtonDisabled('idle', 'start')).toBe(false)
    expect(txButtonDisabled('open', 'start')).toBe(true)
  })

  it('only allows commit and rollback when open', () => {
    expect(txButtonDisabled('idle', 'commit')).toBe(true)
    expect(txButtonDisabled('open', 'rollback')).toBe(false)
  })
})

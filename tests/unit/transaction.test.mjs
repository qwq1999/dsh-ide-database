import { describe, expect, it } from 'vitest'
import { txButtonDisabled } from '../../src/client/transaction.js'

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

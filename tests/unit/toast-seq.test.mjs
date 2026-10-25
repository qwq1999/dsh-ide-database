import { describe, expect, it } from 'vitest'

import { nextToast } from '../../src/client/ui'

describe('nextToast', () => {
  it('counts up so two notices never share a key', () => {
    const first = nextToast(null, 'a')
    const second = nextToast(first, 'b', 'error')
    expect(first.seq).toBe(1)
    expect(second.seq).toBe(2)
    expect(second.tone).toBe('error')
  })

  it('defaults to the info tone', () => {
    expect(nextToast(null, 'x').tone).toBe('info')
  })
})

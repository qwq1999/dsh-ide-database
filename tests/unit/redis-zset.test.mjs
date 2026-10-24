import { describe, expect, it } from 'vitest'

import { zsetEntries } from '../../lib/host/redis.js'

describe('zsetEntries', () => {
  it('parses the flat WITHSCORES reply', () => {
    expect(zsetEntries(['SKU-0031', '155', 'SKU-0042', '120.5', 'SKU-0100', '99'])).toEqual([
      { member: 'SKU-0031', score: 155 },
      { member: 'SKU-0042', score: 120.5 },
      { member: 'SKU-0100', score: 99 },
    ])
  })

  it('parses the RESP3 [member, score] pair reply', () => {
    expect(
      zsetEntries([
        ['SKU-0031', '155'],
        ['SKU-0042', '120.5'],
      ]),
    ).toEqual([
      { member: 'SKU-0031', score: 155 },
      { member: 'SKU-0042', score: 120.5 },
    ])
  })

  it('keeps members with non-numeric scores at zero and ignores lonely entries', () => {
    expect(zsetEntries(['SKU-1', 'abc', 'SKU-2'])).toEqual([{ member: 'SKU-1', score: 0 }])
    expect(zsetEntries(null)).toEqual([])
  })
})

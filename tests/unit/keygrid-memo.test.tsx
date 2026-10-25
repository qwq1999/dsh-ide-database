// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const counted = vi.hoisted(() => ({ formatCount: vi.fn() }))

vi.mock('../../src/client/format', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/format')>()
  counted.formatCount.mockImplementation(actual.formatCount)
  return { ...actual, formatCount: counted.formatCount }
})

import { KeyGrid } from '../../src/client/console-view'
import type { RedisKeyInfo } from '../../src/shared/types'

const keys: RedisKeyInfo[] = [
  { key: 'shop:1', type: 'string', ttl: -1, size: 12 },
  { key: 'shop:2', type: 'hash', ttl: 60, size: 3 },
]

const pick = (): void => undefined

describe('redis key grid rendering', () => {
  it('keeps rows untouched when the page only gets a new array', () => {
    const view = render(<KeyGrid keys={keys} selectedKey="" onSelect={pick} />)
    const first = counted.formatCount.mock.calls.length
    // A fresh array (a new scan page merged into state) but the same key objects.
    view.rerender(<KeyGrid keys={[...keys]} selectedKey="" onSelect={pick} />)
    expect(counted.formatCount.mock.calls.length).toBe(first)
  })

  it('redraws the row when its selection changes', () => {
    const view = render(<KeyGrid keys={keys} selectedKey="" onSelect={pick} />)
    const before = counted.formatCount.mock.calls.length
    view.rerender(<KeyGrid keys={[...keys]} selectedKey="shop:1" onSelect={pick} />)
    expect(counted.formatCount.mock.calls.length).toBeGreaterThan(before)
  })
})

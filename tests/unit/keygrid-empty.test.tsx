// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { KeyGrid } from '../../src/client/console-view'

afterEach(() => {
  cleanup()
})

describe('KeyGrid empty state', () => {
  it('explains an empty scan without a filter', () => {
    render(<KeyGrid keys={[]} selectedKey="" emptyText="这个库还没有键" onSelect={() => {}} />)
    expect(screen.getByText('这个库还没有键')).toBeTruthy()
  })

  it('falls back to a generic message', () => {
    render(<KeyGrid keys={[]} selectedKey="" onSelect={() => {}} />)
    expect(screen.getByText('没有匹配的键')).toBeTruthy()
  })

  it('shows no hint when keys are listed', () => {
    const info = { key: 'user:1', type: 'string', ttl: -1, size: 3 } as never
    const select = vi.fn()
    render(<KeyGrid keys={[info]} selectedKey="" onSelect={select} />)
    expect(screen.queryByText('没有匹配的键')).toBeNull()
    expect(screen.getByText('user:1')).toBeTruthy()
  })
})

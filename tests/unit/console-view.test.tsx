/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { HistoryPanel, KeyGrid, PagerButton, formatCount, oneLine } from '../../src/client/console-view'

afterEach(() => cleanup())

describe('console presentational pieces', () => {
  it('folds a statement onto one line', () => {
    expect(oneLine('select 1\n  from dual')).toBe('select 1 from dual')
  })

  it('formats counts with thousands separators', () => {
    expect(formatCount(1234567)).toBe('1,234,567')
  })

  it('shows the empty state when nothing has run yet', () => {
    render(<HistoryPanel entries={[]} pins={[]} onPick={() => {}} onTogglePin={() => {}} onClear={() => {}} />)
    expect(screen.getByText('还没有执行过语句')).toBeTruthy()
  })

  it('lists pinned statements before the recent list', () => {
    const pinned = { statement: 'select 7', at: Date.now() }
    const recent = { statement: 'select 8', at: Date.now() - 1000 }
    render(
      <HistoryPanel entries={[recent]} pins={[pinned]} onPick={() => {}} onTogglePin={() => {}} onClear={() => {}} />,
    )
    expect(screen.getByText('收藏 · 1')).toBeTruthy()
    expect(screen.getByText('最近执行 · 1')).toBeTruthy()
  })

  it('renders redis keys with type and size', () => {
    const onSelect = vi.fn()
    render(
      <KeyGrid
        keys={[{ key: 'user:1', type: 'hash', ttl: -1, size: 3 }]}
        selectedKey="user:1"
        onSelect={onSelect}
      />,
    )
    expect(screen.getByText('user:1')).toBeTruthy()
    expect(screen.getByText('hash')).toBeTruthy()
    expect(screen.getByText('永久')).toBeTruthy()
  })

  it('labels pager buttons with their titles', () => {
    render(<PagerButton label="1" title="第一页" onClick={() => {}} disabled={false} />)
    expect(screen.getByTitle('第一页')).toBeTruthy()
  })
})

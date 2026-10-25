/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

  it('filters a long history by keyword', () => {
    const now = Date.now()
    const entries = [
      { statement: 'select * from orders', at: now },
      { statement: 'update users set age = 1', at: now - 1000 },
      { statement: 'select count(*) from users', at: now - 2000 },
      { statement: 'delete from sessions', at: now - 3000 },
      { statement: 'select 1', at: now - 4000 },
      { statement: 'show tables', at: now - 5000 },
    ]
    render(<HistoryPanel entries={entries} pins={[]} onPick={() => {}} onTogglePin={() => {}} onClear={() => {}} />)
    const search = screen.getByLabelText('搜索历史语句')
    fireEvent.change(search, { target: { value: 'select' } })
    expect(screen.getByText('最近执行 · 3')).toBeTruthy()
    expect(screen.queryByText('show tables')).toBeNull()
    expect(screen.getByText('select 1')).toBeTruthy()

    fireEvent.change(search, { target: { value: 'nothing-matches' } })
    expect(screen.getByText('没有匹配的语句')).toBeTruthy()
    expect(screen.getByText('最近执行 · 0')).toBeTruthy()
  })

  it('asks for a second click before clearing history', () => {
    const onClear = vi.fn()
    render(
      <HistoryPanel
        entries={[{ statement: 'select 1', at: Date.now() }]}
        pins={[]}
        onPick={() => {}}
        onTogglePin={() => {}}
        onClear={onClear}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '清空' }))
    expect(onClear).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '确认清空' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('disarms the clear button when the history changes', () => {
    const now = Date.now()
    const { rerender } = render(
      <HistoryPanel
        entries={[{ statement: 'select 1', at: now }]}
        pins={[]}
        onPick={() => {}}
        onTogglePin={() => {}}
        onClear={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '清空' }))
    expect(screen.getByRole('button', { name: '确认清空' })).toBeTruthy()

    rerender(
      <HistoryPanel
        entries={[
          { statement: 'select 2', at: now + 1000 },
          { statement: 'select 1', at: now },
        ]}
        pins={[]}
        onPick={() => {}}
        onTogglePin={() => {}}
        onClear={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: '清空' })).toBeTruthy()
  })

  it('keeps the search box out of a short history', () => {
    const now = Date.now()
    render(
      <HistoryPanel
        entries={[
          { statement: 'select 1', at: now },
          { statement: 'select 2', at: now - 1000 },
        ]}
        pins={[]}
        onPick={() => {}}
        onTogglePin={() => {}}
        onClear={() => {}}
      />,
    )
    expect(screen.queryByLabelText('搜索历史语句')).toBeNull()
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

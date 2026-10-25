// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { KeyGrid } from '../../src/client/console-view'

const keys = [
  { key: 'user:10', type: 'string', ttl: -1, size: 4 },
  { key: 'user:9', type: 'hash', ttl: 60, size: 2 },
  { key: 'order:1', type: 'list', ttl: -1, size: 3 },
]

function keyOrder(): string[] {
  return screen
    .getAllByText(/^(user|order):\d+$/u)
    .map((cell) => cell.textContent ?? '')
}

describe('redis key grid sorting', () => {
  afterEach(() => {
    cleanup()
  })

  it('cycles the key column through ascending, descending, and scan order', () => {
    render(<KeyGrid keys={keys} selectedKey="" onSelect={vi.fn()} />)
    expect(keyOrder()).toEqual(['user:10', 'user:9', 'order:1'])

    fireEvent.click(screen.getByText('键'))
    expect(keyOrder()).toEqual(['order:1', 'user:9', 'user:10'])

    fireEvent.click(screen.getByText('键'))
    expect(keyOrder()).toEqual(['user:10', 'user:9', 'order:1'])
  })

  it('exposes the sort direction to assistive tech', () => {
    render(<KeyGrid keys={keys} selectedKey="" onSelect={vi.fn()} />)
    const header = screen.getByRole('columnheader', { name: /^键/ })
    expect(header.getAttribute('aria-sort')).toBe('none')

    fireEvent.click(screen.getByText('键'))
    expect(header.getAttribute('aria-sort')).toBe('ascending')

    fireEvent.click(screen.getByText('键'))
    expect(header.getAttribute('aria-sort')).toBe('descending')
  })

  it('sorts the length column without touching the name order', () => {
    render(<KeyGrid keys={keys} selectedKey="" onSelect={vi.fn()} />)
    expect(keyOrder()).toEqual(['user:10', 'user:9', 'order:1'])

    fireEvent.click(screen.getByText('长度'))
    expect(keyOrder()).toEqual(['user:9', 'order:1', 'user:10'])
    expect(screen.getByRole('columnheader', { name: /^长度/ }).getAttribute('aria-sort')).toBe('ascending')

    fireEvent.click(screen.getByText('长度'))
    expect(keyOrder()).toEqual(['user:10', 'order:1', 'user:9'])

    fireEvent.click(screen.getByText('长度'))
    expect(keyOrder()).toEqual(['user:10', 'user:9', 'order:1'])
  })

  it('keeps the selection working after sorting', () => {
    const onSelect = vi.fn()
    render(<KeyGrid keys={keys} selectedKey="user:9" onSelect={onSelect} />)

    fireEvent.click(screen.getByText('键'))
    fireEvent.click(screen.getByText('user:9'))
    expect(onSelect).toHaveBeenCalledWith(keys[1])
  })
})

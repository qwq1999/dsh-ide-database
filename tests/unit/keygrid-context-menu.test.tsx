// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const copies = vi.hoisted(() => ({ copyText: vi.fn(async () => true) }))

vi.mock('../../src/client/colmenu', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/colmenu')>()
  return { ...actual, copyText: copies.copyText }
})

import { KeyGrid } from '../../src/client/console-view'

afterEach(() => {
  cleanup()
  copies.copyText.mockClear()
})

describe('Redis key grid context menu', () => {
  it('copies the key name from the row menu', async () => {
    const info = { key: 'user:1', type: 'string', ttl: -1, size: 5 }
    render(<KeyGrid keys={[info as never]} selectedKey="" onSelect={() => {}} />)

    const cell = await screen.findByText('user:1')
    const row = cell.closest('tr')
    if (row === null) throw new Error('missing key row')
    fireEvent.contextMenu(row)
    fireEvent.click(await screen.findByRole('menuitem', { name: '复制键名' }))
    expect(copies.copyText).toHaveBeenCalledWith('user:1')
  })
})

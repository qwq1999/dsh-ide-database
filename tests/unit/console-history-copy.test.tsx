// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const copies = vi.hoisted(() => vi.fn(async () => true))

vi.mock('../../src/client/colmenu', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/client/colmenu')>()),
  copyText: copies,
}))

import { HistoryPanel } from '../../src/client/console-view'

describe('history row copy', () => {
  afterEach(() => {
    cleanup()
    copies.mockClear()
  })

  beforeEach(() => {
    copies.mockResolvedValue(true)
  })

  it('copies the statement without picking it', () => {
    const picked = vi.fn()
    render(
      <HistoryPanel
        entries={[{ statement: 'SELECT 1', at: Date.now() }]}
        pins={[]}
        onPick={picked}
        onTogglePin={() => {}}
        onClear={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '复制语句' }))
    expect(copies).toHaveBeenCalledWith('SELECT 1')
    expect(picked).not.toHaveBeenCalled()
  })
})

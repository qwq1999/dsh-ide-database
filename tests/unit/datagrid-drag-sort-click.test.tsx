// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'id', typeName: 'INT' },
  { name: 'total', typeName: 'DECIMAL' },
]
const rows = [[1, 93.02]]

function dragEvent(h: HTMLElement, type: string): Event {
  const ev = createEvent[type](h)
  Object.assign(ev, { dataTransfer: { effectAllowed: '', dropEffect: 'move', setData: vi.fn() } })
  return ev
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

describe('DataGrid sort click after a column drag', () => {
  afterEach(() => cleanup())

  it('does not swallow the next sort click after a cancelled drag', async () => {
    const onSort = vi.fn()
    const onReorderColumns = vi.fn()
    render(
      <DataGrid columns={columns} rows={rows} offset={0} onSort={onSort} onReorderColumns={onReorderColumns} />,
    )
    // Index 2 is the first data column (indices 0/1 are the checkbox and
    // row-number columns rendered when onReorderColumns is present).
    const h1 = screen.getAllByRole('columnheader')[2]!

    // Start a drag, then cancel it (dragend with no drop and no trailing click).
    fireEvent(h1, dragEvent(h1, 'dragStart'))
    fireEvent.dragEnd(h1)
    await flush()

    fireEvent.click(h1)
    expect(onSort).toHaveBeenCalledTimes(1)
  })

  it('does not swallow the next sort click after a successful reorder with no trailing click', async () => {
    const onSort = vi.fn()
    const onReorderColumns = vi.fn()
    render(
      <DataGrid columns={columns} rows={rows} offset={0} onSort={onSort} onReorderColumns={onReorderColumns} />,
    )
    // Index 0 is the row-number column; data columns start at index 1.
    const headers = screen.getAllByRole('columnheader')
    const h0 = headers[1]!
    const h1 = headers[2]!

    fireEvent(h0, dragEvent(h0, 'dragStart'))
    fireEvent(h1, dragEvent(h1, 'drop'))
    fireEvent.dragEnd(h0)
    await flush()
    expect(onReorderColumns).toHaveBeenCalledWith(0, 1)

    // The next genuine sort click must go through.
    fireEvent.click(h1)
    expect(onSort).toHaveBeenCalledTimes(1)
  })
})

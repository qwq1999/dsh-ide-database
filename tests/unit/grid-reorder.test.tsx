// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'id', typeName: 'INT', nullable: false, defaultValue: '', comment: '', primary: true },
  { name: 'name', typeName: 'VARCHAR', nullable: true, defaultValue: '', comment: '', primary: false },
  { name: 'total', typeName: 'DECIMAL', nullable: true, defaultValue: '', comment: '', primary: false },
]

afterEach(() => cleanup())

describe('column drag reorder', () => {
  it('reports the source and target display positions', () => {
    const onReorderColumns = vi.fn()
    render(<DataGrid columns={columns} rows={[[1, '手机', '638.00']]} offset={0} onReorderColumns={onReorderColumns} />)

    const headers = screen.getAllByRole('columnheader')
    // Header 0 is the row-number column; draggable data headers follow.
    expect(headers[0]?.querySelector('.dshdb-sr-only')?.textContent).toBe('行号')
    expect(headers[1]?.textContent).toBe('id')
    expect(headers[1]?.getAttribute('draggable')).toBe('true')

    const dragEvent = createEvent.dragStart(headers[1]!)
    Object.assign(dragEvent, { dataTransfer: { effectAllowed: '', setData: vi.fn() } })
    fireEvent(headers[1]!, dragEvent)
    fireEvent.dragOver(headers[3]!)
    fireEvent.drop(headers[3]!)

    expect(onReorderColumns).toHaveBeenCalledWith(0, 2)
  })
})

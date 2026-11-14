// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'id', typeName: 'INT', nullable: false, defaultValue: '', comment: '', primary: true },
  { name: 'name', typeName: 'VARCHAR', nullable: true, defaultValue: '', comment: '', primary: false },
  { name: 'total', typeName: 'DECIMAL', nullable: true, defaultValue: '', comment: '', primary: false },
]

afterEach(() => cleanup())

describe('column width measuring', () => {
  it('moves stored widths when columns are reordered', async () => {
    window.localStorage.setItem('dsh-ide-database.colwidths.v1', JSON.stringify({ 'reorder-widths': [100, 200, 300] }))
    const { rerender } = render(
      <DataGrid columns={columns} rows={[[1, '手机', '638.00']]} offset={0} storageKey="reorder-widths" />,
    )
    rerender(
      <DataGrid
        columns={[columns[2]!, columns[0]!, columns[1]!]}
        rows={[[1, '手机', '638.00']]}
        offset={0}
        storageKey="reorder-widths"
      />,
    )
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem('dsh-ide-database.colwidths.v1') ?? '{}')
      expect(stored['reorder-widths']).toEqual([300, 100, 200])
    })
  })

  it('measures the data headers even when the selection column is present', () => {
    render(
      <DataGrid
        columns={columns}
        rows={[[1, '手机', '638.00']]}
        offset={0}
        storageKey="test-column-widths"
        onToggleRow={vi.fn()}
        selectedRows={new Set<number>()}
      />,
    )

    // Leading widths are deliberately different so reading the row-number
    // header for the first data column would be visible in the stored result.
    const widths = [10, 20, 100, 200, 300]
    screen.getAllByRole('columnheader').forEach((cell, index) => {
      cell.getBoundingClientRect = () => ({ width: widths[index] ?? 0 } as DOMRect)
    })

    const grip = screen.getAllByRole('columnheader')[2]?.querySelector('.dshdb-grip')
    if (!(grip instanceof HTMLElement)) throw new Error('missing resize grip')
    fireEvent.mouseDown(grip, { clientX: 0 })
    fireEvent.mouseMove(document, { clientX: 10 })
    fireEvent.mouseUp(document)

    const stored = JSON.parse(window.localStorage.getItem('dsh-ide-database.colwidths.v1') ?? '{}')
    expect(stored['test-column-widths']).toEqual([110, 200, 300])
  })
})

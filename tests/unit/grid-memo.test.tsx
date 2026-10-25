// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'id', typeName: 'INT', nullable: false, defaultValue: '', comment: '', primary: true },
  { name: 'name', typeName: 'VARCHAR', nullable: true, defaultValue: '', comment: '', primary: false },
]
const rows = [
  [1, '手机'],
  [2, '耳机'],
]

/** A cell-class callback counts how many cells the grid painted. */
const row = (cellClass: () => string | undefined) => (
  <DataGrid columns={columns} rows={rows} offset={0} cellClass={cellClass} />
)

afterEach(() => cleanup())

describe('grid render skipping', () => {
  it('does not repaint cells when every prop is unchanged', () => {
    const paint = vi.fn(() => undefined)
    const view = render(row(paint))
    const painted = paint.mock.calls.length
    expect(painted).toBeGreaterThan(0)

    view.rerender(row(paint))
    expect(paint.mock.calls.length).toBe(painted)
  })

  it('repaints when the rows change', () => {
    const paint = vi.fn(() => undefined)
    const view = render(row(paint))
    const painted = paint.mock.calls.length

    view.rerender(<DataGrid columns={columns} rows={[[9, '键盘']]} offset={0} cellClass={paint} />)
    expect(paint.mock.calls.length).toBeGreaterThan(painted)
  })
})

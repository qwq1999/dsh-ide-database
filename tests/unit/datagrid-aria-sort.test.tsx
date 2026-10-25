// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'id', typeName: 'INT' },
  { name: 'total', typeName: 'DECIMAL' },
]
const rows = [[1, 93.02]]

function header(name: string): HTMLElement {
  return screen.getByRole('columnheader', { name: new RegExp(`^${name}`) })
}

describe('DataGrid sort state for assistive tech', () => {
  afterEach(() => {
    cleanup()
  })

  it('marks the sorted header and leaves the others at none', () => {
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        offset={0}
        sort={{ column: 'total', direction: 'asc' }}
        onSort={() => undefined}
      />,
    )
    expect(header('total').getAttribute('aria-sort')).toBe('ascending')
    expect(header('id').getAttribute('aria-sort')).toBe('none')
  })

  it('follows the direction to descending', () => {
    render(
      <DataGrid columns={columns} rows={rows} offset={0} sort={{ column: 'id', direction: 'desc' }} onSort={() => undefined} />,
    )
    expect(header('id').getAttribute('aria-sort')).toBe('descending')
  })

  it('stays out of the way when the grid cannot sort', () => {
    render(<DataGrid columns={columns} rows={rows} offset={0} />)
    expect(header('id').getAttribute('aria-sort')).toBeNull()
  })
})

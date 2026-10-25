// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'total', typeName: 'DECIMAL' },
  { name: 'id', typeName: 'INT', nullable: false },
]

describe('datagrid header tooltips', () => {
  afterEach(() => {
    cleanup()
  })

  it('keeps the column type in the sortable header tooltip', () => {
    render(<DataGrid columns={columns} rows={[[1, 2]]} offset={0} sort={null} onSort={() => undefined} />)
    const headers = screen.getAllByRole('columnheader')
    expect(headers[1]?.title).toBe('按 total · DECIMAL 排序')
    expect(headers[2]?.title).toBe('按 id · INT · NOT NULL 排序')
  })

  it('shows the type when the header is not sortable', () => {
    render(<DataGrid columns={columns} rows={[]} offset={0} />)
    const headers = screen.getAllByRole('columnheader')
    expect(headers[1]?.title).toBe('total · DECIMAL')
  })
})

// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [{ name: 'total', typeName: 'INTEGER', jdbcType: 4 }]

afterEach(() => {
  cleanup()
})

describe('row number column', () => {
  it('names the row number column for screen readers', () => {
    render(<DataGrid columns={columns} rows={[[1], [2]]} offset={0} />)
    const header = screen.getByRole('columnheader', { name: '行号' })
    expect(header).toBeTruthy()
    expect(header.querySelector('.dshdb-sr-only')?.textContent).toBe('行号')
  })
})

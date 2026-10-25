// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [{ name: 'total', typeName: 'INTEGER', jdbcType: 4 }]

afterEach(() => {
  cleanup()
})

describe('row number column', () => {
  it('names the whole grid when told to', () => {
    render(<DataGrid label="查询结果" columns={columns} rows={[[1]]} offset={0} />)
    expect(screen.getByRole('table', { name: '查询结果' })).toBeTruthy()
  })

  it('names the row number column for screen readers', () => {
    render(<DataGrid columns={columns} rows={[[1], [2]]} offset={0} />)
    const header = screen.getByRole('columnheader', { name: '行号' })
    expect(header).toBeTruthy()
    expect(header.querySelector('.dshdb-sr-only')?.textContent).toBe('行号')
  })
})

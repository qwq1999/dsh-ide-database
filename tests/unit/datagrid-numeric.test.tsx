// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'total', typeName: 'INTEGER', jdbcType: 4 },
  { name: 'name', typeName: 'VARCHAR', jdbcType: 12 },
]

afterEach(() => {
  cleanup()
})

describe('numeric column alignment', () => {
  it('right-aligns numbers and leaves text alone', () => {
    render(<DataGrid columns={columns} rows={[[42, 'hello']]} offset={0} />)

    const number = screen.getByText('42')
    expect(number.closest('td')?.className).toBe('dshdb-cell-num')

    const text = screen.getByText('hello')
    expect(text.closest('td')?.className ?? '').not.toContain('dshdb-cell-num')

    expect(screen.getByRole('columnheader', { name: /^total/ }).className).toContain('dshdb-cell-num')
    expect(screen.getByRole('columnheader', { name: /^name/ }).className ?? '').not.toContain('dshdb-cell-num')
  })
})

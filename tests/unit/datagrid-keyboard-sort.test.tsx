// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'total', typeName: 'INTEGER', jdbcType: 4 },
  { name: 'name', typeName: 'VARCHAR', jdbcType: 12 },
]

afterEach(() => {
  cleanup()
})

describe('keyboard sorting', () => {
  it('sorts from the header with Enter and Space', () => {
    const onSort = vi.fn()
    render(<DataGrid columns={columns} rows={[[1, 'a']]} offset={0} onSort={onSort} />)
    const header = screen.getByRole('columnheader', { name: /^total/ })

    expect(header.getAttribute('tabindex')).toBe('0')

    fireEvent.keyDown(header, { key: 'Enter' })
    fireEvent.keyDown(header, { key: ' ' })

    expect(onSort).toHaveBeenNthCalledWith(1, columns[0])
    expect(onSort).toHaveBeenNthCalledWith(2, columns[0])
  })

  it('ignores other keys and leaves non-sortable headers out of the tab order', () => {
    const onSort = vi.fn()
    render(<DataGrid columns={columns} rows={[[1, 'a']]} offset={0} onSort={onSort} />)
    const header = screen.getByRole('columnheader', { name: /^total/ })

    fireEvent.keyDown(header, { key: 'a' })
    expect(onSort).not.toHaveBeenCalled()

    cleanup()
    render(<DataGrid columns={columns} rows={[[1, 'a']]} offset={0} />)
    expect(screen.getByRole('columnheader', { name: /^total/ }).getAttribute('tabindex')).toBeNull()
  })
})

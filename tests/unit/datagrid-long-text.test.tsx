// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [{ name: 'body', typeName: 'LONGTEXT', jdbcType: 12 }]

afterEach(() => {
  cleanup()
})

describe('long cell text', () => {
  it('paints a clipped cell but keeps the whole value in the tooltip and the open callback', () => {
    const big = 'x'.repeat(5000)
    const onCellOpen = vi.fn()
    render(<DataGrid columns={columns} rows={[[big]]} offset={0} onCellOpen={onCellOpen} />)

    const span = document.querySelector('tbody td .dshdb-mono') ?? document.querySelector('tbody td span')
    expect(span?.textContent).toHaveLength(401)
    expect(span?.textContent?.endsWith('…')).toBe(true)
    expect(span?.closest('td')?.getAttribute('title')).toBe(big)

    fireEvent.doubleClick(span as HTMLElement)
    expect(onCellOpen).toHaveBeenCalledWith(columns[0], big)
  })

  it('leaves short cells untouched', () => {
    render(<DataGrid columns={columns} rows={[['hello']]} offset={0} />)

    expect(screen.getByText('hello')).toBeTruthy()
  })
})

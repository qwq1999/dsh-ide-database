// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [{ name: 'id', typeName: 'INT', nullable: false }]
const rows = Array.from({ length: 250 }, (_, index) => [index])

afterEach(() => cleanup())

describe('grid scroll position', () => {
  it('returns to the top when the page changes without changing the row count', async () => {
    const { container, rerender } = render(<DataGrid columns={columns} rows={rows} offset={0} resetKey={0} />)
    const wrap = container.querySelector('.dshdb-grid-wrap') as HTMLDivElement
    wrap.scrollTop = 400
    fireEvent.scroll(wrap)
    expect(wrap.scrollTop).toBe(400)

    rerender(<DataGrid columns={columns} rows={rows} offset={250} resetKey={1} />)
    await waitFor(() => expect(wrap.scrollTop).toBe(0))
  })
})

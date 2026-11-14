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

  it('keeps the position when auto refresh changes the row count on the same page', async () => {
    const { container, rerender } = render(
      <DataGrid columns={columns} rows={rows} offset={0} resetKey="page:1" />,
    )
    const wrap = container.querySelector('.dshdb-grid-wrap') as HTMLDivElement
    wrap.scrollTop = 400
    fireEvent.scroll(wrap)
    expect(wrap.scrollTop).toBe(400)

    const more = Array.from({ length: 260 }, (_, index) => [index])
    rerender(<DataGrid columns={columns} rows={more} offset={0} resetKey="page:1" />)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(wrap.scrollTop).toBe(400)
  })
})

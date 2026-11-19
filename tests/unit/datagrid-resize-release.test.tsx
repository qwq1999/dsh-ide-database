// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [
  { name: 'id', type: 'int' },
  { name: 'name', type: 'varchar' },
]

afterEach(() => {
  cleanup()
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
})

describe('column resize drag', () => {
  it('stops dragging when the window loses the mouse', () => {
    render(<DataGrid columns={columns} rows={[[1, '手机']]} offset={0} />)

    const handle = screen.getByLabelText('调整 id 列宽')
    fireEvent.mouseDown(handle, { clientX: 120 })
    expect(document.body.style.cursor).toBe('col-resize')

    fireEvent.blur(window)
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
  })

  it('stops dragging when the pointer leaves the document', () => {
    render(<DataGrid columns={columns} rows={[[1, '手机']]} offset={0} />)

    const handle = screen.getByLabelText('调整 id 列宽')
    fireEvent.mouseDown(handle, { clientX: 120 })
    expect(document.body.style.userSelect).toBe('none')

    fireEvent.mouseLeave(document)
    expect(document.body.style.cursor).toBe('')
  })

  it('keeps dragging across plain mouse moves until mouseup', () => {
    render(<DataGrid columns={columns} rows={[[1, '手机']]} offset={0} />)

    const handle = screen.getByLabelText('调整 id 列宽')
    fireEvent.mouseDown(handle, { clientX: 120 })
    fireEvent.mouseMove(document, { clientX: 160 })
    expect(document.body.style.cursor).toBe('col-resize')

    fireEvent.mouseUp(document)
    expect(document.body.style.cursor).toBe('')
  })

  it('releases the resize drag when the grid unmounts mid-drag', () => {
    const view = render(<DataGrid columns={columns} rows={[[1, '手机']]} offset={0} />)
    const handle = screen.getByLabelText('调整 id 列宽')
    fireEvent.mouseDown(handle, { clientX: 120 })
    expect(document.body.style.cursor).toBe('col-resize')

    const remove = vi.spyOn(document, 'removeEventListener')
    view.unmount()
    expect(document.body.style.cursor).toBe('')
    expect(document.body.style.userSelect).toBe('')
    const removed = remove.mock.calls.map(([type]) => type)
    expect(removed).toContain('mousemove')
    expect(removed).toContain('mouseup')
    expect(removed).toContain('mouseleave')
    remove.mockRestore()
  })

  it('cancels the queued scroll frame when the virtual grid unmounts', () => {
    const originalRaf = globalThis.requestAnimationFrame
    const originalCaf = globalThis.cancelAnimationFrame
    globalThis.requestAnimationFrame = vi.fn(() => 4321)
    globalThis.cancelAnimationFrame = vi.fn()
    try {
      const rows = Array.from({ length: 201 }, (_, index) => [index, `n${index}`])
      const view = render(<DataGrid columns={columns} rows={rows} offset={0} />)
      const wrap = document.querySelector('.dshdb-grid-wrap')
      fireEvent.scroll(wrap)
      expect(globalThis.requestAnimationFrame).toHaveBeenCalled()

      view.unmount()
      expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(4321)
    } finally {
      globalThis.requestAnimationFrame = originalRaf
      globalThis.cancelAnimationFrame = originalCaf
    }
  })

})

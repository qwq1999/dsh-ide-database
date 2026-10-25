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
})

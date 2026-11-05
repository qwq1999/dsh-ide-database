// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [{ name: 'id', typeName: 'INT', jdbcType: 4 }]
const rows = [[1], [2], [3]]

afterEach(() => {
  cleanup()
})

describe('result grid row selection', () => {
  it('checks the selected rows and reports plain and shift toggles', () => {
    const onToggleRow = vi.fn()
    const onToggleAllRows = vi.fn()
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        offset={0}
        label="查询结果"
        selectedRows={new Set([1])}
        onToggleRow={onToggleRow}
        onToggleAllRows={onToggleAllRows}
      />,
    )

    expect((screen.getByLabelText('选择第 2 行') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByLabelText('选择第 1 行'))
    expect(onToggleRow).toHaveBeenLastCalledWith(0, false)
    fireEvent.click(screen.getByLabelText('选择第 3 行'), { shiftKey: true })
    expect(onToggleRow).toHaveBeenLastCalledWith(2, true)
    expect(onToggleAllRows).not.toHaveBeenCalled()
  })

  it('shows the partial state on the header checkbox and toggles every row', () => {
    const onToggleRow = vi.fn()
    const onToggleAllRows = vi.fn()
    const { unmount } = render(
      <DataGrid
        columns={columns}
        rows={rows}
        offset={0}
        selectedRows={new Set([1])}
        onToggleRow={onToggleRow}
        onToggleAllRows={onToggleAllRows}
      />,
    )

    const header = screen.getByLabelText('全选行') as HTMLInputElement
    expect(header.checked).toBe(false)
    expect(header.indeterminate).toBe(true)
    fireEvent.click(header)
    expect(onToggleAllRows).toHaveBeenCalledTimes(1)
    unmount()

    render(
      <DataGrid
        columns={columns}
        rows={rows}
        offset={0}
        selectedRows={new Set([0, 1, 2])}
        onToggleRow={onToggleRow}
        onToggleAllRows={onToggleAllRows}
      />,
    )
    const all = screen.getByLabelText('取消全选行') as HTMLInputElement
    expect(all.checked).toBe(true)
    expect(all.indeterminate).toBe(false)
  })

  it('keeps the old single number column when selection is not enabled', () => {
    render(<DataGrid columns={columns} rows={rows} offset={0} label="查询结果" />)

    expect(screen.queryByLabelText('全选行')).toBeNull()
    expect(screen.queryByLabelText('选择第 1 行')).toBeNull()
    expect(screen.getByText('#')).toBeTruthy()
  })

  it('uses the supplied row numbers in the checkbox labels', () => {
    render(
      <DataGrid
        columns={columns}
        rows={rows}
        offset={0}
        rowNumbers={[11, 12, 13]}
        selectedRows={new Set()}
        onToggleRow={() => undefined}
      />,
    )

    expect(screen.getByLabelText('选择第 11 行')).toBeTruthy()
    expect(screen.getByLabelText('选择第 13 行')).toBeTruthy()
  })
})

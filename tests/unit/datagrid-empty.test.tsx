// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { DataGrid } from '../../src/client/DataGrid'

const columns = [{ name: 'id', typeName: 'INT' }]

describe('DataGrid empty rows', () => {
  afterEach(() => {
    cleanup()
  })

  it('explains an empty result instead of leaving a bare header', () => {
    render(<DataGrid columns={columns} rows={[]} offset={0} emptyText="这条语句没有返回任何行" />)
    expect(screen.getByText('这条语句没有返回任何行')).toBeTruthy()
  })

  it('renders nothing extra when no message is provided', () => {
    const { container } = render(<DataGrid columns={columns} rows={[]} offset={0} />)
    expect(container.querySelector('.dshdb-empty-row')).toBeNull()
    expect(container.querySelectorAll('tbody tr').length).toBe(0)
  })

  it('keeps the message out of the body once rows exist', () => {
    const { container } = render(<DataGrid columns={columns} rows={[[7]]} offset={0} emptyText="没有行" />)
    expect(screen.queryByText('没有行')).toBeNull()
    expect(container.querySelectorAll('tbody tr').length).toBe(1)
  })
})

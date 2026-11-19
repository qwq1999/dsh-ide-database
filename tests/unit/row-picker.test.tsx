// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RowPicker } from '../../src/client/views/row-picker'

const SCHEMAS = [
  'dbgpt',
  'EXAMPLE_1',
  'ihive_a001_cccadm_demo',
  'ihive_a001_cmocr_cmocr',
  'ihive_a001_cmocr_demo',
  'ihive_a001_ipms_demo',
  'ihive_a001_itsys_cccadm',
  'ihive_a001_itsys_cmocr',
  'nacos',
  'test_im',
].map((name) => ({ id: name, label: name }))

function renderPicker(items = SCHEMAS): void {
  render(
    <RowPicker
      title="选择要展示的架构"
      allLabel="所有架构"
      items={items}
      visible={null}
      onToggle={() => {}}
      onToggleAll={() => {}}
    />,
  )
}

function openPicker(): HTMLElement {
  const trigger = document.querySelector<HTMLElement>('.dshdb-row-action')
  if (trigger === null) throw new Error('picker trigger missing')
  fireEvent.click(trigger)
  return document.querySelector<HTMLElement>('.dshdb-picker') as HTMLElement
}

function listed(): string[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('.dshdb-picker-item:not(.dshdb-picker-all) span'),
  ).map((node) => node.textContent ?? '')
}

function search(value: string): void {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value } })
}

describe('RowPicker focus restoration', () => {
  afterEach(() => {
    cleanup()
  })

  it('returns focus to the trigger when Escape closes the search box', () => {
    renderPicker()
    const trigger = document.querySelector<HTMLElement>('.dshdb-row-action')!
    trigger.focus()
    fireEvent.click(trigger)
    const searchBox = screen.getByRole('searchbox')
    searchBox.focus()
    expect(document.activeElement).toBe(searchBox)

    fireEvent.keyDown(searchBox, { key: 'Escape' })

    expect(document.activeElement).toBe(trigger)
  })
})

describe('RowPicker search', () => {
  afterEach(() => {
    cleanup()
  })

  it('filters the schema list as the user types', () => {
    renderPicker()
    openPicker()
    expect(listed()).toHaveLength(SCHEMAS.length)
    expect(screen.getByRole('searchbox').getAttribute('placeholder')).toBe('查找架构…')

    search('cmocr')
    expect(listed()).toEqual(['ihive_a001_cmocr_cmocr', 'ihive_a001_cmocr_demo', 'ihive_a001_itsys_cmocr'])

    search('EXAMPLE')
    expect(listed()).toEqual(['EXAMPLE_1'])
  })

  it('reports when nothing matches and restores the list when cleared', () => {
    renderPicker()
    openPicker()

    search('missing_schema')
    expect(listed()).toEqual([])
    expect(screen.getByText('没有匹配的架构')).toBeTruthy()

    search('')
    expect(listed()).toHaveLength(SCHEMAS.length)
  })

  it('starts with a clean query every time it opens', () => {
    renderPicker()
    openPicker()
    search('cmocr')

    fireEvent.click(document.querySelector<HTMLElement>('.dshdb-row-action') as HTMLElement)
    openPicker()
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('')
    expect(listed()).toHaveLength(SCHEMAS.length)
  })

  it('hides the search box for a short list', () => {
    renderPicker(SCHEMAS.slice(0, 3))
    openPicker()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('keeps the checkboxes working while filtered', () => {
    const onToggle = vi.fn()
    render(
      <RowPicker
        title="选择要展示的架构"
        allLabel="所有架构"
        items={SCHEMAS}
        visible={[]}
        onToggle={onToggle}
        onToggleAll={() => {}}
      />,
    )
    openPicker()
    search('nacos')

    const boxes = screen.getAllByRole('checkbox')
    fireEvent.click(boxes[boxes.length - 1])
    expect(onToggle).toHaveBeenCalledWith('nacos')
  })
})

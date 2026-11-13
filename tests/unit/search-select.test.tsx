// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SearchSelect } from '../../src/client/ui'

const OPTIONS = [
  { value: '', label: '默认（shop）' },
  { value: 'ihive_a001_cmocr_cmocr', label: 'ihive_a001_cmocr_cmocr' },
  { value: 'ihive_a001_cmocr_demo', label: 'ihive_a001_cmocr_demo' },
  { value: 'ihive_a001_ipms_demo', label: 'ihive_a001_ipms_demo' },
  { value: 'nacos', label: 'nacos' },
]

function picker(onChange = vi.fn()): { onChange: ReturnType<typeof vi.fn>; trigger: HTMLElement } {
  render(
    <SearchSelect label="数据库" value="nacos" options={OPTIONS} onChange={onChange} />,
  )
  return { onChange, trigger: screen.getByLabelText('数据库') }
}

function open(trigger: HTMLElement): HTMLInputElement {
  fireEvent.click(trigger)
  return screen.getByLabelText('查找数据库') as HTMLInputElement
}

describe('SearchSelect', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the current label and filters the list while typing', () => {
    const { trigger } = picker()
    expect(trigger.textContent).toBe('nacos')

    const filter = open(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length)

    fireEvent.change(filter, { target: { value: 'CMOCR' } })
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'ihive_a001_cmocr_cmocr',
      'ihive_a001_cmocr_demo',
    ])

    fireEvent.change(filter, { target: { value: 'zzz' } })
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('没有匹配项')).toBeTruthy()
  })

  it('picks a filtered option with the mouse', () => {
    const { onChange, trigger } = picker()
    const filter = open(trigger)
    fireEvent.change(filter, { target: { value: 'ipms' } })
    fireEvent.click(screen.getByRole('option', { name: 'ihive_a001_ipms_demo' }))

    expect(onChange).toHaveBeenCalledWith('ihive_a001_ipms_demo')
    expect(screen.queryByLabelText('查找数据库')).toBeNull()
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('walks the list with the arrow keys and picks with Enter', () => {
    const { onChange, trigger } = picker()
    const filter = open(trigger)
    fireEvent.change(filter, { target: { value: 'ihive' } })

    fireEvent.keyDown(filter, { key: 'ArrowDown' })
    fireEvent.keyDown(filter, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('ihive_a001_cmocr_demo')
  })

  it('keeps the first option active when arrowing up', () => {
    const { onChange, trigger } = picker()
    const filter = open(trigger)
    fireEvent.change(filter, { target: { value: 'ihive' } })

    fireEvent.keyDown(filter, { key: 'ArrowUp' })
    fireEvent.keyDown(filter, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('ihive_a001_cmocr_cmocr')
  })

  it('closes on Escape without choosing anything', () => {
    const { onChange, trigger } = picker()
    const filter = open(trigger)
    fireEvent.keyDown(filter, { key: 'Escape' })
    expect(screen.queryByLabelText('查找数据库')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('starts each opening with a clean filter', () => {
    const { trigger } = picker()
    fireEvent.change(open(trigger), { target: { value: 'nacos' } })
    fireEvent.keyDown(screen.getByLabelText('查找数据库'), { key: 'Escape' })

    const filter = open(trigger)
    expect(filter.value).toBe('')
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length)
  })
})

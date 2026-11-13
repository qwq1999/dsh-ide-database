// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Loading } from '../../src/client/ui'

afterEach(cleanup)

describe('Loading', () => {
  it('renders the label as a status region in a pill', () => {
    const { container } = render(<Loading label="读取结构" />)
    const status = screen.getByRole('status')
    expect(status.textContent).toBe('读取结构')
    expect(status.className).toContain('dshdb-loading')
    expect(status.className).not.toContain('dshdb-loading-bare')
    const spinner = container.querySelector('.dshdb-spinner')
    expect(spinner).not.toBeNull()
    expect(spinner?.getAttribute('aria-hidden')).toBe('true')
  })

  it('keeps a bare spinner out of the status landmarks', () => {
    const { container } = render(<Loading bare />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(container.querySelector('.dshdb-loading.dshdb-loading-bare')).not.toBeNull()
    expect(container.querySelector('.dshdb-loading-label')).toBeNull()
  })

  it('sizes the spinner when asked', () => {
    const { container } = render(<Loading size={18} label="正在加载数据源…" />)
    const spinner = container.querySelector('.dshdb-spinner') as HTMLElement
    expect(spinner.style.width).toBe('18px')
  })
})

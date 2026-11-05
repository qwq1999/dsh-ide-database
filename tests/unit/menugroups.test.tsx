// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { MenuGroupList } from '../../src/client/menugroups'
import { CSS } from '../../src/client/styles'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const groups = [
  { id: 'page', label: '导出当前页', leaves: [{ id: 'csv', label: '叶子 CSV', onSelect: () => undefined }] },
]

describe('grouped menu flyouts', () => {
  it('opens the flyout on hover and reports its state', () => {
    render(<MenuGroupList groups={groups} onClose={() => undefined} />)
    const trigger = screen.getByRole('menuitem', { name: '导出当前页' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')

    fireEvent.pointerEnter(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const flyout = screen.getByRole('group', { name: '导出当前页' })
    expect(flyout.getAttribute('data-open')).toBe('true')
    expect(flyout.getAttribute('data-flip')).toBeNull()
  })

  it('flips a flyout that would leave the window', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('dshdb-submenu')) {
        return { width: 320, left: 0, right: 320, top: 0, bottom: 0, height: 0, x: 0, y: 0 } as DOMRect
      }
      return { width: 168, left: 900, right: 1068, top: 0, bottom: 28, height: 28, x: 900, y: 0 } as DOMRect
    })
    render(<MenuGroupList groups={groups} onClose={() => undefined} />)
    fireEvent.pointerEnter(screen.getByRole('menuitem', { name: '导出当前页' }))

    expect(screen.getByRole('group', { name: '导出当前页' }).getAttribute('data-flip')).toBe('true')
  })

  it('lays flyouts out to the right unless flipped', () => {
    expect(CSS).toMatch(/\.dshdb-menu \.dshdb-submenu \{[^}]*left:\s*calc\(100% \+ 2px\)/)
    expect(CSS).toMatch(/\.dshdb-menu \.dshdb-submenu \{[^}]*right:\s*auto/)
    expect(CSS).toMatch(/\.dshdb-menu \.dshdb-submenu\[data-flip='true'\] \{[^}]*right:\s*calc\(100% \+ 2px\)/)
  })

  it('sizes the grouped menu to its widest row', () => {
    expect(CSS).toMatch(/\.dshdb-menu-groups \{[^}]*width:\s*max-content/)
    expect(CSS).not.toMatch(/\.dshdb-menu-groups \{[^}]*min-width/)
  })
})

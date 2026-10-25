// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TreeMenu } from '../../src/client/views/tree-menu'

function menu(): JSX.Element {
  return (
    <TreeMenu
      menu={{
        x: 10,
        y: 10,
        items: [
          { label: '打开数据', run: vi.fn() },
          { label: '复制名称', disabled: true, run: vi.fn() },
          { label: '复制限定名', run: vi.fn() },
        ],
      }}
      onClose={() => {}}
    />
  )
}

afterEach(() => {
  cleanup()
})

describe('tree menu keyboard support', () => {
  it('focuses the first enabled row when it opens', async () => {
    render(menu())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: '打开数据' })))
  })

  it('hands focus back to the trigger when it closes', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = '菜单触发器'
    document.body.append(trigger)
    trigger.focus()

    const view = render(menu())
    await waitFor(() => expect(screen.getByRole('menuitem', { name: '打开数据' })).toBeTruthy())
    view.unmount()
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('moves with the arrow keys and skips disabled rows', async () => {
    render(menu())
    const first = screen.getByRole('menuitem', { name: '打开数据' })
    const last = screen.getByRole('menuitem', { name: '复制限定名' })
    await waitFor(() => expect(document.activeElement).toBe(first))

    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(last)

    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(last)

    fireEvent.keyDown(window, { key: 'Home' })
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(window, { key: 'End' })
    expect(document.activeElement).toBe(last)
  })
})

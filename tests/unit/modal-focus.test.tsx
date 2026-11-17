// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { Modal } from '../../src/client/ui'

function Harness(): React.ReactElement {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        打开
      </button>
      <Modal
        open={open}
        title="测试弹层"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button">取消</button>
            <button type="button">确定</button>
          </>
        }
      >
        <input aria-label="名字" />
        <button type="button">中间</button>
      </Modal>
    </div>
  )
}

describe('Modal focus', () => {
  afterEach(() => {
    cleanup()
  })

  it('focuses the first field and keeps Tab inside the dialog', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: '打开' })
    trigger.focus()
    fireEvent.click(trigger)

    expect(document.activeElement).toBe(screen.getByLabelText('名字'))

    screen.getByRole('button', { name: '确定' }).focus()
    fireEvent.keyDown(screen.getByRole('button', { name: '确定' }), { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '关闭' }))

    fireEvent.keyDown(screen.getByRole('button', { name: '关闭' }), { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '确定' }))
  })

  it('locks the page scroll while the dialog is open', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: '打开' })
    fireEvent.click(trigger)
    expect(document.body.style.overflow).toBe('hidden')

    fireEvent.keyDown(screen.getByRole('button', { name: '关闭' }), { key: 'Escape' })
    expect(document.body.style.overflow).toBe('')
  })

  it('returns focus to the trigger after closing with Escape', () => {
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: '打开' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(document.activeElement).toBe(screen.getByLabelText('名字'))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('keeps focus inside the dialog when the only footer button is disabled', () => {
    function EmptyHarness(): React.ReactElement {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            打开
          </button>
          <Modal open={open} title="空弹层" onClose={() => setOpen(false)} footer={<button type="button" disabled>清空</button>}>
            <p>没有内容</p>
          </Modal>
        </div>
      )
    }
    render(<EmptyHarness />)
    const trigger = screen.getByRole('button', { name: '打开' })
    trigger.focus()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('wraps Tab from the last visible control even when a hidden control follows it', () => {
    function HiddenHarness(): React.ReactElement {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            打开
          </button>
          <Modal open={open} title="含隐藏控件" onClose={() => setOpen(false)}>
            <input aria-label="可见输入" />
            <div hidden>
              <button type="button">隐藏按钮</button>
            </div>
          </Modal>
        </div>
      )
    }
    render(<HiddenHarness />)
    fireEvent.click(screen.getByRole('button', { name: '打开' }))
    const visible = screen.getByLabelText('可见输入')
    visible.focus()
    fireEvent.keyDown(visible, { key: 'Tab' })
    // The last *visible* control is the input (the trailing button is hidden),
    // so Tab must wrap back to the first control instead of escaping the dialog.
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '关闭' }))
  })

  it('does not close on Escape when the target owns Escape itself', () => {
    function OwnerHarness(): React.ReactElement {
      const [open, setOpen] = useState(false)
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            打开
          </button>
          <Modal open={open} title="录制弹层" onClose={() => setOpen(false)}>
            <input data-owns-escape aria-label="录制中" />
          </Modal>
        </div>
      )
    }
    render(<OwnerHarness />)
    fireEvent.click(screen.getByRole('button', { name: '打开' }))
    const field = screen.getByLabelText('录制中')
    field.focus()
    fireEvent.keyDown(field, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeNull()
    // Escape elsewhere still closes the dialog.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

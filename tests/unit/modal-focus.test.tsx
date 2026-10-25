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
})

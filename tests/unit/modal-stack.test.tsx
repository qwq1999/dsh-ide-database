// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useState } from 'react'
import { Modal } from '../../src/client/ui'

/** Mirrors the settings dialog opening the custom-driver dialog on top of it. */
function Harness(): React.ReactElement {
  const [host, setHost] = useState(true)
  const [nested, setNested] = useState(false)
  return (
    <>
      <Modal open={host} title="数据库设置" onClose={() => setHost(false)}>
        <button type="button" onClick={() => setNested(true)}>
          新增
        </button>
      </Modal>
      <Modal open={nested} title="新增自定义驱动" onClose={() => setNested(false)}>
        <span>驱动表单</span>
      </Modal>
    </>
  )
}

function overlayOf(name: string): HTMLElement {
  const dialog = screen.getByRole('dialog', { name })
  const overlay = dialog.parentElement
  if (overlay === null) throw new Error('dialog has no overlay')
  return overlay
}

describe('stacked modals', () => {
  afterEach(() => {
    cleanup()
  })

  it('puts a dialog opened from another dialog above it', () => {
    render(<Harness />)
    expect(overlayOf('数据库设置').style.zIndex).toBe('1200')

    fireEvent.click(screen.getByRole('button', { name: '新增' }))
    expect(overlayOf('数据库设置').style.zIndex).toBe('1200')
    expect(overlayOf('新增自定义驱动').style.zIndex).toBe('1210')
  })

  it('closes only the top dialog when Escape is pressed', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: '新增' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(2)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '新增自定义驱动' })).toBeNull()
    expect(screen.getByRole('dialog', { name: '数据库设置' })).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { Modal } from '../../src/client/ui'

/**
 * Two nested dialogs that close in the same commit must not leave the page
 * scroll-locked. The old per-instance save/restore restored `'hidden'` from the
 * inner dialog after the outer one had already restored `''`.
 */
function NestedModals({ open }: { open: boolean }): React.ReactElement {
  return (
    <>
      <Modal open={open} title="外层" onClose={() => {}}>
        <div>outer</div>
      </Modal>
      <Modal open={open} title="内层" onClose={() => {}}>
        <div>inner</div>
      </Modal>
    </>
  )
}

function Wrapper(): React.ReactElement {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)}>
        toggle
      </button>
      <NestedModals open={open} />
    </>
  )
}

describe('Modal page scroll lock', () => {
  afterEach(() => {
    cleanup()
    document.body.style.overflow = ''
  })

  it('restores scroll when nested dialogs unmount together', () => {
    const before = document.body.style.overflow
    render(<Wrapper />)
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.click(screen.getByRole('button', { name: 'toggle' }))
    expect(document.body.style.overflow).toBe(before)
  })
})

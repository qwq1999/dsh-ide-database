// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useCopyFlash } from '../../src/client/copyflash'

function Harness(): React.ReactElement {
  const flash = useCopyFlash(1000)
  return (
    <span>
      <span data-testid="state">{flash.copied ? '已复制' : '复制'}</span>
      <button type="button" onClick={() => flash.flash(true)}>
        copy
      </button>
      <button type="button" onClick={() => flash.flash(false)}>
        fail
      </button>
      <button type="button" onClick={flash.reset}>
        reset
      </button>
    </span>
  )
}

describe('useCopyFlash', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('flashes only after a successful copy and clears itself', () => {
    vi.useFakeTimers()
    render(<Harness />)
    act(() => screen.getByRole('button', { name: 'fail' }).click())
    expect(screen.getByTestId('state').textContent).toBe('复制')

    act(() => screen.getByRole('button', { name: 'copy' }).click())
    expect(screen.getByTestId('state').textContent).toBe('已复制')

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByTestId('state').textContent).toBe('复制')
  })

  it('clears early when the content behind the button changes', () => {
    render(<Harness />)
    act(() => screen.getByRole('button', { name: 'copy' }).click())
    expect(screen.getByTestId('state').textContent).toBe('已复制')

    act(() => screen.getByRole('button', { name: 'reset' }).click())
    expect(screen.getByTestId('state').textContent).toBe('复制')
  })
})

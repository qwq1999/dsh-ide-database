// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'

import { copyText } from '../../src/client/colmenu'

const clipboard = { writeText: vi.fn(async () => undefined) }

function useClipboard() {
  Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true })
}

afterEach(() => {
  delete navigator.clipboard
  delete document.execCommand
  clipboard.writeText.mockClear()
})

describe('copyText', () => {
  it('copies through the clipboard API when it exists', async () => {
    useClipboard()
    await expect(copyText('SELECT 1')).resolves.toBe(true)
    expect(clipboard.writeText).toHaveBeenCalledWith('SELECT 1')
  })

  it('falls back to execCommand and cleans up the textarea', async () => {
    useClipboard()
    clipboard.writeText.mockRejectedValueOnce(new Error('denied'))
    const execCommand = vi.fn(() => true)
    document.execCommand = execCommand

    await expect(copyText('hello')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(document.querySelectorAll('textarea').length).toBe(0)
  })

  it('reports false instead of throwing when nothing can copy', async () => {
    useClipboard()
    clipboard.writeText.mockRejectedValueOnce(new Error('denied'))

    await expect(copyText('nope')).resolves.toBe(false)
    expect(document.querySelectorAll('textarea').length).toBe(0)
  })
})

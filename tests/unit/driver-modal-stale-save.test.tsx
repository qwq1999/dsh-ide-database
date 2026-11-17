// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  saveCustomDriver: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: { saveCustomDriver: mocks.saveCustomDriver },
}))

import { DriverModal } from '../../src/client/modals/DriverModal'

const driverA = {
  id: 'drv-a',
  name: '驱动 A',
  preset: null,
  dialect: 'mysql' as const,
  driverClass: 'com.a.Driver',
  urlTemplate: 'jdbc:a://{{host}}:{{port}}/{{database}}',
  jars: [],
  needsJava: true,
  allJarsPresent: true,
}
const driverB = { ...driverA, id: 'drv-b', name: '驱动 B' }

function fillValidForm(): void {
  fireEvent.change(screen.getByLabelText(/^名称/), { target: { value: '自定义驱动' } })
  fireEvent.change(screen.getByLabelText(/驱动类/), { target: { value: 'com.example.Driver' } })
  fireEvent.change(screen.getByLabelText(/Maven 依赖/), { target: { value: 'g:a:1.0' } })
}

describe('driver modal stale save', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not close a different modal when an earlier save resolves late', async () => {
    let resolveSave: (value: unknown) => void = () => undefined
    mocks.saveCustomDriver.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve }))
    const onClose = vi.fn()
    const onSaved = vi.fn()
    const notify = vi.fn()

    const view = render(
      <DriverModal
        open
        editing={driverA}
        onClose={onClose}
        onSaved={onSaved}
        notify={notify}
      />,
    )
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(mocks.saveCustomDriver).toHaveBeenCalledTimes(1))

    view.rerender(
      <DriverModal
        open
        editing={driverB}
        onClose={onClose}
        onSaved={onSaved}
        notify={notify}
      />,
    )

    resolveSave({ drivers: [driverA] })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(notify).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})

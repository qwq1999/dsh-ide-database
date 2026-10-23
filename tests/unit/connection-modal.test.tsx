// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  saveConnection: vi.fn(),
  testConnection: vi.fn(),
}))

vi.mock('../../src/client/api', () => ({
  api: { saveConnection: mocks.saveConnection, testConnection: mocks.testConnection },
}))

import { ConnectionModal } from '../../src/client/modals/ConnectionModal'

const existing = {
  id: 'conn-mysql',
  name: '演示 MySQL',
  driver: 'mysql',
  dialect: 'mysql' as const,
  host: '127.0.0.1',
  port: 33061,
  user: 'root',
  hasPassword: true,
  database: 'shop',
  redisDb: 0,
  params: {},
  readOnly: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}

function renderModal(): void {
  render(
    <ConnectionModal
      open
      editing={existing}
      drivers={[]}
      onClose={() => undefined}
      onSaved={() => undefined}
      onDelete={() => undefined}
      notify={() => undefined}
    />,
  )
}

function passwordInput(): HTMLInputElement {
  return screen.getByLabelText(/^密码/) as HTMLInputElement
}

describe('connection modal editing', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.saveConnection.mockResolvedValue({ connection: existing })
  })

  it('never pre-fills the saved password and keeps it when left empty', async () => {
    renderModal()

    expect(passwordInput().value).toBe('')
    expect(passwordInput().placeholder).toBe('留空则保持不变')
    expect(screen.getByText('已保存密码，留空则保持不变')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.saveConnection).toHaveBeenCalledTimes(1))
    const draft = mocks.saveConnection.mock.calls[0][0]
    expect(draft).toMatchObject({ id: existing.id, name: existing.name, host: existing.host, port: existing.port })
    expect(draft.password).toBeUndefined()
    expect(draft.clearPassword).toBeUndefined()
  })

  it('sends a newly typed password', async () => {
    renderModal()

    fireEvent.change(passwordInput(), { target: { value: 'new-secret' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.saveConnection).toHaveBeenCalledTimes(1))
    expect(mocks.saveConnection.mock.calls[0][0].password).toBe('new-secret')
  })

  it('can explicitly clear the saved password', async () => {
    renderModal()

    fireEvent.click(screen.getByLabelText('清除已保存的密码'))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.saveConnection).toHaveBeenCalledTimes(1))
    const draft = mocks.saveConnection.mock.calls[0][0]
    expect(draft.clearPassword).toBe(true)
    expect(draft.password).toBeUndefined()
  })
})

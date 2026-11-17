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

function renderModal(editing: typeof existing | null = existing): void {
  render(
    <ConnectionModal
      open
      editing={editing}
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

  it('keeps a JDBC parameter named __proto__', async () => {
    renderModal()

    fireEvent.change(screen.getByPlaceholderText(/useSSL=false/), { target: { value: '__proto__=custom' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.saveConnection).toHaveBeenCalledTimes(1))
    const params = mocks.saveConnection.mock.calls[0][0].params
    expect(Object.hasOwn(params, '__proto__')).toBe(true)
    expect(params['__proto__']).toBe('custom')
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

  it('passes the edited connection id to the test probe so stored credentials resolve', async () => {
    mocks.testConnection.mockResolvedValue({ ok: true, message: 'ok' })
    renderModal()

    // The password field is left blank deliberately: the host must resolve the
    // stored secret using the id we send, rather than testing with a blank one.
    fireEvent.click(screen.getByRole('button', { name: '测试连接' }))

    await waitFor(() => expect(mocks.testConnection).toHaveBeenCalledTimes(1))
    expect(mocks.testConnection.mock.calls[0][0]).toMatchObject({ id: existing.id })
  })
})

describe('read-only flag', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.saveConnection.mockResolvedValue({ connection: existing })
  })

  it('locks the switch when editing and saves the stored value', async () => {
    renderModal({ ...existing, readOnly: true })

    const toggle = screen.getByRole('switch', { name: /只读连接/ }) as HTMLButtonElement
    expect(toggle.disabled).toBe(true)
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.saveConnection).toHaveBeenCalledTimes(1))
    expect(mocks.saveConnection.mock.calls[0][0].readOnly).toBe(true)
  })

  it('lets a new connection be created read-only', async () => {
    renderModal(null)

    const toggle = screen.getByRole('switch', { name: /只读连接/ }) as HTMLButtonElement
    expect(toggle.disabled).toBe(false)
    expect(toggle.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-checked')).toBe('true')

    fireEvent.change(screen.getByLabelText(/^名称/), { target: { value: '只读库' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.saveConnection).toHaveBeenCalledTimes(1))
    const draft = mocks.saveConnection.mock.calls[0][0]
    expect(draft.readOnly).toBe(true)
    expect(draft.id).toBeUndefined()
  })
})

describe('connection modal stale save', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not close a different modal when an earlier save resolves late', async () => {
    let resolveSave: (value: unknown) => void = () => undefined
    mocks.saveConnection.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve }))
    const onClose = vi.fn()
    const onSaved = vi.fn()
    const notify = vi.fn()
    const other = { ...existing, id: 'conn-pg', name: '演示 PostgreSQL' }

    const view = render(
      <ConnectionModal
        open
        editing={existing}
        drivers={[]}
        onClose={onClose}
        onSaved={onSaved}
        onDelete={() => undefined}
        notify={notify}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(mocks.saveConnection).toHaveBeenCalledTimes(1))

    // The user closes this modal and opens another while the first save is still in flight.
    view.rerender(
      <ConnectionModal
        open
        editing={other}
        drivers={[]}
        onClose={onClose}
        onSaved={onSaved}
        onDelete={() => undefined}
        notify={notify}
      />,
    )

    resolveSave({ connection: existing })
    await new Promise((resolve) => setTimeout(resolve, 0))

    // The stale request must not fire its side effects on the new modal.
    expect(notify).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })
})

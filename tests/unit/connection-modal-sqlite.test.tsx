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

function renderNew(): void {
  render(
    <ConnectionModal
      open
      drivers={[]}
      onClose={() => undefined}
      onSaved={() => undefined}
      onDelete={() => undefined}
      notify={() => undefined}
    />,
  )
}

describe('connection modal for file based engines', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.saveConnection.mockResolvedValue({})
  })

  it('requires a database file before saving SQLite', async () => {
    renderNew()

    fireEvent.change(screen.getByLabelText(/^驱动/), { target: { value: 'sqlite' } })
    fireEvent.change(screen.getByLabelText(/^名称/), { target: { value: '本地库' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(screen.getByText('请填写数据库文件路径')).toBeTruthy()
    expect(mocks.saveConnection).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/数据库 \/ 服务名/), { target: { value: './tmp/app.db' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(mocks.saveConnection).toHaveBeenCalledTimes(1))
    expect(mocks.saveConnection.mock.calls[0][0]).toMatchObject({
      driver: 'sqlite',
      database: './tmp/app.db',
      port: 0,
    })
  })
})

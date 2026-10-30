// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TrashModal, type TrashModalProps } from '../../src/client/modals/TrashModal'
import type { ClientTrashedConnection } from '../../src/shared/types'

afterEach(cleanup)

function item(overrides: Partial<ClientTrashedConnection> = {}): ClientTrashedConnection {
  return {
    id: 't1',
    name: '演示 MySQL',
    driver: 'mysql',
    dialect: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    hasPassword: true,
    database: 'shop',
    redisDb: 0,
    params: {},
    readOnly: false,
    createdAt: '2026-10-29T00:00:00.000Z',
    deletedAt: '2026-10-30T12:34:00.000Z',
    ...overrides,
  }
}

function renderModal(overrides: Partial<TrashModalProps> = {}): TrashModalProps {
  const props: TrashModalProps = {
    open: true,
    items: [item()],
    busy: null,
    emptying: false,
    onClose: vi.fn(),
    onRestore: vi.fn(),
    onPurge: vi.fn(),
    onEmpty: vi.fn(),
    ...overrides,
  }
  render(<TrashModal {...props} />)
  return props
}

describe('TrashModal', () => {
  it('lists trashed connections and sends their actions', () => {
    const props = renderModal()

    expect(screen.getByText('演示 MySQL')).toBeTruthy()
    expect(screen.getByText(/删除于/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '恢复' }))
    expect(props.onRestore).toHaveBeenCalledWith(props.items[0])

    fireEvent.click(screen.getByRole('button', { name: '彻底删除' }))
    expect(props.onPurge).toHaveBeenCalledWith(props.items[0])

    fireEvent.click(screen.getByRole('button', { name: /清空回收站/ }))
    expect(props.onEmpty).toHaveBeenCalledTimes(1)
  })

  it('explains the empty recycle bin and disables emptying', () => {
    renderModal({ items: [] })

    expect(screen.getByText('回收站是空的')).toBeTruthy()
    expect(screen.getByRole('button', { name: /清空回收站/ })).toHaveProperty('disabled', true)
  })

  it('keeps other rows disabled while one action is in flight', () => {
    const props = renderModal({ busy: { id: 't1', action: 'restore' } })

    const restoreButton = screen.getByRole('button', { name: '恢复' }) as HTMLButtonElement
    const purgeButton = screen.getByRole('button', { name: '彻底删除' }) as HTMLButtonElement
    expect(restoreButton.getAttribute('aria-busy')).toBe('true')
    expect(purgeButton.disabled).toBe(true)
    expect(props.onRestore).not.toHaveBeenCalled()
  })
})

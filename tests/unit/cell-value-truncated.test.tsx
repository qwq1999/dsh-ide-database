// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ cellText: vi.fn() }))

vi.mock('../../src/client/api', () => ({
  ApiError: class ApiError extends Error {},
  api: { cellText: mocks.cellText },
}))

import { CellValueModal } from '../../src/client/CellValueModal'
import { cellValueView, CELL_TEXT_LIMIT, TRUNCATED_SUFFIX } from '../../src/client/cellvalue'

const FULL = '{"a":1,"list":[2,3]}'
const PRETTY = '{\n  "a": 1,\n  "list": [\n    2,\n    3\n  ]\n}'
const capped = `${'a'.repeat(CELL_TEXT_LIMIT)}${TRUNCATED_SUFFIX}`

describe('cell value dialog for a capped cell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('asks the bridge for the rest and shows it pretty-printed', async () => {
    mocks.cellText.mockResolvedValue(FULL)
    render(<CellValueModal view={cellValueView('config', capped)} onClose={() => undefined} />)

    expect(mocks.cellText).toHaveBeenCalledWith('config', capped)
    expect(screen.getByRole('status').textContent).toContain('正在读取完整值')

    const block = await screen.findByLabelText('单元格完整值', {}, { timeout: 5000 })
    expect(block.textContent).toBe(PRETTY)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('says so when the retained copy is gone instead of pretending to be complete', async () => {
    mocks.cellText.mockResolvedValue(null)
    render(<CellValueModal view={cellValueView('config', capped)} onClose={() => undefined} />)

    const status = await screen.findByRole('status', {}, { timeout: 5000 })
    expect(status.textContent).toContain('重新执行查询')
    expect(screen.getByLabelText('单元格完整值').textContent).toBe(capped)
    expect(screen.queryByRole('button', { name: '重试' })).toBeNull()
  })

  it('offers a retry when reading failed', async () => {
    mocks.cellText.mockRejectedValueOnce(new Error('数据库桥未启动')).mockResolvedValueOnce(FULL)
    render(<CellValueModal view={cellValueView('config', capped)} onClose={() => undefined} />)

    const status = await screen.findByRole('status', {}, { timeout: 5000 })
    expect(status.textContent).toContain('数据库桥未启动')
    fireEvent.click(screen.getByRole('button', { name: '重试' }))

    expect(await screen.findByLabelText('单元格完整值', {}, { timeout: 5000 })).toBeDefined()
    await waitFor(() => expect(screen.getByLabelText('单元格完整值').textContent).toBe(PRETTY), { timeout: 5000 })
    expect(mocks.cellText).toHaveBeenCalledTimes(2)
  })

  it('reads nothing for a value that arrived complete', async () => {
    render(<CellValueModal view={cellValueView('config', FULL)} onClose={() => undefined} />)

    expect(mocks.cellText).not.toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByLabelText('单元格完整值').textContent).toBe(PRETTY)
  })
})

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  status: vi.fn(),
  dismissNotice: vi.fn(),
}))

vi.mock('../../src/client/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/client/api')>()
  return {
    ...actual,
    api: { ...actual.api, status: mocks.status, dismissNotice: mocks.dismissNotice },
  }
})

import { App } from '../../src/client/App'
import { UPDATE_NOTICES } from '../../src/shared/notices'
import type { DbSettings, UpdateNotice } from '../../src/shared/types'

const settings: DbSettings = {
  maxRows: 200,
  queryTimeoutSec: 30,
  connectTimeoutSec: 10,
  javaPath: '',
  mavenMirror: 'central',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: true,
  keybindings: {},
  showTableComments: true,
}

/** The notice strip only; setup banners carry a "去设置" button of their own. */
function noticeStrip(): HTMLElement {
  const strip = document.querySelector('.dshdb-notices')
  if (strip === null) throw new Error('notice strip is missing')
  return strip as HTMLElement
}

function mockStatus(notices: UpdateNotice[] = []): void {
  mocks.status.mockResolvedValue({
    config: { connections: [], trash: [], drivers: [], settings: { ...settings } },
    drivers: [],
    env: {
      java: { available: false, source: 'missing' },
      dataDir: '',
      configPath: '',
      bridgeJar: '',
      bridgeBuilt: false,
      pluginVersion: '0.4.2',
      platform: 'win32',
    },
    prefetch: [],
    notices,
  })
}

beforeEach(() => {
  mocks.status.mockReset()
  mocks.dismissNotice.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('update notice banner', () => {
  it('shows the notice with its tone above the tree', async () => {
    mockStatus(UPDATE_NOTICES)
    render(<App />)

    const title = await screen.findByText('数据源树现在会显示表注释')
    const banner = title.closest('.dshdb-banner')
    expect(banner).not.toBeNull()
    expect(banner?.getAttribute('data-tone')).toBe('success')
    expect(banner?.textContent).toContain('设置 → 数据源')
    expect(within(noticeStrip()).getByRole('button', { name: '去设置' })).not.toBeNull()
  })

  it('hides the notice once the user closes it', async () => {
    mockStatus(UPDATE_NOTICES)
    mocks.dismissNotice.mockResolvedValue([])
    render(<App />)

    await screen.findByText('数据源树现在会显示表注释')
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))

    expect(mocks.dismissNotice).toHaveBeenCalledWith('table-comments')
    await waitFor(() => expect(screen.queryByText('数据源树现在会显示表注释')).toBeNull())
  })

  it('keeps the banner when the host refuses the dismissal', async () => {
    mockStatus(UPDATE_NOTICES)
    mocks.dismissNotice.mockRejectedValue(new Error('写入配置失败'))
    render(<App />)

    await screen.findByText('数据源树现在会显示表注释')
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))

    await screen.findByText('关闭提示失败：写入配置失败')
    expect(screen.queryByText('数据源树现在会显示表注释')).not.toBeNull()
  })

  it('opens the settings panel from the notice action', async () => {
    mockStatus(UPDATE_NOTICES)
    render(<App />)

    await screen.findByText('数据源树现在会显示表注释')
    fireEvent.click(within(noticeStrip()).getByRole('button', { name: '去设置' }))
    expect(await screen.findByRole('button', { name: '数据源' })).not.toBeNull()
  })

  it('renders nothing when the host has no visible notice', async () => {
    mockStatus([])
    render(<App />)

    await waitFor(() => expect(document.querySelector('[data-toolbar-action="add"]')).not.toBeNull())
    expect(document.querySelector('.dshdb-notices')).toBeNull()
  })
})

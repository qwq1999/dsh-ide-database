// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettingsView } from '../../src/client/views/SettingsView.tsx'

const noop = () => {}

const settings = {
  maxRows: 200,
  queryTimeoutSec: 30,
  connectTimeoutSec: 10,
  javaPath: '',
  mavenMirror: 'central',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: false,
  keybindings: {},
}

function env() {
  return {
    java: { available: false, source: 'missing', candidates: [] },
    dataDir: 'C:\\data',
    configPath: 'C:\\data\\config.json',
    bridgeJar: 'C:\\data\\bridge.jar',
    bridgeBuilt: true,
    pluginVersion: '0.1.0',
    platform: 'win32',
  }
}

function setup() {
  const onSave = vi.fn()
  render(
    <SettingsView
      settings={settings}
      env={env()}
      drivers={[]}
      saving={false}
      downloading=""
      onSave={onSave}
      onRefresh={noop}
      onDownload={noop}
      onAddCustomDriver={noop}
      onEditCustomDriver={noop}
      onDeleteCustomDriver={noop}
    />,
  )
  return onSave
}

/** The "控制台工具栏" panel is collapsed by default; open it like a user would. */
function openPanel(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: '控制台工具栏' }))
  return screen.getByRole('button', { name: '控制台工具栏' }).closest('.dshdb-panel') as HTMLElement
}

describe('settings console toolbar order', () => {
  afterEach(() => {
    cleanup()
  })

  it('lists the toolbar actions in their current order with icons', () => {
    setup()
    const panel = openPanel()
    const rows = Array.from(panel.querySelectorAll<HTMLElement>('.dshdb-action-row'))
    expect(rows).toHaveLength(14)
    expect(rows[0]?.textContent).toContain('执行')
    expect(rows[13]?.textContent).toContain('导出')
    for (const row of rows) {
      expect(row.querySelector('.dshdb-action-icon svg')).not.toBeNull()
      expect((row.querySelector('.dshdb-driver-name')?.textContent ?? '').length).toBeGreaterThan(0)
    }
  })

  it('moves an action down and saves the new order', () => {
    const onSave = setup()
    const panel = openPanel()
    fireEvent.click(within(panel).getByLabelText('下移 执行'))
    const order = Array.from(panel.querySelectorAll<HTMLElement>('.dshdb-action-row .dshdb-driver-name')).map(
      (row) => row.textContent,
    )
    expect(order.slice(0, 2)).toEqual(['取消', '执行'])
    fireEvent.click(within(panel).getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    const draft = onSave.mock.calls[0]?.[0] as { consoleActions?: string[] }
    expect(draft.consoleActions?.slice(0, 2)).toEqual(['cancel', 'run'])
    expect(draft.consoleActions).toHaveLength(14)
  })

  it('resets the saved order to the default', () => {
    const onSave = setup()
    const panel = openPanel()
    fireEvent.click(within(panel).getByLabelText('下移 执行'))
    fireEvent.click(within(panel).getByRole('button', { name: '恢复默认' }))
    fireEvent.click(within(panel).getByRole('button', { name: '保存' }))
    const draft = onSave.mock.calls[0]?.[0] as { consoleActions?: string[] }
    expect(draft.consoleActions).toEqual([])
  })
})

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

type Overrides = Partial<typeof settings> & { consoleAutoComplete?: boolean }

function env() {
  return {
    java: { available: false, source: 'missing', candidates: [] },
    dataDir: 'C:\\\\data',
    configPath: 'C:\\\\data\\\\config.json',
    bridgeJar: 'C:\\\\data\\\\bridge.jar',
    bridgeBuilt: true,
    pluginVersion: '0.1.0',
    platform: 'win32',
  }
}

function setup(overrides: Overrides = {}) {
  const onSave = vi.fn()
  render(
    <SettingsView
      settings={{ ...settings, ...overrides }}
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

/** The "控制台" panel is collapsed by default; open it like a user would. */
function openPanel(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: '控制台' }))
  return screen.getByRole('button', { name: '控制台' }).closest('.dshdb-panel') as HTMLElement
}

const switchName = '输入字符后自动展开补全列表'

describe('settings console auto complete', () => {
  afterEach(() => {
    cleanup()
  })

  it('defaults the auto-complete switch to on', () => {
    setup()
    const panel = openPanel()
    const toggle = within(panel).getByRole('switch', { name: switchName })
    expect(toggle.getAttribute('aria-checked')).toBe('true')
  })

  it('saves the switch turned off', () => {
    const onSave = setup()
    const panel = openPanel()
    fireEvent.click(within(panel).getByRole('switch', { name: switchName }))
    expect(within(panel).getByRole('switch', { name: switchName }).getAttribute('aria-checked')).toBe('false')
    fireEvent.click(within(panel).getByRole('button', { name: '保存' }))
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({ consoleAutoComplete: false })
  })

  it('reflects a saved off value', () => {
    setup({ consoleAutoComplete: false })
    const panel = openPanel()
    expect(within(panel).getByRole('switch', { name: switchName }).getAttribute('aria-checked')).toBe('false')
  })
})

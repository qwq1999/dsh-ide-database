// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

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

const env = {
  java: { available: true, source: 'PATH', version: '21.0.5', major: 21, candidates: [] },
  dataDir: 'C:/data',
  configPath: 'C:/data/config.json',
  bridgeJar: 'C:/data/bridge.jar',
  bridgeBuilt: true,
  pluginVersion: '0.1.0',
  platform: 'win32',
}

function setup() {
  render(
    <SettingsView
      settings={settings}
      env={env}
      drivers={[]}
      saving={false}
      downloading=""
      downloadingJava={false}
      onSave={noop}
      onRefresh={noop}
      onDownload={noop}
      onDownloadJava={noop}
      onAddCustomDriver={noop}
      onEditCustomDriver={noop}
      onDeleteCustomDriver={noop}
    />,
  )
}

const toggle = (title: string): HTMLElement => screen.getByRole('button', { name: title })

/** The body is hidden with the attribute *and* `display: none`, so read the property. */
const panelBody = (title: string): HTMLElement =>
  (toggle(title).closest('section') as HTMLElement).querySelector('.dshdb-panel-body') as HTMLElement

describe('settings panel collapse', () => {
  afterEach(() => {
    cleanup()
  })

  it('expands 运行环境 and collapses every other panel', () => {
    setup()
    expect(toggle('运行环境').getAttribute('aria-expanded')).toBe('true')
    expect(panelBody('运行环境').hidden).toBe(false)
    for (const title of ['查询与安全', '快捷键', '预置驱动', '自定义驱动']) {
      expect(toggle(title).getAttribute('aria-expanded')).toBe('false')
      expect(panelBody(title).hidden).toBe(true)
    }
  })

  it('toggles a panel open and 运行环境 closed', () => {
    setup()
    fireEvent.click(toggle('快捷键'))
    expect(toggle('快捷键').getAttribute('aria-expanded')).toBe('true')
    expect(panelBody('快捷键').hidden).toBe(false)

    fireEvent.click(toggle('运行环境'))
    expect(toggle('运行环境').getAttribute('aria-expanded')).toBe('false')
    expect(panelBody('运行环境').hidden).toBe(true)
  })
})

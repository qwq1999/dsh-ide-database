// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SettingsView } from '../../src/client/views/SettingsView.tsx'

const noop = () => {}

function makeSettings(overrides: Record<string, unknown> = {}) {
  return {
    maxRows: 200,
    queryTimeoutSec: 30,
    connectTimeoutSec: 10,
    javaPath: '',
    mavenMirror: 'central',
    allowAgentWrites: false,
    redisScanCount: 200,
    confirmDestructive: false,
    keybindings: {},
    ...overrides,
  }
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

function view(settings: ReturnType<typeof makeSettings>, onSave = noop) {
  return render(
    <SettingsView
      settings={settings}
      env={env()}
      drivers={[]}
      saving={false}
      downloading=""
      downloadingJava={false}
      onSave={onSave}
      onRefresh={noop}
      onDownload={noop}
      onDownloadJava={noop}
      onAddCustomDriver={noop}
      onEditCustomDriver={noop}
      onDeleteCustomDriver={noop}
    />,
  )
}

function numericInput(label: string): HTMLInputElement {
  const fields = Array.from(document.querySelectorAll('.dshdb-form-grid > *'))
  const field = fields.find((el) => (el.textContent ?? '').includes(label))
  if (!field) throw new Error(`field ${label} not found`)
  const input = field.querySelector('input[type="number"]')
  if (!input) throw new Error(`number input for ${label} not found`)
  return input as HTMLInputElement
}

afterEach(() => cleanup())

describe('settings number bounds', () => {
  it('clamps maxRows to the host maximum of 5000 instead of allowing 10000', () => {
    let saved: any = null
    view(makeSettings(), (s: any) => { saved = s })
    const input = numericInput('返回行数上限')
    expect(input.max).toBe('5000')
    fireEvent.change(input, { target: { value: '10000' } })
    // Find and click the save button via its label.
    const saveBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes('保存'))
    expect(saveBtn).toBeDefined()
    fireEvent.click(saveBtn!)
    expect(saved).not.toBeNull()
    expect(saved.maxRows).toBe(5000)
  })

  it('falls back to redisScanCount minimum 10 (not 1) on cleared input', () => {
    let saved: any = null
    view(makeSettings(), (s: any) => { saved = s })
    const input = numericInput('Redis 单次扫描数量')
    expect(input.min).toBe('10')
    fireEvent.change(input, { target: { value: '' } })
    const saveBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent ?? '').includes('保存'))
    fireEvent.click(saveBtn!)
    expect(saved).not.toBeNull()
    expect(saved.redisScanCount).toBe(10)
  })
})

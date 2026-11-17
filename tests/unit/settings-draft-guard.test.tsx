// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SettingsView } from '../../src/client/views/SettingsView.tsx'

const noop = () => {}

function makeSettings() {
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

function view(settings: ReturnType<typeof makeSettings>) {
  return render(
    <SettingsView
      settings={settings}
      env={env()}
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

function javaInput(): HTMLInputElement {
  const inputs = Array.from(document.querySelectorAll('input'))
  const found = inputs.find((input) => (input.getAttribute('placeholder') ?? '').includes('java.exe'))
  if (!found) throw new Error('java path input not found')
  return found as HTMLInputElement
}

afterEach(() => cleanup())

describe('settings draft guard', () => {
  it('keeps unsaved edits when a background refresh passes an equal-but-new settings object', () => {
    const original = makeSettings()
    const rendered = view(original)
    const input = javaInput()
    fireEvent.change(input, { target: { value: 'C:\\MY_JAVA\\bin\\java.exe' } })
    expect(javaInput().value).toBe('C:\\MY_JAVA\\bin\\java.exe')

    // The 1.5s prefetch poll rebuilds the snapshot with identical content but a
    // fresh object identity; unsaved edits must survive it.
    rendered.rerender(
      <SettingsView
        settings={{ ...makeSettings() }}
        env={env()}
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
    expect(javaInput().value).toBe('C:\\MY_JAVA\\bin\\java.exe')
  })

  it('re-seeds the draft when settings content actually changes', () => {
    const rendered = view(makeSettings())
    fireEvent.change(javaInput(), { target: { value: 'TYPED_BUT_UNSAVED' } })
    const changed = { ...makeSettings(), javaPath: 'C:\\CANONICAL\\java.exe' }
    rendered.rerender(
      <SettingsView
        settings={changed}
        env={env()}
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
    expect(javaInput().value).toBe('C:\\CANONICAL\\java.exe')
  })
})

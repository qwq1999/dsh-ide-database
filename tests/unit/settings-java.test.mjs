import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'

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
}

function env(overrides = {}) {
  return {
    java: {
      available: true,
      path: 'C:\\Java\\jdk-21\\bin\\java.exe',
      version: '21.0.5',
      major: 21,
      source: 'PATH',
      candidates: [
        { path: 'C:\\Java\\jdk-21\\bin\\java.exe', version: '21.0.5', major: 21, source: 'PATH' },
        { path: 'C:\\Java\\jdk-17\\bin\\java.exe', version: '17.0.12', major: 17, source: 'JAVA_HOME' },
      ],
    },
    dataDir: 'C:\\data',
    configPath: 'C:\\data\\config.json',
    bridgeJar: 'C:\\data\\bridge.jar',
    bridgeBuilt: true,
    pluginVersion: '0.1.0',
    platform: 'win32',
    ...overrides,
  }
}

function render(overrides = {}) {
  return renderToStaticMarkup(
    createElement(SettingsView, {
      settings,
      env: env(),
      drivers: [],
      saving: false,
      downloading: '',
      onSave: noop,
      onRefresh: noop,
      onDownload: noop,
      onAddCustomDriver: noop,
      onEditCustomDriver: noop,
      onDeleteCustomDriver: noop,
      ...overrides,
    }),
  )
}

describe('settings Java runtime picker', () => {
  it('lists every detected runtime with the newest first', () => {
    const html = render()
    expect(html).toContain('自动（按 JAVA_HOME、PATH、JDK 目录查找）')
    expect(html).toContain('Java 21 · 21.0.5 · 最新')
    expect(html).toContain('Java 17 · 17.0.12')
    expect(html.indexOf('Java 21')).toBeLessThan(html.indexOf('Java 17'))
  })

  it('falls back to the plain path input when no candidate is detected', () => {
    const html = render({
      env: env({ java: { available: false, source: 'missing', message: '未找到 Java', candidates: [] } }),
    })
    expect(html).not.toContain('自动（按 JAVA_HOME')
    expect(html).toContain('Java 可执行文件')
  })
})

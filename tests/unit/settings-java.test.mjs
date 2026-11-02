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
      downloadingJava: false,
      onSave: noop,
      onRefresh: noop,
      onDownload: noop,
      onDownloadJava: noop,
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

describe('settings Java download button', () => {
  const missing = { available: false, source: 'missing', message: '未找到 Java', candidates: [] }
  const downloaded = {
    available: true,
    path: '/data/jre/bin/java',
    version: '21.0.5',
    major: 21,
    source: 'downloaded',
    candidates: [{ path: '/data/jre/bin/java', version: '21.0.5', major: 21, source: 'downloaded' }],
  }

  const mysql = {
    id: 'mysql',
    name: 'MySQL',
    preset: 'mysql',
    needsJava: true,
    jars: [],
    ready: false,
    version: null,
    path: null,
    error: null,
  }

  it('offers to download a runtime only when Java is missing', () => {
    const missingHtml = render({ env: env({ java: missing }), drivers: [mysql] })
    expect(missingHtml).toContain('>下载 Java<')
    expect(missingHtml).toContain('可点击右上角')

    const foundHtml = render()
    expect(foundHtml).not.toContain('下载 Java')
  })

  it('offers a re-download for the runtime it installed earlier', () => {
    const html = render({ env: env({ java: downloaded }) })
    expect(html).toContain('重新下载 Java')
    expect(html).toContain('已下载')
    expect(html).toContain('Java 21 · 21.0.5（已下载） · 最新')
  })
})

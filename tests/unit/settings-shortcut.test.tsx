// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

function setup(onSave = vi.fn()) {
  const view = render(
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
  return { view, onSave }
}

const field = (label: string): HTMLInputElement => screen.getByLabelText(label) as HTMLInputElement

describe('settings shortcut recorder', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the current binding of every action', () => {
    setup()
    expect(field('执行（有选中内容时只执行选中部分） 的快捷键').value).toBe('Ctrl + Enter')
    expect(field('清空编辑器（不影响已拿到的结果） 的快捷键').value).toBe('Ctrl + L')
    expect(field('格式化 SQL 的快捷键').value).toBe('Ctrl + Shift + F')
  })

  it('records a new combination and clears it with 全部恢复默认', () => {
    setup()
    const input = field('清空编辑器（不影响已拿到的结果） 的快捷键')
    fireEvent.focus(input)
    expect(input.value).toBe('按下组合键…')
    fireEvent.keyDown(input, { key: 'k', ctrlKey: true, altKey: true })
    expect(input.value).toBe('Ctrl + Alt + K')
    fireEvent.click(screen.getByRole('button', { name: '全部恢复默认' }))
    expect(input.value).toBe('Ctrl + L')
  })

  it('refuses a combination another action of the same area already uses', () => {
    setup()
    const input = field('把编辑器里的 SQL 存成 .sql 文件 的快捷键')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true })
    // 还在录制状态，等一个不冲突的组合键。
    expect(input.value).toBe('按下组合键…')
    expect(screen.getByText(/与「执行（有选中内容时只执行选中部分）」冲突/)).toBeTruthy()
  })

  it('refuses a bare key so typing stays possible', () => {
    setup()
    const input = field('格式化 SQL 的快捷键')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'k' })
    expect(input.value).toBe('按下组合键…')
    expect(screen.getByText('要带 Ctrl/⌘ 或 Alt，功能键（F1–F12）可以单独用')).toBeTruthy()
  })

  it('restores the default with Delete', () => {
    setup()
    const input = field('只执行光标所在的那条语句 的快捷键')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'e', ctrlKey: true, altKey: true })
    expect(input.value).toBe('Ctrl + Alt + E')
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'Delete' })
    expect(input.value).toBe('Ctrl + Shift + Enter')
  })
})

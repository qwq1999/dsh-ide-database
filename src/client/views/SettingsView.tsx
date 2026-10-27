import { useEffect, useState, type KeyboardEvent, type ReactElement } from 'react'
import type { CustomDriverStatus, DbSettings, DriverStatus, EnvStatus } from '../../shared/types'
import {
  SHORTCUTS,
  SHORTCUT_SCOPE_LABEL,
  bindingFromEvent,
  bindingOf,
  conflictingShortcut,
  formatBinding,
  shortcutDef,
  type ShortcutDef,
  type ShortcutScope,
} from '../../shared/keymap'
import { formatBytes } from '../format'
import { IS_MAC } from '../keymap'
import { DatabaseIcon, DownloadIcon, EditIcon, PlusIcon, RefreshIcon, TrashIcon } from '../icons'
import { Banner, Button, Field, Panel, Select, Spinner, Switch, Tag, TextInput } from '../ui'

/** Panel order: the editor first, then everything the user reaches with a mouse. */
const SHORTCUT_SCOPES: ShortcutScope[] = ['console', 'result', 'table', 'tree', 'redis']

function ShortcutRow(props: {
  def: ShortcutDef
  overrides: Record<string, string>
  onChange: (binding: string | null) => void
}): ReactElement {
  const { def, overrides, onChange } = props
  const [recording, setRecording] = useState(false)
  const [problem, setProblem] = useState('')
  const binding = bindingOf(def.id, overrides)

  /** Record the keypress itself; Esc leaves, Delete clears the override. */
  const capture = (event: KeyboardEvent<HTMLInputElement>): void => {
    event.preventDefault()
    event.stopPropagation()
    const field = event.currentTarget
    if (event.key === 'Escape' || event.key === 'Tab') {
      setRecording(false)
      field.blur()
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      setProblem('')
      setRecording(false)
      onChange(null)
      field.blur()
      return
    }
    const next = bindingFromEvent(event)
    if (next === null) {
      setProblem('要带 Ctrl/⌘ 或 Alt，功能键（F1–F12）可以单独用')
      return
    }
    const taken = conflictingShortcut(def.id, next, overrides)
    if (taken !== null) {
      setProblem(`与「${shortcutDef(taken).label}」冲突`)
      return
    }
    setProblem('')
    setRecording(false)
    onChange(next)
    field.blur()
  }

  return (
    <div className="dshdb-driver-row">
      <div className="dshdb-driver-main">
        <div className="dshdb-driver-name">{def.label}</div>
        {problem !== '' ? <div className="dshdb-field-error">{problem}</div> : null}
      </div>
      <TextInput
        readOnly
        style={{ width: 168, textAlign: 'center' }}
        aria-label={`${def.label} 的快捷键`}
        title="点一下再按新的组合键（Esc 取消，Delete 恢复默认）"
        value={recording ? '按下组合键…' : formatBinding(binding, IS_MAC)}
        onFocus={() => {
          setRecording(true)
          setProblem('')
        }}
        onBlur={() => setRecording(false)}
        onKeyDown={capture}
      />
      <Button
        size="sm"
        variant="ghost"
        disabled={overrides[def.id] === undefined}
        onClick={() => onChange(null)}
      >
        恢复默认
      </Button>
    </div>
  )
}

export interface SettingsViewProps {
  settings: DbSettings
  env: EnvStatus
  drivers: DriverStatus[]
  saving: boolean
  downloading: string
  onSave: (settings: DbSettings) => void
  onRefresh: () => void
  onDownload: (driverId: string) => void
  onAddCustomDriver: () => void
  onEditCustomDriver: (driver: DriverStatus) => void
  onDeleteCustomDriver: (driver: DriverStatus) => void
}

function JavaBadge({ env }: { env: EnvStatus }): ReactElement {
  const java = env.java
  return (
    <div className="dshdb-kv" style={{ padding: 0 }}>
      <span className="dshdb-kv-key">Java</span>
      <span className="dshdb-kv-val dshdb-inline">
        {java.available ? <Tag tone="success">可用</Tag> : <Tag tone="error">未找到</Tag>}
        <span className="dshdb-mono">{java.version ?? java.message ?? '未检测到 Java'}</span>
      </span>
      <span className="dshdb-kv-key">来源</span>
      <span className="dshdb-kv-val dshdb-mono">{java.source}</span>
      {java.path ? (
        <>
          <span className="dshdb-kv-key">路径</span>
          <span className="dshdb-kv-val dshdb-mono" title={java.path}>
            {java.path}
          </span>
        </>
      ) : null}
      <span className="dshdb-kv-key">数据目录</span>
      <span className="dshdb-kv-val dshdb-mono" title={env.configPath}>
        {env.configPath}
      </span>
      <span className="dshdb-kv-key">JDBC 桥</span>
      <span className="dshdb-kv-val dshdb-inline">
        {env.bridgeBuilt ? <Tag tone="success">已构建</Tag> : <Tag tone="warn">缺失</Tag>}
        <span className="dshdb-mono" title={env.bridgeJar}>
          {env.bridgeJar}
        </span>
      </span>
      <span className="dshdb-kv-key">版本</span>
      <span className="dshdb-kv-val dshdb-mono">
        v{env.pluginVersion} · {env.platform}
      </span>
    </div>
  )
}

export function SettingsView(props: SettingsViewProps): ReactElement {
  const [draft, setDraft] = useState<DbSettings>(props.settings)

  useEffect(() => {
    setDraft(props.settings)
  }, [props.settings])

  const update = <K extends keyof DbSettings>(key: K, value: DbSettings[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }))
  }

  const updateNumber = (key: 'maxRows' | 'queryTimeoutSec' | 'connectTimeoutSec' | 'redisScanCount', value: string) => {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed) && parsed > 0) update(key, parsed)
    else update(key, 1)
  }

  const javaCandidates = props.env.java.candidates ?? []
  const knownJavaPaths = new Set(javaCandidates.map((candidate) => candidate.path))
  const customJavaPath =
    draft.javaPath.trim() !== '' && !knownJavaPaths.has(draft.javaPath) ? draft.javaPath : undefined
  const javaOptions = [
    { value: '', label: '自动（按 JAVA_HOME、PATH、JDK 目录查找）' },
    ...javaCandidates.map((candidate, index) => ({
      value: candidate.path,
      label: `Java ${candidate.major} · ${candidate.version}${candidate.source === 'bundled' ? '（内置）' : ''}${
        index === 0 ? ' · 最新' : ''
      }`,
    })),
    ...(customJavaPath !== undefined ? [{ value: customJavaPath, label: customJavaPath }] : []),
  ]

  const presets = props.drivers.filter((driver) => driver.preset !== null)
  const customs = props.drivers.filter((driver) => driver.preset === null)
  const keybindings = draft.keybindings ?? {}

  return (
    <div className="dshdb-scroll dshdb-scroll-thin" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Panel title="运行环境" bodyClassName="dshdb-panel-body-pad">
        <JavaBadge env={props.env} />
        {!props.env.bridgeBuilt ? (
          <div style={{ marginTop: 6 }}>
            <Banner tone="warn">JDBC 桥接器缺失，SQL 连接将不可用。运行 `npm run build:bridge` 后重试。</Banner>
          </div>
        ) : null}
        {!props.env.java.available && presets.some((driver) => driver.needsJava) ? (
          <div style={{ marginTop: 6 }}>
            <Banner tone="warn">未检测到 Java，关系型数据库驱动需要 Java 8 及以上运行环境。</Banner>
          </div>
        ) : null}
      </Panel>

      <Panel
        title="查询与安全"
        actions={
          <Button
            size="sm"
            variant="primary"
            loading={props.saving}
            onClick={() => props.onSave(draft)}
          >
            保存
          </Button>
        }
        bodyClassName="dshdb-panel-body-pad"
      >
        <div className="dshdb-form">
          <div className="dshdb-form-grid">
            <Field label="返回行数上限" hint="面板与工具共用的硬上限">
              <TextInput
                type="number"
                min={1}
                max={10000}
                value={String(draft.maxRows)}
                onChange={(event) => updateNumber('maxRows', event.target.value)}
              />
            </Field>
            <Field label="查询超时（秒）">
              <TextInput
                type="number"
                min={1}
                max={600}
                value={String(draft.queryTimeoutSec)}
                onChange={(event) => updateNumber('queryTimeoutSec', event.target.value)}
              />
            </Field>
            <Field label="连接超时（秒）">
              <TextInput
                type="number"
                min={1}
                max={120}
                value={String(draft.connectTimeoutSec)}
                onChange={(event) => updateNumber('connectTimeoutSec', event.target.value)}
              />
            </Field>
            <Field label="Redis 单次扫描数量">
              <TextInput
                type="number"
                min={10}
                max={2000}
                value={String(draft.redisScanCount)}
                onChange={(event) => updateNumber('redisScanCount', event.target.value)}
              />
            </Field>
            <Field
              label="Java 可执行文件"
              hint="留空时优先使用随包内置的 Java，再按 JAVA_HOME、PATH、常见 JDK 目录查找"
              span
            >
              {javaOptions.length > 1 ? (
                <Select
                  options={javaOptions}
                  value={draft.javaPath}
                  onValueChange={(value) => update('javaPath', value)}
                />
              ) : null}
              <TextInput
                value={draft.javaPath}
                placeholder="例如 C:\\Program Files\\Java\\jdk-21\\bin\\java.exe"
                onChange={(event) => update('javaPath', event.target.value)}
              />
            </Field>
            <Field label="Maven 镜像" hint="驱动 jar 下载源">
              <Select
                options={[
                  { value: 'central', label: 'Maven Central' },
                  { value: 'aliyun', label: '阿里云镜像' },
                ]}
                value={draft.mavenMirror}
                onValueChange={(value) => update('mavenMirror', value === 'aliyun' ? 'aliyun' : 'central')}
              />
            </Field>
          </div>
          <div className="dshdb-list">
            <Switch
              checked={draft.allowAgentWrites}
              onChange={(checked) => update('allowAgentWrites', checked)}
              label="允许 Agent 工具执行写语句（仅非只读连接）"
            />
            <Switch
              checked={draft.confirmDestructive}
              onChange={(checked) => update('confirmDestructive', checked)}
              label="执行破坏性操作前需要二次确认"
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="快捷键"
        actions={
          <div className="dshdb-inline">
            <Button size="sm" variant="ghost" onClick={() => update('keybindings', {})}>
              全部恢复默认
            </Button>
            <Button size="sm" variant="primary" loading={props.saving} onClick={() => props.onSave(draft)}>
              保存
            </Button>
          </div>
        }
        bodyClassName="dshdb-panel-body-pad"
      >
        <div className="dshdb-muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
          点一下组合键框，再按下新的组合键即可（Esc 取消，Delete 恢复这一项的默认）。组合键要带 Ctrl/⌘ 或 Alt，功能键可以单独用；同一区域里不能重复，改完点「保存」。
        </div>
        {SHORTCUT_SCOPES.map((scope) => (
          <div key={scope} style={{ marginTop: 8 }}>
            <div className="dshdb-qfilter-label">{SHORTCUT_SCOPE_LABEL[scope]}</div>
            <div className="dshdb-list">
              {SHORTCUTS.filter((def) => def.scope === scope).map((def) => (
                <ShortcutRow
                  key={def.id}
                  def={def}
                  overrides={keybindings}
                  onChange={(binding) => {
                    const next = { ...keybindings }
                    if (binding === null) delete next[def.id]
                    else next[def.id] = binding
                    update('keybindings', next)
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </Panel>

      <Panel
        title="预置驱动"
        actions={
          <Button size="sm" variant="ghost" icon={<RefreshIcon size={12} />} onClick={props.onRefresh}>
            重新检测
          </Button>
        }
        bodyClassName="dshdb-panel-body-pad"
      >
        <div className="dshdb-list">
          {presets.map((driver) => (
            <div className="dshdb-driver-row" key={driver.id}>
              <DatabaseIcon size={15} />
              <div className="dshdb-driver-main">
                <div className="dshdb-driver-name">
                  {driver.name}
                  <Tag>{driver.dialect}</Tag>
                  {driver.allJarsPresent ? <Tag tone="success">已就绪</Tag> : <Tag tone="warn">缺少驱动</Tag>}
                </div>
                <div className="dshdb-driver-sub" title={driver.jars.map((jar) => jar.coordinates).join(', ')}>
                  {driver.driverClass ?? '—'}
                  {driver.jars.length > 0 ? ` · ${driver.jars.map((jar) => jar.file).join(', ')}` : ''}
                </div>
                {driver.jars.length > 0 ? (
                  <div style={{ marginTop: 3 }}>
                    {driver.jars.map((jar) => (
                      <div className="dshdb-file-row" key={jar.coordinates}>
                        <span className={`dshdb-dot`} data-tone={jar.downloaded ? 'success' : 'warn'} />
                        <span className="dshdb-mono" title={jar.coordinates}>
                          {jar.file}
                        </span>
                        <span className="dshdb-muted">{jar.downloaded ? formatBytes(jar.sizeBytes) : '未下载'}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {driver.jars.length > 0 ? (
                <Button
                  size="sm"
                  icon={<DownloadIcon size={12} />}
                  loading={props.downloading === driver.id}
                  disabled={driver.allJarsPresent}
                  onClick={() => props.onDownload(driver.id)}
                >
                  {driver.allJarsPresent ? '已安装' : '下载'}
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        title="自定义驱动"
        actions={
          <Button size="sm" icon={<PlusIcon size={12} />} onClick={props.onAddCustomDriver}>
            新增
          </Button>
        }
        bodyClassName="dshdb-panel-body-pad"
      >
        {customs.length === 0 ? (
          <div className="dshdb-muted" style={{ fontSize: 11.5, lineHeight: 1.6 }}>
            没有自定义驱动。若数据库不在预置列表中，可填写 Maven 坐标、驱动类与 JDBC URL 模板自行扩展。
          </div>
        ) : (
          <div className="dshdb-list">
            {customs.map((driver) => (
              <div className="dshdb-driver-row" key={driver.id}>
                <DatabaseIcon size={15} />
                <div className="dshdb-driver-main">
                  <div className="dshdb-driver-name">
                    {driver.name}
                    <Tag>{driver.dialect}</Tag>
                  </div>
                  <div className="dshdb-driver-sub" title={driver.urlTemplate}>
                    {driver.driverClass} · {driver.urlTemplate}
                  </div>
                  <div className="dshdb-driver-sub">
                    {driver.jars.map((jar) => jar.coordinates).join(' · ') || '未配置 jar'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<EditIcon size={12} />}
                  aria-label={`编辑 ${driver.name}`}
                  onClick={() => props.onEditCustomDriver(driver)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<TrashIcon size={12} />}
                  aria-label={`删除 ${driver.name}`}
                  onClick={() => props.onDeleteCustomDriver(driver)}
                />
              </div>
            ))}
          </div>
        )}
      </Panel>

      {props.downloading !== '' ? (
        <div className="dshdb-muted dshdb-inline" style={{ fontSize: 11 }}>
          <Spinner /> 正在下载驱动依赖…
        </div>
      ) : null}
    </div>
  )
}

export type { CustomDriverStatus }

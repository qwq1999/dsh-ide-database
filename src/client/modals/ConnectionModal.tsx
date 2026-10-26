import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { PRESET_ORDER, PRESETS, presetOf } from '../../shared/presets'
import type {
  ClientConnection,
  ConnectionDraft,
  ConnectionTestResult,
  DriverStatus,
  PresetId,
} from '../../shared/types'
import { api } from '../api'
import { copyText } from '../colmenu'
import { dialectLabel, formatMs } from '../format'
import { DatabaseIcon, PlusIcon, TrashIcon } from '../icons'
import { Banner, Button, Field, Modal, Select, Spinner, Switch, Tag, TextArea, TextInput } from '../ui'

const PRESET_LABEL: Record<PresetId, string> = {
  mysql: 'MySQL',
  mariadb: 'MariaDB',
  'oceanbase-mysql': 'OceanBase（MySQL 模式）',
  'oceanbase-oracle': 'OceanBase（Oracle 模式）',
  oracle: 'Oracle',
  dameng: '达梦 DM',
  postgres: 'PostgreSQL',
  sqlite: 'SQLite',
  mssql: 'SQL Server',
  redis: 'Redis',
}

export interface ConnectionModalProps {
  open: boolean
  editing: ClientConnection | null
  drivers: DriverStatus[]
  onClose: () => void
  onSaved: () => void
  onDelete: (connection: ClientConnection) => void
  notify: (text: string, tone?: 'info' | 'success' | 'error') => void
}

function toParamsText(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

function parseParamsText(text: string): Record<string, string> {
  const params: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index <= 0) continue
    params[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim()
  }
  return params
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function ConnectionModal(props: ConnectionModalProps): ReactElement | null {
  const [choice, setChoice] = useState<string>('mysql')
  const [name, setName] = useState('')
  const [host, setHost] = useState('127.0.0.1')
  const [port, setPort] = useState('3306')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [clearPassword, setClearPassword] = useState(false)
  const [database, setDatabase] = useState('')
  const [redisDb, setRedisDb] = useState('0')
  const [paramsText, setParamsText] = useState('')
  const [readOnly, setReadOnly] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null)
  const [error, setError] = useState('')

  const customDrivers = useMemo(() => props.drivers.filter((driver) => driver.preset === null), [props.drivers])
  const editing = props.editing

  useEffect(() => {
    setError('')
    setTestResult(null)
    setSaving(false)
    setTesting(false)
    if (!props.open) return
    if (editing) {
      setChoice(editing.driver === 'custom' ? `custom:${editing.customDriverId ?? ''}` : editing.driver)
      setName(editing.name)
      setHost(editing.host)
      setPort(String(editing.port))
      setUser(editing.user)
      setDatabase(editing.database)
      setRedisDb(String(editing.redisDb))
      setParamsText(toParamsText(editing.params))
      setReadOnly(editing.readOnly)
      setPassword('')
      setClearPassword(false)
      return
    }
    setChoice('mysql')
    setName('')
    setHost('127.0.0.1')
    setPort(String(PRESETS.mysql.defaultPort))
    setUser('')
    setDatabase('')
    setRedisDb('0')
    setParamsText('')
    setReadOnly(false)
    setPassword('')
    setClearPassword(false)
  }, [props.open, editing])

  if (!props.open) return null

  const isCustom = choice.startsWith('custom:')
  const customId = isCustom ? choice.slice('custom:'.length) : undefined
  const customDriver = customDrivers.find((driver) => driver.id === customId)
  const preset = !isCustom ? presetOf(choice) : undefined
  /** File based engines have no host, port or credentials to fill in. */
  const fileBased = preset?.hostOptional === true
  const dialect = isCustom ? customDriver?.dialect : preset?.dialect
  const isRedis = dialect === 'redis'

  const driverOptions = [
    ...PRESET_ORDER.map((id) => ({
      value: id as string,
      label: `${PRESET_LABEL[id]}${PRESETS[id].needsJava ? '' : ''}`,
    })),
    ...customDrivers.map((driver) => ({ value: `custom:${driver.id}`, label: `${driver.name}（自定义）` })),
  ]

  const changeChoice = (value: string) => {
    setChoice(value)
    setTestResult(null)
    setError('')
    if (value.startsWith('custom:')) return
    const spec = presetOf(value)
    if (spec) setPort(String(spec.defaultPort))
  }

  const buildDraft = (): ConnectionDraft => ({
    id: editing?.id,
    name: name.trim(),
    driver: isCustom ? 'custom' : (choice as PresetId),
    customDriverId: isCustom ? customId : undefined,
    // File based engines keep no host; do not persist whatever the previous preset left behind.
    host: fileBased ? '' : host.trim(),
    port: fileBased ? 0 : Number.parseInt(port, 10) || 0,
    user: user.trim(),
    ...(password !== '' ? { password } : {}),
    ...(clearPassword ? { clearPassword: true } : {}),
    database: isRedis ? '' : database.trim(),
    redisDb: Number.parseInt(redisDb, 10) || 0,
    params: isRedis ? {} : parseParamsText(paramsText),
    readOnly,
  })

  const validate = (draft: ConnectionDraft): string => {
    if (draft.name === '') return '请填写连接名称'
    const spec = isCustom ? undefined : PRESETS[choice as PresetId]
    const hostOptional = spec?.hostOptional === true
    if (draft.host === '' && !hostOptional) return '请填写主机地址'
    if (!hostOptional && (!Number.isInteger(draft.port) || draft.port < 1 || draft.port > 65535)) {
      return '端口需在 1-65535 之间'
    }
    if (hostOptional && draft.database === '') return '请填写数据库文件路径'
    if (isCustom && !customDriver) return '请选择或先新增一个自定义驱动'
    return ''
  }

  const test = async () => {
    const draft = buildDraft()
    const problem = validate(draft)
    if (problem) {
      setError(problem)
      return
    }
    if (isRedis) {
      setError('Redis 连接请在保存后通过面板连接验证')
      return
    }
    setTesting(true)
    setError('')
    try {
      setTestResult(await api.testConnection({ ...draft, id: undefined }))
    } catch (cause) {
      setTestResult(null)
      setError(errorText(cause))
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    const draft = buildDraft()
    const problem = validate(draft)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.saveConnection(draft)
      props.notify(editing ? '连接已更新' : '连接已创建', 'success')
      props.onSaved()
      props.onClose()
    } catch (cause) {
      setError(errorText(cause))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={props.open}
      title={
        <span className="dshdb-inline">
          <DatabaseIcon size={14} />
          {editing ? `编辑连接 · ${editing.name}` : '新建数据源连接'}
        </span>
      }
      onClose={props.onClose}
      footer={
        <>
          {editing ? (
            <Button variant="danger" size="sm" icon={<TrashIcon size={12} />} onClick={() => props.onDelete(editing)}>
              删除
            </Button>
          ) : null}
          <div className="dshdb-modal-foot-spacer" />
          {!isRedis ? (
            <Button onClick={() => void test()} loading={testing}>
              测试连接
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => void save()} loading={saving}>
            保存
          </Button>
        </>
      }
    >
      <div className="dshdb-form">
        <div className="dshdb-form-grid">
          <Field label="名称" required span>
            <TextInput
              value={name}
              autoFocus
              placeholder="例如 本地 MySQL"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Field label="驱动" required span hint={dialect ? `方言：${dialectLabel(dialect)}` : undefined}>
            <Select options={driverOptions} value={choice} onValueChange={changeChoice} />
          </Field>
          {isCustom && !customDriver ? (
            <div className="dshdb-span-2">
              <Banner tone="warn">还没有自定义驱动，请先在「设置」标签页新增。</Banner>
            </div>
          ) : null}
          {fileBased ? null : (
            <>
              <Field label="主机" required>
                <TextInput value={host} onChange={(event) => setHost(event.target.value)} placeholder="127.0.0.1" />
              </Field>
              <Field label="端口" required>
                <TextInput
                  value={port}
                  inputMode="numeric"
                  onChange={(event) => setPort(event.target.value.replace(/[^0-9]/g, ''))}
                />
              </Field>
              <Field label="用户名">
                <TextInput value={user} onChange={(event) => setUser(event.target.value)} placeholder={isRedis ? 'default' : '用户名'} />
              </Field>
              <Field label="密码" hint={editing?.hasPassword ? '已保存密码，留空则保持不变' : undefined}>
                <TextInput
                  type="password"
                  value={password}
                  autoComplete="new-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={editing?.hasPassword ? '留空则保持不变' : '密码'}
                />
              </Field>
              {editing?.hasPassword ? (
                <div className="dshdb-span-2">
                  <Switch checked={clearPassword} onChange={setClearPassword} label="清除已保存的密码" />
                </div>
              ) : null}
            </>
          )}
          {isRedis ? (
            <Field label="逻辑库序号" hint="Redis 数据库编号，默认 0">
              <TextInput
                value={redisDb}
                inputMode="numeric"
                onChange={(event) => setRedisDb(event.target.value.replace(/[^0-9]/g, ''))}
              />
            </Field>
          ) : (
            <Field label="数据库 / 服务名" span={fileBased} hint={preset?.databaseHint ?? '可留空，连接后再选择 schema'}>
              <TextInput
                value={database}
                onChange={(event) => setDatabase(event.target.value)}
                placeholder={fileBased ? '例如 ./data/app.db' : '可留空'}
              />
            </Field>
          )}
          {!isRedis ? (
            <Field label="额外 JDBC 参数" span hint="每行一个 key=value，例如 useSSL=false">
              <TextArea
                value={paramsText}
                onChange={(event) => setParamsText(event.target.value)}
                placeholder={'useSSL=false\nconnectTimeout=10000'}
              />
            </Field>
          ) : null}
          <div className="dshdb-span-2 dshdb-list">
            <Switch checked={readOnly} onChange={setReadOnly} label="只读连接（面板与 Agent 均拒绝写操作）" />
          </div>
        </div>

        {testResult ? (
          <Banner tone={testResult.ok ? 'success' : 'error'}>
            {testResult.ok
              ? `连接成功 · ${testResult.server?.product ?? ''} ${testResult.server?.version ?? ''} · ${formatMs(testResult.latencyMs)}${testResult.note === undefined ? '' : ` · ${testResult.note}`}`
              : `连接失败：${testResult.message ?? '未知错误'}`}
          </Banner>
        ) : null}
        {error ? (
          <Banner
            tone="error"
            actions={
              <Button size="sm" variant="ghost" title="复制错误信息" onClick={() => void copyText(error)}>
                复制
              </Button>
            }
          >
            {error}
          </Banner>
        ) : null}
        {testing ? (
          <span className="dshdb-muted dshdb-inline" style={{ fontSize: 11 }}>
            <Spinner /> 正在测试连接…
          </span>
        ) : null}
        {isCustom ? <Tag tone="business">自定义驱动</Tag> : null}
        {!isRedis && dialect ? (
          <span className="dshdb-muted" style={{ fontSize: 11 }}>
            驱动类：{customDriver?.driverClass ?? preset?.driverClass ?? '—'}
          </span>
        ) : null}
        {!editing ? null : (
          <span className="dshdb-muted" style={{ fontSize: 11 }}>
            连接 ID：{editing.id}
          </span>
        )}
      </div>
    </Modal>
  )
}

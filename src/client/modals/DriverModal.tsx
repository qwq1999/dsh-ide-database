import { useEffect, useState, type ReactElement } from 'react'
import { SQL_DIALECT_LABEL } from '../../shared/presets'
import type { DriverStatus, JarRef, SqlDialect } from '../../shared/types'
import { api } from '../api'
import { copyText } from '../colmenu'
import { DatabaseIcon } from '../icons'
import { Banner, Button, Field, Modal, Select, TextArea, TextInput } from '../ui'

export interface DriverModalProps {
  open: boolean
  editing: DriverStatus | null
  onClose: () => void
  onSaved: (drivers: DriverStatus[]) => void
  notify: (text: string, tone?: 'info' | 'success' | 'error') => void
}

const DIALECT_OPTIONS = (Object.keys(SQL_DIALECT_LABEL) as SqlDialect[]).map((dialect) => ({
  value: dialect,
  label: SQL_DIALECT_LABEL[dialect],
}))

function parseJars(text: string): JarRef[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const parts = line.split(':').map((part) => part.trim())
      if (parts.length < 3) return null
      const version = parts[parts.length - 1] ?? ''
      const artifact = parts[parts.length - 2] ?? ''
      const group = parts.slice(0, -2).join(':')
      if (group === '' || artifact === '' || version === '') return null
      return { group, artifact, version }
    })
    .filter((jar): jar is JarRef => jar !== null)
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function DriverModal(props: DriverModalProps): ReactElement | null {
  const [name, setName] = useState('')
  const [dialect, setDialect] = useState<SqlDialect>('generic')
  const [driverClass, setDriverClass] = useState('')
  const [urlTemplate, setUrlTemplate] = useState('jdbc:custom://{{host}}:{{port}}/{{database}}')
  const [jarsText, setJarsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    setSaving(false)
    if (!props.open) return
    const editing = props.editing
    if (editing) {
      setName(editing.name)
      setDialect(editing.dialect === 'redis' ? 'generic' : editing.dialect)
      setDriverClass(editing.driverClass ?? '')
      setUrlTemplate(editing.urlTemplate ?? '')
      setJarsText(editing.jars.map((jar) => `${jar.group}:${jar.artifact}:${jar.version}`).join('\n'))
    } else {
      setName('')
      setDialect('generic')
      setDriverClass('')
      setUrlTemplate('jdbc:custom://{{host}}:{{port}}/{{database}}')
      setJarsText('')
    }
  }, [props.open, props.editing])

  if (!props.open) return null

  const save = async () => {
    if (name.trim() === '') {
      setError('请填写驱动名称')
      return
    }
    if (driverClass.trim() === '') {
      setError('请填写 JDBC 驱动类名')
      return
    }
    if (!/^jdbc:/.test(urlTemplate.trim())) {
      setError('JDBC URL 模板需以 jdbc: 开头')
      return
    }
    if (!urlTemplate.includes('{{host}}')) {
      setError('JDBC URL 模板需包含 {{host}} 占位符')
      return
    }
    const jars = parseJars(jarsText)
    if (jars.length === 0) {
      setError('请至少填写一行 Maven 坐标：group:artifact:version')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await api.saveCustomDriver({
        id: props.editing?.id,
        name: name.trim(),
        dialect,
        driverClass: driverClass.trim(),
        urlTemplate: urlTemplate.trim(),
        jars,
      })
      props.notify(props.editing ? '自定义驱动已更新' : '自定义驱动已创建', 'success')
      props.onSaved(response.drivers)
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
          {props.editing ? `编辑驱动 · ${props.editing.name}` : '新增自定义驱动'}
        </span>
      }
      onClose={props.onClose}
      footer={
        <>
          <div className="dshdb-modal-foot-spacer" />
          <Button onClick={props.onClose}>取消</Button>
          <Button variant="primary" loading={saving} onClick={() => void save()}>
            保存
          </Button>
        </>
      }
    >
      <div className="dshdb-form">
        <div className="dshdb-form-grid">
          <Field label="名称" required span>
            <TextInput value={name} autoFocus placeholder="例如 ClickHouse" onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="方言" required>
            <Select
              options={DIALECT_OPTIONS}
              value={dialect}
              onValueChange={(value) => setDialect(value as SqlDialect)}
            />
          </Field>
          <Field label="驱动类" required>
            <TextInput
              value={driverClass}
              placeholder="com.example.jdbc.Driver"
              onChange={(event) => setDriverClass(event.target.value)}
            />
          </Field>
          <Field
            label="JDBC URL 模板"
            required
            span
            hint="占位符：{{host}} {{port}} {{database}}，例如 jdbc:mysql://{{host}}:{{port}}/{{database}}"
          >
            <TextInput value={urlTemplate} onChange={(event) => setUrlTemplate(event.target.value)} />
          </Field>
          <Field
            label="Maven 依赖"
            required
            span
            hint="每行一个 group:artifact:version；加载顺序即书写顺序"
          >
            <TextArea
              value={jarsText}
              onChange={(event) => setJarsText(event.target.value)}
              placeholder={'com.example:example-jdbc:1.0.0'}
              style={{ minHeight: 84 }}
            />
          </Field>
        </div>
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
      </div>
    </Modal>
  )
}

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { randomBytes } from 'node:crypto'

import { isPresetId, isSqlDialect, PRESETS, presetOf } from '../shared/presets.js'
import { lenientKeybindings, parseKeybindings } from '../shared/keymap.js'
import type {
  ClientConfig,
  ClientConnection,
  ConnectionConfig,
  ConnectionDraft,
  DbConfigFile,
  DbSettings,
  DriverConfig,
  DriverChoice,
  JarRef,
  SqlDialect,
} from '../shared/types.js'
import { DbError, errorMessage } from './errors.js'
import type { SecretStore } from './secrets.js'
import { SecretStore as Store } from './secrets.js'

export const DEFAULT_SETTINGS: DbSettings = {
  maxRows: 200,
  queryTimeoutSec: 30,
  connectTimeoutSec: 10,
  javaPath: '',
  mavenMirror: 'central',
  allowAgentWrites: false,
  redisScanCount: 200,
  confirmDestructive: true,
  keybindings: {},
}

const NAME_MAX = 80
const TEXT_MAX = 255
const DATABASE_MAX = 256
const PARAM_KEYS_MAX = 32
const JARS_MAX = 8

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const DRIVER_CLASS_PATTERN = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/
const JAR_PART_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
const PARAM_KEY_PATTERN = /^[A-Za-z0-9._-]{1,64}$/

export const SETTING_KEYS: (keyof DbSettings)[] = [
  'maxRows',
  'queryTimeoutSec',
  'connectTimeoutSec',
  'javaPath',
  'mavenMirror',
  'allowAgentWrites',
  'redisScanCount',
  'confirmDestructive',
  'keybindings',
]

function nowIso(): string {
  return new Date().toISOString()
}

function randId(prefix: string): string {
  return `${prefix}-${randomBytes(5).toString('hex')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown, field: string, max = TEXT_MAX, required = false): string {
  if (typeof value !== 'string') {
    if (required) throw new DbError('invalid', `${field} 必须是字符串`)
    return ''
  }
  const trimmed = value.trim()
  if (trimmed.length > max) throw new DbError('invalid', `${field} 不能超过 ${max} 个字符`)
  if (required && trimmed === '') throw new DbError('invalid', `${field} 不能为空`)
  return trimmed
}

function asPort(value: unknown, field: string, fallback?: number): number {
  if (value === undefined || value === null || value === '') {
    if (fallback !== undefined) return fallback
    throw new DbError('invalid', `${field} 不能为空`)
  }
  const port = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new DbError('invalid', `${field} 必须是 1-65535 的整数`)
  return port
}

function asInt(value: unknown, field: string, min: number, max: number, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new DbError('invalid', `${field} 必须是 ${min}-${max} 的整数`)
  return parsed
}

function sanitizeParams(value: unknown): Record<string, string> {
  if (value === undefined || value === null) return {}
  if (!isRecord(value)) throw new DbError('invalid', '连接参数必须是对象')
  const entries = Object.entries(value)
  if (entries.length > PARAM_KEYS_MAX) throw new DbError('invalid', `连接参数不能超过 ${PARAM_KEYS_MAX} 项`)
  const out: Record<string, string> = {}
  for (const [key, raw] of entries) {
    if (!PARAM_KEY_PATTERN.test(key)) throw new DbError('invalid', `非法的参数名：${key}`)
    if (typeof raw !== 'string') throw new DbError('invalid', `参数 ${key} 的值必须是字符串`)
    if (raw.length > 2048) throw new DbError('invalid', `参数 ${key} 的值过长`)
    out[key] = raw
  }
  return out
}

function sanitizeJar(raw: unknown): JarRef {
  if (!isRecord(raw)) throw new DbError('invalid', 'jar 必须是对象')
  const group = asString(raw.group, 'jar.group', 200, true)
  const artifact = asString(raw.artifact, 'jar.artifact', 200, true)
  const version = asString(raw.version, 'jar.version', 100, true)
  if (!JAR_PART_PATTERN.test(group) || !JAR_PART_PATTERN.test(artifact) || !JAR_PART_PATTERN.test(version)) {
    throw new DbError('invalid', `非法的 Maven 坐标：${group}:${artifact}:${version}`)
  }
  return { group, artifact, version }
}

export class ConfigStore {
  private data: DbConfigFile = { version: 1, connections: [], drivers: [], settings: { ...DEFAULT_SETTINGS } }

  constructor(
    readonly file: string,
    private readonly secrets: SecretStore,
    private readonly log: (message: string) => void = () => {},
  ) {}

  load(): void {
    if (!existsSync(this.file)) {
      this.data = { version: 1, connections: [], drivers: [], settings: { ...DEFAULT_SETTINGS } }
      return
    }
    try {
      const parsed = JSON.parse(readFileSync(this.file, 'utf8')) as unknown
      if (!isRecord(parsed)) throw new Error('config root is not an object')
      const connections = Array.isArray(parsed.connections) ? parsed.connections : []
      const drivers = Array.isArray(parsed.drivers) ? parsed.drivers : []
      const settings = isRecord(parsed.settings) ? parsed.settings : {}
      const hydratedDrivers = drivers.flatMap((entry) => this.hydrateDriver(entry))
      this.data = {
        version: 1,
        connections: [],
        drivers: hydratedDrivers,
        settings: this.hydrateSettings(settings),
      }
      // Connections are resolved after their custom drivers exist on `this.data`.
      this.data.connections = connections.flatMap((entry) => this.hydrateConnection(entry))
    } catch (error) {
      const backup = `${this.file}.corrupt-${Date.now()}`
      try {
        renameSync(this.file, backup)
      } catch {
        // keep the original if the backup cannot be written
      }
      this.log(`connections.json is corrupt (${errorMessage(error)}); moved to ${backup}`)
      this.data = { version: 1, connections: [], drivers: [], settings: { ...DEFAULT_SETTINGS } }
    }
  }

  private hydrateSettings(raw: Record<string, unknown>): DbSettings {
    const settings = { ...DEFAULT_SETTINGS }
    for (const key of SETTING_KEYS) {
      const value = raw[key]
      try {
        switch (key) {
          case 'maxRows':
            settings.maxRows = asInt(value, 'maxRows', 1, 5000, settings.maxRows)
            break
          case 'queryTimeoutSec':
            settings.queryTimeoutSec = asInt(value, 'queryTimeoutSec', 1, 600, settings.queryTimeoutSec)
            break
          case 'connectTimeoutSec':
            settings.connectTimeoutSec = asInt(value, 'connectTimeoutSec', 1, 120, settings.connectTimeoutSec)
            break
          case 'redisScanCount':
            settings.redisScanCount = asInt(value, 'redisScanCount', 10, 10000, settings.redisScanCount)
            break
          case 'javaPath':
            settings.javaPath = typeof value === 'string' ? value.trim().slice(0, 1024) : settings.javaPath
            break
          case 'mavenMirror':
            settings.mavenMirror = value === 'aliyun' ? 'aliyun' : settings.mavenMirror
            break
          case 'allowAgentWrites':
            settings.allowAgentWrites = value === true
            break
          case 'confirmDestructive':
            settings.confirmDestructive = value !== false
            break
          case 'keybindings':
            settings.keybindings = lenientKeybindings(value)
            break
        }
      } catch {
        // ignore a single bad setting
      }
    }
    return settings
  }

  private hydrateDriver(raw: unknown): DriverConfig[] {
    if (!isRecord(raw)) return []
    try {
      const id = asString(raw.id, 'driver.id', 64, true)
      if (!ID_PATTERN.test(id) || isPresetId(id)) return []
      const dialect = asString(raw.dialect, 'driver.dialect', 32, true)
      if (!isSqlDialect(dialect)) return []
      const jarsRaw = Array.isArray(raw.jars) ? raw.jars.slice(0, JARS_MAX) : []
      const jars = jarsRaw.flatMap((jar) => {
        try {
          return [sanitizeJar(jar)]
        } catch {
          return []
        }
      })
      if (jars.length === 0) return []
      const driverClass = asString(raw.driverClass, 'driver.driverClass', 255, true)
      const urlTemplate = asString(raw.urlTemplate, 'driver.urlTemplate', 1024, true)
      if (!DRIVER_CLASS_PATTERN.test(driverClass) || !urlTemplate.includes('{{host}}') || !urlTemplate.includes('{{port}}')) return []
      return [{
        id,
        name: asString(raw.name, 'driver.name', NAME_MAX, true),
        dialect: dialect as SqlDialect,
        driverClass,
        urlTemplate,
        jars,
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowIso(),
      }]
    } catch {
      return []
    }
  }

  private hydrateConnection(raw: unknown): ConnectionConfig[] {
    if (!isRecord(raw)) return []
    try {
      const id = asString(raw.id, 'connection.id', 64, true)
      if (!ID_PATTERN.test(id)) return []
      const driverRaw = asString(raw.driver, 'connection.driver', 64, true)
      const driver: DriverChoice = driverRaw === 'custom' ? 'custom' : isPresetId(driverRaw) ? driverRaw : 'mysql'
      const preset = driver === 'custom' ? undefined : presetOf(driver)
      const customDriverId = driver === 'custom' ? asString(raw.customDriverId, 'connection.customDriverId', 64, true) : undefined
      const dialect = preset !== undefined ? preset.dialect : this.data.drivers.find((d) => d.id === customDriverId)?.dialect
      if (dialect === undefined) return []
      const secretName = typeof raw.secretName === 'string' && raw.secretName !== '' ? raw.secretName : undefined
      return [{
        id,
        name: asString(raw.name, 'connection.name', NAME_MAX, true),
        driver,
        ...(customDriverId === undefined ? {} : { customDriverId }),
        dialect,
        host: asString(raw.host, 'connection.host', TEXT_MAX, true),
        port: asPort(raw.port, 'connection.port', 0),
        user: asString(raw.user, 'connection.user', 128),
        ...(secretName === undefined ? {} : { secretName }),
        hasPassword: typeof secretName === 'string' && this.secrets.has(secretName),
        database: asString(raw.database, 'connection.database', DATABASE_MAX),
        redisDb: asInt(raw.redisDb, 'connection.redisDb', 0, 255, 0),
        params: sanitizeParams(raw.params),
        readOnly: raw.readOnly === true,
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : nowIso(),
        ...(typeof raw.lastUsedAt === 'string' ? { lastUsedAt: raw.lastUsedAt } : {}),
      }]
    } catch {
      return []
    }
  }

  get(): DbConfigFile {
    return this.data
  }

  settings(): DbSettings {
    return this.data.settings
  }

  snapshot(): ClientConfig {
    const connections: ClientConnection[] = this.data.connections.map((conn) => ({
      id: conn.id,
      name: conn.name,
      driver: conn.driver,
      ...(conn.customDriverId === undefined ? {} : { customDriverId: conn.customDriverId }),
      dialect: conn.dialect,
      host: conn.host,
      port: conn.port,
      user: conn.user,
      hasPassword: conn.secretName !== undefined && this.secrets.has(conn.secretName),
      database: conn.database,
      redisDb: conn.redisDb,
      params: { ...conn.params },
      readOnly: conn.readOnly,
      createdAt: conn.createdAt,
      ...(conn.lastUsedAt === undefined ? {} : { lastUsedAt: conn.lastUsedAt }),
    }))
    return {
      connections,
      drivers: this.data.drivers.map((driver) => ({ ...driver, jars: driver.jars.map((jar) => ({ ...jar })) })),
      settings: { ...this.data.settings },
    }
  }

  driver(id: string): DriverConfig | undefined {
    return this.data.drivers.find((driver) => driver.id === id)
  }

  connection(id: string): ConnectionConfig | undefined {
    return this.data.connections.find((connection) => connection.id === id)
  }

  saveConnection(raw: unknown): ConnectionConfig {
    if (!isRecord(raw)) throw new DbError('invalid', '连接内容无效')
    const existingId = typeof raw.id === 'string' && raw.id !== '' ? raw.id : undefined
    const existing = existingId === undefined ? undefined : this.connection(existingId)
    if (existingId !== undefined && existing === undefined) throw new DbError('not-found', `连接不存在：${existingId}`)

    const draft = raw as unknown as ConnectionDraft
    const name = asString(draft.name, '名称', NAME_MAX, true)
    const driverRaw = asString(draft.driver, '驱动', 64, true)
    if (driverRaw !== 'custom' && !isPresetId(driverRaw)) throw new DbError('invalid', `未知的驱动：${driverRaw}`)
    const driver = driverRaw as DriverChoice
    let dialect: ConnectionConfig['dialect']
    let customDriverId: string | undefined
    if (driver === 'custom') {
      const id = asString(draft.customDriverId, '自定义驱动', 64, true)
      const custom = this.driver(id)
      if (custom === undefined) throw new DbError('not-found', `自定义驱动不存在：${id}`)
      dialect = custom.dialect
      customDriverId = id
    } else {
      dialect = PRESETS[driver].dialect
    }
    const host = asString(draft.host, '主机', TEXT_MAX, true)
    const port = asPort(draft.port, '端口')
    const user = asString(draft.user, '用户名', 128)
    const database = dialect === 'redis' ? '' : asString(draft.database, '数据库', DATABASE_MAX)
    const redisDb = dialect === 'redis' ? asInt(draft.redisDb, 'Redis 库序号', 0, 255, 0) : 0
    const params = sanitizeParams(draft.params)
    const readOnly = draft.readOnly === true

    const id = existing?.id ?? randId('conn')
    const secretName = existing?.secretName ?? Store.nameForConnection(id)
    if (typeof draft.password === 'string' && draft.password !== '') this.secrets.set(secretName, draft.password)
    else if (draft.clearPassword === true) this.secrets.delete(secretName)

    const connection: ConnectionConfig = {
      id,
      name,
      driver,
      ...(customDriverId === undefined ? {} : { customDriverId }),
      dialect,
      host,
      port,
      user,
      secretName,
      hasPassword: this.secrets.has(secretName),
      database,
      redisDb,
      params,
      readOnly,
      createdAt: existing?.createdAt ?? nowIso(),
      ...(existing?.lastUsedAt === undefined ? {} : { lastUsedAt: existing.lastUsedAt }),
    }
    if (existing === undefined) this.data.connections.push(connection)
    else this.data.connections = this.data.connections.map((entry) => (entry.id === id ? connection : entry))
    this.persist()
    return connection
  }

  deleteConnection(id: string): void {
    const connection = this.connection(id)
    if (connection === undefined) throw new DbError('not-found', `连接不存在：${id}`)
    this.data.connections = this.data.connections.filter((entry) => entry.id !== id)
    if (connection.secretName !== undefined) this.secrets.delete(connection.secretName)
    this.persist()
  }

  touchConnection(id: string): void {
    const connection = this.connection(id)
    if (connection === undefined) return
    connection.lastUsedAt = nowIso()
    this.persist()
  }

  updateSettings(raw: unknown): DbSettings {
    if (!isRecord(raw)) throw new DbError('invalid', '设置内容无效')
    const next = { ...this.data.settings }
    for (const key of SETTING_KEYS) {
      if (!(key in raw)) continue
      const value = raw[key]
      switch (key) {
        case 'maxRows':
          next.maxRows = asInt(value, '最大返回行数', 1, 5000, next.maxRows)
          break
        case 'queryTimeoutSec':
          next.queryTimeoutSec = asInt(value, '查询超时（秒）', 1, 600, next.queryTimeoutSec)
          break
        case 'connectTimeoutSec':
          next.connectTimeoutSec = asInt(value, '连接超时（秒）', 1, 120, next.connectTimeoutSec)
          break
        case 'redisScanCount':
          next.redisScanCount = asInt(value, 'Redis SCAN 数量', 10, 10000, next.redisScanCount)
          break
        case 'javaPath':
          next.javaPath = asString(value, 'Java 路径', 1024)
          break
        case 'mavenMirror':
          if (value !== 'central' && value !== 'aliyun') throw new DbError('invalid', 'Maven 镜像只能是 central 或 aliyun')
          next.mavenMirror = value
          break
        case 'allowAgentWrites':
          if (typeof value !== 'boolean') throw new DbError('invalid', 'allowAgentWrites 必须是布尔值')
          next.allowAgentWrites = value
          break
        case 'confirmDestructive':
          if (typeof value !== 'boolean') throw new DbError('invalid', 'confirmDestructive 必须是布尔值')
          next.confirmDestructive = value
          break
        case 'keybindings':
          // 组合键是否冲突由共享注册表判断，这里只负责报错信息。
          try {
            next.keybindings = parseKeybindings(value)
          } catch (error) {
            throw new DbError('invalid', errorMessage(error))
          }
          break
      }
    }
    this.data.settings = next
    this.persist()
    return next
  }

  upsertDriver(raw: unknown): DriverConfig {
    if (!isRecord(raw)) throw new DbError('invalid', '驱动内容无效')
    const existingId = typeof raw.id === 'string' && raw.id !== '' ? raw.id : undefined
    const existing = existingId === undefined ? undefined : this.driver(existingId)
    if (existingId !== undefined) {
      if (isPresetId(existingId)) throw new DbError('conflict', '内置驱动的 ID 不可修改')
      if (existing === undefined) throw new DbError('not-found', `自定义驱动不存在：${existingId}`)
    }
    const name = asString(raw.name, '驱动名称', NAME_MAX, true)
    const dialectRaw = asString(raw.dialect, '数据库类型', 32, true)
    if (!isSqlDialect(dialectRaw)) throw new DbError('invalid', '自定义驱动只支持 SQL 数据库')
    const driverClass = asString(raw.driverClass, '驱动类', 255, true)
    if (!DRIVER_CLASS_PATTERN.test(driverClass)) throw new DbError('invalid', `非法的驱动类：${driverClass}`)
    const urlTemplate = asString(raw.urlTemplate, 'JDBC URL 模板', 1024, true)
    if (!urlTemplate.includes('{{host}}') || !urlTemplate.includes('{{port}}')) {
      throw new DbError('invalid', 'URL 模板必须包含 {{host}} 与 {{port}} 占位符')
    }
    const jarsRaw = Array.isArray(raw.jars) ? raw.jars : []
    if (jarsRaw.length === 0 || jarsRaw.length > JARS_MAX) throw new DbError('invalid', `请提供 1-${JARS_MAX} 个 jar 坐标`)
    const jars = jarsRaw.map(sanitizeJar)
    const id = existing?.id ?? randId('custom')
    const driver: DriverConfig = {
      id,
      name,
      dialect: dialectRaw,
      driverClass,
      urlTemplate,
      jars,
      createdAt: existing?.createdAt ?? nowIso(),
    }
    if (existing === undefined) this.data.drivers.push(driver)
    else this.data.drivers = this.data.drivers.map((entry) => (entry.id === id ? driver : entry))
    this.persist()
    return driver
  }

  deleteDriver(id: string): void {
    if (this.driver(id) === undefined) throw new DbError('not-found', `自定义驱动不存在：${id}`)
    const used = this.data.connections.filter((connection) => connection.customDriverId === id)
    if (used.length > 0) throw new DbError('conflict', `该驱动仍被 ${used.length} 个连接使用：${used.map((c) => c.name).join('、')}`)
    this.data.drivers = this.data.drivers.filter((entry) => entry.id !== id)
    this.persist()
  }

  private persist(): void {
    mkdirSync(dirname(this.file), { recursive: true, mode: 0o700 })
    const temp = `${this.file}.tmp-${process.pid}`
    writeFileSync(temp, `${JSON.stringify(this.data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
    renameSync(temp, this.file)
  }
}

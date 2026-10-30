import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { ConfigStore } from '../../lib/host/config.js'
import { SecretStore } from '../../lib/host/secrets.js'

const dirs = []

function store() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-config-'))
  dirs.push(dir)
  const secrets = new SecretStore(join(dir, 'secrets.json'))
  const config = new ConfigStore(join(dir, 'connections.json'), secrets)
  config.load()
  return { config, secrets, dir }
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('ConfigStore', () => {
  it('starts with safe defaults', () => {
    const { config } = store()
    expect(config.snapshot()).toMatchObject({
      connections: [],
      drivers: [],
      settings: { maxRows: 200, allowAgentWrites: false, connectTimeoutSec: 10, mavenMirror: 'central' },
    })
  })

  it('saves a connection and keeps the password in the secret store', () => {
    const { config, secrets } = store()
    const saved = config.saveConnection({
      name: 'Local MySQL',
      driver: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: 's3cret',
      database: 'app',
      params: {},
      readOnly: false,
    })
    expect(saved.hasPassword).toBe(true)
    expect(saved.secretName).toBeTruthy()
    expect(JSON.stringify(config.snapshot())).not.toContain('s3cret')
    expect(secrets.has(saved.secretName)).toBe(true)
    expect(secrets.resolve(saved.secretName)?.value).toBe('s3cret')
  })

  it('updates an existing connection and can clear its password', () => {
    const { config, secrets } = store()
    const saved = config.saveConnection({
      name: 'Local MySQL', driver: 'mysql', host: '127.0.0.1', port: 3306, user: 'root', password: 'pw', database: 'app',
    })
    const updated = config.saveConnection({
      id: saved.id, name: 'Local MySQL 2', driver: 'mysql', host: '127.0.0.1', port: 3307, user: 'root',
      password: '', clearPassword: true, database: 'app2',
    })
    expect(updated.id).toBe(saved.id)
    expect(updated.port).toBe(3307)
    expect(updated.hasPassword).toBe(false)
    expect(secrets.has(saved.secretName)).toBe(false)
  })

  it('rejects invalid ports and oversized row limits', () => {
    const { config } = store()
    expect(() =>
      config.saveConnection({ name: 'bad', driver: 'mysql', host: 'x', port: 70000, user: 'u', database: 'd' }),
    ).toThrow(/端口/)
    expect(() => config.updateSettings({ maxRows: 5_001 })).toThrow(/最大返回行数/)
  })

  it('saves a SQLite connection without host and port', () => {
    const { config } = store()
    const saved = config.saveConnection({ name: 'Local SQLite', driver: 'sqlite', database: 'D:/data/app.db' })
    expect(saved).toMatchObject({ dialect: 'sqlite', host: '', port: 0, database: 'D:/data/app.db' })
    expect(() => config.saveConnection({ name: 'no file', driver: 'sqlite' })).toThrow(/database/)
  })

  it('fills the preset default port when the agent omits it', () => {
    const { config } = store()
    const saved = config.saveConnection({ name: 'Local PG', driver: 'postgres', host: '127.0.0.1', database: 'app' })
    expect(saved.port).toBe(5432)
  })

  it('stores rebindings, drops unusable ones on load and refuses bad saves', () => {
    const { config, dir } = store()
    config.updateSettings({ keybindings: { 'console.clear': 'MOD+K' } })
    expect(config.snapshot().settings.keybindings).toEqual({ 'console.clear': 'mod+k' })
    expect(() => config.updateSettings({ keybindings: { 'console.clear': 'mod+enter' } })).toThrow(/同时绑给了/)
    expect(() => config.updateSettings({ keybindings: { nope: 'mod+k' } })).toThrow(/未知的快捷键/)
    expect(config.snapshot().settings.keybindings).toEqual({ 'console.clear': 'mod+k' })

    const secrets = new SecretStore(join(dir, 'secrets.json'))
    const reloaded = new ConfigStore(join(dir, 'connections.json'), secrets)
    reloaded.load()
    expect(reloaded.snapshot().settings.keybindings).toEqual({ 'console.clear': 'mod+k' })
  })

  it('persists custom drivers and settings to disk', () => {
    const { config, dir } = store()
    config.upsertDriver({
      name: 'H2',
      dialect: 'generic',
      driverClass: 'org.h2.Driver',
      urlTemplate: 'jdbc:h2:tcp://{{host}}:{{port}}/{{database}}',
      jars: [{ group: 'com.h2database', artifact: 'h2', version: '2.2.224' }],
    })
    config.updateSettings({ allowAgentWrites: true, maxRows: 50 })
    expect(config.snapshot().drivers).toHaveLength(1)
    expect(config.snapshot().settings).toMatchObject({ allowAgentWrites: true, maxRows: 50 })

    const secrets = new SecretStore(join(dir, 'secrets.json'))
    const reloaded = new ConfigStore(join(dir, 'connections.json'), secrets)
    reloaded.load()
    expect(reloaded.snapshot().drivers[0].name).toBe('H2')
    expect(reloaded.snapshot().settings.allowAgentWrites).toBe(true)
  })

  it('trashes a connection but keeps its password and persists it', () => {
    const { config, secrets, dir } = store()
    const saved = config.saveConnection({
      name: 'Soft delete', driver: 'mysql', host: '127.0.0.1', port: 3306, user: 'root', password: 'pw', database: 'app',
    })

    const trashed = config.trashConnection(saved.id)

    expect(trashed.deletedAt).toBeTruthy()
    expect(config.snapshot().connections).toHaveLength(0)
    expect(config.snapshot().trash).toMatchObject([{ id: saved.id, name: 'Soft delete', hasPassword: true }])
    expect(secrets.has(saved.secretName)).toBe(true)

    const reloaded = new ConfigStore(join(dir, 'connections.json'), new SecretStore(join(dir, 'secrets.json')))
    reloaded.load()
    expect(reloaded.snapshot().connections).toHaveLength(0)
    expect(reloaded.snapshot().trash[0]).toMatchObject({ id: saved.id, deletedAt: trashed.deletedAt })
  })

  it('restores a trashed connection with its password intact', () => {
    const { config, secrets } = store()
    const saved = config.saveConnection({
      name: 'Restore me', driver: 'mysql', host: '127.0.0.1', port: 3306, user: 'root', password: 'pw', database: 'app',
    })
    config.trashConnection(saved.id)

    const restored = config.restoreConnection(saved.id)

    expect(restored.id).toBe(saved.id)
    expect(config.snapshot().trash).toHaveLength(0)
    expect(config.snapshot().connections).toMatchObject([{ id: saved.id, hasPassword: true }])
    expect(secrets.has(saved.secretName)).toBe(true)
    expect(() => config.restoreConnection('missing')).toThrow(/回收站中没有/)
  })

  it('purges a trashed connection and deletes its password', () => {
    const { config, secrets } = store()
    const saved = config.saveConnection({
      name: 'Purge me', driver: 'mysql', host: '127.0.0.1', port: 3306, user: 'root', password: 'pw', database: 'app',
    })
    config.trashConnection(saved.id)

    const purged = config.purgeConnection(saved.id)

    expect(purged.id).toBe(saved.id)
    expect(config.snapshot().connections).toHaveLength(0)
    expect(config.snapshot().trash).toHaveLength(0)
    expect(secrets.has(saved.secretName)).toBe(false)
    expect(() => config.purgeConnection(saved.id)).toThrow(/不存在/)
  })

  it('empties the recycle bin and forgets every password', () => {
    const { config, secrets } = store()
    const first = config.saveConnection({
      name: 'One', driver: 'mysql', host: '127.0.0.1', port: 3306, user: 'root', password: 'a', database: 'app',
    })
    const second = config.saveConnection({
      name: 'Two', driver: 'postgres', host: '127.0.0.1', port: 5432, user: 'root', password: 'b', database: 'app',
    })
    config.trashConnection(first.id)
    config.trashConnection(second.id)

    expect(config.emptyTrash()).toBe(2)
    expect(config.snapshot().trash).toEqual([])
    expect(secrets.has(first.secretName)).toBe(false)
    expect(secrets.has(second.secretName)).toBe(false)
  })

  it('still refuses to delete a driver used by a trashed connection', () => {
    const { config } = store()
    config.upsertDriver({
      name: 'H2',
      dialect: 'generic',
      driverClass: 'org.h2.Driver',
      urlTemplate: 'jdbc:h2:tcp://{{host}}:{{port}}/{{database}}',
      jars: [{ group: 'com.h2database', artifact: 'h2', version: '2.2.224' }],
    })
    const driverId = config.snapshot().drivers[0].id
    const saved = config.saveConnection({
      name: 'Custom', driver: 'custom', customDriverId: driverId, host: '127.0.0.1', port: 1, user: 'u', database: 'app',
    })
    config.trashConnection(saved.id)

    expect(() => config.deleteDriver(driverId)).toThrow(/仍被/)
  })
})

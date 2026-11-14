import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { ConfigStore } from '../../lib/host/config.js'
import { SecretStore } from '../../lib/host/secrets.js'
import { RedisManager, isReadOnlyCommand } from '../../lib/host/redis.js'

const dirs = []

function manager() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-redis-'))
  dirs.push(dir)
  const secrets = new SecretStore(join(dir, 'secrets.json'))
  const config = new ConfigStore(join(dir, 'connections.json'), secrets)
  config.load()
  config.saveConnection({ name: 'Redis', driver: 'redis', host: '127.0.0.1', port: 6379, database: '' })
  return { config, redis: new RedisManager(config, secrets) }
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('Redis command guard', () => {
  it('rejects destructive commands even on a writable connection', async () => {
    const { config, redis } = manager()
    const id = config.snapshot().connections[0].id
    for (const command of ['FLUSHALL', 'flushdb', 'SHUTDOWN', 'MONITOR']) {
      await expect(redis.command(id, 0, command, true)).rejects.toThrow(/禁止执行/)
    }
  })

  it('rejects an empty command', async () => {
    const { config, redis } = manager()
    const id = config.snapshot().connections[0].id
    await expect(redis.command(id, 0, '   ', true)).rejects.toThrow(/命令不能为空/)
  })

  it('accepts set algebra as reads', () => {
    for (const command of ['SINTER', 'SUNION', 'SDIFF', 'sinter']) {
      expect(isReadOnlyCommand(command)).toBe(true)
    }
    expect(isReadOnlyCommand('SADD')).toBe(false)
  })

  it('accepts pure reads that cannot store their result', () => {
    for (const command of [
      'ZRANDMEMBER',
      'ZUNION',
      'ZINTER',
      'ZINTERCARD',
      'SINTERCARD',
      'ZDIFF',
      'SORT_RO',
      'LCS',
      'EXPIRETIME',
      'PEXPIRETIME',
      'GEORADIUS_RO',
      'GEORADIUSBYMEMBER_RO',
    ]) {
      expect(isReadOnlyCommand(command)).toBe(true)
    }
    // The STORE variants remain separate write commands.
    expect(isReadOnlyCommand('ZUNIONSTORE')).toBe(false)
    expect(isReadOnlyCommand('ZINTERSTORE')).toBe(false)
  })
})

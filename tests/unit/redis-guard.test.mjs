import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { ConfigStore } from '../../lib/host/config.js'
import { SecretStore } from '../../lib/host/secrets.js'
import { RedisManager, isReadOnlyCommand } from '../../lib/host/redis.js'
import { looksLikeRedisWrite } from '../../src/client/format.ts'

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
  it('shares the read list with the client write confirmation', () => {
    for (const command of ['GET', 'SINTER', 'ZUNION', 'SORT_RO', 'SET', 'ZUNIONSTORE']) {
      expect(looksLikeRedisWrite(command)).toBe(!isReadOnlyCommand(command))
    }
  })

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

  it('accepts range and metadata reads', () => {
    for (const command of [
      'ZRANGEBYLEX',
      'ZREVRANGEBYLEX',
      'ZREVRANGEBYSCORE',
      'BITFIELD_RO',
      'XPENDING',
      'LOLWUT',
      'LASTSAVE',
      'ROLE',
      'COMMAND',
      'SUBSTR',
      'DUMP',
      'PUBSUB',
    ]) {
      expect(isReadOnlyCommand(command)).toBe(true)
    }
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
      'EVAL_RO',
      'EVALSHA_RO',
      'FCALL_RO',
    ]) {
      expect(isReadOnlyCommand(command)).toBe(true)
    }
    // The STORE variants remain separate write commands.
    expect(isReadOnlyCommand('ZUNIONSTORE')).toBe(false)
    expect(isReadOnlyCommand('ZINTERSTORE')).toBe(false)
  })

  it('treats MEMORY PURGE as a write while other MEMORY subcommands stay reads', () => {
    // MEMORY is a read-only container command, but PURGE releases pages back
    // to the allocator and mutates server state. Both layers must agree.
    expect(isReadOnlyCommand('MEMORY', 'PURGE')).toBe(false)
    expect(isReadOnlyCommand('MEMORY', 'purge')).toBe(false)
    expect(isReadOnlyCommand('MEMORY', 'USAGE')).toBe(true)
    expect(isReadOnlyCommand('MEMORY', 'STATS')).toBe(true)
    // A bare MEMORY (no subcommand) keeps the historical command-only result.
    expect(isReadOnlyCommand('MEMORY')).toBe(true)

    expect(looksLikeRedisWrite('MEMORY PURGE')).toBe(true)
    expect(looksLikeRedisWrite('memory purge')).toBe(true)
    expect(looksLikeRedisWrite('MEMORY USAGE key')).toBe(false)
    expect(looksLikeRedisWrite('MEMORY STATS')).toBe(false)

    // The two layers stay consistent for every invocation, including the
    // mutating subcommand that used to be misclassified as a read.
    for (const command of ['MEMORY PURGE', 'MEMORY USAGE key', 'MEMORY STATS', 'GET foo', 'SET foo bar']) {
      const parts = command.split(/\s+/)
      expect(looksLikeRedisWrite(command)).toBe(!isReadOnlyCommand(parts[0], parts[1]))
    }
  })

  it('classifies quoted commands identically on client and host', () => {
    // The client used a regex that required a leading letter and ignored
    // quotes, so `MEMORY "PURGE"` / `"DEL" k` were seen as reads there but as
    // writes on the host. Both sides now use the same tokenizer.
    for (const command of ['MEMORY "PURGE"', 'memory "purge"', '"DEL" key', '"SET" key value', 'MEMORY \'PURGE\'']) {
      const parts = command.split(/\s+/).map((token) => token.replace(/^["\x27]|["\x27]$/g, ''))
      expect(looksLikeRedisWrite(command)).toBe(!isReadOnlyCommand(parts[0], parts[1]))
    }
    expect(looksLikeRedisWrite('MEMORY "PURGE"')).toBe(true)
    expect(looksLikeRedisWrite('"DEL" key')).toBe(true)
    expect(looksLikeRedisWrite('MEMORY "USAGE" key')).toBe(false)
  })

  it('rejects MEMORY PURGE on a read-only connection before execution', async () => {
    const { config, redis } = manager()
    const id = config.snapshot().connections[0].id
    // allowWrite=false mirrors a read-only action; the guard must reject the
    // mutating subcommand regardless of the connection's own readOnly flag.
    await expect(redis.command(id, 0, 'MEMORY PURGE', false)).rejects.toThrow(/不允许写命令/)
  })
})

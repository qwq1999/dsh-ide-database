import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ConfigStore } from '../../lib/host/config.js'
import { DriverManager } from '../../lib/host/drivers.js'
import { JavaLocator } from '../../lib/host/java.js'
import { RedisManager } from '../../lib/host/redis.js'
import { SecretStore } from '../../lib/host/secrets.js'
import { SqlService } from '../../lib/host/sql.js'
import { createDatabaseTools } from '../../lib/host/tools.js'

const MYSQL_PORT = Number(process.env.DSH_TEST_MYSQL_PORT ?? 0)
const REDIS_PORT = Number(process.env.DSH_TEST_REDIS_PORT ?? 0)
const PASSWORD = process.env.DSH_TEST_MYSQL_PASSWORD ?? 'testpass'

let dir
let config
let secrets
let drivers
let paths
let sql
let redis
let mysqlId
let redisId

describe.skipIf(!MYSQL_PORT)('MySQL JDBC integration', () => {
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'dshdb-it-'))
    const driversDir = join(dir, 'drivers')
    const dataDir = join(dir, 'data')
    paths = {
      root: resolve('.'),
      dataDir,
      configFile: join(dataDir, 'connections.json'),
      secretsFile: join(dataDir, 'secrets.json'),
      driversDir,
      bridgeJar: resolve('bridge/dsh-db-bridge.jar'),
      version: 'test',
    }
    secrets = new SecretStore(paths.secretsFile)
    config = new ConfigStore(paths.configFile, secrets)
    config.load()
    drivers = new DriverManager(paths, config)
    sql = new SqlService(paths, config, secrets, drivers, new JavaLocator())

    const saved = config.saveConnection({
      name: 'Integration MySQL',
      driver: 'mysql',
      host: '127.0.0.1',
      port: MYSQL_PORT,
      user: 'root',
      password: PASSWORD,
      database: 'app',
    })
    mysqlId = saved.id
    const status = await drivers.ensureJars(drivers.resolveDriver('mysql'))
    expect(status.every((jar) => jar.downloaded)).toBe(true)

    if (REDIS_PORT > 0) {
      const savedRedis = config.saveConnection({
        name: 'Integration Redis', driver: 'redis', host: '127.0.0.1', port: REDIS_PORT, database: '',
      })
      redisId = savedRedis.id
      redis = new RedisManager(config, secrets)
    }
  }, 240_000)

  afterAll(async () => {
    await sql?.dispose()
    await redis?.dispose()
    if (dir === undefined) return
    // Windows keeps the JVM's jar handles briefly after dispose; cleanup is best-effort.
    await new Promise((done) => setTimeout(done, 800))
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 })
    } catch {
      // the temp directory is disposable
    }
  })

  it('connects and reports the server version', async () => {
    const server = await sql.connect(mysqlId)
    expect(server.product).toContain('MySQL')
    expect(server.url).toContain(String(MYSQL_PORT))
  }, 120_000)

  it('lists schemas, objects and describes a table', async () => {
    const schemas = await sql.schemas(mysqlId)
    expect(schemas.map((schema) => schema.name)).toContain('app')
    const objects = await sql.objects(mysqlId, 'app')
    expect(objects.some((object) => object.kind === 'table' && object.name === 'users')).toBe(true)
    const description = await sql.describe(mysqlId, 'app', 'users', 'table')
    expect(description.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['id', 'name', 'email', 'age']),
    )
  }, 120_000)

  it('runs a query and maps values', async () => {
    const result = await sql.query(mysqlId, 'SELECT id, name, age FROM users ORDER BY id', { maxRows: 10 })
    expect(result.columns.map((column) => column.name)).toEqual(['id', 'name', 'age'])
    expect(result.rows.length).toBeGreaterThanOrEqual(3)
    expect(result.rows[0][1]).toBe('Alice')
    expect(result.truncated).toBe(false)
  }, 120_000)

  it('rejects writes when the connection is read-only', async () => {
    await expect(
      sql.query(mysqlId, 'CREATE TABLE should_not_exist (id INT)', { allowWrite: false }),
    ).rejects.toThrow()
  }, 120_000)

  it('executes the agent tools against the live connection', async () => {
    const tools = createDatabaseTools({ config, drivers, sql, redis, paths })
    const byName = (name) => {
      const found = tools.find((tool) => tool.name === name)
      if (found === undefined) throw new Error(`missing tool ${name}`)
      return found
    }
    const databases = await byName('db_list_databases').execute({ connection: mysqlId })
    expect(databases.schemas.map((schema) => schema.name)).toContain('app')
    const objects = await byName('db_list_objects').execute({ connection: mysqlId, schema: 'app' })
    expect(objects.objects.some((object) => object.name === 'users')).toBe(true)
    const query = await byName('db_query').execute({
      connection: 'Integration MySQL',
      sql: 'SELECT name FROM users ORDER BY id',
      maxRows: 5,
    })
    expect(query.rows.map((row) => row[0])).toContain('Alice')
  }, 120_000)

  it.skipIf(REDIS_PORT === 0)('connects to Redis and inspects a key', async () => {
    const server = await redis.connect(redisId)
    expect(server.product).toBe('Redis')
    await redis.command(redisId, 'SET dsh:it ok', true)
    const value = await redis.inspect(redisId, 'dsh:it')
    expect(value.value).toBe('ok')
    const scan = await redis.scan(redisId, '0', 'dsh:*', undefined, 50)
    expect(scan.keys.map((key) => key.key)).toContain('dsh:it')
  }, 120_000)
})

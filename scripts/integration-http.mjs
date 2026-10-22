/**
 * End-to-end check against a running scratch DSH web profile and the docker
 * integration services (MySQL 13306 / Redis 16379).
 * Usage: DSH_TEST_TOKEN=... node scripts/integration-http.mjs
 */
const TOKEN = process.env.DSH_TEST_TOKEN
const BASE = process.env.DSH_TEST_BASE ?? 'http://127.0.0.1:16402'
if (!TOKEN) throw new Error('DSH_TEST_TOKEN is required')

const login = await fetch(`${BASE}/?token=${encodeURIComponent(TOKEN)}`, { redirect: 'manual' })
const cookie = login.headers.getSetCookie?.().map((entry) => entry.split(';')[0]).join('; ')
  ?? login.headers.get('set-cookie')?.split(';')[0]
if (!cookie) throw new Error(`no auth cookie (status ${login.status})`)

async function api(path, body) {
  const response = await fetch(`${BASE}/dsh-ide-database/api${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body ?? {}),
  })
  const payload = await response.json()
  if (!payload.ok) throw new Error(`${path} -> ${payload.error?.code}: ${payload.error?.message}`)
  return payload.data
}

const mysqlDraft = {
  name: 'Docker MySQL',
  driver: 'mysql',
  host: '127.0.0.1',
  port: 13306,
  user: 'root',
  password: 'testpass',
  database: 'app',
  redisDb: 0,
  params: {},
  readOnly: false,
}
const redisDraft = {
  name: 'Docker Redis',
  driver: 'redis',
  host: '127.0.0.1',
  port: 16379,
  database: '',
  redisDb: 0,
  params: {},
  readOnly: false,
}

const savedMysql = await api('/connections/save', mysqlDraft)
const mysqlId = savedMysql.connection.id
console.log('saved mysql:', mysqlId, 'hasPassword:', savedMysql.connection.hasPassword)
const savedRedis = await api('/connections/save', redisDraft)
const redisId = savedRedis.connection.id
console.log('saved redis:', redisId)

console.log('downloading mysql driver...')
const driver = await api('/drivers/download', { driverId: 'mysql' })
console.log('driver:', driver.jars?.map((jar) => `${jar.coordinates} ${jar.downloaded ? 'ok' : 'missing'}`).join(', ') ?? driver)

const server = await api('/connections/connect', { id: mysqlId })
console.log('mysql connect:', JSON.stringify(server))

const schemas = await api('/schema/list', { id: mysqlId })
console.log('schemas:', schemas.schemas?.map((schema) => schema.name).join(', '))
const objects = await api('/schema/objects', { id: mysqlId, schema: 'app' })
console.log('objects:', objects.objects?.map((object) => `${object.kind}:${object.name}`).join(', '))
const table = await api('/schema/describe', { id: mysqlId, schema: 'app', table: 'users' })
console.log('describe users:', table.columns?.map((column) => `${column.name}:${column.dataType}`).join(', '))

const query = await api('/query', {
  id: mysqlId,
  sql: 'SELECT id, name, age, created_at FROM users ORDER BY id',
  maxRows: 10,
})
console.log('query:', JSON.stringify({ columns: query.columns.map((c) => c.name), rows: query.rows.length, elapsedMs: query.elapsedMs }))
console.log('first row:', JSON.stringify(query.rows[0]))

const redisServer = await api('/connections/connect', { id: redisId })
console.log('redis connect:', JSON.stringify(redisServer))
await api('/redis/command', { id: redisId, command: 'SET dsh:test hello', allowWrite: true })
const value = await api('/redis/key', { id: redisId, key: 'dsh:test' })
console.log('redis get:', JSON.stringify(value))
const scan = await api('/redis/scan', { id: redisId, pattern: 'dsh:*', count: 50 })
console.log('redis scan:', JSON.stringify(scan))

console.log('INTEGRATION HTTP OK')

/**
 * Seeds demo connections into a running scratch DSH web profile.
 * Usage: DSH_TEST_TOKEN=... node scripts/seed-demo.mjs
 */
const TOKEN = process.env.DSH_TEST_TOKEN
const BASE = process.env.DSH_TEST_BASE ?? 'http://127.0.0.1:16402'
if (!TOKEN) throw new Error('DSH_TEST_TOKEN is required')

const login = await fetch(`${BASE}/?token=${encodeURIComponent(TOKEN)}`, { redirect: 'manual' })
const cookie = login.headers.getSetCookie?.().map((entry) => entry.split(';')[0]).join('; ')
  ?? login.headers.get('set-cookie')?.split(';')[0]
if (!cookie) throw new Error(`no auth cookie (status ${login.status})`)

const demos = [
  {
    name: '本地 MySQL',
    driver: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'app',
    redisDb: 0,
    params: {},
    readOnly: false,
  },
  {
    name: '只读 MySQL',
    driver: 'mysql',
    host: '10.0.0.12',
    port: 3306,
    user: 'report',
    password: '',
    database: 'analytics',
    redisDb: 0,
    params: {},
    readOnly: true,
  },
  {
    name: '本地 Redis',
    driver: 'redis',
    host: '127.0.0.1',
    port: 6379,
    user: '',
    password: '',
    database: '',
    redisDb: 0,
    params: {},
    readOnly: false,
  },
  {
    name: 'Oracle 财务库',
    driver: 'oracle',
    host: '10.0.0.10',
    port: 1521,
    user: 'scott',
    password: '',
    database: 'ORCL',
    redisDb: 0,
    params: {},
    readOnly: true,
  },
  {
    name: '达梦生产',
    driver: 'dameng',
    host: '10.0.0.30',
    port: 5236,
    user: 'SYSDBA',
    password: '',
    database: 'DAMENG',
    redisDb: 0,
    params: {},
    readOnly: false,
  },
  {
    name: 'OceanBase 集群',
    driver: 'oceanbase',
    host: '10.0.0.20',
    port: 2881,
    user: 'root@sys',
    password: '',
    database: 'app',
    redisDb: 0,
    params: {},
    readOnly: false,
  },
]

for (const demo of demos) {
  const response = await fetch(`${BASE}/dsh-ide-database/api/connections/save`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(demo),
  })
  const payload = await response.json()
  console.log(response.status, demo.name, payload.ok ? payload.data.connection.id : JSON.stringify(payload))
}

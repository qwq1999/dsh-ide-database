import { describe, expect, it } from 'vitest'

import { SqlService } from '../../lib/host/sql.js'

function makeService() {
  // buildUrl only touches validateDatabase + string replacement; a bare
  // instance is enough (TS `private` is a normal method at runtime).
  return new SqlService({}, {}, {}, {}, {}, () => {})
}

const sqliteDriver = {
  id: 'sqlite',
  name: 'SQLite',
  preset: 'sqlite',
  dialect: 'sqlite',
  driverClass: 'org.sqlite.JDBC',
  urlTemplate: 'jdbc:sqlite:{{database}}',
  jars: [],
  needsJava: false,
}

const mysqlDriver = {
  id: 'mysql',
  name: 'MySQL',
  preset: 'mysql',
  dialect: 'mysql',
  driverClass: 'com.mysql.cj.jdbc.Driver',
  urlTemplate: 'jdbc:mysql://{{host}}:{{port}}/{{database}}',
  jars: [],
  needsJava: false,
}

function connection(database, driver) {
  return {
    id: 'c1', name: 'C', driver, dialect: driver,
    host: '127.0.0.1', port: driver === 'sqlite' ? 0 : 3306,
    user: '', database, redisDb: 0, params: {}, readOnly: false,
    secretName: '', createdAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('SQLite database path validation', () => {
  it('accepts spaces, ? and # in a SQLite file path', () => {
    const service = makeService()
    const path = 'C:/my data/store#1?.sqlite'
    expect(service.buildUrl(connection(path, 'sqlite'), sqliteDriver)).toBe(`jdbc:sqlite:${path}`)
  })

  it('still rejects spaces / ? / # in a MySQL database name', () => {
    const service = makeService()
    expect(() => service.buildUrl(connection('bad name', 'mysql'), mysqlDriver)).toThrow()
    expect(() => service.buildUrl(connection('bad#name', 'mysql'), mysqlDriver)).toThrow()
    expect(() => service.buildUrl(connection('bad?name', 'mysql'), mysqlDriver)).toThrow()
  })
})

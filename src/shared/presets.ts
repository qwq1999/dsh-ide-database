import type { Dialect, JarRef, PresetId, PresetSpec, SqlDialect } from './types.js'

export const PLUGIN_NAME = 'dsh-ide-database'
export const ROUTE_PREFIX = '/dsh-ide-database/api'
export const DATA_DIR_NAME = 'dsh-ide-database'

/** Driver artifacts are pinned; every jar is fetched from Maven Central (or a mirror) on first use. */
export const PRESETS: Record<PresetId, PresetSpec> = {
  mysql: {
    id: 'mysql',
    dialect: 'mysql',
    defaultPort: 3306,
    driverClass: 'com.mysql.cj.jdbc.Driver',
    urlTemplate: 'jdbc:mysql://{{host}}:{{port}}/{{database}}',
    jar: { group: 'com.mysql', artifact: 'mysql-connector-j', version: '8.4.0' },
    databaseHint: '数据库名（可留空）',
    needsJava: true,
  },
  mariadb: {
    id: 'mariadb',
    dialect: 'mysql',
    defaultPort: 3306,
    driverClass: 'org.mariadb.jdbc.Driver',
    urlTemplate: 'jdbc:mariadb://{{host}}:{{port}}/{{database}}',
    jar: { group: 'org.mariadb.jdbc', artifact: 'mariadb-java-client', version: '3.4.1' },
    databaseHint: '数据库名（可留空）',
    needsJava: true,
  },
  'oceanbase-mysql': {
    id: 'oceanbase-mysql',
    dialect: 'mysql',
    defaultPort: 2881,
    driverClass: 'com.mysql.cj.jdbc.Driver',
    urlTemplate: 'jdbc:mysql://{{host}}:{{port}}/{{database}}',
    jar: { group: 'com.mysql', artifact: 'mysql-connector-j', version: '8.4.0' },
    databaseHint: 'OceanBase MySQL 模式的租户库名（可留空）',
    needsJava: true,
  },
  'oceanbase-oracle': {
    id: 'oceanbase-oracle',
    dialect: 'oceanbase-oracle',
    defaultPort: 2881,
    driverClass: 'com.oceanbase.jdbc.Driver',
    urlTemplate: 'jdbc:oceanbase://{{host}}:{{port}}/{{database}}',
    jar: { group: 'com.oceanbase', artifact: 'oceanbase-client', version: '2.4.19' },
    databaseHint: 'OceanBase Oracle 模式的 Schema/Service（可留空）',
    needsJava: true,
  },
  oracle: {
    id: 'oracle',
    dialect: 'oracle',
    defaultPort: 1521,
    driverClass: 'oracle.jdbc.OracleDriver',
    urlTemplate: 'jdbc:oracle:thin:@//{{host}}:{{port}}/{{database}}',
    jar: { group: 'com.oracle.database.jdbc', artifact: 'ojdbc8', version: '23.26.3.0.0' },
    databaseHint: '服务名（Service Name），例如 ORCLPDB1',
    needsJava: true,
  },
  dameng: {
    id: 'dameng',
    dialect: 'dameng',
    defaultPort: 5236,
    driverClass: 'dm.jdbc.driver.DmDriver',
    urlTemplate: 'jdbc:dm://{{host}}:{{port}}/{{database}}',
    jar: { group: 'com.dameng', artifact: 'DmJdbcDriver18', version: '8.1.3.140' },
    databaseHint: '模式名（Schema，可留空）',
    needsJava: true,
  },
  postgres: {
    id: 'postgres',
    dialect: 'postgres',
    defaultPort: 5432,
    driverClass: 'org.postgresql.Driver',
    urlTemplate: 'jdbc:postgresql://{{host}}:{{port}}/{{database}}',
    jar: { group: 'org.postgresql', artifact: 'postgresql', version: '42.7.4' },
    databaseHint: '数据库名（留空时连当前用户的默认库）',
    needsJava: true,
  },
  sqlite: {
    id: 'sqlite',
    dialect: 'sqlite',
    defaultPort: 0,
    driverClass: 'org.sqlite.JDBC',
    urlTemplate: 'jdbc:sqlite:{{database}}',
    jar: { group: 'org.xerial', artifact: 'sqlite-jdbc', version: '3.46.1.3' },
    databaseHint: '数据库文件路径，例如 D:/data/app.db 或 :memory:',
    hostOptional: true,
    needsJava: true,
  },
  mssql: {
    id: 'mssql',
    dialect: 'mssql',
    defaultPort: 1433,
    driverClass: 'com.microsoft.sqlserver.jdbc.SQLServerDriver',
    urlTemplate: 'jdbc:sqlserver://{{host}}:{{port}};databaseName={{database}};encrypt=true;trustServerCertificate=true',
    // mssql-jdbc 把 JRE 版本写进 artifact 版本号，仓库里不存在 9.4.1 这个目录。
    jar: { group: 'com.microsoft.sqlserver', artifact: 'mssql-jdbc', version: '9.4.1.jre8' },
    databaseHint: '数据库名，例如 master',
    needsJava: true,
  },
  redis: {
    id: 'redis',
    dialect: 'redis',
    defaultPort: 6379,
    databaseHint: 'Redis 逻辑库序号（0-15）',
    needsJava: false,
  },
}

export const PRESET_ORDER: PresetId[] = [
  'mysql',
  'mariadb',
  'oceanbase-mysql',
  'oceanbase-oracle',
  'oracle',
  'dameng',
  'postgres',
  'sqlite',
  'mssql',
  'redis',
]

/** Per-preset display name; dialect labels cannot carry it because mariadb shares 'mysql'. */
export const PRESET_LABEL: Record<PresetId, string> = {
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

export const SQL_DIALECT_LABEL: Record<SqlDialect, string> = {
  mysql: 'MySQL',
  oracle: 'Oracle',
  dameng: '达梦 DM',
  postgres: 'PostgreSQL',
  sqlite: 'SQLite',
  mssql: 'SQL Server',
  'oceanbase-oracle': 'OceanBase (Oracle)',
  generic: '自定义 JDBC',
}

export const DIALECT_LABEL: Record<Dialect, string> = {
  ...SQL_DIALECT_LABEL,
  redis: 'Redis',
}

function jarFileName(jar: JarRef): string {
  const classifier = jar.classifier === undefined ? '' : `-${jar.classifier}`
  return `${jar.artifact}-${jar.version}${classifier}.jar`
}

export function jarCoordinates(jar: JarRef): string {
  const classifier = jar.classifier === undefined ? '' : `:${jar.classifier}`
  return `${jar.group}:${jar.artifact}:${jar.version}${classifier}`
}

export function jarRelativePath(jar: JarRef): string {
  return `${jar.group.replaceAll('.', '/')}/${jar.artifact}/${jar.version}/${jarFileName(jar)}`
}

export function jarCacheName(jar: JarRef): string {
  // Two classifiers of the same group:artifact:version are different jars;
  // without this suffix they share one cache file and a downloaded jre8 is
  // mistaken for a requested jre11 (or vice versa).
  const classifier = jar.classifier === undefined ? '' : `-${jar.classifier}`
  // A group may contain a literal `_` (JAR_PART_PATTERN allows it), so folding
  // `.` to `_` alone is not injective: `com.acme.team` and `com_acme_team`
  // would collapse to one cache file and load each other's bytecode. For
  // groups containing `_`, encode both `.` and `_` unambiguously; `%` is not a
  // legal group character so the encoded form can never collide with the plain
  // form. Groups without `_` keep their familiar name for cache compatibility.
  const group = jar.group.includes('_')
    ? jar.group.replaceAll('_', '%5F').replaceAll('.', '%2E')
    : jar.group.replaceAll('.', '_')
  // artifact and version may also contain a literal `_` (JAR_PART_PATTERN
  // allows it). Without escaping, `a__b`/`c` and `a`/`b__c` both map to
  // `g__a__b__c.jar`, so one coordinate is mistaken for the other and the
  // wrong jar's bytecode is loaded. Percent-encode literal `_` so the `__`
  // separator stays unambiguous; `%` is not legal in a coordinate, and values
  // without `_` keep their familiar cache name for compatibility.
  const artifact = jar.artifact.replaceAll('_', '%5F')
  const version = jar.version.replaceAll('_', '%5F')
  return `${group}__${artifact}__${version}${classifier}.jar`
}

export function mavenBase(mirror: 'central' | 'aliyun'): string {
  return mirror === 'aliyun'
    ? 'https://maven.aliyun.com/repository/central'
    : 'https://repo1.maven.org/maven2'
}

export function presetOf(id: string): PresetSpec | undefined {
  return Object.hasOwn(PRESETS, id) ? PRESETS[id as PresetId] : undefined
}

export function isPresetId(value: string): value is PresetId {
  return Object.hasOwn(PRESETS, value)
}

export function isSqlDialect(value: string): value is SqlDialect {
  // A type guard must actually validate the value. Checking only that it is
  // not 'redis'/'': let any garbage string through, which would be loaded as a
  // dialect by hydrateDriver/upsertDriver and break SQL generation downstream.
  return Object.hasOwn(SQL_DIALECT_LABEL, value)
}

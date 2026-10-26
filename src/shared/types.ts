/**
 * Types shared by the host half and the browser half of the plugin.
 * Everything here must stay JSON-serialisable: the same shapes cross the
 * /dsh-ide-database/api boundary and are stored in the profile data file.
 */

export type Dialect =
  | 'mysql'
  | 'oracle'
  | 'dameng'
  | 'postgres'
  | 'sqlite'
  | 'oceanbase-oracle'
  | 'generic'
  | 'redis'

export type SqlDialect = Exclude<Dialect, 'redis'>

export type PresetId =
  | 'mysql'
  | 'mariadb'
  | 'oceanbase-mysql'
  | 'oceanbase-oracle'
  | 'oracle'
  | 'dameng'
  | 'postgres'
  | 'sqlite'
  | 'redis'

export type DriverChoice = PresetId | 'custom'

export interface JarRef {
  group: string
  artifact: string
  version: string
}

export interface JarStatus extends JarRef {
  /** `com.mysql:mysql-connector-j:8.4.0` */
  coordinates: string
  downloaded: boolean
  file: string
  sizeBytes?: number
}

export interface PresetSpec {
  id: PresetId
  dialect: Dialect
  defaultPort: number
  driverClass?: string
  /** URL template with {{host}} {{port}} {{database}} placeholders. */
  urlTemplate?: string
  jar?: JarRef
  /** Shown in the connection form under the database field. */
  databaseHint: string
  /** File-based engines (SQLite) do not use host or port. */
  hostOptional?: boolean
  needsJava: boolean
}

export interface DriverConfig {
  id: string
  name: string
  dialect: SqlDialect
  driverClass: string
  urlTemplate: string
  jars: JarRef[]
  createdAt: string
}

export interface CustomDriverStatus {
  id: string
  name: string
  dialect: SqlDialect
  driverClass: string
  urlTemplate: string
  jars: JarStatus[]
  allJarsPresent: boolean
}

export interface DriverStatus {
  id: string
  name: string
  preset: PresetId | null
  dialect: Dialect
  driverClass?: string
  urlTemplate?: string
  jars: JarStatus[]
  needsJava: boolean
  allJarsPresent: boolean
}

export interface DbSettings {
  /** Hard cap for rows returned by the panel and the agent tools. */
  maxRows: number
  queryTimeoutSec: number
  connectTimeoutSec: number
  /** Explicit java executable; empty = JAVA_HOME / PATH discovery. */
  javaPath: string
  mavenMirror: 'central' | 'aliyun'
  /** Agent tools may run INSERT/UPDATE/DELETE/DDL on non-read-only connections. */
  allowAgentWrites: boolean
  redisScanCount: number
  /** Confirm destructive actions in the panel. */
  confirmDestructive: boolean
}

export interface ConnectionConfig {
  id: string
  name: string
  driver: DriverChoice
  customDriverId?: string
  dialect: Dialect
  host: string
  port: number
  user: string
  /** Name of the layered secret (env-style); never the password itself. */
  secretName?: string
  hasPassword: boolean
  /** SQL: database/schema/service name. Redis: unused. */
  database: string
  /** Redis logical database index. */
  redisDb: number
  params: Record<string, string>
  readOnly: boolean
  createdAt: string
  lastUsedAt?: string
}

export interface ClientConnection {
  id: string
  name: string
  driver: DriverChoice
  customDriverId?: string
  dialect: Dialect
  host: string
  port: number
  user: string
  hasPassword: boolean
  database: string
  redisDb: number
  params: Record<string, string>
  readOnly: boolean
  createdAt: string
  lastUsedAt?: string
}

export interface ConnectionDraft {
  id?: string
  name: string
  driver: DriverChoice
  customDriverId?: string
  host: string
  port: number
  user: string
  password?: string
  clearPassword?: boolean
  database: string
  redisDb: number
  params: Record<string, string>
  readOnly: boolean
}

export interface DbConfigFile {
  version: 1
  connections: ConnectionConfig[]
  drivers: DriverConfig[]
  settings: DbSettings
}

export interface ClientConfig {
  connections: ClientConnection[]
  drivers: DriverConfig[]
  settings: DbSettings
}

export interface JavaCandidate {
  path: string
  version: string
  major: number
  source: Exclude<JavaStatus['source'], 'missing'>
}

export interface JavaStatus {
  available: boolean
  path?: string
  version?: string
  major?: number
  source: 'setting' | 'bundled' | 'JAVA_HOME' | 'PATH' | 'jdks' | 'missing'
  message?: string
  /** Every runtime discovery found, newest major first, for the settings picker. */
  candidates?: JavaCandidate[]
}

export interface EnvStatus {
  java: JavaStatus
  dataDir: string
  configPath: string
  bridgeJar: string
  bridgeBuilt: boolean
  pluginVersion: string
  platform: string
}

export interface ConfigSnapshot {
  config: ClientConfig
  drivers: DriverStatus[]
  env: EnvStatus
}

export interface ApiErrorBody {
  code: string
  message: string
  detail?: string
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody }

export interface ColumnInfo {
  name: string
  typeName: string
  jdbcType?: number
  nullable?: boolean
}

export type CellValue = string | number | boolean | null
export type Row = CellValue[]

export interface QueryResult {
  columns: ColumnInfo[]
  rows: Row[]
  rowCount: number
  truncated: boolean
  updateCount?: number
  elapsedMs: number
  warnings: string[]
  sql: string
  /** Client-chosen id usable with POST /query/cancel while the query runs. */
  stmtKey?: string
}

export interface SchemaInfo {
  name: string
  system?: boolean
}

export type ObjectKind =
  | 'table'
  | 'view'
  | 'procedure'
  | 'function'
  | 'sequence'
  | 'trigger'
  | 'other'

export interface SchemaObject {
  name: string
  kind: ObjectKind
  comment?: string
}

/**
 * Structure snapshot kept on disk: written after every successful live read and
 * served when the data source is not connected (JetBrains Database behaviour).
 */
export interface CachedStructure {
  fetchedAt: string
  schemas: SchemaInfo[]
  objects: Record<string, SchemaObject[]>
  /** `schema.table` → described columns and indexes, kept for offline browsing. */
  descriptions: Record<string, TableDescription>
  /** Redis key-space cache, per logical database. */
  redis?: RedisStructureCache
}

export interface RedisDbCache {
  /** Keys last seen by SCAN, in scan order. */
  keys: RedisKeyInfo[]
  /** Cursor to continue paging from, `0` when the scan finished. */
  cursor: string
  fetchedAt: string
}

export interface RedisStructureCache {
  /** Number of logical databases (`CONFIG GET databases`). */
  databases: number
  dbs: Record<string, RedisDbCache>
}

export interface RedisDatabasesResult {
  databases: number
  /** The database the connection opens by default. */
  redisDb: number
  cached?: boolean
  error?: string
}

export interface StructureSnapshot {
  [connectionId: string]: CachedStructure
}

export interface DescribeResult extends TableDescription {
  cached?: boolean
  fetchedAt?: string
}

/**
 * DDL for a table or view: the server's own definition when the dialect can
 * return it, otherwise a reconstruction from the described columns/indexes.
 */
/** Result of an execution-plan (EXPLAIN) request. */
export interface ExplainResult {
  dialect: SqlDialect
  statements: string[]
  plan?: QueryResult
  warnings: string[]
}

export interface DdlResult {
  schema: string
  table: string
  kind: ObjectKind
  ddl: string
  source: 'server' | 'generated'
  warnings: string[]
}

export interface SchemaListResult {
  schemas: SchemaInfo[]
  cached?: boolean
  fetchedAt?: string
  error?: string
}

export interface ObjectListResult {
  objects: SchemaObject[]
  cached?: boolean
  fetchedAt?: string
  error?: string
}

export interface ColumnDetail extends ColumnInfo {
  defaultValue?: string
  comment?: string
  ordinal?: number
  primaryKey?: boolean
}

export interface IndexInfo {
  name: string
  columns: string[]
  unique?: boolean
  primary?: boolean
}

export interface TableDescription {
  schema: string
  table: string
  kind: ObjectKind
  columns: ColumnDetail[]
  indexes: IndexInfo[]
  /**
   * Inline DDL for objects without a column structure (routines, sequences,
   * triggers), fetched on demand so the detail panel can show its definition.
   */
  ddl?: string
  ddlSource?: 'server' | 'generated'
  ddlWarnings?: string[]
}

export interface ServerInfo {
  product: string
  version: string
  user?: string
  database?: string
  url?: string
}

export interface ConnectionTestResult {
  ok: boolean
  server?: ServerInfo
  latencyMs: number
  message?: string
}

export interface RedisKeyInfo {
  key: string
  type: string
  ttl: number
  size?: number
}

export interface RedisScanResult {
  cursor: string
  done: boolean
  keys: RedisKeyInfo[]
  scanned: number
}

export interface RedisValue {
  key: string
  type: string
  ttl: number
  size?: number
  value: JsonValue
  truncated: boolean
  preview: string
}

export interface RedisCommandResult {
  command: string
  value: JsonValue
  elapsedMs: number
  readOnly: boolean
}

export type JsonValue = JsonScalar | JsonValue[] | { [key: string]: JsonValue }
export type JsonScalar = string | number | boolean | null

export interface ToolOk<T> {
  ok: true
  data: T
}

export interface ToolFail {
  ok: false
  error: { code: string; message: string }
}

export type ToolResult<T> = ToolOk<T> | ToolFail

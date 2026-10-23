import { ROUTE_PREFIX } from '../shared/presets.js'
import type {
  ClientConnection,
  ClientConfig,
  ConfigSnapshot,
  ConnectionDraft,
  ConnectionTestResult,
  DbSettings,
  DdlResult,
  DescribeResult,
  DriverConfig,
  DriverStatus,
  EnvStatus,
  ExplainResult,
  ObjectListResult,
  QueryResult,
  RedisCommandResult,
  RedisDatabasesResult,
  RedisScanResult,
  RedisValue,
  SchemaListResult,
  ServerInfo,
  StructureSnapshot,
} from '../shared/types.js'

export class ApiError extends Error {
  readonly code: string
  readonly detail?: string

  constructor(code: string, message: string, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.detail = detail
  }
}

interface Envelope<T> {
  ok: boolean
  data?: T
  error?: { code?: string; message?: string; detail?: string }
}

async function post<T>(path: string, body: unknown = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${ROUTE_PREFIX}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch (error) {
    throw new ApiError('network', error instanceof Error ? error.message : String(error))
  }
  let envelope: Envelope<T>
  try {
    envelope = (await response.json()) as Envelope<T>
  } catch {
    throw new ApiError('bad-response', `接口返回了无法解析的响应（HTTP ${String(response.status)}）`)
  }
  if (envelope.ok !== true) {
    throw new ApiError(envelope.error?.code ?? 'error', envelope.error?.message ?? '请求失败', envelope.error?.detail)
  }
  return envelope.data as T
}

export interface StatusSnapshot {
  config: ClientConfig
  drivers: DriverStatus[]
  env: EnvStatus
}

export const api = {
  status: () => post<StatusSnapshot>('/status'),
  env: () => post<EnvStatus>('/env'),
  health: () => post<Record<string, unknown>>('/health'),

  saveConnection: (draft: ConnectionDraft) =>
    post<{ connection: ClientConnection; config: ClientConfig }>('/connections/save', { ...draft }),
  deleteConnection: (id: string) => post<{ config: ClientConfig }>('/connections/delete', { id }),
  testConnection: (draft: ConnectionDraft) => post<ConnectionTestResult>('/connections/test', { draft }),
  connect: (id: string) => post<ServerInfo>('/connections/connect', { id }),
  disconnect: (id: string) => post<{ disconnected: string }>('/connections/disconnect', { id }),

  structure: () => post<{ structures: StructureSnapshot }>('/structure'),
  schemas: (id: string, filter = '') => post<SchemaListResult>('/schema/list', { id, filter }),
  objects: (id: string, schema: string) => post<ObjectListResult>('/schema/objects', { id, schema }),
  describe: (id: string, schema: string, table: string, kind: string) =>
    post<DescribeResult>('/schema/describe', { id, schema, table, kind }),
  ddl: (id: string, schema: string, table: string, kind: string) =>
    post<DdlResult>('/schema/ddl', { id, schema, table, kind }),
  explain: (id: string, sql: string, schema?: string) => post<ExplainResult>('/explain', { id, sql, schema }),

  query: (options: {
    id: string
    sql: string
    schema?: string
    maxRows?: number
    timeoutSec?: number
    stmtKey?: string
    allowWrite?: boolean
  }) => post<QueryResult>('/query', options),
  cancel: (stmtKey: string) => post<{ cancelled: boolean }>('/query/cancel', { stmtKey }),

  redisScan: (options: { id: string; db?: number; cursor?: string; pattern?: string; type?: string; count?: number }) =>
    post<RedisScanResult>('/redis/scan', options),
  redisKey: (id: string, key: string, db?: number) =>
    post<RedisValue>('/redis/key', { id, key, ...(db === undefined ? {} : { db }) }),
  redisDatabases: (id: string) => post<RedisDatabasesResult>('/redis/databases', { id }),
  redisCommand: (id: string, command: string, allowWrite: boolean, db?: number) =>
    post<RedisCommandResult>('/redis/command', { id, command, allowWrite, ...(db === undefined ? {} : { db }) }),

  downloadDriver: (driverId: string) => post<DriverStatus>('/drivers/download', { driverId }),
  saveCustomDriver: (driver: Partial<DriverConfig> & { jars?: unknown }) =>
    post<{ driver: DriverConfig; drivers: DriverStatus[] }>('/drivers/custom/save', { driver }),
  deleteCustomDriver: (id: string) => post<{ drivers: DriverStatus[] }>('/drivers/custom/delete', { id }),

  updateSettings: (settings: Partial<DbSettings>) =>
    post<{ settings: DbSettings; env: EnvStatus }>('/settings/update', { settings }),
}

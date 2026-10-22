/**
 * Error vocabulary shared by the HTTP surface and the agent tools.
 * Every failure the plugin can produce is a `DbError` with a stable code so the
 * panel and the tools can react without parsing English text.
 */

export type DbErrorCode =
  | 'invalid'
  | 'not-found'
  | 'conflict'
  | 'not-connected'
  | 'unsupported'
  | 'read-only'
  | 'timeout'
  | 'cancelled'
  | 'java-missing'
  | 'driver-missing'
  | 'jar-missing'
  | 'download-failed'
  | 'connect-failed'
  | 'query-failed'
  | 'bridge'
  | 'redis'
  | 'busy'

const STATUS: Record<DbErrorCode, number> = {
  invalid: 400,
  'not-found': 404,
  conflict: 409,
  'not-connected': 409,
  unsupported: 400,
  'read-only': 403,
  timeout: 408,
  cancelled: 408,
  'java-missing': 503,
  'driver-missing': 422,
  'jar-missing': 409,
  'download-failed': 502,
  'connect-failed': 422,
  'query-failed': 422,
  bridge: 502,
  redis: 422,
  busy: 409,
}

export class DbError extends Error {
  readonly code: DbErrorCode
  readonly status: number
  readonly detail?: string

  constructor(code: DbErrorCode, message: string, detail?: string) {
    super(message)
    this.name = 'DbError'
    this.code = code
    this.status = STATUS[code] ?? 400
    this.detail = detail
  }
}

export interface WireError {
  code: string
  message: string
  detail?: string
}

export function toWireError(error: unknown): { status: number; body: WireError } {
  if (error instanceof DbError) {
    return { status: error.status, body: { code: error.code, message: error.message, ...(error.detail === undefined ? {} : { detail: error.detail }) } }
  }
  const message = error instanceof Error ? error.message : String(error)
  return { status: 500, body: { code: 'internal', message } }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

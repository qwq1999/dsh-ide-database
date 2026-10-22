/**
 * Error vocabulary shared by the HTTP surface and the agent tools.
 * Every failure the plugin can produce is a `DbError` with a stable code so the
 * panel and the tools can react without parsing English text.
 */
const STATUS = {
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
};
export class DbError extends Error {
    code;
    status;
    detail;
    constructor(code, message, detail) {
        super(message);
        this.name = 'DbError';
        this.code = code;
        this.status = STATUS[code] ?? 400;
        this.detail = detail;
    }
}
export function toWireError(error) {
    if (error instanceof DbError) {
        return { status: error.status, body: { code: error.code, message: error.message, ...(error.detail === undefined ? {} : { detail: error.detail }) } };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { status: 500, body: { code: 'internal', message } };
}
export function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=errors.js.map
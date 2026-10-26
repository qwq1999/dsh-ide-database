import { PLUGIN_NAME, ROUTE_PREFIX } from '../shared/presets.js';
import { DbError, toWireError } from './errors.js';
import { optionalService } from './services.js';
import { encodeJsonPayload } from './wire.js';
const BODY_LIMIT = 4 * 1024 * 1024;
function sendJson(response, status, body) {
    sendJsonText(response, status, JSON.stringify(body));
}
/** Send a body that is already JSON (no second serialization of the payload). */
function sendJsonText(response, status, payload) {
    const { body, gzip } = encodeJsonPayload(payload, response.req?.headers['accept-encoding']);
    response.statusCode = status;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.setHeader('cache-control', 'no-store');
    response.setHeader('content-length', String(body.length));
    if (gzip) {
        response.setHeader('content-encoding', 'gzip');
        response.setHeader('vary', 'accept-encoding');
    }
    response.end(body);
}
function fail(response, error) {
    const { status, body } = toWireError(error);
    sendJson(response, status, { ok: false, error: body });
}
async function readJson(request) {
    let size = 0;
    const chunks = [];
    for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
        size += buffer.length;
        if (size > BODY_LIMIT)
            throw new DbError('invalid', '请求体过大');
        chunks.push(buffer);
    }
    if (chunks.length === 0)
        return {};
    const text = Buffer.concat(chunks).toString('utf8').trim();
    if (text === '')
        return {};
    try {
        const parsed = JSON.parse(text);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
            throw new Error('not an object');
        return parsed;
    }
    catch {
        throw new DbError('invalid', '请求体必须是 JSON 对象');
    }
}
/**
 * DSH owns the admission policy for loopback Web requests. When the
 * `connection` service is present it is authoritative; otherwise the plugin
 * applies the same browser-origin sanity check locally (and trusts the
 * desktop host's loopback binding).
 */
function rejectionOf(deps, request) {
    const connection = optionalService(deps.ctx, 'connection');
    if (connection?.requestRejection !== undefined) {
        try {
            const rejection = connection.requestRejection(request);
            if (rejection !== undefined)
                return rejection;
            return undefined;
        }
        catch {
            // fall through to the local check
        }
    }
    const headers = request.headers;
    const origin = headers.origin;
    const host = headers.host;
    if (typeof origin === 'string' && typeof host === 'string') {
        try {
            if (new URL(origin).host !== host)
                return 403;
        }
        catch {
            return 403;
        }
    }
    const site = headers['sec-fetch-site'];
    if (typeof site === 'string' && site !== 'same-origin' && site !== 'none')
        return 403;
    return undefined;
}
function sqlConnection(deps, id) {
    const connection = deps.config.connection(id);
    if (connection === undefined)
        throw new DbError('not-found', `连接不存在：${id}`);
    return connection;
}
/**
 * Live read first; when the data source is not connected (or the read fails) fall
 * back to the cached structure so the tree stays browsable. Successful reads
 * replace the cache, which is what "connect once, browse later" means in IDEA.
 */
async function readSchemas(deps, id, filter) {
    try {
        const schemas = await deps.sql.schemas(id, filter);
        // Only a full read may replace the cache; a filtered read would drop schemas.
        if (filter.trim() === '')
            deps.structure.putSchemas(id, schemas);
        return { schemas, cached: false, fetchedAt: new Date().toISOString() };
    }
    catch (error) {
        const cached = deps.structure.get(id);
        if (cached === undefined)
            throw error;
        const needle = filter.trim().toLowerCase();
        const schemas = needle === ''
            ? cached.schemas
            : cached.schemas.filter((entry) => entry.name.toLowerCase().includes(needle));
        return { schemas, cached: true, fetchedAt: cached.fetchedAt, error: errorText(error) };
    }
}
async function readDescription(deps, id, schema, table, kind) {
    try {
        const description = await deps.sql.describe(id, schema, table, kind);
        if (kind === 'table' || kind === 'view') {
            deps.structure.putDescription(id, schema, table, description);
        }
        return { ...description, cached: false, fetchedAt: new Date().toISOString() };
    }
    catch (error) {
        const description = deps.structure.getDescription(id, schema, table);
        if (description === undefined)
            throw error;
        return { ...description, cached: true, fetchedAt: deps.structure.fetchedAt(id) };
    }
}
async function readObjects(deps, id, schema) {
    try {
        const objects = await deps.sql.objects(id, schema);
        deps.structure.putObjects(id, schema, objects);
        return { objects, cached: false, fetchedAt: new Date().toISOString() };
    }
    catch (error) {
        const cached = deps.structure.get(id);
        const objects = cached?.objects[schema];
        if (cached === undefined || objects === undefined)
            throw error;
        return { objects, cached: true, fetchedAt: cached.fetchedAt, error: errorText(error) };
    }
}
function errorText(error) {
    return error instanceof Error ? error.message : String(error);
}
function envStatus(deps) {
    const settings = deps.config.settings();
    const java = deps.java.locate(settings.javaPath);
    return {
        java,
        dataDir: deps.paths.dataDir,
        configPath: deps.paths.configFile,
        bridgeJar: deps.paths.bridgeJar,
        bridgeBuilt: deps.java.bridgeReady(deps.paths.bridgeJar),
        pluginVersion: deps.paths.version,
        platform: `${process.platform}-${process.arch}`,
    };
}
async function handle(deps, request, response, path) {
    const data = await readJson(request);
    switch (path) {
        case '/status': {
            const snapshot = {
                ok: true,
                data: {
                    config: deps.config.snapshot(),
                    drivers: deps.drivers.statuses(),
                    env: envStatus(deps),
                },
            };
            sendJson(response, 200, snapshot);
            return;
        }
        case '/env': {
            sendJson(response, 200, { ok: true, data: envStatus(deps) });
            return;
        }
        case '/connections/save': {
            const previous = typeof data.id === 'string' ? deps.config.connection(data.id) : undefined;
            const saved = deps.config.saveConnection(data);
            // Editing credentials or the target must not keep running on the old
            // session/cached structure: close it so the next use reconnects with the
            // new settings. Renaming alone keeps the cache (offline browsing works).
            if (previous !== undefined) {
                const credentialsChanged = (typeof data.password === 'string' && data.password !== '') || data.clearPassword === true;
                const targetChanged = previous.driver !== saved.driver ||
                    previous.customDriverId !== saved.customDriverId ||
                    previous.host !== saved.host ||
                    previous.port !== saved.port ||
                    previous.user !== saved.user ||
                    previous.database !== saved.database ||
                    previous.redisDb !== saved.redisDb ||
                    previous.readOnly !== saved.readOnly ||
                    JSON.stringify(previous.params) !== JSON.stringify(saved.params);
                if (credentialsChanged || targetChanged) {
                    await deps.sql.disconnect(saved.id);
                    await deps.redis.disconnect(saved.id);
                    deps.structure.clear(saved.id);
                }
            }
            const client = deps.config.snapshot().connections.find((entry) => entry.id === saved.id);
            sendJson(response, 200, { ok: true, data: { connection: client, config: deps.config.snapshot() } });
            return;
        }
        case '/connections/delete': {
            const id = typeof data.id === 'string' ? data.id : '';
            await deps.sql.disconnect(id);
            await deps.redis.disconnect(id);
            deps.config.deleteConnection(id);
            deps.structure.clear(id);
            sendJson(response, 200, { ok: true, data: { config: deps.config.snapshot() } });
            return;
        }
        case '/connections/test': {
            const draft = data.draft;
            if (typeof draft !== 'object' || draft === null)
                throw new DbError('invalid', '缺少连接草稿');
            const result = await deps.sql.test(draft);
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/connections/connect': {
            const id = typeof data.id === 'string' ? data.id : '';
            const connection = sqlConnection(deps, id);
            const server = connection.dialect === 'redis' ? await deps.redis.connect(id) : await deps.sql.connect(id);
            sendJson(response, 200, { ok: true, data: server });
            return;
        }
        case '/connections/disconnect': {
            const id = typeof data.id === 'string' ? data.id : '';
            await deps.sql.disconnect(id);
            await deps.redis.disconnect(id);
            sendJson(response, 200, { ok: true, data: { disconnected: id } });
            return;
        }
        case '/structure': {
            sendJsonText(response, 200, `{"ok":true,"data":{"structures":${deps.structure.snapshotJson()}}}`);
            return;
        }
        case '/schema/list': {
            const id = typeof data.id === 'string' ? data.id : '';
            const filter = typeof data.filter === 'string' ? data.filter : '';
            const result = await readSchemas(deps, id, filter);
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/schema/objects': {
            const id = typeof data.id === 'string' ? data.id : '';
            const schema = typeof data.schema === 'string' ? data.schema : '';
            if (schema === '')
                throw new DbError('invalid', '必须选择 Schema');
            const result = await readObjects(deps, id, schema);
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/schema/describe': {
            const id = typeof data.id === 'string' ? data.id : '';
            const schema = typeof data.schema === 'string' ? data.schema : '';
            const table = typeof data.table === 'string' ? data.table : '';
            if (schema === '' || table === '')
                throw new DbError('invalid', '必须提供 schema 与表名');
            const kind = typeof data.kind === 'string' ? data.kind : 'table';
            const result = await readDescription(deps, id, schema, table, kind);
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/schema/ddl': {
            const id = typeof data.id === 'string' ? data.id : '';
            const schema = typeof data.schema === 'string' ? data.schema : '';
            const table = typeof data.table === 'string' ? data.table : '';
            if (schema === '' || table === '')
                throw new DbError('invalid', '必须提供 schema 与表名');
            const kind = typeof data.kind === 'string' ? data.kind : 'table';
            const connection = sqlConnection(deps, id);
            if (connection.dialect === 'redis')
                throw new DbError('unsupported', 'Redis 连接没有 DDL');
            const result = await deps.sql.ddl(id, connection.dialect, schema, table, kind);
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/explain': {
            const id = typeof data.id === 'string' ? data.id : '';
            const statement = typeof data.sql === 'string' ? data.sql : '';
            if (statement.trim() === '')
                throw new DbError('invalid', 'SQL 不能为空');
            const schema = typeof data.schema === 'string' ? data.schema : '';
            sqlConnection(deps, id);
            const result = await deps.sql.explain(id, statement, {
                maxRows: 500,
                ...(schema === '' ? {} : { schema }),
            });
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/query': {
            const id = typeof data.id === 'string' ? data.id : '';
            const sql = typeof data.sql === 'string' ? data.sql : '';
            const connection = sqlConnection(deps, id);
            const allowWrite = data.allowWrite === true && !connection.readOnly;
            const result = await deps.sql.query(id, sql, {
                ...(typeof data.maxRows === 'number' ? { maxRows: data.maxRows } : {}),
                ...(typeof data.timeoutSec === 'number' ? { timeoutSec: data.timeoutSec } : {}),
                ...(typeof data.schema === 'string' ? { schema: data.schema } : {}),
                ...(typeof data.stmtKey === 'string' ? { stmtKey: data.stmtKey } : {}),
                allowWrite,
            });
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/tx': {
            const id = typeof data.id === 'string' ? data.id : '';
            const action = data.action;
            if (action !== 'start' && action !== 'commit' && action !== 'rollback') {
                throw new DbError('invalid', 'action 必须是 start、commit 或 rollback');
            }
            await deps.sql.transaction(id, action);
            sendJson(response, 200, { ok: true, data: { ok: true } });
            return;
        }
        case '/query/cancel': {
            const stmtKey = typeof data.stmtKey === 'string' ? data.stmtKey : '';
            const cancelled = await deps.sql.cancel(stmtKey);
            sendJson(response, 200, { ok: true, data: { cancelled } });
            return;
        }
        case '/redis/scan': {
            const id = typeof data.id === 'string' ? data.id : '';
            const connection = sqlConnection(deps, id);
            if (connection.dialect !== 'redis')
                throw new DbError('unsupported', '该连接不是 Redis 连接');
            const db = typeof data.db === 'number' && Number.isFinite(data.db) ? Math.trunc(data.db) : connection.redisDb;
            const cursor = typeof data.cursor === 'string' ? data.cursor : '0';
            const result = await deps.redis.scan(id, db, cursor, typeof data.pattern === 'string' && data.pattern.trim() !== '' ? data.pattern.trim() : '*', typeof data.type === 'string' ? data.type : undefined, typeof data.count === 'number' ? data.count : deps.config.settings().redisScanCount);
            // Offline browsing mirrors the SQL structure cache: the key list is kept,
            // replacing it whenever a new scan starts from cursor 0. `putRedisKeys`
            // creates the Redis entry (database count defaulting to 16) on its own, so
            // paging no longer re-stamps the count and rewrites the cache file.
            deps.structure.putRedisKeys(id, db, result.keys, result.cursor, cursor === '0');
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/redis/databases': {
            const id = typeof data.id === 'string' ? data.id : '';
            const connection = sqlConnection(deps, id);
            if (connection.dialect !== 'redis')
                throw new DbError('unsupported', '该连接不是 Redis 连接');
            try {
                const databases = await deps.redis.databases(id);
                deps.structure.putRedisDatabases(id, databases);
                sendJson(response, 200, {
                    ok: true,
                    data: { databases, redisDb: connection.redisDb, cached: false },
                });
            }
            catch (error) {
                const cached = deps.structure.redisDatabases(id);
                if (cached === undefined)
                    throw error;
                sendJson(response, 200, {
                    ok: true,
                    data: { databases: cached, redisDb: connection.redisDb, cached: true, error: errorText(error) },
                });
            }
            return;
        }
        case '/redis/key': {
            const id = typeof data.id === 'string' ? data.id : '';
            const connection = sqlConnection(deps, id);
            if (connection.dialect !== 'redis')
                throw new DbError('unsupported', '该连接不是 Redis 连接');
            const db = typeof data.db === 'number' && Number.isFinite(data.db) ? Math.trunc(data.db) : connection.redisDb;
            const key = typeof data.key === 'string' ? data.key : '';
            if (key === '')
                throw new DbError('invalid', '必须提供 key');
            const result = await deps.redis.inspect(id, db, key);
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/redis/command': {
            const id = typeof data.id === 'string' ? data.id : '';
            const command = typeof data.command === 'string' ? data.command : '';
            const connection = sqlConnection(deps, id);
            if (connection.dialect !== 'redis')
                throw new DbError('unsupported', '该连接不是 Redis 连接');
            const db = typeof data.db === 'number' && Number.isFinite(data.db) ? Math.trunc(data.db) : connection.redisDb;
            const allowWrite = data.allowWrite === true && !connection.readOnly;
            const result = await deps.redis.command(id, db, command, allowWrite);
            sendJson(response, 200, { ok: true, data: result });
            return;
        }
        case '/drivers/download': {
            const driverId = typeof data.driverId === 'string' ? data.driverId : '';
            if (driverId === '')
                throw new DbError('invalid', '缺少 driverId');
            const status = await ensureDriver(deps, driverId);
            sendJson(response, 200, { ok: true, data: status });
            return;
        }
        case '/drivers/custom/save': {
            const driver = deps.config.upsertDriver(data.driver);
            sendJson(response, 200, { ok: true, data: { driver, drivers: deps.drivers.statuses() } });
            return;
        }
        case '/drivers/custom/delete': {
            const id = typeof data.id === 'string' ? data.id : '';
            deps.config.deleteDriver(id);
            sendJson(response, 200, { ok: true, data: { drivers: deps.drivers.statuses() } });
            return;
        }
        case '/settings/update': {
            const before = deps.config.settings().javaPath;
            const settings = deps.config.updateSettings(data.settings);
            if (settings.javaPath !== before)
                deps.java.invalidate();
            sendJson(response, 200, { ok: true, data: { settings, env: envStatus(deps) } });
            return;
        }
        case '/health': {
            const java = deps.java.locate(deps.config.settings().javaPath);
            let bridgePing = null;
            if (java.available && deps.java.bridgeReady(deps.paths.bridgeJar)) {
                bridgePing = await deps.sql.ping().catch((error) => ({ error: toWireError(error).body }));
            }
            sendJson(response, 200, {
                ok: true,
                data: {
                    plugin: PLUGIN_NAME,
                    version: deps.paths.version,
                    java,
                    bridgePing,
                    connected: deps.sql.connectedIds(),
                },
            });
            return;
        }
        default:
            throw new DbError('not-found', `未知的接口：${path}`);
    }
}
async function ensureDriver(deps, driverId) {
    const presets = deps.drivers.statuses().filter((status) => status.preset !== null);
    const status = deps.drivers.statuses().find((entry) => entry.id === driverId);
    if (status === undefined)
        throw new DbError('not-found', `驱动不存在：${driverId}`);
    if (!status.needsJava)
        return status;
    const resolved = status.preset !== null && presets.some((entry) => entry.id === status.id)
        ? deps.drivers.resolvePreset(status.preset)
        : deps.drivers.resolveCustom(status.id);
    await deps.drivers.ensureJars(resolved);
    return deps.drivers.statuses().find((entry) => entry.id === driverId) ?? status;
}
export function createRouteHandler(deps) {
    return async (request, response) => {
        try {
            const rejection = rejectionOf(deps, request);
            if (rejection !== undefined) {
                sendJson(response, rejection, { ok: false, error: { code: 'forbidden', message: '请求被拒绝' } });
                return;
            }
            if (request.method !== 'POST') {
                response.setHeader('allow', 'POST');
                sendJson(response, 405, { ok: false, error: { code: 'method-not-allowed', message: '只接受 POST 请求' } });
                return;
            }
            const url = new URL(String(request.url), 'http://localhost');
            if (!url.pathname.startsWith(ROUTE_PREFIX)) {
                sendJson(response, 404, { ok: false, error: { code: 'not-found', message: '未知接口' } });
                return;
            }
            const path = url.pathname.slice(ROUTE_PREFIX.length) || '/';
            await handle(deps, request, response, path);
        }
        catch (error) {
            if (error instanceof DbError && error.code === 'not-found' && !response.headersSent) {
                fail(response, error);
                return;
            }
            if (!response.headersSent)
                fail(response, error);
            else
                deps.log(`route error after headers sent: ${String(error)}`);
        }
    };
}
//# sourceMappingURL=routes.js.map
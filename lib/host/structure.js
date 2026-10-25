import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
/** Keep the offline key cache bounded; a huge keyspace stops caching past this. */
const MAX_CACHED_KEYS = 2000;
function normalizeKind(value) {
    switch (value) {
        case 'table':
        case 'view':
        case 'procedure':
        case 'function':
        case 'sequence':
        case 'trigger':
        case 'other':
            return value;
        default:
            return 'other';
    }
}
function normalizeSchemas(value) {
    if (!Array.isArray(value))
        return [];
    const out = [];
    for (const entry of value) {
        if (entry === null || typeof entry !== 'object')
            continue;
        const record = entry;
        const name = typeof record.name === 'string' ? record.name : '';
        if (name === '')
            continue;
        out.push({ name, system: record.system === true ? true : undefined });
    }
    return out;
}
function normalizeObjects(value) {
    const out = {};
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        return out;
    for (const [schema, list] of Object.entries(value)) {
        if (!Array.isArray(list))
            continue;
        const objects = [];
        for (const entry of list) {
            if (entry === null || typeof entry !== 'object')
                continue;
            const record = entry;
            const name = typeof record.name === 'string' ? record.name : '';
            if (name === '')
                continue;
            objects.push({
                name,
                kind: normalizeKind(record.kind),
                comment: typeof record.comment === 'string' && record.comment !== '' ? record.comment : undefined,
            });
        }
        out[schema] = objects;
    }
    return out;
}
function normalizeColumns(value) {
    if (!Array.isArray(value))
        return [];
    const out = [];
    for (const entry of value) {
        if (entry === null || typeof entry !== 'object')
            continue;
        const record = entry;
        const name = typeof record.name === 'string' ? record.name : '';
        if (name === '')
            continue;
        out.push({
            name,
            typeName: typeof record.typeName === 'string' ? record.typeName : '',
            nullable: record.nullable !== false,
            defaultValue: typeof record.defaultValue === 'string' ? record.defaultValue : undefined,
            comment: typeof record.comment === 'string' && record.comment !== '' ? record.comment : undefined,
            primaryKey: record.primaryKey === true ? true : undefined,
        });
    }
    return out;
}
function normalizeIndexes(value) {
    if (!Array.isArray(value))
        return [];
    const out = [];
    for (const entry of value) {
        if (entry === null || typeof entry !== 'object')
            continue;
        const record = entry;
        const name = typeof record.name === 'string' ? record.name : '';
        if (name === '')
            continue;
        out.push({
            name,
            columns: Array.isArray(record.columns) ? record.columns.filter((item) => typeof item === 'string') : [],
            unique: record.unique === true ? true : undefined,
            primary: record.primary === true ? true : undefined,
        });
    }
    return out;
}
function normalizeDescriptions(value) {
    const out = {};
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        return out;
    for (const [key, entry] of Object.entries(value)) {
        if (entry === null || typeof entry !== 'object')
            continue;
        const record = entry;
        const dot = key.lastIndexOf('.');
        const schema = dot > 0 ? key.slice(0, dot) : '';
        const table = dot > 0 ? key.slice(dot + 1) : key;
        out[key] = {
            schema: typeof record.schema === 'string' ? record.schema : schema,
            table: typeof record.table === 'string' ? record.table : table,
            kind: normalizeKind(record.kind),
            columns: normalizeColumns(record.columns),
            indexes: normalizeIndexes(record.indexes),
        };
    }
    return out;
}
/**
 * Redis key metadata cached offline. Values are data, not structure, so only
 * the key list and its scan cursor survive a restart.
 */
function normalizeRedisKeys(value) {
    if (!Array.isArray(value))
        return [];
    const out = [];
    for (const entry of value) {
        if (entry === null || typeof entry !== 'object')
            continue;
        const record = entry;
        const key = typeof record.key === 'string' ? record.key : '';
        if (key === '')
            continue;
        out.push({
            key,
            type: typeof record.type === 'string' ? record.type : 'string',
            ttl: typeof record.ttl === 'number' ? record.ttl : -1,
            size: typeof record.size === 'number' ? record.size : undefined,
        });
    }
    return out;
}
function normalizeRedis(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
        return undefined;
    const record = value;
    const databases = typeof record.databases === 'number' && record.databases > 0 ? Math.trunc(record.databases) : 16;
    const dbs = {};
    if (record.dbs !== null && typeof record.dbs === 'object' && !Array.isArray(record.dbs)) {
        for (const [db, entry] of Object.entries(record.dbs)) {
            if (entry === null || typeof entry !== 'object')
                continue;
            const entryRecord = entry;
            dbs[db] = {
                keys: normalizeRedisKeys(entryRecord.keys),
                cursor: typeof entryRecord.cursor === 'string' ? entryRecord.cursor : '0',
                fetchedAt: typeof entryRecord.fetchedAt === 'string' ? entryRecord.fetchedAt : new Date(0).toISOString(),
            };
        }
    }
    return { databases, dbs };
}
/**
 * Persisted "last known structure" per connection. Survives restarts so the data
 * source tree stays browsable while disconnected, and is replaced on the next
 * successful read (IDEA keeps the same contract).
 *
 * Writes are debounced: a full schema walk produces one save instead of dozens.
 */
export class StructureStore {
    file;
    log;
    data = {};
    timer;
    dirty = false;
    constructor(file, log) {
        this.file = file;
        this.log = log;
        this.load();
    }
    load() {
        if (!existsSync(this.file))
            return;
        try {
            const raw = JSON.parse(readFileSync(this.file, 'utf8'));
            const next = {};
            for (const [connectionId, value] of Object.entries(raw)) {
                if (value === null || typeof value !== 'object')
                    continue;
                const record = value;
                const redis = normalizeRedis(record.redis);
                next[connectionId] = {
                    fetchedAt: typeof record.fetchedAt === 'string' ? record.fetchedAt : new Date(0).toISOString(),
                    schemas: normalizeSchemas(record.schemas),
                    objects: normalizeObjects(record.objects),
                    descriptions: normalizeDescriptions(record.descriptions),
                    ...(redis === undefined ? {} : { redis }),
                };
            }
            this.data = next;
        }
        catch (error) {
            this.log(`结构缓存读取失败，忽略：${error instanceof Error ? error.message : String(error)}`);
        }
    }
    snapshot() {
        return JSON.parse(JSON.stringify(this.data));
    }
    get(connectionId) {
        const entry = this.data[connectionId];
        return entry === undefined ? undefined : JSON.parse(JSON.stringify(entry));
    }
    /** When the entry was last refreshed, without cloning its (possibly large) payload. */
    fetchedAt(connectionId) {
        return this.data[connectionId]?.fetchedAt;
    }
    /** Cached `CONFIG GET databases` value, without cloning the whole entry. */
    redisDatabases(connectionId) {
        return this.data[connectionId]?.redis?.databases;
    }
    putSchemas(connectionId, schemas) {
        const previous = this.data[connectionId];
        const objects = {};
        for (const schema of schemas) {
            const kept = previous?.objects[schema.name];
            if (kept !== undefined)
                objects[schema.name] = kept;
        }
        this.data[connectionId] = {
            fetchedAt: new Date().toISOString(),
            schemas,
            objects,
            descriptions: previous?.descriptions ?? {},
            ...(previous?.redis === undefined ? {} : { redis: previous.redis }),
        };
        this.schedule();
    }
    putObjects(connectionId, schema, objects) {
        const previous = this.data[connectionId] ?? {
            fetchedAt: new Date().toISOString(),
            schemas: [],
            objects: {},
            descriptions: {},
        };
        previous.objects[schema] = objects;
        previous.fetchedAt = new Date().toISOString();
        this.data[connectionId] = previous;
        this.schedule();
    }
    /** `schema.table` keys the description cache; relations only. */
    putDescription(connectionId, schema, table, description) {
        const entry = this.data[connectionId] ?? {
            fetchedAt: new Date().toISOString(),
            schemas: [],
            objects: {},
            descriptions: {},
        };
        entry.descriptions[`${schema}.${table}`] = description;
        entry.fetchedAt = new Date().toISOString();
        this.data[connectionId] = entry;
        this.schedule();
    }
    getDescription(connectionId, schema, table) {
        const description = this.data[connectionId]?.descriptions[`${schema}.${table}`];
        return description === undefined ? undefined : JSON.parse(JSON.stringify(description));
    }
    redisEntry(connectionId) {
        const entry = this.data[connectionId] ?? {
            fetchedAt: new Date().toISOString(),
            schemas: [],
            objects: {},
            descriptions: {},
        };
        if (entry.redis === undefined)
            entry.redis = { databases: 16, dbs: {} };
        return entry;
    }
    /** Cache the server's database count so the picker works offline too. */
    putRedisDatabases(connectionId, databases) {
        if (!Number.isFinite(databases) || databases <= 0)
            return;
        const entry = this.redisEntry(connectionId);
        entry.redis.databases = Math.trunc(databases);
        entry.fetchedAt = new Date().toISOString();
        this.data[connectionId] = entry;
        this.schedule();
    }
    /**
     * Cache one page of a Redis database's keys. `replace` starts a fresh scan
     * (first page) and drops keys the server no longer has; later pages merge.
     */
    putRedisKeys(connectionId, db, keys, cursor, replace) {
        const entry = this.redisEntry(connectionId);
        const id = String(db);
        const previous = replace ? [] : (entry.redis.dbs[id]?.keys ?? []);
        const merged = new Map(previous.map((key) => [key.key, key]));
        for (const key of keys)
            merged.set(key.key, key);
        const cached = [...merged.values()].slice(0, MAX_CACHED_KEYS);
        entry.redis.dbs[id] = {
            keys: cached,
            // A capped cache stops paging: there is no room to remember more keys.
            cursor: cached.length >= MAX_CACHED_KEYS ? '0' : cursor,
            fetchedAt: new Date().toISOString(),
        };
        entry.fetchedAt = new Date().toISOString();
        this.data[connectionId] = entry;
        this.schedule();
    }
    clear(connectionId) {
        if (this.data[connectionId] === undefined)
            return;
        delete this.data[connectionId];
        this.schedule();
    }
    /** Drop entries whose connection no longer exists in the config. */
    retain(connectionIds) {
        const allowed = new Set(connectionIds);
        let changed = false;
        for (const id of Object.keys(this.data)) {
            if (!allowed.has(id)) {
                delete this.data[id];
                changed = true;
            }
        }
        if (changed)
            this.schedule();
    }
    schedule() {
        this.dirty = true;
        if (this.timer !== undefined)
            return;
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.flush();
        }, 400);
        this.timer.unref?.();
    }
    flush() {
        if (!this.dirty)
            return;
        this.dirty = false;
        try {
            const temp = `${this.file}.tmp-${process.pid}`;
            writeFileSync(temp, `${JSON.stringify(this.data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
            renameSync(temp, this.file);
        }
        catch (error) {
            this.log(`结构缓存写入失败：${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=structure.js.map
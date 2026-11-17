import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DescriptionCache } from './descriptioncache.js';
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
    // Schema names come from the server and may be `__proto__`; a plain object
    // would route that assignment through the prototype setter and lose the list.
    const out = Object.create(null);
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
/**
 * Normalization exists only to read the legacy single-file cache; new code never
 * builds a `CachedStructure` with descriptions.
 *
 * TODO(0.5.0): 随 migrateDescriptions 一起删除。
 */
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
            ...(typeof record.describedAt === 'string' ? { describedAt: record.describedAt } : {}),
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
    /** Last JSON handed out by snapshotJson(), dropped whenever the data changes. */
    serialized;
    /** Descriptions grow large, so they live in per-connection append logs. */
    descriptions;
    constructor(file, log) {
        this.file = file;
        this.log = log;
        this.descriptions = new DescriptionCache(join(dirname(file), 'descriptions'), log);
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
                    // TODO(0.5.0): 旧版缓存文件里的 descriptions 随迁移逻辑一起删除。
                    descriptions: normalizeDescriptions(record.descriptions),
                    ...(redis === undefined ? {} : { redis }),
                };
            }
            // TODO(0.5.0): 发布 0.5.0 时删除旧版缓存迁移——届时 structure.json 不可能再附带 descriptions。
            this.migrateDescriptions(next);
            this.data = next;
        }
        catch (error) {
            this.log(`结构缓存读取失败，忽略：${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Older versions kept descriptions inside structure.json (tens of MB). Move
     * them into the per-connection logs once, then persist the slim tree file.
     *
     * TODO(0.5.0): 发布 0.5.0 时删除本方法及其调用，连同 DescriptionCache.import、
     * CachedStructure.descriptions 字段与 normalizeDescriptions，只保留「树文件 + 追加日志」一种格式。
     */
    migrateDescriptions(data) {
        let migrated = false;
        for (const [connectionId, entry] of Object.entries(data)) {
            const descriptions = entry.descriptions;
            if (descriptions === undefined || Object.keys(descriptions).length === 0)
                continue;
            // Keep the legacy descriptions if the rewrite did not reach disk: the
            // tree flush must not overwrite them, so a later start can retry migration.
            if (!this.descriptions.import(connectionId, descriptions))
                continue;
            entry.descriptions = {};
            migrated = true;
        }
        if (migrated)
            this.schedule();
    }
    snapshot() {
        return JSON.parse(this.snapshotJson());
    }
    /**
     * The snapshot as JSON, reused until the cached structure changes: the tree
     * endpoint only serializes, so it does not need its own deep copy first.
     * Descriptions are not shipped here; they are fetched per table (and the host
     * keeps them warm in their own logs), so the payload stays small.
     */
    snapshotJson() {
        if (this.serialized === undefined)
            this.serialized = JSON.stringify(this.treeSnapshot());
        return this.serialized;
    }
    treeSnapshot() {
        const tree = {};
        for (const [connectionId, entry] of Object.entries(this.data)) {
            tree[connectionId] = {
                fetchedAt: entry.fetchedAt,
                schemas: entry.schemas,
                objects: entry.objects,
                ...(entry.redis === undefined ? {} : { redis: entry.redis }),
            };
        }
        return tree;
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
        const objects = Object.create(null);
        for (const schema of schemas) {
            const kept = previous?.objects[schema.name];
            if (kept !== undefined)
                objects[schema.name] = kept;
        }
        // Descriptions of schemas the server no longer reports would otherwise stay
        // in the cache forever: prune them together with the schema list.
        this.descriptions.pruneSchemas(connectionId, schemas.map((schema) => schema.name));
        this.data[connectionId] = {
            fetchedAt: new Date().toISOString(),
            schemas,
            objects,
            descriptions: {},
            ...(previous?.redis === undefined ? {} : { redis: previous.redis }),
        };
        this.schedule();
    }
    putObjects(connectionId, schema, objects) {
        const previous = this.data[connectionId] ?? {
            fetchedAt: new Date().toISOString(),
            schemas: [],
            objects: Object.create(null),
            descriptions: {},
        };
        // Drop descriptions of objects that disappeared from the refreshed list,
        // so renames/drops do not leave unreachable entries behind. Routines keep
        // their definition in the same cache, so every listed kind counts here.
        const listed = new Set(objects.map((object) => object.name));
        this.descriptions.pruneObjects(connectionId, schema, listed);
        previous.objects[schema] = objects;
        previous.fetchedAt = new Date().toISOString();
        this.data[connectionId] = previous;
        this.schedule();
    }
    /** The description cache is keyed by the schema/table pair; relations only. */
    putDescription(connectionId, schema, table, description) {
        // The per-connection log takes the write; its timestamp makes the background
        // prefetcher incremental (a fresh entry is skipped, a stale one refreshed).
        this.descriptions.put(connectionId, schema, table, description);
        const entry = this.data[connectionId] ?? {
            fetchedAt: new Date().toISOString(),
            schemas: [],
            objects: Object.create(null),
            descriptions: {},
        };
        entry.fetchedAt = new Date().toISOString();
        this.data[connectionId] = entry;
        this.schedule();
    }
    getDescription(connectionId, schema, table) {
        return this.descriptions.get(connectionId, schema, table);
    }
    /** Whether a description is cached, without cloning it (the prefetcher asks this). */
    hasDescription(connectionId, schema, table) {
        return this.descriptions.has(connectionId, schema, table);
    }
    redisEntry(connectionId) {
        const entry = this.data[connectionId] ?? {
            fetchedAt: new Date().toISOString(),
            schemas: [],
            objects: Object.create(null),
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
        this.descriptions.clear(connectionId);
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
            if (allowed.has(id))
                continue;
            delete this.data[id];
            this.descriptions.clear(id);
            changed = true;
        }
        if (changed)
            this.schedule();
    }
    schedule() {
        this.serialized = undefined;
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
        this.descriptions.flush();
        if (!this.dirty)
            return;
        try {
            const temp = `${this.file}.tmp-${process.pid}`;
            // Compact JSON: the tree is small, and indentation only inflates I/O.
            writeFileSync(temp, `${JSON.stringify(this.treeSnapshot())}\n`, { encoding: 'utf8', mode: 0o600 });
            renameSync(temp, this.file);
            // Only clear the flag once the bytes are on disk. If the write fails the
            // tree still needs rewriting: leaving dirty set lets the next flush (or
            // timer) retry instead of silently dropping the change forever.
            this.dirty = false;
        }
        catch (error) {
            this.log(`结构缓存写入失败：${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=structure.js.map
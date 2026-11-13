import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Descriptions dominate the structure cache (columns and indexes are long,
 * relations are short), so they get their own append-only log per connection:
 * a background walk appends a few bytes per table instead of rewriting one huge
 * JSON document every debounce window. The log is rewritten in place once it
 * has grown enough duplicates, keeping reads O(live entries).
 *
 * Lines are `{"s":"<schema>","t":"<table>","d":{...}}`; `{"s","t","del":true}`
 * marks a pruned relation so removals do not force an immediate rewrite.
 */
const ENTRY_PREFIX = 'd';
/** Rewrite the log once this many lines were appended past the live set. */
export const DESCRIPTION_COMPACT_LINES = 2000;
/** Append buffered lines after this pause; small writes only. */
const FLUSH_DELAY_MS = 300;
function errorText(error) {
    return error instanceof Error ? error.message : String(error);
}
export class DescriptionCache {
    dir;
    log;
    entries = new Map();
    pending = new Map();
    appended = new Map();
    timer;
    constructor(dir, log) {
        this.dir = dir;
        this.log = log;
    }
    file(connectionId) {
        return join(this.dir, `${connectionId}.ndjson`);
    }
    ensure(connectionId) {
        const existing = this.entries.get(connectionId);
        if (existing !== undefined)
            return existing;
        const map = new Map();
        const file = this.file(connectionId);
        if (existsSync(file)) {
            let skipped = 0;
            let raw = '';
            try {
                raw = readFileSync(file, 'utf8');
            }
            catch (error) {
                this.log(`描述缓存读取失败，忽略：${errorText(error)}`);
            }
            for (const line of raw.split('\n')) {
                if (line.trim() === '')
                    continue;
                try {
                    const record = JSON.parse(line);
                    if (typeof record.s !== 'string' || typeof record.t !== 'string') {
                        skipped += 1;
                        continue;
                    }
                    const key = `${record.s}.${record.t}`;
                    if (record.del === true)
                        map.delete(key);
                    else if (record.d !== null && typeof record.d === 'object')
                        map.set(key, record.d);
                }
                catch {
                    // One truncated line (crash mid-write) must not hide the whole log.
                    skipped += 1;
                }
            }
            if (skipped > 0)
                this.log(`描述缓存有 ${skipped} 行无法解析，已跳过`);
        }
        this.entries.set(connectionId, map);
        return map;
    }
    get(connectionId, schema, table) {
        const description = this.ensure(connectionId).get(`${schema}.${table}`);
        return description === undefined ? undefined : JSON.parse(JSON.stringify(description));
    }
    has(connectionId, schema, table) {
        return this.ensure(connectionId).has(`${schema}.${table}`);
    }
    /** Store a description and append it to the log (the timestamp drives refreshes). */
    put(connectionId, schema, table, description) {
        const entry = { ...description, describedAt: new Date().toISOString() };
        this.ensure(connectionId).set(`${schema}.${table}`, entry);
        this.append(connectionId, JSON.stringify({ s: schema, t: table, [ENTRY_PREFIX]: entry }));
    }
    /**
     * Bulk import from the old single-file cache; writes a compact log at once.
     *
     * TODO(0.5.0): 只服务于旧版缓存迁移，发布 0.5.0 时随 StructureStore.migrateDescriptions 一起删除。
     */
    import(connectionId, descriptions) {
        const map = this.ensure(connectionId);
        for (const [key, description] of Object.entries(descriptions)) {
            if (description.table === '')
                continue;
            map.set(key, description);
        }
        this.rewrite(connectionId);
    }
    /** Drop descriptions of schemas the server no longer reports. */
    pruneSchemas(connectionId, schemas) {
        const keep = new Set(schemas);
        this.prune(connectionId, (key, description) => keep.has(description.schema));
    }
    /** Drop descriptions of objects that disappeared from one schema's object list. */
    pruneObjects(connectionId, schema, keys) {
        this.prune(connectionId, (key, description) => description.schema !== schema || keys.has(key));
    }
    prune(connectionId, keep) {
        const map = this.ensure(connectionId);
        for (const [key, description] of [...map]) {
            if (keep(key, description))
                continue;
            map.delete(key);
            this.append(connectionId, JSON.stringify({ s: description.schema, t: description.table, del: true }));
            this.compactIfNeeded(connectionId);
        }
    }
    clear(connectionId) {
        this.entries.delete(connectionId);
        this.pending.delete(connectionId);
        this.appended.delete(connectionId);
        try {
            rmSync(this.file(connectionId), { force: true });
        }
        catch (error) {
            this.log(`描述缓存删除失败：${errorText(error)}`);
        }
    }
    /** Append buffered lines. Called by the debounce timer and by StructureStore.flush(). */
    flush() {
        for (const [connectionId, lines] of [...this.pending]) {
            this.pending.delete(connectionId);
            if (lines.length === 0)
                continue;
            try {
                mkdirSync(this.dir, { recursive: true });
                appendFileSync(this.file(connectionId), `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
            }
            catch (error) {
                this.log(`描述缓存写入失败：${errorText(error)}`);
            }
            this.compactIfNeeded(connectionId);
        }
    }
    append(connectionId, line) {
        const lines = this.pending.get(connectionId);
        if (lines === undefined)
            this.pending.set(connectionId, [line]);
        else
            lines.push(line);
        this.appended.set(connectionId, (this.appended.get(connectionId) ?? 0) + 1);
        if (this.timer !== undefined)
            return;
        this.timer = setTimeout(() => {
            this.timer = undefined;
            this.flush();
        }, FLUSH_DELAY_MS);
        this.timer.unref?.();
    }
    compactIfNeeded(connectionId) {
        const live = this.entries.get(connectionId)?.size ?? 0;
        const appended = this.appended.get(connectionId) ?? 0;
        // Compact only once duplicates/tombstones double the log: a first full walk
        // appends one line per entry and must not trigger a rewrite per batch.
        if (appended < Math.max(DESCRIPTION_COMPACT_LINES, live * 2))
            return;
        this.rewrite(connectionId);
    }
    /** Rewrite the log with one line per live entry, dropping duplicates/tombstones. */
    rewrite(connectionId) {
        const map = this.entries.get(connectionId) ?? new Map();
        // The live map already reflects buffered lines, so drop them rather than
        // replaying stale puts over the compacted file.
        this.pending.delete(connectionId);
        this.appended.set(connectionId, 0);
        const lines = [];
        for (const [key, description] of map) {
            const dot = key.lastIndexOf('.');
            const schema = dot > 0 ? key.slice(0, dot) : description.schema;
            const table = dot > 0 ? key.slice(dot + 1) : description.table;
            lines.push(JSON.stringify({ s: schema, t: table, [ENTRY_PREFIX]: description }));
        }
        try {
            mkdirSync(this.dir, { recursive: true });
            const temp = `${this.file(connectionId)}.tmp-${process.pid}`;
            writeFileSync(temp, lines.length === 0 ? '' : `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
            renameSync(temp, this.file(connectionId));
        }
        catch (error) {
            this.log(`描述缓存整理失败：${errorText(error)}`);
        }
    }
}
//# sourceMappingURL=descriptioncache.js.map
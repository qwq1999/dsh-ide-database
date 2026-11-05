import { DbError } from './errors.js';
/**
 * How long a cached description counts as fresh. The prefetcher fills missing
 * entries after a connection opens and refreshes older ones then, so a long
 * lived cache converges on the server's current structure without re-reading
 * thousands of tables on every connect.
 */
export const DESCRIPTION_STALE_MS = 24 * 60 * 60 * 1000;
/** Keep the background walk gentle: metadata reads share the JDBC bridge. */
export const DESCRIPTION_CONCURRENCY = 2;
/** A description needs a (re)read when it is missing or older than `staleMs`. */
export function needsDescription(description, now = Date.now(), staleMs = DESCRIPTION_STALE_MS) {
    if (description === undefined)
        return true;
    if (description.describedAt === undefined)
        return true;
    const stamp = Date.parse(description.describedAt);
    if (Number.isNaN(stamp))
        return true;
    return now - stamp >= staleMs;
}
/**
 * Walks a connection's cached object list and fills in missing or stale table
 * and view descriptions in the background. `schedule` never blocks connecting:
 * it returns immediately, and cancelling a connection stops the walk at the
 * next item.
 */
export class DescriptionPrefetcher {
    deps;
    active = new Map();
    constructor(deps) {
        this.deps = deps;
    }
    /** Start (or keep) a background pass for one connection. */
    schedule(connectionId) {
        if (this.active.has(connectionId))
            return;
        this.active.set(connectionId, { connectionId, total: 0, done: 0 });
        void this.run(connectionId);
    }
    /** Stop a pass, e.g. when the connection is closed, trashed or removed. */
    cancel(connectionId) {
        this.active.delete(connectionId);
    }
    /** Snapshot of the walks currently running, for the status bar. */
    progress() {
        return [...this.active.values()].map((entry) => ({ ...entry }));
    }
    targets(connectionId) {
        const entry = this.deps.structure.get(connectionId);
        if (entry === undefined)
            return [];
        const now = Date.now();
        const targets = [];
        for (const [schema, objects] of Object.entries(entry.objects)) {
            for (const object of objects) {
                if (object.kind !== 'table' && object.kind !== 'view')
                    continue;
                if (!needsDescription(entry.descriptions[`${schema}.${object.name}`], now))
                    continue;
                targets.push({ schema, table: object.name, kind: object.kind });
            }
        }
        return targets;
    }
    async run(connectionId) {
        try {
            const targets = this.targets(connectionId);
            const session = this.active.get(connectionId);
            if (session === undefined)
                return;
            session.total = targets.length;
            let next = 0;
            const worker = async () => {
                while (this.active.has(connectionId) && next < targets.length) {
                    const target = targets[next];
                    next += 1;
                    if (target === undefined)
                        return;
                    try {
                        const description = await this.deps.sql.describe(connectionId, target.schema, target.table, target.kind);
                        this.deps.structure.putDescription(connectionId, target.schema, target.table, description);
                    }
                    catch (error) {
                        if (error instanceof DbError && error.code === 'not-connected') {
                            // Closing the connection ends the walk silently.
                            this.active.delete(connectionId);
                            return;
                        }
                        const message = error instanceof Error ? error.message : String(error);
                        this.deps.log(`后台结构缓存失败（${target.schema}.${target.table}）：${message}`);
                    }
                    const current = this.active.get(connectionId);
                    if (current !== undefined)
                        current.done += 1;
                }
            };
            const workers = Math.min(DESCRIPTION_CONCURRENCY, targets.length);
            await Promise.all(Array.from({ length: workers }, () => worker()));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.deps.log(`后台结构缓存失败：${message}`);
        }
        finally {
            this.active.delete(connectionId);
        }
    }
}
//# sourceMappingURL=prefetch.js.map
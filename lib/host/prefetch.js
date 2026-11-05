import { DbError } from './errors.js';
/** Keep the background walk gentle: metadata reads share the JDBC bridge. */
export const DESCRIPTION_CONCURRENCY = 2;
/**
 * Walks a connection's cached object list in the background. Opening a
 * connection only fills the relations that have never been read, while an
 * explicit refresh re-reads everything the user can see. `schedule` never
 * blocks connecting: it returns immediately, and cancelling a connection stops
 * the walk at the next item.
 */
export class DescriptionPrefetcher {
    deps;
    active = new Map();
    constructor(deps) {
        this.deps = deps;
    }
    /** Start (or upgrade) a background pass for one connection. */
    schedule(connectionId, options = {}) {
        const refreshAll = options.refreshAll === true;
        const running = this.active.get(connectionId);
        if (running !== undefined) {
            // A refresh upgrades a "fill the gaps" pass so an explicit refresh really
            // re-reads everything; any other repeat request is already covered.
            if (!refreshAll || running.refreshAll)
                return;
            this.active.delete(connectionId);
        }
        this.active.set(connectionId, {
            connectionId,
            total: 0,
            done: 0,
            refreshAll,
            schemas: options.schemas === undefined ? undefined : new Set(options.schemas),
        });
        void this.run(connectionId);
    }
    /** Stop a pass, e.g. when the connection is closed, trashed or removed. */
    cancel(connectionId) {
        this.active.delete(connectionId);
    }
    /** Snapshot of the walks currently running, for the status bar. */
    progress() {
        return [...this.active.values()].map(({ connectionId, total, done }) => ({ connectionId, total, done }));
    }
    targets(connectionId, session) {
        const entry = this.deps.structure.get(connectionId);
        if (entry === undefined)
            return [];
        const targets = [];
        for (const [schema, objects] of Object.entries(entry.objects)) {
            if (session.schemas !== undefined && !session.schemas.has(schema))
                continue;
            for (const object of objects) {
                if (object.kind !== 'table' && object.kind !== 'view')
                    continue;
                if (!session.refreshAll && entry.descriptions?.[`${schema}.${object.name}`] !== undefined)
                    continue;
                targets.push({ schema, table: object.name, kind: object.kind });
            }
        }
        return targets;
    }
    async run(connectionId) {
        try {
            const session = this.active.get(connectionId);
            if (session === undefined)
                return;
            const targets = this.targets(connectionId, session);
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
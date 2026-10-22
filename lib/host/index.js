import { ROUTE_PREFIX } from '../shared/presets.js';
import { ConfigStore } from './config.js';
import { DriverManager } from './drivers.js';
import { JavaLocator } from './java.js';
import { pluginPaths } from './paths.js';
import { RedisManager } from './redis.js';
import { createRouteHandler } from './routes.js';
import { makeLogger } from './services.js';
import { SecretStore } from './secrets.js';
import { SqlService } from './sql.js';
import { createDatabaseTools } from './tools.js';
export const name = 'dsh-ide-database';
/**
 * `webServer` carries the panel API; `tools` registers the eleven agent tools.
 * Optional services (logger, connection fence) are looked up defensively in
 * `services.ts` instead of being declared here.
 */
export const inject = ['webServer', 'tools'];
export function apply(ctx) {
    const log = makeLogger(ctx);
    const paths = pluginPaths();
    const secrets = new SecretStore(paths.secretsFile, log);
    const config = new ConfigStore(paths.configFile, secrets, log);
    config.load();
    const java = new JavaLocator();
    const drivers = new DriverManager(paths, config, log);
    const sql = new SqlService(paths, config, secrets, drivers, java, log);
    const redis = new RedisManager(config, secrets, log);
    const handler = createRouteHandler({ ctx, paths, config, secrets, drivers, java, sql, redis, log });
    ctx.effect(() => {
        const dispose = ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler });
        return () => {
            try {
                dispose?.();
            }
            catch {
                // already disposed by the web server
            }
        };
    });
    ctx.effect(() => {
        const disposers = createDatabaseTools({ config, drivers, sql, redis, paths }).map((tool) => ctx.tools.register(tool));
        return () => {
            for (const dispose of disposers) {
                try {
                    dispose?.();
                }
                catch {
                    // tool registry already torn down
                }
            }
        };
    });
    ctx.effect(() => () => {
        void sql.dispose();
        void redis.dispose();
    });
    log(`ready v${paths.version}; data dir ${paths.dataDir}`);
}
//# sourceMappingURL=index.js.map
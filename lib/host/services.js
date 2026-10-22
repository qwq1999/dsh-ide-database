import { PLUGIN_NAME } from '../shared/presets.js';
/** Optional services must never be declared in `inject`, so read them defensively. */
export function optionalService(ctx, name) {
    try {
        return ctx.get(name, false) ?? undefined;
    }
    catch {
        return undefined;
    }
}
export function makeLogger(ctx) {
    const logger = optionalService(ctx, 'logger');
    return (message) => {
        if (logger?.info !== undefined) {
            try {
                logger.info(`[${PLUGIN_NAME}] ${message}`);
                return;
            }
            catch {
                // fall back to console
            }
        }
        console.log(`[${PLUGIN_NAME}] ${message}`);
    };
}
//# sourceMappingURL=services.js.map
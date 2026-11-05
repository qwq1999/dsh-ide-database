/**
 * The SQL console toolbar actions, shared by the panel and the host.
 *
 * The host stores the user's display order in DbSettings so it survives a
 * restart; both halves need the same id list to validate and to fall back to
 * the default order, so it lives here instead of in the client bundle.
 */
export const CONSOLE_ACTION_IDS = [
    'run',
    'cancel',
    'history',
    'format',
    'import',
    'save',
    'clear',
    'copy',
    'explain',
    'openTable',
    'txStart',
    'txCommit',
    'txRollback',
    'export',
];
const CONSOLE_ACTION_SET = new Set(CONSOLE_ACTION_IDS);
export function isConsoleActionId(value) {
    return typeof value === 'string' && CONSOLE_ACTION_SET.has(value);
}
/**
 * The ids of a stored order this version understands, de-duplicated.
 * Unknown ids (a newer panel, or a hand-edited config file) are dropped.
 */
export function readConsoleActionOrder(value) {
    if (!Array.isArray(value))
        return [];
    const seen = new Set();
    const order = [];
    for (const entry of value) {
        if (!isConsoleActionId(entry) || seen.has(entry))
            continue;
        seen.add(entry);
        order.push(entry);
    }
    return order;
}
/**
 * The saved order, followed by every action it does not mention. New actions
 * added by a plugin update therefore appear at the end of an old saved order.
 */
export function orderConsoleActions(stored) {
    const known = readConsoleActionOrder(stored);
    const seen = new Set(known);
    return [...known, ...CONSOLE_ACTION_IDS.filter((id) => !seen.has(id))];
}
//# sourceMappingURL=consoleactions.js.map
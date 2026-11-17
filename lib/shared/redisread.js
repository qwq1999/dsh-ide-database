/**
 * Redis commands that only read data.
 *
 * The host uses this to decide whether a read-only connection may run a
 * command; the client uses the same list to decide whether a writable
 * connection needs a write confirmation. Keeping one list avoids the two
 * layers drifting apart (a pure read would otherwise ask for confirmation on
 * one side and be rejected on the other).
 */
export const REDIS_READ_COMMANDS = new Set([
    'get',
    'mget',
    'strlen',
    'type',
    'ttl',
    'pttl',
    'exists',
    'scan',
    'keys',
    'dbsize',
    'info',
    'ping',
    'echo',
    'time',
    'randomkey',
    'lrange',
    'llen',
    'lpos',
    'smembers',
    'scard',
    'sismember',
    'sscan',
    'hget',
    'hmget',
    'hgetall',
    'hlen',
    'hscan',
    'hkeys',
    'hvals',
    'zrange',
    'zrevrange',
    'zrangebyscore',
    'zcard',
    'zscan',
    'zscore',
    'xrange',
    'xrevrange',
    'xlen',
    'getrange',
    'object',
    'memory',
    'bitcount',
    'geopos',
    'xread',
    'xinfo',
    'lindex',
    'zcount',
    'zlexcount',
    'zrank',
    'zrevrank',
    'zmscore',
    'hstrlen',
    'hexists',
    'hrandfield',
    'getbit',
    'bitpos',
    'geodist',
    'geohash',
    'geosearch',
    'pfcount',
    'dump',
    'pubsub',
    'srandmember',
    'sinter',
    'sunion',
    'sdiff',
    'smismember',
    // Pure reads added in Redis 6/7.
    'zrandmember',
    'zunion',
    'zinter',
    'zintercard',
    'sintercard',
    'zdiff',
    'sort_ro',
    'lcs',
    'expiretime',
    'pexpiretime',
    'georadius_ro',
    'georadiusbymember_ro',
    // Sorted-set range variants and metadata reads.
    'zrangebylex',
    'zrevrangebylex',
    'zrevrangebyscore',
    'bitfield_ro',
    'xpending',
    'lolwut',
    'lastsave',
    'role',
    'command',
    'substr',
    // Redis 7 read-only script/function entry points.
    'eval_ro',
    'evalsha_ro',
    'fcall_ro',
]);
/**
 * A few "container" commands are in REDIS_READ_COMMANDS because most of their
 * subcommands are pure reads, but a specific subcommand mutates server state.
 * MEMORY PURGE asks the allocator to release pages back to the OS, so it must
 * not bypass the read-only guard. Keeping this map lets every other subcommand
 * stay classified by the main read list.
 */
const MUTATING_SUBCOMMANDS = {
    memory: new Set(['purge']),
};
/**
 * Whether a command invocation only reads data. Pass the subcommand (second
 * token) when available so a mutating subcommand of an otherwise-read command
 * is not mistaken for a read. Omitting the subcommand keeps the historical,
 * command-name-only behaviour.
 */
export function isRedisReadCommand(command, subcommand) {
    const name = command.toLowerCase();
    if (!REDIS_READ_COMMANDS.has(name))
        return false;
    if (subcommand !== undefined) {
        const mutating = MUTATING_SUBCOMMANDS[name];
        if (mutating?.has(subcommand.toLowerCase()))
            return false;
    }
    return true;
}
export function tokenizeRedisCommand(input) {
    const tokens = [];
    let current = '';
    let quote = null;
    let escaped = false;
    for (const char of input) {
        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }
        if (char === '\\' && quote !== "'") {
            escaped = true;
            continue;
        }
        if (quote !== null) {
            if (char === quote)
                quote = null;
            else
                current += char;
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            continue;
        }
        if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
            if (current !== '') {
                tokens.push(current);
                current = '';
            }
            continue;
        }
        current += char;
    }
    if (current !== '')
        tokens.push(current);
    return tokens;
}
//# sourceMappingURL=redisread.js.map
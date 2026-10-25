/**
 * Command names offered when Tab is pressed at the start of the Redis command box.
 * This is a convenience list only: the host decides what may actually run.
 */
export const REDIS_COMMANDS = [
  'GET',
  'MGET',
  'SET',
  'SETEX',
  'SETNX',
  'GETSET',
  'GETDEL',
  'GETEX',
  'GETRANGE',
  'SETRANGE',
  'STRLEN',
  'APPEND',
  'INCR',
  'DECR',
  'INCRBY',
  'INCRBYFLOAT',
  'TYPE',
  'TTL',
  'PTTL',
  'EXISTS',
  'EXPIRE',
  'PEXPIRE',
  'EXPIREAT',
  'PERSIST',
  'DEL',
  'UNLINK',
  'SCAN',
  'KEYS',
  'DBSIZE',
  'INFO',
  'PING',
  'ECHO',
  'TIME',
  'LRANGE',
  'LPOS',
  'LPUSH',
  'RPUSH',
  'LPOP',
  'RPOP',
  'RPOPLPUSH',
  'LMOVE',
  'LTRIM',
  'LLEN',
  'SMEMBERS',
  'SINTER',
  'SUNION',
  'SDIFF',
  'SRANDMEMBER',
  'SSCAN',
  'SMOVE',
  'SADD',
  'SREM',
  'SCARD',
  'SISMEMBER',
  'HGET',
  'HINCRBY',
  'HEXISTS',
  'HSETNX',
  'HSCAN',
  'HRANDFIELD',
  'HMGET',
  'HGETALL',
  'HSET',
  'HDEL',
  'HLEN',
  'HKEYS',
  'HVALS',
  'ZRANGE',
  'ZREVRANGE',
  'ZADD',
  'ZREM',
  'ZCARD',
  'ZSCORE',
  'ZINCRBY',
  'ZCOUNT',
  'ZRANK',
  'ZREVRANK',
  'ZRANGEBYSCORE',
  'ZSCAN',
  'ZPOPMIN',
  'ZPOPMAX',
  'ZRANDMEMBER',
  'XRANGE',
  'XREVRANGE',
  'XADD',
  'XLEN',
  'XDEL',
  'XINFO',
] as const

/** The word the caret sits in, when it is the command word (first non-space run). */
function commandWord(text: string, caret: number): { start: number; end: number; word: string } | null {
  let start = caret
  while (start > 0 && /\S/u.test(text[start - 1] as string)) start -= 1
  let end = caret
  while (end < text.length && /\S/u.test(text[end] as string)) end += 1
  const word = text.slice(start, end)
  if (word === '') return null
  if (text.slice(0, start).trim() !== '') return null
  return { start, end, word }
}

/**
 * The command to insert at the caret, or null when Tab should keep its normal
 * behaviour (caret not in the command word, or nothing matches the prefix).
 */
export function commandCompletion(text: string, caret: number): { start: number; end: number; command: string } | null {
  const word = commandWord(text, caret)
  if (word === null) return null
  const prefix = word.word.toUpperCase()
  const match = REDIS_COMMANDS.find((command) => command.startsWith(prefix))
  if (match === undefined || match === prefix) return null
  return { start: word.start, end: word.end, command: match }
}

/** Apply a completion to the text, returning the new text and where the caret lands. */
export function applyCommandCompletion(text: string, completion: { start: number; end: number; command: string }): { text: string; caret: number } {
  const next = text.slice(0, completion.start) + completion.command + text.slice(completion.end)
  return { text: next, caret: completion.start + completion.command.length }
}

/** The whitespace-delimited word the caret sits in, wherever it is on the line. */
function wordAt(text: string, caret: number): { start: number; end: number; word: string } | null {
  let start = Math.min(caret, text.length)
  while (start > 0 && /\S/u.test(text[start - 1] as string)) start -= 1
  let end = start
  while (end < text.length && /\S/u.test(text[end] as string)) end += 1
  const word = text.slice(start, end)
  return word === '' ? null : { start, end, word }
}

/**
 * Completes an argument with a key from the currently scanned list. Only used
 * after the command word, so Tab still completes commands first.
 */
export function keyCompletion(
  text: string,
  caret: number,
  keys: readonly { key: string }[],
): { start: number; end: number; key: string } | null {
  const word = wordAt(text, caret)
  if (word === null) return null
  if (text.slice(0, word.start).trim() === '') return null
  const match = keys.find((item) => item.key.startsWith(word.word) && item.key !== word.word)
  if (match === undefined) return null
  return { start: word.start, end: word.end, key: match.key }
}

import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { sqlDialectOf } from '../shared/dialect.js';
import { blockCommentEnd } from '../shared/sqlcomment.js';
import { SQLITE_ARGUMENT_PRAGMAS, parseSqlitePragma, SQLITE_READ_PRAGMAS } from '../shared/sqlitepragma.js';
import { BridgeClient } from './bridge.js';
import { DbError, errorMessage } from './errors.js';
const READ_ONLY_STARTERS = new Set(['select', 'with', 'show', 'describe', 'desc', 'explain', 'values']);
/**
 * SQLite pragmas that only inspect the database. They are useful on a
 * read-only connection, but PRAGMA is not generally read-only: `user_version =
 * 1`, `journal_mode = WAL` and `optimize` all mutate something. Keep this list
 * to introspection commands and reject an assignment even for a listed name.
 */
/** Whether a SQLite `PRAGMA` statement is a safe introspection read. */
function sqliteReadOnlyPragma(text) {
    const pragma = parseSqlitePragma(text);
    if (pragma === null || !SQLITE_READ_PRAGMAS.has(pragma.name))
        return false;
    // Even an introspection pragma can be assigned a value in some SQLite
    // versions; a plain read has no `=`. Mask strings/comments so an argument
    // such as `table_info('a=b')` stays a read.
    const rest = withoutLiterals(pragma.rest, 'sqlite');
    if (rest.includes('='))
        return false;
    // `PRAGMA user_version(7)` also assigns; only query-style pragmas may carry
    // a parenthesized argument.
    return SQLITE_ARGUMENT_PRAGMAS.has(pragma.name) || rest.trim() === '';
}
/** True for identifier characters; deliberately ASCII plus anything above 127. */
function isWordChar(char) {
    if (char === '_' || char === '$')
        return true;
    const code = char.codePointAt(0) ?? 0;
    return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code > 127;
}
function skipSpace(text, index) {
    let cursor = index;
    while (cursor < text.length) {
        const char = text[cursor];
        if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r')
            break;
        cursor += 1;
    }
    return cursor;
}
/** MySQL treats # as a line comment; SQL Server uses # for temp tables. */
function isMysqlDialect(dialect) {
    return dialect === 'mysql';
}
function readWord(text, index) {
    let end = index;
    while (end < text.length && isWordChar(text[end] ?? ''))
        end += 1;
    return { word: text.slice(index, end).toLowerCase(), end };
}
/**
 * End of a CTE name, which may be a plain word or a delimited identifier
 * (`"recent sales"`, `[recent]`, `` `recent` ``). `readWord` alone stops at the
 * opening quote, so a valid read would look like an unparseable CTE list and
 * the read-only guard would reject it.
 */
function readIdentifierEnd(text, index) {
    const start = skipSpace(text, index);
    const open = text[start];
    if (open === '[')
        return bracketIdentifierEnd(text, start);
    if (open === '"' || open === '`') {
        let cursor = start + 1;
        while (cursor < text.length) {
            if (text[cursor] === open) {
                if (text[cursor + 1] === open) {
                    cursor += 2;
                    continue;
                }
                return cursor + 1;
            }
            cursor += 1;
        }
        return null;
    }
    const word = readWord(text, start);
    return word.word === '' ? null : word.end;
}
/** PostgreSQL E'...' strings interpret backslash escapes; ordinary strings do not. */
function isPostgresEscapeString(text, quoteIndex) {
    const prefix = text[quoteIndex - 1];
    if (prefix !== 'E' && prefix !== 'e')
        return false;
    const before = text[quoteIndex - 2];
    return before === undefined || !isWordChar(before);
}
/** Index of the parenthesis closing the one at `open`, skipping quoted text and comments. */
function bracketIdentifierEnd(text, index) {
    if (text[index] !== '[')
        return null;
    let cursor = index + 1;
    while (cursor < text.length) {
        if (text[cursor] === ']') {
            if (text[cursor + 1] === ']') {
                cursor += 2;
                continue;
            }
            return cursor + 1;
        }
        cursor += 1;
    }
    return null;
}
/**
 * True when `--` at `index` starts a line comment. MySQL requires whitespace
 * (or end of input) after the dashes; every other dialect accepts any `--`.
 * Applying MySQL's rule everywhere would make `--'` in Oracle/SQLite/SQL Server
 * start a string literal and hide a later `; DELETE` from the guard.
 */
function startsLineComment(text, index, dialect) {
    if (text[index] !== '-' || text[index + 1] !== '-')
        return false;
    if (!isMysqlDialect(dialect))
        return true;
    const after = text[index + 2];
    return after === undefined || /\s/u.test(after);
}
/**
 * MySQL and MariaDB both execute the body of a versioned executable comment.
 * MySQL spells the opener bang-after-star, MariaDB also accepts M-bang.
 * Return the opener length (3 for the MySQL form, 4 for the MariaDB form) at
 * `index`, or 0 when there is no executable comment there.
 */
function executableCommentOpener(text, index) {
    if (text[index] !== '/' || text[index + 1] !== '*')
        return 0;
    if (text[index + 2] === '!')
        return 3;
    if (text[index + 2] === 'M' && text[index + 3] === '!')
        return 4;
    return 0;
}
function matchingParen(text, open, dialect = 'generic') {
    let depth = 0;
    for (let index = open; index < text.length; index += 1) {
        const char = text[index];
        if (isMysqlDialect(dialect) && char === '#') {
            const newline = text.indexOf('\n', index);
            if (newline < 0)
                return -1;
            index = newline;
            continue;
        }
        // SQL Server bracket identifiers may contain parentheses and semicolons.
        if (char === '[') {
            const end = bracketIdentifierEnd(text, index);
            if (end !== null) {
                index = end - 1;
                continue;
            }
        }
        // PostgreSQL dollar quoting may contain parentheses that are not nesting.
        // MySQL/Oracle/SQL Server also allow `$` in identifiers, so only the
        // PostgreSQL dialect may treat `$tag$` as a quote here.
        if (dialect === 'postgres' && char === '$') {
            const end = dollarQuotedLiteralEnd(text, index);
            if (end !== null) {
                index = end - 1;
                continue;
            }
        }
        // Oracle alternative quoting hides its inner quote from the generic scanner.
        if (char === 'q' || char === 'Q') {
            const end = oracleQuotedLiteralEnd(text, index);
            if (end !== null) {
                index = end - 1;
                continue;
            }
        }
        if (char === "'" || char === '"' || char === '`') {
            const quote = char;
            // MySQL strings and PostgreSQL E'...' strings backslash-escape quotes;
            // treating `\'` as a closing quote would hide a later `; DELETE`.
            const escapes = (dialect === 'mysql' && quote !== '`') ||
                (dialect === 'postgres' && quote === "'" && isPostgresEscapeString(text, index));
            index += 1;
            while (index < text.length) {
                if (escapes && text[index] === '\\') {
                    index += 2;
                    continue;
                }
                if (text[index] === quote) {
                    if (text[index + 1] === quote) {
                        index += 2;
                        continue;
                    }
                    break;
                }
                index += 1;
            }
            continue;
        }
        if (startsLineComment(text, index, dialect)) {
            const newline = text.indexOf('\n', index);
            if (newline < 0)
                return -1;
            index = newline;
            continue;
        }
        if (char === '/' && text[index + 1] === '*') {
            // MySQL executes `/*! ... */` bodies, so their parentheses and quotes
            // must participate in matching. Other dialects treat `/*!` as a normal
            // comment and skip it.
            if (isMysqlDialect(dialect) && executableCommentOpener(text, index) > 0) {
                // Step onto the `!` so the body characters participate in matching.
                index += executableCommentOpener(text, index) - 1;
                continue;
            }
            const end = text.indexOf('*/', index + 2);
            if (end < 0)
                return -1;
            index = end + 1;
            continue;
        }
        if (char === '(')
            depth += 1;
        else if (char === ')') {
            depth -= 1;
            if (depth === 0)
                return index;
        }
    }
    return -1;
}
/**
 * Parse a `WITH cte AS (...), ...` clause. Returns null when the list cannot
 * be parsed, which the read-only guard treats as a write.
 */
function parseWithClause(text, dialect = 'generic') {
    let cursor = skipSpace(text, 'with'.length);
    const recursive = readWord(text, cursor);
    if (recursive.word === 'recursive')
        cursor = skipSpace(text, recursive.end);
    const bodies = [];
    for (;;) {
        const nameEnd = readIdentifierEnd(text, cursor);
        if (nameEnd === null)
            return null;
        cursor = skipSpace(text, nameEnd);
        if (text[cursor] === '(') {
            const close = matchingParen(text, cursor, dialect);
            if (close < 0)
                return null;
            cursor = skipSpace(text, close + 1);
        }
        const as = readWord(text, cursor);
        if (as.word !== 'as')
            return null;
        cursor = skipSpace(text, as.end);
        for (;;) {
            const modifier = readWord(text, cursor);
            if (modifier.word !== 'not' && modifier.word !== 'materialized')
                break;
            cursor = skipSpace(text, modifier.end);
        }
        if (text[cursor] !== '(')
            return null;
        const close = matchingParen(text, cursor, dialect);
        if (close < 0)
            return null;
        bodies.push(text.slice(cursor + 1, close));
        cursor = skipSpace(text, close + 1);
        if (text[cursor] !== ',')
            break;
        cursor = skipSpace(text, cursor + 1);
    }
    return { bodies, statement: text.slice(cursor) };
}
/** Statements that write files on the server; a read-only connection must refuse them. */
const FILE_WRITE = /\binto\s+(?:outfile|dumpfile)\b/;
/** `SELECT ... FOR UPDATE` / `LOCK IN SHARE MODE` takes row locks even without writing. */
const LOCKING_READ = /\bfor\s+(?:update|share|key\s+share|no\s+key\s+update)\b|\block\s+in\s+share\s+mode\b|\bwith\s*\(\s*(?:updlock|holdlock|tablockx|tablock|xlock|serializable|repeatableread|readcommittedlock)\b/;
/**
 * SQL Server also accepts table hints without `WITH` (`FROM t (UPDLOCK)`); the
 * legacy spelling takes the same locks as the documented form.
 */
const MSSQL_TABLE_HINT_LOCK = /\(\s*(?:updlock|holdlock|tablockx|tablock|xlock|serializable|repeatableread|readcommittedlock)\b/;
/**
 * The end (exclusive) of the Oracle alternative-quoted literal starting at
 * `index`, or null when this is not one. The shape is `[n]q'<open>text<close>'`;
 * bracket pairs have their own closing character, and anything else closes with
 * the same character it opened with. A missing terminator is left to the normal
 * scanner so malformed input still reaches the server.
 */
function oracleQuotedLiteralEnd(input, index) {
    const previous = input[index - 1];
    if (previous === 'n' || previous === 'N') {
        const before = input[index - 2];
        if (before !== undefined && /[A-Za-z0-9_$]/u.test(before))
            return null;
    }
    else if (previous !== undefined && /[A-Za-z0-9_$]/u.test(previous)) {
        return null;
    }
    if (input[index + 1] !== "'")
        return null;
    const open = input[index + 2];
    if (open === undefined)
        return null;
    const close = open === '[' ? ']' : open === '{' ? '}' : open === '<' ? '>' : open === '(' ? ')' : open;
    const end = input.indexOf(`${close}'`, index + 3);
    return end === -1 ? null : end + 2;
}
/**
 * The end (exclusive) of the PostgreSQL dollar-quoted string starting at
 * `index`, or null when this is not one. `$$text$$` and `$tag$text$tag$` are
 * both allowed; a tag may not start with a digit because `$1` is a parameter.
 */
function dollarQuotedLiteralEnd(input, index) {
    if (input[index] !== '$')
        return null;
    if (index > 0 && /[A-Za-z0-9_$]/u.test(input[index - 1] ?? ''))
        return null;
    let cursor = index + 1;
    while (cursor < input.length && /[A-Za-z0-9_]/u.test(input[cursor] ?? ''))
        cursor += 1;
    if (input[cursor] !== '$')
        return null;
    if (cursor > index + 1 && /[0-9]/u.test(input[index + 1] ?? ''))
        return null;
    const delimiter = input.slice(index, cursor + 1);
    const close = input.indexOf(delimiter, cursor + 1);
    return close === -1 ? null : close + delimiter.length;
}
/** Lowercase copy of `text` with quoted strings and comments blanked out. */
function withoutLiterals(text, dialect = 'generic') {
    let out = '';
    for (let index = 0; index < text.length; index += 1) {
        const char = text[index] ?? '';
        // PostgreSQL dollar quoting hides semicolons inside a plain SELECT.
        // Other dialects allow `$` in identifiers (`1 AS $a$`), so treating it as
        // a quote there would hide a second statement from the guard.
        if (dialect === 'postgres' && char === '$') {
            const end = dollarQuotedLiteralEnd(text, index);
            if (end !== null) {
                index = end - 1;
                out += ' ';
                continue;
            }
        }
        // SQL Server bracket identifiers may contain semicolons and look like
        // writes (`[a into b]`); blank them like other quoted identifiers.
        if (char === '[') {
            const end = bracketIdentifierEnd(text, index);
            if (end !== null) {
                index = end - 1;
                out += ' ';
                continue;
            }
        }
        // Oracle alternative quoting can contain the quote character and semicolons;
        // skip the whole literal before the generic `'...'` scanner sees its inner quote.
        if (char === 'q' || char === 'Q') {
            const end = oracleQuotedLiteralEnd(text, index);
            if (end !== null) {
                index = end - 1;
                out += ' ';
                continue;
            }
        }
        if (char === "'" || char === '"' || char === '`') {
            const quote = char;
            const escapes = (dialect === 'mysql' && quote !== '`') ||
                (dialect === 'postgres' && quote === "'" && isPostgresEscapeString(text, index));
            index += 1;
            while (index < text.length) {
                if (escapes && text[index] === '\\') {
                    index += 2;
                    continue;
                }
                if (text[index] === quote) {
                    if (text[index + 1] === quote) {
                        index += 2;
                        continue;
                    }
                    break;
                }
                index += 1;
            }
            out += ' ';
            continue;
        }
        if (isMysqlDialect(dialect) && char === '#') {
            const newline = text.indexOf('\n', index);
            if (newline < 0)
                return out;
            index = newline;
            out += ' ';
            continue;
        }
        // MySQL only starts a `--` comment when the next character is whitespace;
        // `SELECT 1--3` is arithmetic, so `--3 INTO OUTFILE ...` must stay visible.
        // Every other dialect accepts any `--`.
        if (startsLineComment(text, index, dialect)) {
            const newline = text.indexOf('\n', index);
            if (newline < 0)
                return out;
            index = newline;
            out += ' ';
            continue;
        }
        if (char === '/' && text[index + 1] === '*') {
            // MySQL executes `/*! ... */` bodies; do not let the guard treat them as
            // inert comments. Keeping the body visible makes the INTO checks below
            // reject `SELECT ... /*!50000 INTO OUTFILE ... */` while still allowing
            // harmless hints such as `/*!50000 SQL_NO_CACHE */`.
            const opener = isMysqlDialect(dialect) ? executableCommentOpener(text, index) : 0;
            if (opener > 0) {
                // MySQL/MariaDB execute the comment body, so it must stay visible to the
                // guards below. Replace the opener marker, version digits and body with
                // spaces EXCEPT keep body letters: we blank the marker and digits but let
                // the loop below copy the body verbatim. Blanking the marker is what lets
                // `FOR /*!50000 UPDATE */` match LOCKING_READ (`for ... update`) — keeping
                // `/*!` there hid the locking hint from the regex. INTO OUTFILE and other
                // write bodies remain visible, so FILE_WRITE still rejects them.
                out += ' '.repeat(opener);
                index += opener - 1;
                // Stop on the last digit; the outer loop advances to the first body char.
                while (index + 1 < text.length && /\d/u.test(text[index + 1] ?? '')) {
                    out += ' ';
                    index += 1;
                }
                continue;
            }
            const close = blockCommentEnd(text, index, dialect);
            if (close < 0)
                return out;
            index = close - 1;
            out += ' ';
            continue;
        }
        // A MySQL executable comment's closer `*/` reaches here verbatim after we
        // blanked its opener/digits above (an empty-body `/*!50000*/` leaves a bare
        // `*/`). Blank it too so it cannot break word boundaries between the hint
        // and the keyword it guards (`FOR /*!50000*/ UPDATE`). Normal comments are
        // removed wholesale by the blockCommentEnd branch, so no other `*/` lands
        // here.
        if (isMysqlDialect(dialect) && char === '*' && text[index + 1] === '/') {
            out += '  ';
            index += 1;
            continue;
        }
        out += char.toLowerCase();
    }
    return out;
}
/**
 * True when a top-level `INTO` creates a table rather than reading into a session
 * variable or writing a server-side file. PostgreSQL spells it
 * `SELECT ... INTO [TEMP] [TABLE] name`; SQL Server uses `SELECT ... INTO #tmp`.
 */
function selectsIntoTable(text, dialect = 'generic') {
    const plain = withoutLiterals(text, dialect);
    let depth = 0;
    for (let index = 0; index < plain.length; index += 1) {
        const char = plain[index] ?? '';
        if (char === '(') {
            depth += 1;
            continue;
        }
        if (char === ')') {
            depth = Math.max(0, depth - 1);
            continue;
        }
        if (depth !== 0 || !plain.startsWith('into', index))
            continue;
        if (isWordChar(plain[index - 1] ?? '') || isWordChar(plain[index + 4] ?? ''))
            continue;
        const target = skipSpace(plain, index + 4);
        // `INTO @total` fills a session variable; only reads the source table.
        if ((plain[target] ?? '') === '@')
            continue;
        const word = readWord(plain, target).word;
        // File writes are rejected separately by FILE_WRITE.
        if (word === 'outfile' || word === 'dumpfile')
            continue;
        return true;
    }
    return false;
}
/** Strip leading comments; null means the text ends inside an unterminated comment. */
function stripLeadingComments(text, dialect = 'generic') {
    let rest = text.trim();
    for (;;) {
        if (isMysqlDialect(dialect) && rest.startsWith('#')) {
            const newline = rest.indexOf('\n');
            if (newline < 0)
                return null;
            rest = rest.slice(newline + 1).trim();
            continue;
        }
        if (startsLineComment(rest, 0, dialect)) {
            const newline = rest.indexOf('\n');
            if (newline < 0)
                return null;
            rest = rest.slice(newline + 1).trim();
            continue;
        }
        if (isMysqlDialect(dialect) && (rest.startsWith('/*!') || rest.startsWith('/*M!'))) {
            // Executable comments are MySQL code, not a leading comment. Leaving them
            // in place makes a read-only guard reject a statement that starts inside
            // one instead of skipping the write the server would run.
            return rest;
        }
        if (rest.startsWith('/*')) {
            const end = blockCommentEnd(rest, 0, dialect);
            if (end < 0)
                return null;
            rest = rest.slice(end).trim();
            continue;
        }
        return rest;
    }
}
/** Conservative guard used before the panel runs a statement on a read-only connection. */
/** PostgreSQL's parenthesised EXPLAIN accepts `ANALYZE false`, which plans without running the statement. */
function analyzeOptionEnabled(options) {
    const match = /\banaly[sz]e\b(?:\s*(?:=\s*)?(true|false|on|off|1|0))?/iu.exec(options);
    if (match === null)
        return false;
    const value = match[1]?.toLowerCase();
    return value !== 'false' && value !== 'off' && value !== '0';
}
/** Read one executable comment at the start of `text`; null when there is none. */
function executableComment(text) {
    const opener = executableCommentOpener(text, 0);
    if (opener === 0)
        return null;
    const close = text.indexOf('*/', opener);
    if (close < 0)
        return null;
    return { body: text.slice(opener, close), end: close + 2 };
}
export function isReadOnlySql(sql, dialect = 'generic') {
    // A UTF-8 BOM from an imported script is not part of the first keyword.
    const source = sql.charCodeAt(0) === 0xfeff ? sql.slice(1) : sql;
    const text = stripLeadingComments(source, dialect);
    if (text === null)
        return false;
    // MySQL runs the body of a leading `/*! ... */` as part of the statement.
    // Judge that body too, then the statement after it, instead of rejecting every
    // query that starts with a versioned hint.
    if (isMysqlDialect(dialect)) {
        const executable = executableComment(text);
        if (executable !== null) {
            const body = executable.body.trim().replace(/^\d{5,6}\s*/u, '').trim();
            const restText = stripLeadingComments(text.slice(executable.end), dialect);
            if (restText === null)
                return false;
            const rest = restText.replace(/;+\s*$/u, '');
            return (body === '' || isReadOnlySql(body, dialect)) && (rest === '' || isReadOnlySql(rest, dialect));
        }
    }
    const withoutTrailing = text.replace(/;+\s*$/, '');
    // A semicolon inside a string, quoted identifier or comment is data, not a
    // second statement; only one left in the code part makes the script unsafe.
    if (withoutLiterals(withoutTrailing, dialect).includes(';'))
        return false;
    const first = /^[A-Za-z]+/.exec(withoutTrailing);
    if (first === null)
        return false;
    const head = first[0].toLowerCase();
    if (dialect === 'sqlite' && head === 'pragma')
        return sqliteReadOnlyPragma(withoutTrailing);
    if (!READ_ONLY_STARTERS.has(head))
        return false;
    if (head === 'with') {
        // A CTE list can front any statement, including DELETE; judge what it runs.
        const clause = parseWithClause(withoutTrailing, dialect);
        if (clause === null)
            return false;
        // PostgreSQL also allows data-modifying CTE bodies
        // (`WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d`); judge them too.
        return (clause.bodies.every((body) => isReadOnlySql(body, dialect)) && isReadOnlySql(clause.statement, dialect));
    }
    if (head === 'explain') {
        // Oracle has no side-effect-free EXPLAIN: `EXPLAIN PLAN FOR ...` inserts
        // rows into the plan table. A read-only connection must not run it.
        if (dialect === 'oracle' || dialect === 'oceanbase-oracle')
            return false;
        // `EXPLAIN ANALYZE <statement>` and the parenthesised `EXPLAIN (ANALYZE, ...)`
        // form run <statement>; plain EXPLAIN only plans. Comments between the
        // keywords are whitespace, so `EXPLAIN /*x*/ ANALYZE DELETE` still runs.
        let rest = stripLeadingComments(withoutTrailing.slice(first[0].length), dialect);
        if (rest === null || rest === '')
            return false;
        // MySQL/MariaDB execute the body of `/*! ... */` (and MariaDB `/*M! ... */`);
        // a versioned comment can hide ANALYZE so `EXPLAIN /*!50000 ANALYZE */ DELETE`
        // really runs the DELETE. Unwrap a leading executable comment and keep the
        // remaining statement, so the option checks below see the whole thing.
        if (isMysqlDialect(dialect)) {
            // Unwrap executable comments repeatedly until the leading token is stable.
            // An empty-body `/*!...*/` may be followed by a normal comment and another
            // executable comment before the real ANALYZE, e.g.
            // `EXPLAIN /*!50000 */ /*h*/ ANALYZE DELETE`. Stopping after one unwrap
            // leaves a leading `/*` for readWord, which reads an empty word and
            // misclassifies the statement as a plain (read-only) EXPLAIN even though
            // the server runs it.
            for (;;) {
                const versioned = /^\/\*(?:!|M!)\d*\s*([\s\S]*?)\*\//u.exec(rest);
                if (versioned !== null) {
                    const body = (versioned[1] ?? '').trim();
                    const tail = rest.slice(versioned[0].length).trim();
                    rest = (tail === '' ? body : `${body} ${tail}`).trim();
                    continue;
                }
                const stripped = stripLeadingComments(rest, dialect);
                if (stripped === null) {
                    rest = '';
                    break;
                }
                if (stripped === rest)
                    break;
                rest = stripped;
            }
        }
        if (rest.startsWith('(')) {
            const close = matchingParen(rest, 0, dialect);
            if (close < 0)
                return false;
            if (!analyzeOptionEnabled(withoutLiterals(rest.slice(1, close), dialect)))
                return true;
            const statement = stripLeadingComments(rest.slice(close + 1), dialect);
            return statement !== null && statement !== '' && isReadOnlySql(statement, dialect);
        }
        const analyze = readWord(rest, 0);
        // PostgreSQL accepts both ANALYZE and ANALYSE; they are exact synonyms and
        // both execute the statement, so neither may slip past a read-only guard.
        if (analyze.word !== 'analyze' && analyze.word !== 'analyse')
            return true;
        rest = stripLeadingComments(rest.slice(analyze.end), dialect) ?? '';
        if (rest === '')
            return false;
        const format = readWord(rest, 0);
        if (format.word === 'format') {
            const equals = rest.indexOf('=');
            if (equals < 0)
                return false;
            const value = readWord(rest, skipSpace(rest, equals + 1));
            if (value.word === '')
                return false;
            rest = stripLeadingComments(rest.slice(value.end), dialect) ?? '';
        }
        return rest !== '' && isReadOnlySql(rest, dialect);
    }
    // `SELECT ... INTO <table>` creates a table on PostgreSQL and SQL Server.
    if (head === 'select' && selectsIntoTable(withoutTrailing, dialect))
        return false;
    // Locking reads take row locks and can block other sessions; a read-only
    // connection should not be able to do that. SQL Server's shorthand hint omits
    // `WITH`, so check it separately for that dialect.
    if (head === 'select') {
        const code = withoutLiterals(withoutTrailing, dialect);
        if (LOCKING_READ.test(code) || (dialect === 'mssql' && MSSQL_TABLE_HINT_LOCK.test(code)))
            return false;
    }
    // `SELECT ... INTO OUTFILE '/path'` looks plain but writes a file on the server.
    if (FILE_WRITE.test(withoutLiterals(withoutTrailing, dialect)))
        return false;
    return true;
}
/** SQLite silently creates the file when it is missing; say so instead of pretending it existed. */
export function fileDatabaseNote(dialect, database, exists) {
    if (dialect !== 'sqlite' || database.trim() === '' || exists)
        return null;
    return '文件不存在，连接时会新建一个空数据库';
}
function parseNumber(value, fallback) {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
/** Quote one identifier the way the dialect wants (backticks, square brackets, ANSI quotes). */
function quoteIdent(dialect, name) {
    if (dialect === 'mysql')
        return `\`${name.replace(/`/g, '``')}\``;
    if (dialect === 'mssql')
        return `[${name.replace(/]/g, ']]')}]`;
    return `"${name.replace(/"/g, '""')}"`;
}
function quoteLiteral(value, dialect = 'generic') {
    // MySQL treats backslash as an escape character inside string literals, so a
    // Windows path or a regexp must be doubled there. Leaving it alone can even
    // swallow the closing quote when the comment ends with a backslash.
    const escaped = dialect === 'mysql' ? value.replace(/\\/g, '\\\\') : value;
    return `'${escaped.replace(/'/g, "''")}'`;
}
function qualifies(schema, table) {
    return schema !== '' ? `${schema}.${table}` : table;
}
function objectKindName(kind) {
    switch (kind) {
        case 'table':
            return '表';
        case 'view':
            return '视图';
        case 'procedure':
            return '存储过程';
        case 'function':
            return '函数';
        case 'sequence':
            return '序列';
        case 'trigger':
            return '触发器';
        default:
            return '数据库对象';
    }
}
/**
 * Server DDL is displayed verbatim in a <pre> and is also returned by the
 * agent tools. Oracle's DBMS_METADATA pretty-prints the statement as
 * "\n  CREATE …": a blank first line plus a two-space indent, and it also
 * ends with a newline. Drop the blank edges and the indent of the first line
 * (a DDL statement never starts with meaningful horizontal whitespace) while
 * keeping the indentation inside the statement.
 */
function trimDdlText(text) {
    return text
        .replace(/^(?:[ \t]*\r?\n)+/, '')
        .replace(/^[ \t]+/, '')
        .replace(/\s+$/, '');
}
/**
 * Best-effort CREATE TABLE for dialects whose metadata cannot return DDL.
 * Only columns, the primary key and unique indexes are reconstructed; the
 * answer is marked generated so callers can tell it apart from the real thing.
 */
function generateDdl(dialect, description) {
    const name = qualifies(quoteIdent(dialect, description.schema), quoteIdent(dialect, description.table));
    const commentSupported = dialect === 'mysql';
    const lines = [];
    for (const column of description.columns) {
        const parts = [quoteIdent(dialect, column.name), column.typeName.trim() === '' ? 'VARCHAR(255)' : column.typeName];
        if (column.nullable === false)
            parts.push('NOT NULL');
        const fallback = column.defaultValue?.trim() ?? '';
        if (fallback !== '')
            parts.push(`DEFAULT ${fallback}`);
        if (commentSupported && column.comment !== undefined && column.comment !== '')
            parts.push(`COMMENT ${quoteLiteral(column.comment, dialect)}`);
        lines.push(`  ${parts.join(' ')}`);
    }
    const primary = description.indexes.find((index) => index.primary);
    if (primary !== undefined && primary.columns.length > 0) {
        lines.push(`  PRIMARY KEY (${primary.columns.map((column) => quoteIdent(dialect, column)).join(', ')})`);
    }
    let ddl = `CREATE TABLE ${name} (\n${lines.join(',\n')}\n)`;
    for (const index of description.indexes) {
        if (index.primary || !index.unique || index.columns.length === 0)
            continue;
        ddl += `;\nCREATE UNIQUE INDEX ${quoteIdent(dialect, index.name)} ON ${name} (${index.columns
            .map((column) => quoteIdent(dialect, column))
            .join(', ')})`;
    }
    return ddl;
}
export class SqlService {
    paths;
    config;
    secrets;
    drivers;
    java;
    log;
    bridge;
    bridgeJavaPath = '';
    bridgeStarting;
    connected = new Map();
    // Bumped on every connect start and disconnect so a connect that resolves
    // after a concurrent disconnect cannot resurrect a closed session.
    connectEpoch = new Map();
    constructor(paths, config, secrets, drivers, java, log = () => { }) {
        this.paths = paths;
        this.config = config;
        this.secrets = secrets;
        this.drivers = drivers;
        this.java = java;
        this.log = log;
    }
    isConnected(connId) {
        return this.connected.has(connId);
    }
    connectedIds() {
        return [...this.connected.keys()];
    }
    serverOf(connId) {
        return this.connected.get(connId)?.server;
    }
    requireConnection(connId) {
        const connection = this.config.connection(connId);
        if (connection === undefined)
            throw new DbError('not-found', `连接不存在：${connId}`);
        if (connection.dialect === 'redis')
            throw new DbError('unsupported', '该连接不是 JDBC 连接');
        return connection;
    }
    async ensureBridge() {
        const settings = this.config.settings();
        const status = this.java.locate(settings.javaPath);
        if (!status.available || status.path === undefined) {
            throw new DbError('java-missing', status.message ?? '未找到 Java 运行时（需要 8 及以上）');
        }
        if (!this.java.bridgeReady(this.paths.bridgeJar)) {
            throw new DbError('bridge', 'Java 数据库桥未构建', `缺少 ${this.paths.bridgeJar}，请在插件目录运行 npm run build:bridge。`);
        }
        if (this.bridge !== undefined && this.bridgeJavaPath !== status.path) {
            // dispose() sends closeAll to the JVM, which closes every JDBC session.
            // Drop our local connected map too, otherwise the UI still reports these
            // connections as online while the new bridge has no session for them.
            this.connected.clear();
            this.bridge.dispose();
            this.bridge = undefined;
        }
        if (this.bridge !== undefined) {
            await this.bridge.start();
            return this.bridge;
        }
        if (this.bridgeStarting !== undefined)
            return this.bridgeStarting;
        this.bridgeJavaPath = status.path;
        const bridge = new BridgeClient({ javaPath: status.path, bridgeJar: this.paths.bridgeJar, log: this.log });
        this.bridge = bridge;
        this.bridgeStarting = bridge
            .start()
            .then(() => bridge)
            .catch((error) => {
            this.bridge = undefined;
            throw error instanceof DbError ? error : new DbError('bridge', `无法启动 Java 数据库桥：${errorMessage(error)}`);
        })
            .finally(() => {
            this.bridgeStarting = undefined;
        });
        return this.bridgeStarting;
    }
    async passwordFor(connection, draftPassword) {
        if (typeof draftPassword === 'string' && draftPassword !== '')
            return draftPassword;
        if (connection.secretName === undefined)
            return '';
        return this.secrets.resolve(connection.secretName)?.value ?? '';
    }
    validateDatabase(connection, template) {
        // SQLite's "database" is a local file path (jdbc:sqlite:{{database}}).
        // Spaces, ? and # are legal filename characters there; the generic
        // URL-component check below must not reject them for file-backed dialects.
        if (template.startsWith('jdbc:sqlite:'))
            return;
        const database = connection.database.trim();
        if (/[?#\s]/.test(database))
            throw new DbError('invalid', '数据库/服务名不能包含空白或 ? # 字符');
        if (template.includes('{{database}}') && database === '') {
            if (connection.driver === 'oracle')
                throw new DbError('invalid', 'Oracle 连接必须填写服务名（Service Name）');
        }
    }
    buildUrl(connection, driver) {
        this.validateDatabase(connection, driver.urlTemplate);
        return driver.urlTemplate
            .replaceAll('{{host}}', connection.host)
            .replaceAll('{{port}}', String(connection.port))
            .replaceAll('{{database}}', connection.database.trim())
            .replaceAll('{{user}}', connection.user);
    }
    propertiesFor(connection, driver) {
        const settings = this.config.settings();
        const props = { ...connection.params };
        const timeoutMs = String(settings.connectTimeoutSec * 1000);
        switch (driver.dialect) {
            case 'mysql':
                props.connectTimeout ??= timeoutMs;
                props.allowPublicKeyRetrieval ??= 'true';
                props.characterEncoding ??= 'UTF-8';
                break;
            case 'oracle':
            case 'oceanbase-oracle':
                props['oracle.net.CONNECT_TIMEOUT'] ??= timeoutMs;
                break;
            case 'dameng':
                props.connectTimeout ??= timeoutMs;
                break;
            case 'postgres':
                // PostgreSQL measures connectTimeout in seconds, matching our setting.
                props.connectTimeout ??= String(settings.connectTimeoutSec);
                props.ApplicationName ??= 'dsh-ide-database';
                break;
            default:
                break;
        }
        return props;
    }
    async test(draft) {
        const started = Date.now();
        // The draft id is only used to resolve the stored secret. The bridge keys
        // JDBC sessions by connId and `connect` evicts any session under that key,
        // so a probe must use its own id — reusing a live connection's id would
        // close that connection's session and leave the host thinking it is still
        // open. Always generate a fresh probe id.
        const lookupId = typeof draft.id === 'string' && draft.id !== '' ? draft.id : undefined;
        const probeId = `probe-${randomBytes(6).toString('hex')}`;
        const existing = lookupId === undefined ? undefined : this.config.connection(lookupId);
        let driver;
        try {
            driver = this.drivers.resolveDriver(draft.driver, draft.customDriverId);
            this.drivers.assertJarsPresent(driver);
            const javaStatus = this.java.locate(this.config.settings().javaPath);
            if (!javaStatus.available)
                throw new DbError('java-missing', javaStatus.message ?? '未找到 Java');
            const connection = {
                id: probeId,
                name: draft.name,
                driver: draft.driver,
                ...(draft.customDriverId === undefined ? {} : { customDriverId: draft.customDriverId }),
                dialect: driver.dialect,
                host: draft.host,
                port: draft.port,
                user: draft.user,
                // A blank password normally falls back to the stored secret so editing
                // a connection can be tested without re-typing it. But when the user
                // explicitly asked to clear the password, test with an empty one —
                // otherwise the probe would succeed with a credential that is about
                // to be removed.
                ...(existing?.secretName === undefined || draft.clearPassword === true ? {} : { secretName: existing.secretName }),
                hasPassword: false,
                database: draft.database,
                redisDb: draft.redisDb,
                params: draft.params,
                readOnly: draft.readOnly,
                createdAt: existing?.createdAt ?? new Date().toISOString(),
            };
            const password = await this.passwordFor(connection, draft.password);
            const bridge = await this.ensureBridge();
            const settings = this.config.settings();
            const server = await bridge.request('connect', {
                connId: probeId,
                url: this.buildUrl(connection, driver),
                driverClass: driver.driverClass,
                dialect: driver.dialect,
                user: connection.user,
                password,
                jars: driver.jars.map((jar) => jar.file),
                readOnly: true,
                properties: this.propertiesFor(connection, driver),
            }, (settings.connectTimeoutSec + 15) * 1000);
            await bridge.request('disconnect', { connId: probeId }, 15_000).catch(() => undefined);
            const note = fileDatabaseNote(driver.dialect, connection.database, existsSync(connection.database));
            return { ok: true, server, latencyMs: Date.now() - started, ...(note === null ? {} : { note }) };
        }
        catch (error) {
            if (this.bridge !== undefined && driver !== undefined) {
                await this.bridge.request('disconnect', { connId: probeId }, 10_000).catch(() => undefined);
            }
            return { ok: false, latencyMs: Date.now() - started, message: errorMessage(error) };
        }
    }
    async connect(connId) {
        const connection = this.requireConnection(connId);
        const driver = this.drivers.resolveDriver(connection.driver, connection.customDriverId);
        this.drivers.assertJarsPresent(driver);
        // Claim the connect epoch before ANY await. disconnect() bumps this same
        // epoch to invalidate an in-flight connect; if we computed it after the
        // ensureBridge()/passwordFor() awaits, a disconnect landing in that window
        // would have its bump overwritten by our newer value, and the connect would
        // resurrect the session the user just closed.
        const epoch = (this.connectEpoch.get(connId) ?? 0) + 1;
        this.connectEpoch.set(connId, epoch);
        const bridge = await this.ensureBridge();
        const settings = this.config.settings();
        const password = await this.passwordFor(connection);
        try {
            const server = await bridge.request('connect', {
                connId,
                url: this.buildUrl(connection, driver),
                driverClass: driver.driverClass,
                dialect: driver.dialect,
                user: connection.user,
                password,
                jars: driver.jars.map((jar) => jar.file),
                readOnly: connection.readOnly,
                properties: this.propertiesFor(connection, driver),
            }, (settings.connectTimeoutSec + 15) * 1000);
            // A disconnect may have run while the bridge request was in flight; it
            // already closed the server-side session, so do not report the connection
            // as online or cache a stale ServerInfo for it.
            if (this.connectEpoch.get(connId) !== epoch) {
                throw new DbError('not-connected', '连接已断开');
            }
            this.connected.set(connId, { driver, server });
            this.config.touchConnection(connId);
            return server;
        }
        catch (error) {
            // The bridge evicts the old session for this connId before attempting a
            // new connection, so any failed connect leaves no live session behind.
            // Bridge-level failures take down all sessions, hence the full clear;
            // every other failure (bad credentials, pool full, ...) must at least
            // drop this connection or the UI keeps reporting a dead session online.
            if (error instanceof DbError && error.code === 'bridge')
                this.connected.clear();
            else
                this.connected.delete(connId);
            throw error instanceof DbError ? error : new DbError('connect-failed', `连接失败：${errorMessage(error)}`);
        }
    }
    async disconnect(connId) {
        this.connectEpoch.set(connId, (this.connectEpoch.get(connId) ?? 0) + 1);
        this.connected.delete(connId);
        if (this.bridge === undefined)
            return;
        await this.bridge.request('disconnect', { connId }, 15_000).catch(() => undefined);
    }
    requireConnected(connId) {
        const state = this.connected.get(connId);
        if (state === undefined)
            throw new DbError('not-connected', '连接尚未打开', '请先连接数据库。');
        return state;
    }
    async schemas(connId, filter = '') {
        this.requireConnected(connId);
        const bridge = await this.ensureBridge();
        const reply = await bridge.request('schemas', { connId, filter }, 60_000);
        const list = Array.isArray(reply.schemas) ? reply.schemas : [];
        return list.sort((a, b) => Number(Boolean(a.system)) - Number(Boolean(b.system)) || a.name.localeCompare(b.name));
    }
    async objects(connId, schema) {
        this.requireConnected(connId);
        const bridge = await this.ensureBridge();
        const reply = await bridge.request('objects', { connId, schema }, 60_000);
        const list = Array.isArray(reply.objects) ? reply.objects : [];
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    async setSchema(connId, schema) {
        this.requireConnected(connId);
        const bridge = await this.ensureBridge();
        await bridge.request('setSchema', { connId, schema }, 30_000);
    }
    async describe(connId, schema, table, kind = 'table') {
        this.requireConnected(connId);
        // Columns/indexes only exist for relations; routines, sequences and triggers
        // are listed in the tree but have no table structure to read.
        if (kind !== 'table' && kind !== 'view') {
            return { schema, table, kind, columns: [], indexes: [] };
        }
        const bridge = await this.ensureBridge();
        const reply = await bridge.request('columns', { connId, schema, table }, 60_000);
        const comment = typeof reply.comment === 'string' && reply.comment.trim() !== '' ? reply.comment.trim() : undefined;
        return {
            schema,
            table,
            kind,
            ...(comment === undefined ? {} : { comment }),
            columns: Array.isArray(reply.columns) ? reply.columns : [],
            indexes: Array.isArray(reply.indexes) ? reply.indexes : [],
        };
    }
    /**
     * DDL of a database object. Tables and views fall back to a reconstruction
     * from the described structure when the server cannot provide one; routines,
     * sequences and triggers must come from the server (there is nothing to
     * reconstruct from).
     */
    async ddl(connId, dialect, schema, table, kind = 'table') {
        this.requireConnected(connId);
        const supported = ['table', 'view', 'procedure', 'function', 'sequence', 'trigger'];
        if (!supported.includes(kind)) {
            throw new DbError('unsupported', `不支持查看${objectKindName(kind)}的 DDL`);
        }
        const qualified = qualifies(quoteIdent(dialect, schema), quoteIdent(dialect, table));
        const warnings = [];
        try {
            if (dialect === 'mysql') {
                const statement = kind === 'view'
                    ? `SHOW CREATE VIEW ${qualified}`
                    : kind === 'procedure'
                        ? `SHOW CREATE PROCEDURE ${qualified}`
                        : kind === 'function'
                            ? `SHOW CREATE FUNCTION ${qualified}`
                            : kind === 'trigger'
                                ? `SHOW CREATE TRIGGER ${qualified}`
                                : kind === 'sequence'
                                    ? `SHOW CREATE SEQUENCE ${qualified}`
                                    : `SHOW CREATE TABLE ${qualified}`;
                const result = await this.query(connId, statement, { maxRows: 1 });
                const row = result.rows[0];
                // SHOW CREATE … returns the definition among metadata columns whose
                // position differs by object type and server version. Pick the column by
                // name when available: sql_mode can be longer than a short routine body,
                // so choosing the longest cell would return the mode list instead.
                const definitionColumns = [
                    'create table', 'create view', 'create procedure', 'create function',
                    'create trigger', 'create sequence', 'sql original statement',
                ];
                const columns = Array.isArray(result.columns) ? result.columns : [];
                const nameIndex = columns.findIndex((column) => definitionColumns.includes(String(column?.name ?? '').trim().toLowerCase()));
                let raw = nameIndex >= 0 && typeof row?.[nameIndex] === 'string' ? row[nameIndex] : '';
                // Some servers (and mocks) omit column names: fall back to the longest
                // cell that actually contains a CREATE statement, never sql_mode text.
                if (raw === '' && Array.isArray(row)) {
                    for (const cell of row) {
                        if (typeof cell === 'string' && /\bcreate\b/iu.test(cell) && cell.length > raw.length)
                            raw = cell;
                    }
                }
                const ddl = trimDdlText(raw);
                if (ddl.trim() !== '')
                    return { schema, table, kind, ddl, source: 'server', warnings };
                warnings.push('服务器没有返回 DDL 文本');
            }
            else if (dialect === 'sqlite' && (kind === 'table' || kind === 'view' || kind === 'trigger')) {
                const statement = `SELECT sql FROM sqlite_master WHERE type = ${quoteLiteral(kind)} AND name = ${quoteLiteral(table)}`;
                const ddl = await this.firstCell(connId, statement);
                if (ddl.trim() !== '')
                    return { schema, table, kind, ddl, source: 'server', warnings };
                warnings.push('sqlite_master 没有返回定义');
            }
            else if (dialect === 'mssql' && (kind === 'view' || kind === 'procedure' || kind === 'function' || kind === 'trigger')) {
                const statement = `SELECT OBJECT_DEFINITION(OBJECT_ID(${quoteLiteral(qualified)})) AS ddl`;
                const ddl = await this.firstCell(connId, statement);
                if (ddl.trim() !== '')
                    return { schema, table, kind, ddl, source: 'server', warnings };
                warnings.push('OBJECT_DEFINITION 没有返回内容（可能没有查看定义的权限）');
            }
            else if (dialect === 'postgres' && kind === 'sequence') {
                const statement = "SELECT 'CREATE SEQUENCE ' || quote_ident(schemaname) || '.' || quote_ident(sequencename)"
                    + " || ' START WITH ' || start_value || ' INCREMENT BY ' || increment_by"
                    + ` FROM pg_sequences WHERE schemaname = ${quoteLiteral(schema)} AND sequencename = ${quoteLiteral(table)}`;
                const ddl = await this.firstCell(connId, statement);
                if (ddl.trim() !== '')
                    return { schema, table, kind, ddl, source: 'server', warnings };
                warnings.push('pg_sequences 没有返回内容');
            }
            else if (dialect === 'mssql' && kind === 'sequence') {
                const statement = "SELECT 'CREATE SEQUENCE [' + SCHEMA_NAME(schema_id) + '].[' + name + '] START WITH '"
                    + " + CAST(start_value AS varchar(40)) + ' INCREMENT BY ' + CAST(increment AS varchar(40))"
                    + ` FROM sys.sequences WHERE SCHEMA_NAME(schema_id) = ${quoteLiteral(schema)} AND name = ${quoteLiteral(table)}`;
                const ddl = await this.firstCell(connId, statement);
                if (ddl.trim() !== '')
                    return { schema, table, kind, ddl, source: 'server', warnings };
                warnings.push('sys.sequences 没有返回内容');
            }
            else if (dialect === 'postgres' && kind === 'trigger') {
                const statement = `SELECT pg_get_triggerdef(t.oid) AS ddl FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE t.tgname = ${quoteLiteral(table)} AND n.nspname = ${quoteLiteral(schema)} LIMIT 1`;
                const ddl = await this.firstCell(connId, statement);
                if (ddl.trim() !== '')
                    return { schema, table, kind, ddl, source: 'server', warnings };
                warnings.push('pg_get_triggerdef 没有返回内容');
            }
            else if (dialect === 'postgres' && kind === 'view') {
                const statement = `SELECT pg_get_viewdef(to_regclass(${quoteLiteral(qualified)}) , true) AS ddl`;
                const ddl = await this.firstCell(connId, statement);
                if (ddl.trim() !== '')
                    return { schema, table, kind, ddl, source: 'server', warnings };
                warnings.push('pg_get_viewdef 没有返回内容');
            }
            else if (dialect === 'oracle' || dialect === 'oceanbase-oracle' || dialect === 'dameng') {
                const objectType = kind.toUpperCase();
                const statement = `SELECT DBMS_METADATA.GET_DDL(${quoteLiteral(objectType)}, ${quoteLiteral(table)}, ${quoteLiteral(schema)}) AS DDL FROM DUAL`;
                const ddl = await this.firstCell(connId, statement);
                if (ddl.trim() !== '') {
                    const withComments = await this.withComments(connId, dialect, schema, table, kind, ddl);
                    return { schema, table, kind, ddl: withComments, source: 'server', warnings };
                }
                warnings.push('DBMS_METADATA.GET_DDL 没有返回内容');
            }
        }
        catch (error) {
            warnings.push(`服务器取不到 DDL：${errorMessage(error)}`);
        }
        if (kind !== 'table' && kind !== 'view') {
            throw new DbError('unsupported', `服务器没有返回${objectKindName(kind)}的定义`, warnings.length > 0 ? warnings.join('；') : '可在 SQL 控制台查看定义。');
        }
        const description = await this.describe(connId, schema, table, kind);
        if (dialect === 'postgres' && kind === 'table') {
            warnings.push('PostgreSQL 没有内置的建表语句查询，这张表是按结构重建的');
        }
        if (dialect === 'mssql' && kind === 'table') {
            warnings.push('SQL Server 没有内置的取建表语句的方法，这张表是按结构重建的');
        }
        return { schema, table, kind, ddl: generateDdl(dialect, description), source: 'generated', warnings };
    }
    /**
     * Runs a one-row query and returns the first cell when it is a string.
     * Server DDL is shown verbatim, so blank lines around it are dropped here.
     */
    async firstCell(connId, statement) {
        const result = await this.query(connId, statement, { maxRows: 1 });
        const cell = result.rows[0]?.[0];
        return typeof cell === 'string' ? trimDdlText(cell) : '';
    }
    /**
     * DM and Oracle keep table and column comments in the data dictionary, not in
     * the text DBMS_METADATA returns, so the structure panel shows comments while
     * the DDL right below it does not. Append the COMMENT ON statements behind
     * that panel, so the definition the dialog shows is the one that rebuilds the
     * table as it stands.
     */
    async withComments(connId, dialect, schema, table, kind, ddl) {
        // Views and routines have their own COMMENT ON forms; only tables matter here.
        if (kind !== 'table' || /\bCOMMENT\s+ON\b/i.test(ddl))
            return ddl;
        let description;
        try {
            description = await this.describe(connId, schema, table, kind);
        }
        catch {
            // Comments are a bonus: never lose the server DDL over them.
            return ddl;
        }
        const name = qualifies(quoteIdent(dialect, schema), quoteIdent(dialect, table));
        const lines = [];
        const comment = description.comment?.trim() ?? '';
        if (comment !== '')
            lines.push(`COMMENT ON TABLE ${name} IS ${quoteLiteral(comment, dialect)};`);
        for (const column of description.columns) {
            const columnComment = column.comment?.trim() ?? '';
            if (columnComment === '')
                continue;
            lines.push(`COMMENT ON COLUMN ${name}.${quoteIdent(dialect, column.name)} IS ${quoteLiteral(columnComment, dialect)};`);
        }
        if (lines.length === 0)
            return ddl;
        return `${ddl}\n\n${lines.join('\n')}`;
    }
    /** Fetch the execution plan (EXPLAIN) of a statement without running it. */
    async explain(connId, statement, options = {}) {
        const connection = this.requireConnection(connId);
        if (connection.dialect === 'redis') {
            throw new DbError('unsupported', 'Redis 连接没有执行计划');
        }
        this.requireConnected(connId);
        const sql = statement.trim();
        if (sql === '')
            throw new DbError('invalid', 'SQL 不能为空');
        const queryOptions = { maxRows: 500, ...options };
        const statements = [];
        if (connection.dialect === 'mssql') {
            // SHOWPLAN_ALL compiles the statement instead of running it, so the plan
            // comes back as a normal result set; turn it off again even on failure.
            const statements = ['SET SHOWPLAN_ALL ON'];
            const warnings = [];
            await this.query(connId, 'SET SHOWPLAN_ALL ON', { ...queryOptions, allowWrite: true });
            try {
                statements.push(sql);
                // SHOWPLAN_ALL is on, so this statement is only compiled, not executed.
                // isReadOnlySql still flags DML by its leading keyword; let it through the
                // guard just like the SET switches above (and Oracle's EXPLAIN PLAN FOR).
                const plan = await this.query(connId, sql, { ...queryOptions, allowWrite: true });
                return { dialect: connection.dialect, statements, plan, warnings };
            }
            finally {
                statements.push('SET SHOWPLAN_ALL OFF');
                try {
                    await this.query(connId, 'SET SHOWPLAN_ALL OFF', { ...queryOptions, allowWrite: true });
                }
                catch (error) {
                    warnings.push(`恢复执行计划开关失败：${errorMessage(error)}`);
                }
            }
        }
        if (connection.dialect === 'oracle' || connection.dialect === 'oceanbase-oracle') {
            const explain = `EXPLAIN PLAN FOR ${sql}`;
            statements.push(explain);
            // EXPLAIN PLAN FOR writes to the plan table, so isReadOnlySql flags it.
            // It is an internal, controlled statement (like mssql's SET SHOWPLAN_ALL),
            // not SQL the user asked to run: allow it past the query read-only guard.
            await this.query(connId, explain, { ...queryOptions, allowWrite: true });
            try {
                const display = "SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY(NULL, NULL, 'BASIC'))";
                statements.push(display);
                const plan = await this.query(connId, display, queryOptions);
                return { dialect: connection.dialect, statements, plan, warnings: [] };
            }
            catch (displayError) {
                return {
                    dialect: connection.dialect,
                    statements,
                    warnings: [`DBMS_XPLAN 不可用：${errorMessage(displayError)}`],
                };
            }
        }
        if (connection.dialect === 'dameng') {
            const explain = `EXPLAIN ${sql}`;
            statements.push(explain);
            // DM's EXPLAIN returns an empty ResultSet through Statement; the vendor
            // API DmdbConnection.getExplainInfo(text) is the supported way to read it.
            const bridge = await this.ensureBridge();
            const plan = await bridge.request('explain', { connId, sql }, 60_000);
            return { dialect: connection.dialect, statements, plan, warnings: [] };
        }
        if (connection.dialect === 'sqlite') {
            const explain = `EXPLAIN QUERY PLAN ${sql}`;
            statements.push(explain);
            const plan = await this.query(connId, explain, queryOptions);
            return { dialect: connection.dialect, statements, plan, warnings: [] };
        }
        const explain = `EXPLAIN ${sql}`;
        statements.push(explain);
        const plan = await this.query(connId, explain, queryOptions);
        return { dialect: connection.dialect, statements, plan, warnings: [] };
    }
    /**
     * Explicit transaction control. Switches the JDBC connection out of
     * auto-commit instead of posting SQL text, because Oracle has no `BEGIN`
     * statement (only a PL/SQL block opener).
     */
    async transaction(connId, action) {
        this.requireConnected(connId);
        const bridge = await this.ensureBridge();
        await bridge.request('tx', { connId, action }, 30_000);
    }
    async query(connId, sql, options = {}) {
        this.requireConnected(connId);
        const connection = this.requireConnection(connId);
        const dialect = sqlDialectOf(connection.dialect);
        const statement = sql.trim();
        if (statement === '')
            throw new DbError('invalid', 'SQL 不能为空');
        if (options.allowWrite !== true && !isReadOnlySql(statement, dialect)) {
            throw new DbError('read-only', '该操作只允许只读语句（SELECT/SHOW/DESCRIBE/EXPLAIN 等）', '请打开连接或先在面板中确认执行。');
        }
        const bridge = await this.ensureBridge();
        const settings = this.config.settings();
        const maxRows = Math.min(Math.max(Math.trunc(options.maxRows ?? settings.maxRows) || settings.maxRows, 1), 5_000);
        const timeoutSec = Math.min(Math.max(Math.trunc(options.timeoutSec ?? settings.queryTimeoutSec) || settings.queryTimeoutSec, 1), 600);
        const stmtKey = options.stmtKey !== undefined && options.stmtKey !== '' ? options.stmtKey.slice(0, 64) : `stmt-${randomBytes(6).toString('hex')}`;
        try {
            const reply = await bridge.request('query', { connId, sql: statement, maxRows, timeoutSec, stmtKey, schema: options.schema ?? '' }, (timeoutSec + 10) * 1000);
            return {
                columns: Array.isArray(reply.columns) ? reply.columns : [],
                rows: Array.isArray(reply.rows) ? reply.rows : [],
                rowCount: parseNumber(reply.rowCount, 0),
                truncated: reply.truncated === true,
                ...(typeof reply.updateCount === 'number' ? { updateCount: reply.updateCount } : {}),
                elapsedMs: parseNumber(reply.elapsedMs, 0),
                warnings: Array.isArray(reply.warnings) ? reply.warnings.filter((warning) => typeof warning === 'string') : [],
                sql: typeof reply.sql === 'string' ? reply.sql : statement,
                stmtKey,
            };
        }
        catch (error) {
            if (error instanceof DbError && error.code === 'timeout') {
                await this.cancel(stmtKey).catch(() => undefined);
            }
            if (error instanceof DbError && error.code === 'bridge')
                this.connected.clear();
            throw error;
        }
    }
    /**
     * Full text of a cell whose result only carried its first 16 KB. Results stay
     * small that way, and the bridge keeps the cut part for the "full value"
     * dialog instead of re-running the statement — a sorted or filtered grid no
     * longer has a stable row to re-read. Returns null once it is gone.
     */
    async cellText(column, text) {
        if (text === '')
            return null;
        const shown = text.slice(0, 16_448);
        const bridge = await this.ensureBridge();
        const reply = await bridge.request('cell', { column, text: shown }, 30_000);
        return typeof reply.text === 'string' ? reply.text : null;
    }
    async cancel(stmtKey) {
        if (this.bridge === undefined)
            return false;
        const reply = await this.bridge.request('cancel', { stmtKey }, 15_000);
        return reply.cancelled === true;
    }
    async ping() {
        const bridge = await this.ensureBridge();
        return bridge.request('ping', {}, 15_000);
    }
    async dispose() {
        this.connected.clear();
        if (this.bridge === undefined)
            return;
        const bridge = this.bridge;
        this.bridge = undefined;
        bridge.dispose();
    }
}
//# sourceMappingURL=sql.js.map
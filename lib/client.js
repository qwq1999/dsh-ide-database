window.__ModuleLoader__.load({
  id: "dsh-ide-database",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);

// src/client/App.tsx
var import_react18 = require("react");

// src/shared/presets.ts
var ROUTE_PREFIX = "/dsh-ide-database/api";
var PRESETS = {
  mysql: {
    id: "mysql",
    dialect: "mysql",
    defaultPort: 3306,
    driverClass: "com.mysql.cj.jdbc.Driver",
    urlTemplate: "jdbc:mysql://{{host}}:{{port}}/{{database}}",
    jar: { group: "com.mysql", artifact: "mysql-connector-j", version: "8.4.0" },
    databaseHint: "数据库名（可留空）",
    needsJava: true
  },
  mariadb: {
    id: "mariadb",
    dialect: "mysql",
    defaultPort: 3306,
    driverClass: "org.mariadb.jdbc.Driver",
    urlTemplate: "jdbc:mariadb://{{host}}:{{port}}/{{database}}",
    jar: { group: "org.mariadb.jdbc", artifact: "mariadb-java-client", version: "3.4.1" },
    databaseHint: "数据库名（可留空）",
    needsJava: true
  },
  "oceanbase-mysql": {
    id: "oceanbase-mysql",
    dialect: "mysql",
    defaultPort: 2881,
    driverClass: "com.mysql.cj.jdbc.Driver",
    urlTemplate: "jdbc:mysql://{{host}}:{{port}}/{{database}}",
    jar: { group: "com.mysql", artifact: "mysql-connector-j", version: "8.4.0" },
    databaseHint: "OceanBase MySQL 模式的租户库名（可留空）",
    needsJava: true
  },
  "oceanbase-oracle": {
    id: "oceanbase-oracle",
    dialect: "oceanbase-oracle",
    defaultPort: 2881,
    driverClass: "com.oceanbase.jdbc.Driver",
    urlTemplate: "jdbc:oceanbase://{{host}}:{{port}}/{{database}}",
    jar: { group: "com.oceanbase", artifact: "oceanbase-client", version: "2.4.19" },
    databaseHint: "OceanBase Oracle 模式的 Schema/Service（可留空）",
    needsJava: true
  },
  oracle: {
    id: "oracle",
    dialect: "oracle",
    defaultPort: 1521,
    driverClass: "oracle.jdbc.OracleDriver",
    urlTemplate: "jdbc:oracle:thin:@//{{host}}:{{port}}/{{database}}",
    jar: { group: "com.oracle.database.jdbc", artifact: "ojdbc8", version: "23.26.3.0.0" },
    databaseHint: "服务名（Service Name），例如 ORCLPDB1",
    needsJava: true
  },
  dameng: {
    id: "dameng",
    dialect: "dameng",
    defaultPort: 5236,
    driverClass: "dm.jdbc.driver.DmDriver",
    urlTemplate: "jdbc:dm://{{host}}:{{port}}/{{database}}",
    jar: { group: "com.dameng", artifact: "DmJdbcDriver18", version: "8.1.3.140" },
    databaseHint: "模式名（Schema，可留空）",
    needsJava: true
  },
  postgres: {
    id: "postgres",
    dialect: "postgres",
    defaultPort: 5432,
    driverClass: "org.postgresql.Driver",
    urlTemplate: "jdbc:postgresql://{{host}}:{{port}}/{{database}}",
    jar: { group: "org.postgresql", artifact: "postgresql", version: "42.7.4" },
    databaseHint: "数据库名（留空时连当前用户的默认库）",
    needsJava: true
  },
  sqlite: {
    id: "sqlite",
    dialect: "sqlite",
    defaultPort: 0,
    driverClass: "org.sqlite.JDBC",
    urlTemplate: "jdbc:sqlite:{{database}}",
    jar: { group: "org.xerial", artifact: "sqlite-jdbc", version: "3.46.1.3" },
    databaseHint: "数据库文件路径，例如 D:/data/app.db 或 :memory:",
    hostOptional: true,
    needsJava: true
  },
  mssql: {
    id: "mssql",
    dialect: "mssql",
    defaultPort: 1433,
    driverClass: "com.microsoft.sqlserver.jdbc.SQLServerDriver",
    urlTemplate: "jdbc:sqlserver://{{host}}:{{port}};databaseName={{database}};encrypt=true;trustServerCertificate=true",
    // mssql-jdbc 把 JRE 版本写进 artifact 版本号，仓库里不存在 9.4.1 这个目录。
    jar: { group: "com.microsoft.sqlserver", artifact: "mssql-jdbc", version: "9.4.1.jre8" },
    databaseHint: "数据库名，例如 master",
    needsJava: true
  },
  redis: {
    id: "redis",
    dialect: "redis",
    defaultPort: 6379,
    databaseHint: "Redis 逻辑库序号（0-15）",
    needsJava: false
  }
};
var PRESET_ORDER = [
  "mysql",
  "mariadb",
  "oceanbase-mysql",
  "oceanbase-oracle",
  "oracle",
  "dameng",
  "postgres",
  "sqlite",
  "mssql",
  "redis"
];
var PRESET_LABEL = {
  mysql: "MySQL",
  mariadb: "MariaDB",
  "oceanbase-mysql": "OceanBase（MySQL 模式）",
  "oceanbase-oracle": "OceanBase（Oracle 模式）",
  oracle: "Oracle",
  dameng: "达梦 DM",
  postgres: "PostgreSQL",
  sqlite: "SQLite",
  mssql: "SQL Server",
  redis: "Redis"
};
var SQL_DIALECT_LABEL = {
  mysql: "MySQL",
  oracle: "Oracle",
  dameng: "达梦 DM",
  postgres: "PostgreSQL",
  sqlite: "SQLite",
  mssql: "SQL Server",
  "oceanbase-oracle": "OceanBase (Oracle)",
  generic: "自定义 JDBC"
};
var DIALECT_LABEL = {
  ...SQL_DIALECT_LABEL,
  redis: "Redis"
};
function presetOf(id) {
  return PRESETS[id];
}

// src/client/api.ts
var ApiError = class extends Error {
  code;
  detail;
  constructor(code, message, detail) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.detail = detail;
  }
};
async function post(path, body = {}) {
  let response;
  try {
    response = await fetch(`${ROUTE_PREFIX}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin"
    });
  } catch (error) {
    throw new ApiError("network", error instanceof Error ? error.message : String(error));
  }
  let envelope;
  try {
    envelope = await response.json();
  } catch {
    throw new ApiError("bad-response", `接口返回了无法解析的响应（HTTP ${String(response.status)}）`);
  }
  if (envelope.ok !== true) {
    throw new ApiError(envelope.error?.code ?? "error", envelope.error?.message ?? "请求失败", envelope.error?.detail);
  }
  return envelope.data;
}
var api = {
  status: () => post("/status"),
  env: () => post("/env"),
  health: () => post("/health"),
  saveConnection: (draft) => post("/connections/save", { ...draft }),
  deleteConnection: (id) => post("/connections/delete", { id }),
  restoreConnection: (id) => post("/connections/restore", { id }),
  purgeConnection: (id) => post("/connections/purge", { id }),
  emptyTrash: () => post("/connections/trash/empty"),
  reorderConnections: (ids) => post("/connections/reorder", { ids }),
  testConnection: (draft) => post("/connections/test", { draft }),
  connect: (id) => post("/connections/connect", { id }),
  prefetchConnection: (id, options = {}) => post("/connections/prefetch", { id, ...options }),
  disconnect: (id) => post("/connections/disconnect", { id }),
  structure: () => post("/structure"),
  schemas: (id, filter = "") => post("/schema/list", { id, filter }),
  objects: (id, schema) => post("/schema/objects", { id, schema }),
  /** Batch the metadata one completion needs, straight from the host structure cache. */
  completionMetadata: (id, request = {}) => post("/completion/metadata", { id, ...request }),
  describe: (id, schema, table, kind) => post("/schema/describe", { id, schema, table, kind }),
  ddl: (id, schema, table, kind) => post("/schema/ddl", { id, schema, table, kind }),
  explain: (id, sql, schema) => post("/explain", { id, sql, schema }),
  tx: (id, action) => post("/tx", { id, action }),
  query: (options) => post("/query", options),
  cancel: (stmtKey) => post("/query/cancel", { stmtKey }),
  redisScan: (options) => post("/redis/scan", options),
  redisKey: (id, key, db) => post("/redis/key", { id, key, ...db === void 0 ? {} : { db } }),
  redisDatabases: (id) => post("/redis/databases", { id }),
  redisCommand: (id, command, allowWrite, db) => post("/redis/command", { id, command, allowWrite, ...db === void 0 ? {} : { db } }),
  downloadDriver: (driverId) => post("/drivers/download", { driverId }),
  /** Downloads and unpacks a JRE into the data directory; resolves with the refreshed env. */
  downloadJava: () => post("/java/download"),
  saveCustomDriver: (driver) => post("/drivers/custom/save", { driver }),
  deleteCustomDriver: (id) => post("/drivers/custom/delete", { id }),
  updateSettings: (settings) => post("/settings/update", { settings })
};

// src/client/sqllex.ts
function backslashEscapes(input, quoteIndex, quote, dialect) {
  if (quote === "`") return false;
  if (dialect === "mysql") return true;
  if (dialect !== "postgres" || quote !== "'") return false;
  const prefix = input[quoteIndex - 1];
  if (prefix !== "e" && prefix !== "E") return false;
  const before = input[quoteIndex - 2];
  return before === void 0 || !/[A-Za-z0-9_$]/u.test(before);
}
function oracleQuotedLiteralEnd(input, index) {
  const previous = input[index - 1];
  if (previous === "n" || previous === "N") {
    const before = input[index - 2];
    if (before !== void 0 && /[A-Za-z0-9_$]/u.test(before)) return null;
  } else if (previous !== void 0 && /[A-Za-z0-9_$]/u.test(previous)) {
    return null;
  }
  if (input[index + 1] !== "'") return null;
  const open = input[index + 2];
  if (open === void 0) return null;
  const close = open === "[" ? "]" : open === "{" ? "}" : open === "<" ? ">" : open === "(" ? ")" : open;
  const end = input.indexOf(`${close}'`, index + 3);
  return end === -1 ? null : end + 2;
}
function dashStartsComment(input, next, dialect) {
  if (dialect !== "mysql") return true;
  const char = input[next];
  return char === void 0 || /\s/u.test(char);
}
function dollarDelimiterAt(input, index) {
  if (input[index] !== "$") return null;
  if (index > 0 && /[A-Za-z0-9_$]/.test(input[index - 1] ?? "")) return null;
  let cursor = index + 1;
  while (cursor < input.length && /[A-Za-z0-9_]/.test(input[cursor] ?? "")) cursor += 1;
  if (input[cursor] !== "$") return null;
  if (cursor > index + 1 && /[0-9]/.test(input[index + 1] ?? "")) return null;
  return input.slice(index, cursor + 1);
}
function bracketIdentifierEnd(input, index) {
  if (input[index] !== "[") return null;
  let cursor = index + 1;
  while (cursor < input.length) {
    if (input[cursor] === "]") {
      if (input[cursor + 1] === "]") {
        cursor += 2;
        continue;
      }
      return cursor + 1;
    }
    cursor += 1;
  }
  return null;
}
function maskNonCode(text2, dialect, maskQuotedIdentifiers, keepExecutableComments = false) {
  let out = "";
  let index = 0;
  while (index < text2.length) {
    const char = text2[index] ?? "";
    if (char === "-" && text2[index + 1] === "-" && dashStartsComment(text2, index + 2, dialect)) {
      const end = text2.indexOf("\n", index);
      const stop = end === -1 ? text2.length : end;
      out += " ".repeat(stop - index);
      index = stop;
      continue;
    }
    if (char === "#" && dialect === "mysql") {
      const end = text2.indexOf("\n", index);
      const stop = end === -1 ? text2.length : end;
      out += " ".repeat(stop - index);
      index = stop;
      continue;
    }
    if (char === "/" && text2[index + 1] === "*" && keepExecutableComments && dialect === "mysql" && text2[index + 2] === "!") {
      out += "/*!";
      index += 3;
      while (index < text2.length && /\d/u.test(text2[index] ?? "")) {
        out += " ";
        index += 1;
      }
      continue;
    }
    if (char === "/" && text2[index + 1] === "*") {
      const close = text2.indexOf("*/", index + 2);
      const stop = close === -1 ? text2.length : close + 2;
      out += " ".repeat(stop - index);
      index = stop;
      continue;
    }
    if ((char === "q" || char === "Q") && (dialect === "oracle" || dialect === "oceanbase-oracle")) {
      const end = oracleQuotedLiteralEnd(text2, index);
      if (end !== null) {
        out += " ".repeat(end - index);
        index = end;
        continue;
      }
    }
    if (char === "$" && dialect === "postgres") {
      const delimiter = dollarDelimiterAt(text2, index);
      if (delimiter !== null) {
        const close = text2.indexOf(delimiter, index + delimiter.length);
        if (close !== -1) {
          const end = close + delimiter.length;
          out += " ".repeat(end - index);
          index = end;
          continue;
        }
      }
    }
    if (char === "[" && (dialect === "mssql" || dialect === "sqlite") && maskQuotedIdentifiers) {
      const end = bracketIdentifierEnd(text2, index);
      if (end !== null) {
        out += " ".repeat(end - index);
        index = end;
        continue;
      }
    }
    const masked = char === "'" || maskQuotedIdentifiers && (char === '"' || char === "`");
    if (masked) {
      const quote = char;
      const escapes = backslashEscapes(text2, index, quote, dialect);
      index += 1;
      out += " ";
      while (index < text2.length) {
        const next = text2[index] ?? "";
        index += 1;
        out += " ";
        if (next === "\\" && quote !== "`" && escapes && index < text2.length) {
          index += 1;
          out += " ";
          continue;
        }
        if (next === quote) {
          if (text2[index] === quote) {
            index += 1;
            out += " ";
            continue;
          }
          break;
        }
      }
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

// src/client/multistatement.ts
function hasOnlyComments(text2) {
  const rest = text2.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(?:--|#)[^\n]*/gu, "").trim();
  return rest === "";
}
function mysqlDelimiterDirective(input, index) {
  let lineStart = index;
  while (lineStart > 0 && (input[lineStart - 1] === " " || input[lineStart - 1] === "	")) lineStart -= 1;
  if (lineStart > 0 && input[lineStart - 1] !== "\n" && input[lineStart - 1] !== "\r") return null;
  const match = /^delimiter[ \t]+(\S+)[ \t]*(?:(?:--|#)[^\n]*)?(?:\r?\n|$)/iu.exec(input.slice(index));
  if (match === null) return null;
  const token = match[1];
  if (token === void 0) return null;
  return { token, end: index + match[0].length };
}
function isMssqlProgram(text2) {
  const code = maskNonCode(text2, "mssql", true);
  return /^\s*(?:create\s+(?:or\s+alter\s+)?|alter\s+)(?:proc(?:edure)?|function|trigger|view)\b/iu.test(code);
}
function mssqlGoDirective(input, index) {
  let lineStart = index;
  while (lineStart > 0 && (input[lineStart - 1] === " " || input[lineStart - 1] === "	")) lineStart -= 1;
  if (lineStart > 0 && input[lineStart - 1] !== "\n" && input[lineStart - 1] !== "\r") return null;
  const match = /^go(?:[ \t]+(\d+))?[ \t]*(?:--[^\n]*)?(?:\r?\n|$)/iu.exec(input.slice(index));
  if (match === null) return null;
  const count = match[1] === void 0 ? 1 : Number(match[1]);
  if (!Number.isSafeInteger(count) || count < 1) return null;
  return { end: index + match[0].length, count };
}
function splitStatements(input, dialect = "generic") {
  const statements = [];
  let current = "";
  let delimiter = ";";
  let batchStart = 0;
  let mssqlProgram;
  let index = 0;
  const flush = () => {
    const trimmed = current.trim();
    if (trimmed !== "") statements.push(trimmed);
    current = "";
    mssqlProgram = void 0;
  };
  while (index < input.length) {
    const char = input[index] ?? "";
    const batchWord = char === "g" || char === "G" ? input.slice(index, index + 2).toLowerCase() : "";
    if (dialect === "mssql" && batchWord === "go") {
      const batch = mssqlGoDirective(input, index);
      if (batch !== null) {
        if (!hasOnlyComments(current)) flush();
        const batchStatements = statements.slice(batchStart);
        if (batch.count > 1 && batchStatements.length > 0) {
          for (let repeat = 1; repeat < batch.count; repeat += 1) statements.push(...batchStatements);
        }
        batchStart = statements.length;
        index = batch.end;
        continue;
      }
    }
    const directiveWord = char === "d" || char === "D" ? input.slice(index, index + 9).toLowerCase() : "";
    if (dialect === "mysql" && directiveWord === "delimiter" && (current.trim() === "" || hasOnlyComments(current))) {
      const directive = mysqlDelimiterDirective(input, index);
      if (directive !== null) {
        delimiter = directive.token;
        index = directive.end;
        continue;
      }
    }
    if (delimiter !== ";" && input.startsWith(delimiter, index)) {
      flush();
      index += delimiter.length;
      continue;
    }
    if (char === "$" && dialect === "postgres") {
      const tag = dollarDelimiterAt(input, index);
      if (tag !== null) {
        const close = input.indexOf(tag, index + tag.length);
        if (close !== -1) {
          current += input.slice(index, close + tag.length);
          index = close + tag.length;
          continue;
        }
      }
    }
    if (char === "[" && (dialect === "mssql" || dialect === "sqlite")) {
      const end = bracketIdentifierEnd(input, index);
      if (end !== null) {
        current += input.slice(index, end);
        index = end;
        continue;
      }
    }
    if (char === "-" && input[index + 1] === "-" && dashStartsComment(input, index + 2, dialect)) {
      const end = input.indexOf("\n", index);
      const stop = end === -1 ? input.length : end;
      current += input.slice(index, stop);
      index = stop;
      continue;
    }
    if (char === "#" && dialect === "mysql") {
      const end = input.indexOf("\n", index);
      const stop = end === -1 ? input.length : end;
      current += input.slice(index, stop);
      index = stop;
      continue;
    }
    if (char === "/" && input[index + 1] === "*") {
      const close = input.indexOf("*/", index + 2);
      const stop = close === -1 ? input.length : close + 2;
      current += input.slice(index, stop);
      index = stop;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      const escapes = backslashEscapes(input, index, quote, dialect);
      current += char;
      index += 1;
      while (index < input.length) {
        const next = input[index] ?? "";
        current += next;
        index += 1;
        if (next === "\\" && quote !== "`" && escapes) {
          current += input[index] ?? "";
          index += 1;
          continue;
        }
        if (next === quote) {
          if (input[index] === quote) {
            current += input[index] ?? "";
            index += 1;
            continue;
          }
          break;
        }
      }
      continue;
    }
    if ((char === "q" || char === "Q") && (dialect === "oracle" || dialect === "oceanbase-oracle")) {
      const end = oracleQuotedLiteralEnd(input, index);
      if (end !== null) {
        current += input.slice(index, end);
        index = end;
        continue;
      }
    }
    if (char === ";" && delimiter === ";") {
      if (dialect === "mssql") {
        if (mssqlProgram === void 0) mssqlProgram = isMssqlProgram(current);
        if (mssqlProgram) {
          current += char;
          index += 1;
          continue;
        }
      }
      flush();
      index += 1;
      continue;
    }
    current += char;
    index += 1;
  }
  flush();
  return statements;
}

// src/shared/redisread.ts
var REDIS_READ_COMMANDS = /* @__PURE__ */ new Set([
  "get",
  "mget",
  "strlen",
  "type",
  "ttl",
  "pttl",
  "exists",
  "scan",
  "keys",
  "dbsize",
  "info",
  "ping",
  "echo",
  "time",
  "randomkey",
  "lrange",
  "llen",
  "lpos",
  "smembers",
  "scard",
  "sismember",
  "sscan",
  "hget",
  "hmget",
  "hgetall",
  "hlen",
  "hscan",
  "hkeys",
  "hvals",
  "zrange",
  "zrevrange",
  "zrangebyscore",
  "zcard",
  "zscan",
  "zscore",
  "xrange",
  "xrevrange",
  "xlen",
  "getrange",
  "object",
  "memory",
  "bitcount",
  "geopos",
  "xread",
  "xinfo",
  "lindex",
  "zcount",
  "zlexcount",
  "zrank",
  "zrevrank",
  "zmscore",
  "hstrlen",
  "hexists",
  "hrandfield",
  "getbit",
  "bitpos",
  "geodist",
  "geohash",
  "geosearch",
  "pfcount",
  "srandmember",
  "sinter",
  "sunion",
  "sdiff",
  "smismember",
  // Pure reads added in Redis 6/7.
  "zrandmember",
  "zunion",
  "zinter",
  "zintercard",
  "sintercard",
  "zdiff",
  "sort_ro",
  "lcs",
  "expiretime",
  "pexpiretime",
  "georadius_ro",
  "georadiusbymember_ro",
  // Sorted-set range variants and metadata reads.
  "zrangebylex",
  "zrevrangebylex",
  "zrevrangebyscore",
  "bitfield_ro",
  "xpending",
  "lolwut",
  "lastsave",
  "role",
  "command",
  "substr"
]);
function isRedisReadCommand(command) {
  return REDIS_READ_COMMANDS.has(command.toLowerCase());
}

// src/client/format.ts
function dialectLabel(dialect) {
  return dialect ? DIALECT_LABEL[dialect] : "未选择";
}
function formatMs(ms) {
  if (ms === void 0 || !Number.isFinite(ms) || ms < 0) return "—";
  const rounded = Math.max(1, Math.round(ms));
  if (rounded < 1e3) return `${rounded} ms`;
  const seconds = Math.round(ms / 1e3);
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return `${hours}h ${minutes}m ${seconds % 60}s`;
  }
  if (ms >= 6e4) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${(ms / 1e3).toFixed(2)} s`;
}
function formatTtl(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds === -1) return "永久";
  if (seconds === -2) return "已过期";
  if (seconds < 0) return "—";
  const whole = Math.round(seconds);
  if (whole < 60) return `${whole}s`;
  if (whole < 3600) return `${Math.floor(whole / 60)}m`;
  if (whole < 86400) return `${Math.floor(whole / 3600)}h`;
  return `${Math.floor(whole / 86400)}d`;
}
function formatBytes(bytes) {
  if (bytes === void 0 || !Number.isFinite(bytes) || bytes < 0) return "";
  const rounded = Math.round(bytes);
  if (rounded < 1024) return `${rounded} B`;
  const kb = bytes / 1024;
  if (Math.round(kb * 10) / 10 < 1024) return `${kb.toFixed(1)} KB`;
  const mb = bytes / (1024 * 1024);
  if (Math.round(mb * 10) / 10 < 1024) return `${mb.toFixed(1)} MB`;
  const gb = bytes / (1024 * 1024 * 1024);
  if (Math.round(gb * 10) / 10 < 1024) return `${gb.toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
}
function formatCell(value) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
function formatDateTime(iso) {
  if (iso === void 0 || iso === "") return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (value) => String(value).padStart(2, "0");
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
var WRITE_STATEMENT = /^\s*(insert|update|delete|merge|replace|create|alter|drop|truncate|grant|revoke|call|exec|execute|rename|comment|lock|unlock|load|bulk|reindex|cluster|refresh|backup|restore|dbcc|analyze|optimize|vacuum|set\s+global)\b/i;
function isSpaceChar(char) {
  return char === " " || char === "	" || char === "\n" || char === "\r";
}
function firstWord(text2) {
  let end = 0;
  while (end < text2.length && !isSpaceChar(text2[end] ?? "")) end += 1;
  let cursor = end;
  while (cursor < text2.length && isSpaceChar(text2[cursor] ?? "")) cursor += 1;
  return { word: text2.slice(0, end).toLowerCase(), rest: text2.slice(cursor) };
}
function unwrapExplainAnalyze(statement) {
  const head = firstWord(statement);
  if (head.word !== "explain") return statement;
  let rest = head.rest;
  if (rest.startsWith("(")) {
    const close = skipBalanced(rest, 0);
    if (close < 0) return statement;
    if (!analyzeOptionEnabled(rest.slice(1, close - 1))) return statement;
    return rest.slice(close).trimStart();
  }
  const analyze2 = firstWord(rest);
  if (analyze2.word !== "analyze") return statement;
  const next = firstWord(analyze2.rest);
  return next.word.startsWith("format") ? next.rest : analyze2.rest;
}
function cteNameEnd(text2, index) {
  const first = text2[index];
  if (first === void 0) return null;
  const closer = first === '"' ? '"' : first === "`" ? "`" : first === "[" ? "]" : "";
  if (closer !== "") {
    let cursor2 = index + 1;
    while (cursor2 < text2.length) {
      if (text2[cursor2] === closer) {
        if (text2[cursor2 + 1] === closer) {
          cursor2 += 2;
          continue;
        }
        return cursor2 + 1;
      }
      cursor2 += 1;
    }
    return null;
  }
  let cursor = index;
  while (cursor < text2.length) {
    const char = text2[cursor] ?? "";
    if (isSpaceChar(char) || char === "(" || char === ")" || char === ",") break;
    cursor += 1;
  }
  return cursor > index ? cursor : null;
}
function skipBalanced(text2, open) {
  let depth = 0;
  let quote = "";
  for (let index = open; index < text2.length; index += 1) {
    const char = text2[index] ?? "";
    if (quote !== "") {
      if (char === quote) quote = "";
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "[") {
      const end = bracketIdentifierEnd(text2, index);
      if (end !== null) {
        index = end - 1;
        continue;
      }
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}
function withWriteParts(code) {
  let rest = firstWord(code).rest;
  const maybeRecursive = firstWord(rest);
  if (maybeRecursive.word === "recursive") rest = maybeRecursive.rest;
  const bodies = [];
  for (; ; ) {
    const nameEnd = cteNameEnd(rest, 0);
    if (nameEnd === null) return null;
    rest = rest.slice(nameEnd).trimStart();
    if (rest.startsWith("(")) {
      const close2 = skipBalanced(rest, 0);
      if (close2 < 0) return null;
      rest = rest.slice(close2).trimStart();
    }
    const as = firstWord(rest);
    if (as.word !== "as") return null;
    rest = as.rest;
    const optional = firstWord(rest);
    if (optional.word === "not") {
      const materialized = firstWord(optional.rest);
      if (materialized.word !== "materialized") return null;
      rest = materialized.rest;
    } else if (optional.word === "materialized") {
      rest = optional.rest;
    }
    if (!rest.startsWith("(")) return null;
    const close = skipBalanced(rest, 0);
    if (close < 0) return null;
    bodies.push(rest.slice(1, close - 1));
    rest = rest.slice(close).trimStart();
    if (rest.startsWith(",")) {
      rest = rest.slice(1).trimStart();
      continue;
    }
    return { bodies, statement: rest };
  }
}
var SELECT_INTO_FILE = /\binto\s+(?:outfile|dumpfile)\b/iu;
var MSSQL_WRITE_WORD = /\b(?:insert|update|delete|merge|truncate|create|alter|drop|exec(?:ute)?|backup|restore|bulk)\b/iu;
var MYSQL_EXECUTABLE_WRITE = /\/\*![\s\S]*?(?:insert|update|delete|merge|replace|create|alter|drop|truncate|grant|revoke|call|exec(?:ute)?|rename|lock|unlock|analyze|optimize|vacuum)\b/iu;
var MYSQL_EXECUTABLE_DDL = /\/\*![\s\S]*?(?:create|alter|drop|rename|truncate)\b/iu;
var SELECT_INTO_TABLE = /\binto\s+(?!@|(?:outfile|dumpfile)\b)(?:temp(?:orary)?\s+)?(?:table\s+)?(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_$#][\w$#]*)/iu;
var MYSQL_EXECUTABLE_INTO = /\/\*![\s\S]*?\binto\s+(?:(?:outfile|dumpfile)\b|(?:temp(?:orary)?\s+)?(?:table\s+)?(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[A-Za-z_$#][\w$#]*))/iu;
function analyzeOptionEnabled(options) {
  const match = /\banalyze\b(?:\s*(?:=\s*)?(true|false|on|off|1|0))?/iu.exec(options);
  if (match === null) return false;
  const value = match[1]?.toLowerCase();
  return value !== "false" && value !== "off" && value !== "0";
}
function explainAnalyzeBody(code) {
  let rest = firstWord(code).rest;
  let analyze2 = false;
  if (rest.startsWith("(")) {
    const close = skipBalanced(rest, 0);
    if (close < 0) return null;
    if (analyzeOptionEnabled(rest.slice(1, close - 1))) analyze2 = true;
    rest = rest.slice(close).trimStart();
  }
  const next = firstWord(rest);
  if (next.word === "analyze") {
    analyze2 = true;
    rest = next.rest;
  }
  if (!analyze2) return null;
  const verbose = firstWord(rest);
  if (verbose.word === "verbose") rest = verbose.rest;
  const format = firstWord(rest);
  if (format.word.startsWith("format")) rest = format.rest;
  return rest;
}
function looksLikeWriteCode(code, dialect) {
  if (dialect === "mysql" && (MYSQL_EXECUTABLE_WRITE.test(code) || MYSQL_EXECUTABLE_INTO.test(code))) return true;
  const copy = /^\s*copy\b/iu.exec(code);
  if (copy !== null) {
    if (/\bto\s+program\b/iu.test(code)) return true;
    if (code.slice(copy[0].length).trimStart().startsWith("(")) return false;
    return /\bfrom\b/iu.test(code);
  }
  const head = firstWord(code);
  if (head.word === "explain") {
    const body = explainAnalyzeBody(code);
    return body !== null && looksLikeWrite(body, dialect);
  }
  if (head.word === "with") {
    const clause = withWriteParts(code);
    if (clause === null) return true;
    if (clause.bodies.some((body) => looksLikeWrite(body, dialect))) return true;
    return looksLikeWrite(clause.statement, dialect);
  }
  if (head.word === "do" && dialect === "postgres") return true;
  if ((head.word === "begin" || head.word === "declare") && (dialect === "oracle" || dialect === "oceanbase-oracle")) {
    return true;
  }
  if (dialect === "mssql" && (head.word === "begin" || head.word === "if" || head.word === "while")) {
    return MSSQL_WRITE_WORD.test(head.rest) || SELECT_INTO_TABLE.test(head.rest);
  }
  if (head.word === "select" || head.word === "values") {
    return SELECT_INTO_FILE.test(code) || SELECT_INTO_TABLE.test(code);
  }
  return WRITE_STATEMENT.test(code);
}
function looksLikeWrite(sql, dialect = "generic") {
  return splitStatements(sql, dialect).some((statement) => {
    const code = maskNonCode(statement, dialect, false, true).trim();
    return code !== "" && looksLikeWriteCode(code, dialect);
  });
}
var DDL_STATEMENT = /^\s*(create|alter|drop|rename|truncate|comment)\b/i;
var MSSQL_RENAME = /\bexec(?:ute)?\s+(?:@\w+\s*=\s*)?(?:\[?dbo\]?\.)?\[?sp_rename\]?\b/iu;
var MSSQL_DYNAMIC_SQL = /\bexec(?:ute)?\s*(?:@\w+\s*=\s*)?(?:\(|(?:\[?dbo\]?\.)?\[?sp_executesql\]?|@\w+\b(?!\s*=))/iu;
function selectCreatesTable(code) {
  return /^\s*select\b/iu.test(code) && SELECT_INTO_TABLE.test(code);
}
function looksLikeDdl(sql, dialect = "generic") {
  return splitStatements(sql, dialect).some((statement) => {
    const code = maskNonCode(statement, dialect, false, true).trim();
    if (dialect === "mysql" && MYSQL_EXECUTABLE_DDL.test(code)) return true;
    if (code === "") return false;
    const analyzed = unwrapExplainAnalyze(code);
    if (DDL_STATEMENT.test(analyzed)) return true;
    if (dialect === "postgres" && /^\s*do\b/iu.test(analyzed)) return true;
    if ((dialect === "oracle" || dialect === "oceanbase-oracle") && /^\s*(?:begin|declare)\b/iu.test(analyzed)) {
      return true;
    }
    if (dialect === "mssql" && MSSQL_RENAME.test(analyzed)) return true;
    if (dialect === "mssql" && MSSQL_DYNAMIC_SQL.test(analyzed)) return true;
    if (dialect === "mssql" && /^\s*(?:begin|if|while)\b/iu.test(analyzed)) {
      return /\b(?:create|alter|drop|rename|truncate)\b/iu.test(analyzed) || SELECT_INTO_TABLE.test(analyzed);
    }
    return selectCreatesTable(withWriteParts(analyzed)?.statement ?? analyzed);
  });
}
function redisCommandName(command) {
  const match = /^\s*([a-zA-Z][a-zA-Z0-9_]*)/.exec(command);
  return match?.[1]?.toLowerCase() ?? "";
}
function looksLikeRedisWrite(command) {
  const name2 = redisCommandName(command);
  return name2 !== "" && !isRedisReadCommand(name2);
}
function objectKindLabel(kind) {
  if (kind === "table") return "表";
  if (kind === "view") return "视图";
  if (kind === "procedure") return "存储过程";
  if (kind === "function") return "函数";
  if (kind === "sequence") return "序列";
  if (kind === "trigger") return "触发器";
  return "对象";
}
function stringifyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
var COUNT_FORMAT = new Intl.NumberFormat("en-US");
function formatCount(value) {
  if (!Number.isFinite(value) || value < 0) return "—";
  return COUNT_FORMAT.format(value);
}

// src/shared/dialect.ts
function sqlDialectOf(dialect) {
  return dialect === "redis" ? "generic" : dialect ?? "generic";
}

// src/client/tablesql.ts
function columnFilter(filters, name2) {
  return Object.hasOwn(filters, name2) ? filters[name2] : void 0;
}
function withColumnFilter(filters, name2, filter) {
  const next = Object.assign(/* @__PURE__ */ Object.create(null), filters);
  if (filter === void 0) delete next[name2];
  else next[name2] = filter;
  return next;
}
function quoteIdent(dialect, name2) {
  if (dialect === "mysql") return `\`${name2.replaceAll("`", "``")}\``;
  if (dialect === "mssql") return `[${name2.replaceAll("]", "]]")}]`;
  return `"${name2.replaceAll('"', '""')}"`;
}
function qualifiedName(dialect, schema, table) {
  const tableName = quoteIdent(dialect, table);
  return schema === "" ? tableName : `${quoteIdent(dialect, schema)}.${tableName}`;
}
function orderByForPaging(dialect, orderBy) {
  if (orderBy !== "") return ` ORDER BY ${orderBy}`;
  return dialect === "mssql" ? " ORDER BY (SELECT NULL)" : "";
}
function pageClause(dialect, limit, offset) {
  if (dialect === "oracle" || dialect === "oceanbase-oracle" || dialect === "mssql") {
    return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
  }
  return `LIMIT ${limit} OFFSET ${offset}`;
}
var WHERE_PATTERN = /^WHERE\b/iu;
function stripWhere(text2) {
  const trimmed = text2.trim().replace(/[\s;]+$/u, "");
  if (trimmed === "") return "";
  return trimmed.replace(WHERE_PATTERN, "").trim();
}
function tableSelectSql(dialect, schema, table, where, orderBy, limit) {
  const from = qualifiedName(dialect, schema, table);
  const whereSql = where.trim() === "" ? "" : ` WHERE ${where.trim()}`;
  const orderSql = orderByForPaging(dialect, orderBy.trim());
  const size = Math.max(1, Math.trunc(limit) || 1);
  return `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, size, 0)}`;
}
function columnNames(dialect, columns) {
  return columns.map((column) => quoteIdent(dialect, column.name)).join(", ");
}
function selectColumnsSql(dialect, schema, table, columns) {
  const list = columns.map((column) => quoteIdent(dialect, column.name)).join(", ");
  return `SELECT ${list === "" ? "*" : list} FROM ${qualifiedName(dialect, schema, table)}`;
}
function isNumericType(typeName) {
  const withoutParams = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase();
  if (withoutParams.endsWith("[]")) return false;
  const base = withoutParams.split(/\s+/u, 1)[0] ?? "";
  return /^(?:(?:tiny|small|medium|big)?int[248]?|integer|int[248]|(?:big|small)?serial[248]?|decimal|numeric|float[48]?|double|number|real)$/u.test(
    base
  );
}
function isTemporalType(typeName, dialect) {
  if (typeName === void 0) return false;
  const base = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase();
  if (dialect === "mssql" && (base === "timestamp" || base === "rowversion")) return false;
  return /^(?:date|datetime2?|datetimeoffset|smalldatetime|timestamp(?:tz|ltz)?(?:\s+(?:with|without)(?:\s+local)?\s+time\s+zone)?)$/u.test(
    base
  );
}
function isJsonType(typeName) {
  if (typeName === void 0) return false;
  const base = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase();
  return /^(?:json|jsonb)$/u.test(base);
}
function isBinaryType(typeName, dialect) {
  if (typeName === void 0) return false;
  const base = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase();
  const normalized = sqlDialectOf(dialect);
  if (normalized === "mssql" && (base === "timestamp" || base === "rowversion")) return true;
  if (/^(?:geometry|geography|point|linestring|polygon|multipoint|multilinestring|multipolygon|geometrycollection|geomcollection)$/u.test(base)) {
    return normalized === "mysql" || normalized === "mssql";
  }
  return /^(?:binary|varbinary|blob|tinyblob|mediumblob|longblob|bytea|image|raw|long raw)$/u.test(base);
}
function isBinaryValue(value) {
  return typeof value === "string" && /^<binary \d+ bytes>$/u.test(value);
}
function isBinaryCell(column, value, dialect) {
  if (value === null) return false;
  if (isBinaryType(column.typeName, dialect)) return true;
  return !isTextType(column.typeName) && isBinaryValue(value);
}
function isTextType(typeName) {
  if (typeName === void 0) return false;
  const base = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase();
  return /^(?:bpchar|character(?: varying)?|char(?:acter)?|varchar2?|nvarchar2?|nchar|(?:tiny|medium|long)?text|ntext|n?clob|enum|set|citext)$/u.test(
    base
  );
}
function oracleTimestampText(name2, typeName) {
  if (typeName.includes("local time zone")) {
    return `INITCAP(REGEXP_REPLACE(REGEXP_REPLACE(TO_CHAR(${name2}, 'YYYY-MM-DD HH24:MI:SS.FF TZR'), '0+ ([^ ]+)$', ' \\1'), '\\. ([^ ]+)$', '.0 \\1'))`;
  }
  if (typeName.includes("with time zone")) {
    return `REGEXP_REPLACE(RTRIM(TO_CHAR(${name2}, 'YYYY-MM-DD HH24:MI:SS.FF'), '0'), '\\.$', '.0') || ' ' || REGEXP_REPLACE(TO_CHAR(${name2}, 'TZH:TZM'), '^([+-])0([0-9]:)', '\\1\\2')`;
  }
  return `RTRIM(RTRIM(TO_CHAR(${name2}, 'YYYY-MM-DD HH24:MI:SS.FF'), '0'), '.')`;
}
function textExpression(dialect, name2, typeName) {
  if (typeName !== void 0 && isTemporalType(typeName, dialect)) {
    if (dialect === "oracle" || dialect === "oceanbase-oracle") {
      const lower = typeName.toLowerCase();
      if (lower.startsWith("timestamp")) return oracleTimestampText(name2, lower);
      return `TO_CHAR(${name2}, 'YYYY-MM-DD HH24:MI:SS')`;
    }
    if (dialect === "dameng") return `TO_CHAR(${name2}, 'YYYY-MM-DD HH24:MI:SS')`;
    if (dialect === "mssql") {
      const base = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase();
      if (base.startsWith("datetimeoffset")) return `CONVERT(VARCHAR(34), ${name2}, 121)`;
      if (base.startsWith("datetime2")) return `CONVERT(VARCHAR(27), ${name2}, 121)`;
      return `CONVERT(VARCHAR(23), ${name2}, 121)`;
    }
  }
  if (dialect === "mysql") return `CAST(${name2} AS CHAR)`;
  if (dialect === "mssql") return `CAST(${name2} AS NVARCHAR(MAX))`;
  if (dialect === "oracle" || dialect === "oceanbase-oracle" || dialect === "dameng") {
    return `TO_CHAR(${name2})`;
  }
  if (dialect === "sqlite") return `CAST(${name2} AS TEXT)`;
  if (dialect === "postgres") return `CAST(${name2} AS TEXT)`;
  return `CAST(${name2} AS VARCHAR(4000))`;
}
function temporalLiteral(dialect, typeName, text2) {
  const literal = quoteLiteral(text2, dialect);
  if (!isTemporalType(typeName, dialect)) return literal;
  if (dialect !== "oracle" && dialect !== "oceanbase-oracle" && dialect !== "dameng") return literal;
  if (!/^\d{4}-\d{2}-\d{2}/u.test(text2)) return literal;
  const type = typeName.toLowerCase();
  const base = typeName.replace(/[\s(].*$/u, "").toLowerCase();
  const escaped = text2.replace(/'/gu, "''");
  const zone = /(?:[+-]\d{1,2}:\d{2}|Z)$/u.exec(text2);
  const hasZone = zone !== null;
  const local = hasZone ? text2.slice(0, zone.index) : text2;
  const hasSeconds = /\d{2}:\d{2}:\d{2}/u.test(local);
  const hasTime = /\d{2}:\d{2}/u.test(local);
  const hasFraction = hasSeconds && /\.\d+/u.test(local);
  const timeFormat = hasTime ? hasSeconds ? " HH24:MI:SS" : " HH24:MI" : "";
  if (base.startsWith("timestamp")) {
    if (type.includes("local time zone") && !hasZone && /[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/u.test(text2)) {
      const format2 = `YYYY-MM-DD${timeFormat}${hasFraction ? ".FF" : ""} TZR`;
      return `TO_TIMESTAMP_TZ('${escaped}', '${format2}')`;
    }
    if (hasZone) {
      const format2 = `YYYY-MM-DD${timeFormat}${hasFraction ? ".FF" : ""} TZH:TZM`;
      return `TO_TIMESTAMP_TZ('${escaped}', '${format2}')`;
    }
    const format = `YYYY-MM-DD${timeFormat}${hasFraction ? ".FF" : ""}`;
    return `TO_TIMESTAMP('${escaped}', '${format}')`;
  }
  return `TO_DATE('${escaped}', 'YYYY-MM-DD${timeFormat}')`;
}
function quoteLiteral(text2, dialect = "generic", unicode = false) {
  const escaped = dialect === "mysql" ? text2.replace(/\\/gu, "\\\\") : text2;
  const literal = `'${escaped.replace(/'/gu, "''")}'`;
  return dialect === "mssql" && unicode ? `N${literal}` : literal;
}
function isUnicodeText(typeName) {
  if (typeName === void 0) return false;
  const base = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase().split(/\s+/u, 1)[0] ?? "";
  return /^(?:nchar|nvarchar|ntext|sysname)$/u.test(base);
}
function insertStatement(dialect, schema, table, columns, row) {
  const selected = columns.map((column, index) => ({ column, index })).filter(
    (entry) => entry.column.generated !== true && !isMssqlRowVersion(entry.column.typeName, dialect) && // The bridge only returns `<binary N bytes>` for binary cells, so a
    // placeholder cannot become a real INSERT value. Null binary cells
    // still export as NULL; text columns keep such a literal string.
    !isBinaryCell(entry.column, row[entry.index] ?? null, dialect)
  );
  if (selected.length === 0) {
    return `-- ${qualifiedName(dialect, schema, table)} 只有二进制或生成列，未导出 INSERT`;
  }
  const names = selected.map((entry) => quoteIdent(dialect, entry.column.name)).join(", ");
  const values = selected.map((entry) => insertLiteral(dialect, entry.column, row[entry.index] ?? null)).join(", ");
  return `INSERT INTO ${qualifiedName(dialect, schema, table)} (${names}) VALUES (${values});`;
}
function booleanLiteral(dialect, value) {
  if (dialect === "mssql" || dialect === "oracle" || dialect === "oceanbase-oracle") return value ? "1" : "0";
  return value ? "TRUE" : "FALSE";
}
function isMssqlRowVersion(typeName, dialect) {
  if (dialect !== "mssql" || typeName === void 0) return false;
  const base = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase();
  return base === "timestamp" || base === "rowversion";
}
function isBooleanType(typeName, dialect) {
  if (typeName === void 0) return false;
  const base = typeName.replace(/\([^)]*\)/gu, "").trim().toLowerCase().split(/\s+/u)[0] ?? "";
  if (base === "bool" || base === "boolean") return true;
  if (base === "bit") {
    return dialect === "mysql" || dialect === "mssql";
  }
  return dialect === "mysql" && base === "tinyint";
}
function insertLiteral(dialect, column, value) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return booleanLiteral(dialect, value);
  if (typeof value === "number") return String(value);
  const text2 = String(value);
  if (isTemporalType(column.typeName, dialect)) return temporalLiteral(dialect, column.typeName, text2);
  if (isNumericType(column.typeName) && /^[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/u.test(text2)) return text2;
  return quoteLiteral(text2, dialect, isUnicodeText(column.typeName));
}
function insertStatements(dialect, schema, table, columns, rows) {
  if (rows.length === 0) return "";
  return `${rows.map((row) => insertStatement(dialect, schema, table, columns, row)).join("\n")}
`;
}
function skipSpaces(text2, index) {
  let cursor = index;
  while (cursor < text2.length && /\s/u.test(text2[cursor] ?? "")) cursor += 1;
  return cursor;
}
function readTableIdentifier(text2, index) {
  const start = skipSpaces(text2, index);
  const open = text2[start];
  if (open === "[" || open === '"' || open === "`") {
    const close = open === "[" ? "]" : open;
    let cursor2 = start + 1;
    let value = "";
    while (cursor2 < text2.length) {
      const char = text2[cursor2] ?? "";
      if (char === close) {
        if (text2[cursor2 + 1] === close) {
          value += close;
          cursor2 += 2;
          continue;
        }
        return { value, end: cursor2 + 1 };
      }
      value += char;
      cursor2 += 1;
    }
    return null;
  }
  let cursor = start;
  while (cursor < text2.length && /[\p{L}\p{N}_$#]/u.test(text2[cursor] ?? "")) cursor += 1;
  if (cursor === start) return null;
  return { value: text2.slice(start, cursor), end: cursor };
}
function tableFromStatement(statement, dialect = "generic") {
  const code = maskNonCode(statement, dialect, true);
  const keyword = /\b(?:from|join|update|into)\b/giu;
  const depthAt = new Int32Array(code.length);
  let depth = 0;
  for (let index = 0; index < code.length; index += 1) {
    depthAt[index] = depth;
    if (code[index] === "(") depth += 1;
    else if (code[index] === ")") depth = Math.max(0, depth - 1);
  }
  const readAt = (topLevelOnly) => {
    keyword.lastIndex = 0;
    let match;
    while ((match = keyword.exec(code)) !== null) {
      if (topLevelOnly && depthAt[match.index] !== 0) continue;
      const parts = [];
      let token = readTableIdentifier(statement, keyword.lastIndex);
      while (token !== null) {
        const word = token.value.toLowerCase();
        if (word === "only" && dialect === "postgres") {
          token = readTableIdentifier(statement, token.end);
          continue;
        }
        if (word === "lateral" && (dialect === "postgres" || dialect === "mysql")) {
          const next = skipSpaces(statement, token.end);
          token = statement[next] === "(" ? null : readTableIdentifier(statement, token.end);
          continue;
        }
        break;
      }
      if (token === null) continue;
      let end = token.end;
      while (token !== null) {
        parts.push(token.value);
        end = token.end;
        const dot = skipSpaces(statement, token.end);
        if (statement[dot] !== ".") break;
        token = readTableIdentifier(statement, dot + 1);
      }
      if (parts.length === 0) continue;
      if ((match[0].toLowerCase() === "from" || match[0].toLowerCase() === "join") && statement[skipSpaces(statement, end)] === "(") continue;
      return {
        schema: parts.length >= 2 ? parts[parts.length - 2] ?? "" : "",
        table: parts[parts.length - 1] ?? ""
      };
    }
    return null;
  };
  return readAt(true) ?? readAt(false);
}
function escapeLikeText(text2) {
  return text2.replace(/[!%_]/gu, (char) => `!${char}`);
}
function filterExpression(dialect, column, filter) {
  const name2 = quoteIdent(dialect, column.name);
  if (filter.op === "isnull") return `${name2} IS NULL`;
  const text2 = filter.text.trim();
  if (text2 === "") return void 0;
  if (filter.op === "eq") {
    if (isBooleanType(column.typeName, dialect) && /^(?:true|false)$/iu.test(text2)) {
      return `${name2} = ${booleanLiteral(dialect, text2.toLowerCase() === "true")}`;
    }
    if (isNumericType(column.typeName) && /^-?\d+(?:\.\d+)?$/u.test(text2)) return `${name2} = ${text2}`;
    if (isTemporalType(column.typeName, dialect)) return `${name2} = ${temporalLiteral(dialect, column.typeName, text2)}`;
    if (isJsonType(column.typeName)) {
      return `${textExpression(dialect, name2, column.typeName)} = ${quoteLiteral(text2, dialect, isUnicodeText(column.typeName))}`;
    }
    return `${name2} = ${quoteLiteral(text2, dialect, isUnicodeText(column.typeName))}`;
  }
  const target = isTextType(column.typeName) ? name2 : textExpression(dialect, name2, column.typeName);
  const pattern = quoteLiteral(`%${escapeLikeText(text2)}%`, dialect, isUnicodeText(column.typeName));
  if ((dialect === "oracle" || dialect === "oceanbase-oracle") && column.typeName !== void 0 && column.typeName.toLowerCase().includes("local time zone")) {
    return `UPPER(${target}) LIKE UPPER(${pattern}) ESCAPE '!'`;
  }
  return `${target} LIKE ${pattern} ESCAPE '!'`;
}
function cellWhere(dialect, column, value) {
  const name2 = quoteIdent(dialect, column.name);
  if (value === null) return `${name2} IS NULL`;
  if (typeof value === "number" || typeof value === "bigint") return `${name2} = ${String(value)}`;
  if (typeof value === "boolean") return `${name2} = ${booleanLiteral(dialect, value)}`;
  if (typeof value === "string" && isTemporalType(column.typeName, dialect)) {
    return `${name2} = ${temporalLiteral(dialect, column.typeName, value)}`;
  }
  if (typeof value === "string" && isJsonType(column.typeName)) {
    return `${textExpression(dialect, name2, column.typeName)} = ${quoteLiteral(value, dialect, isUnicodeText(column.typeName))}`;
  }
  return `${name2} = ${quoteLiteral(String(value), dialect, isUnicodeText(column.typeName))}`;
}
function groupCountSql(dialect, schema, table, column) {
  const name2 = quoteIdent(dialect, column.name);
  const count = quoteIdent(dialect, "count");
  return `SELECT ${name2}, COUNT(*) AS ${count} FROM ${qualifiedName(dialect, schema, table)} GROUP BY ${name2} ORDER BY ${count} DESC`;
}
function inListOf(dialect, rows, index, column) {
  const literals = rows.map((row) => {
    const value = row[index] ?? null;
    if (column !== void 0) return insertLiteral(dialect, column, value);
    if (value === null || value === void 0) return "NULL";
    if (typeof value === "number" || typeof value === "bigint") return String(value);
    if (typeof value === "boolean") return booleanLiteral(dialect, value);
    return quoteLiteral(String(value), dialect);
  });
  return `(${literals.join(", ")})`;
}
function composeWhere(dialect, base, columns, filters) {
  const parts = [];
  const manual = stripWhere(base);
  if (manual !== "") parts.push(`(${manual})`);
  for (const column of columns) {
    const filter = columnFilter(filters, column.name);
    if (filter === void 0) continue;
    const expression = filterExpression(dialect, column, filter);
    if (expression !== void 0) parts.push(expression);
  }
  return parts.join(" AND ");
}

// src/client/export.ts
function spreadsheetSafe(text2) {
  if (!/^[=+\-@\t\r\n]/u.test(text2)) return text2;
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u.test(text2)) return text2;
  return `'${text2}`;
}
function csvCell(value) {
  const text2 = spreadsheetSafe(formatCell(value));
  if (/[",\r\n]/u.test(text2)) return `"${text2.replace(/"/gu, '""')}"`;
  return text2;
}
function toCsv(columns, rows) {
  const head = columns.map((column) => csvCell(column.name)).join(",");
  const body = rows.map((row) => columns.map((_, index) => csvCell(row[index] ?? null)).join(","));
  return `${[head, ...body].join("\r\n")}\r
`;
}
function tsvCell(value) {
  return spreadsheetSafe(formatCell(value)).replace(/[\t\r\n]+/gu, " ");
}
function toTsv(columns, rows) {
  const head = columns.map((column) => tsvCell(column.name)).join("	");
  const body = rows.map((row) => columns.map((_, index) => tsvCell(row[index] ?? null)).join("	"));
  return `${[head, ...body].join("\n")}
`;
}
function jsonValue(value) {
  if (typeof value === "bigint") {
    return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  return value;
}
function uniqueKeys(columns) {
  const used = /* @__PURE__ */ new Set();
  return columns.map((column) => {
    let key = column.name;
    let suffix = 2;
    while (used.has(key)) {
      key = `${column.name}_${suffix}`;
      suffix += 1;
    }
    used.add(key);
    return key;
  });
}
function toJson(columns, rows) {
  const keys = uniqueKeys(columns);
  const records = rows.map((row) => {
    const record = /* @__PURE__ */ Object.create(null);
    keys.forEach((key, index) => {
      record[key] = jsonValue(row[index] ?? null);
    });
    return record;
  });
  return JSON.stringify(records, null, 2);
}
function renderExport(format, input) {
  switch (format) {
    case "csv":
      return { text: toCsv(input.columns, input.rows), mime: "text/csv" };
    case "json":
      return { text: toJson(input.columns, input.rows), mime: "application/json" };
    case "sql":
      return {
        text: insertStatements(input.dialect, input.schema, input.table, input.columns, input.rows),
        mime: "application/sql"
      };
    case "md":
      return { text: toMarkdown(input.columns, input.rows), mime: "text/markdown" };
  }
}
function markdownCell(value) {
  return formatCell(value).replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|").replace(/\r\n?|\n/gu, "<br>");
}
function toMarkdown(columns, rows) {
  const head = `| ${columns.map((column) => markdownCell(column.name)).join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((_, index) => markdownCell(row[index] ?? null)).join(" | ")} |`);
  return `${[head, divider, ...body].join("\n")}
`;
}
function safeFilename(filename, fallback = "download") {
  let cleaned = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/gu, "_").replace(/[. ]+$/u, "").trim();
  if (cleaned === "") return fallback;
  if (/^\.+/u.test(cleaned)) cleaned = `_${cleaned.replace(/^\.+/u, "")}`;
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(cleaned)) cleaned = `_${cleaned}`;
  return cleaned;
}
function downloadText(filename, mime, text2) {
  const bom = mime.startsWith("text/csv") ? "\uFEFF" : "";
  const blob = new Blob([bom, text2], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeFilename(filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e4);
}
function exportFilename(schema, table, format, now = /* @__PURE__ */ new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const base = schema === "" ? table : `${schema}.${table}`;
  return `${base}-${stamp}.${format}`;
}

// src/client/hooks/useDataSources.ts
var import_react = require("react");

// src/client/prefs.ts
function readAllowedNumber(key, allowed, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw.trim() === "") return fallback;
    const stored = Number(raw);
    return Number.isFinite(stored) && allowed.includes(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
}
function writeNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
  }
}
function readFlag(key, fallback = false) {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "1") return true;
    if (stored === "0") return false;
    return fallback;
  } catch {
    return fallback;
  }
}
function writeFlag(key, value) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
  }
}
function readText(key, fallback = "") {
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null || stored === "" ? fallback : stored;
  } catch {
    return fallback;
  }
}
function writeText(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
  }
}

// src/client/dragorder.ts
function moveId(ids, id, targetId, after) {
  const from = ids.indexOf(id);
  const target = ids.indexOf(targetId);
  if (from < 0 || target < 0 || id === targetId) return null;
  const next = ids.filter((entry) => entry !== id);
  const insert = next.indexOf(targetId) + (after ? 1 : 0);
  if (insert === from) return null;
  next.splice(insert, 0, id);
  return next;
}
function orderById(items, ids) {
  const remaining = new Map(items.map((item) => [item.id, item]));
  const ordered = [];
  for (const id of ids) {
    const item = remaining.get(id);
    if (item === void 0) continue;
    remaining.delete(id);
    ordered.push(item);
  }
  return ordered.concat(items.filter((item) => remaining.has(item.id)));
}

// src/client/hooks/useDataSources.ts
var LAST_CONNECTION_KEY = "dsh-ide-database.last-connection.v1";
var SETUP_ERROR_CODES = /* @__PURE__ */ new Set(["java-missing", "jar-missing", "bridge", "driver-missing"]);
function setupErrorOf(error) {
  if (!(error instanceof ApiError) || !SETUP_ERROR_CODES.has(error.code)) return null;
  return { code: error.code, message: error.message };
}
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
var VISIBLE_SCHEMAS_KEY = "dsh-ide-database:visible-schemas:";
var VISIBLE_REDIS_DBS_KEY = "dsh-ide-database:visible-redis-dbs:";
function readStoredList(key) {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item) => typeof item === "string");
  } catch {
    return null;
  }
}
function writeStoredList(key, value) {
  try {
    if (typeof localStorage === "undefined") return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function readStoredDbs(key) {
  const stored = readStoredList(key);
  if (stored === null) return null;
  return stored.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0);
}
function writeStoredDbs(key, value) {
  writeStoredList(key, value === null ? null : value.map(String));
}
function defaultVisibleSchemas(connection, schemas) {
  if (schemas.length === 0) return null;
  for (const name2 of [connection.database, connection.user]) {
    if (name2 === "") continue;
    const match = schemas.find((schema) => schema.name.toLowerCase() === name2.toLowerCase());
    if (match !== void 0) return [match.name];
  }
  return null;
}
function useDataSources(notify) {
  const [snapshot, setSnapshot] = (0, import_react.useState)(null);
  const [loadError, setLoadError] = (0, import_react.useState)("");
  const [setupError, setSetupError] = (0, import_react.useState)(null);
  const [selectedId, setSelectedId] = (0, import_react.useState)("");
  const [servers, setServers] = (0, import_react.useState)({});
  const [connectingId, setConnectingId] = (0, import_react.useState)("");
  const [schemas, setSchemas] = (0, import_react.useState)({});
  const [objects, setObjects] = (0, import_react.useState)({});
  const [expanded, setExpanded] = (0, import_react.useState)({});
  const [loadingSchemas, setLoadingSchemas] = (0, import_react.useState)({});
  const [loadingObjects, setLoadingObjects] = (0, import_react.useState)({});
  const [cachedAt, setCachedAt] = (0, import_react.useState)({});
  const [descriptions, setDescriptions] = (0, import_react.useState)({});
  const [loadingDescriptions, setLoadingDescriptions] = (0, import_react.useState)({});
  const [detail, setDetail] = (0, import_react.useState)(null);
  const [detailLoading, setDetailLoading] = (0, import_react.useState)(false);
  const [selectedKey, setSelectedKey] = (0, import_react.useState)("");
  const [selectedSchema, setSelectedSchema] = (0, import_react.useState)("");
  const [redisKeys, setRedisKeys] = (0, import_react.useState)({});
  const [redisCursor, setRedisCursor] = (0, import_react.useState)({});
  const [loadingRedisKeys, setLoadingRedisKeys] = (0, import_react.useState)({});
  const [redisDatabases, setRedisDatabases] = (0, import_react.useState)({});
  const [redisDbs, setRedisDbs] = (0, import_react.useState)({});
  const [visibleSchemas, setVisibleSchemas] = (0, import_react.useState)({});
  const [redisDetail, setRedisDetail] = (0, import_react.useState)(null);
  const [redisDetailDb, setRedisDetailDb] = (0, import_react.useState)(-1);
  const [redisDetailLoading, setRedisDetailLoading] = (0, import_react.useState)(false);
  const redisRequest = (0, import_react.useRef)(0);
  const detailRequest = (0, import_react.useRef)(0);
  const selectedRef = (0, import_react.useRef)(selectedId);
  selectedRef.current = selectedId;
  const refresh = (0, import_react.useCallback)(async () => {
    try {
      const data = await api.status();
      setSnapshot({
        connections: data.config.connections,
        trash: data.config.trash,
        drivers: data.drivers,
        settings: data.config.settings,
        env: data.env,
        prefetch: data.prefetch ?? []
      });
      setLoadError("");
    } catch (error) {
      setLoadError(errorText(error));
    }
  }, []);
  (0, import_react.useEffect)(() => {
    void refresh();
  }, [refresh]);
  (0, import_react.useEffect)(() => {
    if ((snapshot?.prefetch.length ?? 0) === 0) return;
    const timer = window.setInterval(() => {
      void refresh();
    }, 1500);
    return () => {
      window.clearInterval(timer);
    };
  }, [snapshot?.prefetch.length, refresh]);
  const applyStructures = (0, import_react.useCallback)((structures) => {
    const nextSchemas = {};
    const nextObjects = {};
    const nextCached = {};
    const nextDescriptions = {};
    const nextRedisKeys = {};
    const nextRedisCursor = {};
    const nextRedisDatabases = {};
    for (const [connectionId, entry] of Object.entries(structures)) {
      if (entry.schemas.length > 0) nextSchemas[connectionId] = entry.schemas;
      for (const [schema, list] of Object.entries(entry.objects)) {
        nextObjects[`${connectionId}:${schema}`] = list;
      }
      for (const [key, description] of Object.entries(entry.descriptions ?? {})) {
        nextDescriptions[`${connectionId}|${key}`] = description;
      }
      if (entry.redis !== void 0) {
        nextRedisDatabases[connectionId] = entry.redis.databases;
        const keys = {};
        const cursors = {};
        for (const [db, cache] of Object.entries(entry.redis.dbs)) {
          keys[db] = cache.keys;
          cursors[db] = cache.cursor;
        }
        nextRedisKeys[connectionId] = keys;
        nextRedisCursor[connectionId] = cursors;
        const cachedDbs = Object.keys(keys).map(Number).filter((db) => Number.isInteger(db) && db >= 0).sort((left, right) => left - right);
        setRedisDbs((previous) => {
          if (previous[connectionId] !== void 0) return previous;
          const stored = readStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connectionId}`);
          const chosen = stored ?? (cachedDbs.length > 0 ? cachedDbs : [0]);
          return { ...previous, [connectionId]: chosen };
        });
      }
      nextCached[connectionId] = entry.fetchedAt;
    }
    setSchemas((previous) => ({ ...nextSchemas, ...previous }));
    setObjects((previous) => ({ ...nextObjects, ...previous }));
    setDescriptions((previous) => ({ ...nextDescriptions, ...previous }));
    setCachedAt((previous) => ({ ...nextCached, ...previous }));
    setRedisDatabases((previous) => ({ ...nextRedisDatabases, ...previous }));
    setRedisKeys((previous) => ({ ...nextRedisKeys, ...previous }));
    setRedisCursor((previous) => ({ ...nextRedisCursor, ...previous }));
  }, []);
  (0, import_react.useEffect)(() => {
    let alive = true;
    void (async () => {
      try {
        const { structures } = await api.structure();
        if (!alive) return;
        applyStructures(structures);
      } catch {
      }
    })();
    return () => {
      alive = false;
    };
  }, [applyStructures]);
  (0, import_react.useEffect)(() => {
    if (!snapshot) return;
    const exists = snapshot.connections.some((connection) => connection.id === selectedId);
    if (!exists) {
      const stored = readText(LAST_CONNECTION_KEY);
      const preferred = snapshot.connections.find((connection) => connection.id === stored);
      setSelectedId((preferred ?? snapshot.connections[0])?.id ?? "");
      setServers({});
      setDetail(null);
      setRedisDetail(null);
      setSelectedKey("");
    }
  }, [snapshot, selectedId]);
  const connections = snapshot?.connections ?? [];
  const trash = snapshot?.trash ?? [];
  const selected = connections.find((connection) => connection.id === selectedId);
  const server = selected ? servers[selected.id] : void 0;
  const connectionsRef = (0, import_react.useRef)(connections);
  connectionsRef.current = connections;
  const schemasRef = (0, import_react.useRef)(schemas);
  schemasRef.current = schemas;
  const visibleSchemasRef = (0, import_react.useRef)(visibleSchemas);
  visibleSchemasRef.current = visibleSchemas;
  const expandedRef = (0, import_react.useRef)(expanded);
  expandedRef.current = expanded;
  const objectsRef = (0, import_react.useRef)(objects);
  objectsRef.current = objects;
  const loadingObjectsRef = (0, import_react.useRef)(loadingObjects);
  loadingObjectsRef.current = loadingObjects;
  const descriptionsRef = (0, import_react.useRef)(descriptions);
  descriptionsRef.current = descriptions;
  const serversRef = (0, import_react.useRef)(servers);
  serversRef.current = servers;
  const schedulePrefetch = (0, import_react.useCallback)(
    (connectionId, refreshAll, selection) => {
      const connection = connectionsRef.current.find((item) => item.id === connectionId);
      if (connection === void 0 || connection.dialect === "redis") return;
      const visible = selection === void 0 ? visibleSchemasRef.current[connectionId] : selection;
      const names = schemasRef.current[connectionId]?.map((schema) => schema.name) ?? [];
      const schemas2 = visible === null || visible === void 0 ? names.length > 0 ? names : void 0 : visible;
      void api.prefetchConnection(connectionId, { refresh: refreshAll, schemas: schemas2 }).catch(() => void 0);
    },
    []
  );
  (0, import_react.useEffect)(() => {
    if (!snapshot) return;
    const missing = {};
    for (const connection of snapshot.connections) {
      if (connection.dialect !== "redis" || redisDbs[connection.id] !== void 0) continue;
      const stored = readStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connection.id}`);
      const cached = Object.keys(redisKeys[connection.id] ?? {}).map(Number).filter((db) => Number.isInteger(db) && db >= 0).sort((left, right) => left - right);
      missing[connection.id] = stored ?? (cached.length > 0 ? cached : [connection.redisDb]);
    }
    if (Object.keys(missing).length > 0) setRedisDbs((previous) => ({ ...missing, ...previous }));
  }, [snapshot, redisDbs, redisKeys]);
  (0, import_react.useEffect)(() => {
    if (!snapshot) return;
    const missing = {};
    for (const connection of snapshot.connections) {
      if (connection.dialect === "redis" || visibleSchemas[connection.id] !== void 0) continue;
      const stored = readStoredList(`${VISIBLE_SCHEMAS_KEY}${connection.id}`);
      if (stored !== null) missing[connection.id] = stored;
    }
    if (Object.keys(missing).length > 0) setVisibleSchemas((previous) => ({ ...missing, ...previous }));
  }, [snapshot, visibleSchemas]);
  (0, import_react.useEffect)(() => {
    if (!snapshot) return;
    const missing = {};
    for (const connection of snapshot.connections) {
      if (connection.dialect === "redis" || visibleSchemas[connection.id] !== void 0) continue;
      const cached = schemas[connection.id];
      if (cached === void 0 || cached.length === 0) continue;
      const chosen = defaultVisibleSchemas(connection, cached);
      writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connection.id}`, chosen);
      missing[connection.id] = chosen;
    }
    if (Object.keys(missing).length > 0) setVisibleSchemas((previous) => ({ ...missing, ...previous }));
  }, [snapshot, visibleSchemas, schemas]);
  const selectConnection = (0, import_react.useCallback)((id) => {
    if (selectedRef.current !== id) {
      setDetail(null);
      setRedisDetail(null);
      setSelectedKey("");
      setSelectedSchema("");
    }
    selectedRef.current = id;
    setSelectedId(id);
    writeText(LAST_CONNECTION_KEY, id);
  }, []);
  const loadSchemas = (0, import_react.useCallback)(
    async (connectionId, refreshObjects = false) => {
      setLoadingSchemas((previous) => ({ ...previous, [connectionId]: true }));
      try {
        const result = await api.schemas(connectionId);
        setSchemas((previous) => ({ ...previous, [connectionId]: result.schemas }));
        if (result.fetchedAt !== void 0) {
          const stamp = result.fetchedAt;
          setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }));
        }
        const stored = readStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`);
        const connection = connectionsRef.current.find((item) => item.id === connectionId);
        let selection = stored ?? visibleSchemasRef.current[connectionId];
        if (selection === void 0 && connection !== void 0) {
          selection = defaultVisibleSchemas(connection, result.schemas);
          writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`, selection);
          setVisibleSchemas((previous) => ({ ...previous, [connectionId]: selection ?? null }));
        }
        schedulePrefetch(connectionId, false, selection);
        const listed = new Set(result.schemas.map((schema) => schema.name));
        const kept = {};
        const open = [];
        for (const [key, value] of Object.entries(expandedRef.current)) {
          if (!key.startsWith(`${connectionId}:`)) {
            kept[key] = value;
            continue;
          }
          const rest = key.slice(connectionId.length + 1);
          const hash = rest.indexOf("#");
          const schema = hash === -1 ? rest : rest.slice(0, hash);
          if (!listed.has(schema)) continue;
          kept[key] = value;
          if (hash === -1 && value === true && schema !== "redis") open.push(schema);
        }
        setExpanded(kept);
        setObjects((previous) => {
          const next = { ...previous };
          for (const key of Object.keys(next)) {
            if (!key.startsWith(`${connectionId}:`)) continue;
            const schema = key.slice(connectionId.length + 1);
            if (!listed.has(schema) || refreshObjects && !open.includes(schema)) delete next[key];
          }
          return next;
        });
        setDescriptions((previous) => {
          const next = { ...previous };
          for (const key of Object.keys(next)) {
            if (key.startsWith(`${connectionId}|`)) delete next[key];
          }
          return next;
        });
        if (open.length > 0) {
          setLoadingObjects((previous) => {
            const next = { ...previous };
            for (const schema of open) next[`${connectionId}:${schema}`] = true;
            return next;
          });
          const refreshed = await Promise.all(
            open.map(async (schema) => {
              try {
                return [schema, await api.objects(connectionId, schema)];
              } catch {
                return void 0;
              }
            })
          );
          setObjects((previous) => {
            const next = { ...previous };
            for (const entry of refreshed) {
              if (entry !== void 0) next[`${connectionId}:${entry[0]}`] = entry[1].objects;
            }
            return next;
          });
          setLoadingObjects((previous) => {
            const next = { ...previous };
            for (const schema of open) delete next[`${connectionId}:${schema}`];
            return next;
          });
        }
      } catch (error) {
        notify(`加载 schema 失败：${errorText(error)}`, "error");
      } finally {
        setLoadingSchemas((previous) => ({ ...previous, [connectionId]: false }));
      }
    },
    [notify, schedulePrefetch]
  );
  const loadRedisDatabases = (0, import_react.useCallback)(async (connectionId) => {
    try {
      const result = await api.redisDatabases(connectionId);
      setRedisDatabases((previous) => ({ ...previous, [connectionId]: result.databases }));
      setRedisDbs((previous) => {
        const current = previous[connectionId];
        if (current === void 0) return previous;
        const pruned = current.filter((db) => db < result.databases);
        if (pruned.length === current.length) return previous;
        const next = pruned.length > 0 ? pruned : [0];
        writeStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connectionId}`, next);
        return { ...previous, [connectionId]: next };
      });
    } catch {
    }
  }, []);
  const loadRedisKeys = (0, import_react.useCallback)(
    async (connectionId, db, more = false) => {
      if (loadingRedisKeys[connectionId]?.[db] === true) return;
      const cursor = more ? redisCursor[connectionId]?.[db] ?? "0" : "0";
      if (more && cursor === "0") return;
      setLoadingRedisKeys((previous) => ({
        ...previous,
        [connectionId]: { ...previous[connectionId] ?? {}, [db]: true }
      }));
      try {
        const result = await api.redisScan({ id: connectionId, db, cursor });
        setRedisKeys((previous) => {
          const byDb = previous[connectionId] ?? {};
          const merged = new Map((more ? byDb[db] ?? [] : []).map((key) => [key.key, key]));
          for (const key of result.keys) merged.set(key.key, key);
          return { ...previous, [connectionId]: { ...byDb, [db]: [...merged.values()] } };
        });
        setRedisCursor((previous) => ({
          ...previous,
          [connectionId]: { ...previous[connectionId] ?? {}, [db]: result.cursor }
        }));
      } catch (error) {
        notify(`扫描 Redis 键失败：${errorText(error)}`, "error");
      } finally {
        setLoadingRedisKeys((previous) => ({
          ...previous,
          [connectionId]: { ...previous[connectionId] ?? {}, [db]: false }
        }));
      }
    },
    [loadingRedisKeys, redisCursor, notify]
  );
  const connect = (0, import_react.useCallback)(
    async (connectionId) => {
      const connection = connections.find((item) => item.id === connectionId);
      if (!connection) return;
      setConnectingId(connectionId);
      try {
        const connected = await api.connect(connectionId);
        setServers((previous) => ({ ...previous, [connectionId]: connected }));
        setSetupError(null);
        notify("连接成功", "success");
        if (connection.dialect === "redis") {
          await loadRedisDatabases(connectionId);
          const shown = redisDbs[connectionId];
          const dbs = shown === void 0 || shown.length === 0 ? [connection.redisDb] : shown;
          if (shown === void 0) setRedisDbs((previous) => ({ ...previous, [connectionId]: dbs }));
          await Promise.all(dbs.map((db) => loadRedisKeys(connectionId, db)));
        } else {
          await loadSchemas(connectionId);
        }
      } catch (error) {
        setSetupError(setupErrorOf(error));
        notify(`连接失败：${errorText(error)}`, "error");
      } finally {
        setConnectingId("");
      }
    },
    [connections, loadSchemas, loadRedisDatabases, loadRedisKeys, redisDbs, notify]
  );
  const disconnect = (0, import_react.useCallback)(
    async (connectionId) => {
      try {
        await api.disconnect(connectionId);
        setServers((previous) => {
          const next = { ...previous };
          delete next[connectionId];
          return next;
        });
        setDetail(null);
        setRedisDetail(null);
        setRedisDetailDb(-1);
        setSelectedKey("");
        notify("已断开", "info");
      } catch (error) {
        notify(`断开失败：${errorText(error)}`, "error");
      }
    },
    [notify]
  );
  const toggleConnection = (0, import_react.useCallback)((id) => {
    setExpanded((previous) => ({ ...previous, [id]: previous[id] !== true }));
  }, []);
  const reorderConnections = (0, import_react.useCallback)((ids) => {
    setSnapshot((previous) => previous ? { ...previous, connections: orderById(previous.connections, ids) } : previous);
    void api.reorderConnections(ids).then((result) => {
      setSnapshot((previous) => previous ? { ...previous, connections: result.config.connections } : previous);
    }).catch((error) => {
      notify(`排序失败：${errorText(error)}`, "error");
      void refresh();
    });
  }, [notify, refresh]);
  const toggleFolder = (0, import_react.useCallback)((connectionId, schema, folder) => {
    const key = `${connectionId}:${schema}#${folder}`;
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }));
  }, []);
  const toggleSchema = (0, import_react.useCallback)(
    async (connectionId, schema) => {
      const key = `${connectionId}:${schema}`;
      const isExpanded = expandedRef.current[key] === true;
      setExpanded((previous) => ({ ...previous, [key]: !isExpanded }));
      if (isExpanded || objectsRef.current[key] !== void 0) return;
      setLoadingObjects((previous) => ({ ...previous, [key]: true }));
      try {
        const result = await api.objects(connectionId, schema);
        setObjects((previous) => ({ ...previous, [key]: result.objects }));
        if (result.fetchedAt !== void 0) {
          const stamp = result.fetchedAt;
          setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }));
        }
      } catch (error) {
        notify(`加载对象失败：${errorText(error)}`, "error");
      } finally {
        setLoadingObjects((previous) => ({ ...previous, [key]: false }));
      }
    },
    [notify]
  );
  const loadObjects = (0, import_react.useCallback)(
    async (connectionId, schema) => {
      const key = `${connectionId}:${schema}`;
      if (objectsRef.current[key] !== void 0 || loadingObjectsRef.current[key] === true) return;
      setLoadingObjects((previous) => ({ ...previous, [key]: true }));
      try {
        const result = await api.objects(connectionId, schema);
        setObjects((previous) => ({ ...previous, [key]: result.objects }));
        if (result.fetchedAt !== void 0) {
          const stamp = result.fetchedAt;
          setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }));
        }
      } catch {
      } finally {
        setLoadingObjects((previous) => ({ ...previous, [key]: false }));
      }
    },
    []
  );
  const selectObject = (0, import_react.useCallback)(
    async (connectionId, schema, object) => {
      const key = `${connectionId}|${schema}.${object.name}`;
      const request = detailRequest.current + 1;
      detailRequest.current = request;
      setSelectedId(connectionId);
      setRedisDetail(null);
      setRedisDetailDb(-1);
      setSelectedKey(key);
      setSelectedSchema(schema);
      const known = descriptionsRef.current[key];
      if (known !== void 0) {
        setDetailLoading(false);
        setDetail(known);
        return;
      }
      if (object.kind !== "table" && object.kind !== "view") {
        setDetailLoading(true);
        setLoadingDescriptions((previous) => ({ ...previous, [key]: true }));
        try {
          const result = await api.ddl(connectionId, schema, object.name, object.kind);
          const described = {
            schema,
            table: object.name,
            kind: object.kind,
            columns: [],
            indexes: [],
            ddl: result.ddl,
            ddlSource: result.source,
            ddlWarnings: result.warnings
          };
          setDescriptions((previous) => ({ ...previous, [key]: described }));
          if (detailRequest.current === request) setDetail(described);
        } catch (error) {
          if (detailRequest.current === request) {
            setDetail({ schema, table: object.name, kind: object.kind, columns: [], indexes: [] });
            if (!serversRef.current[connectionId]) notify(`数据源未连接，连接后可查看${objectKindLabel(object.kind)}定义`, "info");
            else notify(`读取${objectKindLabel(object.kind)}定义失败：${errorText(error)}`, "error");
          }
        } finally {
          if (detailRequest.current === request) setDetailLoading(false);
          setLoadingDescriptions((previous) => ({ ...previous, [key]: false }));
        }
        return;
      }
      setDetailLoading(true);
      setLoadingDescriptions((previous) => ({ ...previous, [key]: true }));
      try {
        const description = await api.describe(connectionId, schema, object.name, object.kind);
        setDescriptions((previous) => ({ ...previous, [key]: description }));
        if (detailRequest.current === request) setDetail(description);
      } catch (error) {
        if (detailRequest.current === request) setDetail(null);
        if (!serversRef.current[connectionId]) notify("数据源未连接，连接后可查看表结构", "info");
        else notify(`读取表结构失败：${errorText(error)}`, "error");
      } finally {
        if (detailRequest.current === request) setDetailLoading(false);
        setLoadingDescriptions((previous) => ({ ...previous, [key]: false }));
      }
    },
    [notify]
  );
  const toggleKey = (0, import_react.useCallback)((key) => {
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }));
  }, []);
  const selectSchema = (0, import_react.useCallback)((connectionId, schema) => {
    detailRequest.current += 1;
    setSelectedId(connectionId);
    setDetail(null);
    setRedisDetail(null);
    setRedisDetailDb(-1);
    setSelectedKey(`${connectionId}|schema:${schema}`);
    setSelectedSchema(schema);
  }, []);
  const selectFolder = (0, import_react.useCallback)((connectionId, schema, folder) => {
    detailRequest.current += 1;
    setSelectedId(connectionId);
    setDetail(null);
    setRedisDetail(null);
    setRedisDetailDb(-1);
    setSelectedKey(`${connectionId}|${schema}#${folder}`);
    setSelectedSchema(schema);
  }, []);
  const selectRedisDb = (0, import_react.useCallback)((connectionId, db) => {
    detailRequest.current += 1;
    setSelectedId(connectionId);
    setDetail(null);
    setRedisDetail(null);
    setRedisDetailDb(-1);
    setSelectedKey(`${connectionId}|redisdb:${db}`);
    setSelectedSchema("");
  }, []);
  const toggleRedisDb = (0, import_react.useCallback)(
    (connectionId, db) => {
      const key = `${connectionId}:redis:db${db}`;
      const open = expanded[key] !== false;
      setExpanded((previous) => ({ ...previous, [key]: !open }));
      if (open) return;
      if (servers[connectionId] !== void 0 && redisKeys[connectionId]?.[db] === void 0) {
        void loadRedisKeys(connectionId, db);
      }
    },
    [expanded, servers, redisKeys, loadRedisKeys]
  );
  const selectRedisKey = (0, import_react.useCallback)(
    async (connectionId, db, key) => {
      detailRequest.current += 1;
      setSelectedId(connectionId);
      setDetail(null);
      setRedisDetail(null);
      setRedisDetailDb(db);
      setSelectedKey(`${connectionId}|redis:${db}:${key}`);
      setSelectedSchema("");
      if (!servers[connectionId]) {
        setRedisDetailLoading(false);
        notify("数据源未连接，连接后可查看键值", "info");
        return;
      }
      const request = redisRequest.current + 1;
      redisRequest.current = request;
      setRedisDetailLoading(true);
      try {
        const value = await api.redisKey(connectionId, key, db);
        if (redisRequest.current === request) setRedisDetail(value);
      } catch (error) {
        if (redisRequest.current === request) {
          setRedisDetail(null);
          notify(`读取键值失败：${errorText(error)}`, "error");
        }
      } finally {
        if (redisRequest.current === request) setRedisDetailLoading(false);
      }
    },
    [servers, notify]
  );
  const toggleSchemaVisible = (0, import_react.useCallback)(
    (connectionId, schema) => {
      const all = (schemas[connectionId] ?? []).map((item) => item.name);
      const current = visibleSchemas[connectionId] ?? all;
      const enabling = !current.includes(schema);
      const list = enabling ? [...current, schema] : current.filter((name2) => name2 !== schema);
      writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`, list);
      setVisibleSchemas((previous) => ({ ...previous, [connectionId]: list }));
      if (!enabling) return;
      void loadObjects(connectionId, schema);
      if (servers[connectionId] !== void 0) {
        void api.prefetchConnection(connectionId, { schemas: [schema] }).catch(() => void 0);
      }
    },
    [schemas, visibleSchemas, servers, loadObjects]
  );
  const toggleAllSchemasVisible = (0, import_react.useCallback)(
    (connectionId, all) => {
      const list = all ? (schemas[connectionId] ?? []).map((item) => item.name) : [];
      writeStoredList(`${VISIBLE_SCHEMAS_KEY}${connectionId}`, list);
      setVisibleSchemas((previous) => ({ ...previous, [connectionId]: list }));
      if (all) schedulePrefetch(connectionId, false, list);
    },
    [schemas, schedulePrefetch]
  );
  const toggleRedisDbVisible = (0, import_react.useCallback)(
    (connectionId, db) => {
      const fallback = connections.find((connection) => connection.id === connectionId)?.redisDb ?? 0;
      const current = redisDbs[connectionId] ?? [fallback];
      const list = current.includes(db) ? current.filter((item) => item !== db) : [...current, db].sort((left, right) => left - right);
      writeStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connectionId}`, list);
      setRedisDbs((previous) => ({ ...previous, [connectionId]: list }));
      if (!current.includes(db) && servers[connectionId] !== void 0 && redisKeys[connectionId]?.[db] === void 0) {
        void loadRedisKeys(connectionId, db);
      }
    },
    [connections, redisDbs, servers, redisKeys, loadRedisKeys]
  );
  const toggleAllRedisDbsVisible = (0, import_react.useCallback)(
    (connectionId, all) => {
      const count = redisDatabases[connectionId] ?? 16;
      const list = all ? Array.from({ length: count }, (_, index) => index) : [];
      writeStoredDbs(`${VISIBLE_REDIS_DBS_KEY}${connectionId}`, list);
      setRedisDbs((previous) => ({ ...previous, [connectionId]: list }));
    },
    [redisDatabases]
  );
  const resetDetail = (0, import_react.useCallback)(() => {
    setDetail(null);
    setRedisDetail(null);
    setRedisDetailDb(-1);
    setSelectedKey("");
  }, []);
  const refreshSelected = (0, import_react.useCallback)(async () => {
    setDetail(null);
    setRedisDetail(null);
    setSelectedKey("");
    if (!selected) {
      await refresh();
      return;
    }
    if (selected.dialect === "redis") {
      if (servers[selected.id]) {
        await loadRedisDatabases(selected.id);
        const shown = redisDbs[selected.id] ?? [selected.redisDb];
        await Promise.all(shown.map((db) => loadRedisKeys(selected.id, db)));
        notify("已刷新数据源", "success");
      } else {
        await connect(selected.id);
      }
      await refresh();
      return;
    }
    if (!servers[selected.id]) {
      await connect(selected.id);
      await refresh();
      return;
    }
    await loadSchemas(selected.id, true);
    schedulePrefetch(selected.id, true);
    await refresh();
    notify("已刷新数据源", "success");
  }, [selected, servers, redisDbs, refresh, connect, loadSchemas, loadRedisDatabases, loadRedisKeys, notify, schedulePrefetch]);
  const updateDrivers = (0, import_react.useCallback)((drivers) => {
    setSnapshot((previous) => previous ? { ...previous, drivers } : previous);
  }, []);
  const applySettings = (0, import_react.useCallback)((settings, env) => {
    setSnapshot((previous) => previous ? { ...previous, settings, env } : previous);
  }, []);
  const dismissSetupError = (0, import_react.useCallback)(() => {
    setSetupError(null);
  }, []);
  return {
    snapshot,
    loadError,
    selectedId,
    selectConnection,
    selected,
    server,
    servers,
    connectingId,
    connections,
    trash,
    schemas,
    objects,
    expanded,
    loadingSchemas,
    loadingObjects,
    cachedAt,
    descriptions,
    loadingDescriptions,
    detail,
    detailLoading,
    selectedKey,
    selectedSchema,
    redisKeys,
    redisCursor,
    loadingRedisKeys,
    redisDatabases,
    redisDbs,
    visibleSchemas,
    redisDetail,
    redisDetailDb,
    redisDetailLoading,
    refresh,
    connect,
    disconnect,
    refreshSelected,
    resetDetail,
    toggleConnection,
    reorderConnections,
    toggleFolder,
    toggleSchema,
    loadObjects,
    loadRedisDatabases,
    loadRedisKeys,
    toggleRedisDb,
    toggleKey,
    selectObject,
    selectSchema,
    selectFolder,
    selectRedisDb,
    selectRedisKey,
    toggleSchemaVisible,
    toggleAllSchemasVisible,
    toggleRedisDbVisible,
    toggleAllRedisDbsVisible,
    updateDrivers,
    applySettings,
    setupError,
    dismissSetupError
  };
}

// src/shared/keymap.ts
var SHORTCUT_SCOPE_LABEL = {
  console: "SQL 编辑器",
  result: "控制台结果区",
  table: "数据表标签页",
  tree: "数据源树",
  redis: "Redis 命令框"
};
var SHORTCUTS = [
  { id: "console.run", scope: "console", label: "执行（有选中内容时只执行选中部分）", defaultBinding: "mod+enter" },
  { id: "console.runCaret", scope: "console", label: "只执行光标所在的那条语句", defaultBinding: "mod+shift+enter" },
  { id: "console.complete", scope: "console", label: "补全表名、库名、列名与关键字", defaultBinding: "mod+space" },
  { id: "console.save", scope: "console", label: "把编辑器里的 SQL 存成 .sql 文件", defaultBinding: "mod+s" },
  { id: "console.explain", scope: "console", label: "查看执行计划（不执行语句）", defaultBinding: "mod+e" },
  { id: "console.comment", scope: "console", label: "注释或取消注释选中的行", defaultBinding: "mod+/" },
  { id: "console.clear", scope: "console", label: "清空编辑器（不影响已拿到的结果）", defaultBinding: "mod+l" },
  { id: "console.format", scope: "console", label: "格式化 SQL", defaultBinding: "mod+shift+f" },
  { id: "console.historyOlder", scope: "console", label: "回看上一条执行过的语句", defaultBinding: "mod+arrowup" },
  { id: "console.historyNewer", scope: "console", label: "回看下一条执行过的语句", defaultBinding: "mod+arrowdown" },
  { id: "result.filter", scope: "result", label: "跳到结果筛选框", defaultBinding: "mod+f" },
  { id: "result.rerun", scope: "result", label: "重新执行当前语句（不刷新页面）", defaultBinding: "mod+r" },
  { id: "table.where", scope: "table", label: "跳到 WHERE 输入框", defaultBinding: "mod+f" },
  { id: "table.refresh", scope: "table", label: "只刷新当前页（重算总数）", defaultBinding: "mod+r" },
  { id: "tree.filter", scope: "tree", label: "跳到筛选框", defaultBinding: "mod+f" },
  { id: "tree.refresh", scope: "tree", label: "重读当前数据源的结构", defaultBinding: "mod+r" },
  { id: "redis.clear", scope: "redis", label: "清空命令框", defaultBinding: "mod+l" }
];
var NAMED_KEYS = /* @__PURE__ */ new Set([
  "enter",
  "escape",
  "tab",
  "space",
  "backspace",
  "delete",
  "insert",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  "home",
  "end",
  "pageup",
  "pagedown"
]);
var KEY_LABEL = {
  enter: "Enter",
  escape: "Esc",
  tab: "Tab",
  space: "Space",
  backspace: "Backspace",
  delete: "Delete",
  insert: "Insert",
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  home: "Home",
  end: "End",
  pageup: "Page Up",
  pagedown: "Page Down"
};
function shortcutDef(id) {
  const def = SHORTCUTS.find((entry) => entry.id === id);
  if (def === void 0) throw new Error(`未知的快捷键：${id}`);
  return def;
}
function keyOf(raw) {
  const lower = raw.toLowerCase();
  if (lower === " " || lower === "spacebar") return "space";
  if (lower === "esc") return "escape";
  if (lower === "del") return "delete";
  return lower;
}
function isTypableKey(key) {
  return /^(?:[a-z0-9]|[^\w\s])$/.test(key) || NAMED_KEYS.has(key) || /^f(?:[1-9]|1[0-2])$/.test(key);
}
function isSafeStroke(stroke) {
  return stroke.mod || stroke.alt || /^f(?:[1-9]|1[0-2])$/.test(stroke.key);
}
function parseBinding(text2) {
  const parts = text2.trim().toLowerCase().split("+");
  if (parts.some((part) => part === "")) return null;
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);
  if (new Set(modifiers).size !== modifiers.length) return null;
  if (modifiers.some((part) => part !== "mod" && part !== "alt" && part !== "shift")) return null;
  const stroke = {
    mod: modifiers.includes("mod"),
    alt: modifiers.includes("alt"),
    shift: modifiers.includes("shift"),
    key
  };
  if (!isTypableKey(key) || !isSafeStroke(stroke)) return null;
  return stroke;
}
function strokeText(stroke) {
  const parts = [];
  if (stroke.mod) parts.push("mod");
  if (stroke.alt) parts.push("alt");
  if (stroke.shift) parts.push("shift");
  parts.push(stroke.key);
  return parts.join("+");
}
function bindingFromEvent(event) {
  const key = keyOf(event.key);
  if (key === "control" || key === "meta" || key === "alt" || key === "shift") return null;
  if (!isTypableKey(key)) return null;
  const stroke = {
    mod: event.ctrlKey || event.metaKey,
    alt: event.altKey,
    shift: event.shiftKey,
    key
  };
  return isSafeStroke(stroke) ? strokeText(stroke) : null;
}
function matchesBinding(event, binding) {
  const stroke = parseBinding(binding);
  if (stroke === null) return false;
  if (stroke.mod !== (event.ctrlKey || event.metaKey)) return false;
  if (stroke.alt !== event.altKey) return false;
  if (stroke.shift !== event.shiftKey) return false;
  return stroke.key === keyOf(event.key);
}
function formatBinding(binding, mac = false) {
  const stroke = parseBinding(binding);
  if (stroke === null) return binding;
  const parts = [];
  if (stroke.mod) parts.push(mac ? "⌘" : "Ctrl");
  if (stroke.alt) parts.push(mac ? "⌥" : "Alt");
  if (stroke.shift) parts.push(mac ? "⇧" : "Shift");
  const label = KEY_LABEL[stroke.key];
  const key = /^f(?:[1-9]|1[0-2])$/.test(stroke.key) ? stroke.key.toUpperCase() : stroke.key;
  parts.push(label ?? (key.length === 1 ? key.toUpperCase() : key));
  return parts.join(" + ");
}
function defaultBindingOf(id) {
  return shortcutDef(id).defaultBinding;
}
function bindingOf(id, overrides2) {
  const custom = overrides2?.[id];
  if (custom !== void 0 && parseBinding(custom) !== null) return custom;
  return defaultBindingOf(id);
}
function conflictingShortcut(id, binding, overrides2) {
  const scope = shortcutDef(id).scope;
  const stroke = parseBinding(binding);
  if (stroke === null) return null;
  const canonical = strokeText(stroke);
  const hit = SHORTCUTS.find(
    (def) => def.id !== id && def.scope === scope && strokeText(parseBinding(bindingOf(def.id, overrides2))) === canonical
  );
  return hit === void 0 ? null : hit.id;
}

// src/client/keymap.ts
var overrides = {};
var IS_MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent);
function setKeybindings(next) {
  overrides = next ?? {};
}
function currentBinding(id) {
  return bindingOf(id, overrides);
}
function shortcutHit(event, id) {
  return matchesBinding(event, currentBinding(id));
}
function shortcutLabel(id) {
  return formatBinding(currentBinding(id), IS_MAC);
}

// src/client/consoleactions.tsx
var import_react2 = require("react");

// src/shared/consoleactions.ts
var CONSOLE_ACTION_IDS = [
  "run",
  "cancel",
  "history",
  "format",
  "import",
  "save",
  "clear",
  "copy",
  "explain",
  "openTable",
  "txStart",
  "txCommit",
  "txRollback",
  "export"
];
var CONSOLE_ACTION_SET = new Set(CONSOLE_ACTION_IDS);
function isConsoleActionId(value) {
  return typeof value === "string" && CONSOLE_ACTION_SET.has(value);
}
function readConsoleActionOrder(value) {
  if (!Array.isArray(value)) return [];
  const seen = /* @__PURE__ */ new Set();
  const order2 = [];
  for (const entry of value) {
    if (!isConsoleActionId(entry) || seen.has(entry)) continue;
    seen.add(entry);
    order2.push(entry);
  }
  return order2;
}
function orderConsoleActions(stored) {
  const known = readConsoleActionOrder(stored);
  const seen = new Set(known);
  return [...known, ...CONSOLE_ACTION_IDS.filter((id) => !seen.has(id))];
}

// src/client/icons.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function Svg({ size = 14, className, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.8,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      "aria-hidden": "true",
      focusable: "false",
      children
    }
  );
}
function DatabaseIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", { cx: "12", cy: "5.5", rx: "8", ry: "3" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 5.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 11.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" })
  ] });
}
function PlusIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 5v14M5 12h14" }) });
}
function RefreshIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { transform: "translate(0 1)", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 11a8 8 0 1 0-2.6 5.9" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 4v7h-7" })
  ] }) });
}
function SettingsIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { transform: "translate(12 12) scale(0.88) translate(-12 -12)", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "3.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" })
  ] }) });
}
function PlayIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 5.5v13l11-6.5-11-6.5Z", fill: "currentColor", stroke: "none" }) });
}
function StopIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "6.5", y: "6.5", width: "11", height: "11", rx: "1.5", fill: "currentColor", stroke: "none" }) });
}
function ChevronRightIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 5.5 15.5 12 9 18.5" }) });
}
function ChevronDownIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5.5 9 12 15.5 18.5 9" }) });
}
function CloseIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 6l12 12M18 6 6 18" }) });
}
function DownloadIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3.5v11.5M7 10l5 5 5-5M4.5 20.5h15" }) });
}
function EditIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 20h4L20 8l-4-4L4 16v4Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M13.5 6.5 17.5 10.5" })
  ] });
}
function TrashIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" }) });
}
function KeyIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "8", cy: "8", r: "3.8" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10.8 10.8 20 20M17 17l2-2M14 14l2-2" })
  ] });
}
function TerminalIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 9.5 10.5 12 7 14.5M12.5 15h4.5" })
  ] });
}
function TableIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "1.5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 9.5h18M3 15h18M9.5 4v16" })
  ] });
}
function ViewIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "2.6" })
  ] });
}
function ColumnsIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "1.5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 4v16M15 4v16" })
  ] });
}
function CopyIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "8", y: "8", width: "12", height: "12", rx: "1.5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" })
  ] });
}
function WarningIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3.8 21 19.5H3L12 3.8Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 9v4.5M12 16.8h.01" })
  ] });
}
function CheckIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4.5 12.5 9.5 17.5 19.5 7" }) });
}
function InfoIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "8.5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 10.8v5M12 7.8h.01" })
  ] });
}
function FolderIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 7.5A1.5 1.5 0 0 1 4.5 6H9l1.8 2H19.5A1.5 1.5 0 0 1 21 9.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5Z" }) });
}
function FunctionIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 4h3.2C12 4 13 5 13 6.6V17c0 2 1 3 3 3h1.4" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5.5 10.5h11" })
  ] });
}
function SequenceIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 7h9M4 12h13M4 17h7" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "18.5", cy: "7", r: "1.6" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "20.5", cy: "17", r: "1.6" })
  ] });
}
function TriggerIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M13 3 5 13.5h5L9.5 21 19 10h-5.5Z" }) });
}
function ColumnIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M10 4v16M14 4v16" })
  ] });
}
function IndexIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "11", cy: "11", r: "6" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m20 20-4.4-4.4" })
  ] });
}
function ClockIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "8" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 8v4.5l3 1.8" })
  ] });
}
function StarIcon({ filled = false, ...props }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z", fill: filled ? "currentColor" : "none" }) });
}
function FilterIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 5h18l-7 8v6l-4 2v-8z" }) });
}
function ClearIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 6l1.6 12.2A2 2 0 0 0 9.6 20h4.8a2 2 0 0 0 2-1.8L18 6" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4.5 6h15" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 6V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V6" })
  ] });
}
function RecycleIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 19H4.8a1.8 1.8 0 0 1-1.6-.9 1.8 1.8 0 0 1 0-1.8l3.9-6.8" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M11 19h8.2a1.8 1.8 0 0 0 1.6-.9 1.8 1.8 0 0 0 0-1.8l-1.2-2.1" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14 16l-3 3 3 3" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8.3 13.6 7.2 9.5 3.1 10.6" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9.3 5.8 10.4 3.9A1.8 1.8 0 0 1 12 3a1.8 1.8 0 0 1 1.5.9l3.9 6.8" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m13.4 9.6 4.1 1.1 1.1-4.1" })
  ] });
}
function FormatIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4.5 19.5 14 10" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m12.5 8.5 3 3" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18.5 3.5v3M17 5h3M7 3.5v2M6 4.5h2" })
  ] });
}
function UploadIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 16.5V5M7 10l5-5 5 5M4.5 20.5h15" }) });
}
function SaveIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 3.5h10.5L20 8v12.5H5Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 3.5v5h7v-5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 20.5v-6h8v6" })
  ] });
}
function PlanIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9.5 6h11M9.5 12h11M9.5 18h7" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "4.5", cy: "6", r: "1.2", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "4.5", cy: "12", r: "1.2", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "4.5", cy: "18", r: "1.2", fill: "currentColor", stroke: "none" })
  ] });
}
function TransactionIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 9.5A7.5 7.5 0 0 1 19 8" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 4v4h-4" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 14.5A7.5 7.5 0 0 1 5 16" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M5 20v-4h4" })
  ] });
}
function UndoIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9 14 4 9l5-5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4 9h10a5 5 0 0 1 0 10h-3" })
  ] });
}
function MoreIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "5.5", cy: "12", r: "1.5", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "1.5", fill: "currentColor", stroke: "none" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "18.5", cy: "12", r: "1.5", fill: "currentColor", stroke: "none" })
  ] });
}
function ArrowUpIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 19V5M6.5 10.5 12 5l5.5 5.5" }) });
}
function ArrowDownIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 5v14M6.5 13.5 12 19l5.5-5.5" }) });
}

// src/client/consoleactions.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var CONSOLE_ACTION_LABEL = {
  run: "执行",
  cancel: "取消",
  history: "历史",
  format: "格式化",
  import: "导入",
  save: "保存",
  clear: "清空",
  copy: "复制 SQL",
  explain: "执行计划",
  openTable: "打开数据表",
  txStart: "事务",
  txCommit: "提交",
  txRollback: "回滚",
  export: "导出"
};
function consoleActionIcon(id, size = 12) {
  switch (id) {
    case "run":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PlayIcon, { size });
    case "cancel":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(StopIcon, { size });
    case "history":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ClockIcon, { size });
    case "format":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(FormatIcon, { size });
    case "import":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(UploadIcon, { size });
    case "save":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SaveIcon, { size });
    case "clear":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(ClearIcon, { size });
    case "copy":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CopyIcon, { size });
    case "explain":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(PlanIcon, { size });
    case "openTable":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TableIcon, { size });
    case "txStart":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(TransactionIcon, { size });
    case "txCommit":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CheckIcon, { size });
    case "txRollback":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(UndoIcon, { size });
    case "export":
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(DownloadIcon, { size });
  }
}
var savedOrder = orderConsoleActions(void 0);
var listeners = /* @__PURE__ */ new Set();
function setConsoleActionOrder(stored) {
  const next = orderConsoleActions(stored);
  const same = next.length === savedOrder.length && next.every((id, index) => id === savedOrder[index]);
  if (same) return;
  savedOrder = next;
  for (const listener of listeners) listener();
}
function useConsoleActionOrder() {
  const [order2, setOrder] = (0, import_react2.useState)(savedOrder);
  (0, import_react2.useEffect)(() => {
    const sync = () => {
      setOrder(savedOrder);
    };
    listeners.add(sync);
    sync();
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return order2;
}

// src/client/consoleprefs.ts
var import_react3 = require("react");
var autoComplete = true;
var listeners2 = /* @__PURE__ */ new Set();
function setConsoleAutoComplete(enabled) {
  if (enabled === autoComplete) return;
  autoComplete = enabled;
  for (const listener of listeners2) listener();
}
function currentConsoleAutoComplete() {
  return autoComplete;
}
function useConsoleAutoComplete() {
  const [enabled, setEnabled] = (0, import_react3.useState)(currentConsoleAutoComplete);
  (0, import_react3.useEffect)(() => {
    const listener = () => setEnabled(currentConsoleAutoComplete());
    listeners2.add(listener);
    return () => {
      listeners2.delete(listener);
    };
  }, []);
  return enabled;
}

// src/client/toolbaractions.tsx
var import_react4 = require("react");

// src/shared/toolbaractions.ts
var TOOLBAR_ACTION_IDS = ["add", "edit", "refresh", "delete", "console", "trash", "settings"];
var TOOLBAR_ACTION_SET = new Set(TOOLBAR_ACTION_IDS);
function isToolbarActionId(value) {
  return typeof value === "string" && TOOLBAR_ACTION_SET.has(value);
}
function readToolbarActionOrder(value) {
  if (!Array.isArray(value)) return [];
  const seen = /* @__PURE__ */ new Set();
  const order2 = [];
  for (const entry of value) {
    if (!isToolbarActionId(entry) || seen.has(entry)) continue;
    seen.add(entry);
    order2.push(entry);
  }
  return order2;
}
function orderToolbarActions(stored) {
  const known = readToolbarActionOrder(stored);
  const seen = new Set(known);
  return [...known, ...TOOLBAR_ACTION_IDS.filter((id) => !seen.has(id))];
}

// src/client/toolbaractions.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var TOOLBAR_ACTION_LABEL = {
  add: "新增",
  edit: "编辑",
  refresh: "刷新",
  delete: "删除",
  console: "控制台",
  trash: "回收站",
  settings: "设置"
};
function toolbarActionIcon(id, size = 14) {
  switch (id) {
    case "add":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(PlusIcon, { size });
    case "edit":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(EditIcon, { size });
    case "refresh":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(RefreshIcon, { size });
    case "delete":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TrashIcon, { size });
    case "console":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TerminalIcon, { size });
    case "trash":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(RecycleIcon, { size });
    case "settings":
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(SettingsIcon, { size });
  }
}
var savedOrder2 = orderToolbarActions(void 0);
var listeners3 = /* @__PURE__ */ new Set();
function setToolbarActionOrder(stored) {
  const next = orderToolbarActions(stored);
  const same = next.length === savedOrder2.length && next.every((id, index) => id === savedOrder2[index]);
  if (same) return;
  savedOrder2 = next;
  for (const listener of listeners3) listener();
}
function useToolbarActionOrder() {
  const [order2, setOrder] = (0, import_react4.useState)(savedOrder2);
  (0, import_react4.useEffect)(() => {
    const sync = () => {
      setOrder(savedOrder2);
    };
    listeners3.add(sync);
    sync();
    return () => {
      listeners3.delete(sync);
    };
  }, []);
  return order2;
}

// src/client/toolbaroverflow.ts
var TOOLBAR_GAP = 6;
function fitActionCount(widths, available, overflowWidth, gap = TOOLBAR_GAP) {
  const total = widths.length;
  if (total === 0) return 0;
  if (available <= 0) return total;
  const prefix = [];
  let used = 0;
  widths.forEach((width, index) => {
    used += width + (index === 0 ? 0 : gap);
    prefix.push(used);
  });
  for (let visible = total; visible >= 1; visible--) {
    const before = prefix[visible - 1] ?? 0;
    const reserve = visible < total ? overflowWidth + gap : 0;
    if (before + reserve <= available + 0.5) return visible;
  }
  return 0;
}

// src/client/popover.ts
var import_react5 = require("react");
function usePopoverDismiss(open, onClose, ref) {
  (0, import_react5.useEffect)(() => {
    if (!open) return void 0;
    const anchors = Array.isArray(ref) ? ref : [ref];
    const onPointerDown = (event) => {
      if (!anchors.some((anchor) => anchor.current?.contains(event.target))) onClose();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, ref]);
}

// src/client/colmenu.ts
function columnValues(rows, index) {
  return rows.map((row) => {
    const value = row[index] ?? null;
    return value === null || value === void 0 ? "" : String(value);
  }).join("\n");
}
function commaValues(rows, index) {
  return rows.map((row) => {
    const value = row[index] ?? null;
    return value === null || value === void 0 ? "" : String(value);
  }).join(", ");
}
async function copyText(text2) {
  try {
    await navigator.clipboard.writeText(text2);
    return true;
  } catch {
    let area;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
      area = document.createElement("textarea");
      area.value = text2;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      area?.remove();
      if (previous !== null && previous.isConnected) previous.focus();
    }
  }
}

// src/client/modals/ConnectionModal.tsx
var import_react7 = require("react");

// src/client/ui.tsx
var import_react6 = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime4 = require("react/jsx-runtime");
function Button({
  variant = "default",
  size = "md",
  icon,
  loading = false,
  className = "",
  disabled,
  children,
  ...rest
}) {
  const iconOnly = children === void 0 || children === null || children === false;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "button",
    {
      type: "button",
      ...rest,
      className: `dshdb-btn ${className}`.trim(),
      "data-variant": variant,
      "data-size": size,
      "data-density": iconOnly ? "icon" : void 0,
      disabled: disabled === true || loading,
      "aria-busy": loading || void 0,
      children: [
        loading ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Spinner, {}) : icon,
        iconOnly ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children })
      ]
    }
  );
}
function IconButton({ label, icon, ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { ...rest, icon, "aria-label": label, title: rest.title ?? label });
}
var TextInput = (0, import_react6.forwardRef)(function TextInput2({ className = "", ...rest }, ref) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { ...rest, ref, className: `dshdb-input ${className}`.trim() });
});
function TextArea({ className = "", ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("textarea", { ...rest, className: `dshdb-textarea ${className}`.trim() });
}
function Select({ options, onValueChange, inline = false, className = "", ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "select",
    {
      ...rest,
      className: `dshdb-select ${inline ? "dshdb-select-inline" : ""} ${className}`.trim(),
      onChange: (event) => onValueChange?.(event.target.value),
      children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: option.value, children: option.label }, option.value))
    }
  );
}
function SearchSelect({
  label,
  title,
  value,
  options,
  onChange,
  placeholder = "",
  className = ""
}) {
  const [open, setOpen] = (0, import_react6.useState)(false);
  const [query, setQuery] = (0, import_react6.useState)("");
  const [active, setActive] = (0, import_react6.useState)(0);
  const anchor = (0, import_react6.useRef)(null);
  const close = (0, import_react6.useCallback)(() => {
    setOpen(false);
    setQuery("");
  }, []);
  usePopoverDismiss(open, close, anchor);
  const current = options.find((option) => option.value === value);
  const needle = query.trim().toLowerCase();
  const shown = needle === "" ? options : options.filter(
    (option) => option.label.toLowerCase().includes(needle) || option.value.toLowerCase().includes(needle)
  );
  const pick = (next) => {
    close();
    onChange(next);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dshdb-search-select", ref: anchor, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
      "button",
      {
        type: "button",
        className: `dshdb-select dshdb-select-inline dshdb-search-trigger ${className}`.trim(),
        "aria-label": label,
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        title,
        onClick: () => {
          setQuery("");
          setActive(0);
          setOpen((value2) => !value2);
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-search-value", children: current?.label ?? placeholder }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ChevronDownIcon, { size: 12 })
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshdb-search-pop", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "input",
        {
          className: "dshdb-input dshdb-search-input",
          type: "search",
          value: query,
          placeholder: `查找${label}…`,
          "aria-label": `查找${label}`,
          autoFocus: true,
          onChange: (event) => {
            setQuery(event.target.value);
            setActive(0);
          },
          onKeyDown: (event) => {
            event.stopPropagation();
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(index + 1, shown.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const option = shown[active];
              if (option !== void 0) pick(option.value);
            } else if (event.key === "Escape") {
              event.preventDefault();
              close();
            }
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-search-list", role: "listbox", "aria-label": label, children: shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-picker-empty", children: "没有匹配项" }) : shown.map((option, index) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "button",
        {
          type: "button",
          role: "option",
          "aria-selected": option.value === value,
          className: `dshdb-search-option${index === active ? " is-active" : ""}`,
          onMouseEnter: () => setActive(index),
          onClick: () => pick(option.value),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-search-option-label", children: option.label }),
            option.value === value ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CheckIcon, { size: 12 }) : null
          ]
        },
        option.value
      )) })
    ] }) : null
  ] });
}
function Field({ label, required, hint, error, children, span }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: `dshdb-field ${span ? "dshdb-span-2" : ""}`.trim(), children: [
    label ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dshdb-field-label", children: [
      label,
      required ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("em", { children: "*" }) : null
    ] }) : null,
    children,
    error ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-field-error", children: error }) : hint ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-field-hint", children: hint }) : null
  ] });
}
function Switch({ checked, onChange, label, disabled }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dshdb-inline", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "button",
      {
        type: "button",
        role: "switch",
        "aria-checked": checked,
        "aria-label": typeof label === "string" ? label : void 0,
        className: "dshdb-switch",
        disabled,
        onClick: () => onChange(!checked)
      }
    ),
    label ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-muted", children: label }) : null
  ] });
}
function Panel({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "",
  scroll = false,
  collapsible = false,
  defaultOpen = true
}) {
  const [open, setOpen] = (0, import_react6.useState)(defaultOpen);
  const expanded = !collapsible || open;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("section", { className: `dshdb-panel ${className}`.trim(), children: [
    title ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "dshdb-panel-head", children: [
      collapsible ? /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "button",
        {
          type: "button",
          className: "dshdb-panel-toggle",
          "aria-expanded": expanded,
          onClick: () => setOpen((previous) => !previous),
          children: [
            expanded ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ChevronRightIcon, { size: 12 }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: title })
          ]
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-panel-head-title", children: title }),
      actions
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "div",
      {
        className: `dshdb-panel-body ${bodyClassName}`.trim(),
        hidden: !expanded,
        style: {
          ...scroll ? { overflow: "auto" } : null,
          // The class sets `display: flex`, which would beat the `hidden` attribute.
          ...expanded ? null : { display: "none" }
        },
        children
      }
    )
  ] });
}
function Tag({
  tone,
  title,
  role,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-tag", "data-tone": tone, title, role, children });
}
function StateDot({ tone }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-dot", "data-tone": tone ?? "idle" });
}
function Spinner({ size }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-spinner", style: size ? { width: size, height: size } : void 0, "aria-hidden": "true" });
}
function Loading({
  label,
  size,
  bare = false,
  className
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
    "span",
    {
      className: `dshdb-loading${bare ? " dshdb-loading-bare" : ""}${className ? ` ${className}` : ""}`,
      role: label === void 0 ? void 0 : "status",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Spinner, { size }),
        label === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-loading-label", children: label })
      ]
    }
  );
}
function Banner({
  tone = "info",
  children,
  actions,
  onClose
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshdb-banner", "data-tone": tone, role: tone === "error" ? "alert" : "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-banner-icon", children: tone === "error" || tone === "warn" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(WarningIcon, { size: 13 }) : tone === "success" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CheckIcon, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(InfoIcon, { size: 13 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-banner-text", children }),
    actions ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-banner-actions", children: actions }) : null,
    onClose ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(IconButton, { label: "关闭", size: "sm", variant: "ghost", icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CloseIcon, { size: 12 }), onClick: onClose }) : null
  ] });
}
function EmptyState({
  icon,
  title,
  description,
  actions
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshdb-empty", children: [
    icon ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-empty-icon", children: icon }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-empty-title", children: title }),
    description ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-empty-text", children: description }) : null,
    actions ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-empty-actions", children: actions }) : null
  ] });
}
var modalStack = [];
function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width
}) {
  const boxRef = (0, import_react6.useRef)(null);
  const tokenRef = (0, import_react6.useRef)(null);
  const [layer, setLayer] = (0, import_react6.useState)(0);
  (0, import_react6.useEffect)(() => {
    if (!open) return;
    const token = /* @__PURE__ */ Symbol("dshdb-modal");
    tokenRef.current = token;
    modalStack.push(token);
    setLayer(modalStack.length - 1);
    return () => {
      tokenRef.current = null;
      const index = modalStack.indexOf(token);
      if (index !== -1) modalStack.splice(index, 1);
      setLayer(0);
    };
  }, [open]);
  const isTopmost = () => tokenRef.current !== null && modalStack[modalStack.length - 1] === tokenRef.current;
  const latestClose = (0, import_react6.useRef)(onClose);
  (0, import_react6.useEffect)(() => {
    latestClose.current = onClose;
  }, [onClose]);
  (0, import_react6.useEffect)(() => {
    if (!open) return;
    const box = boxRef.current;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = () => {
      if (box === null) return [];
      return Array.from(
        box.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      );
    };
    const onKeyDown = (event) => {
      if (!isTopmost()) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        latestClose.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !box?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !box?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const start = box?.querySelector(
      'input, textarea, select, button:not([aria-label="关闭"])'
    );
    if (start) start.focus();
    else box?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      if (previous !== null && previous.isConnected) previous.focus();
    };
  }, [open]);
  if (!open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "div",
    {
      className: "dshdb-modal-overlay",
      style: { zIndex: 1200 + layer * 10 },
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) onClose();
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
        "div",
        {
          ref: boxRef,
          className: "dshdb-modal",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": typeof title === "string" ? title : void 0,
          tabIndex: -1,
          style: width ? { width } : void 0,
          onMouseDown: (event) => event.stopPropagation(),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("header", { className: "dshdb-modal-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-modal-title", children: title }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
                IconButton,
                {
                  label: "关闭",
                  size: "sm",
                  variant: "ghost",
                  icon: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CloseIcon, { size: 13 }),
                  onClick: onClose
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-modal-body", children }),
            footer ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("footer", { className: "dshdb-modal-foot", children: footer }) : null
          ]
        }
      )
    }
  );
}
function ConfirmDialog({
  request,
  busy,
  onConfirm,
  onCancel
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    Modal,
    {
      open: request !== null,
      title: request?.title ?? "",
      onClose: onCancel,
      footer: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-modal-foot-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { onClick: onCancel, disabled: busy, children: "取消" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          Button,
          {
            variant: request?.danger ? "danger" : "primary",
            onClick: onConfirm,
            loading: busy,
            children: request?.confirmLabel ?? "确定"
          }
        )
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshdb-modal-message", children: [
        request?.message,
        request?.detail ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "dshdb-mono", children: request.detail }) : null
      ] })
    }
  );
}
function nextToast(previous, text2, tone = "info") {
  return { text: text2, tone, seq: (previous?.seq ?? 0) + 1 };
}
function Toast({ toast, onDismiss }) {
  if (toast === null) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    import_dsh_client_ui_primitives.Toast,
    {
      text: toast.text,
      tone: toast.tone === "success" ? "success" : void 0,
      icon: toast.tone === "error" ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_dsh_client_ui_primitives.IconWarningOutlineRegular, {}) : void 0,
      onDone: onDismiss
    },
    toast.seq
  );
}

// src/client/modals/ConnectionModal.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function toParamsText(params) {
  return Object.entries(params).map(([key, value]) => `${key}=${value}`).join("\n");
}
function parseParamsText(text2) {
  const params = {};
  for (const line of text2.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    params[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return params;
}
function errorText2(error) {
  return error instanceof Error ? error.message : String(error);
}
function ConnectionModal(props) {
  const [choice, setChoice] = (0, import_react7.useState)("mysql");
  const [name2, setName] = (0, import_react7.useState)("");
  const [host, setHost] = (0, import_react7.useState)("127.0.0.1");
  const [port, setPort] = (0, import_react7.useState)("3306");
  const [user, setUser] = (0, import_react7.useState)("");
  const [password, setPassword] = (0, import_react7.useState)("");
  const [clearPassword, setClearPassword] = (0, import_react7.useState)(false);
  const [database, setDatabase] = (0, import_react7.useState)("");
  const [redisDb, setRedisDb] = (0, import_react7.useState)("0");
  const [paramsText, setParamsText] = (0, import_react7.useState)("");
  const [readOnly, setReadOnly] = (0, import_react7.useState)(false);
  const [saving, setSaving] = (0, import_react7.useState)(false);
  const [testing, setTesting] = (0, import_react7.useState)(false);
  const [testResult, setTestResult] = (0, import_react7.useState)(null);
  const [error, setError] = (0, import_react7.useState)("");
  const customDrivers = (0, import_react7.useMemo)(() => props.drivers.filter((driver) => driver.preset === null), [props.drivers]);
  const editing = props.editing;
  (0, import_react7.useEffect)(() => {
    setError("");
    setTestResult(null);
    setSaving(false);
    setTesting(false);
    if (!props.open) return;
    if (editing) {
      setChoice(editing.driver === "custom" ? `custom:${editing.customDriverId ?? ""}` : editing.driver);
      setName(editing.name);
      setHost(editing.host);
      setPort(String(editing.port));
      setUser(editing.user);
      setDatabase(editing.database);
      setRedisDb(String(editing.redisDb));
      setParamsText(toParamsText(editing.params));
      setReadOnly(editing.readOnly);
      setPassword("");
      setClearPassword(false);
      return;
    }
    setChoice("mysql");
    setName("");
    setHost("127.0.0.1");
    setPort(String(PRESETS.mysql.defaultPort));
    setUser("");
    setDatabase("");
    setRedisDb("0");
    setParamsText("");
    setReadOnly(false);
    setPassword("");
    setClearPassword(false);
  }, [props.open, editing]);
  if (!props.open) return null;
  const isCustom = choice.startsWith("custom:");
  const customId = isCustom ? choice.slice("custom:".length) : void 0;
  const customDriver = customDrivers.find((driver) => driver.id === customId);
  const preset = !isCustom ? presetOf(choice) : void 0;
  const fileBased = preset?.hostOptional === true;
  const dialect = isCustom ? customDriver?.dialect : preset?.dialect;
  const isRedis = dialect === "redis";
  const driverOptions = [
    ...PRESET_ORDER.map((id) => ({
      value: id,
      label: `${PRESET_LABEL[id]}${PRESETS[id].needsJava ? "" : ""}`
    })),
    ...customDrivers.map((driver) => ({ value: `custom:${driver.id}`, label: `${driver.name}（自定义）` }))
  ];
  const changeChoice = (value) => {
    setChoice(value);
    setTestResult(null);
    setError("");
    if (value.startsWith("custom:")) return;
    const spec = presetOf(value);
    if (spec) setPort(String(spec.defaultPort));
  };
  const buildDraft = () => ({
    id: editing?.id,
    name: name2.trim(),
    driver: isCustom ? "custom" : choice,
    customDriverId: isCustom ? customId : void 0,
    // File based engines keep no host; do not persist whatever the previous preset left behind.
    host: fileBased ? "" : host.trim(),
    port: fileBased ? 0 : Number.parseInt(port, 10) || 0,
    user: user.trim(),
    ...password !== "" ? { password } : {},
    ...clearPassword ? { clearPassword: true } : {},
    database: isRedis ? "" : database.trim(),
    redisDb: Number.parseInt(redisDb, 10) || 0,
    params: isRedis ? {} : parseParamsText(paramsText),
    // The read-only flag is chosen once, when the connection is created; an edit
    // always keeps the stored value (the switch is disabled for existing rows).
    readOnly: editing ? editing.readOnly : readOnly
  });
  const validate = (draft) => {
    if (draft.name === "") return "请填写连接名称";
    const spec = isCustom ? void 0 : PRESETS[choice];
    const hostOptional = spec?.hostOptional === true;
    if (draft.host === "" && !hostOptional) return "请填写主机地址";
    if (!hostOptional && (!Number.isInteger(draft.port) || draft.port < 1 || draft.port > 65535)) {
      return "端口需在 1-65535 之间";
    }
    if (hostOptional && draft.database === "") return "请填写数据库文件路径";
    if (isCustom && !customDriver) return "请选择或先新增一个自定义驱动";
    return "";
  };
  const test = async () => {
    const draft = buildDraft();
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (isRedis) {
      setError("Redis 连接请在保存后通过面板连接验证");
      return;
    }
    setTesting(true);
    setError("");
    try {
      setTestResult(await api.testConnection({ ...draft, id: void 0 }));
    } catch (cause) {
      setTestResult(null);
      setError(errorText2(cause));
    } finally {
      setTesting(false);
    }
  };
  const save = async () => {
    const draft = buildDraft();
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.saveConnection(draft);
      props.notify(editing ? "连接已更新" : "连接已创建", "success");
      props.onSaved();
      props.onClose();
    } catch (cause) {
      setError(errorText2(cause));
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    Modal,
    {
      open: props.open,
      title: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-inline", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DatabaseIcon, { size: 14 }),
        editing ? `编辑连接 · ${editing.name}` : "新建数据源连接"
      ] }),
      onClose: props.onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        editing ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { variant: "danger", size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TrashIcon, { size: 12 }), onClick: () => props.onDelete(editing), children: "删除" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-modal-foot-spacer" }),
        !isRedis ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { onClick: () => void test(), loading: testing, children: "测试连接" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { variant: "primary", onClick: () => void save(), loading: saving, children: "保存" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-form-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "名称", required: true, span: true, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            TextInput,
            {
              value: name2,
              autoFocus: true,
              placeholder: "例如 本地 MySQL",
              onChange: (event) => setName(event.target.value)
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "驱动", required: true, span: true, hint: dialect ? `方言：${dialectLabel(dialect)}` : void 0, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Select, { options: driverOptions, value: choice, onValueChange: changeChoice }) }),
          isCustom && !customDriver ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-span-2", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Banner, { tone: "warn", children: "还没有自定义驱动，请先在「设置」标签页新增。" }) }) : null,
          fileBased ? null : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "主机", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TextInput, { value: host, onChange: (event) => setHost(event.target.value), placeholder: "127.0.0.1" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "端口", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              TextInput,
              {
                value: port,
                inputMode: "numeric",
                onChange: (event) => setPort(event.target.value.replace(/[^0-9]/g, ""))
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "用户名", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TextInput, { value: user, onChange: (event) => setUser(event.target.value), placeholder: isRedis ? "default" : "用户名" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "密码", hint: editing?.hasPassword ? "已保存密码，留空则保持不变" : void 0, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              TextInput,
              {
                type: "password",
                value: password,
                autoComplete: "new-password",
                onChange: (event) => setPassword(event.target.value),
                placeholder: editing?.hasPassword ? "留空则保持不变" : "密码"
              }
            ) }),
            editing?.hasPassword ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-span-2", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Switch, { checked: clearPassword, onChange: setClearPassword, label: "清除已保存的密码" }) }) : null
          ] }),
          isRedis ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "逻辑库序号", hint: "Redis 数据库编号，默认 0", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            TextInput,
            {
              value: redisDb,
              inputMode: "numeric",
              onChange: (event) => setRedisDb(event.target.value.replace(/[^0-9]/g, ""))
            }
          ) }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "数据库 / 服务名", span: fileBased, hint: preset?.databaseHint ?? "可留空，连接后再选择 schema", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            TextInput,
            {
              value: database,
              onChange: (event) => setDatabase(event.target.value),
              placeholder: fileBased ? "例如 ./data/app.db" : "可留空"
            }
          ) }),
          !isRedis ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "额外 JDBC 参数", span: true, hint: "每行一个 key=value，例如 useSSL=false", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            TextArea,
            {
              value: paramsText,
              onChange: (event) => setParamsText(event.target.value),
              placeholder: "useSSL=false\nconnectTimeout=10000"
            }
          ) }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-span-2 dshdb-list", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            Switch,
            {
              checked: readOnly,
              onChange: setReadOnly,
              disabled: editing != null,
              label: editing == null ? "只读连接（面板与 Agent 均拒绝写操作）" : "只读连接（仅新建时设置，创建后不能修改；需变更请新建连接）"
            }
          ) })
        ] }),
        testResult ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Banner, { tone: testResult.ok ? "success" : "error", children: testResult.ok ? `连接成功 · ${testResult.server?.product ?? ""} ${testResult.server?.version ?? ""} · ${formatMs(testResult.latencyMs)}${testResult.note === void 0 ? "" : ` · ${testResult.note}`}` : `连接失败：${testResult.message ?? "未知错误"}` }) : null,
        error ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          Banner,
          {
            tone: "error",
            actions: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { size: "sm", variant: "ghost", title: "复制错误信息", onClick: () => void copyText(error), children: "复制" }),
            children: error
          }
        ) : null,
        testing ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-muted dshdb-inline", style: { fontSize: 11 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Loading, { label: "正在测试连接…" }) }) : null,
        isCustom ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { tone: "business", children: "自定义驱动" }) : null,
        !isRedis && dialect ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: [
          "驱动类：",
          customDriver?.driverClass ?? preset?.driverClass ?? "—"
        ] }) : null,
        !editing ? null : /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: [
          "连接 ID：",
          editing.id
        ] })
      ] })
    }
  );
}

// src/client/modals/DriverModal.tsx
var import_react8 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
var DIALECT_OPTIONS = Object.keys(SQL_DIALECT_LABEL).map((dialect) => ({
  value: dialect,
  label: SQL_DIALECT_LABEL[dialect]
}));
function parseJars(text2) {
  return text2.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "" && !line.startsWith("#")).map((line) => {
    const parts = line.split(":").map((part) => part.trim());
    if (parts.length < 3) return null;
    const version = parts[parts.length - 1] ?? "";
    const artifact = parts[parts.length - 2] ?? "";
    const group = parts.slice(0, -2).join(":");
    if (group === "" || artifact === "" || version === "") return null;
    return { group, artifact, version };
  }).filter((jar) => jar !== null);
}
function errorText3(error) {
  return error instanceof Error ? error.message : String(error);
}
function DriverModal(props) {
  const [name2, setName] = (0, import_react8.useState)("");
  const [dialect, setDialect] = (0, import_react8.useState)("generic");
  const [driverClass, setDriverClass] = (0, import_react8.useState)("");
  const [urlTemplate, setUrlTemplate] = (0, import_react8.useState)("jdbc:custom://{{host}}:{{port}}/{{database}}");
  const [jarsText, setJarsText] = (0, import_react8.useState)("");
  const [saving, setSaving] = (0, import_react8.useState)(false);
  const [error, setError] = (0, import_react8.useState)("");
  (0, import_react8.useEffect)(() => {
    setError("");
    setSaving(false);
    if (!props.open) return;
    const editing = props.editing;
    if (editing) {
      setName(editing.name);
      setDialect(sqlDialectOf(editing.dialect));
      setDriverClass(editing.driverClass ?? "");
      setUrlTemplate(editing.urlTemplate ?? "");
      setJarsText(editing.jars.map((jar) => `${jar.group}:${jar.artifact}:${jar.version}`).join("\n"));
    } else {
      setName("");
      setDialect("generic");
      setDriverClass("");
      setUrlTemplate("jdbc:custom://{{host}}:{{port}}/{{database}}");
      setJarsText("");
    }
  }, [props.open, props.editing]);
  if (!props.open) return null;
  const save = async () => {
    if (name2.trim() === "") {
      setError("请填写驱动名称");
      return;
    }
    if (driverClass.trim() === "") {
      setError("请填写 JDBC 驱动类名");
      return;
    }
    if (!/^jdbc:/.test(urlTemplate.trim())) {
      setError("JDBC URL 模板需以 jdbc: 开头");
      return;
    }
    if (!urlTemplate.includes("{{host}}")) {
      setError("JDBC URL 模板需包含 {{host}} 占位符");
      return;
    }
    const jars = parseJars(jarsText);
    if (jars.length === 0) {
      setError("请至少填写一行 Maven 坐标：group:artifact:version");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await api.saveCustomDriver({
        id: props.editing?.id,
        name: name2.trim(),
        dialect,
        driverClass: driverClass.trim(),
        urlTemplate: urlTemplate.trim(),
        jars
      });
      props.notify(props.editing ? "自定义驱动已更新" : "自定义驱动已创建", "success");
      props.onSaved(response.drivers);
      props.onClose();
    } catch (cause) {
      setError(errorText3(cause));
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    Modal,
    {
      open: props.open,
      title: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dshdb-inline", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DatabaseIcon, { size: 14 }),
        props.editing ? `编辑驱动 · ${props.editing.name}` : "新增自定义驱动"
      ] }),
      onClose: props.onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dshdb-modal-foot-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Button, { onClick: props.onClose, children: "取消" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Button, { variant: "primary", loading: saving, onClick: () => void save(), children: "保存" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dshdb-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dshdb-form-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Field, { label: "名称", required: true, span: true, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TextInput, { value: name2, autoFocus: true, placeholder: "例如 ClickHouse", onChange: (event) => setName(event.target.value) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Field, { label: "方言", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            Select,
            {
              options: DIALECT_OPTIONS,
              value: dialect,
              onValueChange: (value) => setDialect(value)
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Field, { label: "驱动类", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            TextInput,
            {
              value: driverClass,
              placeholder: "com.example.jdbc.Driver",
              onChange: (event) => setDriverClass(event.target.value)
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            Field,
            {
              label: "JDBC URL 模板",
              required: true,
              span: true,
              hint: "占位符：{{host}} {{port}} {{database}}，例如 jdbc:mysql://{{host}}:{{port}}/{{database}}",
              children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TextInput, { value: urlTemplate, onChange: (event) => setUrlTemplate(event.target.value) })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            Field,
            {
              label: "Maven 依赖",
              required: true,
              span: true,
              hint: "每行一个 group:artifact:version；加载顺序即书写顺序",
              children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                TextArea,
                {
                  value: jarsText,
                  onChange: (event) => setJarsText(event.target.value),
                  placeholder: "com.example:example-jdbc:1.0.0",
                  style: { minHeight: 84 }
                }
              )
            }
          )
        ] }),
        error ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          Banner,
          {
            tone: "error",
            actions: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Button, { size: "sm", variant: "ghost", title: "复制错误信息", onClick: () => void copyText(error), children: "复制" }),
            children: error
          }
        ) : null
      ] })
    }
  );
}

// src/client/views/SettingsView.tsx
var import_react9 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
var SHORTCUT_SCOPES = ["console", "result", "table", "tree", "redis"];
function ShortcutRow(props) {
  const { def, overrides: overrides2, onChange } = props;
  const [recording, setRecording] = (0, import_react9.useState)(false);
  const [problem, setProblem] = (0, import_react9.useState)("");
  const binding = bindingOf(def.id, overrides2);
  const capture = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const field = event.currentTarget;
    if (event.key === "Escape" || event.key === "Tab") {
      setRecording(false);
      field.blur();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      setProblem("");
      setRecording(false);
      onChange(null);
      field.blur();
      return;
    }
    const next = bindingFromEvent(event);
    if (next === null) {
      setProblem("要带 Ctrl/⌘ 或 Alt，功能键（F1–F12）可以单独用");
      return;
    }
    const taken = conflictingShortcut(def.id, next, overrides2);
    if (taken !== null) {
      setProblem(`与「${shortcutDef(taken).label}」冲突`);
      return;
    }
    setProblem("");
    setRecording(false);
    onChange(next);
    field.blur();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-driver-name", children: def.label }),
      problem !== "" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-field-error", children: problem }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      TextInput,
      {
        readOnly: true,
        style: { width: 168, textAlign: "center" },
        "aria-label": `${def.label} 的快捷键`,
        title: "点一下再按新的组合键（Esc 取消，Delete 恢复默认）",
        value: recording ? "按下组合键…" : formatBinding(binding, IS_MAC),
        onFocus: () => {
          setRecording(true);
          setProblem("");
        },
        onBlur: () => setRecording(false),
        onKeyDown: capture
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      Button,
      {
        size: "sm",
        variant: "ghost",
        disabled: overrides2[def.id] === void 0,
        onClick: () => onChange(null),
        children: "恢复默认"
      }
    )
  ] });
}
var JAVA_SOURCE_LABEL = {
  setting: "设置指定",
  bundled: "随包内置",
  downloaded: "已下载",
  JAVA_HOME: "JAVA_HOME",
  PATH: "PATH",
  jdks: "JDK 目录",
  missing: "未找到"
};
function JavaBadge({ env }) {
  const java = env.java;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-kv", style: { padding: 0 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-key", children: "Java" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-kv-val dshdb-inline", children: [
      java.available ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "success", children: "可用" }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "error", children: "未找到" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-mono", children: java.version ?? java.message ?? "未检测到 Java" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-key", children: "来源" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-val dshdb-mono", title: java.source, children: JAVA_SOURCE_LABEL[java.source] ?? java.source }),
    java.path ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-key", children: "路径" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-val dshdb-mono", title: java.path, children: java.path })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-key", children: "数据目录" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-val dshdb-mono", title: env.configPath, children: env.configPath }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-key", children: "JDBC 桥" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-kv-val dshdb-inline", children: [
      env.bridgeBuilt ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "success", children: "已构建" }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "warn", children: "缺失" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-mono", title: env.bridgeJar, children: env.bridgeJar })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-key", children: "版本" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-kv-val dshdb-mono", children: [
      "v",
      env.pluginVersion,
      " · ",
      env.platform
    ] })
  ] });
}
function SettingsView(props) {
  const [draft, setDraft] = (0, import_react9.useState)(props.settings);
  (0, import_react9.useEffect)(() => {
    setDraft(props.settings);
  }, [props.settings]);
  const update = (key, value) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
  };
  const updateNumber = (key, value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) update(key, parsed);
    else update(key, 1);
  };
  const javaCandidates = props.env.java.candidates ?? [];
  const knownJavaPaths = new Set(javaCandidates.map((candidate) => candidate.path));
  const customJavaPath = draft.javaPath.trim() !== "" && !knownJavaPaths.has(draft.javaPath) ? draft.javaPath : void 0;
  const javaOptions = [
    { value: "", label: "自动（按 JAVA_HOME、PATH、JDK 目录查找）" },
    ...javaCandidates.map((candidate, index) => ({
      value: candidate.path,
      label: `Java ${candidate.major} · ${candidate.version}${candidate.source === "bundled" ? "（内置）" : candidate.source === "downloaded" ? "（已下载）" : ""}${index === 0 ? " · 最新" : ""}`
    })),
    ...customJavaPath !== void 0 ? [{ value: customJavaPath, label: customJavaPath }] : []
  ];
  const presets = props.drivers.filter((driver) => driver.preset !== null);
  const customs = props.drivers.filter((driver) => driver.preset === null);
  const keybindings = draft.keybindings ?? {};
  const actionOrder = orderConsoleActions(draft.consoleActions);
  const moveAction = (id, offset) => {
    const index = actionOrder.indexOf(id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= actionOrder.length) return;
    const next = [...actionOrder];
    next.splice(index, 1);
    next.splice(target, 0, id);
    update("consoleActions", next);
  };
  const toolbarOrder = orderToolbarActions(draft.toolbarActions);
  const moveToolbarAction = (id, offset) => {
    const index = toolbarOrder.indexOf(id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= toolbarOrder.length) return;
    const next = [...toolbarOrder];
    next.splice(index, 1);
    next.splice(target, 0, id);
    update("toolbarActions", next);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-scroll dshdb-scroll-thin", style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      Panel,
      {
        title: "运行环境",
        collapsible: true,
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "ghost", loading: props.saving, onClick: () => props.onSave(draft), children: "保存" }),
          props.env.java.available && props.env.java.source !== "downloaded" ? null : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            Button,
            {
              size: "sm",
              variant: "primary",
              icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DownloadIcon, { size: 12 }),
              loading: props.downloadingJava,
              disabled: props.downloadingJava,
              onClick: props.onDownloadJava,
              children: props.env.java.available ? "重新下载 Java" : "下载 Java"
            }
          )
        ] }),
        bodyClassName: "dshdb-panel-body-pad",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(JavaBadge, { env: props.env }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { marginTop: 8 }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
            Field,
            {
              label: "Java 可执行文件",
              hint: "留空时优先使用随包内置或已下载的 Java，再按 JAVA_HOME、PATH、常见 JDK 目录查找",
              children: [
                javaOptions.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                  Select,
                  {
                    options: javaOptions,
                    value: draft.javaPath,
                    onValueChange: (value) => update("javaPath", value)
                  }
                ) : null,
                /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                  TextInput,
                  {
                    value: draft.javaPath,
                    placeholder: "例如 C:\\\\\\\\Program Files\\\\\\\\Java\\\\\\\\jdk-21\\\\\\\\bin\\\\\\\\java.exe",
                    onChange: (event) => update("javaPath", event.target.value)
                  }
                )
              ]
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { marginTop: 6, fontSize: 11 }, children: "下载的 Java 运行环境保存在数据目录的 jre 文件夹，随面板一起升级，不会影响系统已有的 JDK。" }),
          !props.env.bridgeBuilt ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Banner, { tone: "warn", children: "JDBC 桥接器缺失，SQL 连接将不可用。运行 `npm run build:bridge` 后重试。" }) }) : null,
          !props.env.java.available && presets.some((driver) => driver.needsJava) ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Banner, { tone: "warn", children: "未检测到 Java，关系型数据库驱动需要 Java 8 及以上运行环境。可点击右上角「下载 Java」自动安装。" }) }) : null
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      Panel,
      {
        title: "查询与安全",
        collapsible: true,
        defaultOpen: false,
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          Button,
          {
            size: "sm",
            variant: "primary",
            loading: props.saving,
            onClick: () => props.onSave(draft),
            children: "保存"
          }
        ),
        bodyClassName: "dshdb-panel-body-pad",
        children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-form", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-form-grid", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Field, { label: "返回行数上限", hint: "面板与工具共用的硬上限", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              TextInput,
              {
                type: "number",
                min: 1,
                max: 1e4,
                value: String(draft.maxRows),
                onChange: (event) => updateNumber("maxRows", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Field, { label: "查询超时（秒）", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              TextInput,
              {
                type: "number",
                min: 1,
                max: 600,
                value: String(draft.queryTimeoutSec),
                onChange: (event) => updateNumber("queryTimeoutSec", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Field, { label: "连接超时（秒）", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              TextInput,
              {
                type: "number",
                min: 1,
                max: 120,
                value: String(draft.connectTimeoutSec),
                onChange: (event) => updateNumber("connectTimeoutSec", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Field, { label: "Redis 单次扫描数量", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              TextInput,
              {
                type: "number",
                min: 10,
                max: 2e3,
                value: String(draft.redisScanCount),
                onChange: (event) => updateNumber("redisScanCount", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Field, { label: "Maven 镜像", hint: "驱动 jar 下载源", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              Select,
              {
                options: [
                  { value: "central", label: "Maven Central" },
                  { value: "aliyun", label: "阿里云镜像" }
                ],
                value: draft.mavenMirror,
                onValueChange: (value) => update("mavenMirror", value === "aliyun" ? "aliyun" : "central")
              }
            ) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-list", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              Switch,
              {
                checked: draft.allowAgentWrites,
                onChange: (checked) => update("allowAgentWrites", checked),
                label: "允许 Agent 工具执行写语句（仅非只读连接）"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              Switch,
              {
                checked: draft.confirmDestructive,
                onChange: (checked) => update("confirmDestructive", checked),
                label: "执行破坏性操作前需要二次确认"
              }
            )
          ] })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      Panel,
      {
        title: "快捷键",
        collapsible: true,
        defaultOpen: false,
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "ghost", onClick: () => update("keybindings", {}), children: "恢复默认" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "primary", loading: props.saving, onClick: () => props.onSave(draft), children: "保存" })
        ] }),
        bodyClassName: "dshdb-panel-body-pad",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { fontSize: 11.5, lineHeight: 1.6 }, children: "点一下组合键框，再按下新的组合键即可（Esc 取消，Delete 恢复这一项的默认）。组合键要带 Ctrl/⌘ 或 Alt，功能键可以单独用；同一区域里不能重复，改完点「保存」。" }),
          SHORTCUT_SCOPES.map((scope) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { marginTop: 8 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-qfilter-label", children: SHORTCUT_SCOPE_LABEL[scope] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-list", children: SHORTCUTS.filter((def) => def.scope === scope).map((def) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              ShortcutRow,
              {
                def,
                overrides: keybindings,
                onChange: (binding) => {
                  const next = { ...keybindings };
                  if (binding === null) delete next[def.id];
                  else next[def.id] = binding;
                  update("keybindings", next);
                }
              },
              def.id
            )) })
          ] }, scope))
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      Panel,
      {
        title: "数据源工具栏",
        collapsible: true,
        defaultOpen: false,
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "ghost", onClick: () => update("toolbarActions", []), children: "恢复默认" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "primary", loading: props.saving, onClick: () => props.onSave(draft), children: "保存" })
        ] }),
        bodyClassName: "dshdb-panel-body-pad",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { fontSize: 11.5, lineHeight: 1.6 }, children: "数据源工具栏按钮的左右顺序；窗口太窄放不下时，末尾的按钮会收进「⋯」菜单。" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-list", children: toolbarOrder.map((id, index) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-action-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-action-icon", children: toolbarActionIcon(id, 13) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-driver-main", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-driver-name", children: TOOLBAR_ACTION_LABEL[id] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ArrowUpIcon, { size: 12 }),
                "aria-label": `上移 ${TOOLBAR_ACTION_LABEL[id]}`,
                title: "上移",
                disabled: index === 0,
                onClick: () => moveToolbarAction(id, -1)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ArrowDownIcon, { size: 12 }),
                "aria-label": `下移 ${TOOLBAR_ACTION_LABEL[id]}`,
                title: "下移",
                disabled: index === toolbarOrder.length - 1,
                onClick: () => moveToolbarAction(id, 1)
              }
            )
          ] }, id)) })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      Panel,
      {
        title: "控制台",
        collapsible: true,
        defaultOpen: false,
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "primary", loading: props.saving, onClick: () => props.onSave(draft), children: "保存" }),
        bodyClassName: "dshdb-panel-body-pad",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-list", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            Switch,
            {
              checked: draft.consoleAutoComplete !== false,
              onChange: (checked) => update("consoleAutoComplete", checked),
              label: "输入字符后自动展开补全列表"
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { fontSize: 11.5, lineHeight: 1.6 }, children: "默认开启。关闭后仍可按补全快捷键手动展开表名、列名建议。" })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      Panel,
      {
        title: "控制台工具栏",
        collapsible: true,
        defaultOpen: false,
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "ghost", onClick: () => update("consoleActions", []), children: "恢复默认" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "primary", loading: props.saving, onClick: () => props.onSave(draft), children: "保存" })
        ] }),
        bodyClassName: "dshdb-panel-body-pad",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { fontSize: 11.5, lineHeight: 1.6 }, children: "控制台工具栏按钮的左右顺序；窗口太窄放不下时，末尾的按钮会收进「⋯」菜单。" }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-list", children: actionOrder.map((id, index) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-action-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-action-icon", children: consoleActionIcon(id, 13) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-driver-main", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-driver-name", children: CONSOLE_ACTION_LABEL[id] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ArrowUpIcon, { size: 12 }),
                "aria-label": `上移 ${CONSOLE_ACTION_LABEL[id]}`,
                title: "上移",
                disabled: index === 0,
                onClick: () => moveAction(id, -1)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ArrowDownIcon, { size: 12 }),
                "aria-label": `下移 ${CONSOLE_ACTION_LABEL[id]}`,
                title: "下移",
                disabled: index === actionOrder.length - 1,
                onClick: () => moveAction(id, 1)
              }
            )
          ] }, id)) })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      Panel,
      {
        title: "预置驱动",
        collapsible: true,
        defaultOpen: false,
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", variant: "ghost", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(RefreshIcon, { size: 12 }), onClick: props.onRefresh, children: "重新检测" }),
        bodyClassName: "dshdb-panel-body-pad",
        children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-list", children: presets.map((driver) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DatabaseIcon, { size: 15 }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-main", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-name", children: [
              driver.name,
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { children: driver.dialect }),
              driver.allJarsPresent ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "success", children: "已就绪" }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "warn", children: "缺少驱动" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-sub", title: driver.jars.map((jar) => jar.coordinates).join(", "), children: [
              driver.driverClass ?? "—",
              driver.jars.length > 0 ? ` · ${driver.jars.map((jar) => jar.file).join(", ")}` : ""
            ] }),
            driver.jars.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { marginTop: 3 }, children: driver.jars.map((jar) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-file-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: `dshdb-dot`, "data-tone": jar.downloaded ? "success" : "warn" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-mono", title: jar.coordinates, children: jar.file }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-muted", children: jar.downloaded ? formatBytes(jar.sizeBytes) : "未下载" })
            ] }, jar.coordinates)) }) : null
          ] }),
          driver.jars.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            Button,
            {
              size: "sm",
              icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DownloadIcon, { size: 12 }),
              loading: props.downloading === driver.id,
              disabled: driver.allJarsPresent,
              onClick: () => props.onDownload(driver.id),
              children: driver.allJarsPresent ? "已安装" : "下载"
            }
          ) : null
        ] }, driver.id)) })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      Panel,
      {
        title: "自定义驱动",
        collapsible: true,
        defaultOpen: false,
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PlusIcon, { size: 12 }), onClick: props.onAddCustomDriver, children: "新增" }),
        bodyClassName: "dshdb-panel-body-pad",
        children: customs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { fontSize: 11.5, lineHeight: 1.6 }, children: "没有自定义驱动。若数据库不在预置列表中，可填写 Maven 坐标、驱动类与 JDBC URL 模板自行扩展。" }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-list", children: customs.map((driver) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DatabaseIcon, { size: 15 }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-main", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-name", children: [
              driver.name,
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { children: driver.dialect })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-driver-sub", title: driver.urlTemplate, children: [
              driver.driverClass,
              " · ",
              driver.urlTemplate
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-driver-sub", children: driver.jars.map((jar) => jar.coordinates).join(" · ") || "未配置 jar" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(EditIcon, { size: 12 }),
              "aria-label": `编辑 ${driver.name}`,
              onClick: () => props.onEditCustomDriver(driver)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TrashIcon, { size: 12 }),
              "aria-label": `删除 ${driver.name}`,
              onClick: () => props.onDeleteCustomDriver(driver)
            }
          )
        ] }, driver.id)) })
      }
    ),
    props.downloading !== "" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Loading, { label: "正在下载驱动依赖…" }) : null
  ] });
}

// src/client/modals/SettingsModal.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function SettingsModal(props) {
  if (!props.open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Modal, { open: true, title: "数据库设置", width: 720, onClose: props.onClose, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
    SettingsView,
    {
      settings: props.settings,
      env: props.env,
      drivers: props.drivers,
      saving: props.saving,
      downloading: props.downloading,
      downloadingJava: props.downloadingJava,
      onSave: props.onSave,
      onRefresh: props.onRefresh,
      onDownload: props.onDownload,
      onDownloadJava: props.onDownloadJava,
      onAddCustomDriver: props.onAddCustomDriver,
      onEditCustomDriver: props.onEditCustomDriver,
      onDeleteCustomDriver: props.onDeleteCustomDriver
    }
  ) });
}

// src/client/modals/TrashModal.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
function addressOf(item) {
  const database = item.database === "" ? "" : ` / ${item.database}`;
  const redisDb = item.redisDb > 0 ? ` / db${String(item.redisDb)}` : "";
  return `${item.host}:${String(item.port)}${database}${redisDb}`;
}
function TrashModal(props) {
  if (!props.open) return null;
  const busy = props.busy !== null || props.emptying;
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
    Modal,
    {
      open: true,
      title: "回收站",
      width: 640,
      onClose: props.onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          Button,
          {
            size: "sm",
            variant: "danger",
            icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ClearIcon, {}),
            disabled: props.items.length === 0 || busy,
            loading: props.emptying,
            onClick: props.onEmpty,
            children: "清空回收站"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dshdb-modal-foot-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Button, { size: "sm", variant: "primary", onClick: props.onClose, children: "关闭" })
      ] }),
      children: props.items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        EmptyState,
        {
          icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(RecycleIcon, { size: 20 }),
          title: "回收站是空的",
          description: "删除的数据源会先放到这里，可随时恢复。"
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "dshdb-modal-message", children: "彻底删除会同时移除保存的密码与结构缓存，且无法撤销。" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dshdb-list", children: props.items.map((item) => {
          const rowBusy = props.busy?.id === item.id;
          return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-driver-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-driver-main", children: [
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-driver-name", children: [
                item.name,
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Tag, { children: dialectLabel(item.dialect) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-driver-sub", children: [
                addressOf(item),
                " · 删除于 ",
                formatDateTime(item.deletedAt)
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              Button,
              {
                size: "sm",
                loading: rowBusy && props.busy?.action === "restore",
                disabled: busy && !(rowBusy && props.busy?.action === "restore"),
                onClick: () => props.onRestore(item),
                children: "恢复"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              Button,
              {
                size: "sm",
                variant: "danger",
                icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(TrashIcon, {}),
                loading: rowBusy && props.busy?.action === "purge",
                disabled: busy && !(rowBusy && props.busy?.action === "purge"),
                onClick: () => props.onPurge(item),
                children: "彻底删除"
              }
            )
          ] }, item.id);
        }) })
      ] })
    }
  );
}

// src/client/views/DataView.tsx
var import_react17 = require("react");

// src/client/treefilter.ts
function parseFilter(filter) {
  const needle = filter.trim().toLowerCase();
  const dot = needle.indexOf(".");
  if (dot < 0) return { schema: "", name: needle };
  return { schema: needle.slice(0, dot), name: needle.slice(dot + 1) };
}
function matchesFilteredObject(query, schemaName, objectName2) {
  if (query.schema !== "" && !schemaName.toLowerCase().includes(query.schema)) return false;
  if (query.name !== "") return objectName2.toLowerCase().includes(query.name);
  return query.schema !== "";
}
function filterTargets(filter, connections, schemas, objects, expanded) {
  const query = parseFilter(filter);
  if (query.schema === "" && query.name === "") return { connections: [], schemas: [] };
  const schemaNeedle = query.schema === "" ? query.name : query.schema;
  const hitSchema = (text2) => text2.toLowerCase().includes(schemaNeedle);
  const hitName = (text2) => text2.toLowerCase().includes(query.name);
  const targets = { connections: [], schemas: [] };
  for (const connection of connections) {
    const schemaList = schemas[connection.id] ?? [];
    const hits = schemaList.filter((schema) => hitSchema(schema.name)).map((schema) => schema.name);
    const objectHits = Object.keys(objects).filter((key) => {
      if (!key.startsWith(`${connection.id}:`)) return false;
      const schemaName = key.slice(connection.id.length + 1);
      return (objects[key] ?? []).some((object) => matchesFilteredObject(query, schemaName, object.name));
    });
    const connectionHit = query.name !== "" && hitName(connection.name) || hits.length > 0 || objectHits.length > 0;
    if (!connectionHit) continue;
    if (expanded[connection.id] !== true) targets.connections.push(connection.id);
    const wanted = new Set(hits);
    for (const key of objectHits) wanted.add(key.slice(connection.id.length + 1));
    for (const schema of wanted) {
      if (expanded[`${connection.id}:${schema}`] === true) continue;
      targets.schemas.push(`${connection.id}:${schema}`);
    }
  }
  return targets;
}

// src/client/redisview.tsx
var import_react11 = require("react");

// src/client/copyflash.ts
var import_react10 = require("react");
function useCopyFlash(duration = 1500) {
  const [copied, setCopied] = (0, import_react10.useState)(false);
  (0, import_react10.useEffect)(() => {
    if (!copied) return void 0;
    const timer = setTimeout(() => setCopied(false), duration);
    return () => clearTimeout(timer);
  }, [copied, duration]);
  const flash = (0, import_react10.useCallback)((ok) => {
    if (ok) setCopied(true);
  }, []);
  const reset = (0, import_react10.useCallback)(() => {
    setCopied(false);
  }, []);
  return { copied, flash, reset };
}

// src/client/redisvalue.ts
function text(value) {
  if (value === null || value === void 0) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value) ?? String(value);
}
function asRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value;
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function parseJsonContainer(text2) {
  const trimmed = text2.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed !== null && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
function prettyJsonText(text2) {
  const parsed = parseJsonContainer(text2);
  return parsed === null ? text2 : JSON.stringify(parsed, null, 2);
}
function redisValueText(value) {
  if (typeof value === "string") return prettyJsonText(value);
  if (value === null) return "NULL";
  return stringifyJson(value);
}
function redisValueTable(value) {
  switch (value.type) {
    case "string": {
      const raw = text(value.value);
      return parseJsonContainer(raw) === null ? { headers: ["值"], rows: [[raw]] } : null;
    }
    case "hash": {
      const record = asRecord(value.value);
      if (record === null) return null;
      return { headers: ["字段", "值"], rows: Object.entries(record).map(([field, item]) => [field, text(item)]) };
    }
    case "list":
      return { headers: ["#", "值"], rows: asArray(value.value).map((item, index) => [String(index + 1), text(item)]) };
    case "set":
      return { headers: ["#", "成员"], rows: asArray(value.value).map((item, index) => [String(index + 1), text(item)]) };
    case "zset":
      return {
        headers: ["成员", "分数"],
        rows: asArray(value.value).map((item) => {
          const record = asRecord(item) ?? {};
          return [text(record.member), text(record.score)];
        })
      };
    case "stream":
      return {
        headers: ["ID", "字段"],
        rows: asArray(value.value).map((item) => {
          const entry = asArray(item);
          return [text(entry[0]), text(entry[1])];
        })
      };
    default:
      return null;
  }
}
function redisTtlLabel(ttl) {
  if (!Number.isFinite(ttl) || ttl < 0 || ttl >= 60) return formatTtl(ttl);
  return `${Math.max(0, Math.round(ttl))}s`;
}

// src/client/redisview.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
var DISPLAY_TEXT_LIMIT = 64 * 1024;
var RedisValuePanel = (0, import_react11.memo)(function RedisValuePanel2({
  value,
  showKey = true,
  refreshing = false,
  onRefresh
}) {
  const table = redisValueTable(value);
  const fullText = redisValueText(value.value);
  const text2 = fullText.slice(0, DISPLAY_TEXT_LIMIT);
  const clippedCells = table !== null && table.rows.some((row) => row.some((cell) => cell.length > DISPLAY_TEXT_LIMIT));
  const clipped = fullText.length > DISPLAY_TEXT_LIMIT || clippedCells;
  const keyFlash = useCopyFlash();
  const valueFlash = useCopyFlash();
  const copied = keyFlash.copied;
  const copiedValue = valueFlash.copied;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-redis-value", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-redis-meta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tag, { children: value.type }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-muted", children: redisTtlLabel(value.ttl) }),
      value.size === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "dshdb-muted", children: [
        formatCount(value.size),
        " 条"
      ] }),
      value.truncated ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tag, { tone: "warn", children: "已截断" }) : null,
      onRefresh === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-row-action",
          title: refreshing ? "正在重新读取" : "重新读取这个键",
          "aria-label": refreshing ? "正在刷新键值" : "刷新键值",
          disabled: refreshing,
          onClick: onRefresh,
          children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(RefreshIcon, { size: 12 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-row-action",
          title: value.truncated ? copiedValue ? "已复制取回的部分（列表已截断）" : "复制取回的部分（列表已截断）" : copiedValue ? "已复制值" : "复制值",
          "aria-label": copiedValue ? "值已复制" : "复制值",
          onClick: () => {
            void copyText(redisValueText(value.value)).then((ok) => valueFlash.flash(ok));
          },
          children: copiedValue ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(CheckIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(CopyIcon, { size: 12 })
        }
      ),
      showKey ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-redis-key", title: value.key, children: value.key }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          "button",
          {
            type: "button",
            className: "dshdb-row-action",
            title: copied ? "已复制键名" : "复制键名",
            "aria-label": copied ? "键名已复制" : "复制键名",
            onClick: () => {
              void copyText(value.key).then((ok) => keyFlash.flash(ok));
            },
            children: copied ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(CheckIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(CopyIcon, { size: 12 })
          }
        )
      ] }) : null
    ] }),
    table === null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("pre", { className: "dshdb-console-value", children: text2 }),
      clipped ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("p", { className: "dshdb-muted", style: { margin: "6px 0 0" }, children: [
        "值太大，只显示了前 ",
        DISPLAY_TEXT_LIMIT / 1024,
        " KB；复制按钮拿到的是完整值。"
      ] }) : null
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "dshdb-grid-wrap dshdb-redis-table", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("table", { className: "dshdb-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("th", { className: "dshdb-num", children: "#" }),
        table.headers.map((header) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("th", { children: header }, header))
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("tbody", { children: table.rows.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { className: "dshdb-num", children: index + 1 }),
        row.map((cell, column) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { title: cell.slice(0, 512), children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-mono", children: cell.slice(0, DISPLAY_TEXT_LIMIT) }) }, column))
      ] }, index)) })
    ] }) }),
    clipped ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("p", { className: "dshdb-muted", style: { margin: "6px 0 0" }, children: [
      "值太大，只显示了前 ",
      DISPLAY_TEXT_LIMIT / 1024,
      " KB；复制按钮拿到的是完整值。"
    ] }) : null
  ] });
});

// src/client/views/tree-menu.tsx
var import_react12 = require("react");
var import_jsx_runtime11 = require("react/jsx-runtime");
function placeMenu(clientX, clientY, items) {
  const width = 200;
  const height = 24 * items.length + 12;
  return {
    x: Math.min(clientX, Math.max(0, window.innerWidth - width - 8)),
    y: Math.min(clientY, Math.max(0, window.innerHeight - height - 8))
  };
}
function TreeMenu({ menu, onClose }) {
  const listRef = (0, import_react12.useRef)(null);
  (0, import_react12.useEffect)(() => {
    if (menu === null) return void 0;
    const close = () => onClose();
    const enabled = () => Array.from(listRef.current?.querySelectorAll('button[role="menuitem"]:not([disabled])') ?? []);
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    enabled()[0]?.focus();
    const onKey = (event) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
      const items = enabled();
      if (items.length === 0) return;
      event.preventDefault();
      const index = items.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowDown" ? (index + 1) % items.length : index <= 0 ? items.length - 1 : index - 1;
      items[next]?.focus();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      if (previous !== null && previous.isConnected) previous.focus();
    };
  }, [menu, onClose]);
  if (menu === null) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
    "div",
    {
      ref: listRef,
      className: "dshdb-hmenu",
      role: "menu",
      "aria-label": "对象操作",
      style: { left: menu.x, top: menu.y },
      onPointerDown: (event) => event.stopPropagation(),
      children: menu.items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "button",
        {
          type: "button",
          role: "menuitem",
          disabled: item.disabled === true,
          onClick: () => {
            onClose();
            item.run();
          },
          children: item.label
        },
        `${item.label}-${index}`
      ))
    }
  );
}

// src/client/views/tree-parts.tsx
var import_react13 = require("react");

// src/client/highlight.ts
function highlightParts(text2, query) {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [{ text: text2, hit: false }];
  const haystack = text2.toLowerCase();
  const parts = [];
  let start = 0;
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + needle.length)) {
    if (index > start) parts.push({ text: text2.slice(start, index), hit: false });
    parts.push({ text: text2.slice(index, index + needle.length), hit: true });
    start = index + needle.length;
  }
  if (start < text2.length) parts.push({ text: text2.slice(start), hit: false });
  return parts;
}

// src/client/views/tree-parts.tsx
var import_jsx_runtime12 = require("react/jsx-runtime");
function objectIcon(kind) {
  if (kind === "table") return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(TableIcon, { size: 13 });
  if (kind === "view") return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ViewIcon, { size: 13 });
  if (kind === "procedure" || kind === "function") return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(FunctionIcon, { size: 13 });
  if (kind === "sequence") return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(SequenceIcon, { size: 13 });
  if (kind === "trigger") return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(TriggerIcon, { size: 13 });
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(FolderIcon, { size: 13 });
}
var DEPTH_THREE = { "--dshdb-depth": 3 };
var DEPTH_FOUR = { "--dshdb-depth": 4 };
var DEPTH_FIVE = { "--dshdb-depth": 5 };
function RowToggle({
  open,
  title,
  onToggle
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
    "span",
    {
      className: "dshdb-row-toggle dshdb-row-toggle-action",
      role: "presentation",
      title,
      onClick: (event) => {
        event.stopPropagation();
        onToggle();
      },
      onDoubleClick: (event) => event.stopPropagation(),
      children: open ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ChevronRightIcon, { size: 12 })
    }
  );
}
function DetailFolder({
  label,
  icon,
  count,
  depth,
  level,
  open,
  onToggle,
  onSelect,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
      "button",
      {
        type: "button",
        className: "dshdb-row",
        role: "treeitem",
        "aria-level": level,
        "aria-expanded": open,
        "data-kind": "folder",
        style: depth,
        onClick: onSelect,
        onDoubleClick: onToggle,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(RowToggle, { open, title: open ? `收起${label}` : `展开${label}`, onToggle }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-icon", children: icon }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-label", children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-meta", children: count })
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { role: "group", children }) : null
  ] });
}
function Highlight({ text: text2, query }) {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(import_jsx_runtime12.Fragment, { children: highlightParts(text2, query).map(
    (part, index) => part.hit ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("mark", { className: "dshdb-mark", children: part.text }, index) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: part.text }, index)
  ) });
}
var ObjectRow = (0, import_react13.memo)(function ObjectRow2({
  connectionId,
  schema,
  object,
  selected,
  open: openProp,
  columnOpen,
  keyOpen,
  indexOpen,
  description,
  loading,
  onSelect,
  onOpen,
  onToggleKey,
  onMenu,
  query
}) {
  const isRelation = object.kind === "table" || object.kind === "view";
  const key = `${connectionId}|${schema}.${object.name}`;
  const open = isRelation && openProp;
  const keys = description?.indexes.filter((index) => index.primary === true || index.unique === true) ?? [];
  const indexes = description?.indexes ?? [];
  const columnFolderKey = `${key}#columns`;
  const keyFolderKey = `${key}#keys`;
  const indexFolderKey = `${key}#indexes`;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
      "button",
      {
        type: "button",
        className: "dshdb-row",
        role: "treeitem",
        "aria-level": 4,
        "aria-expanded": isRelation ? open : void 0,
        "data-active": selected,
        "data-kind": object.kind,
        style: DEPTH_THREE,
        title: object.comment ? `${object.name} — ${object.comment}` : `${object.name}（${objectKindLabel(object.kind)}）`,
        onClick: (event) => {
          if (event.detail > 1) return;
          onSelect(connectionId, schema, object);
        },
        onDoubleClick: () => {
          if (!isRelation) return;
          onSelect(connectionId, schema, object);
          onOpen(connectionId, schema, object);
        },
        onKeyDown: (event) => {
          if (event.key !== "Enter" || !isRelation) return;
          event.preventDefault();
          onSelect(connectionId, schema, object);
          onOpen(connectionId, schema, object);
        },
        onContextMenu: onMenu === void 0 ? void 0 : (event) => onMenu(event, connectionId, schema, object),
        children: [
          isRelation ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            RowToggle,
            {
              open,
              title: open ? "收起结构" : "展开结构",
              onToggle: () => {
                onSelect(connectionId, schema, object);
                onToggleKey(key);
              }
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-toggle" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-icon", children: objectIcon(object.kind) }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-label", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Highlight, { text: object.name, query }) }),
          loading ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Loading, { bare: true }) : null
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { role: "group", children: [
      loading && description === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 52px" }, children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(Loading, { bare: true, label: "正在读取结构…" }) }) : null,
      !loading && description === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 52px" }, children: "未连接数据源，连接后可查看结构" }) : null,
      description !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
          DetailFolder,
          {
            level: 5,
            label: "列",
            icon: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ColumnIcon, { size: 13 }),
            count: description.columns.length,
            depth: DEPTH_FOUR,
            open: columnOpen,
            onToggle: () => onToggleKey(columnFolderKey),
            onSelect: () => onSelect(connectionId, schema, object),
            children: description.columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "dshdb-row", style: DEPTH_FIVE, "data-kind": "column", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-toggle" }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ColumnIcon, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-label", children: column.name }),
              column.primaryKey ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-tag", "data-tone": "key", children: "PK" }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-meta", children: column.typeName })
            ] }, column.name))
          }
        ),
        keys.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
          DetailFolder,
          {
            level: 5,
            label: "键",
            icon: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(KeyIcon, { size: 13 }),
            count: keys.length,
            depth: DEPTH_FOUR,
            open: keyOpen,
            onToggle: () => onToggleKey(keyFolderKey),
            onSelect: () => onSelect(connectionId, schema, object),
            children: keys.map((index) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "dshdb-row", style: DEPTH_FIVE, "data-kind": "key", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-toggle" }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(KeyIcon, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-label", children: index.primary ? "主键" : index.name }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-meta", children: index.columns.join(", ") })
            ] }, index.name))
          }
        ) : null,
        indexes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
          DetailFolder,
          {
            level: 5,
            label: "索引",
            icon: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(IndexIcon, { size: 13 }),
            count: indexes.length,
            depth: DEPTH_FOUR,
            open: indexOpen,
            onToggle: () => onToggleKey(indexFolderKey),
            onSelect: () => onSelect(connectionId, schema, object),
            children: indexes.map((index) => /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "dshdb-row", style: DEPTH_FIVE, "data-kind": "index", children: [
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-toggle" }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(IndexIcon, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-label", children: index.name }),
              /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { className: "dshdb-row-meta", children: index.columns.join(", ") })
            ] }, index.name))
          }
        ) : null
      ] }) : null
    ] }) : null
  ] });
});

// src/client/relativetime.ts
function agoText(seconds) {
  if (!Number.isFinite(seconds)) return "刚刚";
  const whole = Math.max(0, Math.floor(seconds));
  if (whole < 60) return "刚刚";
  const minutes = Math.floor(whole / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}
function relativeTime(iso) {
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return "";
  return agoText((Date.now() - stamp) / 1e3);
}

// src/client/views/objectlimit.ts
var OBJECT_PAGE = 200;
function objectWindow(total, extra) {
  const asked = Math.trunc(Number.isFinite(extra) ? extra : 0);
  const visible = Math.min(Math.max(0, total), OBJECT_PAGE + Math.max(0, asked));
  return { visible, hidden: Math.max(0, total - visible) };
}

// src/client/views/tree-rows.ts
var TREE_FOLDERS = [
  { id: "table", label: "表" },
  { id: "view", label: "视图" },
  { id: "routine", label: "例程" },
  { id: "sequence", label: "序列" },
  { id: "trigger", label: "触发器" },
  { id: "other", label: "其他" }
];
function folderOf(kind) {
  if (kind === "procedure" || kind === "function") return "routine";
  if (kind === "sequence" || kind === "trigger" || kind === "view" || kind === "table") return kind;
  return "other";
}
var emptyBuckets = () => ({
  table: [],
  view: [],
  routine: [],
  sequence: [],
  trigger: [],
  other: []
});
function note(rows, key, label, depth, loading = false) {
  rows.push({
    key,
    kind: "note",
    dataKind: "note",
    ariaLevel: depth + 1,
    depth,
    navigable: false,
    expandable: false,
    open: false,
    label,
    loading
  });
}
function buildBuckets(state, filter, query) {
  const buckets = /* @__PURE__ */ new Map();
  for (const [key, list] of Object.entries(state.objects)) {
    const grouped = emptyBuckets();
    const schemaName = key.slice(key.indexOf(":") + 1);
    for (const object of list) {
      if (filter !== "" && !matchesFilteredObject(query, schemaName, object.name)) continue;
      grouped[folderOf(object.kind)].push(object);
    }
    buckets.set(key, grouped);
  }
  return buckets;
}
function buildTreeRows(state) {
  const filter = state.filter.trim().toLowerCase();
  const query = parseFilter(state.filter);
  const matches = (text2) => filter === "" || text2.toLowerCase().includes(filter);
  const context = {
    state,
    filter,
    query,
    buckets: buildBuckets(state, filter, query),
    rows: [],
    matches
  };
  for (const connection of state.connections) {
    appendConnection(context, connection);
  }
  return context.rows;
}
function treeFilterSummary(state) {
  const filter = state.filter.trim().toLowerCase();
  if (filter === "") return { connections: 0, objects: 0 };
  const query = parseFilter(state.filter);
  const matches = (text2) => text2.toLowerCase().includes(filter);
  const summary = { connections: 0, objects: 0 };
  for (const connection of state.connections) {
    const shownSchemas = state.visibleSchemas[connection.id] ?? null;
    let hit = matches(connection.name);
    for (const schema of state.schemas[connection.id] ?? []) {
      if (shownSchemas !== null && !shownSchemas.includes(schema.name)) continue;
      let objectHits = 0;
      for (const object of state.objects[`${connection.id}:${schema.name}`] ?? []) {
        if (matchesFilteredObject(query, schema.name, object.name)) objectHits += 1;
      }
      if (objectHits > 0 || matches(schema.name)) {
        summary.objects += objectHits;
        hit = true;
      }
    }
    if (connection.dialect === "redis") {
      const keysByDb = state.redisKeys[connection.id];
      if (keysByDb === void 0 || Object.values(keysByDb).some((keys) => keys.some((key) => matches(key.key)))) {
        hit = true;
      }
    }
    if (hit) summary.connections += 1;
  }
  return summary;
}
function appendConnection(context, connection) {
  const { state, filter, matches, rows } = context;
  const server = state.servers[connection.id];
  const connecting = state.connectingId === connection.id;
  const loading = state.loadingSchemas[connection.id] === true;
  const cachedStamp = state.cachedAt[connection.id];
  const allSchemas = state.schemas[connection.id] ?? [];
  const shownSchemas = state.visibleSchemas[connection.id] ?? null;
  const redis = connection.dialect === "redis";
  const redisKeys = redis ? state.redisKeys[connection.id] : void 0;
  const redisDbs = state.redisDbs[connection.id] ?? [connection.redisDb];
  const hasCachedStructure = allSchemas.length > 0 || redisKeys !== void 0 || redis && state.redisDatabases[connection.id] !== void 0;
  const schemas = [];
  for (const schema of allSchemas) {
    if (shownSchemas !== null && !shownSchemas.includes(schema.name)) continue;
    const buckets = context.buckets.get(`${connection.id}:${schema.name}`);
    if (matches(schema.name) || buckets !== void 0 && TREE_FOLDERS.some((folder) => buckets[folder.id].length > 0)) {
      schemas.push(schema);
    }
  }
  const redisMatches = redis && (redisKeys === void 0 || Object.values(redisKeys).some((keys) => keys.some((key) => matches(key.key))));
  const visible = filter === "" || matches(connection.name) || schemas.length > 0 || redisMatches || allSchemas.length === 0 && server === void 0 && !loading;
  if (!visible) return;
  const dbItems = Array.from({ length: state.redisDatabases[connection.id] ?? 16 }, (_, index) => ({
    id: String(index),
    label: index === connection.redisDb ? `db${index}（默认）` : `db${index}`
  }));
  const picker = redis ? {
    title: "选择要展示的数据库",
    allLabel: "所有数据库",
    items: dbItems,
    visible: redisDbs.map(String),
    mode: "redis-dbs"
  } : {
    title: "选择要展示的架构",
    allLabel: "所有架构",
    items: allSchemas.map((schema) => ({ id: schema.name, label: schema.name })),
    visible: shownSchemas,
    mode: "schemas"
  };
  rows.push({
    key: connection.id,
    kind: "connection",
    dataKind: "datasource",
    ariaLevel: 1,
    depth: 0,
    navigable: true,
    expandable: true,
    open: state.expanded[connection.id] === true,
    connectionId: connection.id,
    label: connection.name,
    query: filter,
    title: `${connection.name} · ${connection.host}:${connection.port}${redis ? ` · db${connection.redisDb}` : ""}${cachedStamp ? `
离线可用 · 结构更新于 ${relativeTime(cachedStamp)}` : ""}`,
    tag: DIALECT_LABEL[connection.dialect],
    readOnly: connection.readOnly,
    cacheLabel: !server && cachedStamp !== void 0 && hasCachedStructure ? `缓存 ${relativeTime(cachedStamp)}` : void 0,
    picker,
    connecting,
    online: server !== void 0,
    redis: connection.dialect === "redis"
  });
  if (state.expanded[connection.id] !== true) return;
  if (!server && !hasCachedStructure) {
    rows.push({
      key: `${connection.id}#connect`,
      kind: "connect",
      dataKind: "schema",
      ariaLevel: 2,
      depth: 1,
      navigable: !connecting,
      expandable: false,
      open: false,
      connectionId: connection.id,
      label: connecting ? "正在连接…" : `连接到 ${connection.host}:${connection.port}`,
      loading: connecting,
      connecting
    });
    return;
  }
  if (redis) {
    appendRedis(context, connection, redisDbs, server !== void 0);
    return;
  }
  if (loading) note(rows, `${connection.id}#loading`, "正在加载 schema…", 2, true);
  if (!loading && server === void 0 && hasCachedStructure) {
    note(rows, `${connection.id}#offline`, `离线缓存 · ${relativeTime(cachedStamp ?? "")}，连接后自动更新`, 2);
  }
  const pickerHidesAll = shownSchemas !== null && allSchemas.length > 0 && allSchemas.every((schema) => !shownSchemas.includes(schema.name));
  if (!loading && pickerHidesAll) {
    note(rows, `${connection.id}#hidden`, "全部 Schema 已隐藏，使用行尾按钮选择显示的架构", 2);
  }
  if (!loading && schemas.length === 0 && !pickerHidesAll) {
    note(rows, `${connection.id}#empty`, filter !== "" ? "没有匹配的 schema" : "没有 schema", 2);
  }
  for (const schema of schemas) appendSchema(context, connection, schema);
}
function appendSchema(context, connection, schema) {
  const { state, filter, query, matches, rows } = context;
  const key = `${connection.id}:${schema.name}`;
  const objectList = state.objects[key];
  const objectLoading = state.loadingObjects[key] === true;
  const buckets = context.buckets.get(key);
  const total = objectList === void 0 ? void 0 : TREE_FOLDERS.reduce((sum, folder) => sum + (buckets?.[folder.id].length ?? 0), 0);
  const schemaExpanded = state.expanded[key] === true;
  rows.push({
    key,
    kind: "schema",
    dataKind: "schema",
    ariaLevel: 2,
    depth: 1,
    navigable: true,
    expandable: true,
    open: schemaExpanded,
    toggleKey: key,
    selectedKey: `${connection.id}|schema:${schema.name}`,
    connectionId: connection.id,
    schema: schema.name,
    label: schema.name,
    query: query.schema === "" ? filter : query.schema,
    system: schema.system,
    loading: objectLoading,
    count: !objectLoading ? total : void 0,
    meta: !objectLoading && total !== void 0 ? String(total) : void 0
  });
  if (!schemaExpanded) return;
  if (objectLoading && objectList === void 0) {
    note(rows, `${key}#loading`, "正在加载对象…", 3, true);
  }
  if (!objectLoading && objectList !== void 0 && TREE_FOLDERS.every((folder) => (buckets?.[folder.id].length ?? 0) === 0)) {
    note(rows, `${key}#empty`, filter !== "" ? "没有匹配的对象" : "没有表或视图", 3);
  }
  if (objectList === void 0) return;
  for (const folder of TREE_FOLDERS) {
    const items = buckets?.[folder.id] ?? [];
    if (items.length === 0) continue;
    const folderKey = `${key}#${folder.id}`;
    const folderExpanded = state.expanded[folderKey] === true;
    rows.push({
      key: folderKey,
      kind: "folder",
      dataKind: "folder",
      ariaLevel: 3,
      depth: 2,
      navigable: true,
      expandable: true,
      open: folderExpanded,
      toggleKey: folderKey,
      selectedKey: `${connection.id}|${schema.name}#${folder.id}`,
      connectionId: connection.id,
      schema: schema.name,
      folder: folder.id,
      label: folder.label,
      meta: String(items.length),
      count: items.length
    });
    if (!folderExpanded) continue;
    const pageWindow = objectWindow(items.length, state.objectExtra[folderKey] ?? 0);
    for (const object of items.slice(0, pageWindow.visible)) {
      appendObject(context, connection, schema, object);
    }
    if (pageWindow.hidden > 0) {
      rows.push({
        key: `${folderKey}#more`,
        kind: "more",
        dataKind: "folder",
        ariaLevel: 4,
        depth: 3,
        navigable: true,
        expandable: false,
        open: false,
        pageKey: folderKey,
        label: pageWindow.hidden > OBJECT_PAGE ? `再显示 ${OBJECT_PAGE} 个（还有 ${pageWindow.hidden} 个）` : `显示剩余 ${pageWindow.hidden} 个`
      });
    }
  }
}
function appendObject(context, connection, schema, object) {
  const { state, filter, query, rows } = context;
  const objectKey = `${connection.id}|${schema.name}.${object.name}`;
  const relation = object.kind === "table" || object.kind === "view";
  const description = state.descriptions[objectKey];
  const loading = state.loadingDescriptions[objectKey] === true;
  const open = relation && state.expanded[objectKey] === true;
  rows.push({
    key: objectKey,
    kind: "object",
    dataKind: object.kind,
    ariaLevel: 4,
    depth: 3,
    navigable: true,
    expandable: relation,
    open,
    toggleKey: objectKey,
    selectedKey: objectKey,
    connectionId: connection.id,
    schema: schema.name,
    object,
    label: object.name,
    query: query.schema === "" ? filter : query.name,
    description,
    loading
  });
  if (!open) return;
  if (loading && description === void 0) {
    note(rows, `${objectKey}#loading`, "正在读取结构…", 4, true);
    return;
  }
  if (!loading && description === void 0) {
    note(rows, `${objectKey}#offline`, "未连接数据源，连接后可查看结构", 4);
    return;
  }
  if (description === void 0) return;
  const columnKey = `${objectKey}#columns`;
  const columnsOpen = state.expanded[columnKey] === true;
  rows.push({
    key: columnKey,
    kind: "detail-folder",
    dataKind: "folder",
    ariaLevel: 5,
    depth: 4,
    navigable: true,
    expandable: true,
    open: columnsOpen,
    toggleKey: columnKey,
    detailSection: "columns",
    connectionId: connection.id,
    schema: schema.name,
    object,
    label: "列",
    meta: String(description.columns.length),
    count: description.columns.length
  });
  if (columnsOpen) {
    for (const column of description.columns) {
      rows.push({
        key: `${columnKey}:${column.name}`,
        kind: "column",
        dataKind: "column",
        ariaLevel: 6,
        depth: 5,
        navigable: false,
        expandable: false,
        open: false,
        connectionId: connection.id,
        schema: schema.name,
        object,
        label: column.name,
        meta: column.typeName,
        primaryKey: column.primaryKey === true
      });
    }
  }
  const keys = description.indexes.filter((index) => index.primary === true || index.unique === true);
  if (keys.length > 0) {
    const keyFolder = `${objectKey}#keys`;
    const keysOpen = state.expanded[keyFolder] === true;
    rows.push({
      key: keyFolder,
      kind: "detail-folder",
      dataKind: "folder",
      ariaLevel: 5,
      depth: 4,
      navigable: true,
      expandable: true,
      open: keysOpen,
      toggleKey: keyFolder,
      detailSection: "keys",
      connectionId: connection.id,
      schema: schema.name,
      object,
      label: "键",
      meta: String(keys.length),
      count: keys.length
    });
    if (keysOpen) {
      for (const index of keys) {
        rows.push({
          key: `${keyFolder}:${index.name}`,
          kind: "key",
          dataKind: "key",
          ariaLevel: 6,
          depth: 5,
          navigable: false,
          expandable: false,
          open: false,
          connectionId: connection.id,
          schema: schema.name,
          object,
          label: index.primary ? "主键" : index.name,
          meta: index.columns.join(", ")
        });
      }
    }
  }
  if (description.indexes.length > 0) {
    const indexFolder = `${objectKey}#indexes`;
    const indexesOpen = state.expanded[indexFolder] === true;
    rows.push({
      key: indexFolder,
      kind: "detail-folder",
      dataKind: "folder",
      ariaLevel: 5,
      depth: 4,
      navigable: true,
      expandable: true,
      open: indexesOpen,
      toggleKey: indexFolder,
      detailSection: "indexes",
      connectionId: connection.id,
      schema: schema.name,
      object,
      label: "索引",
      meta: String(description.indexes.length),
      count: description.indexes.length
    });
    if (indexesOpen) {
      for (const index of description.indexes) {
        rows.push({
          key: `${indexFolder}:${index.name}`,
          kind: "index",
          dataKind: "index",
          ariaLevel: 6,
          depth: 5,
          navigable: false,
          expandable: false,
          open: false,
          connectionId: connection.id,
          schema: schema.name,
          object,
          label: index.name,
          meta: index.columns.join(", ")
        });
      }
    }
  }
}
function appendRedis(context, connection, visibleDbs, online) {
  const { state, filter, rows } = context;
  if (visibleDbs.length === 0) {
    note(rows, `${connection.id}#redis-empty`, "未选择数据库，使用行尾的数据库按钮选择", 2);
    return;
  }
  const keysByDb = state.redisKeys[connection.id];
  const cursors = state.redisCursor[connection.id];
  const loadingByDb = state.loadingRedisKeys[connection.id];
  for (const db of visibleDbs) {
    const nodeKey = `${connection.id}:redis:db${db}`;
    const open = state.expanded[nodeKey] !== false;
    const keys = keysByDb?.[String(db)];
    const loading = loadingByDb?.[String(db)] === true;
    const cursor = cursors?.[String(db)];
    const list = (keys ?? []).filter((key) => filter === "" || key.key.toLowerCase().includes(filter));
    const hasMore = cursor !== void 0 && cursor !== "0";
    rows.push({
      key: nodeKey,
      kind: "redis-db",
      dataKind: "schema",
      ariaLevel: 2,
      depth: 1,
      navigable: true,
      expandable: true,
      open,
      toggleKey: nodeKey,
      selectedKey: `${connection.id}|redisdb:${db}`,
      connectionId: connection.id,
      db,
      label: `db${db}`,
      mono: true,
      title: `Redis 逻辑库 db${db}${db === connection.redisDb ? "（默认）" : ""}`,
      defaultDb: db === connection.redisDb,
      loading,
      online,
      meta: !loading && keys !== void 0 ? `${keys.length} 个键` : void 0
    });
    if (!open) continue;
    if (keys === void 0 && loading) {
      note(rows, `${nodeKey}#loading`, "正在扫描键…", 2, true);
    }
    if (keys === void 0 && !loading) {
      rows.push({
        key: `${nodeKey}#scan`,
        kind: "redis-action",
        dataKind: "folder",
        ariaLevel: 3,
        depth: 2,
        navigable: true,
        expandable: false,
        open: false,
        action: "scan",
        connectionId: connection.id,
        db,
        label: "扫描键"
      });
    }
    if (keys !== void 0 && list.length === 0) {
      note(rows, `${nodeKey}#empty`, filter !== "" ? "没有匹配的键" : "没有键", 2);
    }
    for (const key of list) {
      rows.push({
        key: `${nodeKey}:${key.key}`,
        kind: "redis-key",
        dataKind: "redis-key",
        ariaLevel: 4,
        depth: 2,
        navigable: true,
        expandable: false,
        open: false,
        connectionId: connection.id,
        db,
        redisKey: key,
        selectedKey: `${connection.id}|redis:${db}:${key.key}`,
        label: key.key,
        query: filter,
        title: `${key.key} · ${key.type} · TTL ${redisTtlLabel(key.ttl)}`,
        tag: key.type,
        meta: key.size === void 0 ? void 0 : String(key.size)
      });
    }
    if (hasMore) {
      rows.push({
        key: `${nodeKey}#more`,
        kind: "redis-action",
        dataKind: "folder",
        ariaLevel: 3,
        depth: 2,
        navigable: !loading,
        expandable: false,
        open: false,
        action: "load-more",
        connectionId: connection.id,
        db,
        loading,
        label: loading ? "正在加载…" : "加载更多键"
      });
    }
  }
}

// src/client/views/tree-row-view.tsx
var import_react15 = require("react");

// src/client/views/row-picker.tsx
var import_react14 = require("react");
var import_jsx_runtime13 = require("react/jsx-runtime");
function RowPicker({
  title,
  allLabel,
  items,
  visible,
  onToggle,
  onToggleAll
}) {
  const [open, setOpen] = (0, import_react14.useState)(false);
  const [query, setQuery] = (0, import_react14.useState)("");
  const anchor = (0, import_react14.useRef)(null);
  const close = (0, import_react14.useCallback)(() => {
    setOpen(false);
    setQuery("");
  }, []);
  const toggle = (0, import_react14.useCallback)(() => {
    setOpen((value) => !value);
    setQuery("");
  }, []);
  usePopoverDismiss(open, close, anchor);
  const allVisible = visible === null || items.length > 0 && items.every((item) => visible.includes(item.id));
  const noun = allLabel.replace(/^所有/, "");
  const needle = query.trim().toLowerCase();
  const shown = needle === "" ? items : items.filter(
    (item) => item.label.toLowerCase().includes(needle) || item.id.toLowerCase().includes(needle)
  );
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("span", { className: "dshdb-picker-anchor", ref: anchor, children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
      "span",
      {
        className: "dshdb-row-action",
        role: "button",
        tabIndex: 0,
        title,
        "aria-haspopup": "true",
        "aria-expanded": open,
        onClick: (event) => {
          event.stopPropagation();
          toggle();
        },
        onDoubleClick: (event) => event.stopPropagation(),
        onKeyDown: (event) => {
          event.stopPropagation();
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
          if (event.key === "Escape") setOpen(false);
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(ColumnsIcon, { size: 12 })
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "dshdb-picker", onClick: (event) => event.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("label", { className: "dshdb-picker-item dshdb-picker-all", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("input", { type: "checkbox", checked: allVisible, onChange: () => onToggleAll(!allVisible) }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: allLabel }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("em", { children: "添加模式" })
      ] }),
      items.length > 5 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
        "input",
        {
          className: "dshdb-input dshdb-picker-search",
          type: "search",
          value: query,
          placeholder: `查找${noun}…`,
          "aria-label": `查找${noun}`,
          autoFocus: true,
          onChange: (event) => setQuery(event.target.value),
          onKeyDown: (event) => {
            event.stopPropagation();
            if (event.key === "Escape") close();
          }
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "dshdb-picker-scroll", children: shown.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "dshdb-picker-empty", children: [
        "没有匹配的",
        noun
      ] }) : shown.map((item) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("label", { className: "dshdb-picker-item", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
          "input",
          {
            type: "checkbox",
            checked: visible === null || visible.includes(item.id),
            onChange: () => onToggle(item.id)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { children: item.label })
      ] }, item.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { className: "dshdb-picker-hint", children: "勾选即生效，点击空白处关闭" })
    ] }) : null
  ] });
}

// src/client/views/tree-row-view.tsx
var import_jsx_runtime14 = require("react/jsx-runtime");
var folderIcon = (folder) => {
  if (folder === "table") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(TableIcon, { size: 13 });
  if (folder === "view") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ViewIcon, { size: 13 });
  if (folder === "routine") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(FunctionIcon, { size: 13 });
  if (folder === "sequence") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(SequenceIcon, { size: 13 });
  if (folder === "trigger") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(TriggerIcon, { size: 13 });
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(FolderIcon, { size: 13 });
};
var detailIcon = (section) => {
  if (section === "columns") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ColumnIcon, { size: 13 });
  if (section === "keys") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(KeyIcon, { size: 13 });
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(IndexIcon, { size: 13 });
};
var rowIcon = (row) => {
  switch (row.kind) {
    case "connection":
    case "schema":
    case "redis-db":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(DatabaseIcon, { size: 13 });
    case "folder":
      return folderIcon(row.folder);
    case "detail-folder":
      return detailIcon(row.detailSection);
    case "object":
      return row.object === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(FolderIcon, { size: 13 }) : objectIcon2(row.object);
    case "column":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ColumnIcon, { size: 13 });
    case "key":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(KeyIcon, { size: 13 });
    case "index":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(IndexIcon, { size: 13 });
    case "redis-key":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(KeyIcon, { size: 13 });
    default:
      return null;
  }
};
function objectIcon2(object) {
  if (object.kind === "table") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(TableIcon, { size: 13 });
  if (object.kind === "view") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ViewIcon, { size: 13 });
  if (object.kind === "procedure" || object.kind === "function") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(FunctionIcon, { size: 13 });
  if (object.kind === "sequence") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(SequenceIcon, { size: 13 });
  if (object.kind === "trigger") return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(TriggerIcon, { size: 13 });
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(FolderIcon, { size: 13 });
}
var toggleTitle = (row) => {
  if (row.kind === "connection") return row.open ? "收起数据源" : "展开数据源";
  if (row.kind === "schema") return row.open ? "收起 Schema" : "展开 Schema";
  if (row.kind === "redis-db") return row.open ? "收起数据库" : "展开数据库";
  return row.open ? `收起${row.label ?? ""}` : `展开${row.label ?? ""}`;
};
var rowTitle = (row) => {
  if (row.kind !== "object" || row.object === void 0) return row.title;
  const object = row.object;
  return object.comment === void 0 || object.comment === "" ? `${object.name}（${objectKindLabel(object.kind)}）` : `${object.name} — ${object.comment}`;
};
var pickerToggle = (row, actions, id) => {
  if (row.connectionId === void 0 || row.picker === void 0) return;
  if (row.picker.mode === "redis-dbs") actions.toggleRedisDbVisible(row.connectionId, Number(id));
  else actions.toggleSchemaVisible(row.connectionId, id);
};
var pickerToggleAll = (row, actions, all) => {
  if (row.connectionId === void 0 || row.picker === void 0) return;
  if (row.picker.mode === "redis-dbs") actions.toggleAllRedisDbsVisible(row.connectionId, all);
  else actions.toggleAllSchemasVisible(row.connectionId, all);
};
var drawToggle = (row, actions) => {
  if (row.expandable) {
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(RowToggle, { open: row.open, title: toggleTitle(row), onToggle: () => actions.toggle(row) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-toggle" });
};
var drawLabel = (row) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: `dshdb-row-label${row.mono === true ? " dshdb-mono" : ""}`, children: row.query === void 0 || row.query === "" ? row.label : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Highlight, { text: row.label ?? "", query: row.query }) });
var drawMeta = (row) => row.meta === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-meta", children: row.meta });
function drawContent(row, actions) {
  switch (row.kind) {
    case "connection":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        drawToggle(row, actions),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(DatabaseIcon, { size: 13 }) }),
        drawLabel(row),
        row.tag === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Tag, { children: row.tag }),
        row.readOnly === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Tag, { tone: "warn", children: "只读" }) : null,
        row.cacheLabel === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-meta", children: row.cacheLabel }),
        row.picker === void 0 || row.connectionId === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          RowPicker,
          {
            title: row.picker.title,
            allLabel: row.picker.allLabel,
            items: row.picker.items,
            visible: row.picker.visible,
            onToggle: (id) => pickerToggle(row, actions, id),
            onToggleAll: (all) => pickerToggleAll(row, actions, all)
          }
        ),
        row.online === true || row.connecting === true ? null : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          "span",
          {
            className: "dshdb-row-action dshdb-connect-action",
            role: "button",
            tabIndex: 0,
            title: `连接 ${row.title?.split(" · ")[1] ?? ""}`,
            onClick: (event) => {
              event.stopPropagation();
              if (row.connectionId !== void 0) actions.connect(row.connectionId);
            },
            onDoubleClick: (event) => event.stopPropagation(),
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                if (row.connectionId !== void 0) actions.connect(row.connectionId);
              }
            },
            children: "连接"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          StateDot,
          {
            tone: row.online === true ? "success" : row.connecting === true ? "warn" : row.redis === true ? "business" : "idle"
          }
        )
      ] });
    case "connect":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-toggle" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: row.loading === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Loading, { bare: true }) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(DatabaseIcon, { size: 13 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-label dshdb-muted", children: row.label })
      ] });
    case "schema":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        drawToggle(row, actions),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(DatabaseIcon, { size: 13 }) }),
        drawLabel(row),
        row.system === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Tag, { children: "系统" }) : null,
        row.loading === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Loading, { bare: true }) : null,
        drawMeta(row)
      ] });
    case "folder":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        drawToggle(row, actions),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: rowIcon(row) }),
        drawLabel(row),
        drawMeta(row)
      ] });
    case "object":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        row.expandable ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          RowToggle,
          {
            open: row.open,
            title: row.open ? "收起对象" : "展开对象",
            onToggle: () => actions.toggle(row)
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-toggle" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: rowIcon(row) }),
        drawLabel(row),
        row.loading === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Loading, { bare: true }) : null
      ] });
    case "detail-folder":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        drawToggle(row, actions),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: rowIcon(row) }),
        drawLabel(row),
        drawMeta(row)
      ] });
    case "column":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-toggle" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ColumnIcon, { size: 13 }) }),
        drawLabel(row),
        row.primaryKey === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Tag, { tone: "business", children: "PK" }) : null,
        drawMeta(row)
      ] });
    case "key":
    case "index":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-toggle" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: rowIcon(row) }),
        drawLabel(row),
        drawMeta(row)
      ] });
    case "more":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-label dshdb-muted", children: row.label });
    case "redis-db":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        drawToggle(row, actions),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(DatabaseIcon, { size: 13 }) }),
        drawLabel(row),
        row.defaultDb === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-meta", children: "默认" }) : null,
        row.loading === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Loading, { bare: true }) : null,
        drawMeta(row)
      ] });
    case "redis-key":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-toggle" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(KeyIcon, { size: 13 }) }),
        drawLabel(row),
        row.tag === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Tag, { children: row.tag }),
        drawMeta(row)
      ] });
    case "redis-action":
      return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-toggle" }),
        row.loading === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Loading, { bare: true }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-label dshdb-muted", children: row.label })
      ] });
    default:
      return null;
  }
}
var dropClass = (drop) => {
  if (drop === "before") return " dshdb-row-drop-before";
  if (drop === "after") return " dshdb-row-drop-after";
  return "";
};
function selectedKind(kind) {
  return kind === "object" || kind === "redis-db";
}
var TreeRowView = (0, import_react15.memo)(function TreeRowView2({
  row,
  index,
  domId,
  selected,
  active,
  dragging,
  drop,
  dragEnabled,
  actions
}) {
  const style = { "--dshdb-depth": row.depth };
  if (row.kind === "note") {
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "dshdb-row dshdb-muted", role: "none", style, "data-index": index, children: [
      row.loading === true ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(Loading, { bare: true }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "dshdb-row-label", children: row.label })
    ] });
  }
  const className = `dshdb-row${dragging ? " dshdb-row-dragging" : ""}${dropClass(drop)}`;
  const objectRelation = row.kind === "object" && row.expandable;
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
    "button",
    {
      type: "button",
      id: domId,
      className,
      role: "treeitem",
      "aria-level": row.ariaLevel,
      "aria-expanded": row.expandable ? row.open : void 0,
      "aria-selected": selectedKind(row.kind) ? selected : void 0,
      "aria-current": active ? "true" : void 0,
      "data-active": selected,
      "data-kind": row.dataKind,
      "data-row-key": row.key,
      "data-index": index,
      tabIndex: -1,
      style,
      title: rowTitle(row),
      disabled: row.kind === "connect" && row.loading === true,
      onClick: (event) => actions.activate(row, event),
      onDoubleClick: () => {
        if (objectRelation || row.expandable || row.kind === "redis-db") actions.open(row);
      },
      onKeyDown: (event) => {
        if (event.key === "Enter" && row.kind === "object" && row.expandable) {
          event.preventDefault();
          event.stopPropagation();
          actions.open(row);
        }
      },
      onContextMenu: (event) => {
        if (row.kind === "connection" || row.kind === "schema" || row.kind === "object") {
          actions.menu(row, event);
        }
      },
      draggable: row.kind === "connection" && dragEnabled,
      onDragStart: row.kind === "connection" ? (event) => {
        if (row.connectionId !== void 0) actions.dragStart(row.connectionId, event);
      } : void 0,
      onDragOver: row.kind === "connection" ? (event) => {
        if (row.connectionId !== void 0) actions.dragOver(row.connectionId, event);
      } : void 0,
      onDragLeave: row.kind === "connection" ? actions.dragLeave : void 0,
      onDrop: row.kind === "connection" ? (event) => {
        if (row.connectionId !== void 0) actions.drop(row.connectionId, event);
      } : void 0,
      onDragEnd: row.kind === "connection" ? actions.dragEnd : void 0,
      children: drawContent(row, actions)
    }
  );
});

// src/client/useWindow.ts
var import_react16 = require("react");
var import_react_dom = require("react-dom");
var TREE_ROW_HEIGHT = 26;
var TREE_OVERSCAN = 24;
var TREE_DEFAULT_VIEWPORT = 768;
function windowRange(total, scrollTop, viewportHeight, rowHeight = TREE_ROW_HEIGHT, overscan = TREE_OVERSCAN) {
  if (total <= 0) return { start: 0, end: 0 };
  const height = Math.max(rowHeight, viewportHeight);
  const maxTop = Math.max(0, total * rowHeight - height);
  const top = Math.min(Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0), maxTop);
  const first = Math.floor(top / rowHeight);
  const last = Math.ceil((top + height) / rowHeight);
  const start = Math.max(0, Math.min(first - overscan, total));
  const end = Math.max(start, Math.min(total, last + overscan));
  return { start, end };
}
function useWindow(total, rowHeight = TREE_ROW_HEIGHT, overscan = TREE_OVERSCAN) {
  const containerRef = (0, import_react16.useRef)(null);
  const [scrollTop, setScrollTop] = (0, import_react16.useState)(0);
  const scrollTopRef = (0, import_react16.useRef)(0);
  const [viewportHeight, setViewportHeight] = (0, import_react16.useState)(TREE_DEFAULT_VIEWPORT);
  const geometry = (0, import_react16.useRef)({ viewportHeight, total });
  geometry.current = { viewportHeight, total };
  (0, import_react16.useEffect)(() => {
    const node = containerRef.current;
    if (node === null) return void 0;
    const read2 = () => {
      const height = node.clientHeight;
      setViewportHeight(height > 0 ? height : TREE_DEFAULT_VIEWPORT);
    };
    read2();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", read2);
      return () => window.removeEventListener("resize", read2);
    }
    const observer = new ResizeObserver(read2);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const range = (0, import_react16.useMemo)(
    () => windowRange(total, scrollTop, viewportHeight, rowHeight, overscan),
    [total, scrollTop, viewportHeight, rowHeight, overscan]
  );
  const onScroll = (0, import_react16.useCallback)((event) => {
    const next = event.currentTarget.scrollTop;
    if (next === scrollTopRef.current) return;
    scrollTopRef.current = next;
    (0, import_react_dom.flushSync)(() => setScrollTop(next));
  }, []);
  const scrollToIndex = (0, import_react16.useCallback)(
    (index) => {
      const node = containerRef.current;
      if (node === null) return;
      const viewport = node.clientHeight > 0 ? node.clientHeight : geometry.current.viewportHeight;
      const top = index * rowHeight;
      const bottom = top + rowHeight;
      const current = node.scrollTop;
      let next = current;
      if (top < current) next = top;
      else if (bottom > current + viewport) next = bottom - viewport;
      const maxTop = Math.max(0, geometry.current.total * rowHeight - viewport);
      next = Math.min(Math.max(0, next), maxTop);
      if (Math.abs(next - current) < 1) return;
      node.scrollTop = next;
      scrollTopRef.current = next;
      setScrollTop(next);
    },
    [rowHeight]
  );
  return {
    containerRef,
    range,
    scrollTop,
    totalHeight: total * rowHeight,
    viewportHeight,
    onScroll,
    scrollToIndex
  };
}

// src/client/views/DataView.tsx
var import_jsx_runtime15 = require("react/jsx-runtime");
var rowDomId = (index) => `dshdb-tree-row-${index}`;
function DataView(props) {
  const [filter, setFilter] = (0, import_react17.useState)("");
  const [filterOpen, setFilterOpen] = (0, import_react17.useState)(false);
  const [filterFocus, setFilterFocus] = (0, import_react17.useState)(0);
  const filterRef = (0, import_react17.useRef)(null);
  const [objectExtra, setObjectExtra] = (0, import_react17.useState)({});
  const [objectMenu, setObjectMenu] = (0, import_react17.useState)(null);
  const [schemaMenu, setSchemaMenu] = (0, import_react17.useState)(null);
  const [connectionMenu, setConnectionMenu] = (0, import_react17.useState)(null);
  const [dragging, setDragging] = (0, import_react17.useState)(null);
  const [settledFilter, setSettledFilter] = (0, import_react17.useState)("");
  (0, import_react17.useEffect)(() => {
    if (filter === settledFilter) return void 0;
    const timer = setTimeout(() => setSettledFilter(filter), 200);
    return () => clearTimeout(timer);
  }, [filter, settledFilter]);
  const [activeIndex, setActiveIndex] = (0, import_react17.useState)(-1);
  const activeIndexRef = (0, import_react17.useRef)(-1);
  activeIndexRef.current = activeIndex;
  const activeKeyRef = (0, import_react17.useRef)("");
  const propsRef = (0, import_react17.useRef)(props);
  propsRef.current = props;
  const { connections, selectedId, servers, expanded, schemas, objects, cachedAt, detail, detailLoading } = props;
  const selected = connections.find((connection) => connection.id === selectedId);
  const treeFilterLabel = selected?.dialect === "redis" ? "键" : "库表";
  const handleRowDragStart = (event, id) => {
    if (props.onReorderConnections === void 0) return;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", id);
    }
    setDragging({ id, overId: "", after: false });
  };
  const handleRowDragOver = (event, id) => {
    if (props.onReorderConnections === void 0 || dragging === null) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    if (dragging.id === id) {
      if (dragging.overId !== "") setDragging({ ...dragging, overId: "", after: false });
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    if (dragging.overId !== id || dragging.after !== after) setDragging({ ...dragging, overId: id, after });
  };
  const handleRowDragLeave = (event) => {
    if (dragging === null) return;
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDragging({ ...dragging, overId: "", after: false });
  };
  const handleRowDrop = (event, id) => {
    if (props.onReorderConnections === void 0 || dragging === null) return;
    event.preventDefault();
    const next = moveId(
      connections.map((connection) => connection.id),
      dragging.id,
      id,
      dragging.after
    );
    setDragging(null);
    if (next !== null) props.onReorderConnections(next);
  };
  const handleRowDragEnd = () => {
    setDragging(null);
  };
  const dragHandlers = (0, import_react17.useRef)({ start: handleRowDragStart, over: handleRowDragOver, leave: handleRowDragLeave, drop: handleRowDrop, end: handleRowDragEnd });
  dragHandlers.current = {
    start: handleRowDragStart,
    over: handleRowDragOver,
    leave: handleRowDragLeave,
    drop: handleRowDrop,
    end: handleRowDragEnd
  };
  const focusTreeFilter = (0, import_react17.useCallback)(() => {
    setFilterOpen(true);
    setFilterFocus((count) => count + 1);
  }, []);
  const filterFloatRef = (0, import_react17.useRef)(null);
  const closeTreeFilter = (0, import_react17.useCallback)(() => {
    setFilterOpen(false);
    setFilter("");
    setSettledFilter("");
  }, []);
  (0, import_react17.useEffect)(() => {
    if (!filterOpen) return;
    const input = filterRef.current;
    if (input === null) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [filterOpen, filterFocus]);
  const openObjectMenu = (0, import_react17.useCallback)(
    (event, connectionId, schema, object) => {
      event.preventDefault();
      const isRelation = object.kind === "table" || object.kind === "view";
      const items = [
        ...isRelation ? [
          { label: "打开数据", run: () => props.onOpenTable(connectionId, schema, object) },
          { label: "在控制台查询", run: () => props.onOpenConsole(connectionId, schema, object.name) },
          {
            label: "复制查询语句",
            // Same statement the console opens with; keeping it copyable
            // saves a round trip through the other tab.
            run: () => void copyText(tableSelectSql(props.connections.find((item) => item.id === connectionId)?.dialect ?? "mysql", schema, object.name, "", "", 500))
          }
        ] : [],
        { label: "查看 DDL", run: () => props.onShowDdl(connectionId, schema, object.name, object.kind) },
        { label: "复制名称", run: () => void copyText(object.name) },
        { label: "复制限定名", run: () => void copyText(`${schema}.${object.name}`) },
        {
          label: "只看这个表",
          run: () => {
            setFilter(`${schema}.${object.name}`);
            setTimeout(focusTreeFilter, 0);
          }
        }
      ];
      setObjectMenu({ ...placeMenu(event.clientX, event.clientY, items), items });
    },
    [focusTreeFilter, props.connections, props.onOpenConsole, props.onOpenTable, props.onShowDdl]
  );
  const exportSchemaScript = (0, import_react17.useCallback)(
    (connectionId, schemaName) => {
      const read2 = props.onReadDdl;
      const save = props.onDownloadScript;
      const listed = (props.objects[`${connectionId}:${schemaName}`] ?? []).filter(
        (object) => object.kind === "table" || object.kind === "view"
      );
      if (read2 === void 0 || save === void 0 || listed.length === 0) return;
      void (async () => {
        const parts = [`-- ${schemaName} 的建表语句`, ""];
        for (const object of listed) {
          const kind = object.kind === "view" ? "view" : "table";
          const ddl = await read2(connectionId, schemaName, object.name, kind);
          if (ddl === null || ddl.trim() === "") continue;
          const text2 = ddl.trim();
          parts.push(`-- ${object.name}`, text2.endsWith(";") ? text2 : `${text2};`, "");
        }
        if (parts.length > 2) save(`${schemaName}.sql`, parts.join(String.fromCharCode(10)));
      })();
    },
    [props.objects, props.onDownloadScript, props.onReadDdl]
  );
  const openSchemaMenu = (0, import_react17.useCallback)(
    (event, connectionId, schemaName) => {
      event.preventDefault();
      const items = [
        { label: "复制库名", run: () => void copyText(schemaName) },
        { label: "导出这个库的建表语句", run: () => exportSchemaScript(connectionId, schemaName) },
        {
          label: "只看这个库",
          run: () => {
            setFilter(`${schemaName}.`);
            setTimeout(focusTreeFilter, 0);
          }
        }
      ];
      setSchemaMenu({ ...placeMenu(event.clientX, event.clientY, items), items });
    },
    [exportSchemaScript]
  );
  const openConnectionMenu = (0, import_react17.useCallback)(
    (event, connection) => {
      event.preventDefault();
      const items = [
        { label: "复制连接名", run: () => void copyText(connection.name) },
        { label: "复制连接ID", run: () => void copyText(connection.id) },
        { label: "复制地址", run: () => void copyText(`${connection.host}:${connection.port}`) },
        ...props.onOpenConsoleTab === void 0 ? [] : [{ label: "打开控制台", run: () => props.onOpenConsoleTab?.(connection.id) }],
        { label: "重新连接", run: () => props.onConnect(connection.id) }
      ];
      setConnectionMenu({ ...placeMenu(event.clientX, event.clientY, items), items });
    },
    [props.onConnect, props.onOpenConsoleTab]
  );
  const menuHandlers = (0, import_react17.useRef)({ openObjectMenu, openSchemaMenu, openConnectionMenu });
  menuHandlers.current = { openObjectMenu, openSchemaMenu, openConnectionMenu };
  const normalizedFilter = settledFilter.trim().toLowerCase();
  (0, import_react17.useEffect)(() => {
    setObjectExtra((current) => Object.keys(current).length === 0 ? current : {});
  }, [normalizedFilter]);
  const matches = (text2) => normalizedFilter === "" || text2.toLowerCase().includes(normalizedFilter);
  const filterQuery = (0, import_react17.useMemo)(() => parseFilter(settledFilter), [settledFilter]);
  const searched = (0, import_react17.useRef)(/* @__PURE__ */ new Set());
  const searchedRedis = (0, import_react17.useRef)(/* @__PURE__ */ new Set());
  const lastFilter = (0, import_react17.useRef)("");
  (0, import_react17.useEffect)(() => {
    if (lastFilter.current !== normalizedFilter) {
      lastFilter.current = normalizedFilter;
      searched.current = /* @__PURE__ */ new Set();
      searchedRedis.current = /* @__PURE__ */ new Set();
    }
    if (normalizedFilter === "") return;
    for (const connection of connections) {
      const schemaList = schemas[connection.id];
      if (!schemaList || schemaList.length > 64) continue;
      if (searched.current.has(connection.id)) continue;
      if (servers[connection.id] === void 0) continue;
      searched.current.add(connection.id);
      for (const schema of schemaList) {
        const key = `${connection.id}:${schema.name}`;
        if (objects[key] !== void 0 || props.loadingObjects[key] === true) continue;
        props.onLoadObjects(connection.id, schema.name);
      }
    }
    for (const connection of connections) {
      if (connection.dialect !== "redis") continue;
      if (servers[connection.id] === void 0) continue;
      for (const db of props.redisDbs[connection.id] ?? [connection.redisDb]) {
        const scanKey = `${connection.id}:${db}`;
        if (searchedRedis.current.has(scanKey)) continue;
        if (props.redisKeys[connection.id]?.[db] !== void 0) continue;
        searchedRedis.current.add(scanKey);
        props.onLoadRedisKeys(connection.id, db);
      }
    }
  }, [normalizedFilter, connections, schemas, servers]);
  const filterSummary = (0, import_react17.useMemo)(() => {
    if (normalizedFilter === "") return null;
    return treeFilterSummary({
      connections,
      schemas,
      objects,
      visibleSchemas: props.visibleSchemas,
      redisKeys: props.redisKeys,
      filter: settledFilter
    });
  }, [
    normalizedFilter,
    connections,
    schemas,
    objects,
    props.visibleSchemas,
    props.redisKeys,
    settledFilter
  ]);
  (0, import_react17.useEffect)(() => {
    if (normalizedFilter === "") return;
    const timer = window.setTimeout(() => {
      const targets = filterTargets(filter, connections, schemas, objects, expanded);
      for (const id of targets.connections) props.onToggleConnection(id);
      for (const key of targets.schemas) {
        const separator = key.indexOf(":");
        void props.onToggleSchema(key.slice(0, separator), key.slice(separator + 1));
      }
      for (const [key, list] of Object.entries(objects)) {
        const separator = key.indexOf(":");
        const connectionId = key.slice(0, separator);
        const schema = key.slice(separator + 1);
        const hits = list.filter((object) => matchesFilteredObject(filterQuery, schema, object.name));
        if (hits.length === 0) continue;
        for (const folder of new Set(hits.map((object) => folderOf(object.kind)))) {
          if (expanded[`${key}#${folder}`] === true) continue;
          props.onToggleFolder(connectionId, schema, folder);
        }
      }
      for (const connection of connections) {
        if (connection.dialect !== "redis") continue;
        const keysByDb = props.redisKeys[connection.id];
        if (keysByDb === void 0) continue;
        for (const [db, keys] of Object.entries(keysByDb)) {
          if (!keys.some((key) => matches(key.key))) continue;
          if (expanded[connection.id] !== true) props.onToggleConnection(connection.id);
          if (expanded[`${connection.id}:redis:db${db}`] === false) props.onToggleRedisDb(connection.id, Number(db));
        }
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [normalizedFilter, connections, schemas, objects, expanded, props.redisKeys]);
  const rows = (0, import_react17.useMemo)(
    () => buildTreeRows({
      connections,
      servers,
      connectingId: props.connectingId,
      schemas,
      objects,
      expanded,
      loadingSchemas: props.loadingSchemas,
      loadingObjects: props.loadingObjects,
      cachedAt,
      descriptions: props.descriptions,
      loadingDescriptions: props.loadingDescriptions,
      redisKeys: props.redisKeys,
      redisCursor: props.redisCursor,
      loadingRedisKeys: props.loadingRedisKeys,
      redisDatabases: props.redisDatabases,
      redisDbs: props.redisDbs,
      visibleSchemas: props.visibleSchemas,
      filter: settledFilter,
      objectExtra
    }),
    [
      connections,
      servers,
      props.connectingId,
      schemas,
      objects,
      expanded,
      props.loadingSchemas,
      props.loadingObjects,
      cachedAt,
      props.descriptions,
      props.loadingDescriptions,
      props.redisKeys,
      props.redisCursor,
      props.loadingRedisKeys,
      props.redisDatabases,
      props.redisDbs,
      props.visibleSchemas,
      settledFilter,
      objectExtra
    ]
  );
  const { containerRef, range, totalHeight, viewportHeight, onScroll, scrollToIndex } = useWindow(rows.length);
  const filterAnchors = (0, import_react17.useMemo)(() => [filterFloatRef, containerRef], [containerRef]);
  usePopoverDismiss(filterOpen, closeTreeFilter, filterAnchors);
  (0, import_react17.useEffect)(() => {
    if (rows.length === 0) {
      activeKeyRef.current = "";
      setActiveIndex(-1);
      return;
    }
    const key = activeKeyRef.current;
    if (key !== "") {
      const next = rows.findIndex((row) => row.key === key);
      if (next >= 0) {
        setActiveIndex(next);
        return;
      }
    }
    const clamped = activeIndexRef.current >= rows.length ? rows.length - 1 : activeIndexRef.current;
    activeKeyRef.current = clamped >= 0 ? rows[clamped]?.key ?? "" : "";
    setActiveIndex(clamped);
  }, [rows]);
  const focusIndex = (index) => {
    activeKeyRef.current = rows[index]?.key ?? "";
    setActiveIndex(index);
    containerRef.current?.focus();
    scrollToIndex(index);
  };
  const toggleRow = (0, import_react17.useCallback)((row) => {
    const current = propsRef.current;
    switch (row.kind) {
      case "connection":
        if (row.connectionId !== void 0) {
          current.onSelectConnection(row.connectionId);
          current.onToggleConnection(row.connectionId);
        }
        return;
      case "schema":
        if (row.connectionId !== void 0 && row.schema !== void 0) {
          current.onSelectSchema(row.connectionId, row.schema);
          current.onToggleSchema(row.connectionId, row.schema);
        }
        return;
      case "folder":
        if (row.connectionId !== void 0 && row.schema !== void 0 && row.folder !== void 0) {
          current.onSelectFolder(row.connectionId, row.schema, row.folder);
          current.onToggleFolder(row.connectionId, row.schema, row.folder);
        }
        return;
      case "object":
        if (row.connectionId !== void 0 && row.schema !== void 0 && row.object !== void 0) {
          current.onSelectObject(row.connectionId, row.schema, row.object);
          if (row.toggleKey !== void 0) current.onToggleKey(row.toggleKey);
        }
        return;
      case "detail-folder":
        if (row.toggleKey !== void 0) current.onToggleKey(row.toggleKey);
        return;
      case "redis-db":
        if (row.connectionId !== void 0 && row.db !== void 0) current.onToggleRedisDb(row.connectionId, row.db);
        return;
      default:
        return;
    }
  }, []);
  const toggleRowRef = (0, import_react17.useRef)(toggleRow);
  toggleRowRef.current = toggleRow;
  const activateRow = (0, import_react17.useCallback)((row, event) => {
    const current = propsRef.current;
    switch (row.kind) {
      case "connection":
        if (row.connectionId !== void 0) current.onSelectConnection(row.connectionId);
        return;
      case "schema":
        if (row.connectionId !== void 0 && row.schema !== void 0) current.onSelectSchema(row.connectionId, row.schema);
        return;
      case "folder":
        if (row.connectionId !== void 0 && row.schema !== void 0 && row.folder !== void 0) {
          current.onSelectFolder(row.connectionId, row.schema, row.folder);
        }
        return;
      case "object":
        if (event !== void 0 && event.detail > 1) return;
        if (row.connectionId !== void 0 && row.schema !== void 0 && row.object !== void 0) {
          current.onSelectObject(row.connectionId, row.schema, row.object);
        }
        return;
      case "detail-folder":
        if (row.connectionId !== void 0 && row.schema !== void 0 && row.object !== void 0) {
          current.onSelectObject(row.connectionId, row.schema, row.object);
        }
        return;
      case "redis-db":
        if (row.connectionId !== void 0 && row.db !== void 0) current.onSelectRedisDb(row.connectionId, row.db);
        return;
      case "redis-key":
        if (row.connectionId !== void 0 && row.db !== void 0 && row.redisKey !== void 0) {
          current.onSelectRedisKey(row.connectionId, row.db, row.redisKey.key);
        }
        return;
      case "more":
        if (row.pageKey !== void 0) {
          setObjectExtra((currentExtra) => ({
            ...currentExtra,
            [row.pageKey]: (currentExtra[row.pageKey] ?? 0) + 200
          }));
        }
        return;
      case "connect":
        if (row.connectionId !== void 0) current.onConnect(row.connectionId);
        return;
      case "redis-action":
        if (row.connectionId !== void 0 && row.db !== void 0) {
          current.onLoadRedisKeys(row.connectionId, row.db, true);
        }
        return;
      default:
        return;
    }
  }, []);
  const openRow = (0, import_react17.useCallback)((row) => {
    const current = propsRef.current;
    if (row.kind === "object") {
      if (row.expandable && row.connectionId !== void 0 && row.schema !== void 0 && row.object !== void 0) {
        current.onSelectObject(row.connectionId, row.schema, row.object);
        current.onOpenTable(row.connectionId, row.schema, { name: row.object.name, kind: row.object.kind });
      }
      return;
    }
    if (row.kind === "detail-folder") {
      if (row.toggleKey !== void 0) current.onToggleKey(row.toggleKey);
      return;
    }
    if (row.expandable) toggleRowRef.current(row);
  }, []);
  const actions = (0, import_react17.useMemo)(
    () => ({
      activate: (row, event) => activateRow(row, event),
      toggle: (row) => toggleRow(row),
      open: (row) => openRow(row),
      menu: (row, event) => {
        if (row.kind === "connection") {
          const connection = propsRef.current.connections.find((item) => item.id === row.connectionId);
          if (connection !== void 0) {
            menuHandlers.current.openConnectionMenu(event, connection);
          }
        } else if (row.kind === "schema" && row.connectionId !== void 0 && row.schema !== void 0) {
          menuHandlers.current.openSchemaMenu(event, row.connectionId, row.schema);
        } else if (row.kind === "object" && row.connectionId !== void 0 && row.schema !== void 0 && row.object !== void 0) {
          menuHandlers.current.openObjectMenu(event, row.connectionId, row.schema, row.object);
        }
      },
      connect: (connectionId) => propsRef.current.onConnect(connectionId),
      toggleSchemaVisible: (connectionId, schema) => propsRef.current.onToggleSchemaVisible(connectionId, schema),
      toggleAllSchemasVisible: (connectionId, all) => propsRef.current.onToggleAllSchemasVisible(connectionId, all),
      toggleRedisDbVisible: (connectionId, db) => propsRef.current.onToggleRedisDbVisible(connectionId, db),
      toggleAllRedisDbsVisible: (connectionId, all) => propsRef.current.onToggleAllRedisDbsVisible(connectionId, all),
      dragStart: (id, event) => dragHandlers.current.start(event, id),
      dragOver: (id, event) => dragHandlers.current.over(event, id),
      dragLeave: (event) => dragHandlers.current.leave(event),
      drop: (id, event) => dragHandlers.current.drop(event, id),
      dragEnd: () => dragHandlers.current.end()
    }),
    [activateRow, openRow, toggleRow]
  );
  const navigable = (0, import_react17.useMemo)(() => {
    const list = [];
    rows.forEach((row, index) => {
      if (row.navigable) list.push(index);
    });
    return list;
  }, [rows]);
  const handleTreeKey = (event) => {
    if (shortcutHit(event, "tree.filter")) {
      event.preventDefault();
      focusTreeFilter();
      return;
    }
    if (shortcutHit(event, "tree.refresh")) {
      event.preventDefault();
      props.onRefresh?.();
      return;
    }
    if (rows.length === 0) return;
    const targetElement = event.target instanceof HTMLElement ? event.target.closest("[data-index]") : null;
    const domIndex = targetElement === null ? -1 : Number(targetElement.dataset.index);
    const current = Number.isInteger(domIndex) && domIndex >= 0 ? domIndex : activeIndexRef.current;
    const position = navigable.indexOf(current);
    const last = navigable[navigable.length - 1];
    if (event.key === "ArrowDown") {
      const next = position >= 0 ? navigable[position + 1] : navigable.find((index) => index > current);
      if (next !== void 0) {
        event.preventDefault();
        focusIndex(next);
      }
      return;
    }
    if (event.key === "ArrowUp") {
      const next = position >= 0 ? navigable[position - 1] : [...navigable].reverse().find((index) => index < current);
      if (next !== void 0) {
        event.preventDefault();
        focusIndex(next);
      }
      return;
    }
    if (event.key === "Home") {
      if (navigable[0] !== void 0) {
        event.preventDefault();
        focusIndex(navigable[0]);
      }
      return;
    }
    if (event.key === "End") {
      if (last !== void 0) {
        event.preventDefault();
        focusIndex(last);
      }
      return;
    }
    if (event.key === "PageDown" || event.key === "PageUp") {
      const step = Math.max(1, Math.floor(viewportHeight / TREE_ROW_HEIGHT) - 1);
      const pool = event.key === "PageDown" ? navigable.filter((index) => index > current) : navigable.filter((index) => index < current).reverse();
      const next = pool[Math.min(step, pool.length) - 1];
      if (next !== void 0) {
        event.preventDefault();
        focusIndex(next);
      }
      return;
    }
    const row = current >= 0 && current < rows.length ? rows[current] : void 0;
    if (row === void 0) return;
    if (event.key === "ArrowLeft") {
      if (row.expandable && row.open) {
        event.preventDefault();
        toggleRow(row);
        return;
      }
      for (let index = current - 1; index >= 0; index -= 1) {
        if (rows[index].depth < row.depth) {
          event.preventDefault();
          focusIndex(index);
          return;
        }
      }
      return;
    }
    if (event.key === "ArrowRight") {
      if (row.expandable && !row.open) {
        event.preventDefault();
        toggleRow(row);
        return;
      }
      const child = current + 1;
      if (child < rows.length && rows[child].depth > row.depth) {
        event.preventDefault();
        focusIndex(child);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (row.kind === "object" && row.expandable) {
        openRow(row);
        return;
      }
      if (row.kind === "connect") {
        activateRow(row);
        return;
      }
      if (row.expandable) {
        toggleRow(row);
        return;
      }
      activateRow(row);
    }
  };
  const isSelected = (row) => row.kind === "connection" ? row.connectionId === selectedId : row.selectedKey !== void 0 && row.selectedKey === props.selectedKey;
  const loadingDetail = props.detailLoading || props.redisDetailLoading;
  const saysFilter = filterOpen || filter !== "";
  const activeRow = activeIndex >= 0 && activeIndex < rows.length ? rows[activeIndex] : void 0;
  const activeVisible = activeRow !== void 0 && activeIndex >= range.start && activeIndex < range.end;
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "dshdb-view", style: { gap: 8 }, children: [
    saysFilter || loadingDetail ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "dshdb-tree-floats", children: [
      saysFilter ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "dshdb-tree-filter-float", ref: filterFloatRef, role: "search", children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(FilterIcon, { size: 13 }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          TextInput,
          {
            ref: filterRef,
            value: filter,
            onChange: (event) => setFilter(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setSettledFilter(filter);
              }
            },
            onBlur: (event) => {
              if (event.currentTarget.value === "") setFilterOpen(false);
            },
            placeholder: `筛选${treeFilterLabel}…`,
            "aria-label": `筛选${treeFilterLabel}`,
            autoFocus: true
          }
        ),
        filter !== "" ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "button",
          {
            type: "button",
            className: "dshdb-row-action",
            title: "清空筛选",
            "aria-label": "清空筛选",
            onClick: () => {
              setFilter("");
              setSettledFilter("");
            },
            children: "×"
          }
        ) : null
      ] }) : null,
      loadingDetail ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Loading, { label: props.redisDetailLoading ? "读取键值" : "读取结构" }) : null
    ] }) : null,
    connections.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(DatabaseIcon, { size: 28 }),
        title: "还没有数据源",
        description: "用工具栏的「新增」按钮添加 MySQL、Oracle、达梦、OceanBase 或 Redis 连接。连接一次之后，即使离线也能浏览缓存的库表结构。",
        actions: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Button, { variant: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(PlusIcon, { size: 13 }), onClick: props.onAddConnection, children: "新建连接" })
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(Panel, { className: "dshdb-grow", bodyClassName: "dshdb-panel-body-pad", children: [
      filterSummary !== null && filterSummary.connections === 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "dshdb-filter-empty", children: "没有匹配的对象" }) : null,
      filterSummary !== null && filterSummary.objects > 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "dshdb-filter-empty", children: [
        filterSummary.objects,
        " 个对象匹配"
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        "div",
        {
          ref: containerRef,
          className: "dshdb-tree dshdb-scroll-thin",
          role: "tree",
          "aria-label": "数据源",
          tabIndex: 0,
          "aria-activedescendant": activeVisible && activeRow?.navigable === true ? rowDomId(activeIndex) : void 0,
          onKeyDown: handleTreeKey,
          onScroll,
          children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dshdb-tree-body", style: { height: totalHeight }, children: rows.slice(range.start, range.end).map((row, offset) => {
            const index = range.start + offset;
            return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dshdb-tree-slot", style: { top: index * TREE_ROW_HEIGHT }, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              TreeRowView,
              {
                row,
                index,
                domId: rowDomId(index),
                selected: isSelected(row),
                active: index === activeIndex,
                dragging: dragging !== null && dragging.id === row.key,
                dragEnabled: props.onReorderConnections !== void 0,
                drop: dragging !== null && dragging.overId === row.key ? dragging.after ? "after" : "before" : "",
                actions
              }
            ) }, row.key);
          }) })
        }
      )
    ] }),
    props.redisDetail ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
      Panel,
      {
        className: "dshdb-redis-detail",
        title: /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(KeyIcon, { size: 13 }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "dshdb-mono", children: props.redisDetail.key }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Tag, { children: props.redisDetail.type }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "dshdb-row-meta", children: [
            "db",
            props.redisDetailDb
          ] })
        ] }),
        bodyClassName: "dshdb-panel-body-pad",
        scroll: true,
        children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(RedisValuePanel, { value: props.redisDetail, showKey: false })
      }
    ) : null,
    detail ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
      Panel,
      {
        title: /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "dshdb-inline", children: [
          objectIcon(detail.kind),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "dshdb-mono", children: [
            detail.schema,
            ".",
            detail.table
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Tag, { children: objectKindLabel(detail.kind) })
        ] }),
        actions: /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
          detail.columns.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              title: "按逗号复制这张表的所有列名",
              "aria-label": "复制列名",
              onClick: () => void copyText(detail.columns.map((column) => column.name).join(", ")),
              children: "复制列名"
            }
          ) : null,
          detail.kind === "table" || detail.kind === "view" ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(import_jsx_runtime15.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                title: "复制一条把列名写全的 SELECT",
                "aria-label": "复制查询语句",
                onClick: () => {
                  const connection = props.connections.find((item) => item.id === selectedId);
                  if (connection === void 0) return;
                  void copyText(selectColumnsSql(connection.dialect, detail.schema, detail.table, detail.columns));
                },
                children: "复制查询"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
              Button,
              {
                size: "sm",
                onClick: () => props.onShowDdl(selectedId, detail.schema, detail.table, detail.kind),
                children: "DDL"
              }
            )
          ] }) : null
        ] }),
        bodyClassName: "dshdb-panel-body-pad",
        scroll: true,
        children: [
          detail.columns.length === 0 && (detail.ddl === void 0 || detail.ddl === "") ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 0" }, children: detail.kind === "table" || detail.kind === "view" ? "没有读取到列结构。" : `未读取到${objectKindLabel(detail.kind)}定义，请在 SQL 控制台查看。` }) : null,
          detail.columns.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dshdb-grid-wrap", style: { maxHeight: 220 }, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("table", { className: "dshdb-grid", children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("th", { children: "列" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("th", { children: "类型" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("th", { children: "可空" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("th", { children: "默认值" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("th", { children: "注释" })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("tbody", { children: detail.columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("td", { title: column.name, children: [
                column.name,
                column.primaryKey ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "dshdb-tag", style: { marginLeft: 6 }, children: "PK" }) : null
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("td", { title: column.typeName, children: column.typeName }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("td", { children: column.nullable === false ? "否" : "是" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("td", { title: column.defaultValue ?? "", children: column.defaultValue ?? "—" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("td", { title: column.comment ?? "", children: column.comment ?? "" })
            ] }, column.name)) })
          ] }) }) : null,
          typeof detail.ddl === "string" && detail.ddl !== "" ? /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { marginTop: detail.columns.length > 0 ? 10 : 0 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("pre", { className: "dshdb-ddl", style: { maxHeight: 280 }, children: detail.ddl }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className: "dshdb-muted", style: { marginTop: 4 }, children: [
              detail.ddlSource === "generated" ? "根据列结构生成的 DDL" : "来自服务器的定义",
              detail.ddlWarnings !== void 0 && detail.ddlWarnings.length > 0 ? `；${detail.ddlWarnings.join("；")}` : ""
            ] })
          ] }) : null,
          detail.indexes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dshdb-kv", style: { padding: "8px 0 0" }, children: detail.indexes.map((index) => /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { style: { display: "contents" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { className: "dshdb-kv-key", children: [
              index.primary ? "主键" : index.unique ? "唯一索引" : "索引",
              " ",
              index.name
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { className: "dshdb-kv-val dshdb-mono", children: index.columns.join(", ") })
          ] }, index.name)) }) : null
        ]
      }
    ) : null,
    !detail && !props.redisDetail && !detailLoading && !props.redisDetailLoading && connections.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { className: "dshdb-muted", style: { padding: "0 2px" }, children: selected?.dialect === "redis" ? "展开 Redis 数据源和逻辑库，选择键可查看值、TTL 与长度；行尾按钮可选择显示的数据库。" : "展开数据源，选择表或视图可查看列、索引等结构信息；选择函数、存储过程、触发器可查看定义；行尾按钮可选择显示的架构。" }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(TreeMenu, { menu: objectMenu, onClose: () => setObjectMenu(null) }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(TreeMenu, { menu: schemaMenu, onClose: () => setSchemaMenu(null) }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(TreeMenu, { menu: connectionMenu, onClose: () => setConnectionMenu(null) })
  ] });
}

// src/client/tab-open.ts
var opener;
function setTableTabOpener(next) {
  opener = next;
}
function openTableTab(params) {
  opener?.(params);
}
function readTableTabParams(params) {
  if (typeof params !== "object" || params === null) return void 0;
  const value = params;
  const { connectionId, schema, table } = value;
  if (typeof connectionId !== "string" || typeof schema !== "string" || typeof table !== "string") return void 0;
  if (connectionId === "" || table === "") return void 0;
  return { connectionId, schema, table, ...value.kind === "view" ? { kind: "view" } : {} };
}
var consoleOpener;
function setConsoleTabOpener(next) {
  consoleOpener = next;
}
function openConsoleTab(params = {}) {
  consoleOpener?.(params);
}
function readConsoleTabParams(params) {
  if (typeof params !== "object" || params === null) return void 0;
  const value = params;
  const { connectionId, schema, sql } = value;
  const connection = typeof connectionId === "string" && connectionId !== "" ? connectionId : void 0;
  const target = typeof schema === "string" && schema !== "" ? schema : void 0;
  const statement = typeof sql === "string" && sql.trim() !== "" ? sql : void 0;
  return {
    ...connection === void 0 ? {} : { connectionId: connection },
    ...target === void 0 ? {} : { schema: target },
    ...statement === void 0 ? {} : { sql: statement }
  };
}

// src/client/App.tsx
var import_jsx_runtime16 = require("react/jsx-runtime");
var noopTabInfo = () => void 0;
function errorText4(error) {
  return error instanceof Error ? error.message : String(error);
}
function ToolButton({
  title,
  icon,
  onClick,
  disabled,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
    "button",
    {
      type: "button",
      className: "dshdb-toolbtn",
      title,
      "aria-label": title,
      onClick,
      disabled,
      children: [
        icon,
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { children })
      ]
    }
  );
}
function App(props) {
  const info = (props.useTabInfo ?? noopTabInfo)();
  const hidden = info?.tab?.visible === false;
  const [toast, setToast] = (0, import_react18.useState)(null);
  const [savingSettings, setSavingSettings] = (0, import_react18.useState)(false);
  const [downloading, setDownloading] = (0, import_react18.useState)("");
  const [downloadingJava, setDownloadingJava] = (0, import_react18.useState)(false);
  const [deleting, setDeleting] = (0, import_react18.useState)(false);
  const [trashOpen, setTrashOpen] = (0, import_react18.useState)(false);
  const [trashBusy, setTrashBusy] = (0, import_react18.useState)(null);
  const [emptyingTrash, setEmptyingTrash] = (0, import_react18.useState)(false);
  const [refreshing, setRefreshing] = (0, import_react18.useState)(false);
  const [confirm, setConfirm] = (0, import_react18.useState)(null);
  const [settingsOpen, setSettingsOpen] = (0, import_react18.useState)(false);
  const [connModal, setConnModal] = (0, import_react18.useState)({
    open: false,
    editing: null
  });
  const [driverModal, setDriverModal] = (0, import_react18.useState)({
    open: false,
    editing: null
  });
  const [ddlModal, setDdlModal] = (0, import_react18.useState)({
    open: false,
    title: "",
    text: "",
    loading: false,
    source: "",
    warnings: []
  });
  const notify = (0, import_react18.useCallback)((text2, tone = "info") => {
    setToast((previous) => nextToast(previous, text2, tone));
  }, []);
  const {
    snapshot,
    loadError,
    selectedId,
    selectConnection,
    selected,
    server,
    servers,
    connectingId,
    connections,
    trash,
    schemas,
    objects,
    expanded,
    loadingSchemas,
    loadingObjects,
    cachedAt,
    descriptions,
    loadingDescriptions,
    detail,
    detailLoading,
    selectedKey,
    selectedSchema,
    redisKeys,
    redisCursor,
    loadingRedisKeys,
    redisDatabases,
    redisDbs,
    visibleSchemas,
    redisDetail,
    redisDetailDb,
    redisDetailLoading,
    refresh,
    connect,
    disconnect,
    reorderConnections,
    refreshSelected,
    toggleConnection,
    toggleFolder,
    toggleSchema,
    loadObjects,
    loadRedisKeys,
    toggleRedisDb,
    toggleKey,
    selectObject,
    selectSchema,
    selectFolder,
    selectRedisDb,
    selectRedisKey,
    toggleSchemaVisible,
    toggleAllSchemasVisible,
    toggleRedisDbVisible,
    toggleAllRedisDbsVisible,
    updateDrivers,
    applySettings,
    setupError,
    dismissSetupError
  } = useDataSources(notify);
  (0, import_react18.useEffect)(() => {
    setKeybindings(snapshot?.settings.keybindings);
  }, [snapshot?.settings.keybindings]);
  (0, import_react18.useEffect)(() => {
    setConsoleActionOrder(snapshot?.settings.consoleActions);
  }, [snapshot?.settings.consoleActions]);
  (0, import_react18.useEffect)(() => {
    setConsoleAutoComplete(snapshot?.settings.consoleAutoComplete !== false);
  }, [snapshot?.settings.consoleAutoComplete]);
  (0, import_react18.useEffect)(() => {
    setToolbarActionOrder(snapshot?.settings.toolbarActions);
  }, [snapshot?.settings.toolbarActions]);
  const toolbarOrder = useToolbarActionOrder();
  const [visibleToolbarActions, setVisibleToolbarActions] = (0, import_react18.useState)(toolbarOrder.length);
  const [toolbarOverflowOpen, setToolbarOverflowOpen] = (0, import_react18.useState)(false);
  const toolbarActionsRef = (0, import_react18.useRef)(null);
  const toolbarOverflowRef = (0, import_react18.useRef)(null);
  const closeToolbarOverflow = (0, import_react18.useCallback)(() => setToolbarOverflowOpen(false), []);
  usePopoverDismiss(toolbarOverflowOpen, closeToolbarOverflow, toolbarOverflowRef);
  const measureToolbar = (0, import_react18.useCallback)(() => {
    const container = toolbarActionsRef.current;
    if (container === null) return;
    const slots = Array.from(container.querySelectorAll("[data-toolbar-action]"));
    if (slots.length === 0) return;
    const widths = slots.map((slot) => slot.getBoundingClientRect().width || slot.offsetWidth);
    const overflow = container.querySelector("[data-toolbar-overflow]");
    const overflowWidth = overflow === null ? 0 : overflow.getBoundingClientRect().width || overflow.offsetWidth;
    const next = fitActionCount(widths, container.clientWidth, overflowWidth, 2);
    setVisibleToolbarActions(next);
    if (next === toolbarOrder.length) setToolbarOverflowOpen(false);
  }, [toolbarOrder.length]);
  (0, import_react18.useLayoutEffect)(() => {
    measureToolbar();
  });
  (0, import_react18.useEffect)(() => {
    if (typeof ResizeObserver === "undefined") return void 0;
    const container = toolbarActionsRef.current;
    if (container === null) return void 0;
    const observer = new ResizeObserver(() => measureToolbar());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measureToolbar]);
  const askConfirm = (0, import_react18.useCallback)((message, detail2) => {
    return new Promise((resolve) => {
      setConfirm({
        request: { title: "确认操作", message, detail: detail2, danger: true, confirmLabel: "继续" },
        resolve
      });
    });
  }, []);
  const resolveConfirm = (ok) => {
    confirm?.resolve(ok);
    setConfirm(null);
  };
  async function showDdl(connectionId, schema, table, kind) {
    const title = `${schema}.${table} · DDL`;
    setDdlModal({ open: true, title, text: "", loading: true, source: "", warnings: [] });
    try {
      const result = await api.ddl(connectionId, schema, table, kind);
      setDdlModal({ open: true, title, text: result.ddl, loading: false, source: result.source, warnings: result.warnings });
    } catch (error) {
      setDdlModal({ open: false, title: "", text: "", loading: false, source: "", warnings: [] });
      notify(`读取 DDL 失败：${errorText4(error)}`, "error");
    }
  }
  async function copyDdl() {
    const copied = await copyText(ddlModal.text);
    notify(copied ? "DDL 已复制" : "复制失败：这个环境不允许访问剪贴板", copied ? "success" : "error");
  }
  async function saveSettings(next) {
    setSavingSettings(true);
    try {
      const result = await api.updateSettings(next);
      applySettings(result.settings, result.env);
      notify("设置已保存", "success");
      void refresh();
    } catch (error) {
      notify(`保存设置失败：${errorText4(error)}`, "error");
    } finally {
      setSavingSettings(false);
    }
  }
  async function downloadDriver(driverId) {
    setDownloading(driverId);
    try {
      const status = await api.downloadDriver(driverId);
      updateDrivers((snapshot?.drivers ?? []).map((driver) => driver.id === status.id ? status : driver));
      notify("驱动依赖已就绪", "success");
    } catch (error) {
      notify(`下载失败：${errorText4(error)}`, "error");
    } finally {
      setDownloading("");
    }
  }
  async function downloadJava() {
    setDownloadingJava(true);
    try {
      const env = await api.downloadJava();
      if (snapshot != null) applySettings(snapshot.settings, env);
      if (env.java.available) notify("Java 运行环境已就绪", "success");
      else notify("Java 已下载，但没有检测到可执行文件", "error");
    } catch (error) {
      notify(`下载 Java 失败：${errorText4(error)}`, "error");
    } finally {
      setDownloadingJava(false);
    }
  }
  async function deleteCustomDriver(driver) {
    const ok = await askConfirm(`删除自定义驱动「${driver.name}」？使用它的连接将无法连接。`);
    if (!ok) return;
    try {
      const result = await api.deleteCustomDriver(driver.id);
      updateDrivers(result.drivers);
      notify("自定义驱动已删除", "success");
    } catch (error) {
      notify(`删除失败：${errorText4(error)}`, "error");
    }
  }
  async function deleteConnection(connection) {
    const ok = await askConfirm(`删除连接「${connection.name}」？它会先移到回收站，可随时恢复。`);
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deleteConnection(connection.id);
      setConnModal({ open: false, editing: null });
      notify("连接已移入回收站", "success");
      await refresh();
    } catch (error) {
      notify(`删除失败：${errorText4(error)}`, "error");
    } finally {
      setDeleting(false);
    }
  }
  async function restoreConnection(item) {
    setTrashBusy({ id: item.id, action: "restore" });
    try {
      await api.restoreConnection(item.id);
      notify(`连接「${item.name}」已恢复`, "success");
      await refresh();
    } catch (error) {
      notify(`恢复失败：${errorText4(error)}`, "error");
    } finally {
      setTrashBusy(null);
    }
  }
  async function purgeConnection(item) {
    const ok = await askConfirm(`彻底删除连接「${item.name}」？保存的密码与结构缓存也会删除，且无法恢复。`);
    if (!ok) return;
    setTrashBusy({ id: item.id, action: "purge" });
    try {
      await api.purgeConnection(item.id);
      notify("连接已彻底删除", "success");
      await refresh();
    } catch (error) {
      notify(`删除失败：${errorText4(error)}`, "error");
    } finally {
      setTrashBusy(null);
    }
  }
  async function emptyTrash() {
    const ok = await askConfirm(`清空回收站中的 ${String(trash.length)} 个连接？保存的密码与结构缓存也会删除，且无法恢复。`);
    if (!ok) return;
    setEmptyingTrash(true);
    try {
      const result = await api.emptyTrash();
      notify(`已清空回收站（${String(result.purged)} 个连接）`, "success");
      await refresh();
    } catch (error) {
      notify(`清空回收站失败：${errorText4(error)}`, "error");
    } finally {
      setEmptyingTrash(false);
    }
  }
  const toolbarActions = [
    {
      id: "add",
      label: "新增",
      title: "新增数据源",
      onClick: () => setConnModal({ open: true, editing: null })
    },
    {
      id: "edit",
      label: "编辑",
      title: "编辑选中的数据源",
      disabled: !selected || deleting,
      onClick: () => {
        if (selected) setConnModal({ open: true, editing: selected });
      }
    },
    {
      id: "refresh",
      label: "刷新",
      title: "刷新选中的数据源",
      disabled: connectingId !== "" || refreshing,
      onClick: () => {
        if (refreshing) return;
        setRefreshing(true);
        void refreshSelected().finally(() => setRefreshing(false));
      }
    },
    {
      id: "delete",
      label: "删除",
      title: "删除选中的数据源",
      disabled: !selected || deleting,
      onClick: () => {
        if (selected) void deleteConnection(selected);
      }
    },
    {
      id: "console",
      label: "控制台",
      title: selectedSchema === "" ? "查询控制台" : `查询控制台（${selectedSchema}）`,
      onClick: () => openConsoleTab({ connectionId: selected?.id, ...selectedSchema === "" ? {} : { schema: selectedSchema } })
    },
    {
      id: "trash",
      label: "回收站",
      title: trash.length > 0 ? `回收站（${String(trash.length)}）` : "回收站",
      onClick: () => setTrashOpen(true)
    },
    {
      id: "settings",
      label: "设置",
      title: "设置",
      onClick: () => setSettingsOpen(true)
    }
  ];
  const toolbarActionById = new Map(toolbarActions.map((action) => [action.id, action]));
  const orderedToolbarActions = toolbarOrder.flatMap((id) => {
    const action = toolbarActionById.get(id);
    return action === void 0 ? [] : [action];
  });
  const visibleToolbarCount = Math.min(visibleToolbarActions, orderedToolbarActions.length);
  const hiddenToolbarActions = orderedToolbarActions.slice(visibleToolbarCount);
  const prefetchEntry = (snapshot?.prefetch ?? []).find((entry) => entry.connectionId === selectedId);
  const rootStyle = {
    display: hidden ? "none" : "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0
  };
  const openAddConnection = (0, import_react18.useCallback)(() => setConnModal({ open: true, editing: null }), []);
  const connectTree = (0, import_react18.useCallback)((id) => void connect(id), [connect]);
  const refreshTree = (0, import_react18.useCallback)(() => void refreshSelected(), [refreshSelected]);
  const toggleTreeSchema = (0, import_react18.useCallback)(
    (connectionId, schema) => void toggleSchema(connectionId, schema),
    [toggleSchema]
  );
  const loadTreeObjects = (0, import_react18.useCallback)(
    (connectionId, schema) => void loadObjects(connectionId, schema),
    [loadObjects]
  );
  const selectTreeObject = (0, import_react18.useCallback)(
    (...args) => void selectObject(...args),
    [selectObject]
  );
  const selectTreeRedisKey = (0, import_react18.useCallback)(
    (...args) => void selectRedisKey(...args),
    [selectRedisKey]
  );
  const loadTreeRedisKeys = (0, import_react18.useCallback)(
    (...args) => void loadRedisKeys(...args),
    [loadRedisKeys]
  );
  const showDdlTree = (0, import_react18.useCallback)(
    (...args) => void showDdl(...args),
    [showDdl]
  );
  const readDdlTree = (0, import_react18.useCallback)(
    async (connectionId, schema, table, kind) => {
      try {
        return (await api.ddl(connectionId, schema, table, kind)).ddl;
      } catch {
        return null;
      }
    },
    []
  );
  const downloadTreeScript = (0, import_react18.useCallback)(
    (filename, text2) => {
      downloadText(filename, "application/sql", text2);
      notify(`已导出 ${filename}`, "success");
    },
    [notify]
  );
  const openTableFromTree = (0, import_react18.useCallback)(
    (connectionId, schema, object) => {
      selectConnection(connectionId);
      openTableTab({ connectionId, schema, table: object.name, kind: object.kind === "view" ? "view" : "table" });
    },
    [selectConnection]
  );
  const openConsoleTabFromTree = (0, import_react18.useCallback)(
    (connectionId) => {
      selectConnection(connectionId);
      openConsoleTab({ connectionId });
    },
    [selectConnection]
  );
  const openConsoleFromTree = (0, import_react18.useCallback)(
    (connectionId, schema, table) => {
      const connection = connections.find((item) => item.id === connectionId);
      if (connection === void 0) return;
      selectConnection(connectionId);
      openConsoleTab({ connectionId, sql: tableSelectSql(connection.dialect, schema, table, "", "", 500) });
    },
    [connections, selectConnection]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "dshdb-root", style: rootStyle, "data-plugin-route": ROUTE_PREFIX, children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "dshdb-toolbar dshdb-toolbar-top", role: "toolbar", "aria-label": "数据库工具栏", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { className: "dshdb-toolbar-actions", ref: toolbarActionsRef, children: [
      orderedToolbarActions.map((action, index) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        "span",
        {
          className: "dshdb-toolbar-slot" + (index >= visibleToolbarCount ? " dshdb-toolbar-slot-hidden" : ""),
          "data-toolbar-action": action.id,
          children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
            ToolButton,
            {
              title: action.title,
              icon: toolbarActionIcon(action.id),
              onClick: action.onClick,
              disabled: action.disabled,
              children: action.label
            }
          )
        },
        action.id
      )),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
        "span",
        {
          className: "dshdb-menu-wrap dshdb-toolbar-slot dshdb-toolbar-more" + (hiddenToolbarActions.length === 0 ? " dshdb-toolbar-slot-hidden" : ""),
          "data-toolbar-overflow": "true",
          ref: toolbarOverflowRef,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
              "button",
              {
                type: "button",
                className: "dshdb-toolbtn",
                "aria-label": "更多操作",
                title: "更多操作",
                "aria-expanded": toolbarOverflowOpen,
                onClick: () => setToolbarOverflowOpen((open) => !open),
                children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(MoreIcon, { size: 14 })
              }
            ),
            toolbarOverflowOpen && hiddenToolbarActions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "dshdb-menu", role: "menu", children: hiddenToolbarActions.map((action) => /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
              "button",
              {
                type: "button",
                role: "menuitem",
                disabled: action.disabled === true,
                onClick: () => {
                  setToolbarOverflowOpen(false);
                  action.onClick();
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "dshdb-menu-icon", children: toolbarActionIcon(action.id, 13) }),
                  action.label
                ]
              },
              action.id
            )) }) : null
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("main", { className: "dshdb-main", children: [
      loadError ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "dshdb-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(
        Banner,
        {
          tone: "error",
          actions: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              title: "复制错误信息",
              onClick: () => void copyText("加载插件状态失败：" + loadError),
              children: "复制"
            }
          ),
          children: [
            "加载插件状态失败：",
            loadError
          ]
        }
      ) }) : null,
      !snapshot && !loadError ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "dshdb-empty", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Loading, { size: 18, label: "正在加载数据源…" }) }) : null,
      snapshot ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "dshdb-view", style: { padding: "8px 10px 12px", minHeight: 0 }, children: [
        setupError ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          Banner,
          {
            tone: "error",
            onClose: dismissSetupError,
            actions: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Button, { size: "sm", variant: "primary", onClick: () => setSettingsOpen(true), children: "去设置" }),
            children: setupError.message
          }
        ) : null,
        setupError === null && !snapshot.env.java.available && snapshot.drivers.some((driver) => driver.needsJava) ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          Banner,
          {
            tone: "warn",
            actions: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Button, { size: "sm", onClick: () => setSettingsOpen(true), children: "去设置" }),
            children: "未检测到 Java，关系型数据库暂时无法连接。可在「运行环境」里下载 Java 或填写已有的 java 路径。"
          }
        ) : null,
        setupError === null && !snapshot.env.bridgeBuilt ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          Banner,
          {
            tone: "warn",
            actions: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Button, { size: "sm", onClick: () => setSettingsOpen(true), children: "去设置" }),
            children: "JDBC 桥接器缺失，SQL 连接将不可用。可在插件目录运行 npm run build:bridge。"
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          DataView,
          {
            connections,
            selectedId,
            servers,
            connectingId,
            schemas,
            objects,
            expanded,
            loadingSchemas,
            loadingObjects,
            cachedAt,
            descriptions,
            loadingDescriptions,
            detail,
            detailLoading,
            selectedKey,
            redisKeys,
            redisCursor,
            loadingRedisKeys,
            redisDatabases,
            redisDbs,
            visibleSchemas,
            redisDetail,
            redisDetailDb,
            redisDetailLoading,
            onAddConnection: openAddConnection,
            onSelectConnection: selectConnection,
            onToggleConnection: toggleConnection,
            onReorderConnections: reorderConnections,
            onConnect: connectTree,
            onRefresh: refreshTree,
            onToggleSchema: toggleTreeSchema,
            onLoadObjects: loadTreeObjects,
            onToggleFolder: toggleFolder,
            onToggleKey: toggleKey,
            onSelectObject: selectTreeObject,
            onSelectSchema: selectSchema,
            onSelectFolder: selectFolder,
            onSelectRedisDb: selectRedisDb,
            onSelectRedisKey: selectTreeRedisKey,
            onToggleRedisDb: toggleRedisDb,
            onLoadRedisKeys: loadTreeRedisKeys,
            onToggleSchemaVisible: toggleSchemaVisible,
            onToggleAllSchemasVisible: toggleAllSchemasVisible,
            onToggleRedisDbVisible: toggleRedisDbVisible,
            onToggleAllRedisDbsVisible: toggleAllRedisDbsVisible,
            onShowDdl: showDdlTree,
            onReadDdl: readDdlTree,
            onDownloadScript: downloadTreeScript,
            onOpenTable: openTableFromTree,
            onOpenConsoleTab: openConsoleTabFromTree,
            onOpenConsole: openConsoleFromTree
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("footer", { className: "dshdb-statusbar", children: [
      selected ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(StateDot, { tone: server ? "success" : connectingId === selectedId ? "warn" : "idle" }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { title: selected.name, children: selected.name }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { children: "·" }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "dshdb-mono dshdb-muted", title: `连接 ID：${selected.id}`, children: selected.id }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { children: "·" }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { className: "dshdb-mono", children: [
          selected.host,
          ":",
          selected.port
        ] }),
        selected.dialect === "redis" ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { className: "dshdb-mono", children: [
          "/db",
          selected.redisDb
        ] }) : selected.database ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { className: "dshdb-mono", children: [
          "/",
          selected.database
        ] }) : null,
        server ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Button, { size: "sm", variant: "ghost", onClick: () => void disconnect(selected.id), children: "断开" }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            loading: connectingId === selected.id,
            onClick: () => void connect(selected.id),
            children: "连接"
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { children: "尚未选择数据源" }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "dshdb-statusbar-spacer" }),
      prefetchEntry !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        "span",
        {
          className: "dshdb-statusbar-prefetch",
          title: `后台正在缓存 ${selected?.name ?? "该数据源"} 的表结构描述`,
          children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
            Loading,
            {
              bare: true,
              size: 11,
              label: prefetchEntry.total > 0 ? `缓存结构 ${prefetchEntry.done.toLocaleString()}/${prefetchEntry.total.toLocaleString()}` : "正在缓存结构…"
            }
          )
        }
      ) : null,
      snapshot ? /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { title: snapshot.env.configPath, children: [
        "Java",
        " ",
        snapshot.env.java.available ? snapshot.env.java.version ?? "可用" : /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          "button",
          {
            type: "button",
            className: "dshdb-link",
            title: "打开设置 → 运行环境",
            onClick: () => setSettingsOpen(true),
            children: "未找到 · 去设置"
          }
        ),
        " ",
        "· v",
        snapshot.env.pluginVersion
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      TrashModal,
      {
        open: trashOpen,
        items: trash,
        busy: trashBusy,
        emptying: emptyingTrash,
        onClose: () => setTrashOpen(false),
        onRestore: (item) => void restoreConnection(item),
        onPurge: (item) => void purgeConnection(item),
        onEmpty: () => void emptyTrash()
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      ConnectionModal,
      {
        open: connModal.open,
        editing: connModal.editing,
        drivers: snapshot?.drivers ?? [],
        onClose: () => setConnModal({ open: false, editing: null }),
        onSaved: () => void refresh(),
        onDelete: (connection) => void deleteConnection(connection),
        notify
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      DriverModal,
      {
        open: driverModal.open,
        editing: driverModal.editing,
        onClose: () => setDriverModal({ open: false, editing: null }),
        onSaved: updateDrivers,
        notify
      }
    ),
    snapshot ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      SettingsModal,
      {
        open: settingsOpen,
        settings: snapshot.settings,
        env: snapshot.env,
        drivers: snapshot.drivers,
        saving: savingSettings,
        downloading,
        downloadingJava,
        onClose: () => setSettingsOpen(false),
        onSave: (next) => void saveSettings(next),
        onRefresh: () => void refresh(),
        onDownload: (driverId) => void downloadDriver(driverId),
        onDownloadJava: () => void downloadJava(),
        onAddCustomDriver: () => setDriverModal({ open: true, editing: null }),
        onEditCustomDriver: (driver) => setDriverModal({ open: true, editing: driver }),
        onDeleteCustomDriver: (driver) => void deleteCustomDriver(driver)
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
      Modal,
      {
        open: ddlModal.open,
        title: ddlModal.title,
        width: 760,
        onClose: () => setDdlModal({ open: false, title: "", text: "", loading: false, source: "", warnings: [] }),
        footer: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "dshdb-muted", children: ddlModal.source === "generated" ? "按结构重建的 DDL" : ddlModal.source === "server" ? "服务器返回的 DDL" : "" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { className: "dshdb-toolbar-spacer" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Button, { size: "sm", onClick: () => void copyDdl(), disabled: ddlModal.text === "", children: "复制" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
            Button,
            {
              size: "sm",
              variant: "primary",
              onClick: () => setDdlModal({ open: false, title: "", text: "", loading: false, source: "", warnings: [] }),
              children: "关闭"
            }
          )
        ] }),
        children: ddlModal.loading ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "dshdb-empty", children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Loading, { size: 16, label: "正在读取 DDL…" }) }) : /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
          ddlModal.warnings.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Banner, { tone: "warn", children: ddlModal.warnings.join("；") }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("pre", { className: "dshdb-ddl", children: ddlModal.text })
        ] })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(ConfirmDialog, { request: confirm?.request ?? null, onConfirm: () => resolveConfirm(true), onCancel: () => resolveConfirm(false) }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Toast, { toast, onDismiss: () => setToast(null) })
  ] });
}

// src/client/ConsoleTab.tsx
var import_react23 = require("react");

// src/client/DataGrid.tsx
var import_react19 = require("react");

// src/client/columnWidths.ts
var STORAGE_KEY = "dsh-ide-database.colwidths.v1";
var MIN_WIDTH = 40;
var MAX_WIDTH = 1200;
function storage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
function clamp(width) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));
}
function readAll() {
  const store = storage();
  if (store === null) return {};
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}
function writeAll(all) {
  const store = storage();
  if (store === null) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
  }
}
function readWidths(key, count) {
  const widths = readAll()[key];
  if (!Array.isArray(widths) || widths.length !== count) return null;
  const valid = widths.every(
    (width) => typeof width === "number" && Number.isFinite(width) && width >= MIN_WIDTH && width <= MAX_WIDTH
  );
  return valid ? widths.map(clamp) : null;
}
function writeWidths(key, widths) {
  const all = readAll();
  all[key] = widths.map(clamp);
  writeAll(all);
}
function clearWidths(key) {
  const all = readAll();
  if (!(key in all)) return;
  delete all[key];
  writeAll(all);
}
function migrateWidths(primary, legacy, count) {
  if (count <= 0) return primary;
  if (readWidths(primary, count) !== null) {
    clearWidths(legacy);
    return primary;
  }
  const previous = readWidths(legacy, count);
  if (previous !== null) writeWidths(primary, previous);
  clearWidths(legacy);
  return primary;
}
function moveWidthsForColumns(previous, next, key) {
  const count = previous.length;
  if (count === 0 || count !== next.length) return;
  const widths = readWidths(key, count);
  if (widths === null) return;
  const positions = new Map(previous.map((column, index) => [column, index]));
  if (!next.every((column) => positions.has(column))) return;
  const moved = next.map((column) => widths[positions.get(column) ?? 0] ?? 0);
  if (moved.every((width, index) => width === widths[index])) return;
  writeWidths(key, moved);
}

// src/client/DataGrid.tsx
var import_jsx_runtime17 = require("react/jsx-runtime");
var NUMERIC_JDBC_TYPES = /* @__PURE__ */ new Set([-6, -5, 2, 3, 4, 5, 6, 7, 8]);
function numericColumn(column) {
  return column.jdbcType !== void 0 && NUMERIC_JDBC_TYPES.has(column.jdbcType);
}
var GRID_ROW_HEIGHT = 22;
var CELL_TEXT_LIMIT = 400;
var VIRTUAL_THRESHOLD = 200;
var OVERSCAN = 8;
var MIN_COLUMN_WIDTH = 48;
var MAX_COLUMN_WIDTH = 1200;
function useVirtualRange(rowCount, resetKey, containerRef) {
  const enabled = rowCount > VIRTUAL_THRESHOLD;
  const [scrollTop, setScrollTop] = (0, import_react19.useState)(0);
  const [viewport, setViewport] = (0, import_react19.useState)(480);
  const [headerHeight, setHeaderHeight] = (0, import_react19.useState)(26);
  const frame = (0, import_react19.useRef)(0);
  const measure = (0, import_react19.useCallback)(() => {
    const element = containerRef.current;
    if (element === null) return;
    setViewport(element.clientHeight);
    const head = element.querySelector("thead");
    if (head !== null) setHeaderHeight(head.getBoundingClientRect().height);
  }, [containerRef]);
  (0, import_react19.useEffect)(() => {
    measure();
    const element = containerRef.current;
    if (element === null) return;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);
  const resetValue = resetKey === void 0 ? rowCount : resetKey;
  (0, import_react19.useEffect)(() => {
    const element = containerRef.current;
    if (element !== null) element.scrollTop = 0;
    setScrollTop(0);
  }, [resetValue, containerRef]);
  (0, import_react19.useEffect)(() => {
    const element = containerRef.current;
    if (element === null) return;
    const visible = Math.max(viewport - headerHeight, 0);
    const max = Math.max(0, rowCount * GRID_ROW_HEIGHT - visible);
    if (element.scrollTop > max) {
      element.scrollTop = max;
      setScrollTop(max);
    }
  }, [rowCount, viewport, headerHeight, containerRef]);
  const onScroll = (0, import_react19.useCallback)(() => {
    if (frame.current !== 0) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const element = containerRef.current;
      if (element !== null) setScrollTop(element.scrollTop);
    });
  }, [containerRef]);
  const range = (0, import_react19.useMemo)(() => {
    if (!enabled || rowCount === 0) return { start: 0, end: rowCount, paddingTop: 0, paddingBottom: 0 };
    const bodyTop = Math.max(scrollTop - headerHeight, 0);
    const first = Math.floor(bodyTop / GRID_ROW_HEIGHT);
    const visible = Math.ceil(Math.max(viewport - headerHeight, 0) / GRID_ROW_HEIGHT) + 1;
    const start = Math.max(first - OVERSCAN, 0);
    const end = Math.min(first + visible + OVERSCAN, rowCount);
    return { start, end, paddingTop: start * GRID_ROW_HEIGHT, paddingBottom: Math.max((rowCount - end) * GRID_ROW_HEIGHT, 0) };
  }, [enabled, rowCount, scrollTop, viewport, headerHeight]);
  return { range, onScroll };
}
function headerTitle(column, sortable) {
  const details = [column.name];
  if (column.typeName !== void 0 && column.typeName !== "") details.push(column.typeName);
  if (column.nullable === false) details.push("NOT NULL");
  return sortable ? `按 ${details.join(" · ")} 排序` : details.join(" · ");
}
var DataGrid = (0, import_react19.memo)(function DataGrid2(props) {
  const {
    columns,
    rows,
    offset,
    rowNumbers,
    headerExtra,
    cellClass,
    onCellClick,
    onCellOpen,
    storageKey,
    resetKey,
    sort,
    sortColumn,
    onSort,
    headerMenu,
    cellMenu,
    onReorderColumns,
    emptyText,
    label,
    selectedRows,
    onToggleRow,
    onToggleAllRows,
    widthColumnCount = columns.length
  } = props;
  const selectable = onToggleRow !== void 0;
  const selectedCount = selectedRows?.size ?? 0;
  const isSorted = (column) => {
    if (sort === null || sort === void 0) return false;
    return sortColumn ? sortColumn === column : sort.column === column.name;
  };
  const colSpan = columns.length + (selectable ? 2 : 1);
  const [menu, setMenu] = (0, import_react19.useState)(null);
  const [dropIndex, setDropIndex] = (0, import_react19.useState)(null);
  const dragIndex = (0, import_react19.useRef)(null);
  const dragged = (0, import_react19.useRef)(false);
  const containerRef = (0, import_react19.useRef)(null);
  const tableRef = (0, import_react19.useRef)(null);
  const { range, onScroll } = useVirtualRange(rows.length, resetKey, containerRef);
  const visible = rows.slice(range.start, range.end);
  const openMenu = (0, import_react19.useCallback)((items, clientX, clientY) => {
    const width = 200;
    const height = 24 * items.length + 12;
    setMenu({
      items,
      x: Math.min(clientX, window.innerWidth - width - 8),
      y: Math.min(clientY, window.innerHeight - height - 8)
    });
  }, []);
  const [widths, setWidths] = (0, import_react19.useState)(
    () => storageKey === void 0 ? null : readWidths(storageKey, columns.length)
  );
  const previousColumns = (0, import_react19.useRef)(columns);
  const previousStorageKey = (0, import_react19.useRef)(storageKey);
  (0, import_react19.useEffect)(() => {
    setWidths(storageKey === void 0 ? null : readWidths(storageKey, columns.length));
  }, [storageKey, columns.length]);
  (0, import_react19.useEffect)(() => {
    const keyChanged = previousStorageKey.current !== storageKey;
    previousStorageKey.current = storageKey;
    if (!keyChanged && widths !== null && widths.length === columns.length) return;
    setWidths(storageKey === void 0 ? null : readWidths(storageKey, columns.length));
  }, [widths, columns.length, storageKey]);
  (0, import_react19.useEffect)(() => {
    const previous = previousColumns.current;
    previousColumns.current = columns;
    if (widths === null || previous === columns || previous.length !== columns.length) return;
    const oldIndex = new Map(previous.map((column, index) => [column, index]));
    if (!columns.every((column) => oldIndex.has(column))) return;
    const next = columns.map((column) => widths[oldIndex.get(column) ?? 0] ?? 0);
    if (next.every((width, index) => width === widths[index])) return;
    setWidths(next);
    if (storageKey !== void 0 && columns.length === widthColumnCount) writeWidths(storageKey, next);
  }, [columns, widths, storageKey, widthColumnCount]);
  const startResize = (0, import_react19.useCallback)(
    (event, index) => {
      event.preventDefault();
      event.stopPropagation();
      const table = tableRef.current;
      if (table === null) return;
      const headers = table.querySelectorAll("thead tr:first-child th[data-column-index]");
      const measured = columns.map((_, columnIndex) => {
        const header = headers[columnIndex];
        return header instanceof HTMLElement ? Math.round(header.getBoundingClientRect().width) : 120;
      });
      const base = widths ?? measured;
      setWidths(base.slice());
      const startX = event.clientX;
      const startWidth = base[index] ?? 120;
      const current = base.slice();
      const move = (moveEvent) => {
        const width = Math.min(
          MAX_COLUMN_WIDTH,
          Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + (moveEvent.clientX - startX)))
        );
        if (current[index] === width) return;
        current[index] = width;
        setWidths(current.slice());
      };
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
        window.removeEventListener("blur", up);
        document.removeEventListener("mouseleave", up);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (storageKey !== void 0 && columns.length === widthColumnCount) writeWidths(storageKey, current);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      window.addEventListener("blur", up);
      document.addEventListener("mouseleave", up);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columns, storageKey, widthColumnCount, widths]
  );
  const resetWidths = (0, import_react19.useCallback)(() => {
    setWidths(null);
    if (storageKey !== void 0) clearWidths(storageKey);
  }, [storageKey]);
  (0, import_react19.useEffect)(() => {
    if (menu === null) return void 0;
    const close = () => setMenu(null);
    const onKey = (event) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
    };
  }, [menu]);
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "dshdb-grid-wrap", ref: containerRef, onScroll, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
      "table",
      {
        className: `dshdb-grid${widths === null ? "" : " dshdb-grid-sized"}`,
        "aria-label": label,
        ref: tableRef,
        children: [
          widths === null ? null : /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("colgroup", { children: [
            selectable ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("col", { style: { width: 30 } }) : null,
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("col", { style: { width: 34 } }),
            widths.map((width, index) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("col", { style: { width } }, `col-${index}`))
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("thead", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("tr", { children: [
              selectable ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("th", { className: "dshdb-select-cell", scope: "col", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                "input",
                {
                  type: "checkbox",
                  "aria-label": selectedCount === rows.length && rows.length > 0 ? "取消全选行" : "全选行",
                  checked: rows.length > 0 && selectedCount === rows.length,
                  ref: (input) => {
                    if (input !== null) input.indeterminate = selectedCount > 0 && selectedCount < rows.length;
                  },
                  title: "选中 / 取消选中当前页所有行",
                  onChange: () => onToggleAllRows?.()
                }
              ) }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("th", { className: "dshdb-num", scope: "col", children: [
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { "aria-hidden": "true", children: "#" }),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "dshdb-sr-only", children: "行号" })
              ] }),
              columns.map((column, index) => /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
                "th",
                {
                  "data-column-index": index,
                  title: headerTitle(column, onSort !== void 0),
                  className: [
                    numericColumn(column) ? "dshdb-cell-num" : "",
                    onSort === void 0 ? "" : "dshdb-th-sortable",
                    onReorderColumns === void 0 ? "" : "dshdb-th-draggable",
                    dropIndex === index ? "dshdb-th-drop-target" : "",
                    dragIndex.current === index ? "dshdb-th-dragging" : ""
                  ].filter((value) => value !== "").join(" ") || void 0,
                  "data-sorted": isSorted(column) ? sort?.direction : void 0,
                  "aria-sort": onSort === void 0 ? void 0 : isSorted(column) ? sort?.direction === "asc" ? "ascending" : "descending" : "none",
                  tabIndex: onSort === void 0 ? void 0 : 0,
                  onKeyDown: onSort === void 0 ? void 0 : (event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    if (event.target.classList.contains("dshdb-grip")) return;
                    event.preventDefault();
                    onSort(column, index);
                  },
                  draggable: onReorderColumns !== void 0,
                  onDragStart: (event) => {
                    if (onReorderColumns === void 0) return;
                    dragIndex.current = index;
                    dragged.current = true;
                    event.dataTransfer?.setData("text/plain", String(index));
                    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
                  },
                  onDragOver: (event) => {
                    if (onReorderColumns === void 0) return;
                    event.preventDefault();
                    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
                    setDropIndex(index);
                  },
                  onDragLeave: () => setDropIndex((current) => current === index ? null : current),
                  onDrop: (event) => {
                    if (onReorderColumns === void 0) return;
                    event.preventDefault();
                    const from = dragIndex.current;
                    dragIndex.current = null;
                    setDropIndex(null);
                    if (from !== null && from !== index) onReorderColumns(from, index);
                  },
                  onDragEnd: () => {
                    dragIndex.current = null;
                    setDropIndex(null);
                  },
                  onClick: onSort === void 0 ? void 0 : (event) => {
                    if (dragged.current) {
                      dragged.current = false;
                      return;
                    }
                    if (event.target.classList.contains("dshdb-grip")) return;
                    onSort(column, index);
                  },
                  onContextMenu: headerMenu === void 0 ? void 0 : (event) => {
                    event.preventDefault();
                    openMenu(headerMenu(column), event.clientX, event.clientY);
                  },
                  children: [
                    column.name,
                    isSorted(column) ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: "dshdb-sort-arrow", "aria-hidden": "true", children: sort?.direction === "asc" ? "▲" : "▼" }) : null,
                    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                      "span",
                      {
                        className: "dshdb-grip",
                        role: "separator",
                        "aria-label": `调整 ${column.name} 列宽`,
                        title: "拖动调整列宽，双击恢复自动列宽",
                        onMouseDown: (event) => startResize(event, index),
                        onDoubleClick: resetWidths
                      }
                    )
                  ]
                },
                `${column.name}-${index}`
              ))
            ] }),
            headerExtra
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("tbody", { children: [
            rows.length === 0 && emptyText !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("tr", { className: "dshdb-empty-row", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("td", { colSpan, children: emptyText }) }) : null,
            range.paddingTop > 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("tr", { className: "dshdb-vpad", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("td", { colSpan, style: { height: range.paddingTop } }) }) : null,
            visible.map((row, index) => {
              const rowIndex = range.start + index;
              const rowNo = rowNumbers?.[rowIndex] ?? offset + rowIndex + 1;
              const checked = selectedRows?.has(rowIndex) === true;
              return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("tr", { "data-selected": selectable && checked ? "true" : void 0, children: [
                selectable ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("td", { className: "dshdb-select-cell", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                  "input",
                  {
                    type: "checkbox",
                    "aria-label": `选择第 ${rowNo} 行`,
                    checked,
                    onChange: (event) => onToggleRow?.(rowIndex, event.nativeEvent.shiftKey === true)
                  }
                ) }) : null,
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("td", { className: "dshdb-num", children: rowNo }),
                columns.map((column, columnIndex) => {
                  const value = row[columnIndex] ?? null;
                  const text2 = formatCell(value);
                  const shown = text2.length > CELL_TEXT_LIMIT ? `${text2.slice(0, CELL_TEXT_LIMIT)}…` : text2;
                  return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
                    "td",
                    {
                      title: text2,
                      className: [numericColumn(column) ? "dshdb-cell-num" : "", cellClass?.(column, value) ?? ""].filter((value2) => value2 !== "").join(" ") || void 0,
                      onClick: onCellClick === void 0 ? void 0 : () => onCellClick(column, value),
                      onDoubleClick: onCellOpen === void 0 ? void 0 : () => onCellOpen(column, value),
                      onContextMenu: cellMenu === void 0 ? void 0 : (event) => {
                        event.preventDefault();
                        openMenu(cellMenu({ column, value, row, rowIndex }), event.clientX, event.clientY);
                      },
                      children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { className: value === null ? "dshdb-null" : void 0, children: shown })
                    },
                    `${column.name}-${columnIndex}`
                  );
                })
              ] }, rowIndex);
            }),
            range.paddingBottom > 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("tr", { className: "dshdb-vpad", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("td", { colSpan, style: { height: range.paddingBottom } }) }) : null
          ] })
        ]
      }
    ),
    menu !== null ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
      "div",
      {
        className: "dshdb-hmenu",
        role: "menu",
        style: { left: menu.x, top: menu.y },
        onPointerDown: (event) => event.stopPropagation(),
        children: menu.items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          "button",
          {
            type: "button",
            role: "menuitem",
            disabled: item.disabled === true,
            onClick: () => {
              setMenu(null);
              item.run();
            },
            children: item.label
          },
          `${item.label}-${index}`
        ))
      }
    ) : null
  ] });
});

// src/client/history.ts
var KEY = "dsh-ide-database.history.v1";
var PIN_KEY = "dsh-ide-database.history.pinned.v1";
var LIMIT = 50;
var PIN_LIMIT = 20;
function storage2() {
  try {
    return globalThis.localStorage;
  } catch {
    return void 0;
  }
}
function isEntry(value) {
  const entry = value;
  return typeof entry?.statement === "string" && typeof entry?.at === "number";
}
function read() {
  const empty = { sql: [], redis: [] };
  const raw = storage2()?.getItem(KEY);
  if (raw === null || raw === void 0) return empty;
  try {
    const parsed = JSON.parse(raw);
    return {
      sql: Array.isArray(parsed?.sql) ? parsed.sql.filter(isEntry).slice(0, LIMIT) : [],
      redis: Array.isArray(parsed?.redis) ? parsed.redis.filter(isEntry).slice(0, LIMIT) : []
    };
  } catch {
    return empty;
  }
}
function write(entries) {
  try {
    storage2()?.setItem(KEY, JSON.stringify(entries));
  } catch {
  }
}
function readHistory(kind) {
  return read()[kind];
}
function pushHistory(kind, statement) {
  const text2 = statement.trim();
  if (text2 === "") return readHistory(kind);
  const entries = read();
  entries[kind] = [{ statement: text2, at: Date.now() }, ...entries[kind].filter((entry) => entry.statement !== text2)].slice(
    0,
    LIMIT
  );
  write(entries);
  return entries[kind];
}
function annotateHistory(kind, statement, meta) {
  const text2 = statement.trim();
  if (text2 === "") return readHistory(kind);
  const entries = read();
  const index = entries[kind].findIndex((entry) => entry.statement === text2);
  if (index < 0) return entries[kind];
  const current = entries[kind][index];
  if (current === void 0) return entries[kind];
  const next = entries[kind].slice();
  next[index] = { ...current, ...meta.rows === void 0 ? {} : { rows: meta.rows }, elapsedMs: meta.elapsedMs };
  entries[kind] = next;
  write(entries);
  return entries[kind];
}
function clearHistory(kind) {
  const entries = read();
  entries[kind] = [];
  write(entries);
  return entries[kind];
}
function historyAgo(at, now = Date.now()) {
  return agoText((now - at) / 1e3);
}
function readPinned() {
  const empty = { sql: [], redis: [] };
  const raw = storage2()?.getItem(PIN_KEY);
  if (raw === null || raw === void 0) return empty;
  try {
    const parsed = JSON.parse(raw);
    return {
      sql: Array.isArray(parsed?.sql) ? parsed.sql.filter(isEntry).slice(0, PIN_LIMIT) : [],
      redis: Array.isArray(parsed?.redis) ? parsed.redis.filter(isEntry).slice(0, PIN_LIMIT) : []
    };
  } catch {
    return empty;
  }
}
function writePinned(entries) {
  try {
    storage2()?.setItem(PIN_KEY, JSON.stringify(entries));
  } catch {
  }
}
function readPins(kind) {
  return readPinned()[kind];
}
function togglePin(kind, statement) {
  const text2 = statement.trim();
  if (text2 === "") return false;
  const pinned = readPinned();
  const existing = pinned[kind].some((entry) => entry.statement === text2);
  pinned[kind] = existing ? pinned[kind].filter((entry) => entry.statement !== text2) : [{ statement: text2, at: Date.now() }, ...pinned[kind]].slice(0, PIN_LIMIT);
  writePinned(pinned);
  return !existing;
}

// src/client/rediskeys.ts
function filterRedisKeys(keys, options) {
  const needle = options.needle.trim().toLowerCase();
  return keys.filter(
    (info) => (!options.ttlOnly || info.ttl >= 0) && (needle === "" || info.key.toLowerCase().includes(needle))
  );
}

// src/client/sqlformat.ts
var KEYWORDS = /* @__PURE__ */ new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "IS",
  "IN",
  "LIKE",
  "BETWEEN",
  "EXISTS",
  "GROUP",
  "BY",
  "ORDER",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "CROSS",
  "ON",
  "USING",
  "AS",
  "DISTINCT",
  "UNION",
  "ALL",
  "INTERSECT",
  "EXCEPT",
  "INSERT",
  "INTO",
  "VALUES",
  "UPDATE",
  "SET",
  "DELETE",
  "CREATE",
  "ALTER",
  "DROP",
  "TABLE",
  "VIEW",
  "INDEX",
  "PRIMARY",
  "KEY",
  "FOREIGN",
  "REFERENCES",
  "DEFAULT",
  "CONSTRAINT",
  "UNIQUE",
  "COLUMN",
  "ADD",
  "MODIFY",
  "RENAME",
  "TO",
  "WITH",
  "RECURSIVE",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "ASC",
  "DESC",
  "TRUE",
  "FALSE",
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "CAST",
  "CONVERT",
  "COALESCE",
  "NULLIF",
  "IFNULL",
  "NOW",
  "CURRENT_TIMESTAMP",
  "EXPLAIN",
  "DESCRIBE",
  "SHOW",
  "DATABASES",
  "TABLES",
  "COLUMNS",
  "USE"
]);
var LINE_STARTERS = /* @__PURE__ */ new Set([
  "SELECT",
  "FROM",
  "WHERE",
  "GROUP",
  "HAVING",
  "ORDER",
  "LIMIT",
  "OFFSET",
  "UNION",
  "INTERSECT",
  "EXCEPT",
  "VALUES",
  "SET",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "CROSS",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "ALTER",
  "DROP",
  "WITH"
]);
function tokenize(sql) {
  const atoms = [];
  let i = 0;
  const push = (kind, text2) => atoms.push({ kind, text: text2 });
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1] ?? "";
    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      push("comment", sql.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === "#") {
      const end = sql.indexOf("\n", i);
      const stop = end === -1 ? sql.length : end;
      push("comment", sql.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      push("comment", sql.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === String.fromCharCode(92) && ch !== "`") {
          j += 2;
          continue;
        }
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2;
            continue;
          }
          j += 1;
          break;
        }
        j += 1;
      }
      push("literal", sql.slice(i, j));
      i = j;
      continue;
    }
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[A-Za-z0-9_$]/.test(ch)) {
      let j = i + 1;
      while (j < sql.length && /[A-Za-z0-9_$]/.test(sql[j])) j += 1;
      push("word", sql.slice(i, j));
      i = j;
      continue;
    }
    if ("(),;.".includes(ch)) {
      push("punct", ch);
      i += 1;
      continue;
    }
    const multi = MULTI_CHAR_OPS.find((op) => sql.startsWith(op, i));
    if (multi !== void 0) {
      push("op", multi);
      i += multi.length;
      continue;
    }
    if ("=<>!+-*/%|&^~".includes(ch)) {
      push("op", ch);
      i += 1;
      continue;
    }
    push("punct", ch);
    i += 1;
  }
  return atoms;
}
var MULTI_CHAR_OPS = [
  "<=>",
  "!~*",
  "->>",
  "<=",
  ">=",
  "<>",
  "!=",
  "<<",
  ">>",
  "||",
  "&&",
  "::",
  ":=",
  "=>",
  "->",
  "!~",
  "~*"
];
var noSpaceBefore = /* @__PURE__ */ new Set([",", ";", "."]);
var noSpaceAfter = /* @__PURE__ */ new Set(["(", "."]);
var SPACE_BEFORE_PAREN = /* @__PURE__ */ new Set([
  "IN",
  "AS",
  "ON",
  "AND",
  "OR",
  "NOT",
  "WHERE",
  "HAVING",
  "EXISTS",
  "ALL",
  "ANY",
  "BETWEEN",
  "LIKE",
  "WHEN",
  "THEN",
  "ELSE",
  "VALUES",
  "SET",
  "SELECT",
  "FROM",
  "BY",
  "JOIN"
]);
function formatSql(input) {
  const atoms = tokenize(input);
  let out = "";
  let depth = 0;
  let pendingNewline = false;
  const startLine = () => {
    out = `${out.replace(/\s+$/u, "")}
${"  ".repeat(depth)}`;
    pendingNewline = false;
  };
  const append = (text2, space) => {
    if (pendingNewline) {
      startLine();
    } else if (space && out !== "" && !/\s$/u.test(out)) {
      out += " ";
    }
    out += text2;
  };
  for (let index = 0; index < atoms.length; index += 1) {
    const atom = atoms[index];
    if (atom.kind === "comment") {
      append(atom.text, out !== "" && !/\s$/u.test(out));
      pendingNewline = true;
      continue;
    }
    if (atom.kind === "literal") {
      append(atom.text, out !== "" && !/[(\s.]$/u.test(out));
      continue;
    }
    if (atom.kind === "punct") {
      if (atom.text === ",") {
        append(",", false);
        out += " ";
        continue;
      }
      if (atom.text === ";") {
        append(";", false);
        out += "\n";
        continue;
      }
      if (atom.text === "(") {
        const previous = atoms[index - 1];
        const previousWord = previous?.kind === "word" ? previous.text.toUpperCase() : "";
        const space = out !== "" && (SPACE_BEFORE_PAREN.has(previousWord) || previous?.kind !== "word");
        append("(", space);
        depth += 1;
        continue;
      }
      if (atom.text === ")") {
        depth = Math.max(0, depth - 1);
        out = out.replace(/\s+$/u, "");
        append(")", false);
        continue;
      }
      if (atom.text === ".") {
        append(".", false);
        continue;
      }
      append(atom.text, true);
      continue;
    }
    if (atom.kind === "op") {
      const previous = atoms[index - 1];
      const nextAtom = atoms[index + 1];
      if (atom.text === "*" && (previous?.text === "(" || nextAtom?.text === ")")) {
        append("*", false);
        continue;
      }
      append(atom.text, true);
      out += " ";
      continue;
    }
    const upper = atom.text.toUpperCase();
    const keyword = KEYWORDS.has(upper) ? upper : atom.text;
    const before = out.slice(-1);
    const startsLine = LINE_STARTERS.has(upper) && out !== "" && !/^\s*$/u.test(out);
    if (startsLine && (before !== "(" || upper === "SELECT")) {
      pendingNewline = true;
    }
    append(keyword, !noSpaceBefore.has(before) && before !== "" && !/\s$/u.test(out) && !noSpaceAfter.has(before));
  }
  return out.split("\n").map((line) => line.replace(/\s+$/u, "")).join("\n").replace(/\n{3,}/gu, "\n\n").trim();
}

// src/client/cellmenu.ts
function cellCopyText(value) {
  return formatCell(value);
}
function rowToTsv(columns, row) {
  return columns.map((_, index) => {
    const value = row[index] ?? null;
    if (value === null) return "";
    return spreadsheetSafe(formatCell(value)).replace(/[\t\r\n]+/gu, " ");
  }).join("	");
}

// src/client/columnOrder.ts
function identityOrder(length) {
  return Array.from({ length }, (_, index) => index);
}
function moveColumn(order2, from, to) {
  if (from === to || from < 0 || from >= order2.length || order2.length === 0) return order2;
  const next = order2.slice();
  const target = Math.max(0, Math.min(to, next.length - 1));
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}
function orderColumns(columns, order2) {
  if (order2 === null || order2.length !== columns.length) return columns;
  return order2.map((index) => columns[index]);
}
function orderRows(rows, order2) {
  if (order2 === null || rows.length === 0) return rows;
  return rows.map((row) => {
    const next = order2.map((index) => row[index] ?? null);
    return next;
  });
}
function columnSignature(columns) {
  return columns.map((column) => column.name).join("\0");
}

// src/client/columnhide.ts
var HIDDEN_STORAGE_PREFIX = "dsh-ide-database.hidden.v1:";
function isHidden(hidden, name2) {
  return hidden !== null && hidden.includes(name2);
}
function toggleHidden(hidden, name2) {
  const current = hidden ?? [];
  const next = current.includes(name2) ? current.filter((item) => item !== name2) : [...current, name2];
  return next.length === 0 ? null : next;
}
function onlyColumn(columns, name2) {
  if (columns.length <= 1) return null;
  if (!columns.some((column) => column.name === name2)) return null;
  return columns.filter((column) => column.name !== name2).map((column) => column.name);
}
function pruneHidden(hidden, columns) {
  if (hidden === null) return null;
  const names = new Set(columns.map((column) => column.name));
  const kept = hidden.filter((name2) => names.has(name2));
  return kept.length === 0 ? null : kept;
}
function hideColumns(columns, rows, hidden) {
  const positions = columns.map((column, index) => isHidden(hidden, column.name) ? -1 : index).filter((index) => index >= 0);
  if (positions.length === 0) {
    const all = columns.map((_, index) => index);
    return { positions: all, columns, rows };
  }
  if (positions.length === columns.length) return { positions, columns, rows };
  const narrowed = positions.map((index) => columns[index]);
  const narrowedRows = rows.map((row) => positions.map((index) => row[index] ?? null));
  return { positions, columns: narrowed, rows: narrowedRows };
}
function storage3() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function hasHidden(storageKey) {
  const store = storage3();
  if (store === null) return false;
  try {
    return store.getItem(`${HIDDEN_STORAGE_PREFIX}${storageKey}`) !== null;
  } catch {
    return false;
  }
}
function readHidden(storageKey) {
  const store = storage3();
  if (store === null) return null;
  try {
    const raw = store.getItem(`${HIDDEN_STORAGE_PREFIX}${storageKey}`);
    if (raw === null || raw === "") return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const names = parsed.filter((item) => typeof item === "string");
    return names.length === 0 ? null : names;
  } catch {
    return null;
  }
}
function writeHidden(storageKey, hidden) {
  const store = storage3();
  if (store === null) return;
  try {
    if (hidden === null || hidden.length === 0) store.removeItem(`${HIDDEN_STORAGE_PREFIX}${storageKey}`);
    else store.setItem(`${HIDDEN_STORAGE_PREFIX}${storageKey}`, JSON.stringify(hidden));
  } catch {
  }
}

// src/client/transaction.ts
function txButtonDisabled(state, action) {
  return action === "start" ? state === "open" : state === "idle";
}

// src/client/rowsort.ts
function nextRowSort(current, column, index) {
  const same = current !== null && current.column === column && (index === void 0 || current.index === void 0 || current.index === index);
  if (!same) {
    const next = { column, direction: "asc" };
    if (index !== void 0) next.index = index;
    return next;
  }
  if (current.direction === "asc") return { column, direction: "desc", index: current.index };
  return null;
}
var COLLATOR = new Intl.Collator("zh-Hans-CN", { numeric: true, sensitivity: "base" });
function order(left, right) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
  return COLLATOR.compare(String(left), String(right));
}
function sortRowsWithOrder(columns, rows, sort) {
  const identity = rows.map((_row, index2) => index2);
  if (sort === null) return { rows, order: identity };
  const explicit = sort.index;
  const byIndex = explicit !== void 0 && Number.isInteger(explicit) && explicit >= 0 && explicit < columns.length;
  const index = byIndex ? explicit : columns.findIndex((column) => column.name === sort.column);
  if (index < 0) return { rows, order: identity };
  const factor = sort.direction === "asc" ? 1 : -1;
  const positions = [...identity].sort((left, right) => {
    const a = rows[left]?.[index];
    const b = rows[right]?.[index];
    const aEmpty = a === null || a === void 0;
    const bEmpty = b === null || b === void 0;
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
    return factor * order(a, b);
  });
  return { rows: positions.map((position) => rows[position]), order: positions };
}

// src/client/rowfilter.ts
function rowHaystacks(rows) {
  return rows.map((row) => row.map((value) => formatCell(value)).join("\0").toLowerCase());
}
function filterRowIndexesByHaystacks(haystacks, needle) {
  const trimmed = needle.trim().toLowerCase();
  const indexes = [];
  if (trimmed === "") {
    for (const index of haystacks.keys()) indexes.push(index);
    return indexes;
  }
  haystacks.forEach((text2, index) => {
    if (text2.includes(trimmed)) indexes.push(index);
  });
  return indexes;
}

// src/client/pagesql.ts
var NOT_PAGEABLE = /\binto\b|\bfor\s+(?:update|share|key\s+share|no\s+key\s+update|xml|json|browse)\b|\block\s+in\s+share\s+mode\b|\btop\b\s*(?:\(|\d)|\boption\s*\(/u;
function stripTerminators(text2, dialect) {
  const code = maskNonCode(text2, dialect, true);
  const cuts = [];
  let end = code.length;
  for (; ; ) {
    while (end > 0 && /\s/u.test(code[end - 1] ?? "")) end -= 1;
    if (end === 0 || code[end - 1] !== ";") break;
    cuts.push(end - 1);
    end -= 1;
  }
  if (cuts.length === 0) return text2;
  let result = "";
  let last = 0;
  for (const index of cuts.sort((left, right) => left - right)) {
    result += text2.slice(last, index);
    last = index + 1;
  }
  return result + text2.slice(last);
}
function pageable(statement, dialect = "generic") {
  const text2 = stripTerminators(statement.trim(), dialect).trim();
  const code = maskNonCode(text2, dialect, true).trim().toLowerCase();
  if (!/^select\b/u.test(code)) return false;
  if (code.includes(";")) return false;
  if (/\boffset\s+(?:\d+|[@:]\w+|\?)\s+rows?\b/u.test(code)) {
    return false;
  }
  if (/\blimit\b/u.test(code) || /\brownum\b/u.test(code) || /\bfetch\s+(first|next)\b/u.test(code)) return false;
  if (NOT_PAGEABLE.test(code)) return false;
  return true;
}
function hasTopLevelOrderBy(text2, dialect) {
  const code = maskNonCode(text2, dialect, true);
  let depth = 0;
  for (let index = 0; index < code.length; index += 1) {
    const char = code[index];
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (char === "o" || char === "O") && /^order\s+by\b/iu.test(code.slice(index))) {
      const before = code[index - 1];
      if (before === void 0 || !/[A-Za-z0-9_$]/u.test(before)) return true;
    }
  }
  return false;
}
function wrapPage(dialect, statement, size, page) {
  const text2 = stripTerminators(statement.trim(), sqlDialectOf(dialect)).trim();
  const offset = page * size;
  if (dialect === "oracle" || dialect === "oceanbase-oracle" || dialect === "dameng") {
    return `SELECT * FROM (
${text2}
) dshdb_page OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`;
  }
  if (dialect === "mssql") {
    const order2 = hasTopLevelOrderBy(text2, dialect) ? `
OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY` : `
ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`;
    return `${text2}${order2}`;
  }
  return `SELECT * FROM (
${text2}
) dshdb_page LIMIT ${size} OFFSET ${offset}`;
}

// src/client/rediscommands.ts
var REDIS_COMMANDS = [
  "GET",
  "MGET",
  "SET",
  "SETEX",
  "SETNX",
  "GETSET",
  "GETDEL",
  "GETEX",
  "GETRANGE",
  "SETRANGE",
  "STRLEN",
  "APPEND",
  "INCR",
  "DECR",
  "INCRBY",
  "INCRBYFLOAT",
  "TYPE",
  "TTL",
  "PTTL",
  "EXISTS",
  "EXPIRE",
  "PEXPIRE",
  "EXPIREAT",
  "PERSIST",
  "DEL",
  "UNLINK",
  "SCAN",
  "KEYS",
  "DBSIZE",
  "INFO",
  "PING",
  "ECHO",
  "TIME",
  "LRANGE",
  "LPOS",
  "LPUSH",
  "RPUSH",
  "LPOP",
  "RPOP",
  "RPOPLPUSH",
  "LMOVE",
  "LTRIM",
  "LLEN",
  "SMEMBERS",
  "SINTER",
  "SUNION",
  "SDIFF",
  "SRANDMEMBER",
  "SSCAN",
  "SMOVE",
  "SADD",
  "SREM",
  "SCARD",
  "SISMEMBER",
  "HGET",
  "HINCRBY",
  "HEXISTS",
  "HSETNX",
  "HSCAN",
  "HRANDFIELD",
  "HMGET",
  "HGETALL",
  "HSET",
  "HDEL",
  "HLEN",
  "HKEYS",
  "HVALS",
  "ZRANGE",
  "ZREVRANGE",
  "ZADD",
  "ZREM",
  "ZCARD",
  "ZSCORE",
  "ZINCRBY",
  "ZCOUNT",
  "ZRANK",
  "ZREVRANK",
  "ZRANGEBYSCORE",
  "ZSCAN",
  "ZPOPMIN",
  "ZPOPMAX",
  "ZRANDMEMBER",
  "XRANGE",
  "XREVRANGE",
  "XADD",
  "XLEN",
  "XDEL",
  "XINFO"
];
function commandWord(text2, caret) {
  let start = caret;
  while (start > 0 && /\S/u.test(text2[start - 1])) start -= 1;
  let end = caret;
  while (end < text2.length && /\S/u.test(text2[end])) end += 1;
  const word = text2.slice(start, end);
  if (word === "") return null;
  if (text2.slice(0, start).trim() !== "") return null;
  return { start, end, word };
}
function commandCompletion(text2, caret) {
  const word = commandWord(text2, caret);
  if (word === null) return null;
  const prefix = word.word.toUpperCase();
  const match = REDIS_COMMANDS.find((command) => command.startsWith(prefix));
  if (match === void 0 || match === prefix) return null;
  return { start: word.start, end: word.end, command: match };
}
function applyCommandCompletion(text2, completion) {
  const next = text2.slice(0, completion.start) + completion.command + text2.slice(completion.end);
  return { text: next, caret: completion.start + completion.command.length };
}
function wordAt(text2, caret) {
  let start = Math.min(caret, text2.length);
  while (start > 0 && /\S/u.test(text2[start - 1])) start -= 1;
  let end = start;
  while (end < text2.length && /\S/u.test(text2[end])) end += 1;
  const word = text2.slice(start, end);
  return word === "" ? null : { start, end, word };
}
function keyCompletion(text2, caret, keys) {
  const word = wordAt(text2, caret);
  if (word === null) return null;
  if (text2.slice(0, word.start).trim() === "") return null;
  const match = keys.find((item) => item.key.startsWith(word.word) && item.key !== word.word);
  if (match === void 0) return null;
  return { start: word.start, end: word.end, key: match.key };
}

// src/client/sqlselection.ts
function pickStatement(value, start, end) {
  if (start !== end) {
    const slice = value.slice(Math.min(start, end), Math.max(start, end));
    if (slice.trim() !== "") return { statement: slice, selected: true };
  }
  return { statement: value, selected: false };
}
function statementAtCaret(value, caret, dialect = "generic") {
  const parts = splitStatements(value, dialect);
  if (parts.length === 0) return { statement: "", index: -1 };
  let cursor = 0;
  let picked = { statement: parts[0], index: 0 };
  for (let index = 0; index < parts.length; index += 1) {
    const text2 = parts[index];
    const found = value.indexOf(text2, cursor);
    const start = found < 0 ? cursor : found;
    const end = start + text2.length;
    cursor = end;
    picked = { statement: text2, index };
    if (caret <= end) return picked;
  }
  return picked;
}

// src/client/completion/rank.ts
function matchScore(name2, prefix) {
  const needle = prefix.toLowerCase();
  if (needle === "") return 0;
  const lower = name2.toLowerCase();
  if (lower.startsWith(needle)) return 0;
  for (let index = 1; index < lower.length; index += 1) {
    const previous = lower[index - 1] ?? "";
    const boundary = /[_.\s-]/u.test(previous) || /[a-z]/u.test(previous) && /[A-Z]/u.test(name2[index] ?? "");
    if (boundary && lower.startsWith(needle, index)) return 1;
  }
  let at = 0;
  for (const character of needle) {
    const found = lower.indexOf(character, at);
    if (found < 0) return -1;
    at = found + 1;
  }
  return 2;
}
var ANY_PRIORITY = {
  column: 0,
  table: 1,
  schema: 2,
  keyword: 3,
  function: 4,
  alias: 5,
  snippet: 6
};
var RELATION_PRIORITY = {
  alias: 0,
  table: 1,
  schema: 2,
  keyword: 3,
  function: 4,
  column: 5,
  snippet: 6
};
var COLUMN_PRIORITY = {
  column: 0,
  alias: 1,
  function: 2,
  keyword: 3,
  table: 4,
  schema: 5,
  snippet: 6
};
var SCHEMA_PRIORITY = {
  schema: 0,
  keyword: 1,
  table: 2,
  function: 3,
  column: 4,
  alias: 5,
  snippet: 6
};
var ALIAS_PRIORITY = {
  alias: 0,
  table: 1,
  schema: 2,
  keyword: 3,
  function: 4,
  column: 5,
  snippet: 6
};
var KEYWORD_PRIORITY = {
  keyword: 0,
  function: 1,
  table: 2,
  schema: 3,
  column: 4,
  alias: 5,
  snippet: 6
};
var PRIORITIES = {
  any: ANY_PRIORITY,
  relation: RELATION_PRIORITY,
  // A DDL statement takes an existing table, so only catalog rows are listed.
  tableName: RELATION_PRIORITY,
  column: COLUMN_PRIORITY,
  schema: SCHEMA_PRIORITY,
  alias: ALIAS_PRIORITY,
  keyword: KEYWORD_PRIORITY,
  // A value, a column definition or an `ALTER TABLE` action is a keyword-first
  // position, like a fresh statement, so they share the keyword order.
  value: KEYWORD_PRIORITY,
  definition: KEYWORD_PRIORITY,
  alter: KEYWORD_PRIORITY,
  alterObject: KEYWORD_PRIORITY,
  tableOptions: KEYWORD_PRIORITY,
  engine: KEYWORD_PRIORITY,
  number: KEYWORD_PRIORITY,
  set: KEYWORD_PRIORITY,
  type: KEYWORD_PRIORITY,
  charset: KEYWORD_PRIORITY,
  name: KEYWORD_PRIORITY,
  statement: KEYWORD_PRIORITY,
  show: KEYWORD_PRIORITY,
  comparison: KEYWORD_PRIORITY,
  boolean: KEYWORD_PRIORITY,
  direction: KEYWORD_PRIORITY,
  orderTail: KEYWORD_PRIORITY,
  expressionTail: KEYWORD_PRIORITY,
  groupTail: KEYWORD_PRIORITY,
  rollupTail: KEYWORD_PRIORITY,
  withRollup: KEYWORD_PRIORITY,
  alterDatabase: KEYWORD_PRIORITY,
  lockModeStart: KEYWORD_PRIORITY,
  lockMode: KEYWORD_PRIORITY,
  lockModePair: KEYWORD_PRIORITY,
  lockModeEnd: KEYWORD_PRIORITY,
  explainOption: KEYWORD_PRIORITY,
  typeAlter: KEYWORD_PRIORITY,
  typeAdd: KEYWORD_PRIORITY,
  insertTail: KEYWORD_PRIORITY,
  insertSource: KEYWORD_PRIORITY,
  insertOn: KEYWORD_PRIORITY,
  conflictAction: KEYWORD_PRIORITY,
  sampleMethod: KEYWORD_PRIORITY,
  joinTail: KEYWORD_PRIORITY,
  // Common columns first, like an unqualified column list.
  using: COLUMN_PRIORITY,
  over: KEYWORD_PRIORITY,
  privilege: KEYWORD_PRIORITY,
  collation: KEYWORD_PRIORITY,
  grantOption: KEYWORD_PRIORITY,
  grantOptionWord: KEYWORD_PRIORITY,
  lock: KEYWORD_PRIORITY,
  frame: KEYWORD_PRIORITY,
  interval: KEYWORD_PRIORITY,
  indexMethod: KEYWORD_PRIORITY,
  lockTable: KEYWORD_PRIORITY,
  rowFormat: KEYWORD_PRIORITY,
  partition: KEYWORD_PRIORITY,
  transaction: KEYWORD_PRIORITY,
  transactionRead: KEYWORD_PRIORITY,
  transactionWith: KEYWORD_PRIORITY,
  rollbackTo: KEYWORD_PRIORITY,
  isolation: KEYWORD_PRIORITY,
  setTransaction: KEYWORD_PRIORITY,
  isolationLevel: KEYWORD_PRIORITY,
  isolationRead: KEYWORD_PRIORITY,
  nulls: KEYWORD_PRIORITY,
  alterColumnSet: KEYWORD_PRIORITY,
  alterColumnDrop: KEYWORD_PRIORITY,
  columnType: KEYWORD_PRIORITY,
  triggerTiming: KEYWORD_PRIORITY,
  triggerEvent: KEYWORD_PRIORITY,
  triggerOn: KEYWORD_PRIORITY,
  triggerFor: KEYWORD_PRIORITY,
  triggerEach: KEYWORD_PRIORITY,
  triggerRow: KEYWORD_PRIORITY,
  routineReturn: KEYWORD_PRIORITY,
  viewTail: KEYWORD_PRIORITY,
  eventOn: KEYWORD_PRIORITY,
  eventSchedule: KEYWORD_PRIORITY,
  eventTiming: KEYWORD_PRIORITY,
  eventTail: KEYWORD_PRIORITY,
  intoTarget: KEYWORD_PRIORITY,
  constraintType: KEYWORD_PRIORITY,
  assignment: KEYWORD_PRIORITY,
  flush: KEYWORD_PRIORITY,
  reset: KEYWORD_PRIORITY,
  algorithm: KEYWORD_PRIORITY,
  lockOption: KEYWORD_PRIORITY,
  fromTail: KEYWORD_PRIORITY,
  raise: KEYWORD_PRIORITY,
  raiseUsing: KEYWORD_PRIORITY,
  database: SCHEMA_PRIORITY
};
function prioritiesFor(context) {
  return PRIORITIES[context] ?? ANY_PRIORITY;
}
var MATCH_WEIGHT = 1e4;
var KIND_WEIGHT = 100;
var RECENT_WEIGHT = 1;
var RECENT_MAX = 9;
var FREQUENCY_WEIGHT = 10;
var FREQUENCY_MAX = 3;
function rankCandidates(candidates, prefix, limit = 60, options = {}) {
  const priorities = options.priorities ?? ANY_PRIORITY;
  const recent = options.recent ?? [];
  const frequency = options.frequency ?? /* @__PURE__ */ Object.create(null);
  const recentScore = /* @__PURE__ */ new Map();
  recent.forEach((name2, index) => {
    if (recentScore.has(name2)) return;
    recentScore.set(name2, Math.min(RECENT_MAX, recent.length - index) * RECENT_WEIGHT);
  });
  const seen = /* @__PURE__ */ new Set();
  const scored = [];
  candidates.forEach((item, order2) => {
    if (item.name === "") return;
    const match = matchScore(item.name, prefix);
    if (match < 0) return;
    const key = `${item.kind}\0${item.name}`;
    if (seen.has(key)) return;
    seen.add(key);
    const kind = priorities[item.kind] ?? ANY_PRIORITY[item.kind] ?? 0;
    const recentPenalty = recentScore.get(item.name) ?? 0;
    const frequencyKey = item.name.toLowerCase();
    const picks = Object.hasOwn(frequency, frequencyKey) ? frequency[frequencyKey] ?? 0 : 0;
    const frequencyPenalty = Math.min(FREQUENCY_MAX, picks) * FREQUENCY_WEIGHT;
    const score = match * MATCH_WEIGHT + kind * KIND_WEIGHT - frequencyPenalty - recentPenalty;
    scored.push({ item, score, order: order2 });
  });
  scored.sort((left, right) => left.score - right.score || left.order - right.order);
  const limits = options.limits;
  const picked = [];
  const counts = /* @__PURE__ */ new Map();
  for (const entry of scored) {
    if (limits !== void 0) {
      const max = limits[entry.item.kind];
      const used = counts.get(entry.item.kind) ?? 0;
      if (max !== void 0 && used >= max) continue;
      counts.set(entry.item.kind, used + 1);
    }
    picked.push(entry);
    if (picked.length >= limit) break;
  }
  return picked.map((entry) => ({ ...entry.item, score: entry.score }));
}
function rank(candidates, prefix, limit = 60, options = {}) {
  return rankCandidates(candidates, prefix, limit, options).map(({ score: _score, ...item }) => item);
}

// src/client/completion/keywords.ts
var STATEMENT_WORDS = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "WITH",
  "EXPLAIN",
  "ANALYZE",
  "CREATE",
  "DROP",
  "ALTER",
  "USE",
  "TRUNCATE",
  "MERGE",
  "REPLACE",
  "SHOW",
  "DESCRIBE",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "DECLARE"
];
var RELATION_WORDS = [
  "WHERE",
  "JOIN",
  "INTO",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "FULL",
  "CROSS",
  "NATURAL",
  "ON",
  "USING",
  "GROUP",
  "ORDER",
  "HAVING",
  "LIMIT",
  "OFFSET",
  "FETCH",
  "UNION",
  "EXCEPT",
  "INTERSECT",
  "RETURNING",
  "SET",
  "VALUES",
  "AS"
];
var EXPRESSION_WORDS = [
  "FROM",
  "AND",
  "OR",
  "NOT",
  "NULL",
  "BETWEEN",
  "LIKE",
  "IN",
  "IS",
  "CASE",
  "WHEN",
  "THEN",
  "ELSE",
  "END",
  "DISTINCT",
  "EXISTS",
  "ASC",
  "DESC",
  "TRUE",
  "FALSE",
  "ESCAPE",
  "COLLATE",
  "INTERVAL",
  "OVER",
  "PARTITION",
  "FILTER"
];
var SCHEMA_WORDS = [
  "TABLE",
  "VIEW",
  "SCHEMA",
  "DATABASE",
  "INDEX",
  "SEQUENCE",
  "TRIGGER",
  "FUNCTION",
  "PROCEDURE",
  "TYPE"
];
var ALTER_WORDS = ["ADD", "DROP", "MODIFY", "CHANGE", "RENAME", "ALTER"];
var ALTER_OBJECT_WORDS = [
  "COLUMN",
  "CONSTRAINT",
  "INDEX",
  "KEY",
  "PRIMARY",
  "FOREIGN",
  "UNIQUE",
  "CHECK",
  "DEFAULT",
  "TO"
];
var ALIAS_WORDS = ["AS"];
var RESERVED_WORDS = [
  ...STATEMENT_WORDS,
  ...RELATION_WORDS,
  ...EXPRESSION_WORDS,
  ...SCHEMA_WORDS,
  "FROM",
  "INTO",
  "TO",
  "BY",
  "ALL",
  "ANY",
  "SOME",
  "FOR",
  "RECURSIVE",
  "LATERAL",
  "COLUMN",
  "ADD",
  "MODIFY",
  "CHANGE",
  "RENAME",
  "CASCADE",
  "RESTRICT",
  "CONSTRAINT",
  "PRIMARY",
  "FOREIGN",
  "REFERENCES",
  "UNIQUE",
  "CHECK",
  "DEFAULT",
  "AUTO_INCREMENT",
  "COMMENT",
  "GRANT",
  "REVOKE",
  "LOCK",
  "UNLOCK",
  "CONNECT",
  "MINUS",
  "TOP",
  "OUTPUT",
  "ILIKE",
  "ATTACH",
  "DETACH",
  "PRAGMA"
];
var RESERVED = new Set(RESERVED_WORDS.map((word) => word.toLowerCase()));
function isKeyword(word) {
  return RESERVED.has(word.toLowerCase());
}
var CLAUSE_WORDS = ["SELECT", "FROM", "WHERE"];
var ANY_WORDS = [
  ...CLAUSE_WORDS,
  ...STATEMENT_WORDS,
  ...RELATION_WORDS,
  ...EXPRESSION_WORDS
];
function uniqueWords(words) {
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const word of words) {
    const upper = word.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);
    result.push(upper);
  }
  return result;
}
var SQL_KEYWORDS = uniqueWords(ANY_WORDS);
var MYSQL_KEYWORDS = {
  words: [
    "STRAIGHT_JOIN",
    "REGEXP",
    "RLIKE",
    "IGNORE",
    "DUPLICATE",
    "BINARY",
    "FORCE",
    "SQL_CALC_FOUND_ROWS",
    "SEPARATOR",
    "SQL_NO_CACHE"
  ],
  contexts: ["relation", "column"]
};
var ORACLE_KEYWORDS = {
  words: ["CONNECT", "START", "PRIOR", "SIBLINGS", "PIVOT", "UNPIVOT", "ROWNUM", "MODEL", "KEEP", "SAMPLE", "FLASHBACK"],
  contexts: ["relation", "column"]
};
var POSTGRES_KEYWORDS = {
  words: ["CONFLICT", "DO", "NOTHING", "SIMILAR", "OVERLAPS", "WITHIN"],
  contexts: ["column"]
};
function dialectWordGroup(dialect) {
  switch (dialect) {
    case "mysql":
      return MYSQL_KEYWORDS;
    case "oracle":
    case "oceanbase-oracle":
    case "dameng":
      return ORACLE_KEYWORDS;
    case "postgres":
      return POSTGRES_KEYWORDS;
    default:
      return void 0;
  }
}
var VALUE_WORDS = ["DEFAULT", "NULL", "TRUE", "FALSE"];
var DEFINITION_WORDS = [
  "PRIMARY",
  "KEY",
  "NOT",
  "NULL",
  "DEFAULT",
  "UNIQUE",
  "CHECK",
  "REFERENCES",
  "CONSTRAINT",
  "AUTO_INCREMENT",
  "COMMENT",
  "COLLATE",
  "UNSIGNED"
];
var TABLE_OPTION_WORDS = [
  "AS",
  "ENGINE",
  "DEFAULT",
  "CHARSET",
  "CHARACTER",
  "COLLATE",
  "COMMENT",
  "AUTO_INCREMENT",
  "PARTITION",
  "ROW_FORMAT",
  "TABLESPACE"
];
var ENGINE_NAMES = [
  "InnoDB",
  "MyISAM",
  "MEMORY",
  "CSV",
  "ARCHIVE",
  "BLACKHOLE",
  "FEDERATED",
  "NDB",
  "PERFORMANCE_SCHEMA",
  "MRG_MYISAM"
];
var SET_WORDS = [
  "NAMES",
  "SESSION",
  "GLOBAL",
  "LOCAL",
  "TRANSACTION",
  "CHARACTER",
  "PASSWORD",
  "ROLE"
];
var CAST_TYPE_WORDS = [
  "SIGNED",
  "UNSIGNED",
  "CHAR",
  "VARCHAR",
  "BINARY",
  "INT",
  "INTEGER",
  "DECIMAL",
  "NUMERIC",
  "DATE",
  "DATETIME",
  "TIME",
  "TIMESTAMP",
  "JSON",
  "FLOAT",
  "DOUBLE",
  "TEXT",
  "BLOB"
];
var COLUMN_TYPE_WORDS = [
  "INT",
  "INTEGER",
  "BIGINT",
  "SMALLINT",
  "TINYINT",
  "MEDIUMINT",
  "BIT",
  "BOOLEAN",
  "BOOL",
  "VARCHAR",
  "CHAR",
  "TEXT",
  "TINYTEXT",
  "MEDIUMTEXT",
  "LONGTEXT",
  "BLOB",
  "TINYBLOB",
  "MEDIUMBLOB",
  "LONGBLOB",
  "BINARY",
  "VARBINARY",
  "DECIMAL",
  "NUMERIC",
  "FLOAT",
  "DOUBLE",
  "REAL",
  "DATE",
  "DATETIME",
  "TIMESTAMP",
  "TIME",
  "YEAR",
  "JSON",
  "ENUM",
  "SET",
  "UUID",
  "GEOMETRY"
];
var CHARSET_NAMES = [
  "utf8mb4",
  "utf8",
  "latin1",
  "ascii",
  "binary",
  "gbk",
  "gb18030",
  "utf16",
  "utf32",
  "big5"
];
var SHOW_WORDS = [
  "TABLES",
  "DATABASES",
  "SCHEMAS",
  "COLUMNS",
  "FIELDS",
  "INDEX",
  "INDEXES",
  "KEYS",
  "STATUS",
  "VARIABLES",
  "GLOBAL",
  "SESSION",
  "CREATE",
  "FULL",
  "PROCESSLIST",
  "GRANTS",
  "TRIGGERS",
  "EVENTS",
  "ENGINES",
  "CHARSET",
  "COLLATION",
  "WARNINGS",
  "ERRORS",
  "TABLE",
  "PRIVILEGES"
];
var COMPARISON_WORDS = ["LIKE", "IN", "IS", "NOT", "BETWEEN", "REGEXP"];
var BOOLEAN_WORDS = ["AND", "OR"];
var DIRECTION_WORDS = ["ASC", "DESC"];
var ORDER_TAIL_WORDS = ["LIMIT", "OFFSET"];
var EXPRESSION_TAIL_WORDS = [
  "AS",
  "FROM",
  "WHERE",
  "GROUP",
  "ORDER",
  "HAVING",
  "LIMIT",
  "UNION",
  "AND",
  "OR"
];
var GROUP_TAIL_WORDS = ["HAVING", "ORDER", "LIMIT", "WITH"];
var ROLLUP_TAIL_WORDS = ["HAVING", "ORDER", "LIMIT"];
var WITH_ROLLUP_WORDS = ["ROLLUP"];
var ALTER_DATABASE_WORDS = ["CHARACTER", "COLLATE", "ENCRYPTION", "READ"];
var LOCK_MODE_START_WORDS = ["IN"];
var LOCK_MODE_WORDS = ["ACCESS", "ROW", "SHARE", "EXCLUSIVE", "UPDATE", "KEY"];
var LOCK_MODE_PAIR_WORDS = ["SHARE", "EXCLUSIVE"];
var LOCK_MODE_END_WORDS = ["MODE"];
var TYPE_ALTER_WORDS = ["ADD", "RENAME", "ALTER", "SET", "OWNER"];
var TYPE_ADD_WORDS = ["VALUE", "ATTRIBUTE"];
var EXPLAIN_OPTION_WORDS = [
  "ANALYZE",
  "VERBOSE",
  "BUFFERS",
  "COSTS",
  "SETTINGS",
  "TIMING",
  "FORMAT",
  "WAL"
];
var INSERT_TAIL_WORDS = ["ON DUPLICATE KEY UPDATE"];
var INSERT_SOURCE_WORDS = ["VALUES", "SELECT", "SET"];
var GRANT_OPTION_WORDS = ["GRANT", "ADMIN"];
var GRANT_OPTION_WORD_WORDS = ["OPTION"];
var LOCK_WORDS = ["UPDATE", "SHARE"];
var LOCK_TABLE_WORDS = ["READ", "WRITE", "LOW_PRIORITY", "AS"];
var ROW_FORMAT_WORDS = ["DEFAULT", "DYNAMIC", "FIXED", "COMPRESSED", "REDUNDANT", "COMPACT"];
var PARTITION_WORDS = ["HASH", "KEY", "RANGE", "LIST", "LINEAR"];
var TRIGGER_TIMING_WORDS = ["BEFORE", "AFTER"];
var TRIGGER_EVENT_WORDS = ["INSERT", "UPDATE", "DELETE"];
var TRIGGER_ON_WORDS = ["ON"];
var TRIGGER_FOR_WORDS = ["FOR"];
var TRIGGER_EACH_WORDS = ["EACH"];
var TRIGGER_ROW_WORDS = ["ROW"];
var ROUTINE_RETURN_WORDS = ["RETURNS"];
var VIEW_TAIL_WORDS = ["AS"];
var EVENT_ON_WORDS = ["ON"];
var EVENT_SCHEDULE_WORDS = ["SCHEDULE"];
var EVENT_TIMING_WORDS = ["AT", "EVERY"];
var EVENT_TAIL_WORDS = ["STARTS", "ENDS", "DO"];
var INTO_TARGET_WORDS = ["OUTFILE", "DUMPFILE"];
var FLUSH_WORDS = [
  "PRIVILEGES",
  "TABLES",
  "LOGS",
  "BINARY",
  "ENGINE",
  "ERROR",
  "GENERAL",
  "RELAY",
  "SLOW",
  "HOSTS",
  "STATUS",
  "USER_RESOURCES",
  "OPTIMIZER_COSTS"
];
var RESET_WORDS = ["MASTER", "SLAVE", "REPLICA", "QUERY", "CACHE"];
var ALGORITHM_WORDS = ["DEFAULT", "INPLACE", "COPY", "INSTANT"];
var LOCK_OPTION_WORDS = ["DEFAULT", "NONE", "SHARED", "EXCLUSIVE"];
var ASSIGNMENT_WORDS = ["SET"];
var CONSTRAINT_TYPE_WORDS = ["FOREIGN", "PRIMARY", "UNIQUE", "CHECK"];
var TRANSACTION_WORDS = ["READ", "WRITE", "WITH"];
var TRANSACTION_READ_WORDS = ["ONLY", "WRITE"];
var TRANSACTION_WITH_WORDS = ["CONSISTENT"];
var ROLLBACK_TO_WORDS = ["SAVEPOINT"];
var ISOLATION_WORDS = ["READ", "REPEATABLE", "SERIALIZABLE"];
var SET_TRANSACTION_WORDS = ["ISOLATION", "READ"];
var ISOLATION_LEVEL_WORDS = ["LEVEL"];
var ISOLATION_READ_WORDS = ["COMMITTED", "UNCOMMITTED"];
var INSERT_ON_WORDS = ["DUPLICATE"];
var CONFLICT_ACTION_WORDS = ["NOTHING", "UPDATE"];
var SAMPLE_METHOD_WORDS = ["SYSTEM", "BERNOULLI", "RESERVOIR", "ROW", "PERCENT"];
var FROM_TAIL_WORDS = [
  "WHERE",
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "CROSS",
  "NATURAL",
  "ON",
  "USING",
  "GROUP",
  "ORDER",
  "HAVING",
  "LIMIT",
  "UNION",
  "FOR"
];
var RAISE_WORDS = ["DEBUG", "LOG", "INFO", "NOTICE", "WARNING", "EXCEPTION"];
var RAISE_USING_WORDS = [
  "MESSAGE",
  "DETAIL",
  "HINT",
  "ERRCODE",
  "COLUMN",
  "CONSTRAINT",
  "DATATYPE",
  "TABLE",
  "SCHEMA"
];
var NULLS_WORDS = ["FIRST", "LAST"];
var ALTER_COLUMN_SET_WORDS = ["DEFAULT", "VISIBLE", "INVISIBLE"];
var ALTER_COLUMN_DROP_WORDS = ["DEFAULT", "NOT", "IDENTITY", "EXPRESSION"];
var FRAME_WORDS = ["BETWEEN", "UNBOUNDED", "CURRENT", "ROW", "PRECEDING", "FOLLOWING"];
var INTERVAL_UNITS = [
  "MICROSECOND",
  "SECOND",
  "MINUTE",
  "HOUR",
  "DAY",
  "WEEK",
  "MONTH",
  "QUARTER",
  "YEAR"
];
var COLLATION_NAMES = [
  "utf8mb4_general_ci",
  "utf8mb4_unicode_ci",
  "utf8mb4_bin",
  "utf8_general_ci",
  "utf8_unicode_ci",
  "latin1_swedish_ci",
  "ascii_general_ci",
  "binary"
];
var INDEX_METHOD_WORDS = ["BTREE", "HASH"];
var PRIVILEGE_WORDS = [
  "SELECT",
  "INSERT",
  "UPDATE",
  "DELETE",
  "CREATE",
  "DROP",
  "ALTER",
  "EXECUTE",
  "ALL",
  "USAGE",
  "REFERENCES",
  "TRIGGER",
  "INDEX",
  "PROCESS",
  "RELOAD",
  "SHOW"
];
var OVER_WORDS = ["PARTITION", "ORDER", "RANGE", "ROWS", "GROUPS"];
var JOIN_TAIL_WORDS = [
  "JOIN",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "CROSS",
  "NATURAL",
  "WHERE",
  "GROUP",
  "ORDER",
  "HAVING",
  "LIMIT",
  "UNION"
];
function contextWords(context) {
  switch (context) {
    case "relation":
      return RELATION_WORDS;
    case "column":
      return EXPRESSION_WORDS;
    case "schema":
      return SCHEMA_WORDS;
    case "alias":
      return ALIAS_WORDS;
    case "value":
      return VALUE_WORDS;
    case "definition":
      return DEFINITION_WORDS;
    case "tableOptions":
      return TABLE_OPTION_WORDS;
    case "engine":
    case "number":
      return [];
    case "set":
      return SET_WORDS;
    case "type":
      return CAST_TYPE_WORDS;
    case "columnType":
      return COLUMN_TYPE_WORDS;
    case "triggerTiming":
      return TRIGGER_TIMING_WORDS;
    case "triggerEvent":
      return TRIGGER_EVENT_WORDS;
    case "triggerOn":
      return TRIGGER_ON_WORDS;
    case "triggerFor":
      return TRIGGER_FOR_WORDS;
    case "triggerEach":
      return TRIGGER_EACH_WORDS;
    case "triggerRow":
      return TRIGGER_ROW_WORDS;
    case "routineReturn":
      return ROUTINE_RETURN_WORDS;
    case "viewTail":
      return VIEW_TAIL_WORDS;
    case "eventOn":
      return EVENT_ON_WORDS;
    case "eventSchedule":
      return EVENT_SCHEDULE_WORDS;
    case "eventTiming":
      return EVENT_TIMING_WORDS;
    case "eventTail":
      return EVENT_TAIL_WORDS;
    case "intoTarget":
      return INTO_TARGET_WORDS;
    case "constraintType":
      return CONSTRAINT_TYPE_WORDS;
    case "assignment":
      return ASSIGNMENT_WORDS;
    case "flush":
      return FLUSH_WORDS;
    case "reset":
      return RESET_WORDS;
    case "algorithm":
      return ALGORITHM_WORDS;
    case "lockOption":
      return LOCK_OPTION_WORDS;
    case "fromTail":
      return FROM_TAIL_WORDS;
    case "raise":
      return RAISE_WORDS;
    case "raiseUsing":
      return RAISE_USING_WORDS;
    case "charset":
      return [];
    case "statement":
      return STATEMENT_WORDS;
    case "show":
      return SHOW_WORDS;
    case "comparison":
      return COMPARISON_WORDS;
    case "boolean":
      return BOOLEAN_WORDS;
    case "direction":
      return DIRECTION_WORDS;
    case "orderTail":
      return ORDER_TAIL_WORDS;
    case "expressionTail":
      return EXPRESSION_TAIL_WORDS;
    case "groupTail":
      return GROUP_TAIL_WORDS;
    case "rollupTail":
      return ROLLUP_TAIL_WORDS;
    case "withRollup":
      return WITH_ROLLUP_WORDS;
    case "alterDatabase":
      return ALTER_DATABASE_WORDS;
    case "lockModeStart":
      return LOCK_MODE_START_WORDS;
    case "lockMode":
      return LOCK_MODE_WORDS;
    case "lockModePair":
      return LOCK_MODE_PAIR_WORDS;
    case "lockModeEnd":
      return LOCK_MODE_END_WORDS;
    case "explainOption":
      return EXPLAIN_OPTION_WORDS;
    case "typeAlter":
      return TYPE_ALTER_WORDS;
    case "typeAdd":
      return TYPE_ADD_WORDS;
    case "insertTail":
      return INSERT_TAIL_WORDS;
    case "insertSource":
      return INSERT_SOURCE_WORDS;
    case "insertOn":
      return INSERT_ON_WORDS;
    case "conflictAction":
      return CONFLICT_ACTION_WORDS;
    case "sampleMethod":
      return SAMPLE_METHOD_WORDS;
    case "joinTail":
      return JOIN_TAIL_WORDS;
    case "privilege":
      return PRIVILEGE_WORDS;
    case "over":
      return OVER_WORDS;
    case "collation":
      return [];
    case "grantOption":
      return GRANT_OPTION_WORDS;
    case "grantOptionWord":
      return GRANT_OPTION_WORD_WORDS;
    case "lock":
      return LOCK_WORDS;
    case "lockTable":
      return LOCK_TABLE_WORDS;
    case "rowFormat":
      return ROW_FORMAT_WORDS;
    case "partition":
      return PARTITION_WORDS;
    case "transaction":
      return TRANSACTION_WORDS;
    case "transactionRead":
      return TRANSACTION_READ_WORDS;
    case "transactionWith":
      return TRANSACTION_WITH_WORDS;
    case "rollbackTo":
      return ROLLBACK_TO_WORDS;
    case "isolation":
      return ISOLATION_WORDS;
    case "setTransaction":
      return SET_TRANSACTION_WORDS;
    case "isolationLevel":
      return ISOLATION_LEVEL_WORDS;
    case "isolationRead":
      return ISOLATION_READ_WORDS;
    case "nulls":
      return NULLS_WORDS;
    case "alterColumnSet":
      return ALTER_COLUMN_SET_WORDS;
    case "alterColumnDrop":
      return ALTER_COLUMN_DROP_WORDS;
    case "frame":
      return FRAME_WORDS;
    case "interval":
      return INTERVAL_UNITS;
    case "indexMethod":
      return INDEX_METHOD_WORDS;
    case "name":
      return [];
    case "alter":
      return ALTER_WORDS;
    case "alterObject":
      return ALTER_OBJECT_WORDS;
    case "keyword":
      return ANY_WORDS;
    case "any":
    default:
      return ANY_WORDS;
  }
}
function keywordCompletions(context = "any", dialect = "generic") {
  const words = [...contextWords(context)];
  const group = dialectWordGroup(dialect);
  if (group !== void 0) {
    const pinned = context === "keyword" || context === "any";
    const clause = context === "relation" || context === "column";
    if (pinned || clause && group.contexts.includes(context)) {
      words.push(...group.words);
    }
  }
  return uniqueWords(words).map((name2) => ({ name: name2, kind: "keyword" }));
}
var COMMON_FUNCTIONS = [
  "COUNT",
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "COALESCE",
  "CAST",
  "ROUND",
  "ABS",
  "CONCAT",
  "SUBSTR",
  "LENGTH",
  "UPPER",
  "LOWER",
  "TRIM",
  "REPLACE",
  "NOW",
  "ROW_NUMBER",
  "RANK",
  "DENSE_RANK"
];
var MYSQL_FUNCTIONS = [
  "IFNULL",
  "DATE_FORMAT",
  "GROUP_CONCAT",
  "CURDATE",
  "JSON_EXTRACT",
  "JSON_UNQUOTE",
  "IF",
  "DATE_ADD",
  "DATE_SUB",
  "DATEDIFF",
  "TIMESTAMPDIFF",
  "JSON_ARRAY",
  "JSON_OBJECT",
  "JSON_ARRAYAGG",
  "SUBSTRING_INDEX",
  "LOCATE",
  "RAND",
  "UUID",
  "LAST_INSERT_ID"
];
var ORACLE_FUNCTIONS = [
  "NVL",
  "NVL2",
  "TO_DATE",
  "TO_CHAR",
  "TO_NUMBER",
  "SYSDATE",
  "DECODE",
  "TRUNC",
  "INSTR",
  "LISTAGG",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "REGEXP_LIKE",
  "ADD_MONTHS",
  "MONTHS_BETWEEN",
  "LAST_DAY",
  "NEXT_DAY",
  "GREATEST",
  "LEAST",
  "RATIO_TO_REPORT"
];
var POSTGRES_FUNCTIONS = [
  "TO_CHAR",
  "TO_DATE",
  "TO_TIMESTAMP",
  "DATE_TRUNC",
  "STRING_AGG",
  "ARRAY_AGG",
  "GENERATE_SERIES",
  "EXTRACT",
  "MAKE_INTERVAL",
  "JSON_BUILD_OBJECT",
  "CONCAT_WS",
  "SPLIT_PART",
  "DATE_PART",
  "AGE",
  "ARRAY_LENGTH",
  "STRING_TO_ARRAY",
  "TO_JSON",
  "TO_JSONB",
  "JSONB_BUILD_OBJECT",
  "GEN_RANDOM_UUID",
  "LEFT",
  "RIGHT"
];
function dialectFunctions(dialect) {
  switch (dialect) {
    case "mysql":
      return [...COMMON_FUNCTIONS, ...MYSQL_FUNCTIONS];
    case "oracle":
    case "oceanbase-oracle":
    case "dameng":
      return [...COMMON_FUNCTIONS, ...ORACLE_FUNCTIONS];
    case "postgres":
      return [...COMMON_FUNCTIONS, ...POSTGRES_FUNCTIONS];
    default:
      return COMMON_FUNCTIONS;
  }
}
function functionCompletions(dialect = "generic") {
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const name2 of dialectFunctions(dialect)) {
    const upper = name2.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);
    items.push({ name: upper, kind: "function", insert: `${upper}(` });
  }
  return items;
}

// src/client/completion/edit.ts
var WORD = /[\p{L}\p{N}_$]/u;
var PLAIN = /^[A-Za-z_][A-Za-z0-9_]*$/u;
function quotedIdentifier(name2, dialect) {
  return PLAIN.test(name2) ? name2 : quoteIdent(dialect, name2);
}
function isWord(text2) {
  return text2 !== void 0 && WORD.test(text2);
}
function wordAtCaret(statement, caret) {
  const at = Math.max(0, Math.min(caret, statement.length));
  let start = at;
  while (start > 0 && isWord(statement[start - 1])) start -= 1;
  let end = at;
  while (end < statement.length && isWord(statement[end])) end += 1;
  const opened = start > 0 ? statement[start - 1] : "";
  const begins = start < 2 || !isWord(statement[start - 2]);
  const quote = (opened === "`" || opened === '"') && begins ? opened : "";
  return { start, end, prefix: statement.slice(start, at), quote };
}
var QUALIFIER = /[\p{L}\p{N}_$`"[\]]/u;
function nameBefore(statement, dot) {
  let start = dot;
  while (start > 0 && QUALIFIER.test(statement[start - 1] ?? "")) start -= 1;
  if (start === dot) return null;
  const name2 = statement.slice(start, dot).replace(/^[`"[]/u, "").replace(/[`"\]]$/u, "");
  return name2 === "" ? null : { name: name2, start };
}
function qualifierBefore(statement, start) {
  const names = [];
  let dot = start - 1;
  if (dot < 0 || statement[dot] !== ".") return names;
  for (let round = 0; round < 2; round += 1) {
    const found = nameBefore(statement, dot);
    if (found === null) break;
    names.unshift(found.name);
    if (found.start - 1 < 0 || statement[found.start - 1] !== ".") break;
    dot = found.start - 1;
  }
  return names;
}
function applyCompletion(statement, caret, name2, dialect, kind) {
  const word = wordAtCaret(statement, caret);
  const start = word.quote === "" ? word.start : word.start - 1;
  const tail = word.quote === "" ? word.end : statement[word.end] === word.quote ? word.end + 1 : word.end;
  const call = name2.endsWith("(") && PLAIN.test(name2.slice(0, -1));
  const literal = kind === "snippet";
  const quoted = word.quote !== "";
  const insertion = literal || call || name2 === "*" ? name2 : quoted || !PLAIN.test(name2) ? quoteIdent(dialect, name2) : name2;
  return {
    statement: `${statement.slice(0, start)}${insertion}${statement.slice(tail)}`,
    caret: start + insertion.length
  };
}

// src/client/complete.ts
var ALL_KEYWORDS = keywordCompletions("any", "mysql");
var SQL_KEYWORDS2 = ALL_KEYWORDS.map((item) => item.name);

// src/client/completion/tokenizer.ts
var WORD_CHAR = /[\p{L}\p{N}_$]/u;
var DIGIT = /[0-9]/u;
function isWordChar(char) {
  return char !== void 0 && WORD_CHAR.test(char);
}
function makeToken(kind, text2, start, end, quoted) {
  const token = { kind, text: text2, lower: text2.toLowerCase(), start, end };
  if (quoted === true) token.quoted = true;
  return token;
}
function tokenize2(text2) {
  const tokens = [];
  const length = text2.length;
  let index = 0;
  while (index < length) {
    const char = text2[index];
    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }
    if (char === "-" && text2[index + 1] === "-") {
      index += 2;
      while (index < length && text2[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && text2[index + 1] === "*") {
      index += 2;
      while (index < length && !(text2[index] === "*" && text2[index + 1] === "/")) index += 1;
      index = Math.min(length, index + 2);
      continue;
    }
    if (char === "'") {
      const start = index;
      index += 1;
      while (index < length) {
        const current = text2[index];
        index += 1;
        if (current !== "'") continue;
        if (text2[index] === "'") {
          index += 1;
          continue;
        }
        break;
      }
      tokens.push(makeToken("string", text2.slice(start, index), start, index));
      continue;
    }
    if (char === '"' || char === "`" || char === "[") {
      const close = char === "[" ? "]" : char;
      const start = index;
      index += 1;
      let inner = "";
      while (index < length) {
        const current = text2[index];
        if (current !== close) {
          inner += current;
          index += 1;
          continue;
        }
        index += 1;
        if (text2[index] === close) {
          inner += close;
          index += 1;
          continue;
        }
        break;
      }
      tokens.push(makeToken("ident", inner, start, index, true));
      continue;
    }
    if (DIGIT.test(char)) {
      const start = index;
      while (index < length && DIGIT.test(text2[index])) index += 1;
      if (text2[index] === "." && isDigit(text2[index + 1])) {
        index += 1;
        while (index < length && isDigit(text2[index])) index += 1;
      }
      tokens.push(makeToken("number", text2.slice(start, index), start, index));
      continue;
    }
    if (char === "?") {
      tokens.push(makeToken("param", "?", index, index + 1));
      index += 1;
      continue;
    }
    if (char === ":" && text2[index + 1] !== ":" && text2[index - 1] !== ":" && isWordChar(text2[index + 1])) {
      const start = index;
      index += 1;
      while (index < length && isWordChar(text2[index])) index += 1;
      tokens.push(makeToken("param", text2.slice(start, index), start, index));
      continue;
    }
    if (char === "@") {
      const afterAt = text2[index + 1] === "@" ? text2[index + 2] : text2[index + 1];
      if (isWordChar(afterAt)) {
        const start = index;
        index += 1;
        if (text2[index] === "@") index += 1;
        while (index < length && isWordChar(text2[index])) index += 1;
        tokens.push(makeToken("param", text2.slice(start, index), start, index));
        continue;
      }
    }
    if (WORD_CHAR.test(char)) {
      const start = index;
      while (index < length && isWordChar(text2[index])) index += 1;
      const word = text2.slice(start, index);
      tokens.push(makeToken(isKeyword(word) ? "keyword" : "ident", word, start, index));
      continue;
    }
    tokens.push(makeToken("punct", char, index, index + 1));
    index += 1;
  }
  return tokens;
}
function isDigit(char) {
  return char !== void 0 && DIGIT.test(char);
}
function maskedRanges(text2) {
  const spans = [];
  const length = text2.length;
  let index = 0;
  while (index < length) {
    const char = text2[index];
    if (char === "-" && text2[index + 1] === "-") {
      const start = index;
      index += 2;
      while (index < length && text2[index] !== "\n") index += 1;
      spans.push({ start, end: index });
      continue;
    }
    if (char === "/" && text2[index + 1] === "*") {
      const start = index;
      index += 2;
      while (index < length && !(text2[index] === "*" && text2[index + 1] === "/")) index += 1;
      index = Math.min(length, index + 2);
      spans.push({ start, end: index });
      continue;
    }
    if (char === "'") {
      const start = index;
      index += 1;
      while (index < length) {
        const current = text2[index];
        index += 1;
        if (current !== "'") continue;
        if (text2[index] === "'") {
          index += 1;
          continue;
        }
        break;
      }
      spans.push({ start, end: index });
      continue;
    }
    index += 1;
  }
  return spans;
}
function maskCommentsAndStrings(text2) {
  const chars = text2.split("");
  for (const span of maskedRanges(text2)) {
    for (let cursor = span.start; cursor < Math.min(span.end, chars.length); cursor += 1) {
      if (chars[cursor] !== "\n") chars[cursor] = " ";
    }
  }
  return chars.join("");
}
function isInsideCommentOrString(text2, index) {
  const at = Math.max(0, Math.min(index, text2.length));
  for (const span of maskedRanges(text2)) {
    if (at <= span.start) continue;
    if (at < span.end) return true;
    if (at === span.end && span.end === text2.length) return true;
  }
  return false;
}

// src/client/completion/context.ts
var RELATION_STARTERS = /* @__PURE__ */ new Set(["from", "join", "into", "update", "table"]);
var MORE_RELATIONS = /* @__PURE__ */ new Set(["join", "left", "right", "inner", "full", "cross", "natural"]);
function starSource(body) {
  let depth = 0;
  let fromIndex = -1;
  for (let index = 0; index < body.length; index += 1) {
    const token = body[index];
    if (token.kind === "punct") {
      if (token.text === "(") depth += 1;
      else if (token.text === ")") depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && token.kind === "keyword" && token.lower === "from") {
      fromIndex = index;
      break;
    }
  }
  if (fromIndex < 0) return void 0;
  const parsed = parseRelationRef(body, fromIndex + 1);
  if (parsed === null || parsed.relation.table === "") return void 0;
  const rest = body[parsed.next];
  if (rest !== void 0) {
    if (rest.kind === "punct" && (rest.text === "," || rest.text === ")")) return void 0;
    if (rest.kind === "keyword" && MORE_RELATIONS.has(rest.lower)) return void 0;
  }
  return {
    ...parsed.relation.schema === void 0 ? {} : { schema: parsed.relation.schema },
    table: parsed.relation.table
  };
}
var EXPECTED_AFTER = /* @__PURE__ */ new Map([
  // relation position
  ["from", "relation"],
  ["join", "relation"],
  ["into", "relation"],
  ["update", "relation"],
  ["table", "relation"],
  // column position
  ["select", "column"],
  ["where", "column"],
  ["on", "column"],
  ["having", "column"],
  ["set", "column"],
  ["by", "column"],
  ["using", "column"],
  ["returning", "column"],
  ["values", "column"],
  ["group", "column"],
  ["order", "column"],
  ["and", "column"],
  ["or", "column"],
  ["not", "column"],
  ["null", "column"],
  ["true", "column"],
  ["false", "column"],
  ["between", "column"],
  ["like", "column"],
  ["in", "column"],
  ["is", "column"],
  ["case", "column"],
  ["when", "column"],
  ["then", "column"],
  ["else", "column"],
  ["end", "column"],
  ["distinct", "column"],
  ["exists", "column"],
  ["asc", "column"],
  ["desc", "column"],
  ["escape", "column"],
  ["collate", "column"],
  ["interval", "column"],
  ["over", "column"],
  ["partition", "column"],
  ["filter", "column"],
  // alias position
  ["as", "name"],
  // schema object position
  ["use", "schema"],
  ["create", "schema"],
  ["drop", "schema"],
  ["alter", "schema"]
]);
function statementBounds(masked, at, length) {
  let start = 0;
  for (let index = 0; index < at; index += 1) {
    if (masked[index] === ";") start = index + 1;
  }
  let end = length;
  for (let index = at; index < masked.length; index += 1) {
    if (masked[index] === ";") {
      end = index;
      break;
    }
  }
  return { start, end };
}
function previousKeyword(tokens, index) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const token = tokens[cursor];
    if (token.kind === "keyword") return token.lower;
  }
  return null;
}
function referencesTail(tokens) {
  const last = tokens[tokens.length - 1];
  return last?.kind === "keyword" && last.lower === "references";
}
function insideCreateTableParen(tokens) {
  let table = -1;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "keyword") continue;
    if (token.lower === "create" || token.lower === "alter") {
      table = -1;
      continue;
    }
    if (token.lower === "as" || token.lower === "like") return false;
    if (token.lower === "table") table = index;
    if (token.lower === "select" && table >= 0) return false;
  }
  if (table < 0) return false;
  let depth = 0;
  let opened = false;
  for (let index = table + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") {
      depth += 1;
      opened = true;
    } else if (token.text === ")") {
      depth -= 1;
    }
  }
  return opened && depth > 0;
}
function startsSubquery(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "punct" || last.text !== "(") return false;
  if (tokens.some((token) => token.text.toLowerCase() === "window")) return false;
  const before = previousKeyword(tokens, tokens.length - 1);
  return before === "as" || before === "from" || before === "exists" || before === "in" || before === "any" || before === "all" || before === "some";
}
function insertColumnListComplete(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "insert") return false;
  if (tokens.some((token) => token.kind === "keyword" && token.lower === "values")) return false;
  let depth = 0;
  let close = -1;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")" && depth > 0) {
      depth -= 1;
      if (depth === 0) close = index;
    }
  }
  return close >= 0 && close === tokens.length - 1;
}
function usingTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "punct" || last.text !== ")") return false;
  let depth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") depth += 1;
    else if (token.text === "(") {
      depth -= 1;
      if (depth === 0) {
        const owner = tokens[index - 1];
        return owner?.text.toLowerCase() === "using";
      }
    }
  }
  return false;
}
function createIndexOn(tokens) {
  let create = false;
  let index = -1;
  for (let cursor = 0; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (token.kind !== "keyword") continue;
    if (token.lower === "create") {
      create = true;
      continue;
    }
    if (create && token.lower === "index") {
      index = cursor;
      continue;
    }
    if (index >= 0 && token.lower === "on") return cursor;
  }
  return -1;
}
function indexUsingTail(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "create") return false;
  if (!tokens.some((token) => token.text.toLowerCase() === "index")) return false;
  const last = tokens[tokens.length - 1];
  return last !== void 0 && last.text.toLowerCase() === "using";
}
function usingParenOpen(tokens) {
  let depth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") depth += 1;
    else if (token.text === "(") {
      if (depth === 0) {
        const owner = tokens[index - 1];
        return owner?.text.toLowerCase() === "using";
      }
      depth -= 1;
    }
  }
  return false;
}
var WINDOW_PARTS = /* @__PURE__ */ new Set(["partition", "order", "rows", "range", "groups"]);
function windowSpecOpen(tokens) {
  let depth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") {
      depth += 1;
      continue;
    }
    if (token.text !== "(") continue;
    if (depth > 0) {
      depth -= 1;
      continue;
    }
    const owner = tokens[index - 1];
    if (owner === void 0) return -1;
    if (owner.text.toLowerCase() === "over") return index;
    const namedWindow = tokens.slice(0, index - 1).some((candidate) => candidate.text.toLowerCase() === "window");
    return owner.text.toLowerCase() === "as" && namedWindow ? index : -1;
  }
  return -1;
}
function windowExpectation(tokens) {
  const open = windowSpecOpen(tokens);
  if (open < 0) return void 0;
  const inside = [];
  let depth = 0;
  for (let index = open + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "punct") {
      if (token.text === "(") depth += 1;
      else if (token.text === ")") {
        if (depth === 0) break;
        depth -= 1;
      }
    }
    if (depth === 0) inside.push(token);
  }
  let partAt = -1;
  depth = 0;
  for (let index = 0; index < inside.length; index += 1) {
    const token = inside[index];
    if (token.kind === "punct") {
      if (token.text === "(") depth += 1;
      else if (token.text === ")" && depth > 0) depth -= 1;
      continue;
    }
    if (depth === 0 && WINDOW_PARTS.has(token.text.toLowerCase())) partAt = index;
  }
  if (partAt < 0) return "over";
  const part = inside[partAt].lower;
  const tail = inside.slice(partAt + 1);
  const last = tail[tail.length - 1];
  const lower = last?.text.toLowerCase();
  if (part === "partition") {
    return lower === "partition" ? "over" : "column";
  }
  if (part === "order") {
    if (lower === "order") return "over";
    if (last?.kind === "keyword" && (last.lower === "asc" || last.lower === "desc")) return "over";
    return endsOperand(last) ? "direction" : "column";
  }
  if (lower === "rows" || lower === "range" || lower === "groups") return "frame";
  if (lower === "preceding" || lower === "following" || lower === "row") return "number";
  return "frame";
}
function namedWindowTail(tokens) {
  const last = tokens[tokens.length - 1];
  const before = tokens[tokens.length - 2];
  if (last === void 0) return false;
  if (last.kind === "ident" && before !== void 0 && before.text.toLowerCase() === "over") {
    return true;
  }
  if (last.kind === "punct" && last.text === ")") {
    let depth = 0;
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if (token.kind !== "punct") continue;
      if (token.text === ")") {
        depth += 1;
        continue;
      }
      if (token.text !== "(") continue;
      depth -= 1;
      if (depth > 0) continue;
      const owner = tokens[index - 1];
      if (owner === void 0 || owner.text.toLowerCase() !== "as") return false;
      return tokens.slice(0, index - 1).some((candidate) => candidate.text.toLowerCase() === "window");
    }
  }
  return false;
}
function privilegePosition(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.kind !== "keyword") return false;
  const head = first.text.toLowerCase();
  if (head !== "grant" && head !== "revoke") return false;
  if (tokens.some((token) => token.kind === "keyword" && token.lower === "on")) return false;
  if (tokens.some((token) => token.text.toLowerCase() === "to")) return false;
  if (tokens.length === 1) return true;
  const last = tokens[tokens.length - 1];
  return last.kind === "punct" && last.text === "," || last.kind === "keyword";
}
function granteeTail(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.kind !== "keyword") return false;
  const head = first.text.toLowerCase();
  if (head !== "grant" && head !== "revoke") return false;
  return tokens.some(
    (token, index) => token.kind === "keyword" && (token.lower === "to" || token.lower === "from") && tokens[index + 1] !== void 0 && tokens[index + 1]?.kind !== "keyword"
  );
}
function collationValue(tokens) {
  const last = tokens[tokens.length - 1];
  return last?.kind === "keyword" && last.lower === "collate";
}
function escapeTail(tokens) {
  const last = tokens[tokens.length - 1];
  return last?.kind === "keyword" && last.lower === "escape";
}
function grantWith(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.kind !== "keyword") return void 0;
  const head = first.text.toLowerCase();
  if (head !== "grant" && head !== "revoke") return void 0;
  let index = tokens.length - 1;
  while (index >= 0 && tokens[index]?.text.toLowerCase() !== "with") index -= 1;
  if (index < 0) return void 0;
  const rest = tokens.slice(index + 1).map((token) => token.text.toLowerCase()).filter((text2) => text2 !== "");
  if (rest.length === 0) return "grantOption";
  const lastWord = rest[rest.length - 1];
  if (rest.length === 1 && (lastWord === "grant" || lastWord === "admin")) {
    return "grantOptionWord";
  }
  return void 0;
}
function dropDatabase(tokens) {
  const first = tokens[0];
  const second = tokens[1];
  if (first?.text.toLowerCase() !== "drop") return false;
  const object = second?.text.toLowerCase();
  return object === "database" || object === "schema";
}
function useDatabase(tokens) {
  const first = tokens[0];
  return tokens.length === 1 && first?.text.toLowerCase() === "use";
}
function lockStart(tokens) {
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "keyword" || last.lower !== "for") return false;
  let depth = 0;
  for (const token of tokens) {
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") depth -= 1;
  }
  return depth === 0;
}
var LENGTH_TYPES = /* @__PURE__ */ new Set([
  "char",
  "varchar",
  "binary",
  "varbinary",
  "decimal",
  "numeric",
  "bit",
  "time",
  "datetime",
  "timestamp",
  "year"
]);
function typePrecisionTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== ",") return false;
  let depth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") {
      depth += 1;
      continue;
    }
    if (token.text !== "(") continue;
    if (depth > 0) {
      depth -= 1;
      continue;
    }
    const owner = tokens[index - 1];
    return owner !== void 0 && LENGTH_TYPES.has(owner.text.toLowerCase());
  }
  return false;
}
function columnLength(tokens) {
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== "(") return false;
  const owner = tokens[tokens.length - 2];
  if (owner === void 0) return false;
  if (!LENGTH_TYPES.has(owner.text.toLowerCase())) return false;
  return tokens.some(
    (token) => ["create", "alter", "cast", "convert"].includes(token.text.toLowerCase())
  );
}
function forLengthTail(tokens) {
  const last = tokens[tokens.length - 1];
  return last?.kind === "keyword" && last.lower === "for";
}
function grantTarget(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "keyword" || last.lower !== "on") return false;
  const first = tokens[0];
  if (first === void 0) return false;
  const start = first.text.toLowerCase();
  return start === "grant" || start === "revoke";
}
function describesTable(tokens) {
  if (tokens.length !== 1) return false;
  const only = tokens[0];
  const lower = only.text.toLowerCase();
  return lower === "describe" || lower === "desc";
}
function describeTableTail(tokens) {
  const first = tokens[0];
  if (first === void 0) return false;
  const start = first.text.toLowerCase();
  return (start === "describe" || start === "desc") && tokens.length >= 2;
}
function tableNameTail(tokens) {
  const first = tokens[0];
  if (first === void 0) return false;
  const start = first.text.toLowerCase();
  let index = 1;
  if (start === "drop" && tokens[1]?.text.toLowerCase() === "temporary") index = 2;
  const object = tokens[index]?.text.toLowerCase();
  if (start !== "drop" && start !== "truncate" || object !== "table" && object !== "view") {
    return false;
  }
  return tokens.length >= index + 2;
}
function renameTableTail(tokens) {
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  if (first === void 0 || last === void 0) return false;
  if (first.text.toLowerCase() !== "rename" || tokens[1]?.text.toLowerCase() !== "table") return false;
  return last.kind === "keyword" && last.lower === "to";
}
function relationKeywordTail(tokens) {
  const first = tokens[0];
  if (first === void 0) return false;
  const start = first.text.toLowerCase();
  if (start === "truncate") return tokens.length === 1;
  const second = tokens[1];
  if (start !== "drop" || second === void 0) return false;
  return second.text.toLowerCase() === "view";
}
function ddlTableName(tokens) {
  const first = tokens[0];
  const second = tokens[1];
  if (first === void 0 || second === void 0) return false;
  const start = first.text.toLowerCase();
  const object = second.text.toLowerCase();
  const last = tokens[tokens.length - 1];
  const commaTail = last?.kind === "punct" && last.text === ",";
  const bare = tokens.length === 2 || commaTail;
  if (start === "truncate" || start === "rename" || start === "reindex") {
    return object === "table" && bare;
  }
  if (start === "analyze" || start === "optimize" || start === "check" || start === "repair" || start === "checksum") {
    return object === "table" && bare;
  }
  if (start === "drop") {
    const temporary = object === "temporary";
    const target = temporary ? tokens[2]?.text.toLowerCase() : object;
    return (target === "table" || target === "view") && (tokens.length === (temporary ? 3 : 2) || commaTail);
  }
  if (start === "alter" || start === "lock") {
    return (object === "table" || object === "tables") && tokens.length === 2;
  }
  return false;
}
function materializedViewTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "create" || words[1] !== "materialized" || words[2] !== "view") {
    return void 0;
  }
  const rest = tokens.slice(3);
  if (rest.length === 0) return "name";
  if (rest.length === 3 && rest[0]?.text.toLowerCase() === "if" && rest[1]?.text.toLowerCase() === "not" && rest[2]?.text.toLowerCase() === "exists") {
    return "name";
  }
  if (words.indexOf("as", 3) >= 0) return void 0;
  return "viewTail";
}
function materializedViewDone(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] === "refresh" && words[1] === "materialized" && words[2] === "view") {
    return words.length > 3;
  }
  if (words[0] === "drop" && words[1] === "materialized" && words[2] === "view") {
    const rest = words.slice(3);
    if (rest.length === 0) return false;
    if (rest.length === 2 && rest[0] === "if" && rest[1] === "exists") return false;
    return true;
  }
  return false;
}
function materializedViewOpen(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] === "refresh" && words[1] === "materialized" && words[2] === "view") {
    return words.length === 3;
  }
  if (words[0] === "drop" && words[1] === "materialized" && words[2] === "view") {
    return words.length === 3 || words.length === 5 && words[3] === "if" && words[4] === "exists";
  }
  return false;
}
function commentOn(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "comment" || words[1] !== "on") return void 0;
  if (words[words.length - 1] === "is") return "number";
  if (words.length === 3) return "tableName";
  return "number";
}
function sampleTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.includes("tablesample")) return void 0;
  return words[words.length - 1] === "tablesample" ? "sampleMethod" : "number";
}
function conflictTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.includes("on") || !words.includes("conflict") || !words.includes("do")) {
    return void 0;
  }
  return words[words.length - 1] === "do" ? "conflictAction" : void 0;
}
function pivotParen(tokens) {
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== "(") return false;
  return tokens[tokens.length - 2]?.text.toLowerCase() === "pivot";
}
function limitAll(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[words.length - 1] !== "all") return false;
  return words.includes("limit") || words.includes("offset");
}
function checksumDone(tokens) {
  return tokens[0]?.text.toLowerCase() === "checksum" && tokens[1]?.text.toLowerCase() === "table" && tokens.length >= 3;
}
function literalTail(tokens) {
  const first = tokens[0];
  if (first === void 0) return false;
  const start = first.text.toLowerCase();
  const last = tokens[tokens.length - 1];
  if (last === void 0) return false;
  const tail = last.text.toLowerCase();
  if (start === "select" && (tail === "outfile" || tail === "dumpfile")) return true;
  if (start === "prepare" && last.kind === "keyword" && last.lower === "from" && !tokens.some(
    (token) => token.kind === "keyword" && ["select", "insert", "update", "delete"].includes(token.lower ?? "")
  )) {
    return true;
  }
  if (start === "execute" || start === "deallocate") return true;
  if (start === "unlock" && tokens[1]?.text.toLowerCase() === "tables") return true;
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.includes("outfile") && !words.includes("dumpfile")) return false;
  return [
    "by",
    "terminated",
    "enclosed",
    "escaped",
    "starting",
    "lines",
    "fields",
    "columns",
    "optionally"
  ].includes(tail);
}
function lockTableTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "lock") return void 0;
  const object = tokens[1]?.text.toLowerCase();
  if (object !== "table" && object !== "tables") return void 0;
  if (tokens.length <= 2) return "tableName";
  const last = tokens[tokens.length - 1];
  if (last?.kind === "punct" && last.text === ",") return "tableName";
  const words = tokens.slice(2).map((token) => token.text.toLowerCase());
  if (object === "table") {
    const lastWord = words[words.length - 1];
    if (lastWord === "in") return "lockMode";
    if (lastWord === "access" || lastWord === "row") return "lockModePair";
    if (lastWord === "share" || lastWord === "exclusive" || lastWord === "update") {
      return "lockModeEnd";
    }
    if (words.includes("in")) return "number";
    return "lockModeStart";
  }
  const hasAccess = words.some((word) => word === "read" || word === "write" || word === "as");
  return hasAccess ? "number" : "lockTable";
}
function callStart(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "call") return void 0;
  return tokens.length === 1 ? "name" : "number";
}
function dropIndexOn(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "keyword" || last.lower !== "on") return false;
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "drop") return false;
  return tokens.some((token) => token.text.toLowerCase() === "index");
}
function alterIndexColumns(tokens) {
  const start = alterTableStart(tokens);
  if (start < 0) return false;
  const action = tokens[start];
  if (action === void 0 || action.lower !== "add") return false;
  const markers = /* @__PURE__ */ new Set(["index", "key", "primary", "unique", "constraint", "foreign", "check"]);
  let marked = false;
  let index = start + 1;
  while (index < tokens.length) {
    const token = tokens[index];
    const lower = token.text.toLowerCase();
    if (markers.has(lower)) marked = true;
    if (token.kind === "punct" && token.text === "(") break;
    index += 1;
  }
  if (index >= tokens.length || !marked) return false;
  let depth = 0;
  for (let cursor = index; cursor < tokens.length; cursor += 1) {
    const token = tokens[cursor];
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") depth -= 1;
  }
  return depth > 0;
}
function limitCount(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return false;
  if (last.kind === "keyword" && (last.lower === "limit" || last.lower === "offset")) return true;
  if (last.kind !== "punct" || last.text !== ",") return false;
  let cursor = tokens.length - 2;
  let numbers = 0;
  while (cursor >= 0) {
    const token = tokens[cursor];
    if (token.kind === "number") {
      numbers += 1;
      cursor -= 1;
      continue;
    }
    if (token.kind === "punct" && token.text === ",") {
      cursor -= 1;
      continue;
    }
    break;
  }
  const keyword = tokens[cursor];
  return numbers > 0 && keyword !== void 0 && keyword.kind === "keyword" && keyword.lower === "limit";
}
function limitTail(tokens) {
  let cursor = tokens.length - 1;
  while (cursor >= 0) {
    const token = tokens[cursor];
    if (token.kind === "number" || token.kind === "punct" && token.text === ",") {
      cursor -= 1;
      continue;
    }
    return token.kind === "keyword" && (token.lower === "limit" || token.lower === "offset");
  }
  return false;
}
function createTableEngine(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "create") return false;
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  if (last === void 0) return false;
  if (last.text.toLowerCase() === "engine") return true;
  return last.kind === "punct" && last.text === "=" && previous !== void 0 && previous.text.toLowerCase() === "engine";
}
function alterTableEngine(tokens) {
  const start = alterTableStart(tokens);
  if (start < 0) return void 0;
  const engineAt = tokens.findIndex(
    (token, index) => index >= start && token.text.toLowerCase() === "engine"
  );
  if (engineAt < 0) return void 0;
  const equals = tokens[engineAt + 1];
  if (equals === void 0 || equals.kind !== "punct" || equals.text !== "=") {
    return tokens.length === engineAt + 1 ? "number" : void 0;
  }
  if (tokens.length === engineAt + 2) return "engine";
  return "tableOptions";
}
function setStatement(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.kind !== "keyword" || first.lower !== "set") return void 0;
  const last = tokens[tokens.length - 1];
  if (last === void 0 || first === last && tokens.length === 1) return "set";
  if (last.kind === "punct" && last.text === "=") {
    const variable = tokens[tokens.length - 2]?.text.toLowerCase();
    if (variable === "search_path" || variable === "schema") return "database";
    return "value";
  }
  const lower = last.text.toLowerCase();
  if (lower === "names" || lower === "charset") return "charset";
  if (tokens.length === 2 && last.kind === "ident") {
    const known = /* @__PURE__ */ new Set(["session", "global", "local", "transaction", "character", "password", "role"]);
    if (known.has(lower)) return "set";
  }
  return "number";
}
function castAs(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "keyword" || last.lower !== "as") return false;
  let opened = false;
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind === "keyword") return false;
    if (token.kind === "punct" && token.text === "(") opened = true;
    if (token.kind === "ident" && token.text.toLowerCase() === "cast") return opened;
  }
  return false;
}
var INTERVAL_UNITS2 = /* @__PURE__ */ new Set([
  "microsecond",
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year"
]);
function intervalTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  if (last.kind === "keyword" && last.lower === "interval") return "interval";
  const previous = tokens[tokens.length - 2];
  if (previous !== void 0 && previous.text.toLowerCase() === "interval" && (last.kind === "number" || last.kind === "string")) {
    return "interval";
  }
  if (INTERVAL_UNITS2.has(last.text.toLowerCase()) && tokens.some((token) => token.text.toLowerCase() === "interval")) {
    return "number";
  }
  return void 0;
}
function duplicateKeyUpdate(tokens) {
  if (tokens.length < 4) return false;
  const tail = tokens.slice(tokens.length - 4).map((token) => token.text.toLowerCase());
  return tail[0] === "on" && tail[1] === "duplicate" && tail[2] === "key" && tail[3] === "update";
}
function duplicateKeyValue(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "insert") return false;
  const words = tokens.map((token) => token.text.toLowerCase());
  const at = words.findIndex(
    (word, index) => word === "on" && words[index + 1] === "duplicate" && words[index + 2] === "key" && words[index + 3] === "update"
  );
  if (at < 0) return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "punct" && last.text === "=";
}
function valuesListComplete(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "insert") return false;
  const valuesAt = tokens.findIndex((token) => token.kind === "keyword" && token.lower === "values");
  if (valuesAt < 0) return false;
  let depth = 0;
  let sawParen = false;
  for (let index = valuesAt + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") {
      depth += 1;
      sawParen = true;
    } else if (token.text === ")" && depth > 0) {
      depth -= 1;
    }
  }
  const last = tokens[tokens.length - 1];
  return sawParen && depth === 0 && last?.kind === "punct" && last.text === ")";
}
function valuesNextTuple(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "insert") return false;
  const valuesAt = tokens.findIndex((token) => token.kind === "keyword" && token.lower === "values");
  if (valuesAt < 0) return false;
  let depth = 0;
  let sawParen = false;
  for (let index = valuesAt + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") {
      depth += 1;
      sawParen = true;
    } else if (token.text === ")" && depth > 0) {
      depth -= 1;
    }
  }
  const last = tokens[tokens.length - 1];
  return sawParen && depth === 0 && last?.kind === "punct" && last.text === ",";
}
function charsetValue(tokens) {
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  if (last === void 0) return false;
  if (last.text.toLowerCase() === "charset") return true;
  if (last.kind === "punct" && last.text === "=") {
    const word = previous?.text.toLowerCase();
    if (word === "charset") return true;
    return word === "set" && tokens[tokens.length - 3]?.text.toLowerCase() === "character";
  }
  return last.kind === "keyword" && last.lower === "set" && previous !== void 0 && previous.text.toLowerCase() === "character";
}
function tableOptionValue(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "create") return void 0;
  if (!tokens.some((token) => token.text.toLowerCase() === "table")) return void 0;
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  if (last === void 0) return void 0;
  const lower = last.text.toLowerCase();
  if (lower === "comment") return "name";
  if (lower === "default") return "value";
  if (last.kind === "punct" && last.text === "=") {
    return previous?.text.toLowerCase() === "comment" ? "name" : void 0;
  }
  return void 0;
}
function tableOptionAssignment(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "create") return void 0;
  if (!tokens.some((token) => token.text.toLowerCase() === "table")) return void 0;
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  if (last?.kind !== "punct" || last.text !== "=" || previous === void 0) return void 0;
  const name2 = previous.text.toLowerCase();
  if (name2 === "auto_increment") return "number";
  return name2 === "row_format" ? "rowFormat" : void 0;
}
function partitionBy(tokens) {
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  const first = tokens[0]?.text.toLowerCase();
  if (first !== "create" && first !== "alter") return false;
  return last?.kind === "keyword" && last.lower === "by" && previous?.text.toLowerCase() === "partition";
}
function afterTableOptionValue(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "create") return false;
  const last = tokens[tokens.length - 1];
  const secondLast = tokens[tokens.length - 2];
  const thirdLast = tokens[tokens.length - 3];
  if (last === void 0 || last.kind !== "ident") return false;
  if (secondLast === void 0) return false;
  if (thirdLast !== void 0 && thirdLast.text.toLowerCase() === "engine" && secondLast.text === "=") {
    return true;
  }
  if (secondLast.text.toLowerCase() === "charset") return true;
  return secondLast.lower === "set" && thirdLast?.text.toLowerCase() === "character";
}
function objectName(tokens) {
  const first = tokens[0];
  const second = tokens[1];
  if (first === void 0 || second === void 0) return false;
  const start = first.text.toLowerCase();
  const next = second.text.toLowerCase();
  if (start === "drop" && next === "index") return true;
  if (start !== "create") return false;
  return next === "database" || next === "schema" || next === "user" || next === "role" || next === "sequence" || next === "trigger" || next === "type" || next === "extension" || next === "domain" || next === "tablespace";
}
function createObjectName(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "create") return false;
  let index = 1;
  if (words[1] === "or" && words[2] === "replace") index = 3;
  else if (words[1] === "temporary") index = 2;
  else if (words[1] === "unlogged") index = 2;
  const object = words[index];
  if (object !== "table" && object !== "view") return false;
  const next = words[index + 1];
  if (next === void 0) return true;
  return next === "if" && words[index + 2] === "not" && words[index + 3] === "exists" && words[index + 4] === void 0;
}
function createTableOptionsTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "create") return false;
  let index = 1;
  if (words[1] === "temporary") index = 2;
  if (words[index] !== "table") return false;
  index += 1;
  if (words[index] === "if" && words[index + 1] === "not" && words[index + 2] === "exists") index += 3;
  const name2 = tokens[index];
  if (name2 === void 0 || name2.kind !== "ident") return false;
  return index === tokens.length - 1;
}
function grantee(tokens) {
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  if (first === void 0 || last === void 0) return false;
  const start = first.text.toLowerCase();
  if (start !== "grant" && start !== "revoke") return false;
  return last.kind === "keyword" && (last.lower === "to" || last.lower === "from");
}
function explainStart(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "explain") return false;
  if (tokens.length === 1) return true;
  const statementKeywords = /* @__PURE__ */ new Set(["select", "insert", "update", "delete", "with", "table"]);
  const optionWords = /* @__PURE__ */ new Set([
    "analyze",
    "verbose",
    "buffers",
    "costs",
    "settings",
    "timing",
    "summary",
    "format",
    "wal",
    "generic_plan"
  ]);
  let index = 1;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token.kind === "keyword" && statementKeywords.has(token.lower ?? "")) return false;
    if (token.kind === "keyword" && optionWords.has(token.lower ?? "")) {
      index += 1;
      continue;
    }
    if (token.kind === "punct" && token.text === "(") {
      let depth = 0;
      while (index < tokens.length) {
        const inner = tokens[index];
        if (inner.kind === "punct" && inner.text === "(") depth += 1;
        else if (inner.kind === "punct" && inner.text === ")") {
          depth -= 1;
          if (depth === 0) break;
        }
        index += 1;
      }
      index += 1;
      continue;
    }
    if (token.kind === "punct" && token.text === "=") {
      index += 1;
      continue;
    }
    if (token.kind === "ident" || token.kind === "number") {
      index += 1;
      continue;
    }
    return false;
  }
  return true;
}
function unionStatement(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return false;
  const lower = last.text.toLowerCase();
  if (lower === "union" || lower === "intersect" || lower === "except") return true;
  const previous = tokens[tokens.length - 2];
  return lower === "all" && previous !== void 0 && (previous.text.toLowerCase() === "union" || previous.text.toLowerCase() === "intersect" || previous.text.toLowerCase() === "except");
}
function createTableAs(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  const tableAt = words[1] === "table" ? 1 : words[1] === "temporary" && words[2] === "table" ? 2 : -1;
  if (tableAt < 0) return false;
  return words[words.length - 1] === "as" && !words.includes("(");
}
function createViewAs(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "create" || words[words.length - 1] !== "as") return false;
  const object = words[1] === "or" ? words[3] : words[1];
  if (object === "materialized") return words[2] === "view";
  return object === "view" || object === "trigger" || object === "event";
}
function createTableLike(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  const tableAt = words[1] === "table" ? 1 : words[1] === "temporary" && words[2] === "table" ? 2 : -1;
  return tableAt >= 0 && words[words.length - 1] === "like";
}
function afterCteDefinition(tokens) {
  const first = tokens[0];
  const last = tokens[tokens.length - 1];
  return first !== void 0 && first.text.toLowerCase() === "with" && last !== void 0 && last.kind === "punct" && last.text === ")";
}
function showTail(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "show") return void 0;
  const words = tokens.map((token) => token.text.toLowerCase());
  const second = words[1];
  const kind = second === "full" ? words[2] : second;
  if (second === "create") {
    const object = words[2];
    if (object === "database" || object === "schema") return "database";
    if (object === "procedure" || object === "function" || object === "event" || object === "trigger") {
      return "name";
    }
    if (object === "table" || object === "view") return words.length > 3 ? "name" : "tableName";
    return void 0;
  }
  const from = words.indexOf("from");
  const inDatabase = words.indexOf("in");
  if (second === "tables") {
    if (from < 0 && inDatabase < 0) return "number";
    if (from === words.length - 1 || inDatabase === words.length - 1) return "database";
    return "number";
  }
  if (second === "full" && words[2] === "tables") {
    if (from < 0 && inDatabase < 0) return "number";
    if (from === words.length - 1 || inDatabase === words.length - 1) return "database";
    return "number";
  }
  if (second === "table" && words[2] === "status") {
    if (from < 0) return "number";
    return from === words.length - 1 ? "database" : "number";
  }
  if (kind === "columns" || kind === "fields" || kind === "index" || kind === "indexes" || kind === "keys") {
    if (from < 0) return void 0;
    return from === words.length - 1 ? "tableName" : "name";
  }
  if (second === "grants") return "name";
  if (words[words.length - 1] === "like") return "name";
  if ((second === "status" || second === "variables") && words[words.length - 1] === "where") {
    return "comparison";
  }
  if (second === "engines" || second === "warnings" || second === "errors" || second === "processlist") {
    return "number";
  }
  return void 0;
}
function setTransactionTail(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "set") return void 0;
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[1] !== "transaction") return void 0;
  if (tokens.length === 2) return "setTransaction";
  const tail = words[words.length - 1];
  if (tail === "read") return words.includes("isolation") ? "isolationRead" : "transactionRead";
  if (tail === "isolation") return "isolationLevel";
  if (tail === "level") return "isolation";
  return "number";
}
function isolationStart(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  return words[0] === "set" && words[1] === "transaction" && words[2] === "isolation" && words[3] === "level" && words.length === 4;
}
function deleteUsing(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "delete") return void 0;
  const at = words.indexOf("using");
  if (at < 0) return void 0;
  const after = tokens.slice(at + 1);
  if (after.length === 0) return "tableName";
  const last = tokens[tokens.length - 1];
  if (last?.kind === "punct" && last.text === ",") return "tableName";
  const continues = words.some(
    (word) => word === "join" || word === "where" || word === "order" || word === "limit"
  );
  if (continues) return void 0;
  return "number";
}
function nullsTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  const tail = last.text.toLowerCase();
  if (tail === "nulls") return "nulls";
  const hasOrder = tokens.some((token) => token.text.toLowerCase() === "order");
  if (hasOrder && (tail === "first" || tail === "last")) return "number";
  return void 0;
}
function showStart(tokens) {
  return tokens.length <= 2 && tokens[0]?.text.toLowerCase() === "show";
}
function showPatternTail(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "show") return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "string" && tokens.some((token) => token.kind === "keyword" && token.lower === "like");
}
function fromListTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.includes("from") && !words.includes("join")) return false;
  if (words.includes("for") || words.includes("lock")) return false;
  if (words.some(
    (word) => word === "where" || word === "group" || word === "order" || word === "limit" || word === "having" || word === "union" || word === "set"
  )) {
    return false;
  }
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "ident") return false;
  const before = tokens[tokens.length - 2];
  if (before === void 0) return false;
  if (before.kind === "ident") return true;
  if (before.kind === "keyword" && before.lower === "as") return true;
  return before.kind === "punct" && before.text === ")";
}
function routineKeywordTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] === "return" && tokens.length === 2) {
    if (words[1] === "query") return "statement";
    if (words[1] === "next") return "column";
    return void 0;
  }
  if (words[0] === "declare" && words[words.length - 1] === "for" && words.includes("cursor")) {
    return "statement";
  }
  if (words[0] === "prepare" && words[words.length - 1] === "as") return "statement";
  return void 0;
}
function cursorTail(tokens) {
  const first = tokens[0];
  if (first === void 0) return void 0;
  const word = first.text.toLowerCase();
  if (word !== "open" && word !== "close") return void 0;
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words.includes("for")) return "statement";
  if (tokens.length === 1) return "name";
  return "number";
}
function raiseTail(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "raise") return void 0;
  const words = tokens.map((token) => token.text.toLowerCase());
  if (tokens.length === 1) return "raise";
  if (words.includes("using")) return "raiseUsing";
  return "number";
}
function truncateTail(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "truncate") return void 0;
  const second = tokens[1];
  if (second === void 0) return "tableName";
  if (second.text.toLowerCase() === "table") return void 0;
  return "number";
}
function inheritsTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "create" || !words.includes("table")) return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "punct" && last.text === "(" && words[words.length - 2] === "inherits";
}
function setSchemaTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "alter") return false;
  return words[words.length - 1] === "schema" && words.includes("set");
}
function alterStorageTail(tokens) {
  const start = alterTableStart(tokens);
  if (start < 0) return false;
  const rest = tokens.slice(start);
  const setIndex = rest.findIndex((token) => token.text.toLowerCase() === "set");
  if (setIndex < 0) return false;
  const openIndex = rest.findIndex(
    (token, index) => index > setIndex && token.kind === "punct" && token.text === "("
  );
  if (openIndex < 0) return false;
  const closeIndex = rest.findIndex(
    (token, index) => index > openIndex && token.kind === "punct" && token.text === ")"
  );
  return closeIndex < 0;
}
function orderUsingTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[words.length - 1] !== "using") return false;
  return words.includes("order");
}
var JSON_LITERAL_ARGUMENTS = /* @__PURE__ */ new Set([
  "json_object",
  "json_array",
  "json_set",
  "json_insert",
  "json_replace"
]);
function jsonArgumentTail(tokens) {
  if (tokens.length < 3) return false;
  let depth = 0;
  let openIndex = -1;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") depth += 1;
    else if (token.text === "(") {
      if (depth === 0) {
        openIndex = index;
        break;
      }
      depth -= 1;
    }
  }
  if (openIndex < 1) return false;
  const owner = tokens[openIndex - 1]?.text.toLowerCase() ?? "";
  if (JSON_LITERAL_ARGUMENTS.has(owner)) return true;
  if (owner === "json_extract" || owner === "json_value" || owner === "json_query") {
    const inner = tokens.slice(openIndex + 1);
    return inner.some((token) => token.kind === "punct" && token.text === ",");
  }
  return false;
}
function inListTail(tokens) {
  if (tokens.length < 3) return false;
  let depth = 0;
  let openIndex = -1;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") depth += 1;
    else if (token.text === "(") {
      if (depth === 0) {
        openIndex = index;
        break;
      }
      depth -= 1;
    }
  }
  if (openIndex < 1) return false;
  const owner = tokens[openIndex - 1]?.text.toLowerCase();
  if (owner !== "in") return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "punct" && last.text === ",";
}
function createWithTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "create" || !words.includes("table")) return false;
  const withIndex = words.indexOf("with");
  if (withIndex < 0) return false;
  let depth = 0;
  let sawParen = false;
  for (let index = withIndex + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") {
      depth += 1;
      sawParen = true;
    } else if (token.text === ")") {
      depth -= 1;
      if (sawParen && depth === 0) return false;
    }
  }
  return sawParen && depth > 0;
}
function alterDatabaseStart(tokens) {
  if (tokens.length !== 2) return false;
  return tokens[0]?.text.toLowerCase() === "alter" && tokens[1]?.text.toLowerCase() === "database";
}
function alterIndexTail(tokens) {
  const first = tokens[0]?.text.toLowerCase();
  const second = tokens[1]?.text.toLowerCase();
  if (first !== "alter" || second !== "index") return void 0;
  return tokens.length <= 2 ? "name" : "number";
}
function alterStorageDone(tokens) {
  const start = alterTableStart(tokens);
  if (start < 0) return false;
  const rest = tokens.slice(start);
  const setIndex = rest.findIndex((token) => token.text.toLowerCase() === "set");
  if (setIndex < 0) return false;
  const openIndex = rest.findIndex(
    (token, index) => index > setIndex && token.kind === "punct" && token.text === "("
  );
  if (openIndex < 0) return false;
  return rest.some(
    (token, index) => index > openIndex && token.kind === "punct" && token.text === ")"
  );
}
function alterTypeUsingTail(tokens) {
  if (alterTableStart(tokens) < 0) return false;
  const words = tokens.map((token) => token.text.toLowerCase());
  return words[words.length - 1] === "using" && words.includes("type");
}
function maintenanceTableTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  const first = words[0];
  const last = words[words.length - 1];
  if (first === "vacuum") {
    if (tokens.length === 1) return "tableName";
    if (last === "full" || last === "freeze" || last === "verbose" || last === "analyze") {
      return "tableName";
    }
    if (last === ")" && words.includes("verbose")) return "tableName";
    return void 0;
  }
  if (first === "analyze") {
    if (tokens.length === 1) return "tableName";
    if (last === "verbose") return "tableName";
  }
  return void 0;
}
function assignmentSubqueryDone(tokens) {
  if (tokens.length < 4) return false;
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== ")") return false;
  let depth = 0;
  let openIndex = -1;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") depth += 1;
    else if (token.text === "(") {
      depth -= 1;
      if (depth === 0) {
        openIndex = index;
        break;
      }
    }
  }
  if (openIndex < 1) return false;
  const bodyStart = tokens[openIndex + 1];
  if (bodyStart?.kind !== "keyword" || bodyStart.lower !== "select" && bodyStart.lower !== "with") {
    return false;
  }
  const before = tokens[openIndex - 1];
  return before?.kind === "punct" && before.text === "=";
}
var ALTER_ACTIONS = /* @__PURE__ */ new Set(["add", "drop", "modify", "change", "rename", "alter"]);
function alterTableStart(tokens) {
  const alter = tokens[0];
  const table = tokens[1];
  if (alter === void 0 || table === void 0 || alter.kind !== "keyword" || alter.lower !== "alter" || table.kind !== "keyword" || table.lower !== "table") {
    return -1;
  }
  let index = 2;
  const first = tokens[index];
  if (first === void 0) return -1;
  if (first.text.toLowerCase() === "if") {
    const exists = tokens[index + 1];
    if (exists === void 0 || exists.text.toLowerCase() !== "exists") return -1;
    index += 2;
  }
  const name2 = tokens[index];
  if (name2 === void 0 || name2.kind !== "ident") return -1;
  index += 1;
  const dot = tokens[index];
  const second = tokens[index + 1];
  if (dot !== void 0 && dot.kind === "punct" && dot.text === "." && second !== void 0 && second.kind === "ident") {
    index += 2;
  }
  return index;
}
function alterExpectation(tokens) {
  const start = alterTableStart(tokens);
  if (start < 0) return void 0;
  const comma = lastClauseComma(tokens, start);
  if (comma < 0) return alterActionExpectation(tokens, start);
  const clause = tokens.slice(comma + 1);
  return clause.length === 0 ? "alter" : alterActionExpectation(clause, 0);
}
function lastClauseComma(tokens, start) {
  let depth = 0;
  let last = -1;
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") depth -= 1;
    else if (token.text === "," && depth === 0) last = index;
  }
  return last;
}
function alterActionExpectation(tokens, start) {
  const action = tokens[start];
  if (action === void 0) return "alter";
  if (action.kind !== "keyword" || !ALTER_ACTIONS.has(action.lower)) return void 0;
  const lastWord = tokens[tokens.length - 1]?.text.toLowerCase();
  if (lastWord === "after") return "column";
  if (lastWord === "first") return "number";
  const object = tokens[start + 1];
  if (object === void 0) {
    return action.lower === "modify" || action.lower === "change" ? "column" : "alterObject";
  }
  if (object.kind !== "keyword" || tokens[start + 2] !== void 0) {
    if (action.lower === "rename" && object.kind === "keyword" && object.lower === "to" && tokens[start + 2] !== void 0) {
      return "number";
    }
    if (action.lower === "add" && object.lower === "constraint" && tokens[start + 2] !== void 0) {
      return "constraintType";
    }
    if (action.lower === "add" && (object.lower === "column" || object.kind === "ident")) {
      const last2 = tokens[tokens.length - 1];
      if (last2?.kind === "keyword") {
        if (last2.lower === "comment") return "name";
        if (last2.lower === "default") return "value";
        if (last2.lower === "collate") return "number";
      }
      return "definition";
    }
    if (action.lower === "alter" && object.lower === "column") {
      const last2 = tokens[tokens.length - 1];
      const word = last2?.text.toLowerCase();
      if (word === "set") return "alterColumnSet";
      if (word === "default") {
        return tokens[tokens.length - 2]?.text.toLowerCase() === "drop" ? "number" : "value";
      }
      return "number";
    }
    if (action.lower === "rename" && (object.lower === "index" || object.lower === "key")) {
      return "name";
    }
    if (action.lower === "rename" && object.lower === "column") {
      const rest = tokens.slice(start + 2);
      const last2 = rest[rest.length - 1];
      if (last2?.kind === "keyword" && last2.lower === "to") return "name";
      return "alterObject";
    }
    if (action.lower === "change" && object.lower === "column") {
      const rest = tokens.slice(start + 2);
      if (rest.length === 0) return "column";
      if (rest.length === 1) return "name";
      return "definition";
    }
    if (action.lower === "modify" && object.lower === "column") {
      return tokens.slice(start + 2).length === 0 ? "column" : "definition";
    }
    if ((action.lower === "add" || action.lower === "drop") && (object.lower === "index" || object.lower === "key" || object.lower === "unique")) {
      const last2 = tokens[tokens.length - 1];
      if (last2?.kind === "punct" && last2.text === ")" || action.lower === "drop" && last2?.kind === "ident") {
        return "number";
      }
    }
    const last = tokens[tokens.length - 1];
    if (last?.kind === "punct" && last.text === ",") return "alter";
    return void 0;
  }
  switch (action.lower) {
    case "add":
      if (object.lower === "column") return "name";
      if (object.lower === "index" || object.lower === "key" || object.lower === "unique") {
        return "name";
      }
      return object.lower === "constraint" ? "constraintType" : void 0;
    case "drop":
      if (object.lower === "index" || object.lower === "key") return "name";
      return object.lower === "column" ? "column" : void 0;
    case "modify":
    case "change":
      return object.lower === "column" ? "column" : void 0;
    case "rename":
      if (object.lower === "column") return "column";
      if (object.lower === "index" || object.lower === "key") return "name";
      return object.lower === "to" ? "name" : void 0;
    default:
      return void 0;
  }
}
function trailingIfExists(tokens) {
  const last = tokens[tokens.length - 1];
  const ifToken = tokens[tokens.length - 2];
  const object = tokens[tokens.length - 3];
  return last !== void 0 && last.kind === "keyword" && last.lower === "exists" && ifToken !== void 0 && ifToken.kind === "ident" && ifToken.lower === "if" && object !== void 0 && object.kind === "keyword" && (object.lower === "table" || object.lower === "view");
}
function createTableBodyTail(tokens) {
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  const asTail = last !== void 0 && last.kind === "keyword" && last.lower === "as";
  const close = last !== void 0 && last.kind === "punct" && last.text === ")";
  if (!close && !asTail) return void 0;
  if (asTail && !(previous !== void 0 && previous.kind === "punct" && previous.text === ")")) {
    return void 0;
  }
  const first = tokens[0];
  const second = tokens[1];
  if (first?.kind !== "keyword" || first.lower !== "create") return void 0;
  if (second === void 0 || second.lower !== "table" && second.lower !== "temporary") {
    return void 0;
  }
  if (second.lower === "temporary" && tokens[2]?.lower !== "table") return void 0;
  let depth = 0;
  for (const token of tokens) {
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") depth -= 1;
    if (depth < 0) return void 0;
  }
  if (depth !== 0) return void 0;
  return asTail ? "keyword" : "tableOptions";
}
function endsOperand(token) {
  if (token === void 0) return false;
  if (token.kind === "ident" || token.kind === "number" || token.kind === "param" || token.kind === "string") {
    return true;
  }
  if (token.kind === "punct" && token.text === ")") return true;
  return token.kind === "keyword" && (token.lower === "null" || token.lower === "true" || token.lower === "false");
}
var CONDITION_CLAUSES = /* @__PURE__ */ new Set(["where", "having", "on"]);
var CONDITION_BREAKS = /* @__PURE__ */ new Set([
  "select",
  "from",
  "group",
  "order",
  "limit",
  "offset",
  "union",
  "set",
  "into",
  "values",
  "using",
  "returning"
]);
var COMPARATORS = /* @__PURE__ */ new Set(["=", "<", ">", "!"]);
var COMPARISON_KEYWORDS = /* @__PURE__ */ new Set(["like", "in", "is", "between", "not", "regexp", "and", "or"]);
function completedExpression(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return false;
  if (last.kind === "keyword" && last.lower === "end") return true;
  if (last.kind !== "punct" || last.text !== ")") return false;
  let depth = 0;
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") depth += 1;
    else if (token.text === "(") {
      if (depth === 0) {
        const owner = tokens[index - 1];
        return owner?.kind === "ident" || owner?.kind === "keyword" && owner.lower === "over";
      }
      depth -= 1;
    }
  }
  return false;
}
function expressionTail(tokens) {
  if (!completedExpression(tokens)) return void 0;
  const last = tokens[tokens.length - 1];
  let start = tokens.length - 2;
  if (last.kind === "punct" && last.text === ")") {
    let depth = 0;
    for (let index = tokens.length - 1; index >= 0; index -= 1) {
      const token = tokens[index];
      if (token.kind !== "punct") continue;
      if (token.text === ")") depth += 1;
      else if (token.text === "(") {
        depth -= 1;
        if (depth === 0) {
          start = index - 2;
          break;
        }
      }
    }
  }
  for (let index = start; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "keyword") continue;
    if (token.lower === "where" || token.lower === "having" || token.lower === "on") {
      return "comparison";
    }
    if (token.lower === "select") return "expressionTail";
    if (CONDITION_BREAKS.has(token.lower)) return void 0;
  }
  return void 0;
}
function groupWithRollup(tokens) {
  const last = tokens[tokens.length - 1];
  if (last?.text.toLowerCase() !== "with") return false;
  return tokens.some((token) => token.kind === "keyword" && token.lower === "group");
}
function alterDatabaseTail(tokens) {
  if (tokens.length !== 3) return false;
  if (tokens[0]?.text.toLowerCase() !== "alter") return false;
  const object = tokens[1]?.text.toLowerCase();
  return object === "database" || object === "schema";
}
function alterDatabaseDone(tokens) {
  if (tokens.length <= 3) return false;
  if (tokens[0]?.text.toLowerCase() !== "alter") return false;
  const object = tokens[1]?.text.toLowerCase();
  return object === "database" || object === "schema";
}
function renameUserTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "rename") return void 0;
  if (tokens[1]?.text.toLowerCase() !== "user") return void 0;
  if (tokens.length === 2) return "name";
  const last = tokens[tokens.length - 1];
  if (last?.kind === "keyword" && last.lower === "to") return "name";
  return "number";
}
function fkReferenceColumns(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.includes("create") || !words.includes("references")) return false;
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== "(") return false;
  const references = words.lastIndexOf("references");
  return references >= 0 && references < tokens.length - 1;
}
function fkReferenceTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.includes("references")) return false;
  if (!words.includes("create") && !words.includes("alter")) return false;
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== ")") return false;
  const references = words.lastIndexOf("references");
  return references >= 0 && references < tokens.length - 1;
}
function alterDropColumnTail(tokens) {
  const start = alterTableStart(tokens);
  if (start < 0) return false;
  if (tokens[start]?.text.toLowerCase() !== "drop") return false;
  if (tokens[start + 1]?.text.toLowerCase() !== "column") return false;
  if (lastClauseComma(tokens, start) >= 0) return false;
  return tokens.length > start + 2;
}
function jsonTableColumnStage(tokens) {
  const table = tokens.findIndex((token) => token.text.toLowerCase() === "json_table");
  if (table < 0) return void 0;
  let callOpen = -1;
  for (let index = table + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "punct" && token.text === "(") {
      callOpen = index;
      break;
    }
  }
  if (callOpen < 0) return void 0;
  let depth = 0;
  let columns = -1;
  for (let index = callOpen; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "punct") {
      if (token.text === "(") depth += 1;
      else if (token.text === ")") depth -= 1;
      continue;
    }
    if (depth === 1 && token.text.toLowerCase() === "columns") columns = index;
  }
  if (columns < 0) return void 0;
  let listOpen = -1;
  for (let index = columns + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "punct" && token.text === "(") {
      listOpen = index;
      break;
    }
  }
  if (listOpen < 0) return "name";
  depth = 1;
  let segment = listOpen + 1;
  for (let index = listOpen + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") {
      depth -= 1;
      if (depth === 0) return "number";
    } else if (token.text === "," && depth === 1) segment = index + 1;
  }
  const rest = tokens.slice(segment);
  if (rest.length === 0) return "name";
  if (rest.length === 1 && rest[0]?.kind === "ident") return "columnType";
  return "number";
}
function createColumnOption(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.includes("create") || !words.includes("table")) return void 0;
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  let depth = 0;
  let opened = false;
  for (const token of tokens) {
    if (token.kind !== "punct") continue;
    if (token.text === "(") {
      depth += 1;
      opened = true;
    } else if (token.text === ")") {
      depth -= 1;
    }
  }
  if (!opened || depth <= 0) return void 0;
  const tail = last.text.toLowerCase();
  if (last.kind === "keyword" && last.lower === "default") return "value";
  if (last.kind === "keyword" && last.lower === "comment") return "name";
  if (tail === "key" || tail === "auto_increment") return "number";
  return void 0;
}
function alterColumnDone(tokens) {
  if (alterTableStart(tokens) < 0) return false;
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.some((word) => word === "column" || word === "modify" || word === "change" || word === "add")) {
    return false;
  }
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const word = tokens[index].text.toLowerCase();
    if (word === "comment" || word === "default") return true;
  }
  return false;
}
function alterColumnOption(tokens) {
  if (alterTableStart(tokens) < 0) return void 0;
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.some((word) => word === "column" || word === "modify" || word === "change" || word === "add")) {
    return void 0;
  }
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  const previous = tokens[tokens.length - 2];
  if (last.kind === "keyword" && last.lower === "default") {
    return previous?.text.toLowerCase() === "drop" ? "number" : "value";
  }
  if (last.kind === "keyword" && last.lower === "comment") return "name";
  const tail = last.text.toLowerCase();
  if (tail === "auto_increment" || tail === "key") return "number";
  return void 0;
}
function createColumnStage(tokens) {
  let created = false;
  let table = -1;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "keyword") continue;
    if (token.lower === "create") {
      created = true;
      continue;
    }
    if (token.lower === "as" || token.lower === "like") return void 0;
    if (token.lower === "table") {
      table = index;
      break;
    }
  }
  if (!created || table < 0) return void 0;
  let open = -1;
  for (let index = table + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "punct" && token.text === "(") {
      open = index;
      break;
    }
  }
  if (open < 0) return void 0;
  let depth = 0;
  let segment = open + 1;
  for (let index = open + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") {
      if (depth === 0) return void 0;
      depth -= 1;
    } else if (token.text === "," && depth === 0) segment = index + 1;
  }
  const rest = tokens.slice(segment);
  if (rest.length === 0) return "name";
  const words = rest.map((token) => token.text.toLowerCase());
  const inlineConstraint = words.some(
    (word) => word === "primary" || word === "unique" || word === "index" || word === "key" || word === "foreign"
  );
  const tail = rest[rest.length - 1];
  if (inlineConstraint && tail?.kind === "punct" && tail.text === "(") return "number";
  const first = rest[0];
  if (rest.length === 1 && first.kind === "ident") return "columnType";
  return void 0;
}
function alterColumnStage(tokens) {
  const start = alterTableStart(tokens);
  if (start < 0) return void 0;
  const action = tokens[start];
  if (action === void 0 || action.kind !== "keyword") return void 0;
  const verb = action.lower;
  if (verb !== "add" && verb !== "modify" && verb !== "change") return void 0;
  let index = start + 1;
  const column = tokens[index];
  if (column !== void 0 && column.kind === "keyword" && column.lower === "column") index += 1;
  const name2 = tokens[index];
  if (name2 === void 0 || name2.kind !== "ident") return void 0;
  const rest = tokens.slice(index + 1);
  if (verb === "add" || verb === "modify") return rest.length === 0 ? "columnType" : void 0;
  if (rest.length === 0) return "name";
  if (rest.length === 1) return "columnType";
  return void 0;
}
function scalarTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return false;
  const scalar = last.kind === "number" || last.kind === "string" || last.kind === "keyword" && (last.lower === "null" || last.lower === "true" || last.lower === "false");
  if (!scalar) return false;
  let depth = 0;
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind === "punct") {
      if (token.text === ")") depth += 1;
      else if (token.text === "(") depth -= 1;
      continue;
    }
    if (depth !== 0) continue;
    if (token.kind !== "keyword") continue;
    if (token.lower === "select") return true;
    if (token.lower === "where" || token.lower === "having" || token.lower === "on" || CONDITION_BREAKS.has(token.lower)) {
      return false;
    }
  }
  return false;
}
function subqueryClose(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "punct" || last.text !== ")") return void 0;
  let depth = 0;
  let open = -1;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") depth += 1;
    else if (token.text === "(") {
      depth -= 1;
      if (depth === 0) {
        open = index;
        break;
      }
    }
  }
  if (open < 0) return void 0;
  const first = tokens[open + 1];
  if (first === void 0 || first.kind !== "keyword" || first.lower !== "select" && first.lower !== "with") {
    return void 0;
  }
  let nest = 0;
  for (let index = open - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind === "punct") {
      if (token.text === ")") nest += 1;
      else if (token.text === "(") nest -= 1;
      continue;
    }
    if (nest !== 0) continue;
    if (token.kind !== "keyword") continue;
    if (token.lower === "select") return "expressionTail";
    if (token.lower === "where" || token.lower === "having" || token.lower === "on") {
      return "boolean";
    }
    if (CONDITION_BREAKS.has(token.lower)) return void 0;
  }
  return void 0;
}
function conditionOperator(tokens) {
  if (!endsOperand(tokens[tokens.length - 1])) return void 0;
  let inCondition = false;
  let depth = 0;
  for (let index2 = tokens.length - 2; index2 >= 0; index2 -= 1) {
    const token = tokens[index2];
    if (token.kind === "punct") {
      if (token.text === ")") depth += 1;
      else if (token.text === "(") {
        if (depth === 0) continue;
        depth -= 1;
      }
      continue;
    }
    if (token.kind !== "keyword" || depth > 0) continue;
    if (CONDITION_CLAUSES.has(token.lower)) {
      inCondition = true;
      break;
    }
    if (CONDITION_BREAKS.has(token.lower)) return void 0;
  }
  if (!inCondition) return void 0;
  let index = tokens.length - 2;
  depth = 0;
  for (; ; ) {
    const token = tokens[index];
    if (token === void 0) break;
    if (token.kind === "punct") {
      if (token.text === ")") {
        depth += 1;
        index -= 1;
        continue;
      }
      if (token.text === "(") {
        if (depth > 0) {
          depth -= 1;
          index -= 1;
          continue;
        }
        index -= 1;
        break;
      }
      if (token.text === "," && depth === 0) {
        index -= 1;
        continue;
      }
      if (token.text === "." && depth === 0) {
        index -= 1;
        continue;
      }
      break;
    }
    if (depth > 0) {
      index -= 1;
      continue;
    }
    if (token.kind === "ident" || token.kind === "number" || token.kind === "param" || token.kind === "string") {
      index -= 1;
      continue;
    }
    break;
  }
  const before = tokens[index];
  const compared = before !== void 0 && (before.kind === "punct" && COMPARATORS.has(before.text) || before.kind === "keyword" && COMPARISON_KEYWORDS.has(before.lower));
  return compared ? "boolean" : "comparison";
}
function orderByPosition(tokens) {
  const last = tokens[tokens.length - 1];
  const finished = endsOperand(last);
  const directed = last !== void 0 && last.kind === "keyword" && (last.lower === "asc" || last.lower === "desc");
  if (!finished && !directed) return void 0;
  let openParens = 0;
  for (const token of tokens) {
    if (token.kind !== "punct") continue;
    if (token.text === "(") openParens += 1;
    else if (token.text === ")" && openParens > 0) openParens -= 1;
  }
  if (openParens > 0) return "number";
  let depth = 0;
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind === "punct") {
      if (token.text === ")") depth += 1;
      else if (token.text === "(") {
        if (depth === 0) break;
        depth -= 1;
      }
      continue;
    }
    if (token.kind !== "keyword" || depth > 0) continue;
    const previous = tokens[index - 1];
    if (token.lower === "by" && previous?.kind === "keyword" && previous.lower === "order") {
      return directed ? "orderTail" : "direction";
    }
    if (CONDITION_BREAKS.has(token.lower) || token.lower === "by") return void 0;
  }
  return void 0;
}
function groupByPosition(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  if (last.text.toLowerCase() === "rollup") return "rollupTail";
  if (!endsOperand(last)) return void 0;
  let depth = last.kind === "punct" && last.text === ")" ? 1 : 0;
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind === "punct") {
      if (token.text === ")") depth += 1;
      else if (token.text === "(") {
        if (depth === 0) break;
        depth -= 1;
      }
      continue;
    }
    if (token.kind !== "keyword" || depth > 0) continue;
    const previous = tokens[index - 1];
    if (token.lower === "by" && previous?.kind === "keyword" && previous.lower === "group") {
      return "groupTail";
    }
    if (token.lower === "having" || token.lower === "where" || token.lower === "on" || token.lower === "select") {
      return void 0;
    }
    if (CONDITION_BREAKS.has(token.lower) || token.lower === "by") return void 0;
  }
  return void 0;
}
function transactionTail(tokens) {
  const first = tokens[0];
  if (first === void 0) return void 0;
  const start = first.text.toLowerCase();
  const words = tokens.map((token) => token.text.toLowerCase());
  const last = tokens[tokens.length - 1];
  if (start === "start") {
    if (words[1] !== "transaction") return void 0;
    if (tokens.length === 2) return "transaction";
    const tail = last?.text.toLowerCase();
    if (tail === "read") return "transactionRead";
    if (tail === "with") return "transactionWith";
    return "number";
  }
  if (start === "begin" || start === "commit") return "number";
  if (start === "rollback") {
    if (tokens.length === 1) return "number";
    if (last?.text.toLowerCase() === "to") return "rollbackTo";
    if (last?.text.toLowerCase() === "savepoint") return "name";
    return "number";
  }
  if (start === "savepoint") return tokens.length === 1 ? "name" : "number";
  if (start === "release") {
    if (tokens.length === 1) return "rollbackTo";
    if (tokens.length === 2 && last?.text.toLowerCase() === "savepoint") return "name";
    return "number";
  }
  return void 0;
}
function lockClauseTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return false;
  const lower = last.text.toLowerCase();
  if (lower === "update" || lower === "share") {
    const previous = tokens[tokens.length - 2];
    return previous !== void 0 && previous.text.toLowerCase() === "for";
  }
  if (lower === "nowait" || lower === "wait") return true;
  if (lower === "locked") {
    const previous = tokens[tokens.length - 2];
    return previous !== void 0 && previous.text.toLowerCase() === "skip";
  }
  if (lower !== "mode" || tokens.length < 4) return false;
  const tail = tokens.slice(tokens.length - 4).map((token) => token.text.toLowerCase());
  return tail[0] === "lock" && tail[1] === "in" && tail[2] === "share" && tail[3] === "mode";
}
function insertSetPosition(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "insert") return void 0;
  if (!tokens.some((token) => token.kind === "keyword" && token.lower === "set")) return void 0;
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  if (last.kind === "punct" && last.text === "=") return "value";
  if (last.kind === "punct") return void 0;
  return endsOperand(last) ? "number" : void 0;
}
function triggerTail(tokens) {
  if (tokens.length < 2) return void 0;
  if (tokens[0]?.text.toLowerCase() !== "create") return void 0;
  if (tokens[1]?.text.toLowerCase() !== "trigger") return void 0;
  if (tokens.length === 2) return "name";
  if (tokens.length === 3) return "triggerTiming";
  if (tokens.length === 4) return "triggerEvent";
  if (tokens.length === 5) return "triggerOn";
  const onIndex = tokens.findIndex(
    (token) => token.text.toLowerCase() === "on" && token.kind === "keyword"
  );
  if (onIndex < 0) return "triggerOn";
  if (onIndex === tokens.length - 1) return "tableName";
  const forIndex = tokens.findIndex((token) => token.text.toLowerCase() === "for");
  if (forIndex < 0) return "triggerFor";
  if (forIndex === tokens.length - 1) return "triggerEach";
  const eachIndex = tokens.findIndex((token) => token.text.toLowerCase() === "each");
  if (eachIndex < 0 || eachIndex === tokens.length - 1) return "triggerRow";
  return "statement";
}
function returnsTail(tokens) {
  if (tokens.length < 2) return false;
  if (tokens[0]?.text.toLowerCase() !== "create") return false;
  const index = tokens.findIndex((token) => token.text.toLowerCase() === "returns");
  return index >= 0 && index === tokens.length - 1;
}
function declareTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "declare") return void 0;
  const last = tokens[tokens.length - 1];
  if (last?.kind === "keyword" && last.lower === "default") return "value";
  if (tokens.length === 1) return "name";
  if (tokens.length === 2) return "columnType";
  return "number";
}
function routineStatementTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  const tail = last.text.toLowerCase();
  if (tail === "leave" || tail === "iterate" || tail === "open" || tail === "close") {
    return "name";
  }
  if (tail === "fetch" || tail === "signal" || tail === "resignal") return "number";
  if (tail === "diagnostics" || tail === "message_text" || tail === "=") return "number";
  if (tail === "default") return "value";
  if (tokens[0]?.text.toLowerCase() === "declare") return declareTail(tokens) ?? void 0;
  return void 0;
}
function jsonArrowTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "punct" || last.text !== ">") return false;
  let index = tokens.length - 1;
  while (index > 0) {
    const previous = tokens[index - 1];
    if (previous.kind === "punct" && previous.text === ">") {
      index -= 1;
      continue;
    }
    return previous.kind === "punct" && previous.text === "-";
  }
  return false;
}
function tableExpressionParen(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "punct" || last.text !== "(") return false;
  const previous = tokens[tokens.length - 2];
  const owner = previous?.text.toLowerCase();
  if (owner !== "check" && owner !== "as") return false;
  const words = tokens.map((token) => token.text.toLowerCase());
  return (words.includes("create") || words.includes("alter")) && words.includes("table");
}
function adminTail(tokens) {
  const first = tokens[0]?.text.toLowerCase();
  if (first === void 0) return void 0;
  if (first === "kill") return "number";
  if (first === "flush") {
    if (tokens.length === 1) return "flush";
    const last = tokens[tokens.length - 1];
    return last.text.toLowerCase() === "tables" ? "tableName" : "number";
  }
  if (first === "reset") return tokens.length === 1 ? "reset" : "number";
  if (first === "do") return "column";
  if (first === "help") return "name";
  return void 0;
}
function routineTail(tokens) {
  if (tokens.length < 2) return void 0;
  if (tokens[0]?.text.toLowerCase() !== "create") return void 0;
  let index = 1;
  if (tokens[1]?.text.toLowerCase() === "or" && tokens[2]?.text.toLowerCase() === "replace") {
    index = 3;
  }
  const object = tokens[index]?.text.toLowerCase();
  if (object !== "procedure" && object !== "function") return void 0;
  const routineBody = object === "function";
  const nameIndex = index + 1;
  if (tokens[nameIndex] === void 0) return "name";
  const open = tokens.findIndex(
    (token, at) => at > nameIndex && token.kind === "punct" && token.text === "("
  );
  if (open < 0) return "number";
  let depth = 0;
  let close = -1;
  for (let at = open; at < tokens.length; at += 1) {
    const token = tokens[at];
    if (token.kind !== "punct") continue;
    if (token.text === "(") {
      depth += 1;
    } else if (token.text === ")") {
      depth -= 1;
      if (depth === 0) {
        close = at;
        break;
      }
    }
  }
  if (close < 0) {
    let segmentStart = open;
    depth = 0;
    for (let at = open; at < tokens.length; at += 1) {
      const token = tokens[at];
      if (token.kind !== "punct") continue;
      if (token.text === "(") depth += 1;
      else if (token.text === ")" && depth > 0) depth -= 1;
      else if (token.text === "," && depth === 1) segmentStart = at;
    }
    const segment = tokens.slice(segmentStart + 1).filter((token) => token.text.toLowerCase() !== "in").filter((token) => token.text.toLowerCase() !== "out").filter((token) => token.text.toLowerCase() !== "inout");
    if (segment.length === 0) return "name";
    if (segment.length === 1 && segment[0]?.kind === "ident") return "columnType";
    return "number";
  }
  const after = tokens.slice(close + 1).map((token) => token.text.toLowerCase());
  if (after.length === 0) return routineBody ? "routineReturn" : "statement";
  if (after[0] === "returns") {
    if (after.length === 1) return "columnType";
    if (after[after.length - 1] === "return") return "column";
    return "number";
  }
  if (after[0] === "begin") {
    const body = tokens.slice(close + 2);
    return routineStatementTail(body) ?? "statement";
  }
  if (after[0] === "return") return "column";
  return "number";
}
function createViewTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "create") return void 0;
  let index = 1;
  if (words[1] === "or" && words[2] === "replace") index = 3;
  if (words[index] !== "view") return void 0;
  const nameIndex = index + 1;
  if (words[nameIndex] === void 0) return "name";
  if (words.indexOf("as", nameIndex + 1) >= 0) return void 0;
  let depth = 0;
  let open = -1;
  let close = -1;
  for (let at = nameIndex + 1; at < words.length; at += 1) {
    const word = words[at];
    if (word === "(") {
      if (open < 0) open = at;
      depth += 1;
    } else if (word === ")" && depth > 0) {
      depth -= 1;
      if (open >= 0 && depth === 0) {
        close = at;
        break;
      }
    }
  }
  if (open < 0) return "viewTail";
  if (close < 0) {
    const last = words[words.length - 1];
    if (last === "(" || last === ",") return "name";
    return "number";
  }
  return "viewTail";
}
function createEventTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "create") return void 0;
  let index = 1;
  if (words[index] === "definer") {
    while (tokens[index] !== void 0 && tokens[index]?.text !== "=") index += 1;
    index += 1;
  }
  if (words[index] !== "event") return void 0;
  const nameIndex = index + 1;
  if (words[nameIndex] === void 0) return "name";
  if (words[nameIndex + 1] === void 0) return "eventOn";
  const onIndex = words.indexOf("on", nameIndex + 1);
  if (onIndex < 0) return "eventOn";
  const scheduleIndex = words.indexOf("schedule", onIndex + 1);
  if (onIndex === words.length - 1) return "eventSchedule";
  if (scheduleIndex < 0) return "eventSchedule";
  if (scheduleIndex === words.length - 1) return "eventTiming";
  const timing = words[scheduleIndex + 1];
  const rest = tokens.slice(scheduleIndex + 2);
  if (timing === "every" && rest.length === 0) return "number";
  if (timing === "every" && rest.length === 1 && rest[0]?.kind === "number") return "interval";
  if (timing === "at" && rest.length === 0) return "number";
  const last = words[words.length - 1];
  if (last === "starts" || last === "ends") return "number";
  const doIndex = words.indexOf("do", scheduleIndex + 1);
  if (doIndex >= 0) return doIndex === words.length - 1 ? "statement" : void 0;
  return "eventTail";
}
function functionArgumentFrom(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "keyword" || last.lower !== "from") return false;
  let depth = 0;
  for (let at = tokens.length - 1; at >= 0; at -= 1) {
    const token = tokens[at];
    if (token.kind !== "punct") continue;
    if (token.text === ")") {
      depth += 1;
    } else if (token.text === "(") {
      if (depth > 0) {
        depth -= 1;
        continue;
      }
      const owner = tokens[at - 1];
      return owner !== void 0 && owner.kind === "ident";
    }
  }
  return false;
}
function selectInto(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "select") return false;
  const last = tokens[tokens.length - 1];
  return last !== void 0 && last.kind === "keyword" && last.lower === "into";
}
function insertTargetTail(tokens) {
  const first = tokens[0]?.text.toLowerCase();
  if (first !== "insert" && first !== "replace") return false;
  const intoIndex = tokens.findIndex((token) => token.text.toLowerCase() === "into");
  if (intoIndex < 0) return false;
  const target = parseRelationRef(tokens, intoIndex + 1);
  return target !== null && target.next === tokens.length;
}
function indexHint(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  let hint = -1;
  for (let index = 0; index < words.length - 1; index += 1) {
    if ((words[index] === "force" || words[index] === "use" || words[index] === "ignore") && (words[index + 1] === "index" || words[index + 1] === "key")) {
      hint = index;
    }
  }
  if (hint < 0) return false;
  let depth = 0;
  let opened = false;
  for (let index = hint + 2; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") {
      depth += 1;
      opened = true;
    } else if (token.text === ")") {
      depth -= 1;
    }
  }
  return opened && depth > 0;
}
function forLockTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (!words.includes("for")) return void 0;
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  const tail = last.text.toLowerCase();
  if (tail === "update" || tail === "share") return "number";
  const ofIndex = words.indexOf("of");
  if (ofIndex < 0) return void 0;
  const list = tokens.slice(ofIndex + 1);
  if (list.length === 0) return "tableName";
  const listLast = list[list.length - 1];
  return listLast?.kind === "punct" && listLast.text === "," ? "tableName" : "number";
}
function fetchTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words.includes("fetch")) return "number";
  const tail = words[words.length - 1];
  if ((tail === "rows" || tail === "row") && words.includes("offset")) return "number";
  return void 0;
}
function loadDataTail(tokens) {
  const first = tokens[0];
  const second = tokens[1];
  if (first?.text.toLowerCase() !== "load" || second?.text.toLowerCase() !== "data") {
    return void 0;
  }
  const words = tokens.map((token) => token.text.toLowerCase());
  const table = words.indexOf("table");
  if (table < 0) return "number";
  return table === words.length - 1 ? "tableName" : "number";
}
function partitionParen(tokens) {
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== "(") return void 0;
  if (!tokens.some((token) => token.text.toLowerCase() === "partition")) return void 0;
  const owner = tokens[tokens.length - 2]?.text.toLowerCase();
  if (owner === "range" || owner === "list" || owner === "hash" || owner === "key") {
    return "column";
  }
  return "number";
}
function partitionCount(tokens) {
  const last = tokens[tokens.length - 1];
  return last !== void 0 && last.text.toLowerCase() === "partitions";
}
function partitionValuesIn(tokens) {
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== ",") return false;
  if (!tokens.some((token) => token.text.toLowerCase() === "partition")) return false;
  let depth = 0;
  let open = -1;
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === ")") depth += 1;
    else if (token.text === "(") {
      if (depth === 0) {
        open = index;
        break;
      }
      depth -= 1;
    }
  }
  if (open < 2) return false;
  const owner = tokens[open - 1]?.text.toLowerCase();
  if (owner !== "in" && owner !== "than") return false;
  return tokens.slice(0, open).some((token) => token.text.toLowerCase() === "values");
}
function alterDropConstraint(tokens) {
  const start = alterTableStart(tokens);
  if (start < 0) return false;
  if (tokens[start]?.text.toLowerCase() !== "drop") return false;
  const object = tokens[start + 1]?.text.toLowerCase();
  return object === "foreign" || object === "constraint" || object === "check";
}
function separatorTail(tokens) {
  const last = tokens[tokens.length - 1];
  return last !== void 0 && last.text.toLowerCase() === "separator";
}
function convertUsing(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "keyword" || last.lower !== "using") return false;
  let depth = 0;
  for (let at = tokens.length - 1; at >= 0; at -= 1) {
    const token = tokens[at];
    if (token.kind !== "punct") continue;
    if (token.text === ")") {
      depth += 1;
    } else if (token.text === "(") {
      if (depth > 0) {
        depth -= 1;
        continue;
      }
      const owner = tokens[at - 1];
      return owner !== void 0 && owner.kind === "ident" && owner.lower === "convert";
    }
  }
  return false;
}
function selectIntoVariableTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "select") return false;
  if (!tokens.some((token) => token.kind === "keyword" && token.lower === "into")) return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "punct" && last.text === ",";
}
function procedureQuietTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "select") return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "keyword" && last.lower === "procedure";
}
function alterOptionAssignment(tokens) {
  const last = tokens[tokens.length - 1];
  if (last === void 0 || last.kind !== "punct" || last.text !== "=") return void 0;
  if (alterTableStart(tokens) < 0) return void 0;
  const option = tokens[tokens.length - 2]?.text.toLowerCase();
  if (option === "algorithm") return "algorithm";
  if (option === "lock") return "lockOption";
  return void 0;
}
function alterTypeTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "alter") return void 0;
  if (tokens[1]?.text.toLowerCase() !== "type") return void 0;
  if (tokens.length <= 3) return "typeAlter";
  const last = tokens[tokens.length - 1];
  if (last?.kind === "keyword" && last.lower === "add") return "typeAdd";
  return "number";
}
function mergeUsingTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "merge") return void 0;
  const last = tokens[tokens.length - 1];
  return last?.text.toLowerCase() === "using" ? "relation" : void 0;
}
function mergeInsertBare(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "merge") return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "keyword" && last.lower === "insert";
}
function copyTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "copy") return void 0;
  const words = tokens.map((token) => token.text.toLowerCase());
  const open = tokens.findIndex((token) => token.kind === "punct" && token.text === "(");
  if (open >= 0) {
    let depth = 0;
    let closed = false;
    for (let index = open; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.kind !== "punct") continue;
      if (token.text === "(") depth += 1;
      else if (token.text === ")") {
        depth -= 1;
        if (depth === 0) closed = true;
      }
    }
    if (!closed) {
      const last = tokens[tokens.length - 1];
      return last?.kind === "punct" && (last.text === "(" || last.text === ",") ? "column" : void 0;
    }
    return "number";
  }
  if (words.includes("from") || words.includes("to")) return "number";
  return "tableName";
}
function explainOptions(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "explain") return void 0;
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== "(" && last.text !== ",") return void 0;
  return "explainOption";
}
function distinctOnTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "select" || !words.includes("distinct") || !words.includes("on")) return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "punct" && last.text === ")";
}
function insertValuesTail(tokens) {
  const words = tokens.map((token) => token.text.toLowerCase());
  if (words[0] !== "insert" && words[0] !== "replace") return false;
  const values = words.indexOf("values");
  if (values < 0) return false;
  let depth = 0;
  for (let index = values + 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") depth -= 1;
  }
  if (depth <= 0) return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "punct" && last.text === "," || last?.kind === "keyword" && last.lower === "default";
}
function dropObjectTail(tokens) {
  const first = tokens[0]?.text.toLowerCase();
  if (first !== "drop") return false;
  const object = tokens[1]?.text.toLowerCase();
  return object === "trigger" || object === "procedure" || object === "function" || object === "event" || object === "user" || object === "role" || object === "server" || object === "sequence" || object === "type" || object === "extension" || object === "domain";
}
function alterUserTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "alter") return void 0;
  const object = tokens[1]?.text.toLowerCase();
  if (object !== "user" && object !== "role") return void 0;
  return tokens.length === 2 ? "name" : "number";
}
function updateTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "update") return false;
  if (tokens.length < 2) return false;
  if (tokens.some((token) => token.text.toLowerCase() === "set")) return false;
  const last = tokens[tokens.length - 1];
  if (last.kind === "punct" && last.text === ",") return false;
  return last.text.toLowerCase() !== "join" && last.text.toLowerCase() !== "using";
}
function variableTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "select") return void 0;
  const last = tokens[tokens.length - 1];
  if (last === void 0) return void 0;
  return last.text.startsWith("@") ? "expressionTail" : void 0;
}
function insertOnTail(tokens) {
  const first = tokens[0];
  if (first === void 0) return false;
  const head = first.text.toLowerCase();
  if (head !== "insert" && head !== "replace") return false;
  if (!tokens.some((token) => token.kind === "keyword" && token.lower === "select")) {
    return false;
  }
  const last = tokens[tokens.length - 1];
  return last?.kind === "keyword" && last.lower === "on";
}
function insertSelectDone(tokens) {
  const first = tokens[0];
  if (first === void 0) return false;
  const head = first.text.toLowerCase();
  if (head !== "insert" && head !== "replace") return false;
  if (!tokens.some((token) => token.kind === "keyword" && token.lower === "select")) {
    return false;
  }
  const last = tokens[tokens.length - 1];
  return last !== void 0 && (last.kind === "ident" || last.kind === "punct" && last.text === ")");
}
function distinctFromTail(tokens) {
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  if (last?.kind !== "keyword" || last.lower !== "from") return void 0;
  if (previous?.text.toLowerCase() !== "distinct") return void 0;
  return "value";
}
function nullSafeTail(tokens) {
  const size = tokens.length;
  const last = tokens[size - 1];
  const previous = tokens[size - 2];
  const beforePrevious = tokens[size - 3];
  if (last?.kind !== "punct" || last.text !== ">") return void 0;
  if (previous?.kind !== "punct" || previous.text !== "=") return void 0;
  if (beforePrevious?.kind !== "punct" || beforePrevious.text !== "<") return void 0;
  return "value";
}
function betweenValueTail(tokens) {
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "keyword" || last.lower !== "and") return false;
  if (tokens.some((token) => token.text.toLowerCase() === "over")) return false;
  let depth = 0;
  for (let index = tokens.length - 2; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind === "punct") {
      if (token.text === ")") depth += 1;
      else if (token.text === "(") depth -= 1;
      continue;
    }
    if (depth > 0) continue;
    if (token.kind === "keyword" && token.lower === "between") return true;
    if (token.kind === "keyword" && ["where", "having", "on", "select", "from", "group", "order", "limit", "union", "set", "values"].includes(
      token.lower
    )) {
      return false;
    }
  }
  return false;
}
function patternTail(tokens) {
  const last = tokens[tokens.length - 1];
  const previous = tokens[tokens.length - 2];
  if (last === void 0) return false;
  if (last.text.toLowerCase() === "regexp" || last.text.toLowerCase() === "rlike") return true;
  return last.kind === "punct" && last.text === "(" && previous !== void 0 && previous.text.toLowerCase() === "against";
}
function castTail(tokens) {
  let colon = -1;
  for (let index = tokens.length - 1; index > 0; index -= 1) {
    const token = tokens[index];
    const previous = tokens[index - 1];
    if (token.kind === "punct" && token.text === ":" && previous.kind === "punct" && previous.text === ":") {
      colon = index;
      break;
    }
  }
  if (colon < 0) return void 0;
  return colon === tokens.length - 1 ? "columnType" : "expressionTail";
}
function grantTargetDone(tokens) {
  const first = tokens[0];
  if (first === void 0) return false;
  const head = first.text.toLowerCase();
  if (head !== "grant" && head !== "revoke") return false;
  const onAt = tokens.findIndex((token) => token.kind === "keyword" && token.lower === "on");
  if (onAt < 0) return false;
  const parsed = parseRelationRef(tokens, onAt + 1);
  return parsed !== null && parsed.next === tokens.length;
}
function grantColumnList(tokens) {
  const first = tokens[0];
  if (first === void 0) return false;
  const head = first.text.toLowerCase();
  if (head !== "grant" && head !== "revoke") return false;
  if (tokens.some((token) => token.kind === "keyword" && token.lower === "on")) return false;
  return tokens.some((token) => token.kind === "punct" && token.text === "(");
}
function alterColumnTypeTail(tokens) {
  if (alterTableStart(tokens) < 0) return false;
  if (!tokens.some((token) => token.kind === "keyword" && token.lower === "column")) return false;
  const words = tokens.map((token) => token.text.toLowerCase());
  return words[words.length - 1] === "type";
}
function alterColumnDropTail(tokens) {
  if (alterTableStart(tokens) < 0) return false;
  if (!tokens.some((token) => token.kind === "keyword" && token.lower === "column")) return false;
  const last = tokens[tokens.length - 1];
  return last?.kind === "keyword" && last.lower === "drop";
}
function alterSequenceTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "alter") return void 0;
  if (tokens[1]?.text.toLowerCase() !== "sequence") return void 0;
  return tokens.length <= 2 ? "name" : "number";
}
function prepareTail(tokens) {
  if (tokens[0]?.text.toLowerCase() !== "prepare") return void 0;
  if (tokens.some(
    (token) => token.kind === "keyword" && ["select", "insert", "update", "delete"].includes(token.lower ?? "")
  )) {
    return void 0;
  }
  return tokens.length === 1 ? "name" : "number";
}
function updateAssignmentValue(tokens) {
  const first = tokens[0];
  if (first === void 0 || first.text.toLowerCase() !== "update") return false;
  const setAt = tokens.findIndex((token) => token.kind === "keyword" && token.lower === "set");
  if (setAt < 0) return false;
  const last = tokens[tokens.length - 1];
  if (last?.kind !== "punct" || last.text !== "=") return false;
  return !tokens.some((token) => token.kind === "keyword" && token.lower === "where");
}
function cteColumnListTail(tokens) {
  if (tokens[0]?.kind !== "keyword" || tokens[0].lower !== "with") return false;
  if (tokens[1]?.kind !== "ident") return false;
  const open = 2;
  const opener2 = tokens[open];
  if (opener2?.kind !== "punct" || opener2.text !== "(") return false;
  let depth = 0;
  for (let index = open; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind !== "punct") continue;
    if (token.text === "(") depth += 1;
    else if (token.text === ")") {
      depth -= 1;
      if (depth === 0) return false;
    }
  }
  return true;
}
function expectationAt(tokens) {
  if (collationValue(tokens)) return "collation";
  const routineKeyword = routineKeywordTail(tokens);
  if (routineKeyword !== void 0) return routineKeyword;
  const cursor = cursorTail(tokens);
  if (cursor !== void 0) return cursor;
  const raise = raiseTail(tokens);
  if (raise !== void 0) return raise;
  if (setSchemaTail(tokens)) return "database";
  if (alterStorageTail(tokens)) return "number";
  if (alterStorageDone(tokens)) return "number";
  if (alterTypeUsingTail(tokens)) return "column";
  if (charsetValue(tokens)) return "charset";
  if (convertUsing(tokens)) return "charset";
  if (alterDatabaseDone(tokens)) return "number";
  const comment = commentOn(tokens);
  if (comment !== void 0) return comment;
  const materialized = materializedViewTail(tokens);
  if (materialized !== void 0) return materialized;
  if (materializedViewOpen(tokens)) return "tableName";
  if (materializedViewDone(tokens)) return "number";
  if (pivotParen(tokens)) return "column";
  const sample = sampleTail(tokens);
  if (sample !== void 0) return sample;
  const conflict = conflictTail(tokens);
  if (conflict !== void 0) return conflict;
  if (partitionCount(tokens)) return "number";
  if (partitionValuesIn(tokens)) return "value";
  const partition = partitionParen(tokens);
  if (partition !== void 0) return partition;
  if (indexHint(tokens)) return "number";
  if (alterIndexColumns(tokens)) return "column";
  if (typePrecisionTail(tokens)) return "number";
  if (columnLength(tokens)) return "number";
  if (fkReferenceColumns(tokens)) return "column";
  if (alterDropColumnTail(tokens)) return "number";
  const jsonColumn = jsonTableColumnStage(tokens);
  if (jsonColumn !== void 0) return jsonColumn;
  const columnOption = createColumnOption(tokens);
  if (columnOption !== void 0) return columnOption;
  if (alterColumnDone(tokens)) return "number";
  const alterColumnSetting = alterColumnOption(tokens);
  if (alterColumnSetting !== void 0) return alterColumnSetting;
  if (tableExpressionParen(tokens)) return "column";
  const columnStage = createColumnStage(tokens);
  if (columnStage !== void 0) return columnStage;
  if (referencesTail(tokens)) return "tableName";
  if (fkReferenceTail(tokens)) return "number";
  if (inheritsTail(tokens)) return "tableName";
  if (createWithTail(tokens)) return "number";
  if (insideCreateTableParen(tokens)) return "definition";
  const tableTail = createTableBodyTail(tokens);
  if (tableTail !== void 0) return tableTail;
  if (createTableAs(tokens)) return "statement";
  if (createViewAs(tokens) || afterCteDefinition(tokens)) return "statement";
  if (cteColumnListTail(tokens)) return "name";
  const view = createViewTail(tokens);
  if (view !== void 0) return view;
  if (createTableLike(tokens)) return "tableName";
  if (createObjectName(tokens)) return "name";
  const routine = routineTail(tokens);
  if (routine !== void 0) return routine;
  const event = createEventTail(tokens);
  if (event !== void 0) return event;
  const trigger = triggerTail(tokens);
  if (trigger !== void 0) return trigger;
  if (returnsTail(tokens)) return "columnType";
  const declared = declareTail(tokens);
  if (declared !== void 0) return declared;
  if (createTableOptionsTail(tokens)) return "tableOptions";
  if (indexUsingTail(tokens)) return "indexMethod";
  const alterColumn = alterColumnStage(tokens);
  if (alterColumn !== void 0) return alterColumn;
  if (alterDropConstraint(tokens)) return "name";
  const alterOption = alterOptionAssignment(tokens);
  if (alterOption !== void 0) return alterOption;
  if (alterColumnTypeTail(tokens)) return "columnType";
  if (alterColumnDropTail(tokens)) return "alterColumnDrop";
  const alter = alterExpectation(tokens);
  if (alter !== void 0) return alter;
  if (setSchemaTail(tokens)) return "database";
  if (alterStorageTail(tokens)) return "number";
  const alterEngine = alterTableEngine(tokens);
  if (alterEngine !== void 0) return alterEngine;
  const indexOn = createIndexOn(tokens);
  if (indexOn >= 0) {
    const target = parseRelationRef(tokens, indexOn + 1);
    if (target === null) return "tableName";
    let depth = 0;
    let sawParen = false;
    for (let cursor2 = target.next; cursor2 < tokens.length; cursor2 += 1) {
      const token = tokens[cursor2];
      if (token.kind !== "punct") continue;
      if (token.text === "(") {
        depth += 1;
        sawParen = true;
      } else if (token.text === ")" && depth > 0) {
        depth -= 1;
      }
    }
    const whereAfter = tokens.slice(target.next).some((token) => token.text.toLowerCase() === "where");
    return sawParen && depth === 0 ? whereAfter ? "column" : "number" : "column";
  }
  if (startsSubquery(tokens)) return "keyword";
  if (trailingIfExists(tokens)) return "tableName";
  if (useDatabase(tokens)) return "database";
  if (tokens.length > 1 && tokens[0]?.text.toLowerCase() === "use") return "number";
  const alterUser = alterUserTail(tokens);
  if (alterUser !== void 0) return alterUser;
  const sequence = alterSequenceTail(tokens);
  if (sequence !== void 0) return sequence;
  const transaction = transactionTail(tokens);
  if (transaction !== void 0) return transaction;
  const mergeUsing = mergeUsingTail(tokens);
  if (mergeUsing !== void 0) return mergeUsing;
  if (mergeInsertBare(tokens)) return "name";
  const call = callStart(tokens);
  if (call !== void 0) return call;
  const maintenance = maintenanceTableTail(tokens);
  if (maintenance !== void 0) return maintenance;
  if (ddlTableName(tokens)) return "tableName";
  const truncate = truncateTail(tokens);
  if (truncate !== void 0) return truncate;
  if (checksumDone(tokens)) return "number";
  const copy = copyTail(tokens);
  if (copy !== void 0) return copy;
  if (dropObjectTail(tokens)) return "name";
  const renamedUser = renameUserTail(tokens);
  if (renamedUser !== void 0) return renamedUser;
  if (alterDatabaseTail(tokens)) return "alterDatabase";
  if (alterDatabaseStart(tokens)) return "database";
  const alterType = alterTypeTail(tokens);
  if (alterType !== void 0) return alterType;
  const load2 = loadDataTail(tokens);
  if (load2 !== void 0) return load2;
  const deleteSource = deleteUsing(tokens);
  if (deleteSource !== void 0) return deleteSource;
  if (tableNameTail(tokens)) return "number";
  if (renameTableTail(tokens)) return "name";
  if (duplicateKeyValue(tokens)) return "value";
  const lockTable = lockTableTail(tokens);
  if (lockTable !== void 0) return lockTable;
  if (updateAssignmentValue(tokens)) return "value";
  if (updateTail(tokens)) return "assignment";
  if (jsonArgumentTail(tokens)) return "number";
  if (functionArgumentFrom(tokens)) return "column";
  if (insertTargetTail(tokens)) return "insertSource";
  if (insertOnTail(tokens)) return "insertOn";
  if (insertSelectDone(tokens)) return "insertTail";
  if (assignmentSubqueryDone(tokens)) return "number";
  if (fromListTail(tokens)) return "fromTail";
  if (relationKeywordTail(tokens)) return "relation";
  if (lockClauseTail(tokens)) return "number";
  if (selectInto(tokens)) return "intoTarget";
  if (selectIntoVariableTail(tokens)) return "number";
  const prepare = prepareTail(tokens);
  if (prepare !== void 0) return prepare;
  if (literalTail(tokens)) return "number";
  const insertSet = insertSetPosition(tokens);
  if (insertSet !== void 0) return insertSet;
  if (insertColumnListComplete(tokens)) return "insertSource";
  if (usingTail(tokens)) return "joinTail";
  if (usingParenOpen(tokens)) return "using";
  if (grantColumnList(tokens)) return "number";
  if (privilegePosition(tokens)) return "privilege";
  if (grantTarget(tokens)) return "tableName";
  if (grantTargetDone(tokens)) return "number";
  if (describesTable(tokens)) return "relation";
  if (describeTableTail(tokens)) return "name";
  if (dropIndexOn(tokens)) return "relation";
  const alterIndex = alterIndexTail(tokens);
  if (alterIndex !== void 0) return alterIndex;
  if (objectName(tokens)) return "name";
  if (dropDatabase(tokens)) return "database";
  if (grantee(tokens)) return "name";
  const withOption = grantWith(tokens);
  if (withOption !== void 0) return withOption;
  if (granteeTail(tokens)) return "number";
  if (unionStatement(tokens)) return "statement";
  const explainOption = explainOptions(tokens);
  if (explainOption !== void 0) return explainOption;
  if (explainStart(tokens)) return "statement";
  const show = showTail(tokens);
  if (show !== void 0) return show;
  if (showStart(tokens)) return "show";
  if (showPatternTail(tokens)) return "number";
  if (procedureQuietTail(tokens)) return "number";
  if (separatorTail(tokens)) return "number";
  const admin = adminTail(tokens);
  if (admin !== void 0) return admin;
  if (limitCount(tokens)) return "number";
  if (limitAll(tokens)) return "number";
  if (limitTail(tokens)) return "number";
  const fetch2 = fetchTail(tokens);
  if (fetch2 !== void 0) return fetch2;
  if (createTableEngine(tokens)) return "engine";
  if (partitionBy(tokens)) return "partition";
  if (charsetValue(tokens)) return "charset";
  const assignment = tableOptionAssignment(tokens);
  if (assignment !== void 0) return assignment;
  const optionValue = tableOptionValue(tokens);
  if (optionValue !== void 0) return optionValue;
  if (afterTableOptionValue(tokens)) return "tableOptions";
  const setTransaction = setTransactionTail(tokens);
  if (setTransaction !== void 0) return setTransaction;
  if (isolationStart(tokens)) return "isolation";
  const set = setStatement(tokens);
  if (set !== void 0) return set;
  if (duplicateKeyUpdate(tokens)) return "column";
  if (valuesListComplete(tokens)) return "insertTail";
  if (valuesNextTuple(tokens)) return "number";
  if (insertValuesTail(tokens)) return "value";
  if (castAs(tokens)) return "type";
  const interval = intervalTail(tokens);
  if (interval !== void 0) return interval;
  const cast = castTail(tokens);
  if (cast !== void 0) return cast;
  const expression = expressionTail(tokens);
  if (expression !== void 0) return expression;
  if (scalarTail(tokens)) return "expressionTail";
  const subquery = subqueryClose(tokens);
  if (subquery !== void 0) return subquery;
  if (distinctOnTail(tokens)) return "expressionTail";
  if (jsonArrowTail(tokens)) return "number";
  const variable = variableTail(tokens);
  if (variable !== void 0) return variable;
  const last = tokens[tokens.length - 1];
  const before = tokens[tokens.length - 2];
  const distinctFrom = distinctFromTail(tokens);
  if (distinctFrom !== void 0) return distinctFrom;
  const nullSafe = nullSafeTail(tokens);
  if (nullSafe !== void 0) return nullSafe;
  if (patternTail(tokens)) return "number";
  if (betweenValueTail(tokens)) return "value";
  if (last?.kind === "keyword" && last.lower === "not" && before?.kind === "keyword" && before.lower === "is") {
    return "value";
  }
  if (last?.kind === "keyword" && last.lower === "is") return "value";
  if (last?.kind === "keyword" && last.lower === "not") return "comparison";
  if (last?.kind === "keyword" && last.lower === "like") return "number";
  if (last !== void 0 && last.text.toLowerCase() === "return") return "column";
  if (escapeTail(tokens)) return "number";
  if (lockStart(tokens)) return "lock";
  if (forLengthTail(tokens)) return "number";
  const forLock = forLockTail(tokens);
  if (forLock !== void 0) return forLock;
  if (namedWindowTail(tokens)) return "expressionTail";
  const window2 = windowExpectation(tokens);
  if (window2 !== void 0) return window2;
  const nulls = nullsTail(tokens);
  if (nulls !== void 0) return nulls;
  if (orderUsingTail(tokens)) return "number";
  const order2 = orderByPosition(tokens);
  if (order2 !== void 0) return order2;
  if (groupWithRollup(tokens)) return "withRollup";
  const group = groupByPosition(tokens);
  if (group !== void 0) return group;
  if (inListTail(tokens)) return "value";
  const operator = conditionOperator(tokens);
  if (operator !== void 0) return operator;
  let sawOpenParen = false;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (token.kind === "punct") {
      if (token.text === "(") sawOpenParen = true;
      continue;
    }
    if (token.kind !== "keyword") continue;
    if (token.lower === "values") return "value";
    if (token.lower === "insert") return sawOpenParen ? "column" : "any";
    if (token.lower === "into" && sawOpenParen && previousKeyword(tokens, index) === "insert") {
      return "column";
    }
    return EXPECTED_AFTER.get(token.lower) ?? "any";
  }
  return "any";
}
var ALIAS_STOPWORDS = /* @__PURE__ */ new Set([
  "tablesample",
  "pivot",
  "convert",
  "algorithm",
  "engine",
  "partition",
  "comment",
  "after"
]);
function aliasAt(tokens, index) {
  const token = tokens[index];
  if (token === void 0) return { next: index };
  if (token.kind === "keyword" && token.lower === "as") {
    const name2 = tokens[index + 1];
    if (name2 !== void 0 && name2.kind === "ident") return { alias: name2.text, next: index + 2 };
    return { name: void 0, next: index + 1 };
  }
  if (token.kind === "ident" && token.text.toLowerCase() !== "window" && !ALIAS_STOPWORDS.has(token.text.toLowerCase())) {
    return { alias: token.text, next: index + 1 };
  }
  return { next: index };
}
function stripSelectModifiers(tokens) {
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token.kind === "keyword" && (token.lower === "distinct" || token.lower === "all")) {
      index += 1;
      continue;
    }
    break;
  }
  return tokens.slice(index);
}
function topLevelTokens(tokens) {
  const flat = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.kind === "punct") {
      if (token.text === "(") {
        depth += 1;
        continue;
      }
      if (token.text === ")") {
        depth = Math.max(0, depth - 1);
        continue;
      }
    }
    if (depth === 0) flat.push(token);
  }
  return flat;
}
function selectItemAlias(tokens) {
  const flat = topLevelTokens(tokens);
  for (let index = 0; index < flat.length - 1; index += 1) {
    const token = flat[index];
    if (token.kind === "keyword" && token.lower === "as") {
      const name2 = flat[index + 1];
      if (name2.kind === "ident") return name2.text;
    }
  }
  const last = flat[flat.length - 1];
  const previous = flat[flat.length - 2];
  if (last === void 0 || last.kind !== "ident" || previous === void 0) return void 0;
  const aliasable = previous.kind === "ident" || previous.kind === "number" || previous.kind === "string" || previous.kind === "param";
  return aliasable ? last.text : void 0;
}
function selectItemColumn(tokens) {
  const flat = topLevelTokens(tokens);
  if (flat.length !== tokens.length) return void 0;
  for (const token of flat) {
    if (token.kind === "ident") continue;
    if (token.kind === "punct" && token.text === ".") continue;
    return void 0;
  }
  const last = flat[flat.length - 1];
  return last !== void 0 && last.kind === "ident" ? last.text : void 0;
}
function selectListColumns(items) {
  const groups = [];
  let depth = 0;
  let current = [];
  for (const token of items) {
    if (token.kind === "punct") {
      if (token.text === "(") depth += 1;
      else if (token.text === ")") depth = Math.max(0, depth - 1);
      else if (token.text === "," && depth === 0) {
        groups.push(current);
        current = [];
        continue;
      }
    }
    current.push(token);
  }
  if (current.length > 0 || groups.length === 0) groups.push(current);
  const columns = [];
  for (const raw of groups) {
    const group = stripSelectModifiers(raw);
    if (group.length === 0) continue;
    const flat = topLevelTokens(group);
    if (flat.some((token) => token.kind === "punct" && token.text === "*")) return void 0;
    const alias = selectItemAlias(group);
    if (alias !== void 0) {
      columns.push(alias);
      continue;
    }
    const column = selectItemColumn(group);
    if (column !== void 0) columns.push(column);
  }
  return columns.length > 0 ? columns : void 0;
}
function inferSelectColumns(body) {
  let depth = 0;
  let selectIndex = -1;
  for (let index = 0; index < body.length; index += 1) {
    const token = body[index];
    if (token.kind === "punct") {
      if (token.text === "(") depth += 1;
      else if (token.text === ")") depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0 || token.kind !== "keyword") continue;
    if (selectIndex < 0) {
      if (token.lower === "select") selectIndex = index;
      continue;
    }
    if (token.lower === "from" || token.lower === "into") {
      return selectListColumns(body.slice(selectIndex + 1, index));
    }
  }
  if (selectIndex < 0) return void 0;
  return selectListColumns(body.slice(selectIndex + 1));
}
function resolveCteSource(definition, known) {
  const source = definition.source;
  if (source === void 0 || source.schema !== void 0) return;
  const lower = source.table.toLowerCase();
  const target = known.find((cte) => cte.name.toLowerCase() === lower);
  if (target === void 0) return;
  delete definition.source;
  if (target.columns !== void 0) definition.columns = target.columns;
  else if (target.source !== void 0) definition.source = target.source;
}
function parseWith(tokens) {
  const none = { ctes: [], mainStart: 0 };
  const first = tokens[0];
  if (first === void 0 || first.kind !== "keyword" || first.lower !== "with") return none;
  let index = 1;
  const recursive = tokens[index];
  if (recursive !== void 0 && recursive.kind === "keyword" && recursive.lower === "recursive") {
    index += 1;
  }
  const ctes = [];
  for (; ; ) {
    const name2 = tokens[index];
    if (name2 === void 0 || name2.kind !== "ident") return none;
    index += 1;
    let explicit;
    const maybeOpen = tokens[index];
    if (maybeOpen !== void 0 && maybeOpen.kind === "punct" && maybeOpen.text === "(") {
      const columns2 = [];
      index += 1;
      let closed = false;
      while (index < tokens.length) {
        const token = tokens[index];
        index += 1;
        if (token.kind === "punct" && token.text === ")") {
          closed = true;
          break;
        }
        if (token.kind === "punct" && token.text === ",") continue;
        if (token.kind === "ident") {
          columns2.push(token.text);
          continue;
        }
        return none;
      }
      if (!closed) return none;
      if (columns2.length > 0) explicit = columns2;
    }
    const as = tokens[index];
    if (as === void 0 || as.kind !== "keyword" || as.lower !== "as") return none;
    index += 1;
    const open = tokens[index];
    if (open === void 0 || open.kind !== "punct" || open.text !== "(") return none;
    let depth = 0;
    let close = -1;
    for (let cursor = index; cursor < tokens.length; cursor += 1) {
      const token = tokens[cursor];
      if (token.kind !== "punct") continue;
      if (token.text === "(") depth += 1;
      else if (token.text === ")") {
        depth -= 1;
        if (depth === 0) {
          close = cursor;
          break;
        }
      }
    }
    if (close < 0) return none;
    const body = tokens.slice(index + 1, close);
    const cte = { name: name2.text };
    const columns = explicit ?? inferSelectColumns(body);
    if (columns !== void 0) {
      cte.columns = columns;
    } else {
      const source = starSource(body);
      if (source !== void 0) cte.source = source;
    }
    resolveCteSource(cte, ctes);
    ctes.push(cte);
    index = close + 1;
    const comma = tokens[index];
    if (comma !== void 0 && comma.kind === "punct" && comma.text === ",") {
      index += 1;
      continue;
    }
    break;
  }
  return { ctes, mainStart: index };
}
function parseRelationRef(tokens, index) {
  const token = tokens[index];
  if (token === void 0) return null;
  if (token.kind === "punct" && token.text === "(") {
    let depth = 0;
    let cursor2 = index;
    for (; cursor2 < tokens.length; cursor2 += 1) {
      const current = tokens[cursor2];
      if (current.kind !== "punct") continue;
      if (current.text === "(") depth += 1;
      else if (current.text === ")") {
        depth -= 1;
        if (depth === 0) {
          cursor2 += 1;
          break;
        }
      }
    }
    if (depth !== 0) return null;
    const body = tokens.slice(index + 1, Math.max(index + 1, cursor2 - 1));
    const alias2 = aliasAt(tokens, cursor2);
    const relation2 = { table: "" };
    let next = alias2.next;
    if (alias2.alias !== void 0) {
      relation2.alias = alias2.alias;
      const columnOpen = tokens[next];
      if (columnOpen !== void 0 && columnOpen.kind === "punct" && columnOpen.text === "(") {
        const renamed = [];
        let depth2 = 0;
        let at = next;
        for (; at < tokens.length; at += 1) {
          const current = tokens[at];
          if (current.kind === "punct" && current.text === "(") {
            depth2 += 1;
          } else if (current.kind === "punct" && current.text === ")") {
            depth2 -= 1;
            if (depth2 === 0) break;
          } else if (current.kind === "ident" && depth2 === 1) {
            renamed.push(current.text);
          }
        }
        if (renamed.length > 0 && at < tokens.length) {
          relation2.columns = renamed;
          next = at + 1;
        }
      }
    }
    if (relation2.columns === void 0) {
      const columns = inferSelectColumns(body);
      if (columns !== void 0) {
        relation2.columns = columns;
      } else {
        const source = starSource(body);
        if (source !== void 0) relation2.source = source;
      }
    }
    return { relation: relation2, next };
  }
  if (token.kind !== "ident") return null;
  const dot = tokens[index + 1];
  const after = tokens[index + 2];
  let relation;
  let cursor;
  if (dot !== void 0 && dot.kind === "punct" && dot.text === "." && after !== void 0 && after.kind === "ident") {
    relation = { schema: token.text, table: after.text };
    cursor = index + 3;
  } else {
    const call = tokens[index + 1];
    const previous = tokens[index - 1];
    if (call !== void 0 && call.kind === "punct" && call.text === "(" && previous !== void 0 && ["from", "join", "using"].includes(previous.text.toLowerCase())) {
      return null;
    }
    relation = { table: token.text };
    cursor = index + 1;
  }
  const alias = aliasAt(tokens, cursor);
  if (alias.alias !== void 0) relation.alias = alias.alias;
  return { relation, next: alias.next };
}
function attachCteColumns(relation, ctes) {
  if (ctes.length === 0) return relation;
  if (relation.table !== "") {
    const lower2 = relation.table.toLowerCase();
    const cte2 = ctes.find((definition) => definition.name.toLowerCase() === lower2);
    if (cte2 === void 0) return relation;
    if (cte2.columns !== void 0) relation.columns = cte2.columns;
    else if (cte2.source !== void 0) relation.source = cte2.source;
    return relation;
  }
  const source = relation.source;
  if (source === void 0 || source.schema !== void 0) return relation;
  const lower = source.table.toLowerCase();
  const cte = ctes.find((definition) => definition.name.toLowerCase() === lower);
  if (cte === void 0) return relation;
  if (cte.columns !== void 0) relation.columns = cte.columns;
  else if (cte.source !== void 0) relation.source = cte.source;
  return relation;
}
function relationKey(relation) {
  return [relation.schema ?? "", relation.table, relation.alias ?? ""].join("\0").toLowerCase();
}
function insertSelectTarget(tokens) {
  const first = tokens[0];
  if (first === void 0) return void 0;
  const head = first.text.toLowerCase();
  if (head !== "insert" && head !== "replace") return void 0;
  let into = -1;
  for (let index = 1; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "keyword" && token.lower === "into") {
      into = index;
      break;
    }
  }
  if (into < 0) return void 0;
  const parsed = parseRelationRef(tokens, into + 1);
  if (parsed === null) return void 0;
  const hasSelect = tokens.slice(parsed.next).some((token) => token.kind === "keyword" && token.lower === "select");
  return hasSelect ? parsed.relation : void 0;
}
function collectRelations(tokens, ctes = []) {
  const relations = [];
  const seen = /* @__PURE__ */ new Set();
  const push = (relation) => {
    const resolved = attachCteColumns(relation, ctes);
    if (resolved.table === "" && (resolved.alias === void 0 || resolved.alias === "")) return;
    const key = relationKey(resolved);
    if (seen.has(key)) return;
    seen.add(key);
    relations.push(resolved);
  };
  const indexOn = createIndexOn(tokens);
  if (indexOn >= 0) {
    const target = parseRelationRef(tokens, indexOn + 1);
    if (target !== null) push(target.relation);
  }
  const statementStart = tokens[0]?.text.toLowerCase();
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    if (statementStart === "merge" && token.kind === "keyword" && token.lower === "using") {
      const source = parseRelationRef(tokens, index + 1);
      if (source !== null) {
        push(source.relation);
        index = source.next;
        continue;
      }
    }
    if (token.kind === "keyword" && token.lower === "references") {
      const referenced = parseRelationRef(tokens, index + 1);
      if (referenced !== null) {
        push(referenced.relation);
        index = referenced.next;
        continue;
      }
    }
    if (token.kind === "keyword" && token.lower === "update") {
      const previous = tokens[index - 1];
      if (previous !== void 0 && previous.text.toLowerCase() === "for") {
        index += 1;
        continue;
      }
      if (statementStart === "insert" || statementStart === "replace") {
        index += 1;
        continue;
      }
    }
    if (token.kind !== "keyword" || !RELATION_STARTERS.has(token.lower)) {
      index += 1;
      continue;
    }
    let cursor = index + 1;
    if (token.lower === "table") {
      const ifToken = tokens[cursor];
      const nextToken = tokens[cursor + 1];
      const thirdToken = tokens[cursor + 2];
      if (ifToken?.kind === "ident" && ifToken.lower === "if") {
        if (nextToken?.kind === "keyword" && nextToken.lower === "not" && thirdToken?.kind === "keyword" && thirdToken.lower === "exists") {
          cursor += 3;
        } else if (nextToken?.kind === "keyword" && nextToken.lower === "exists") {
          cursor += 2;
        }
      }
    }
    const parsed = parseRelationRef(tokens, cursor);
    if (parsed !== null) {
      push(parsed.relation);
      cursor = parsed.next;
      if (token.lower === "from" || token.lower === "update") {
        for (; ; ) {
          const comma = tokens[cursor];
          if (comma === void 0 || comma.kind !== "punct" || comma.text !== ",") break;
          const next = parseRelationRef(tokens, cursor + 1);
          if (next === null) {
            cursor += 1;
            break;
          }
          push(next.relation);
          cursor = next.next;
        }
      }
    }
    index = Math.max(cursor, index + 1);
  }
  return relations;
}
function analyze(text2, caret) {
  const at = Math.max(0, Math.min(caret, text2.length));
  const maskedFull = maskCommentsAndStrings(text2);
  const bounds = statementBounds(maskedFull, at, text2.length);
  const statement = text2.slice(bounds.start, bounds.end);
  const masked = maskedFull.slice(bounds.start, bounds.end);
  const found = wordAtCaret(text2, at);
  const word = {
    start: found.start,
    end: found.end,
    prefix: found.prefix,
    quote: found.quote
  };
  const qualifier = qualifierBefore(text2, word.start);
  const tokens = tokenize2(statement);
  const caretRelative = at - bounds.start;
  const wordStartRelative = word.start - bounds.start;
  const before = tokens.filter(
    (token) => token.text !== "" && token.end <= wordStartRelative && token.start < caretRelative
  );
  const withClause = parseWith(before);
  const mainStatement = withClause.mainStart > 0 ? before.slice(withClause.mainStart) : before;
  const statementTokens = mainStatement.length > 0 ? mainStatement : before;
  const ctes = withClause.ctes.map((definition) => definition.name);
  const cteRelations = withClause.ctes.map((definition) => {
    const relation = { table: "", alias: definition.name };
    if (definition.columns !== void 0) relation.columns = definition.columns;
    else if (definition.source !== void 0) relation.source = definition.source;
    return relation;
  });
  let expectation = expectationAt(statementTokens);
  if (qualifier.length > 0 && expectation !== "schema") expectation = "column";
  const relations = collectRelations(statementTokens, withClause.ctes);
  const insertTarget = insertSelectTarget(statementTokens);
  const insertTargetKey = insertTarget === void 0 ? void 0 : relationKey(insertTarget);
  const duplicateAt = tokens.findIndex((token) => token.text.toLowerCase() === "duplicate");
  const afterDuplicate = duplicateAt >= 0 && caretRelative > (tokens[duplicateAt]?.start ?? Number.POSITIVE_INFINITY);
  if (insertTargetKey !== void 0) {
    const keepTarget = afterDuplicate && expectation === "column";
    const kept = relations.filter(
      (relation) => keepTarget ? relationKey(relation) === insertTargetKey : relationKey(relation) !== insertTargetKey
    );
    relations.length = 0;
    relations.push(...kept);
  }
  const referencesAt = statementTokens.findIndex(
    (token) => token.kind === "keyword" && token.lower === "references"
  );
  if (referencesAt >= 0) {
    const reference = parseRelationRef(statementTokens, referencesAt + 1);
    if (reference !== null) {
      let depth = 0;
      let sawParen = false;
      for (let cursor = reference.next; cursor < statementTokens.length; cursor += 1) {
        const token = statementTokens[cursor];
        if (token.kind !== "punct") continue;
        if (token.text === "(") {
          depth += 1;
          sawParen = true;
        } else if (token.text === ")" && depth > 0) {
          depth -= 1;
        }
      }
      if (sawParen && depth > 0) {
        relations.length = 0;
        relations.push(reference.relation);
      }
    }
  }
  const needsLaterRelations = qualifier.length > 0 || expectation === "column" && relations.length === 0;
  if (needsLaterRelations) {
    const remainder = tokens.filter((token) => token.start >= word.end - bounds.start);
    const seen = new Set(relations.map(relationKey));
    for (const relation of collectRelations(remainder, withClause.ctes)) {
      const key = relationKey(relation);
      if (key === insertTargetKey || seen.has(key)) continue;
      seen.add(key);
      relations.push(relation);
    }
  }
  const analysis = { masked, statement, relations, expectation, qualifier, word };
  if (isInsideCommentOrString(text2, at)) analysis.inLiteral = true;
  if (ctes.length > 0) analysis.ctes = ctes;
  if (cteRelations.length > 0) analysis.cteRelations = cteRelations;
  return analysis;
}

// src/client/completion/providers.ts
function tableDetail(table, schema) {
  if (table.kind === "view") return "视图";
  return schema === void 0 || schema === "" ? void 0 : schema;
}
function tableCandidates(tables, schema) {
  return tables.map((table) => {
    const item = { name: table.name, kind: "table" };
    const detail = tableDetail(table, schema);
    if (detail !== void 0) item.detail = detail;
    return item;
  });
}
function schemaCandidates(schemas) {
  return schemas.filter((name2) => name2 !== "").map((name2) => ({ name: name2, kind: "schema" }));
}
function columnCandidates(columns) {
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const column of columns) {
    if (column.name === "") continue;
    const key = column.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const item = { name: column.name, kind: "column" };
    if (column.typeName !== void 0) item.detail = column.typeName;
    items.push(item);
  }
  return items;
}
function starCandidate(insert, count = 0) {
  if (insert === void 0) return { name: "*", kind: "column", detail: "所有列" };
  return { name: "*", kind: "column", detail: `展开 ${count} 列`, insert };
}
var SNIPPETS = [
  { template: "SELECT * FROM ", detail: "查询模板" },
  { template: "SELECT COUNT(*) FROM ", detail: "计数模板" },
  { template: "INSERT INTO ", detail: "插入模板" },
  { template: "UPDATE ", detail: "更新模板" },
  { template: "DELETE FROM ", detail: "删除模板" },
  { template: "WITH ", detail: "CTE 模板" }
];
function snippetCandidates(dialect) {
  void dialect;
  return SNIPPETS.map((snippet) => ({
    name: snippet.template,
    kind: "snippet",
    detail: snippet.detail,
    insert: snippet.template
  }));
}
function cteCandidates(names) {
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const name2 of names) {
    if (name2 === "") continue;
    const key = name2.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ name: name2, kind: "table", detail: "CTE" });
  }
  return items;
}
function aliasCandidates(relations) {
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const relation of relations) {
    if (relation.alias === void 0 || relation.alias === "") continue;
    const key = relation.alias.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const detail = relation.table === "" ? "子查询" : relation.schema === void 0 || relation.schema === "" ? relation.table : `${relation.schema}.${relation.table}`;
    items.push({ name: relation.alias, kind: "alias", detail });
  }
  return items;
}

// src/client/completion/engine.ts
var MAX_COLUMN_RELATIONS = 6;
var MAX_JOIN_OWNERS = 3;
var MAX_JOIN_SUGGESTIONS = 3;
var KIND_LIMITS = {
  any: { table: 30 },
  relation: { table: 45 },
  alias: { table: 45 },
  column: { function: 25 }
};
var RELATION_VERBS = /* @__PURE__ */ new Set(["from", "join", "update", "into", "table"]);
function abortError() {
  return new DOMException("The completion request was aborted.", "AbortError");
}
function isAbortError(error) {
  if (typeof error !== "object" || error === null) return false;
  const name2 = error.name;
  return name2 === "AbortError";
}
function raceAbort(promise, signal) {
  if (signal === void 0) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener("abort", onAbort);
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      }
    );
  });
}
async function load(operation, signal, fallback) {
  if (signal?.aborted === true) throw abortError();
  try {
    return await raceAbort(operation(), signal);
  } catch (error) {
    if (isAbortError(error)) throw error;
    return fallback;
  }
}
async function tableCandidatesOf(request, schema) {
  const tables = await load(() => request.catalog.tables(schema), request.signal, []);
  return tableCandidates(tables, schema);
}
async function schemaNamesOf(request) {
  const schemas = await load(() => request.catalog.schemas(), request.signal, []);
  return schemaCandidates(schemas);
}
async function columnCandidatesOf(request, schema, table) {
  const columns = await load(
    () => request.catalog.columns(schema, table),
    request.signal,
    []
  );
  return columnCandidates(columns);
}
function atStatementStart(request, analysis) {
  if (analysis.word.prefix !== "") return false;
  const before = request.statement.slice(0, analysis.word.start);
  return before.slice(before.lastIndexOf(";") + 1).trim() === "";
}
function relationVerbAt(request, before) {
  const text2 = request.statement.slice(0, before);
  const start = text2.lastIndexOf(";") + 1;
  let verb;
  for (const token of tokenize2(text2.slice(start))) {
    if (token.kind === "keyword" && RELATION_VERBS.has(token.lower)) verb = token.lower;
  }
  return verb;
}
function singularForms(name2) {
  const lower = name2.toLowerCase();
  const forms = [lower];
  if (lower.endsWith("ies") && lower.length > 3) forms.push(`${lower.slice(0, -3)}y`);
  if (lower.endsWith("es") && lower.length > 2) forms.push(lower.slice(0, -2));
  if (lower.endsWith("s") && !lower.endsWith("ss")) forms.push(lower.slice(0, -1));
  return forms;
}
function sameRelationName(left, right) {
  const forms = new Set(singularForms(left));
  return singularForms(right).some((form) => forms.has(form));
}
function aliasForTable(table, taken) {
  const base = (table[0] ?? "t").toLowerCase();
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  let index = 2;
  while (taken.has(`${base}${index}`)) index += 1;
  const alias = `${base}${index}`;
  taken.add(alias);
  return alias;
}
function joinKeyColumn(columns, table) {
  const names = columns.map((column) => column.name).filter((name2) => name2 !== "");
  if (names.length === 0) return void 0;
  const id = names.find((name2) => name2.toLowerCase() === "id");
  if (id !== void 0) return id;
  const forms = new Set(singularForms(table));
  const foreignKey = names.find((name2) => {
    const lower = name2.toLowerCase();
    return lower.endsWith("_id") && forms.has(lower.slice(0, -3));
  });
  return foreignKey ?? names[0];
}
async function joinCandidates(request, relations) {
  try {
    const owners = relations.filter((relation) => relation.table !== "").slice(0, MAX_JOIN_OWNERS);
    if (owners.length === 0) return [];
    const tables = await load(
      () => request.catalog.tables(request.schema),
      request.signal,
      []
    );
    const referenced = new Set(relations.map((relation) => relation.table.toLowerCase()));
    const taken = /* @__PURE__ */ new Set();
    for (const relation of relations) {
      if (relation.alias !== void 0) taken.add(relation.alias.toLowerCase());
      if (relation.table !== "") taken.add(relation.table.toLowerCase());
    }
    const suggestions = [];
    const usedTargets = /* @__PURE__ */ new Set();
    for (const owner of owners) {
      const ownerColumns = owner.columns ?? (await load(
        () => request.catalog.columns(owner.schema ?? request.schema, owner.table),
        request.signal,
        []
      )).map((column) => column.name);
      for (const column of ownerColumns) {
        if (suggestions.length >= MAX_JOIN_SUGGESTIONS) break;
        const match = /^(.+)_id$/iu.exec(column);
        const base = match?.[1] ?? "";
        if (base === "") continue;
        const target = tables.find(
          (table) => !referenced.has(table.name.toLowerCase()) && !usedTargets.has(table.name.toLowerCase()) && sameRelationName(table.name, base)
        );
        if (target === void 0) continue;
        const targetColumns = await load(
          () => request.catalog.columns(request.schema, target.name),
          request.signal,
          []
        );
        const key = joinKeyColumn(targetColumns, target.name);
        if (key === void 0) continue;
        const alias = aliasForTable(target.name, taken);
        const ownerRef = owner.alias ?? owner.table;
        usedTargets.add(target.name.toLowerCase());
        suggestions.push({
          name: target.name,
          kind: "table",
          detail: `关联 ${owner.table}.${column}`,
          insert: `${target.name} ${alias} ON ${alias}.${key} = ${ownerRef}.${column}`
        });
      }
    }
    return suggestions;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}
async function relationColumnLists(request, relations, currentSchema) {
  const targets = [];
  const lookups = /* @__PURE__ */ new Map();
  for (const relation of relations) {
    if (relation.columns !== void 0) continue;
    const lookup = columnLookup(relation, currentSchema);
    if (lookup === void 0) continue;
    if (targets.length >= MAX_COLUMN_RELATIONS) break;
    targets.push(relation);
    lookups.set(relation, lookup);
  }
  const lists = await Promise.all(
    targets.map((relation) => {
      const lookup = lookups.get(relation);
      return load(
        () => request.catalog.columns(lookup.schema, lookup.table),
        request.signal,
        []
      );
    })
  );
  const fetched = /* @__PURE__ */ new Map();
  targets.forEach((relation, index) => {
    fetched.set(relation, lists[index] ?? []);
  });
  return relations.map((relation) => {
    if (relation.columns !== void 0) {
      return { relation, columns: relation.columns.map((name2) => ({ name: name2 })) };
    }
    if (!lookups.has(relation)) return { relation, columns: [] };
    return { relation, columns: fetched.get(relation) ?? [] };
  });
}
function referencedColumns(lists) {
  const seen = /* @__PURE__ */ new Set();
  const items = [];
  for (const { columns } of lists) {
    for (const item of columnCandidates(columns)) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
    }
  }
  return items;
}
function starExpansion(lists, dialect) {
  if (lists.length === 0) return void 0;
  const parts = [];
  for (const { relation, columns } of lists) {
    if (columns.length === 0) return void 0;
    const alias = relation.alias !== void 0 && relation.alias !== "" ? relation.alias : void 0;
    const bare = alias === void 0 && lists.length === 1;
    const ref = alias ?? relation.table;
    if (!bare && ref === "") return void 0;
    for (const column of columns) {
      const name2 = quotedIdentifier(column.name, dialect);
      parts.push(bare ? name2 : `${quotedIdentifier(ref, dialect)}.${name2}`);
    }
  }
  return { insert: parts.join(", "), count: parts.length };
}
function findRelation(relations, name2) {
  const lower = name2.toLowerCase();
  return relations.find(
    (relation) => relation.alias !== void 0 && relation.alias.toLowerCase() === lower
  ) ?? relations.find((relation) => relation.table !== "" && relation.table.toLowerCase() === lower);
}
function columnLookup(relation, currentSchema) {
  const source = relation.source;
  if (source !== void 0) {
    return { schema: source.schema ?? currentSchema, table: source.table };
  }
  if (relation.table !== "") {
    return { schema: relation.schema ?? currentSchema, table: relation.table };
  }
  return void 0;
}
async function qualifiedCandidates(request, qualifier, relations, cteRelations = []) {
  if (qualifier.length >= 2) {
    const schema = qualifier[qualifier.length - 2];
    const table = qualifier[qualifier.length - 1];
    return columnCandidatesOf(request, schema, table);
  }
  const name2 = qualifier[0];
  const relation = findRelation(relations, name2) ?? findRelation(cteRelations, name2);
  if (relation !== void 0 && relation.columns !== void 0) {
    return columnCandidates(relation.columns.map((column) => ({ name: column })));
  }
  if (relation !== void 0) {
    const lookup = columnLookup(relation, request.schema);
    if (lookup !== void 0) {
      const columns2 = await columnCandidatesOf(request, lookup.schema, lookup.table);
      if (columns2.length > 0) return columns2;
    }
    if (findRelation(relations, name2) === void 0) return [];
  }
  const columns = await columnCandidatesOf(request, request.schema, name2);
  if (columns.length > 0) return columns;
  return tableCandidatesOf(request, name2);
}
async function complete(request) {
  if (request.signal?.aborted === true) throw abortError();
  const analysis = analyze(request.statement, request.caret);
  if (analysis.inLiteral === true) return { items: [], analysis };
  const { expectation, qualifier, relations } = analysis;
  const dialect = request.dialect;
  let candidates;
  let priorities = prioritiesFor(expectation);
  if (qualifier.length > 0) {
    candidates = await qualifiedCandidates(request, qualifier, relations, analysis.cteRelations ?? []);
  } else {
    switch (expectation) {
      case "tableName": {
        const [tables, schemas] = await Promise.all([
          tableCandidatesOf(request, request.schema),
          schemaNamesOf(request)
        ]);
        candidates = [...tables, ...schemas];
        break;
      }
      case "relation": {
        const [tables, schemas] = await Promise.all([
          tableCandidatesOf(request, request.schema),
          schemaNamesOf(request)
        ]);
        const joins = relationVerbAt(request, analysis.word.start) === "join" ? await joinCandidates(request, relations) : [];
        candidates = [
          ...aliasCandidates(relations),
          ...cteCandidates(analysis.ctes ?? []),
          ...joins,
          ...tables,
          ...schemas,
          ...keywordCompletions("relation", dialect)
        ];
        if (joins.length > 0) priorities = { ...priorities, table: 0, alias: 1 };
        break;
      }
      case "column": {
        const lists = await relationColumnLists(request, relations, request.schema);
        const expansion = starExpansion(lists, dialect);
        candidates = [
          ...referencedColumns(lists),
          ...relations.some(
            (relation) => relation.table !== "" || relation.columns !== void 0
          ) ? [
            expansion === void 0 ? starCandidate() : starCandidate(expansion.insert, expansion.count)
          ] : [],
          ...functionCompletions(dialect),
          ...keywordCompletions("column", dialect)
        ];
        break;
      }
      case "schema": {
        candidates = [...await schemaNamesOf(request), ...keywordCompletions("schema", dialect)];
        break;
      }
      case "alias": {
        const tables = await tableCandidatesOf(request, request.schema);
        candidates = [
          ...aliasCandidates(relations),
          ...tables,
          ...keywordCompletions("alias", dialect)
        ];
        break;
      }
      case "value": {
        candidates = [...keywordCompletions("value", dialect), ...functionCompletions(dialect)];
        break;
      }
      case "definition": {
        candidates = [...keywordCompletions("definition", dialect)];
        break;
      }
      case "alter": {
        candidates = [...keywordCompletions("alter", dialect)];
        break;
      }
      case "alterObject": {
        candidates = [...keywordCompletions("alterObject", dialect)];
        break;
      }
      case "tableOptions": {
        candidates = [...keywordCompletions("tableOptions", dialect)];
        break;
      }
      case "number": {
        candidates = [];
        break;
      }
      case "engine": {
        candidates = ENGINE_NAMES.map((name2) => ({ name: name2, kind: "keyword" }));
        break;
      }
      case "set": {
        candidates = [...keywordCompletions("set", dialect)];
        break;
      }
      case "type": {
        candidates = [...keywordCompletions("type", dialect)];
        break;
      }
      case "columnType": {
        candidates = [...keywordCompletions("columnType", dialect)];
        break;
      }
      case "charset": {
        candidates = CHARSET_NAMES.map((name2) => ({ name: name2, kind: "keyword" }));
        break;
      }
      case "frame": {
        candidates = [...keywordCompletions("frame", dialect)];
        break;
      }
      case "interval": {
        candidates = [...keywordCompletions("interval", dialect)];
        break;
      }
      case "indexMethod": {
        candidates = [...keywordCompletions("indexMethod", dialect)];
        break;
      }
      case "name": {
        candidates = [];
        break;
      }
      case "statement": {
        candidates = [...keywordCompletions("statement", dialect)];
        break;
      }
      case "show": {
        candidates = [...keywordCompletions("show", dialect)];
        break;
      }
      case "comparison":
      case "boolean":
      case "direction":
      case "orderTail":
      case "expressionTail":
      case "groupTail":
      case "rollupTail":
      case "withRollup":
      case "alterDatabase":
      case "lockModeStart":
      case "lockMode":
      case "lockModePair":
      case "lockModeEnd":
      case "explainOption":
      case "typeAlter":
      case "typeAdd":
      case "insertTail":
      case "insertSource":
      case "insertOn":
      case "conflictAction":
      case "sampleMethod":
      case "fromTail":
      case "raise":
      case "raiseUsing":
      case "joinTail": {
        candidates = [...keywordCompletions(expectation, dialect)];
        break;
      }
      case "using": {
        const lists = await relationColumnLists(request, relations, request.schema);
        const [first, ...others] = lists;
        const shared = (first?.columns ?? []).filter(
          (column) => others.every(
            (list) => list.columns.some((other) => other.name.toLowerCase() === column.name.toLowerCase())
          )
        );
        candidates = columnCandidates(shared);
        break;
      }
      case "over": {
        candidates = [...keywordCompletions("over", dialect)];
        break;
      }
      case "privilege": {
        candidates = [...keywordCompletions("privilege", dialect)];
        break;
      }
      case "collation": {
        candidates = COLLATION_NAMES.map((name2) => ({ name: name2, kind: "keyword" }));
        break;
      }
      case "grantOption": {
        candidates = [...keywordCompletions("grantOption", dialect)];
        break;
      }
      case "grantOptionWord": {
        candidates = [...keywordCompletions("grantOptionWord", dialect)];
        break;
      }
      case "lock": {
        candidates = [...keywordCompletions("lock", dialect)];
        break;
      }
      case "lockTable":
      case "rowFormat":
      case "partition":
      case "transaction":
      case "transactionRead":
      case "transactionWith":
      case "rollbackTo":
      case "isolation":
      case "setTransaction":
      case "isolationLevel":
      case "isolationRead":
      case "nulls":
      case "alterColumnSet":
      case "alterColumnDrop":
      case "triggerTiming":
      case "triggerEvent":
      case "triggerOn":
      case "triggerFor":
      case "triggerEach":
      case "triggerRow":
      case "routineReturn":
      case "viewTail":
      case "eventOn":
      case "eventSchedule":
      case "eventTiming":
      case "eventTail":
      case "assignment":
      case "flush":
      case "reset":
      case "algorithm":
      case "lockOption":
      case "constraintType":
      case "intoTarget": {
        candidates = [...keywordCompletions(expectation, dialect)];
        break;
      }
      case "database": {
        candidates = [...await schemaNamesOf(request)];
        break;
      }
      case "keyword": {
        const snippets = atStatementStart(request, analysis) ? snippetCandidates(dialect) : [];
        candidates = [...snippets, ...keywordCompletions("keyword", dialect)];
        if (snippets.length > 0) priorities = { ...priorities, snippet: 0 };
        break;
      }
      case "any":
      default: {
        const [tables, schemas] = await Promise.all([
          tableCandidatesOf(request, request.schema),
          schemaNamesOf(request)
        ]);
        const snippets = atStatementStart(request, analysis) ? snippetCandidates(dialect) : [];
        candidates = [
          ...snippets,
          ...tables,
          ...schemas,
          ...keywordCompletions("any", dialect),
          ...functionCompletions(dialect)
        ];
        if (snippets.length > 0) priorities = { ...priorities, snippet: 0 };
        break;
      }
    }
  }
  if (request.signal?.aborted) throw abortError();
  const limits = KIND_LIMITS[expectation];
  const items = rank(candidates, analysis.word.prefix, 60, {
    priorities,
    recent: request.recent,
    frequency: request.frequency,
    ...limits === void 0 ? {} : { limits }
  });
  return { items, analysis };
}

// src/client/completion/catalog.ts
var CATALOG_TABLE_LIMIT = 64;
var CATALOG_COLUMN_LIMIT = 256;
var LruMap = class {
  constructor(limit) {
    this.limit = limit;
  }
  limit;
  entries = /* @__PURE__ */ new Map();
  get(key) {
    const value = this.entries.get(key);
    if (value !== void 0) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }
  set(key, value) {
    this.entries.delete(key);
    this.entries.set(key, value);
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) return;
      this.entries.delete(oldest.value);
    }
  }
  clear() {
    this.entries.clear();
  }
};
var ConsoleCompletionCatalog = class {
  /**
   * @param connectionId data source the console runs on
   * @param knownSchemas schemas the sidebar already loaded, used before
   *        falling back to a `/schema/list` round trip
   */
  constructor(connectionId, knownSchemas) {
    this.connectionId = connectionId;
    this.knownSchemas = knownSchemas;
  }
  connectionId;
  knownSchemas;
  schemaNames;
  tableCache = new LruMap(CATALOG_TABLE_LIMIT);
  columnCache = new LruMap(CATALOG_COLUMN_LIMIT);
  pending = /* @__PURE__ */ new Map();
  async schemas() {
    if (this.schemaNames !== void 0) return this.schemaNames;
    const known = this.knownSchemas();
    if (known.length > 0) {
      this.schemaNames = known;
      return known;
    }
    return this.shared("schemas", async () => {
      const cached = await this.cachedSchemas();
      if (cached !== void 0) {
        this.schemaNames = cached;
        return cached;
      }
      try {
        const listed = await api.schemas(this.connectionId);
        const names = listed.schemas.map((schema) => schema.name);
        this.schemaNames = names;
        return names;
      } catch {
        return [];
      }
    });
  }
  async tables(schema) {
    if (schema === "") return [];
    const cached = this.tableCache.get(schema);
    if (cached !== void 0) return cached;
    return this.shared(`tables:${schema}`, async () => {
      const hostCached = await this.cachedTables(schema);
      if (hostCached !== void 0) {
        this.tableCache.set(schema, hostCached);
        return hostCached;
      }
      try {
        const listed = await api.objects(this.connectionId, schema);
        const items = listed.objects.filter((item) => item.kind === "table" || item.kind === "view").map((item) => ({ name: item.name, kind: item.kind }));
        this.tableCache.set(schema, items);
        return items;
      } catch {
        this.tableCache.set(schema, []);
        return [];
      }
    });
  }
  async columns(schema, table) {
    if (schema === "" || table === "") return [];
    const key = `${schema}.${table}`;
    const cached = this.columnCache.get(key);
    if (cached !== void 0) return cached;
    return this.shared(`columns:${key}`, async () => {
      const hostCached = await this.cachedColumns(schema, table);
      if (hostCached !== void 0) {
        this.columnCache.set(key, hostCached);
        return hostCached;
      }
      try {
        const described = await api.describe(this.connectionId, schema, table, "table");
        const items = described.columns.map((column) => ({
          name: column.name,
          typeName: column.typeName
        }));
        this.columnCache.set(key, items);
        return items;
      } catch {
        this.columnCache.set(key, []);
        return [];
      }
    });
  }
  /** Drop every cached entry, for example after an explicit data-source refresh. */
  clear() {
    this.schemaNames = void 0;
    this.tableCache.clear();
    this.columnCache.clear();
    this.pending.clear();
  }
  /**
   * Read the cached schema names from the host. Undefined means the host cache
   * cannot answer, so the caller falls back to the server.
   */
  async cachedSchemas() {
    try {
      const data = await api.completionMetadata(this.connectionId);
      if (!data.cached || data.schemas.length === 0) return void 0;
      return data.schemas.map((schema) => schema.name);
    } catch {
      return void 0;
    }
  }
  /** Relation list from the host structure cache, or undefined when not cached. */
  async cachedTables(schema) {
    try {
      const data = await api.completionMetadata(this.connectionId, { schemas: [schema] });
      if (!data.cached) return void 0;
      const objects = data.tables[schema];
      if (objects === void 0) return void 0;
      return objects.filter((item) => item.kind === "table" || item.kind === "view").map((item) => ({ name: item.name, kind: item.kind }));
    } catch {
      return void 0;
    }
  }
  /** Column list from the host structure cache, or undefined when not cached. */
  async cachedColumns(schema, table) {
    try {
      const data = await api.completionMetadata(this.connectionId, { tables: [{ schema, table }] });
      if (!data.cached) return void 0;
      const columns = data.columns[`${schema}.${table}`];
      if (columns === void 0) return void 0;
      return columns.map((column) => ({ name: column.name, typeName: column.typeName }));
    } catch {
      return void 0;
    }
  }
  shared(key, load2) {
    const running = this.pending.get(key);
    if (running !== void 0) return running;
    const promise = load2().finally(() => {
      this.pending.delete(key);
    });
    this.pending.set(key, promise);
    return promise;
  }
};

// src/client/completionhistory.ts
var STORAGE_KEY2 = "dsh-ide-database:completion-history";
var FREQUENCY_KEY = "dsh-ide-database:completion-frequency";
var DEBUG_KEY = "dsh-ide-database:completion-debug";
var MAX_ENTRIES = 100;
var MAX_FREQUENCY_ENTRIES = 200;
var MAX_FREQUENCY_PARSED = 1e3;
function storage4() {
  try {
    return typeof localStorage === "undefined" ? void 0 : localStorage;
  } catch {
    return void 0;
  }
}
function recentCompletions() {
  const store = storage4();
  if (store === void 0) return [];
  try {
    const raw = store.getItem(STORAGE_KEY2);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const names = [];
    const seen = /* @__PURE__ */ new Set();
    for (const entry of parsed) {
      if (typeof entry !== "string" || entry === "") continue;
      const key = entry.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(entry);
    }
    return names.slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}
function rememberCompletion(name2) {
  if (name2 === "" || name2 === "*") return;
  const store = storage4();
  if (store === void 0) return;
  const lower = name2.toLowerCase();
  const next = [
    name2,
    ...recentCompletions().filter((entry) => entry.toLowerCase() !== lower)
  ];
  try {
    store.setItem(STORAGE_KEY2, JSON.stringify(next.slice(0, MAX_ENTRIES)));
  } catch {
    try {
      store.removeItem(STORAGE_KEY2);
    } catch {
    }
  }
  rememberPicks(store, name2);
}
function readPicks(store) {
  const picks = /* @__PURE__ */ new Map();
  try {
    const raw = store.getItem(FREQUENCY_KEY);
    if (raw === null) return picks;
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return picks;
    for (const [name2, value] of Object.entries(parsed)) {
      if (picks.size >= MAX_FREQUENCY_PARSED) break;
      if (name2 === "" || typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      picks.set(name2.toLowerCase(), Math.floor(value));
    }
  } catch {
    return picks;
  }
  return picks;
}
function completionFrequency() {
  const store = storage4();
  if (store === void 0) return {};
  const entries = [...readPicks(store)].sort((left, right) => right[1] - left[1]);
  const counts = /* @__PURE__ */ Object.create(null);
  for (const [name2, count] of entries.slice(0, MAX_FREQUENCY_ENTRIES)) counts[name2] = count;
  return counts;
}
function rememberPicks(store, name2) {
  const picks = readPicks(store);
  const key = name2.toLowerCase();
  picks.set(key, (picks.get(key) ?? 0) + 1);
  while (picks.size > MAX_FREQUENCY_ENTRIES) {
    let evict;
    let lowest = Number.POSITIVE_INFINITY;
    for (const [candidate, count] of picks) {
      if (candidate === key) continue;
      if (count < lowest) {
        lowest = count;
        evict = candidate;
      }
    }
    if (evict === void 0) break;
    picks.delete(evict);
  }
  try {
    store.setItem(FREQUENCY_KEY, JSON.stringify(Object.fromEntries(picks)));
  } catch {
    try {
      store.removeItem(FREQUENCY_KEY);
    } catch {
    }
  }
}
function completionDebugEnabled() {
  const store = storage4();
  if (store === void 0) return false;
  try {
    return store.getItem(DEBUG_KEY) === "1";
  } catch {
    return false;
  }
}
function logCompletionMetrics(elapsedMs, count, prefix) {
  if (!completionDebugEnabled()) return;
  console.debug(`[completion] ${elapsedMs} ms · ${count} 个候选 · 前缀 "${prefix}"`);
}

// src/client/pagedrows.ts
var MAX_BATCHES = 1e3;
async function collectRows(walk) {
  const batch = Math.max(1, Math.trunc(walk.batch));
  const limit = Math.max(0, Math.trunc(walk.limit));
  const rows = [];
  for (let page = 0; page < MAX_BATCHES && rows.length < limit; page += 1) {
    if (walk.cancelled?.() === true) break;
    const chunk = await walk.fetch({ page, offset: page * batch });
    rows.push(...chunk);
    walk.onProgress?.(rows.length);
    if (chunk.length < batch) break;
  }
  return rows.slice(0, limit);
}

// src/client/plan.ts
function planTextOf(plan) {
  if (plan === null || plan === void 0) return null;
  if (plan.columns.length !== 1 || plan.rows.length === 0) return null;
  const lines = plan.rows.map((row) => row[0] === null || row[0] === void 0 ? "" : String(row[0]));
  const text2 = lines.join("\n").trimEnd();
  if (text2 === "") return null;
  const looksLikeTree = lines.length > 1 || /(^|\n)\s*->/u.test(text2) || text2.includes("\n");
  return looksLikeTree ? text2 : null;
}

// src/client/sqlfile.ts
var MAX_SQL_IMPORT_BYTES = 2 * 1024 * 1024;
function mergeSqlFile(current, imported, caret) {
  const payload = imported.replace(/\r\n?/gu, "\n").replace(/^\s+|\s+$/gu, "");
  if (payload === "") return { text: current, caret };
  const position = Math.max(0, Math.min(Math.trunc(caret) || 0, current.length));
  const before = current.slice(0, position);
  const after = current.slice(position);
  const lead = before === "" || before.endsWith("\n") ? "" : "\n";
  const body = `${before}${lead}${payload}`;
  const text2 = after === "" ? `${body}
` : after.startsWith("\n") ? `${body}${after}` : `${body}
${after}`;
  return { text: text2, caret: body.length };
}
function scriptFileText(statement) {
  const body = statement.replace(/\r\n?/gu, "\n").replace(/\s+$/u, "");
  return body === "" ? "" : `${body}
`;
}

// src/client/sqlcomment.ts
var COMMENT = "--";
function toggleSqlComment(statement, start, end) {
  const length = statement.length;
  const from = Math.min(Math.max(0, Math.min(start, end)), length);
  let to = Math.min(Math.max(0, Math.max(start, end)), length);
  const blockStart = statement.lastIndexOf("\n", from - 1) + 1;
  const probe = to > from ? to - 1 : to;
  const breakAt = statement.indexOf("\n", probe);
  const blockEnd = breakAt < 0 ? length : breakAt;
  to = Math.max(from, to);
  const lines = statement.slice(blockStart, blockEnd).split("\n");
  const commentable = lines.filter((line) => line.trim() !== "");
  if (commentable.length === 0) {
    return { text: statement, selectionStart: from, selectionEnd: to };
  }
  const commented = commentable.every((line) => line.trimStart().startsWith(COMMENT));
  const next = lines.map((line) => {
    const match = /^(\s*)(.*)$/u.exec(line);
    if (match === null) return line;
    const indent = match[1] ?? "";
    const content = match[2] ?? "";
    if (content.trim() === "") return line;
    if (commented) {
      const body = content.slice(COMMENT.length);
      return `${indent}${body.startsWith(" ") ? body.slice(1) : body}`;
    }
    return `${indent}${COMMENT} ${content}`;
  });
  const block = next.join("\n");
  return {
    text: `${statement.slice(0, blockStart)}${block}${statement.slice(blockEnd)}`,
    selectionStart: blockStart,
    selectionEnd: blockStart + block.length
  };
}

// src/client/menugroups.tsx
var import_react20 = require("react");
var import_jsx_runtime18 = require("react/jsx-runtime");
var VIEWPORT_MARGIN = 8;
function MenuGroupList({ groups, extra, onClose }) {
  const [open, setOpen] = (0, import_react20.useState)(null);
  const flyouts = (0, import_react20.useRef)(/* @__PURE__ */ new Map());
  const anchors = (0, import_react20.useRef)(/* @__PURE__ */ new Map());
  const openGroup = (id, anchor) => {
    anchors.current.set(id, anchor);
    setOpen((current) => current !== null && current.id === id ? current : { id, flip: false });
  };
  (0, import_react20.useLayoutEffect)(() => {
    if (open === null || open.flip) return;
    const flyout = flyouts.current.get(open.id);
    const anchor = anchors.current.get(open.id);
    if (flyout === void 0 || anchor === void 0) return;
    const width = flyout.getBoundingClientRect().width;
    if (width <= 0) return;
    const rect = anchor.getBoundingClientRect();
    if (rect.right + width + VIEWPORT_MARGIN <= window.innerWidth) return;
    if (rect.left - width - VIEWPORT_MARGIN < 0) return;
    setOpen((current) => current === null || current.id !== open.id ? current : { id: open.id, flip: true });
  }, [open]);
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { className: "dshdb-menu dshdb-menu-groups", role: "menu", onClick: onClose, children: [
    groups.map((group) => /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { className: "dshdb-submenu-anchor", children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "button",
        {
          type: "button",
          role: "menuitem",
          "aria-haspopup": "menu",
          "aria-expanded": open?.id === group.id,
          className: "dshdb-submenu-trigger",
          onPointerEnter: (event) => openGroup(group.id, event.currentTarget),
          onFocus: (event) => openGroup(group.id, event.currentTarget),
          onClick: (event) => {
            event.stopPropagation();
            if (open?.id === group.id) setOpen(null);
            else openGroup(group.id, event.currentTarget);
          },
          children: group.label
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
        "span",
        {
          ref: (element) => {
            if (element === null) flyouts.current.delete(group.id);
            else flyouts.current.set(group.id, element);
          },
          className: "dshdb-menu dshdb-submenu",
          role: "group",
          "aria-label": group.label,
          "data-open": open?.id === group.id ? "true" : void 0,
          "data-flip": open?.id === group.id && open.flip ? "true" : void 0,
          children: group.leaves.map((leaf) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "button",
            {
              type: "button",
              role: "menuitem",
              disabled: leaf.disabled === true,
              onClick: leaf.onSelect,
              children: leaf.label
            },
            leaf.id
          ))
        }
      )
    ] }, group.id)),
    extra === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("button", { type: "button", role: "menuitem", onClick: extra.onSelect, children: extra.label })
  ] });
}

// src/client/console-view.tsx
var import_react21 = require("react");

// src/client/redissort.ts
var COLLATOR2 = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
function nextKeySort(current) {
  if (current === "none") return "asc";
  if (current === "asc") return "desc";
  return "none";
}
function sortKeys(keys, sort) {
  if (sort === "none") return keys;
  const sorted = [...keys];
  sorted.sort(
    (left, right) => sort === "asc" ? COLLATOR2.compare(left.key, right.key) : COLLATOR2.compare(right.key, left.key)
  );
  return sorted;
}
function sortKeysBySize(keys, sort) {
  if (sort === "none") return keys;
  const sorted = [...keys];
  sorted.sort((left, right) => {
    const leftSize = left.size ?? 0;
    const rightSize = right.size ?? 0;
    return sort === "asc" ? leftSize - rightSize : rightSize - leftSize;
  });
  return sorted;
}
function sortKeysByTtl(keys, sort) {
  if (sort === "none") return keys;
  const sorted = [...keys];
  const ttlOf = (info) => info.ttl === -1 ? Number.POSITIVE_INFINITY : info.ttl;
  sorted.sort((left, right) => {
    const leftTtl = ttlOf(left);
    const rightTtl = ttlOf(right);
    if (leftTtl === Number.POSITIVE_INFINITY || rightTtl === Number.POSITIVE_INFINITY) {
      if (leftTtl === rightTtl) return 0;
      return leftTtl === Number.POSITIVE_INFINITY ? 1 : -1;
    }
    return sort === "asc" ? leftTtl - rightTtl : rightTtl - leftTtl;
  });
  return sorted;
}

// src/client/console-view.tsx
var import_jsx_runtime19 = require("react/jsx-runtime");
function oneLine(statement) {
  return statement.replace(/\s+/gu, " ").trim();
}
function HistoryRow(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "dshdb-history-line", children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
      "button",
      {
        type: "button",
        className: "dshdb-history-row",
        title: props.entry.statement,
        onClick: () => props.onPick(props.entry),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "dshdb-history-sql", children: oneLine(props.entry.statement) }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "dshdb-history-time", children: historyAgo(props.entry.at) }),
          props.entry.rows === void 0 && props.entry.elapsedMs === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "dshdb-history-meta", children: props.entry.rows === void 0 ? formatMs(props.entry.elapsedMs ?? 0) : `${formatCount(props.entry.rows)} 行 · ${formatMs(props.entry.elapsedMs ?? 0)}` })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
      "button",
      {
        type: "button",
        className: "dshdb-history-copy",
        "aria-label": "复制语句",
        title: "复制语句",
        onClick: () => void copyText(props.entry.statement),
        children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(CopyIcon, { size: 11 })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
      "button",
      {
        type: "button",
        className: "dshdb-history-star",
        "data-pinned": props.pinned,
        "aria-label": props.pinned ? "取消收藏" : "收藏该语句",
        title: props.pinned ? "取消收藏" : "收藏该语句",
        onClick: () => props.onTogglePin(props.entry),
        children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(StarIcon, { size: 11, filled: props.pinned })
      }
    )
  ] });
}
var HistoryPanel = (0, import_react21.memo)(function HistoryPanel2(props) {
  const [query, setQuery] = (0, import_react21.useState)("");
  const [clearArmed, setClearArmed] = (0, import_react21.useState)(false);
  const historyCount = props.entries.length;
  (0, import_react21.useEffect)(() => {
    setClearArmed(false);
  }, [historyCount]);
  const needle = query.trim().toLowerCase();
  const matches = (entry) => needle === "" || entry.statement.toLowerCase().includes(needle);
  const pins = props.pins.filter(matches);
  const entries = props.entries.filter(matches);
  const searchable = props.pins.length + props.entries.length >= 6;
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "dshdb-history", children: [
    searchable ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "dshdb-history-search", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
      "input",
      {
        type: "search",
        className: "dshdb-input",
        "aria-label": "搜索历史语句",
        placeholder: "搜索历史语句",
        value: query,
        onChange: (event) => setQuery(event.target.value)
      }
    ) }) : null,
    pins.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "dshdb-history-group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "dshdb-history-head", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { className: "dshdb-history-title", children: [
        "收藏 · ",
        pins.length
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "dshdb-history-list", children: pins.map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        HistoryRow,
        {
          entry,
          pinned: true,
          onPick: props.onPick,
          onTogglePin: props.onTogglePin
        },
        `pin-${entry.at}-${index}`
      )) })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "dshdb-history-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { className: "dshdb-history-title", children: [
        "最近执行 · ",
        entries.length
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        Button,
        {
          size: "sm",
          variant: "ghost",
          icon: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(ClearIcon, { size: 12 }),
          title: clearArmed ? "再点一次就清空最近执行" : "清空最近执行",
          onClick: () => {
            if (!clearArmed) {
              setClearArmed(true);
              return;
            }
            setClearArmed(false);
            props.onClear();
          },
          children: clearArmed ? "确认清空" : "清空"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "dshdb-history-list", children: entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "dshdb-history-empty", children: needle === "" ? "还没有执行过语句" : "没有匹配的语句" }) : entries.map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
      HistoryRow,
      {
        entry,
        pinned: props.pins.some((item) => item.statement === entry.statement),
        onPick: props.onPick,
        onTogglePin: props.onTogglePin
      },
      `${entry.at}-${index}`
    )) })
  ] });
});
var KeyRow = (0, import_react21.memo)(function KeyRow2({
  info,
  index,
  active,
  onSelect,
  onMenu
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
    "tr",
    {
      "data-active": active,
      tabIndex: 0,
      onClick: () => onSelect(info),
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(info);
      },
      onContextMenu: (event) => onMenu(event, info),
      style: { cursor: "pointer" },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("td", { className: "dshdb-num", children: index + 1 }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("td", { title: info.key, children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "dshdb-mono", children: info.key }) }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(Tag, { children: info.type }) }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "td",
          {
            className: "dshdb-num",
            title: info.ttl === -1 ? "不过期" : info.ttl === -2 ? "已过期" : `${String(info.ttl)} 秒`,
            children: redisTtlLabel(info.ttl)
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("td", { className: "dshdb-num", children: info.size === void 0 ? "" : formatCount(info.size) })
      ]
    }
  );
});
var KeyGrid = (0, import_react21.memo)(function KeyGrid2({
  keys,
  selectedKey,
  emptyText,
  onSelect
}) {
  const [sort, setSort] = (0, import_react21.useState)("none");
  const [sizeSort, setSizeSort] = (0, import_react21.useState)("none");
  const [ttlSort, setTtlSort] = (0, import_react21.useState)("none");
  const [menu, setMenu] = (0, import_react21.useState)(null);
  const rows = (0, import_react21.useMemo)(
    () => sortKeysBySize(sortKeysByTtl(sortKeys(keys, sort), ttlSort), sizeSort),
    [keys, sort, sizeSort, ttlSort]
  );
  const rowsRef = (0, import_react21.useRef)(rows);
  rowsRef.current = rows;
  const openMenu = (0, import_react21.useCallback)((event, key) => {
    event.preventDefault();
    const items = [
      { label: "复制键名", run: () => void copyText(key.key) },
      {
        label: "复制可见键名（每行一个）",
        run: () => void copyText(rowsRef.current.map((info) => info.key).join("\n"))
      }
    ];
    setMenu({ ...placeMenu(event.clientX, event.clientY, items), items });
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("table", { className: "dshdb-grid", "aria-label": "Redis 键列表", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("th", { className: "dshdb-num", children: "#" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
          "th",
          {
            className: "dshdb-th-sortable",
            title: sort === "none" ? "按名称排序" : sort === "asc" ? "按名称倒序" : "恢复扫描顺序",
            "data-sorted": sort === "none" ? void 0 : sort,
            "aria-sort": sort === "asc" ? "ascending" : sort === "desc" ? "descending" : "none",
            onClick: () => setSort(nextKeySort(sort)),
            children: [
              "键",
              sort === "none" ? null : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "dshdb-sort-arrow", children: sort === "asc" ? "▲" : "▼" })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("th", { children: "类型" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
          "th",
          {
            className: "dshdb-th-sortable",
            title: ttlSort === "none" ? "按剩余时间升序" : ttlSort === "asc" ? "按剩余时间降序" : "恢复扫描顺序",
            "data-sorted": ttlSort === "none" ? void 0 : ttlSort,
            "aria-sort": ttlSort === "asc" ? "ascending" : ttlSort === "desc" ? "descending" : "none",
            onClick: () => setTtlSort(nextKeySort(ttlSort)),
            children: [
              "TTL",
              ttlSort === "none" ? null : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "dshdb-sort-arrow", children: ttlSort === "asc" ? "▲" : "▼" })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
          "th",
          {
            className: "dshdb-th-sortable",
            title: sizeSort === "none" ? "按长度升序" : sizeSort === "asc" ? "按长度降序" : "恢复扫描顺序",
            "data-sorted": sizeSort === "none" ? void 0 : sizeSort,
            "aria-sort": sizeSort === "asc" ? "ascending" : sizeSort === "desc" ? "descending" : "none",
            onClick: () => setSizeSort(nextKeySort(sizeSort)),
            children: [
              "长度",
              sizeSort === "none" ? null : /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: "dshdb-sort-arrow", children: sizeSort === "asc" ? "▲" : "▼" })
            ]
          }
        )
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("tbody", { children: rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("td", { className: "dshdb-muted", colSpan: 5, style: { padding: "10px 12px" }, children: emptyText ?? "没有匹配的键" }) }) : rows.map((key, index) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
        KeyRow,
        {
          info: key,
          index,
          active: key.key === selectedKey,
          onSelect,
          onMenu: openMenu
        },
        key.key
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(TreeMenu, { menu, onClose: () => setMenu(null) })
  ] });
});
function PagerButton({
  label,
  title,
  onClick,
  disabled
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { type: "button", className: "dshdb-pager-btn", title, "aria-label": title, onClick, disabled, children: label });
}

// src/client/CellValueModal.tsx
var import_react22 = require("react");
var import_jsx_runtime20 = require("react/jsx-runtime");
function CellValueModal({ view, onClose }) {
  const flash = useCopyFlash();
  (0, import_react22.useEffect)(() => {
    flash.reset();
  }, [flash.reset, view]);
  if (view === null) return null;
  const copy = async () => {
    flash.flash(await copyText(view.text));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
    Modal,
    {
      open: true,
      title: `${view.column} · 完整值`,
      onClose,
      width: 640,
      footer: /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(import_jsx_runtime20.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "dshdb-modal-foot-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(Button, { size: "sm", onClick: () => void copy(), children: flash.copied ? "已复制" : "复制" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(Button, { size: "sm", variant: "primary", onClick: onClose, children: "关闭" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("pre", { className: "dshdb-cellvalue", "aria-label": "单元格完整值", children: view.text })
    }
  );
}

// src/client/cellvalue.ts
function cellValueView(column, value) {
  if (value === null || value === void 0) return { column, text: "NULL", pretty: false };
  if (typeof value !== "string") return { column, text: formatCell(value), pretty: false };
  const text2 = prettyJsonText(value);
  return { column, text: text2, pretty: text2 !== value };
}

// src/client/pagesize.ts
var CONSOLE_PAGE_KEY = "dsh-ide-database.page-size.console.v1";
var TABLE_PAGE_KEY = "dsh-ide-database.page-size.table.v1";
function readPageSize(key, allowed, fallback) {
  return readAllowedNumber(key, allowed, fallback);
}
function writePageSize(key, size) {
  writeNumber(key, size);
}

// src/client/ConsoleTab.tsx
var import_jsx_runtime21 = require("react/jsx-runtime");
var REDIS_DB_CHOICES = Array.from({ length: 4096 }, (_, index) => index);
var REDIS_DB_KEY_PREFIX = "dsh-ide-database.redis-db.v1:";
var SCHEMA_KEY_PREFIX = "dsh-ide-database.schema.v1:";
var TTL_ONLY_KEY = "dsh-ide-database.redis.ttl-only.v1";
function composing(event) {
  return event.nativeEvent.isComposing === true;
}
function opensCompletion(previous, next) {
  if (next.length !== previous.length + 1) return false;
  let index = 0;
  while (index < previous.length && previous[index] === next[index]) index += 1;
  const typed = next.charAt(index);
  return typed !== "" && /[\w$.\u4e00-\u9fa5`"]/.test(typed);
}
var PAGE_SIZES = [200, 500, 1e3, 2e3, 5e3];
var ALL_PAGE_SIZE = 0;
var ALL_ROWS = 5e3;
var noTabInfo = () => void 0;
var EMPTY_COLUMNS = [];
var EMPTY_ROWS = [];
function failureText(error) {
  if (error instanceof ApiError) return { message: error.message, ...error.detail ? { detail: error.detail } : {} };
  return { message: error instanceof Error ? error.message : String(error) };
}
var EXPORT_BATCH = 2e3;
var EXPORT_LIMIT = 5e4;
async function withConnection(id, action) {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-connected") {
      await api.connect(id);
      return await action();
    }
    throw error;
  }
}
async function queryWithRetry(id, sql, maxRows, allowWrite, stmtKey, schema = "") {
  return withConnection(
    id,
    () => api.query({ id, sql, maxRows, allowWrite, stmtKey, ...schema === "" ? {} : { schema } })
  );
}
function ConsoleBody({ initialConnectionId, initialSchema, initialSql }) {
  const [connections, setConnections] = (0, import_react23.useState)([]);
  const [settings, setSettings] = (0, import_react23.useState)(null);
  const [selectedId, setSelectedId] = (0, import_react23.useState)(initialConnectionId ?? "");
  const [loadError, setLoadError] = (0, import_react23.useState)("");
  const [schema, setSchema] = (0, import_react23.useState)(initialSchema ?? "");
  const [schemas, setSchemas] = (0, import_react23.useState)([]);
  const [redisDb, setRedisDb] = (0, import_react23.useState)(null);
  const [redisDatabases, setRedisDatabases] = (0, import_react23.useState)(null);
  const [statement, setStatement2] = (0, import_react23.useState)(initialSql ?? "");
  const seededStatement = (0, import_react23.useRef)(initialSql !== void 0 && initialSql !== "");
  const [result, setResult] = (0, import_react23.useState)(null);
  const [failure, setFailure] = (0, import_react23.useState)(null);
  const [running, setRunning] = (0, import_react23.useState)(false);
  const [page, setPage] = (0, import_react23.useState)(0);
  const [pageSize, setPageSize] = (0, import_react23.useState)(() => readPageSize(CONSOLE_PAGE_KEY, PAGE_SIZES, 500));
  const [pageDraft, setPageDraft] = (0, import_react23.useState)("1");
  const [pageFallback, setPageFallback] = (0, import_react23.useState)(false);
  const recoveringPage = (0, import_react23.useRef)(false);
  const [rowFilter, setRowFilter] = (0, import_react23.useState)("");
  const [base, setBase] = (0, import_react23.useState)("");
  const [sourceSql, setSourceSql] = (0, import_react23.useState)("");
  const [rowSort, setRowSort] = (0, import_react23.useState)(null);
  const [selectedRows, setSelectedRows] = (0, import_react23.useState)(() => /* @__PURE__ */ new Set());
  const selectionAnchor = (0, import_react23.useRef)(null);
  const shownRowsRef = (0, import_react23.useRef)([]);
  const selectRow = (0, import_react23.useCallback)((rowIndex, extend) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (extend && selectionAnchor.current !== null) {
        const from = Math.min(selectionAnchor.current, rowIndex);
        const to = Math.max(selectionAnchor.current, rowIndex);
        for (let index = from; index <= to; index += 1) next.add(index);
        return next;
      }
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
    selectionAnchor.current = rowIndex;
  }, []);
  const toggleAllRows = (0, import_react23.useCallback)(() => {
    const rows2 = shownRowsRef.current;
    setSelectedRows((current) => current.size === rows2.length ? /* @__PURE__ */ new Set() : new Set(rows2.map((_, index) => index)));
  }, []);
  const [columnOrder, setColumnOrder] = (0, import_react23.useState)(null);
  const [hiddenColumns, setHiddenColumns] = (0, import_react23.useState)(() => readHidden("console:sql"));
  const [cellView, setCellView] = (0, import_react23.useState)(null);
  const [exportOpen, setExportOpen] = (0, import_react23.useState)(false);
  const [exportNote, setExportNote] = (0, import_react23.useState)("");
  const noteCopied = (0, import_react23.useCallback)(
    (label) => (ok) => {
      setExportNote(ok ? `${label} 已复制` : "复制失败：这个环境不允许访问剪贴板");
    },
    []
  );
  (0, import_react23.useEffect)(() => {
    if (exportNote === "") return void 0;
    const timer = setTimeout(() => setExportNote(""), 2500);
    return () => clearTimeout(timer);
  }, [exportNote]);
  const exportCancelled = (0, import_react23.useRef)(false);
  const [exporting, setExporting] = (0, import_react23.useState)(false);
  const exportAnchor = (0, import_react23.useRef)(null);
  const closeExport = (0, import_react23.useCallback)(() => setExportOpen(false), []);
  usePopoverDismiss(exportOpen, closeExport, exportAnchor);
  const actionOrder = useConsoleActionOrder();
  const [visibleActions, setVisibleActions] = (0, import_react23.useState)(actionOrder.length);
  const [overflowOpen, setOverflowOpen] = (0, import_react23.useState)(false);
  const actionsRef = (0, import_react23.useRef)(null);
  const overflowWrapRef = (0, import_react23.useRef)(null);
  const visibleExportWrapRef = (0, import_react23.useRef)(null);
  const closeOverflow = (0, import_react23.useCallback)(() => setOverflowOpen(false), []);
  usePopoverDismiss(overflowOpen, closeOverflow, overflowWrapRef);
  const measureToolbar = (0, import_react23.useCallback)(() => {
    const container = actionsRef.current;
    if (container === null) return;
    const slots = Array.from(container.querySelectorAll("[data-console-action]"));
    const widths = slots.map((slot) => slot.getBoundingClientRect().width || slot.offsetWidth);
    const overflowSlot = container.querySelector("[data-console-overflow]");
    const overflowWidth = overflowSlot === null ? 0 : overflowSlot.getBoundingClientRect().width || overflowSlot.offsetWidth;
    const next = fitActionCount(widths, container.clientWidth, overflowWidth);
    setVisibleActions((previous) => previous === next ? previous : next);
    if (next === actionOrder.length) setOverflowOpen((open) => open ? false : open);
  }, [actionOrder.length]);
  (0, import_react23.useLayoutEffect)(() => {
    measureToolbar();
  });
  (0, import_react23.useEffect)(() => {
    const container = actionsRef.current;
    if (container === null || typeof ResizeObserver === "undefined") return void 0;
    const observer = new ResizeObserver(() => measureToolbar());
    observer.observe(container);
    return () => observer.disconnect();
  }, [measureToolbar]);
  (0, import_react23.useLayoutEffect)(() => {
    exportAnchor.current = actionOrder.indexOf("export") < visibleActions ? visibleExportWrapRef.current : overflowWrapRef.current;
  });
  const [multiProgress, setMultiProgress] = (0, import_react23.useState)(null);
  const [multiNote, setMultiNote] = (0, import_react23.useState)("");
  const [scriptResults, setScriptResults] = (0, import_react23.useState)([]);
  const [scriptIndex, setScriptIndex] = (0, import_react23.useState)(0);
  const [pattern, setPattern] = (0, import_react23.useState)("*");
  const [scanType, setScanType] = (0, import_react23.useState)("");
  const [ttlOnly, setTtlOnly] = (0, import_react23.useState)(() => readFlag(TTL_ONLY_KEY, false));
  const [scanMs, setScanMs] = (0, import_react23.useState)(null);
  const [keyFilter, setKeyFilter] = (0, import_react23.useState)("");
  const [scan, setScan] = (0, import_react23.useState)(null);
  const [scanning, setScanning] = (0, import_react23.useState)(false);
  const [scanQuery, setScanQuery] = (0, import_react23.useState)(null);
  const [selectedKey, setSelectedKey] = (0, import_react23.useState)("");
  const [value, setValue] = (0, import_react23.useState)(null);
  const [valueError, setValueError] = (0, import_react23.useState)(null);
  const [valueRetry, setValueRetry] = (0, import_react23.useState)(null);
  const lastCommand = (0, import_react23.useRef)(null);
  const [command, setCommand] = (0, import_react23.useState)("");
  const [commandRunning, setCommandRunning] = (0, import_react23.useState)(false);
  const [commandResult, setCommandResult] = (0, import_react23.useState)(null);
  const [confirm, setConfirm] = (0, import_react23.useState)(null);
  const [history, setHistory] = (0, import_react23.useState)(() => readHistory("sql"));
  const [pins, setPins] = (0, import_react23.useState)(() => readPins("sql"));
  const [historyKindSeen, setHistoryKindSeen] = (0, import_react23.useState)("sql");
  const [historyOpen, setHistoryOpen] = (0, import_react23.useState)(false);
  const stmtRef = (0, import_react23.useRef)("");
  const runToken = (0, import_react23.useRef)(0);
  const runningRef = (0, import_react23.useRef)(0);
  const planToken = (0, import_react23.useRef)(0);
  const resultBeforePlan = (0, import_react23.useRef)(null);
  const lastRun = (0, import_react23.useRef)(null);
  const lastAttempt = (0, import_react23.useRef)(null);
  const inputRef = (0, import_react23.useRef)(null);
  const completeId = (0, import_react23.useId)();
  const filterRef = (0, import_react23.useRef)(null);
  const fileInputRef = (0, import_react23.useRef)(null);
  const [selectedRun, setSelectedRun] = (0, import_react23.useState)(false);
  const [planRunning, setPlanRunning] = (0, import_react23.useState)(false);
  const [plan, setPlan] = (0, import_react23.useState)(null);
  const [tx, setTx] = (0, import_react23.useState)("idle");
  const [txBusy, setTxBusy] = (0, import_react23.useState)(false);
  const [txNote, setTxNote] = (0, import_react23.useState)("");
  const scanCursorRef = (0, import_react23.useRef)("0");
  const redisDatabasesLoaded = (0, import_react23.useRef)(false);
  const recallRef = (0, import_react23.useRef)(-1);
  const recallDraft = (0, import_react23.useRef)("");
  const connection = connections.find((item) => item.id === selectedId);
  const isRedis = connection?.dialect === "redis";
  const historyKind = isRedis ? "redis" : "sql";
  if (historyKindSeen !== historyKind) {
    setHistoryKindSeen(historyKind);
    setHistory(readHistory(historyKind));
    setPins(readPins(historyKind));
    setHistoryOpen(false);
    recallRef.current = -1;
  }
  const activeRedisDb = redisDb ?? connection?.redisDb ?? 0;
  const configuredDb = connection?.redisDb ?? 0;
  (0, import_react23.useEffect)(() => {
    if (!isRedis || selectedId === "") return;
    setRedisDb(readAllowedNumber(`${REDIS_DB_KEY_PREFIX}${selectedId}`, REDIS_DB_CHOICES, configuredDb));
  }, [configuredDb, isRedis, selectedId]);
  (0, import_react23.useEffect)(() => {
    if (!isRedis || redisDatabases === null || redisDb === null) return;
    if (redisDb < redisDatabases) return;
    const fallback = Math.min(Math.max(configuredDb, 0), redisDatabases - 1);
    setRedisDb(fallback);
    if (selectedId !== "") writeNumber(`${REDIS_DB_KEY_PREFIX}${selectedId}`, fallback);
  }, [configuredDb, isRedis, redisDatabases, redisDb, selectedId]);
  const defaultSchema = connection === void 0 ? "" : connection.dialect === "mysql" || connection.dialect === "generic" ? connection.database : connection.dialect === "postgres" ? "public" : connection.dialect === "sqlite" ? "main" : connection.dialect === "mssql" ? "dbo" : connection.user;
  (0, import_react23.useEffect)(() => {
    if (schema === "" || schema === defaultSchema || schemas.length === 0) return;
    if (schemas.some((item) => item.name === schema)) return;
    setSchema(defaultSchema);
    if (selectedId !== "") writeText(`${SCHEMA_KEY_PREFIX}${selectedId}`, defaultSchema);
  }, [defaultSchema, schema, schemas, selectedId]);
  const askConfirm = (0, import_react23.useCallback)((message, detail) => {
    return new Promise((resolve) => {
      setConfirm({
        request: { title: "确认执行", message, detail, danger: true, confirmLabel: "执行" },
        resolve
      });
    });
  }, []);
  const resolveConfirm = (ok) => {
    confirm?.resolve(ok);
    setConfirm(null);
  };
  (0, import_react23.useEffect)(() => {
    let alive = true;
    void (async () => {
      try {
        const status = await api.status();
        if (!alive) return;
        setConnections(status.config.connections);
        setSettings(status.config.settings);
        setConsoleActionOrder(status.config.settings.consoleActions);
        setConsoleAutoComplete(status.config.settings.consoleAutoComplete !== false);
        setSelectedId((previous) => {
          if (previous !== "" && status.config.connections.some((item) => item.id === previous)) return previous;
          return status.config.connections[0]?.id ?? "";
        });
      } catch (error) {
        if (alive) setLoadError(failureText(error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  const toggleStatementPin = (0, import_react23.useCallback)((entry) => {
    togglePin(historyKind, entry.statement);
    setPins(readPins(historyKind));
  }, [historyKind]);
  const clearStatementHistory = (0, import_react23.useCallback)(() => {
    setHistory(clearHistory("sql"));
    recallRef.current = -1;
  }, []);
  const clearCommandHistory = (0, import_react23.useCallback)(() => {
    setHistory(clearHistory("redis"));
    recallRef.current = -1;
  }, []);
  const loadSchemaList = (0, import_react23.useCallback)(async (id) => {
    if (id === "") return;
    try {
      const list = await api.schemas(id);
      setSchemas(list.schemas);
    } catch {
    }
  }, []);
  (0, import_react23.useEffect)(() => {
    if (selectedId === "" || isRedis) return;
    void loadSchemaList(selectedId);
  }, [isRedis, loadSchemaList, selectedId]);
  (0, import_react23.useEffect)(() => {
    if (selectedId === "" || schema === "" || schemas.length === 0) return;
    const insensitive = connection?.dialect === "mysql" || connection?.dialect === "generic";
    const known = schemas.some(
      (item) => insensitive ? item.name.toLowerCase() === schema.toLowerCase() : item.name === schema
    );
    if (known) return;
    setSchema(defaultSchema);
    writeText(`${SCHEMA_KEY_PREFIX}${selectedId}`, defaultSchema);
  }, [connection?.dialect, defaultSchema, schema, schemas, selectedId]);
  const [caretPos, setCaretPos] = (0, import_react23.useState)(0);
  const [suggestions, setSuggestions] = (0, import_react23.useState)(null);
  const [suggestionIndex, setSuggestionIndex] = (0, import_react23.useState)(0);
  const completionAnchor = (0, import_react23.useRef)(null);
  const completionCatalog = (0, import_react23.useRef)(null);
  const completionRequest = (0, import_react23.useRef)(0);
  const completionAbort = (0, import_react23.useRef)(null);
  const autoComplete2 = useConsoleAutoComplete();
  const autoCompletePending = (0, import_react23.useRef)(false);
  const suggestionSnapshot = (0, import_react23.useRef)(null);
  const closeSuggestions = (0, import_react23.useCallback)(() => setSuggestions(null), []);
  usePopoverDismiss(suggestions !== null, closeSuggestions, completionAnchor);
  const suggestionPrefix = wordAtCaret(statement, caretPos).prefix;
  const suggestionItems = suggestions === null ? [] : suggestions.filter((item) => matchScore(item.name, suggestionPrefix) >= 0);
  const activeSuggestionIndex = suggestionItems.length === 0 ? 0 : suggestionIndex % suggestionItems.length;
  (0, import_react23.useEffect)(() => {
    if (suggestions === null) return;
    const active = completionAnchor.current?.querySelector(".dshdb-complete-active");
    if (active !== null && active !== void 0 && typeof active.scrollIntoView === "function") {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeSuggestionIndex, suggestions]);
  (0, import_react23.useEffect)(() => {
    completionCatalog.current = null;
    completionAbort.current?.abort();
  }, [connection?.id]);
  const openSuggestions = (0, import_react23.useCallback)(async (options) => {
    if (connection === void 0 || connection.dialect === "redis") return;
    const target = schema !== "" ? schema : defaultSchema;
    const catalog = completionCatalog.current ?? new ConsoleCompletionCatalog(connection.id, () => schemas.map((item) => item.name));
    completionCatalog.current = catalog;
    completionAbort.current?.abort();
    const controller = new AbortController();
    completionAbort.current = controller;
    const request = ++completionRequest.current;
    const started = performance.now();
    try {
      const result2 = await complete({
        statement,
        caret: caretPos,
        dialect: connection.dialect,
        schema: target,
        catalog,
        recent: recentCompletions(),
        frequency: completionFrequency(),
        signal: controller.signal
      });
      if (request !== completionRequest.current) return;
      logCompletionMetrics(
        Math.round(performance.now() - started),
        result2.items.length,
        result2.analysis.word.prefix
      );
      if (result2.analysis.inLiteral === true) {
        setSuggestions(null);
        return;
      }
      if (options?.silentWhenEmpty === true && result2.items.length === 0) return;
      setSuggestionIndex(0);
      suggestionSnapshot.current = { statement, caret: caretPos };
      setSuggestions(result2.items);
    } catch (error) {
      if (request !== completionRequest.current || controller.signal.aborted) return;
      setFailure(failureText(error));
    }
  }, [caretPos, connection, defaultSchema, schema, schemas, statement]);
  const insertSuggestion = (0, import_react23.useCallback)(
    (picked) => {
      const next = applyCompletion(
        statement,
        caretPos,
        picked.insert ?? picked.name,
        connection?.dialect ?? "mysql",
        picked.kind
      );
      setSelectedRun(false);
      setStatement2(next.statement);
      setSuggestions(null);
      if (picked.kind !== "snippet" && picked.name !== "*") rememberCompletion(picked.name);
      setCaretPos(next.caret);
      setTimeout(() => {
        const area = inputRef.current;
        if (area === null) return;
        area.focus();
        area.setSelectionRange(next.caret, next.caret);
      }, 0);
    },
    [caretPos, connection, statement]
  );
  (0, import_react23.useEffect)(() => {
    if (suggestions !== null) {
      autoCompletePending.current = false;
      const fetched = suggestionSnapshot.current;
      if (fetched !== null && fetched.statement === statement && fetched.caret === caretPos) return;
      const refresh = window.setTimeout(() => {
        void openSuggestions();
      }, 120);
      return () => window.clearTimeout(refresh);
    }
    if (!autoComplete2 || !autoCompletePending.current) return;
    const timer = window.setTimeout(() => {
      autoCompletePending.current = false;
      const word = wordAtCaret(statement, caretPos);
      if (word.quote === "" && /^\d/u.test(word.prefix)) return;
      void openSuggestions({ silentWhenEmpty: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [autoComplete2, caretPos, openSuggestions, statement, suggestions]);
  const execute = (0, import_react23.useCallback)(
    async (target) => {
      setRowSort(null);
      setRowFilter("");
      setScriptResults([]);
      resultBeforePlan.current = null;
      const text2 = target.statement.trim();
      if (text2 === "" || selectedId === "") return;
      if (runningRef.current > 0 && target.fallback !== true) return;
      runningRef.current += 1;
      const token = ++runToken.current;
      const stmtKey = `console-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      stmtRef.current = stmtKey;
      setRunning(true);
      setPlan(null);
      setFailure(null);
      setMultiNote("");
      try {
        const paged = pageable(text2, sqlDialectOf(connection?.dialect));
        const showAll = target.size === ALL_PAGE_SIZE;
        const sqlText = paged && !showAll ? wrapPage(connection?.dialect ?? "mysql", text2, target.size, target.page) : text2;
        const maxRows = showAll ? ALL_ROWS : target.size;
        const next = await queryWithRetry(selectedId, sqlText, maxRows, target.allowWrite, stmtKey, schema);
        if (token !== runToken.current) return;
        if (paged && !showAll && target.page > 0 && next.rows.length === 0) {
          recoveringPage.current = true;
          setPageFallback(true);
          void execute({ statement: text2, page: 0, size: target.size, allowWrite: target.allowWrite, fallback: true });
          return;
        }
        setResult(next);
        if (recoveringPage.current) recoveringPage.current = false;
        else setPageFallback(false);
        setPage(paged && !showAll ? target.page : 0);
        setBase(paged ? text2 : "");
        setSourceSql(text2);
        lastRun.current = { rows: next.rows.length, elapsedMs: next.elapsedMs };
        if (looksLikeDdl(text2, sqlDialectOf(connection?.dialect))) {
          completionCatalog.current?.clear();
          void loadSchemaList(selectedId);
        }
      } catch (error) {
        if (token !== runToken.current) return;
        setResult(null);
        setFailure(failureText(error));
      } finally {
        runningRef.current = Math.max(0, runningRef.current - 1);
        if (token === runToken.current) setRunning(false);
      }
    },
    [connection?.dialect, loadSchemaList, schema, selectedId]
  );
  const executeScript = async (parts) => {
    setRowSort(null);
    setRowFilter("");
    setScriptResults([]);
    if (selectedId === "") return;
    if (runningRef.current > 0) return;
    runningRef.current += 1;
    const token = ++runToken.current;
    setRunning(true);
    setPlan(null);
    setFailure(null);
    setMultiNote("");
    setExportOpen(false);
    const collected = [];
    let last = null;
    try {
      for (const [index, part] of parts.entries()) {
        if (token !== runToken.current) return;
        setMultiProgress({ index: index + 1, total: parts.length });
        const stmtKey = `console-${Date.now().toString(36)}-${index}`;
        stmtRef.current = stmtKey;
        try {
          last = await queryWithRetry(
            selectedId,
            part,
            pageSize === ALL_PAGE_SIZE ? ALL_ROWS : pageSize,
            looksLikeWrite(part, sqlDialectOf(connection?.dialect)),
            stmtKey,
            schema
          );
          if (token !== runToken.current) return;
          collected.push(last);
        } catch (error) {
          if (token !== runToken.current) return;
          setScriptResults(collected);
          setScriptIndex(Math.max(0, collected.length - 1));
          const failure2 = failureText(error);
          setFailure({ message: `第 ${index + 1}/${parts.length} 条语句执行失败：${failure2.message}`, detail: failure2.detail ?? part });
          if (last !== null) {
            setResult(last);
            setPage(0);
            setBase("");
          }
          return;
        }
      }
      if (token !== runToken.current) return;
      setResult(last);
      setScriptResults(collected);
      setScriptIndex(Math.max(0, collected.length - 1));
      setPage(0);
      setBase("");
      setSourceSql(parts[parts.length - 1] ?? "");
      setMultiNote(`已顺序执行 ${parts.length} 条语句`);
      setHistory(pushHistory("sql", parts.join(";\n")));
      if (last !== null) setHistory(annotateHistory("sql", parts.join(";\n"), { rows: last.rows.length, elapsedMs: last.elapsedMs }));
      if (parts.some((part) => looksLikeDdl(part, sqlDialectOf(connection?.dialect)))) {
        completionCatalog.current?.clear();
        void loadSchemaList(selectedId);
      }
    } finally {
      runningRef.current = Math.max(0, runningRef.current - 1);
      setMultiProgress(null);
      if (token === runToken.current) setRunning(false);
    }
  };
  const importSqlFile = async (file) => {
    if (file === void 0) return;
    if (file.size > MAX_SQL_IMPORT_BYTES) {
      setFailure({ message: `文件过大：${file.name}（上限 ${String(MAX_SQL_IMPORT_BYTES / 1024 / 1024)} MB）` });
      return;
    }
    try {
      const imported = await file.text();
      const area = inputRef.current;
      const merged = mergeSqlFile(statement, imported, area?.selectionStart ?? statement.length);
      if (merged.text === statement) {
        setFailure({ message: `文件里没有可导入的 SQL：${file.name}` });
        return;
      }
      setSelectedRun(false);
      setFailure(null);
      setStatement2(merged.text);
      window.setTimeout(() => {
        area?.focus();
        area?.setSelectionRange(merged.caret, merged.caret);
      }, 0);
    } catch (error) {
      setFailure(failureText(error));
    }
  };
  const saveSqlFile = () => {
    const script = scriptFileText(statement);
    if (script === "") return;
    setFailure(null);
    downloadText(exportFilename("", "console", "sql"), "application/sql", script);
  };
  const runText = async (text2) => {
    lastAttempt.current = text2;
    setExportOpen(false);
    const body = text2.trim();
    if (body === "") return;
    const parts = splitStatements(body, sqlDialectOf(connection?.dialect));
    if (parts.length === 0) return;
    const isWrite = parts.some((part) => looksLikeWrite(part, sqlDialectOf(connection?.dialect)));
    if (isWrite && settings?.confirmDestructive === true) {
      const ok = await askConfirm(parts.length > 1 ? `即将顺序执行 ${parts.length} 条语句（含写语句），可能修改或删除数据。` : "即将执行写语句，可能修改或删除数据。", body);
      if (!ok) return;
    }
    if (parts.length > 1) {
      await executeScript(parts);
      return;
    }
    setMultiNote("");
    setHistory(pushHistory("sql", body));
    lastRun.current = null;
    await execute({ statement: parts[0] ?? body, page: 0, size: pageSize, allowWrite: isWrite });
    if (lastRun.current !== null) setHistory(annotateHistory("sql", body, lastRun.current));
  };
  const run = async () => {
    const area = inputRef.current;
    const picked = area === null ? { statement, selected: false } : pickStatement(statement, area.selectionStart, area.selectionEnd);
    setSelectedRun(picked.selected);
    await runText(picked.statement);
  };
  const applyFormat = (0, import_react23.useCallback)(() => {
    const next = formatSql(statement);
    if (next === statement) return;
    const offset2 = Math.min(caretPos, next.length);
    setSelectedRun(false);
    setStatement2(next);
    setCaretPos(offset2);
    const area = inputRef.current;
    if (area === null) return;
    setTimeout(() => {
      area.focus();
      area.setSelectionRange(offset2, offset2);
    }, 0);
  }, [caretPos, statement]);
  const runCaret = async () => {
    const area = inputRef.current;
    const found = statementAtCaret(
      statement,
      area?.selectionStart ?? caretPos,
      sqlDialectOf(connection?.dialect)
    );
    if (found.statement === "") return;
    setSelectedRun(false);
    await runText(found.statement);
  };
  const retryLast = () => {
    const text2 = lastAttempt.current;
    if (text2 === null) return;
    setFailure(null);
    void runText(text2);
  };
  (0, import_react23.useEffect)(
    () => () => {
      if (tx !== "open" || selectedId === "") return;
      void api.tx(selectedId, "rollback").catch(() => void 0);
    },
    [tx, selectedId]
  );
  const runTx = async (action) => {
    if (isRedis) return;
    if (selectedId === "" || txBusy) return;
    setTxBusy(true);
    setFailure(null);
    try {
      await withConnection(selectedId, () => api.tx(selectedId, action));
      setTx(action === "start" ? "open" : "idle");
      setPlan(null);
      setResult(null);
      setBase("");
      setTxNote(action === "start" ? "事务已开始，提交前可回滚" : action === "commit" ? "事务已提交" : "事务已回滚");
    } catch (error) {
      setFailure(failureText(error));
    } finally {
      setTxBusy(false);
    }
  };
  const explainPlan = async () => {
    const area = inputRef.current;
    const picked = area === null ? { statement, selected: false } : pickStatement(statement, area.selectionStart, area.selectionEnd);
    const text2 = picked.statement.trim();
    if (text2 === "" || selectedId === "" || isRedis || running) return;
    const token = ++planToken.current;
    setPlanRunning(true);
    setFailure(null);
    setMultiNote("");
    try {
      const next = await api.explain(selectedId, text2, schema === "" ? void 0 : schema);
      if (token !== planToken.current) return;
      if (plan === null) resultBeforePlan.current = result;
      setPlan(next);
      setResult(next.plan ?? null);
      setPage(0);
      setBase("");
      if (next.plan === void 0) {
        setFailure({ message: next.warnings.join("；") || "没有返回执行计划", detail: next.statements.join("\n") });
      }
    } catch (error) {
      if (token !== planToken.current) return;
      setPlan(null);
      setResult(resultBeforePlan.current);
      resultBeforePlan.current = null;
      setFailure(failureText(error));
    } finally {
      if (token === planToken.current) setPlanRunning(false);
    }
  };
  const panelShortcuts = (0, import_react23.useCallback)(
    (event) => {
      if (shortcutHit(event, "result.filter")) {
        event.preventDefault();
        filterRef.current?.focus();
        return;
      }
      if (shortcutHit(event, "result.rerun")) {
        event.preventDefault();
        void run();
      }
    },
    [run]
  );
  const recallHistory = (delta) => {
    if (history.length === 0) return;
    const current = recallRef.current;
    const next = Math.min(history.length - 1, Math.max(-1, current + delta));
    if (next === current) return;
    if (current === -1) recallDraft.current = statement;
    recallRef.current = next;
    setStatement2(next === -1 ? recallDraft.current : history[next].statement);
  };
  const pickHistory = (0, import_react23.useCallback)((entry) => {
    setStatement2(entry.statement);
    setHistoryOpen(false);
  }, []);
  const pickCommandHistory = (0, import_react23.useCallback)((entry) => {
    setCommand(entry.statement);
    setHistoryOpen(false);
  }, []);
  const cancel = async () => {
    if (stmtRef.current === "") return;
    try {
      await api.cancel(stmtRef.current);
    } catch {
    }
  };
  (0, import_react23.useEffect)(() => {
    return () => {
      void cancel();
    };
  }, []);
  const goPage = (next) => {
    if (base === "") return;
    setPageFallback(false);
    void execute({ statement: base, page: next, size: pageSize, allowWrite: false });
  };
  const loadKeys = (0, import_react23.useCallback)(
    async (append, overrideType, overridePattern) => {
      if (selectedId === "") return;
      const token = runToken.current;
      const startedAt = Date.now();
      setScanning(true);
      setValueError(null);
      const type = overrideType ?? scanType;
      const rawPattern = overridePattern ?? pattern;
      const patternText = rawPattern.trim() === "" ? "*" : rawPattern.trim();
      try {
        const cursor = append ? scanCursorRef.current : "0";
        const next = await withConnection(
          selectedId,
          () => api.redisScan({
            id: selectedId,
            db: activeRedisDb,
            cursor,
            pattern: patternText,
            ...type === "" ? {} : { type }
          })
        );
        if (token !== runToken.current) return;
        if (!redisDatabasesLoaded.current) {
          void api.redisDatabases(selectedId).then((info) => {
            redisDatabasesLoaded.current = true;
            setRedisDatabases(info.databases);
            if (info.databases > 0 && activeRedisDb >= info.databases) {
              setRedisDb(0);
              writeNumber(`${REDIS_DB_KEY_PREFIX}${selectedId}`, 0);
            }
          }).catch(() => void 0);
        }
        scanCursorRef.current = next.cursor;
        setScanMs(Date.now() - startedAt);
        if (!append) setScanQuery({ pattern: patternText, type });
        setScan((previous) => {
          if (!append || previous === null) return next;
          const seen = new Set(previous.keys.map((info) => info.key));
          const fresh = next.keys.filter((info) => !seen.has(info.key));
          return { ...next, keys: [...previous.keys, ...fresh] };
        });
      } catch (error) {
        if (token !== runToken.current) return;
        setValueError(failureText(error));
      } finally {
        if (token === runToken.current) setScanning(false);
      }
    },
    [activeRedisDb, pattern, scanType, selectedId]
  );
  const invalidateRun = (0, import_react23.useCallback)(() => {
    runToken.current += 1;
    planToken.current += 1;
    setRunning(false);
    setPlanRunning(false);
    setCommandRunning(false);
    setScanning(false);
    void cancel();
  }, []);
  const runCommand = async () => {
    await runCommandText(command.trim());
  };
  const runCommandText = async (text2) => {
    if (text2 === "" || selectedId === "") return;
    lastCommand.current = text2;
    const isWrite = looksLikeRedisWrite(text2);
    if (isWrite && connection?.readOnly === true) {
      setValueError({
        message: "这是一条只读连接，不能执行写命令",
        detail: "把连接设置里的「只读」关掉，再执行要修改 Redis 数据的命令"
      });
      return;
    }
    if (isWrite && settings?.confirmDestructive === true) {
      const ok = await askConfirm("即将执行会修改 Redis 数据的命令。", text2);
      if (!ok) return;
    }
    recallRef.current = -1;
    recallDraft.current = "";
    setHistory(pushHistory("redis", text2));
    const token = runToken.current;
    setCommandRunning(true);
    setValueError(null);
    try {
      const next = await withConnection(
        selectedId,
        () => api.redisCommand(selectedId, text2, isWrite && connection?.readOnly !== true, activeRedisDb)
      );
      if (token !== runToken.current) return;
      setHistory(annotateHistory("redis", text2, { elapsedMs: next.elapsedMs }));
      setCommandResult(next);
      if (isWrite) await loadKeys(false);
    } catch (error) {
      if (token !== runToken.current) return;
      setValueError(failureText(error));
      setValueRetry(() => () => {
        void runCommandText(text2);
      });
    } finally {
      if (token === runToken.current) setCommandRunning(false);
    }
  };
  const recallCommand = (delta) => {
    if (history.length === 0) return;
    const current = recallRef.current;
    const next = Math.min(history.length - 1, Math.max(-1, current + delta));
    if (next === current) return;
    if (current === -1) recallDraft.current = command;
    recallRef.current = next;
    setCommand(next === -1 ? recallDraft.current : history[next].statement);
  };
  const selectKey = (0, import_react23.useCallback)(
    async (key) => {
      setSelectedKey(key.key);
      setValue(null);
      setValueError(null);
      if (selectedId === "") return;
      const token = runToken.current;
      try {
        const next = await withConnection(selectedId, () => api.redisKey(selectedId, key.key, activeRedisDb));
        if (token !== runToken.current) return;
        setValue(next);
      } catch (error) {
        if (token !== runToken.current) return;
        setValueError(failureText(error));
        setValueRetry(() => () => {
          void selectKey(key);
        });
      }
    },
    [activeRedisDb, selectedId]
  );
  const [valueRefreshing, setValueRefreshing] = (0, import_react23.useState)(false);
  const resultFlash = useCopyFlash();
  const statementFlash = useCopyFlash();
  (0, import_react23.useEffect)(() => {
    resultFlash.reset();
  }, [commandResult, resultFlash.reset]);
  const copyStatement = () => {
    const area = inputRef.current;
    const picked = area === null || area.selectionStart === area.selectionEnd ? statementAtCaret(
      statement,
      area?.selectionStart ?? caretPos,
      sqlDialectOf(connection?.dialect)
    ).statement : statement.slice(Math.min(area.selectionStart, area.selectionEnd), Math.max(area.selectionStart, area.selectionEnd));
    if (picked.trim() === "") return;
    void copyText(picked).then((ok) => {
      statementFlash.flash(ok);
    });
  };
  const refreshValue = (0, import_react23.useCallback)(async () => {
    if (selectedId === "" || selectedKey === "") return;
    const token = runToken.current;
    setValueRefreshing(true);
    try {
      const next = await withConnection(selectedId, () => api.redisKey(selectedId, selectedKey, activeRedisDb));
      if (token !== runToken.current) return;
      setValue(next);
      setScan((previous) => {
        if (previous === null) return previous;
        const index = previous.keys.findIndex((info) => info.key === next.key);
        if (index < 0) return previous;
        const keys = previous.keys.slice();
        const current = keys[index];
        if (current === void 0) return previous;
        keys[index] = { ...current, ttl: next.ttl, size: next.size ?? current.size };
        return { ...previous, keys };
      });
      setValueError(null);
    } catch (error) {
      if (token !== runToken.current) return;
      setValueError(failureText(error));
      setValueRetry(() => () => {
        void refreshValue();
      });
    } finally {
      if (token === runToken.current) setValueRefreshing(false);
    }
  }, [activeRedisDb, selectedId, selectedKey]);
  const refreshValueClick = (0, import_react23.useCallback)(() => {
    void refreshValue();
  }, [refreshValue]);
  const visibleKeys = (0, import_react23.useMemo)(
    () => scan === null ? [] : filterRedisKeys(scan.keys, { needle: keyFilter, ttlOnly }),
    [keyFilter, scan, ttlOnly]
  );
  const pickKey = (0, import_react23.useCallback)(
    (key) => {
      void selectKey(key);
    },
    [selectKey]
  );
  (0, import_react23.useEffect)(() => {
    setResult(null);
    setScriptResults([]);
    setScriptIndex(0);
    setRowFilter("");
    setPageFallback(false);
    setFailure(null);
    if (seededStatement.current) seededStatement.current = false;
    else setStatement2("");
    setBase("");
    setPage(0);
    setScan(null);
    setSelectedKey("");
    setValue(null);
    setValueError(null);
    setCommandResult(null);
    const fallbackSchema = connection === void 0 ? "" : connection.dialect === "mysql" || connection.dialect === "generic" ? connection.database : connection.user;
    const remembered = selectedId === "" ? fallbackSchema : readText(`${SCHEMA_KEY_PREFIX}${selectedId}`, fallbackSchema);
    const seeded = selectedId !== "" && selectedId === initialConnectionId ? initialSchema : void 0;
    if (seeded === void 0 || seeded === "") {
      setSchema(remembered);
    } else {
      setSchema(seeded);
      writeText(`${SCHEMA_KEY_PREFIX}${selectedId}`, seeded);
    }
    setSchemas([]);
    setRedisDb(null);
    setRedisDatabases(null);
    redisDatabasesLoaded.current = false;
    scanCursorRef.current = "0";
  }, [selectedId]);
  (0, import_react23.useEffect)(() => {
    if (selectedId === "" || !isRedis) return;
    setScan(null);
    setSelectedKey("");
    setValue(null);
    setCommandResult(null);
    scanCursorRef.current = "0";
    void loadKeys(false);
  }, [selectedId, isRedis, activeRedisDb]);
  (0, import_react23.useEffect)(() => {
    setPageDraft(String(page + 1));
  }, [page]);
  const jumpToPage = () => {
    const wanted = Number.parseInt(pageDraft, 10);
    if (!Number.isFinite(wanted) || wanted < 1 || wanted - 1 === page) {
      setPageDraft(String(page + 1));
      return;
    }
    goPage(wanted - 1);
  };
  const offset = page * pageSize;
  const columns = result?.columns ?? EMPTY_COLUMNS;
  const rows = result?.rows ?? EMPTY_ROWS;
  const sorted = (0, import_react23.useMemo)(() => sortRowsWithOrder(columns, rows, rowSort), [columns, rows, rowSort]);
  const visibleRows = sorted.rows;
  const rowHaystack = (0, import_react23.useMemo)(() => rowHaystacks(visibleRows), [visibleRows]);
  const filteredIndexes = (0, import_react23.useMemo)(
    () => filterRowIndexesByHaystacks(rowHaystack, rowFilter),
    [rowHaystack, rowFilter]
  );
  const filteredRows = (0, import_react23.useMemo)(() => filteredIndexes.map((index) => visibleRows[index]), [filteredIndexes, visibleRows]);
  const rowNumbers = (0, import_react23.useMemo)(
    () => filteredIndexes.map((index) => offset + (sorted.order[index] ?? index) + 1),
    [filteredIndexes, offset, sorted.order]
  );
  const planText = (0, import_react23.useMemo)(() => planTextOf(plan?.plan), [plan]);
  const planCopyText = (0, import_react23.useMemo)(() => {
    if (planText !== null) return planText;
    const table = plan?.plan;
    if (table === null || table === void 0 || table.rows.length === 0) return null;
    return toTsv(table.columns, table.rows);
  }, [plan, planText]);
  const displayColumns = (0, import_react23.useMemo)(() => orderColumns(columns, columnOrder), [columns, columnOrder]);
  const displayRows = (0, import_react23.useMemo)(() => orderRows(filteredRows, columnOrder), [filteredRows, columnOrder]);
  const hiddenView = (0, import_react23.useMemo)(() => hideColumns(displayColumns, displayRows, hiddenColumns), [displayColumns, displayRows, hiddenColumns]);
  const shownColumns = hiddenView.columns;
  const shownRows = hiddenView.rows;
  shownRowsRef.current = shownRows;
  const previousFullColumns = (0, import_react23.useRef)(displayColumns);
  (0, import_react23.useEffect)(() => {
    const previous = previousFullColumns.current;
    previousFullColumns.current = displayColumns;
    if (shownColumns.length < displayColumns.length) {
      moveWidthsForColumns(previous, displayColumns, "console:sql");
    }
  }, [displayColumns, shownColumns.length]);
  (0, import_react23.useEffect)(() => {
    setSelectedRows(/* @__PURE__ */ new Set());
    selectionAnchor.current = null;
  }, [result, page, pageSize, rowFilter, rowSort]);
  const hiddenCount = displayColumns.length - shownColumns.length;
  const signature = columnSignature(columns);
  (0, import_react23.useEffect)(() => {
    setColumnOrder(null);
  }, [signature]);
  (0, import_react23.useEffect)(() => {
    setHiddenColumns((current) => columns.length === 0 ? current : pruneHidden(current, columns));
  }, [signature, columns]);
  (0, import_react23.useEffect)(() => {
    writeHidden("console:sql", hiddenColumns);
  }, [hiddenColumns]);
  const columnMenu = (0, import_react23.useCallback)((column) => {
    const index = columns.findIndex((item) => item === column);
    const active = rowSort?.column === column.name && (rowSort.index === void 0 || rowSort.index === index) ? rowSort.direction : null;
    const binary = isBinaryType(column.typeName, connection?.dialect) || index >= 0 && filteredRows.some((row) => isBinaryCell(column, row[index] ?? null, connection?.dialect));
    return [
      { label: "按此列升序", disabled: active === "asc", run: () => setRowSort({ column: column.name, index, direction: "asc" }) },
      { label: "按此列降序", disabled: active === "desc", run: () => setRowSort({ column: column.name, index, direction: "desc" }) },
      { label: "清除排序", disabled: rowSort === null, run: () => setRowSort(null) },
      { label: `复制列名「${column.name}」`, run: () => void copyText(column.name).then(noteCopied("列名")) },
      {
        label: `复制本列值（${filteredRows.length} 行）`,
        disabled: filteredRows.length === 0 || index < 0,
        run: () => void copyText(columnValues(filteredRows, index)).then(noteCopied("本列值"))
      },
      {
        label: binary ? "复制为 IN 列表（二进制列无法匹配）" : "复制为 IN 列表",
        disabled: filteredRows.length === 0 || index < 0 || binary,
        run: () => void copyText(inListOf(connection?.dialect ?? "mysql", filteredRows, index, column)).then(noteCopied("IN 列表"))
      },
      {
        label: "复制本列（逗号分隔）",
        disabled: filteredRows.length === 0 || index < 0,
        run: () => void copyText(commaValues(filteredRows, index)).then(noteCopied("逗号分隔"))
      },
      {
        label: "复制全部列名",
        disabled: displayColumns.length === 0,
        run: () => void copyText(columnNames(connection?.dialect ?? "mysql", displayColumns)).then(noteCopied("全部列名"))
      },
      {
        label: `复制查询语句（${displayColumns.length} 列）`,
        disabled: displayColumns.length === 0 || tableTarget() === null,
        run: () => {
          const target = tableTarget();
          if (target === null) return;
          void copyText(selectColumnsSql(connection?.dialect ?? "mysql", target.schema, target.table, displayColumns)).then(noteCopied("查询语句"));
        }
      },
      {
        label: `隐藏列「${column.name}」`,
        disabled: shownColumns.length <= 1,
        run: () => setHiddenColumns((current) => toggleHidden(current, column.name))
      },
      {
        label: "按此列分组计数",
        disabled: tableTarget() === null,
        run: () => {
          const target = tableTarget();
          if (target === null) return;
          setStatement2(groupCountSql(connection?.dialect ?? "mysql", target.schema, target.table, column));
          setSelectedRun(false);
          setCaretPos(0);
          inputRef.current?.focus();
        }
      },
      {
        label: "只看这一列",
        disabled: displayColumns.length <= 1,
        run: () => setHiddenColumns(onlyColumn(displayColumns, column.name))
      },
      {
        label: hiddenCount === 0 ? "显示全部列" : `显示全部列（已隐藏 ${hiddenCount} 列）`,
        disabled: hiddenCount === 0,
        run: () => setHiddenColumns(null)
      }
    ];
  }, [columns, displayColumns, filteredRows, hiddenCount, rowSort, shownColumns.length]);
  const gridSort = (0, import_react23.useCallback)(
    (column, index) => {
      const source = columns.findIndex((item) => item === column);
      setRowSort((current) => nextRowSort(current, column.name, source >= 0 ? source : index));
    },
    [columns]
  );
  const gridReorder = (0, import_react23.useCallback)(
    (from, to) => {
      const positions = hiddenView.positions;
      const source = positions[from] ?? from;
      const target = positions[to] ?? to;
      setColumnOrder((current) => moveColumn(current ?? identityOrder(displayColumns.length), source, target));
    },
    [displayColumns.length, hiddenView.positions]
  );
  const gridCellMenu = (0, import_react23.useCallback)(
    (cell) => {
      const binary = isBinaryCell(cell.column, cell.value, connection?.dialect);
      return [
        { label: "查看完整值", run: () => setCellView(cellValueView(cell.column.name, cell.value)) },
        { label: "用该值筛选当前页", run: () => setRowFilter(cellCopyText(cell.value)) },
        { label: "复制单元格值", run: () => void copyText(cellCopyText(cell.value)).then(noteCopied("单元格值")) },
        {
          label: "复制 INSERT 语句",
          disabled: tableTarget() === null,
          run: () => {
            const target = tableTarget();
            if (target === null) return;
            const full = displayRows[cell.rowIndex] ?? cell.row;
            void copyText(
              insertStatement(connection?.dialect ?? "mysql", target.schema, target.table, displayColumns, full)
            ).then(noteCopied("INSERT"));
          }
        },
        {
          label: binary ? "复制 WHERE 条件（二进制值无法匹配）" : "复制 WHERE 条件",
          disabled: binary,
          run: () => void copyText(`WHERE ${cellWhere(connection?.dialect ?? "mysql", cell.column, cell.value)}`).then(noteCopied("WHERE 条件"))
        },
        {
          label: `复制整行（${displayColumns.length} 列，制表符分隔）`,
          run: () => void copyText(rowToTsv(displayColumns, displayRows[cell.rowIndex] ?? cell.row)).then(noteCopied("整行"))
        }
      ];
    },
    [base, connection?.dialect, displayColumns, displayRows, schema, sourceSql]
  );
  const gridCellOpen = (0, import_react23.useCallback)((column, value2) => {
    setCellView(cellValueView(column.name, value2));
  }, []);
  const resolveTarget = (0, import_react23.useCallback)(
    (text2) => {
      const parsed = tableFromStatement(text2, sqlDialectOf(connection?.dialect));
      if (parsed === null) return null;
      return parsed.schema === "" ? { schema: schema !== "" ? schema : defaultSchema, table: parsed.table } : parsed;
    },
    [connection?.dialect, defaultSchema, schema]
  );
  const executedTarget = (0, import_react23.useMemo)(
    () => resolveTarget(sourceSql !== "" ? sourceSql : base),
    [base, resolveTarget, sourceSql]
  );
  const editedTarget = (0, import_react23.useMemo)(() => resolveTarget(statement), [resolveTarget, statement]);
  if (loadError !== "") {
    return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "dshdb-qtab", children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Banner, { tone: "error", children: loadError }) });
  }
  if (connections.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "dshdb-qtab", children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(DatabaseIcon, { size: 22 }),
        title: "还没有数据源",
        description: "先在「数据库」标签页中新增数据源，再回来执行查询。"
      }
    ) });
  }
  const tableTarget = () => executedTarget;
  const editorTarget = () => editedTarget;
  const openEditorTable = async () => {
    const target = editorTarget();
    if (target === null || selectedId === "") return;
    let kind = "table";
    try {
      const listed = await api.objects(selectedId, target.schema);
      if (listed.objects.some((object) => object.name === target.table && object.kind === "view")) kind = "view";
    } catch {
    }
    openTableTab({ connectionId: selectedId, schema: target.schema, table: target.table, kind });
  };
  const noTableNote = () => {
    setExportNote("当前语句没有目标表，无法导出 SQL");
    setTimeout(() => setExportNote(""), 5e3);
  };
  const exportPage = (format) => {
    setExportOpen(false);
    if (displayRows.length === 0) return;
    const target = format === "sql" ? tableTarget() : null;
    if (format === "sql" && target === null) {
      noTableNote();
      return;
    }
    const payload = renderExport(format, {
      dialect: connection?.dialect ?? "mysql",
      schema: target?.schema ?? "",
      table: target?.table ?? "console",
      columns: displayColumns,
      rows: displayRows
    });
    downloadText(exportFilename(target?.schema ?? "", target?.table ?? "console", format), payload.mime, payload.text);
    setExportNote(`${format.toUpperCase()} 已导出 ${displayRows.length} 行`);
    setTimeout(() => setExportNote(""), 5e3);
  };
  const exportSelected = (format) => {
    setExportOpen(false);
    const picked = displayRows.filter((_, index) => selectedRows.has(index));
    if (picked.length === 0) return;
    const target = format === "sql" ? tableTarget() : null;
    if (format === "sql" && target === null) {
      noTableNote();
      return;
    }
    const payload = renderExport(format, {
      dialect: connection?.dialect ?? "mysql",
      schema: target?.schema ?? "",
      table: target?.table ?? "console",
      columns: displayColumns,
      rows: picked
    });
    downloadText(exportFilename(target?.schema ?? "", target?.table ?? "console", format), payload.mime, payload.text);
    setExportNote(`${format.toUpperCase()} 已导出 ${picked.length} 行`);
    setTimeout(() => setExportNote(""), 5e3);
    setSelectedRows(/* @__PURE__ */ new Set());
  };
  const exportAll = async (format) => {
    setExportOpen(false);
    if (base === "" || selectedId === "" || exporting) return;
    const target = format === "sql" ? tableTarget() : null;
    if (format === "sql" && target === null) {
      noTableNote();
      return;
    }
    setExporting(true);
    setFailure(null);
    exportCancelled.current = false;
    try {
      const collected = await collectRows({
        limit: EXPORT_LIMIT,
        batch: EXPORT_BATCH,
        cancelled: () => exportCancelled.current,
        onProgress: (count) => setExportNote(`${format.toUpperCase()} 正在取 ${formatCount(count)} 行…`),
        fetch: async ({ page: sourcePage }) => {
          const sqlText = wrapPage(connection?.dialect ?? "mysql", base, EXPORT_BATCH, sourcePage);
          const next = await queryWithRetry(
            selectedId,
            sqlText,
            EXPORT_BATCH,
            false,
            `console-export-${Date.now().toString(36)}-${sourcePage}`,
            schema
          );
          return next.rows;
        }
      });
      if (exportCancelled.current) {
        setExportNote(`${format.toUpperCase()} 导出已取消`);
        setTimeout(() => setExportNote(""), 5e3);
        return;
      }
      const data = orderRows(collected, columnOrder);
      const cols = orderColumns(columns, columnOrder);
      const payload = renderExport(format, {
        dialect: connection?.dialect ?? "mysql",
        schema: target?.schema ?? "",
        table: target?.table ?? "console",
        columns: cols,
        rows: data
      });
      downloadText(exportFilename(target?.schema ?? "", target?.table ?? "console", format), payload.mime, payload.text);
      setExportNote(`${format.toUpperCase()} 已导出 ${data.length} 行`);
      setTimeout(() => setExportNote(""), 5e3);
    } catch (error) {
      setFailure(failureText(error));
    } finally {
      setExporting(false);
    }
  };
  const toolbarActions = [
    {
      id: "run",
      label: "执行",
      title: "有选中内容时只执行选中部分",
      variant: "primary",
      loading: running,
      onClick: () => void run()
    },
    { id: "cancel", label: "取消", disabled: !running, onClick: () => void cancel() },
    {
      id: "history",
      label: "历史",
      expanded: historyOpen,
      disabled: history.length === 0,
      onClick: () => setHistoryOpen((open) => !open)
    },
    {
      id: "format",
      label: "格式化",
      title: `整理关键字大小写与换行（${shortcutLabel("console.format")}）`,
      disabled: statement.trim() === "",
      onClick: applyFormat
    },
    {
      id: "import",
      label: "导入",
      title: `从 .sql 文件读取脚本并插入到光标处（上限 ${String(MAX_SQL_IMPORT_BYTES / 1024 / 1024)} MB）`,
      onClick: () => fileInputRef.current?.click()
    },
    {
      id: "save",
      label: "保存",
      title: "把编辑器里的 SQL 保存为 .sql 文件",
      disabled: statement.trim() === "",
      onClick: saveSqlFile
    },
    {
      id: "clear",
      label: "清空",
      title: "清空编辑器里的 SQL（不影响已经拿到的结果）",
      disabled: statement === "",
      onClick: () => {
        setStatement2("");
        setSelectedRun(false);
        setCaretPos(0);
        inputRef.current?.focus();
      }
    },
    {
      id: "copy",
      label: "复制 SQL",
      visibleLabel: statementFlash.copied ? "已复制" : "复制 SQL",
      title: "复制选中的 SQL；没有选中时复制光标所在的那条",
      disabled: statement.trim() === "",
      onClick: copyStatement
    },
    {
      id: "explain",
      label: "执行计划",
      title: "查看当前语句的执行计划（不会真正执行语句）",
      loading: planRunning,
      disabled: statement.trim() === "" || running,
      onClick: () => void explainPlan()
    },
    {
      id: "openTable",
      label: "打开数据表",
      title: "在新标签页打开编辑器里这条语句查询的表",
      disabled: editorTarget() === null || selectedId === "",
      onClick: () => void openEditorTable()
    },
    {
      id: "txStart",
      label: "事务",
      title: "发送 BEGIN，开启手动事务",
      disabled: txButtonDisabled(tx, "start") || txBusy || selectedId === "",
      onClick: () => void runTx("start")
    },
    {
      id: "txCommit",
      label: "提交",
      title: "提交当前事务",
      disabled: txButtonDisabled(tx, "commit") || txBusy,
      onClick: () => void runTx("commit")
    },
    {
      id: "txRollback",
      label: "回滚",
      title: "回滚当前事务",
      disabled: txButtonDisabled(tx, "rollback") || txBusy,
      onClick: () => void runTx("rollback")
    },
    {
      id: "export",
      label: "导出",
      ariaLabel: "导出结果",
      title: exporting ? "正在导出…" : "导出结果",
      disabled: running || exporting || rows.length === 0,
      onClick: () => setExportOpen((open) => !open)
    }
  ];
  const actionById = new Map(toolbarActions.map((action) => [action.id, action]));
  const orderedActions = actionOrder.flatMap((id) => {
    const action = actionById.get(id);
    return action === void 0 ? [] : [action];
  });
  const visibleActionCount = Math.min(visibleActions, orderedActions.length);
  const hiddenActions = orderedActions.slice(visibleActionCount);
  const exportHidden = orderedActions.findIndex((action) => action.id === "export") >= visibleActionCount;
  const renderToolbarButton = (action) => /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
    Button,
    {
      size: "sm",
      variant: action.variant ?? "ghost",
      icon: consoleActionIcon(action.id),
      title: action.title,
      "aria-label": action.ariaLabel,
      loading: action.loading === true,
      disabled: action.disabled === true,
      "aria-expanded": action.expanded,
      onClick: action.onClick,
      children: action.visibleLabel ?? action.label
    }
  );
  const copySelected = (format) => {
    const picked = displayRows.filter((_, index) => selectedRows.has(index));
    if (picked.length === 0) return;
    const target = format === "sql" ? tableTarget() : null;
    if (format === "sql" && target === null) {
      noTableNote();
      return;
    }
    const text2 = format === "csv" ? toCsv(displayColumns, picked) : format === "tsv" ? toTsv(displayColumns, picked) : format === "json" ? toJson(displayColumns, picked) : format === "md" ? toMarkdown(displayColumns, picked) : insertStatements(
      connection?.dialect ?? "mysql",
      target.schema,
      target.table,
      displayColumns,
      picked
    );
    void copyText(text2).then(noteCopied(format === "md" ? "Markdown" : format.toUpperCase()));
  };
  const renderExportMenu = () => {
    const groups = [
      {
        id: "page",
        label: "导出当前页",
        leaves: [
          { id: "page-csv", label: `当前页 CSV（${filteredRows.length} 行）`, disabled: filteredRows.length === 0, onSelect: () => exportPage("csv") },
          { id: "page-json", label: `当前页 JSON（${filteredRows.length} 行）`, disabled: filteredRows.length === 0, onSelect: () => exportPage("json") },
          { id: "page-sql", label: `当前页 SQL（${filteredRows.length} 行）`, disabled: filteredRows.length === 0, onSelect: () => exportPage("sql") },
          { id: "page-md", label: `当前页 Markdown（${filteredRows.length} 行）`, disabled: filteredRows.length === 0, onSelect: () => exportPage("md") }
        ]
      },
      ...selectedRows.size > 0 ? [
        {
          id: "selected",
          label: "导出已选",
          leaves: [
            { id: "selected-csv", label: `已选 CSV（${selectedRows.size} 行）`, onSelect: () => exportSelected("csv") },
            { id: "selected-json", label: `已选 JSON（${selectedRows.size} 行）`, onSelect: () => exportSelected("json") },
            { id: "selected-sql", label: `已选 SQL（${selectedRows.size} 行）`, onSelect: () => exportSelected("sql") },
            { id: "selected-md", label: `已选 Markdown（${selectedRows.size} 行）`, onSelect: () => exportSelected("md") }
          ]
        }
      ] : [],
      {
        id: "copy-page",
        label: "复制当前页",
        leaves: [
          { id: "copy-page-md", label: "复制当前页 Markdown", disabled: filteredRows.length === 0, onSelect: () => void copyText(toMarkdown(displayColumns, filteredRows)).then(noteCopied("Markdown")) },
          { id: "copy-page-csv", label: "复制当前页 CSV", disabled: filteredRows.length === 0, onSelect: () => void copyText(toCsv(displayColumns, filteredRows)).then(noteCopied("CSV")) },
          { id: "copy-page-tsv", label: "复制当前页 TSV", disabled: filteredRows.length === 0, onSelect: () => void copyText(toTsv(displayColumns, filteredRows)).then(noteCopied("TSV")) },
          { id: "copy-page-json", label: "复制当前页 JSON", disabled: filteredRows.length === 0, onSelect: () => void copyText(toJson(displayColumns, filteredRows)).then(noteCopied("JSON")) },
          {
            id: "copy-page-sql",
            label: "复制当前页 SQL",
            disabled: filteredRows.length === 0 || tableTarget() === null,
            onSelect: () => {
              const target = tableTarget();
              if (target === null) return;
              void copyText(
                insertStatements(connection?.dialect ?? "mysql", target.schema, target.table, displayColumns, filteredRows)
              ).then(noteCopied("SQL"));
            }
          }
        ]
      },
      ...selectedRows.size > 0 ? [
        {
          id: "copy-selected",
          label: "复制已选",
          leaves: [
            { id: "copy-selected-md", label: "复制已选 Markdown", onSelect: () => copySelected("md") },
            { id: "copy-selected-csv", label: "复制已选 CSV", onSelect: () => copySelected("csv") },
            { id: "copy-selected-tsv", label: "复制已选 TSV", onSelect: () => copySelected("tsv") },
            { id: "copy-selected-json", label: "复制已选 JSON", onSelect: () => copySelected("json") },
            { id: "copy-selected-sql", label: "复制已选 SQL", onSelect: () => copySelected("sql") }
          ]
        }
      ] : [],
      ...base !== "" ? [
        {
          id: "all",
          label: "导出全部",
          leaves: [
            { id: "all-csv", label: `全部 CSV（最多 ${EXPORT_LIMIT} 行）`, disabled: exporting, onSelect: () => void exportAll("csv") },
            { id: "all-json", label: `全部 JSON（最多 ${EXPORT_LIMIT} 行）`, disabled: exporting, onSelect: () => void exportAll("json") },
            { id: "all-sql", label: `全部 SQL（最多 ${EXPORT_LIMIT} 行）`, disabled: exporting, onSelect: () => void exportAll("sql") },
            { id: "all-md", label: `全部 Markdown（最多 ${EXPORT_LIMIT} 行）`, disabled: exporting, onSelect: () => void exportAll("md") }
          ]
        }
      ] : []
    ];
    return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(MenuGroupList, { groups, onClose: () => setExportOpen(false) });
  };
  const allRows = pageSize === ALL_PAGE_SIZE;
  const hasPrevious = page > 0;
  const hasNext = !allRows && result !== null && rows.length >= pageSize;
  const rangeStart = rows.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + rows.length;
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "dshdb-qtab", onKeyDown: panelShortcuts, children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "dshdb-qbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        SearchSelect,
        {
          label: "数据源",
          title: "控制台执行 SQL 的连接",
          className: "dshdb-console-select",
          value: selectedId,
          onChange: (next) => {
            invalidateRun();
            if (tx === "open" && selectedId !== "") {
              void api.tx(selectedId, "rollback").catch(() => void 0);
            }
            setTx("idle");
            setTxNote("");
            setSelectedId(next);
          },
          options: connections.map((item) => ({
            value: item.id,
            label: `${item.name} · ${item.dialect}${item.readOnly ? " · 只读" : ""}`
          }))
        }
      ),
      connection === void 0 ? null : isRedis ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        "select",
        {
          className: "dshdb-select dshdb-select-inline dshdb-console-select",
          "aria-label": "Redis 逻辑库",
          title: "控制台扫描键和执行命令所用的逻辑库",
          value: activeRedisDb,
          onChange: (event) => {
            invalidateRun();
            const next = Number(event.target.value);
            setRedisDb(next);
            writeNumber(`${REDIS_DB_KEY_PREFIX}${selectedId}`, next);
          },
          children: Array.from({ length: Math.max(1, redisDatabases ?? 16) }, (_, index) => /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("option", { value: index, children: [
            "db",
            index,
            index === connection.redisDb ? "（默认）" : ""
          ] }, index))
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        SearchSelect,
        {
          label: "数据库",
          title: "控制台执行的默认数据库/Schema；选了它就不用给表名加库名前缀",
          className: "dshdb-console-select",
          value: schema === "" ? defaultSchema : schema,
          onChange: (next) => {
            invalidateRun();
            setSchema(next);
            writeText(`${SCHEMA_KEY_PREFIX}${selectedId}`, next);
          },
          options: [
            { value: defaultSchema, label: `默认${defaultSchema === "" ? "" : `（${defaultSchema}）`}` },
            ...schema !== "" && schema !== defaultSchema && !schemas.some((item) => item.name === schema) ? (
              // A schema carried over from the tree shows before the list arrives,
              // and keeps the picker honest if the server no longer reports it.
              [{ value: schema, label: schema }]
            ) : [],
            ...schemas.filter((item) => item.name !== defaultSchema).map((item) => ({
              value: item.name,
              label: `${item.name}${item.system === true ? "（系统）" : ""}`
            }))
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-qbar-spacer" }),
      running || scanning || commandRunning ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Loading, { bare: true }) : null,
      result !== null && !running ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-qmeta", children: formatMs(result.elapsedMs) }) : null
    ] }),
    isRedis ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
      historyOpen ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        HistoryPanel,
        {
          entries: history,
          pins,
          onPick: pickCommandHistory,
          onTogglePin: toggleStatementPin,
          onClear: clearCommandHistory
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "dshdb-qfilter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-qfilter-label", children: "MATCH" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "input",
          {
            className: "dshdb-input dshdb-qfilter-input dshdb-pattern-input",
            "aria-label": "键模式",
            title: "服务器端 glob 匹配（* ? []），按 Enter 重新扫描",
            placeholder: "键模式，例如 shop:*",
            value: pattern,
            spellCheck: false,
            onChange: (event) => setPattern(event.target.value),
            onKeyDown: (event) => {
              if (composing(event)) return;
              if (event.key === "Enter") void loadKeys(false);
            }
          }
        ),
        pattern.trim() === "" || pattern.trim() === "*" ? null : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "button",
          {
            type: "button",
            className: "dshdb-row-action",
            title: "清空键模式",
            "aria-label": "清空键模式",
            onClick: () => {
              setPattern("*");
              scanCursorRef.current = "0";
              void loadKeys(false, void 0, "*");
            },
            children: "×"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { className: "dshdb-qmeta", title: "只列出设置了过期时间的键", children: [
          /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            "input",
            {
              type: "checkbox",
              "aria-label": "只看有 TTL",
              checked: ttlOnly,
              onChange: (event) => {
                const next = event.target.checked;
                setTtlOnly(next);
                writeFlag(TTL_ONLY_KEY, next);
              }
            }
          ),
          "只看有 TTL"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "input",
          {
            className: "dshdb-input dshdb-qfilter-input",
            "aria-label": "筛选键名",
            title: "在当前已加载的键里按子串筛选，不会重新扫描",
            placeholder: "筛选键名",
            value: keyFilter,
            onChange: (event) => setKeyFilter(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Escape") setKeyFilter("");
            }
          }
        ),
        keyFilter === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "button",
          {
            type: "button",
            className: "dshdb-row-action",
            title: "清空键名筛选",
            "aria-label": "清空键名筛选",
            onClick: () => setKeyFilter(""),
            children: "×"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
          "select",
          {
            className: "dshdb-input dshdb-qfilter-input",
            "aria-label": "键类型",
            value: scanType,
            onChange: (event) => {
              setScanType(event.target.value);
              scanCursorRef.current = "0";
              void loadKeys(false, event.target.value);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: "", children: "全部类型" }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: "string", children: "string" }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: "list", children: "list" }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: "set", children: "set" }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: "hash", children: "hash" }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: "zset", children: "zset" }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: "stream", children: "stream" })
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Button, { size: "sm", onClick: () => void loadKeys(false), loading: scanning, children: "扫描" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => void loadKeys(true),
            disabled: scan === null || scan.cursor === "0" || scanning || scanQuery === null || scanQuery.pattern !== (pattern.trim() === "" ? "*" : pattern.trim()) || scanQuery.type !== scanType,
            title: scan === null ? "先扫描一次" : "延续上一次扫描",
            children: "继续"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-qmeta", children: [
          scan === null ? "" : ttlOnly || keyFilter.trim() !== "" ? `${formatCount(visibleKeys.length)} / ${formatCount(scan.keys.length)} 个键` : `${formatCount(scan.keys.length)} 个键`,
          scanMs === null ? "" : ` · ${formatMs(scanMs)}`,
          scan !== null && scan.cursor === "0" && scan.keys.length > 0 ? " · 已全部加载" : "",
          scan !== null && scan.cursor !== "0" && scanQuery !== null && (scanQuery.pattern !== (pattern.trim() === "" ? "*" : pattern.trim()) || scanQuery.type !== scanType) ? " · 条件已改，点「扫描」重新开始" : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            disabled: visibleKeys.length === 0,
            title: "把当前列表里的键名按换行复制出来",
            onClick: () => void copyText(visibleKeys.map((info) => info.key).join("\n")).then(noteCopied(`键名（${formatCount(visibleKeys.length)} 个）`)),
            children: "复制键名"
          }
        ),
        exportNote !== "" ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Tag, { tone: "business", role: "status", children: exportNote }) : null
      ] }),
      valueError !== null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
        Banner,
        {
          tone: "error",
          onClose: () => setValueError(null),
          actions: /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                onClick: () => {
                  const retry = valueRetry;
                  if (retry === null) return;
                  setValueError(null);
                  retry();
                },
                children: "重试"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                title: "复制错误信息",
                onClick: () => void copyText(
                  valueError.detail === void 0 ? valueError.message : valueError.message + String.fromCharCode(10) + valueError.detail
                ),
                children: "复制"
              }
            )
          ] }),
          children: [
            valueError.message,
            valueError.detail ? `
${valueError.detail}` : ""
          ]
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: value === null ? "dshdb-grid-wrap" : "dshdb-grid-wrap dshdb-redis-keys", children: scan === null || visibleKeys.length === 0 && !ttlOnly && keyFilter.trim() === "" ? scanning ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "dshdb-empty", children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Loading, { size: 16, label: "正在扫描键…" }) }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(EmptyState, { icon: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(DatabaseIcon, { size: 22 }), title: "没有匹配的键", description: scanType === "" ? pattern : `${pattern} · 类型 ${scanType}` }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        KeyGrid,
        {
          keys: visibleKeys,
          selectedKey,
          emptyText: keyFilter.trim() !== "" ? "没有包含这个关键字的键" : ttlOnly ? "没有带过期时间的键" : pattern.trim() === "" && scanType === "" ? "这个库还没有键" : "没有匹配的键",
          onSelect: pickKey
        }
      ) }),
      value !== null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(RedisValuePanel, { value, onRefresh: refreshValueClick, refreshing: valueRefreshing }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "dshdb-qfilter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-qfilter-label", children: "命令" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "input",
          {
            className: "dshdb-input dshdb-qfilter-input dshdb-command-input",
            placeholder: "例如 GET shop:customer:42",
            "aria-label": "Redis 命令",
            value: command,
            spellCheck: false,
            onChange: (event) => {
              recallRef.current = -1;
              setCommand(event.target.value);
            },
            onKeyDown: (event) => {
              if (composing(event)) return;
              if (event.key === "Escape" && historyOpen) {
                setHistoryOpen(false);
                return;
              }
              if (event.key === "Tab") {
                const input = event.currentTarget;
                const caret = input.selectionStart ?? command.length;
                const key = keyCompletion(command, caret, scan?.keys ?? []);
                const completion = commandCompletion(command, caret) ?? (key === null ? null : { start: key.start, end: key.end, command: key.key });
                if (completion === null) return;
                event.preventDefault();
                const next = applyCommandCompletion(command, completion);
                setCommand(next.text);
                setCaretPos(next.caret);
                input.setSelectionRange(next.caret, next.caret);
                return;
              }
              if (shortcutHit(event, "redis.clear")) {
                event.preventDefault();
                setCommand("");
                recallRef.current = -1;
                setCaretPos(0);
                return;
              }
              if (event.key === "Enter") void runCommand();
              if (event.key === "ArrowUp") {
                event.preventDefault();
                recallCommand(1);
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                recallCommand(-1);
              }
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => {
              setCommand("");
              recallRef.current = -1;
              setCaretPos(0);
            },
            disabled: command === "",
            title: `清空命令框（${shortcutLabel("redis.clear")}）`,
            children: "清空"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            icon: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(ClockIcon, { size: 12 }),
            "aria-expanded": historyOpen,
            onClick: () => setHistoryOpen((open) => !open),
            disabled: history.length === 0,
            children: "历史"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Button, { size: "sm", variant: "primary", onClick: () => void runCommand(), loading: commandRunning, children: "执行" })
      ] }),
      commandResult !== null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("pre", { className: "dshdb-console-value", title: commandResult.command, children: redisValueText(commandResult.value) }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "dshdb-qmeta", style: { marginTop: 4 }, children: [
          formatMs(commandResult.elapsedMs),
          commandResult.readOnly ? "" : " · 写命令",
          /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              onClick: () => {
                void copyText(redisValueText(commandResult.value)).then((ok) => {
                  if (ok) resultFlash.flash(true);
                });
              },
              title: resultFlash.copied ? "已复制这条命令的结果" : "复制这条命令的结果",
              children: resultFlash.copied ? "已复制" : "复制结果"
            }
          )
        ] })
      ] }) : null
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-complete-anchor", ref: completionAnchor, children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "textarea",
          {
            className: "dshdb-input dshdb-console-input",
            placeholder: `输入 SQL，${shortcutLabel("console.run")} 执行（有选中内容时只执行选中部分），${shortcutLabel("console.complete")} 补全表名和列名（\`表.\` 后补全列名），${shortcutLabel("console.save")} 存成 .sql，${shortcutLabel("console.explain")} 查看执行计划，${shortcutLabel("console.clear")} 清空编辑器，${shortcutLabel("console.comment")} 注释，${shortcutLabel("console.runCaret")} 执行光标所在的语句，${shortcutLabel("console.format")} 格式化，${shortcutLabel("console.historyOlder")} / ${shortcutLabel("console.historyNewer")} 切换历史（可在设置里改）`,
            "aria-label": "SQL 编辑器",
            ref: inputRef,
            "aria-controls": suggestions === null ? void 0 : `${completeId}-list`,
            "aria-activedescendant": suggestions !== null && suggestionItems.length > 0 ? `${completeId}-option-${activeSuggestionIndex}` : void 0,
            value: statement,
            spellCheck: false,
            onChange: (event) => {
              recallRef.current = -1;
              setSelectedRun(false);
              const next = event.target.value;
              autoCompletePending.current = !composing(event) && opensCompletion(statement, next);
              setCaretPos(event.target.selectionStart);
              setStatement2(next);
            },
            onSelect: (event) => setCaretPos(event.currentTarget.selectionStart),
            onKeyUp: (event) => setCaretPos(event.currentTarget.selectionStart),
            onKeyDown: (event) => {
              if (composing(event)) return;
              if (event.key === "Escape" && historyOpen) {
                setHistoryOpen(false);
                return;
              }
              const shortcut = (id) => {
                if (!shortcutHit(event, id)) return false;
                event.preventDefault();
                event.stopPropagation();
                return true;
              };
              if (shortcut("console.complete")) {
                void openSuggestions();
                return;
              }
              if (suggestions !== null && suggestionItems.length > 0) {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const step = event.key === "ArrowDown" ? 1 : -1;
                  setSuggestionIndex((previous) => (previous + step + suggestionItems.length) % suggestionItems.length);
                  return;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  const picked = suggestionItems[activeSuggestionIndex];
                  if (picked !== void 0) {
                    event.preventDefault();
                    insertSuggestion(picked);
                    return;
                  }
                }
              }
              if (shortcut("console.save")) {
                saveSqlFile();
                return;
              }
              if (!isRedis && shortcut("console.explain")) {
                void explainPlan();
                return;
              }
              if (shortcut("console.comment")) {
                const area = inputRef.current;
                const next = toggleSqlComment(
                  statement,
                  area?.selectionStart ?? caretPos,
                  area?.selectionEnd ?? caretPos
                );
                if (next.text !== statement) {
                  setSelectedRun(false);
                  setStatement2(next.text);
                  setCaretPos(next.selectionEnd);
                  setTimeout(() => {
                    area?.focus();
                    area?.setSelectionRange(next.selectionStart, next.selectionEnd);
                  });
                }
                return;
              }
              if (shortcut("console.clear")) {
                if (statement.trim() === "") return;
                setStatement2("");
                setSelectedRun(false);
                setCaretPos(0);
                inputRef.current?.focus();
                return;
              }
              if (shortcut("console.runCaret")) {
                void runCaret();
                return;
              }
              if (shortcut("console.run")) {
                void run();
                return;
              }
              if (shortcut("console.format")) {
                applyFormat();
                return;
              }
              if (shortcut("console.historyOlder")) {
                recallHistory(1);
                return;
              }
              if (shortcut("console.historyNewer")) {
                recallHistory(-1);
              }
            }
          }
        ),
        suggestions !== null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "dshdb-complete", id: `${completeId}-list`, role: "listbox", "aria-label": "补全候选", children: suggestionItems.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-complete-empty", children: "没有匹配的候选" }) : suggestionItems.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
          "button",
          {
            type: "button",
            id: `${completeId}-option-${index}`,
            role: "option",
            "aria-selected": index === activeSuggestionIndex,
            className: index === activeSuggestionIndex ? "dshdb-complete-item dshdb-complete-active" : "dshdb-complete-item",
            onMouseDown: (event) => {
              event.preventDefault();
              insertSuggestion(item);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-complete-name", children: item.name }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-complete-meta", children: [
                item.detail !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-complete-detail", children: item.detail }) : null,
                /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-complete-kind", children: item.kind === "column" ? "列" : item.kind === "table" ? "表" : item.kind === "schema" ? "库" : item.kind === "function" ? "函数" : item.kind === "alias" ? "别名" : item.kind === "snippet" ? "片段" : "关键字" })
              ] })
            ]
          },
          `${item.kind}:${item.name}`
        )) }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "dshdb-qbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-qbar-actions", ref: actionsRef, children: [
          orderedActions.map((action, index) => /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            "span",
            {
              className: `dshdb-qbar-slot${index < visibleActionCount ? "" : " dshdb-qbar-slot-hidden"}`,
              "data-console-action": action.id,
              children: action.id === "export" ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-menu-wrap", ref: index < visibleActionCount ? visibleExportWrapRef : void 0, children: [
                renderToolbarButton(action),
                index < visibleActionCount && exportOpen ? renderExportMenu() : null
              ] }) : renderToolbarButton(action)
            },
            action.id
          )),
          /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
            "span",
            {
              className: `dshdb-menu-wrap dshdb-qbar-slot${hiddenActions.length === 0 ? " dshdb-qbar-slot-hidden" : ""}`,
              "data-console-overflow": "true",
              ref: overflowWrapRef,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
                  Button,
                  {
                    size: "sm",
                    variant: "ghost",
                    icon: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(MoreIcon, { size: 13 }),
                    "aria-label": "更多操作",
                    title: "更多操作",
                    "aria-expanded": overflowOpen || exportHidden && exportOpen,
                    onClick: () => {
                      setOverflowOpen((open) => !open);
                      setExportOpen(false);
                    }
                  }
                ),
                overflowOpen && hiddenActions.length > 0 ? (
                  // Right-aligned to the "…" button: the button sits near the
                  // right edge of the toolbar, so a left-aligned menu would run
                  // past the panel and get clipped.
                  /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-menu", role: "menu", children: hiddenActions.map((action) => /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
                    "button",
                    {
                      type: "button",
                      role: "menuitem",
                      disabled: action.disabled === true,
                      onClick: () => {
                        setOverflowOpen(false);
                        action.onClick?.();
                      },
                      children: [
                        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-menu-icon", children: consoleActionIcon(action.id, 12) }),
                        action.label
                      ]
                    },
                    action.id
                  )) })
                ) : null,
                exportHidden && exportOpen ? renderExportMenu() : null
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            accept: ".sql,.txt,text/plain",
            hidden: true,
            "aria-label": "导入 SQL 文件",
            onChange: (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void importSqlFile(file);
            }
          }
        ),
        scriptResults.length > 1 ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "select",
          {
            className: "dshdb-input dshdb-console-select",
            "aria-label": "语句结果",
            value: scriptIndex,
            onChange: (event) => {
              const index = Number(event.target.value);
              const picked = scriptResults[index];
              if (picked === void 0) return;
              setScriptIndex(index);
              setResult(picked);
              setRowFilter("");
              setPage(0);
              setBase("");
            },
            children: scriptResults.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("option", { value: index, children: [
              "第 ",
              index + 1,
              " 条 · ",
              formatCount(item.rows.length),
              " 行 · ",
              formatMs(item.elapsedMs)
            ] }, index))
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-qbar-spacer" }),
        selectedRows.size > 0 ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(Tag, { tone: "business", children: [
          "已选 ",
          selectedRows.size,
          " 行"
        ] }) : null,
        exportNote !== "" ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Tag, { tone: "business", role: "status", children: exportNote }) : null,
        exporting ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "button",
          {
            type: "button",
            className: "dshdb-pager-btn",
            title: "停止导出，已取到的行不会写入文件",
            onClick: () => {
              exportCancelled.current = true;
            },
            children: "取消"
          }
        ) : null,
        multiProgress !== null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Loading,
          {
            bare: true,
            className: "dshdb-qmeta",
            label: `正在执行 ${multiProgress.index}/${multiProgress.total}…`
          }
        ) : null,
        multiNote !== "" ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Tag, { tone: "business", children: multiNote }) : null,
        selectedRun ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-qmeta", children: "已执行选中内容" }) : null,
        tx === "open" ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Tag, { tone: "warn", children: "事务进行中" }) : null,
        txNote !== "" ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Tag, { tone: "business", children: txNote }) : null,
        base !== "" && !allRows ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-qmeta", children: "可分页查询" }) : null,
        pageFallback ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Tag, { tone: "warn", title: "这一页已经超出结果范围（可能有人删了数据或条件刚变过）", children: "这一页没有数据，已回到第一页" }) : null,
        result !== null && result.truncated ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(Tag, { tone: "warn", title: "还有更多行没有取回：调大行数上限，或用导出的「全部」", children: [
          "结果已截断，仅取回 ",
          formatCount(rows.length),
          " 行"
        ] }) : null
      ] }),
      historyOpen ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        HistoryPanel,
        {
          entries: history,
          pins,
          onPick: pickHistory,
          onTogglePin: toggleStatementPin,
          onClear: clearStatementHistory
        }
      ) : null,
      failure !== null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
        Banner,
        {
          tone: "error",
          onClose: () => setFailure(null),
          actions: /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(import_jsx_runtime21.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                onClick: () => retryLast(),
                children: "重试"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
              Button,
              {
                size: "sm",
                variant: "ghost",
                title: "复制错误信息",
                onClick: () => {
                  void copyText(
                    failure.detail === void 0 ? failure.message : `${failure.message}
${failure.detail}`
                  );
                },
                children: "复制"
              }
            )
          ] }),
          children: [
            failure.message,
            failure.detail ? `
${failure.detail}` : ""
          ]
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(CellValueModal, { view: cellView, onClose: () => setCellView(null) }),
      result !== null && rows.length > 0 ? planText !== null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("pre", { className: "dshdb-plan-text", "aria-label": "执行计划文本", children: planText }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        DataGrid,
        {
          label: "查询结果",
          columns: shownColumns,
          rows: shownRows,
          offset,
          rowNumbers,
          storageKey: "console:sql",
          widthColumnCount: displayColumns.length,
          resetKey: result,
          sort: rowSort,
          sortColumn: rowSort?.index !== void 0 ? columns[rowSort.index] ?? null : null,
          onSort: gridSort,
          onReorderColumns: gridReorder,
          headerMenu: columnMenu,
          cellMenu: gridCellMenu,
          onCellOpen: gridCellOpen,
          selectedRows,
          onToggleRow: selectRow,
          onToggleAllRows: toggleAllRows,
          emptyText: rowFilter.trim() !== "" && visibleRows.length > 0 && filteredRows.length === 0 ? "当前页没有匹配筛选条件的行" : "这条语句没有返回任何行"
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "dshdb-grid-wrap", children: result === null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        EmptyState,
        {
          icon: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(TerminalIcon, { size: 22 }),
          title: "等待执行",
          description: "上面的语句会在当前数据源上运行，结果按页展示。"
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
        EmptyState,
        {
          icon: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(TerminalIcon, { size: 22 }),
          title: typeof result.updateCount === "number" ? "影响行数" : "没有返回行",
          description: typeof result.updateCount === "number" ? `${formatCount(result.updateCount)} 行受影响` : result.sql
        }
      ) }),
      result !== null && rows.length > 0 ? plan === null ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "dshdb-pager", children: [
        running ? /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Tag, { tone: "business", children: "查询中" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-pager-sql", title: result.sql, children: result.sql }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "button",
          {
            type: "button",
            className: "dshdb-pager-btn",
            title: "复制实际执行的 SQL",
            "aria-label": "复制实际执行的 SQL",
            onClick: () => void copyText(result.sql),
            children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(CopyIcon, { size: 12 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-pager-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-pager-filter", title: `按任意列在网格里显示的文字过滤当前页（${shortcutLabel("result.filter")} 聚焦，Esc 清空）`, children: [
          /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            "input",
            {
              ref: filterRef,
              className: "dshdb-input dshdb-qfilter-input",
              "aria-label": "筛选结果",
              placeholder: "筛选结果",
              value: rowFilter,
              disabled: running,
              onChange: (event) => setRowFilter(event.target.value),
              onKeyDown: (event) => {
                if (event.key !== "Escape") return;
                event.stopPropagation();
                setRowFilter("");
              }
            }
          ),
          rowFilter === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
            "button",
            {
              type: "button",
              className: "dshdb-row-action",
              title: "清空筛选",
              "aria-label": "清空筛选",
              onClick: () => setRowFilter(""),
              children: "×"
            }
          )
        ] }),
        rowFilter.trim() !== "" ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-qmeta", children: [
          formatCount(filteredRows.length),
          " / ",
          formatCount(visibleRows.length),
          " 行"
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          PagerButton,
          {
            label: "|◀",
            title: "第一页",
            onClick: () => goPage(0),
            disabled: !hasPrevious || running || allRows
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          PagerButton,
          {
            label: "◀",
            title: "上一页",
            onClick: () => goPage(Math.max(page - 1, 0)),
            disabled: !hasPrevious || running || allRows
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-pager-range", children: [
          formatCount(rangeStart),
          "-",
          formatCount(rangeEnd)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-pager-jump", children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          "input",
          {
            className: "dshdb-input dshdb-pager-input",
            type: "number",
            min: 1,
            inputMode: "numeric",
            "aria-label": "页码",
            title: "输入页码后回车跳到该页",
            value: pageDraft,
            disabled: running || allRows,
            onChange: (event) => setPageDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                jumpToPage();
              }
            },
            onBlur: jumpToPage
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)(
          "select",
          {
            className: "dshdb-select dshdb-select-inline dshdb-pager-size",
            "aria-label": "每页行数",
            value: String(pageSize),
            disabled: running,
            onChange: (event) => {
              const size = Number(event.target.value);
              setPageSize(size);
              writePageSize(CONSOLE_PAGE_KEY, size);
              if (base !== "") void execute({ statement: base, page: 0, size, allowWrite: false });
            },
            children: [
              PAGE_SIZES.map((size) => /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: size, children: formatCount(size) }, size)),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: ALL_PAGE_SIZE, title: `一次取回全部结果（最多 ${formatCount(ALL_ROWS)} 行）`, children: "全部" })
            ]
          }
        ),
        allRows ? /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-qmeta", children: [
          "上限 ",
          formatCount(ALL_ROWS),
          " 行"
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          PagerButton,
          {
            label: "▶",
            title: "下一页",
            onClick: () => goPage(page + 1),
            disabled: !hasNext || running || allRows
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "dshdb-pager", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(Tag, { tone: "business", children: "执行计划" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-pager-sql", title: plan.statements.join("\n"), children: plan.statements[plan.statements.length - 1] ?? result.sql }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("span", { className: "dshdb-pager-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            disabled: planCopyText === null,
            title: planText === null ? "把表格形式的计划复制成制表符分隔的文本" : "复制计划文本",
            onClick: () => {
              if (planCopyText !== null) void copyText(planCopyText);
            },
            children: "复制计划"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => {
              setPlan(null);
              setResult(resultBeforePlan.current);
              resultBeforePlan.current = null;
            },
            children: "关闭计划"
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(ConfirmDialog, { request: confirm?.request ?? null, onConfirm: () => resolveConfirm(true), onCancel: () => resolveConfirm(false) })
  ] });
}
function ConsoleTab(props) {
  const info = (props.useTabInfo ?? noTabInfo)();
  const params = readConsoleTabParams(info?.tab?.navigation?.params) ?? {};
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(ConsoleBody, { initialConnectionId: params.connectionId, initialSchema: params.schema, initialSql: params.sql });
}
function ConsoleTabTitle() {
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("span", { className: "dshdb-tabtitle", title: "查询控制台", children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(TerminalIcon, { size: 12 }),
    "控制台"
  ] });
}

// src/client/TableTab.tsx
var import_react25 = require("react");

// src/client/sorting.ts
function orderColumn(text2) {
  const double = /^"((?:[^"]|"")*)"$/u.exec(text2);
  if (double !== null) return (double[1] ?? "").replaceAll('""', '"');
  const backtick = /^`((?:[^`]|``)*)`$/u.exec(text2);
  if (backtick !== null) return (backtick[1] ?? "").replaceAll("``", "`");
  const bracket = /^\[((?:[^\]]|\]\])*)\]$/u.exec(text2);
  if (bracket !== null) return (bracket[1] ?? "").replaceAll("]]", "]");
  const single = /^'((?:[^']|'')*)'$/u.exec(text2);
  if (single !== null) return (single[1] ?? "").replaceAll("''", "'");
  return /^[A-Za-z0-9_$#]+$/u.test(text2) ? text2 : void 0;
}
function parseOrderBy(text2) {
  const trimmed = text2.trim();
  const directionMatch = /\s+(asc|desc)\s*$/iu.exec(trimmed);
  const direction = directionMatch?.[1]?.toLowerCase() === "desc" ? "desc" : "asc";
  const body = (directionMatch === null ? trimmed : trimmed.slice(0, directionMatch.index)).trim();
  if (body === "") return void 0;
  const column = orderColumn(body);
  if (column === void 0 || column === "") return void 0;
  return { column, direction };
}
function nextOrderBy(text2, column, quoted = column) {
  const current = parseOrderBy(text2);
  if (current === void 0 || current.column !== column) return `${quoted} ASC`;
  return current.direction === "asc" ? `${quoted} DESC` : "";
}
function quoteSortColumn(dialect, column) {
  if (dialect === "mysql") return `\`${column.replaceAll("`", "``")}\``;
  if (dialect === "mssql") return `[${column.replaceAll("]", "]]")}]`;
  return `"${column.replaceAll('"', '""')}"`;
}
var ORDER_BY_PATTERN = /^ORDER\s+BY\b/iu;
function stripOrderBy(text2) {
  const trimmed = text2.trim().replace(/[\s;]+$/u, "");
  if (trimmed === "") return "";
  return trimmed.replace(ORDER_BY_PATTERN, "").trim();
}

// src/client/DdlModal.tsx
var import_react24 = require("react");
var import_jsx_runtime22 = require("react/jsx-runtime");
function DdlModal({ title, text: text2, warnings = [], onClose }) {
  const flash = useCopyFlash();
  (0, import_react24.useEffect)(() => {
    flash.reset();
  }, [flash.reset, text2]);
  if (text2 === null) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(
    Modal,
    {
      open: true,
      title,
      onClose,
      width: 720,
      footer: /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)(import_jsx_runtime22.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "dshdb-modal-foot-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(
          Button,
          {
            size: "sm",
            onClick: () => {
              void copyText(text2).then((ok) => flash.flash(ok));
            },
            children: flash.copied ? "已复制" : "复制"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(Button, { size: "sm", variant: "primary", onClick: onClose, children: "关闭" })
      ] }),
      children: [
        warnings.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "dshdb-muted", style: { margin: "0 0 8px" }, children: warnings.join("；") }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("pre", { className: "dshdb-cellvalue", "aria-label": "建表语句", children: text2 })
      ]
    }
  );
}

// src/client/tabledump.ts
function ddlBlock(ddl) {
  const text2 = ddl.trim();
  if (text2 === "") return "";
  return text2.endsWith(";") ? text2 : `${text2};`;
}
function tableDumpText(dump) {
  const name2 = dump.schema === "" ? dump.table : `${dump.schema}.${dump.table}`;
  const lines = [`-- ${name2}`, "-- 由 dsh-ide-database 导出"];
  const ddl = dump.ddl === null ? "" : ddlBlock(dump.ddl);
  if (ddl === "") {
    lines.push("-- 未能取到建表语句，只导出数据");
  } else {
    lines.push("", ddl);
  }
  if (dump.rows.length > 0) lines.push("");
  for (const row of dump.rows) {
    lines.push(insertStatement(dump.dialect, dump.schema, dump.table, dump.columns, row));
  }
  return `${lines.join("\n")}
`;
}

// src/client/TableTab.tsx
var import_jsx_runtime23 = require("react/jsx-runtime");
var PAGE_SIZES2 = [100, 200, 500, 1e3, 2e3, 5e3];
var AUTO_REFRESH_KEY = "dsh-ide-database.auto-refresh.v1";
var FILTERS_OPEN_KEY = "dsh-ide-database.table.filters-open.v1";
var ORDER_KEY = "dsh-ide-database.table-order.v1";
var AUTO_REFRESH_OPTIONS = [0, 5e3, 1e4, 3e4];
var noTabInfo2 = () => void 0;
function readMigratedText(primary, legacy) {
  try {
    if (window.localStorage.getItem(primary) !== null) return readText(primary);
  } catch {
  }
  const previous = readText(legacy);
  if (previous !== "") {
    writeText(primary, previous);
    writeText(legacy, "");
  }
  return previous;
}
function readMigratedHidden(primary, legacy) {
  if (hasHidden(primary)) return readHidden(primary);
  const previous = readHidden(legacy);
  if (previous !== null) {
    writeHidden(primary, previous);
    writeHidden(legacy, null);
  }
  return previous;
}
function failureText2(error) {
  if (error instanceof ApiError) return { message: error.message, ...error.detail ? { detail: error.detail } : {} };
  return { message: error instanceof Error ? error.message : String(error) };
}
function failureMessage(error) {
  return error.detail === void 0 ? error.message : error.message + "\n" + error.detail;
}
async function runSql(id, sql, maxRows) {
  try {
    return await api.query({ id, sql, maxRows });
  } catch (error) {
    if (error instanceof ApiError && error.code === "not-connected") {
      await api.connect(id);
      return await api.query({ id, sql, maxRows });
    }
    throw error;
  }
}
function TableGrid({ params }) {
  const [connection, setConnection] = (0, import_react25.useState)(null);
  const [columns, setColumns] = (0, import_react25.useState)([]);
  const [rows, setRows] = (0, import_react25.useState)([]);
  const [total, setTotal] = (0, import_react25.useState)(void 0);
  const [countUnknown, setCountUnknown] = (0, import_react25.useState)(false);
  const [elapsed, setElapsed] = (0, import_react25.useState)(void 0);
  const [sqlText, setSqlText] = (0, import_react25.useState)("");
  const [loading, setLoading] = (0, import_react25.useState)(false);
  const [autoMs, setAutoMs] = (0, import_react25.useState)(() => readAllowedNumber(AUTO_REFRESH_KEY, AUTO_REFRESH_OPTIONS, 0));
  const [error, setError] = (0, import_react25.useState)(null);
  const [page, setPage] = (0, import_react25.useState)(0);
  const [pageSize, setPageSize] = (0, import_react25.useState)(() => readPageSize(TABLE_PAGE_KEY, PAGE_SIZES2, 500));
  const [pageDraft, setPageDraft] = (0, import_react25.useState)("1");
  const [whereText, setWhereText] = (0, import_react25.useState)("");
  const columnsListId = `dshdb-columns-${params.table.replace(/[^\w-]/gu, "-")}`;
  const tableScope = `${params.connectionId}:${params.schema}.${params.table}`;
  const legacyTableScope = `${params.schema}.${params.table}`;
  const orderStorageKey = `${ORDER_KEY}:${tableScope}`;
  const gridStorageKey = `table:${tableScope}`;
  const legacyGridStorageKey = `table:${legacyTableScope}`;
  const [orderText, setOrderText] = (0, import_react25.useState)(
    () => readMigratedText(orderStorageKey, `${ORDER_KEY}:${legacyTableScope}`)
  );
  const [filters, setFilters] = (0, import_react25.useState)({});
  const [filtersOpen, setFiltersOpen] = (0, import_react25.useState)(() => readFlag(FILTERS_OPEN_KEY, false));
  const [order2, setOrder] = (0, import_react25.useState)(null);
  (0, import_react25.useEffect)(() => {
    if (columns.length === 0 || storedOrderApplied.current) return;
    storedOrderApplied.current = true;
    const remembered = readText(orderStorageKey);
    if (remembered === "") return;
    const parsed = parseOrderBy(stripOrderBy(remembered));
    if (parsed === void 0) return;
    if (!columns.some((column) => column.name === parsed.column)) {
      writeText(orderStorageKey, "");
      return;
    }
    setOrderText(remembered);
    applyRef.current({ orderBy: remembered, page: 0, recount: false });
  }, [columns, orderStorageKey]);
  const hiddenStorageKey = `table:${tableScope}`;
  const [hiddenColumns, setHiddenColumns] = (0, import_react25.useState)(
    () => readMigratedHidden(hiddenStorageKey, `table:${legacyTableScope}`)
  );
  const [cellView, setCellView] = (0, import_react25.useState)(null);
  const objectKind = params.kind === "view" ? "view" : "table";
  const [ddl, setDdl] = (0, import_react25.useState)(null);
  const [ddlBusy, setDdlBusy] = (0, import_react25.useState)(false);
  const [exportOpen, setExportOpen] = (0, import_react25.useState)(false);
  const [exporting, setExporting] = (0, import_react25.useState)(false);
  const exportingRef = (0, import_react25.useRef)(false);
  const [exportNote, setExportNote] = (0, import_react25.useState)("");
  const [selectedRows, setSelectedRows] = (0, import_react25.useState)(() => /* @__PURE__ */ new Set());
  const selectionAnchor = (0, import_react25.useRef)(null);
  (0, import_react25.useEffect)(() => {
    if (exportNote === "") return void 0;
    const timer = setTimeout(() => setExportNote(""), 2500);
    return () => clearTimeout(timer);
  }, [exportNote]);
  const noteCopied = (0, import_react25.useCallback)(
    (label) => (ok) => {
      setExportNote(ok ? `${label} 已复制` : "复制失败：这个环境不允许访问剪贴板");
    },
    []
  );
  const exportCancelled = (0, import_react25.useRef)(false);
  (0, import_react25.useEffect)(() => {
    return () => {
      exportCancelled.current = true;
    };
  }, []);
  const exportAnchor = (0, import_react25.useRef)(null);
  const closeExport = (0, import_react25.useCallback)(() => setExportOpen(false), []);
  usePopoverDismiss(exportOpen, closeExport, exportAnchor);
  const applyRef = (0, import_react25.useRef)(() => void 0);
  const whereRef = (0, import_react25.useRef)(null);
  const loadToken = (0, import_react25.useRef)(0);
  const lastLoad = (0, import_react25.useRef)(null);
  const storedOrderApplied = (0, import_react25.useRef)(false);
  const filterRowRef = (0, import_react25.useRef)(null);
  const signature = columnSignature(columns);
  (0, import_react25.useEffect)(() => {
    setOrder(null);
    if (columns.length > 0) setHiddenColumns((current) => pruneHidden(current, columns));
  }, [signature, columns]);
  (0, import_react25.useEffect)(() => {
    writeHidden(hiddenStorageKey, hiddenColumns);
  }, [hiddenColumns, hiddenStorageKey]);
  const displayColumns = (0, import_react25.useMemo)(() => orderColumns(columns, order2), [columns, order2]);
  const displayRows = (0, import_react25.useMemo)(() => orderRows(rows, order2), [rows, order2]);
  const hiddenView = (0, import_react25.useMemo)(() => hideColumns(displayColumns, displayRows, hiddenColumns), [displayColumns, displayRows, hiddenColumns]);
  const shownColumns = hiddenView.columns;
  const shownRows = hiddenView.rows;
  const hiddenCount = displayColumns.length - shownColumns.length;
  const widthStorageKey = (0, import_react25.useMemo)(
    () => migrateWidths(gridStorageKey, legacyGridStorageKey, shownColumns.length),
    [gridStorageKey, legacyGridStorageKey, shownColumns.length]
  );
  const previousFullColumns = (0, import_react25.useRef)(displayColumns);
  (0, import_react25.useEffect)(() => {
    const previous = previousFullColumns.current;
    previousFullColumns.current = displayColumns;
    if (shownColumns.length < displayColumns.length) {
      moveWidthsForColumns(previous, displayColumns, widthStorageKey);
    }
  }, [displayColumns, shownColumns.length, widthStorageKey]);
  (0, import_react25.useEffect)(() => {
    setSelectedRows(/* @__PURE__ */ new Set());
    selectionAnchor.current = null;
  }, [rows, page]);
  const load2 = (0, import_react25.useCallback)(
    async (found, target) => {
      const token = ++loadToken.current;
      lastLoad.current = { found, target };
      setLoading(true);
      setError(null);
      try {
        const dialect = found.dialect;
        const from = qualifiedName(dialect, params.schema, params.table);
        const where = stripWhere(target.where);
        const orderBy = stripOrderBy(target.orderBy);
        const whereSql = where === "" ? "" : ` WHERE ${where}`;
        const orderSql = orderByForPaging(dialect, orderBy);
        const offset2 = target.page * target.size;
        const pageSql = `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, target.size, offset2)}`;
        const countPromise = target.recount ? runSql(params.connectionId, `SELECT COUNT(*) FROM ${from}${whereSql}`, 1).then(
          (counted) => {
            const first = counted.rows[0]?.[0];
            const value = typeof first === "number" ? first : Number(first);
            return Number.isFinite(value) ? value : void 0;
          },
          () => void 0
        ) : void 0;
        const result = await runSql(params.connectionId, pageSql, target.size);
        if (token !== loadToken.current) return;
        setColumns(result.columns);
        setRows(result.rows);
        setElapsed(result.elapsedMs);
        setSqlText(result.sql === "" ? pageSql : result.sql);
        setPage(target.page);
        if (countPromise !== void 0) {
          const counted = await countPromise;
          if (token === loadToken.current) {
            setTotal(counted);
            setCountUnknown(counted === void 0);
          }
        }
      } catch (caught) {
        if (token !== loadToken.current) return;
        setError(failureText2(caught));
      } finally {
        if (token === loadToken.current) setLoading(false);
      }
    },
    [params.connectionId, params.schema, params.table]
  );
  (0, import_react25.useEffect)(() => {
    let cancelled = false;
    setConnection(null);
    setRows([]);
    setColumns([]);
    setTotal(void 0);
    setPage(0);
    setWhereText("");
    setOrderText("");
    setFilters({});
    previousActive.current = 0;
    setError(null);
    void (async () => {
      try {
        const status = await api.status();
        const found = status.config.connections.find((item) => item.id === params.connectionId);
        if (found === void 0) throw new ApiError("not-found", "该数据源已不存在，请重新连接后再打开数据表");
        if (found.dialect === "redis") throw new ApiError("unsupported", "数据表只能在关系型数据源中打开");
        if (cancelled) return;
        setConnection(found);
        await load2(found, { page: 0, size: pageSize, where: "", orderBy: "", recount: true });
      } catch (caught) {
        if (!cancelled) setError(failureText2(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load2, params.connectionId]);
  const offset = page * pageSize;
  const activeSort = (0, import_react25.useMemo)(() => parseOrderBy(stripOrderBy(orderText)), [orderText]);
  const apply2 = (0, import_react25.useCallback)(
    (next, override) => {
      if (connection === null) return;
      const manualWhere = next.where ?? whereText;
      const orderBy = next.orderBy ?? orderText;
      writeText(orderStorageKey, orderBy);
      void load2(connection, {
        page: next.page ?? page,
        size: next.size ?? pageSize,
        where: composeWhere(connection.dialect, manualWhere, columns, override ?? filters),
        orderBy,
        recount: next.recount ?? (next.where !== void 0 || next.size !== void 0 || next.page === 0)
      });
    },
    [columns, connection, filters, load2, orderStorageKey, orderText, page, pageSize, whereText]
  );
  applyRef.current = apply2;
  const orderTextRef = (0, import_react25.useRef)(orderText);
  orderTextRef.current = orderText;
  const loadingRef = (0, import_react25.useRef)(loading);
  loadingRef.current = loading;
  const sortTable = (0, import_react25.useCallback)(
    (column) => {
      const dialect = connection?.dialect ?? "mysql";
      const next = nextOrderBy(stripOrderBy(orderTextRef.current), column.name, quoteSortColumn(dialect, column.name));
      setOrderText(next);
      applyRef.current({ orderBy: next, page: 0 });
    },
    [connection?.dialect]
  );
  const sortBy = (0, import_react25.useCallback)(
    (column, direction) => {
      const dialect = connection?.dialect ?? "mysql";
      const next = `${quoteSortColumn(dialect, column.name)} ${direction.toUpperCase()}`;
      setOrderText(next);
      applyRef.current({ orderBy: next, page: 0 });
    },
    [connection?.dialect]
  );
  const clearSort = (0, import_react25.useCallback)(() => {
    setOrderText("");
    applyRef.current({ orderBy: "", page: 0 });
  }, []);
  const columnMenu = (0, import_react25.useCallback)(
    (column) => {
      const active = activeSort?.column === column.name ? activeSort.direction : null;
      const index = columns.findIndex((item) => item.name === column.name);
      const binary = isBinaryType(column.typeName, connection?.dialect) || index >= 0 && rows.some((row) => isBinaryCell(column, row[index] ?? null, connection?.dialect));
      return [
        { label: "按此列升序", disabled: active === "asc", run: () => sortBy(column, "asc") },
        { label: "按此列降序", disabled: active === "desc", run: () => sortBy(column, "desc") },
        { label: "清除排序", disabled: activeSort === void 0, run: clearSort },
        { label: `复制列名「${column.name}」`, run: () => void copyText(column.name).then(noteCopied("列名")) },
        {
          label: `复制本列值（${rows.length} 行）`,
          disabled: rows.length === 0 || index < 0,
          run: () => void copyText(columnValues(rows, index)).then(noteCopied("本列值"))
        },
        {
          label: binary ? "复制为 IN 列表（二进制列无法匹配）" : "复制为 IN 列表",
          disabled: rows.length === 0 || index < 0 || binary,
          run: () => void copyText(inListOf(connection?.dialect ?? "mysql", rows, index, column)).then(noteCopied("IN 列表"))
        },
        {
          label: "复制本列（逗号分隔）",
          disabled: rows.length === 0 || index < 0,
          run: () => void copyText(commaValues(rows, index)).then(noteCopied("逗号分隔"))
        },
        {
          label: "复制全部列名",
          disabled: displayColumns.length === 0,
          run: () => void copyText(columnNames(connection?.dialect ?? "mysql", displayColumns)).then(noteCopied("全部列名"))
        },
        {
          label: `复制查询语句（${displayColumns.length} 列）`,
          disabled: displayColumns.length === 0,
          run: () => void copyText(selectColumnsSql(connection?.dialect ?? "mysql", params.schema, params.table, displayColumns)).then(noteCopied("查询语句"))
        },
        {
          label: `隐藏列「${column.name}」`,
          disabled: shownColumns.length <= 1,
          run: () => setHiddenColumns((current) => toggleHidden(current, column.name))
        },
        {
          label: "只看这一列",
          disabled: displayColumns.length <= 1,
          run: () => setHiddenColumns(onlyColumn(displayColumns, column.name))
        },
        {
          label: hiddenCount === 0 ? "显示全部列" : `显示全部列（已隐藏 ${hiddenCount} 列）`,
          disabled: hiddenCount === 0,
          run: () => setHiddenColumns(null)
        }
      ];
    },
    [activeSort, clearSort, columns, displayColumns, hiddenCount, rows, shownColumns.length, sortBy]
  );
  const gridReorder = (0, import_react25.useCallback)(
    (from, to) => {
      const positions = hiddenView.positions;
      const source = positions[from] ?? from;
      const target = positions[to] ?? to;
      setOrder((current) => moveColumn(current ?? identityOrder(displayColumns.length), source, target));
    },
    [displayColumns.length, hiddenView.positions]
  );
  (0, import_react25.useEffect)(() => {
    if (autoMs === 0 || connection === null) return void 0;
    const tick = () => {
      if (exportingRef.current) return;
      if (!loadingRef.current) applyRef.current({ recount: false });
    };
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      tick();
    }, autoMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [autoMs, connection]);
  const openDdl = (0, import_react25.useCallback)(async () => {
    if (connection === null) return;
    setDdlBusy(true);
    try {
      const result = await api.ddl(params.connectionId, params.schema, params.table, objectKind);
      setDdl({
        title: `${params.schema}.${params.table} 的${objectKind === "view" ? "视图定义" : "建表语句"}`,
        text: result.ddl,
        warnings: result.warnings
      });
    } catch (caught) {
      setError(failureText2(caught));
    } finally {
      setDdlBusy(false);
    }
  }, [connection, objectKind, params.connectionId, params.schema, params.table]);
  const gridCellOpen = (0, import_react25.useCallback)((column, value) => {
    setCellView(cellValueView(column.name, value));
  }, []);
  const gridCellClass = (0, import_react25.useCallback)(
    () => filtersOpen ? "dshdb-cell-filterable" : void 0,
    [filtersOpen]
  );
  const gridCellMenu = (0, import_react25.useCallback)(
    (cell) => {
      const binary = isBinaryCell(cell.column, cell.value, connection?.dialect);
      return [
        {
          label: "查看完整值",
          run: () => setCellView(cellValueView(cell.column.name, cell.value))
        },
        {
          label: "复制单元格值",
          run: () => void copyText(cellCopyText(cell.value)).then(noteCopied("单元格值"))
        },
        {
          label: `复制整行（${displayColumns.length} 列，制表符分隔）`,
          run: () => void copyText(rowToTsv(displayColumns, displayRows[cell.rowIndex] ?? cell.row)).then(noteCopied("整行"))
        },
        {
          label: "复制 INSERT 语句",
          run: () => {
            if (connection === null) return;
            const full = displayRows[cell.rowIndex] ?? cell.row;
            void copyText(insertStatement(connection.dialect, params.schema, params.table, displayColumns, full)).then(noteCopied("INSERT"));
          }
        },
        {
          label: binary ? "复制 WHERE 条件（二进制值无法匹配）" : "复制 WHERE 条件",
          disabled: binary,
          run: () => {
            if (connection === null) return;
            void copyText(`WHERE ${cellWhere(connection.dialect, cell.column, cell.value)}`).then(noteCopied("WHERE 条件"));
          }
        },
        {
          label: "按此列分组计数",
          run: () => {
            if (connection === null) return;
            openConsoleTab({
              connectionId: params.connectionId,
              sql: groupCountSql(connection.dialect, params.schema, params.table, cell.column)
            });
          }
        },
        {
          label: binary ? "在控制台按该值查询（二进制值无法匹配）" : "在控制台按该值查询",
          disabled: binary,
          run: () => {
            if (connection === null) return;
            const where = cellWhere(connection.dialect, cell.column, cell.value);
            openConsoleTab({
              connectionId: params.connectionId,
              sql: tableSelectSql(connection.dialect, params.schema, params.table, where, "", pageSize)
            });
          }
        },
        {
          label: binary ? "按此值筛选（二进制值无法匹配）" : "按此值筛选",
          disabled: binary,
          run: () => {
            setFiltersOpen(true);
            setColumnFilter(
              cell.column,
              cell.value === null ? { text: "", op: "isnull" } : { text: formatCell(cell.value), op: "eq" }
            );
          }
        },
        {
          label: `取消「${cell.column.name}」列的筛选`,
          disabled: columnFilter(filters, cell.column.name) === void 0,
          run: () => {
            setColumnFilter(cell.column, void 0);
            apply2({ page: 0 });
          }
        }
      ];
    },
    [connection, displayColumns, displayRows, filters, pageSize, params.schema, params.table]
  );
  const hasPrevious = page > 0;
  const lastPage = total === void 0 ? void 0 : Math.max(Math.ceil(total / pageSize) - 1, 0);
  (0, import_react25.useEffect)(() => {
    if (loading || connection === null || total === void 0) return;
    if (rows.length > 0 || page === 0) return;
    const last = Math.max(Math.ceil(total / pageSize) - 1, 0);
    if (last >= page) return;
    void load2(connection, {
      page: last,
      size: pageSize,
      where: composeWhere(connection.dialect, whereText, columns, filters),
      orderBy: orderText,
      recount: false
    });
  }, [columns, connection, filters, load2, loading, orderText, page, pageSize, rows.length, total, whereText]);
  (0, import_react25.useEffect)(() => {
    setPageDraft(String(page + 1));
  }, [page]);
  const jumpToPage = (0, import_react25.useCallback)(() => {
    const wanted = Number.parseInt(pageDraft, 10);
    const target = Number.isFinite(wanted) && wanted >= 1 ? wanted - 1 : page;
    const bounded = lastPage === void 0 ? target : Math.min(target, lastPage);
    if (bounded === page) {
      setPageDraft(String(page + 1));
      return;
    }
    apply2({ page: bounded });
  }, [apply2, lastPage, page, pageDraft]);
  const hasNext = lastPage === void 0 ? rows.length >= pageSize : page < lastPage;
  const rangeStart = rows.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + rows.length;
  const totalText = total !== void 0 ? `/${formatCount(total)}` : hasNext ? `/${formatCount(offset + pageSize)}+` : "";
  const columnsRef = (0, import_react25.useRef)([]);
  columnsRef.current = columns;
  const previousActive = (0, import_react25.useRef)(0);
  (0, import_react25.useEffect)(() => {
    if (!filtersOpen || connection === null) return;
    const active = columnsRef.current.filter((column) => columnFilter(filters, column.name) !== void 0).length;
    const hadFilters = previousActive.current > 0;
    previousActive.current = active;
    if (active === 0) {
      if (hadFilters) applyRef.current({ page: 0 }, {});
      return;
    }
    const timer = setTimeout(() => applyRef.current({ page: 0 }), 400);
    return () => clearTimeout(timer);
  }, [filters, filtersOpen, connection]);
  (0, import_react25.useEffect)(() => {
    if (!filtersOpen) return;
    filterRowRef.current?.querySelector("input")?.focus();
  }, [filtersOpen]);
  const activeFilterCount = columns.filter((column) => columnFilter(filters, column.name) !== void 0).length;
  const clearColumnFilters = (0, import_react25.useCallback)(() => {
    setFilters({});
    if (connection !== null) apply2({ where: composeWhere(connection.dialect, whereText, columns, {}), page: 0 });
  }, [apply2, columns, connection, whereText]);
  const handleShortcuts = (0, import_react25.useCallback)((event) => {
    if (shortcutHit(event, "table.where")) {
      event.preventDefault();
      whereRef.current?.focus();
      return;
    }
    if (shortcutHit(event, "table.refresh")) {
      event.preventDefault();
      applyRef.current({ recount: true });
    }
  }, []);
  const conditioned = whereText.trim() !== "" || activeFilterCount > 0;
  const setColumnFilter = (column, filter) => {
    setFilters((previous) => withColumnFilter(previous, column.name, filter));
  };
  const EXPORT_LIMIT2 = 5e4;
  const collectAllRows = async (label) => {
    if (connection === null) return { columns: displayColumns, rows: [] };
    const dialect = connection.dialect;
    const from = qualifiedName(dialect, params.schema, params.table);
    const where = composeWhere(dialect, whereText, columns, filters);
    const whereSql = where === "" ? "" : ` WHERE ${where}`;
    const orderBy = stripOrderBy(orderText);
    const orderSql = orderByForPaging(dialect, orderBy);
    const batch = 2e3;
    let seeded = false;
    let collectedColumns = displayColumns;
    const collected = await collectRows({
      limit: EXPORT_LIMIT2,
      batch,
      cancelled: () => exportCancelled.current,
      onProgress: (count) => setExportNote(`${label} 正在取 ${formatCount(count)} 行…`),
      fetch: async ({ offset: offset2 }) => {
        const sql = `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, batch, offset2)}`;
        const result = await runSql(params.connectionId, sql, batch);
        if (!seeded) {
          collectedColumns = result.columns;
          seeded = true;
        }
        return result.rows;
      }
    });
    return { columns: collectedColumns, rows: collected };
  };
  const exportRows = async (format, scope) => {
    if (connection === null) return;
    setExporting(true);
    exportingRef.current = true;
    setExportOpen(false);
    exportCancelled.current = false;
    try {
      const dialect = connection.dialect;
      let exportColumns = displayColumns;
      let exportData = displayRows;
      if (scope === "all") {
        const collected = await collectAllRows(format.toUpperCase());
        if (exportCancelled.current) {
          setExportNote(`${format.toUpperCase()} 导出已取消`);
          setTimeout(() => setExportNote(""), 5e3);
          return;
        }
        exportData = orderRows(collected.rows, order2);
        exportColumns = orderColumns(collected.columns, order2);
      }
      const payload = renderExport(format, {
        dialect,
        schema: params.schema,
        table: params.table,
        columns: exportColumns,
        rows: exportData
      });
      downloadText(exportFilename(params.schema, params.table, format), payload.mime, payload.text);
      setExportNote(`${format.toUpperCase()} 已导出 ${formatCount(exportData.length)} 行`);
      setTimeout(() => setExportNote(""), 5e3);
    } catch (caught) {
      setError(failureText2(caught));
    } finally {
      setExporting(false);
      exportingRef.current = false;
    }
  };
  const selectRow = (0, import_react25.useCallback)((rowIndex, extend) => {
    setSelectedRows((current) => {
      const next = new Set(current);
      if (extend && selectionAnchor.current !== null) {
        const from = Math.min(selectionAnchor.current, rowIndex);
        const to = Math.max(selectionAnchor.current, rowIndex);
        for (let index = from; index <= to; index += 1) next.add(index);
        return next;
      }
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
    selectionAnchor.current = rowIndex;
  }, []);
  const toggleAllRows = (0, import_react25.useCallback)(() => {
    setSelectedRows(
      (current) => current.size === shownRows.length ? /* @__PURE__ */ new Set() : new Set(shownRows.map((_, index) => index))
    );
  }, [shownRows]);
  const exportSelected = (format) => {
    setExportOpen(false);
    const picked = displayRows.filter((_, index) => selectedRows.has(index));
    if (picked.length === 0) return;
    const payload = renderExport(format, {
      dialect: connection?.dialect ?? "mysql",
      schema: params.schema,
      table: params.table,
      columns: displayColumns,
      rows: picked
    });
    downloadText(exportFilename(params.schema, params.table, format), payload.mime, payload.text);
    setExportNote(`${format.toUpperCase()} 已导出 ${picked.length} 行`);
    setTimeout(() => setExportNote(""), 5e3);
    setSelectedRows(/* @__PURE__ */ new Set());
  };
  const exportDump = async () => {
    if (connection === null) return;
    setExporting(true);
    exportingRef.current = true;
    setExportOpen(false);
    exportCancelled.current = false;
    try {
      const collected = await collectAllRows("脚本");
      if (exportCancelled.current) {
        setExportNote("脚本导出已取消");
        setTimeout(() => setExportNote(""), 5e3);
        return;
      }
      const ddl2 = await api.ddl(params.connectionId, params.schema, params.table, objectKind).then((result) => result.ddl).catch(() => null);
      const text2 = tableDumpText({
        dialect: connection.dialect,
        schema: params.schema,
        table: params.table,
        ddl: ddl2,
        columns: orderColumns(collected.columns, order2),
        rows: orderRows(collected.rows, order2)
      });
      downloadText(exportFilename(params.schema, params.table, "sql"), "application/sql", text2);
      setExportNote(`SQL 已导出 ${formatCount(collected.rows.length)} 行`);
      setTimeout(() => setExportNote(""), 5e3);
    } catch (caught) {
      setError(failureText2(caught));
    } finally {
      setExporting(false);
      exportingRef.current = false;
    }
  };
  if (error !== null && rows.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "dshdb-qtab", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
      Banner,
      {
        tone: "error",
        onClose: () => setError(null),
        actions: /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              onClick: () => {
                const last = lastLoad.current;
                if (last === null) return;
                void load2(last.found, last.target);
              },
              children: "重试"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Button, { size: "sm", variant: "ghost", title: "复制错误信息", onClick: () => void copyText(failureMessage(error)), children: "复制" })
        ] }),
        children: [
          error.message,
          error.detail ? `
${error.detail}` : ""
        ]
      }
    ) });
  }
  const copySelected = (format) => {
    const picked = displayRows.filter((_, index) => selectedRows.has(index));
    if (picked.length === 0) return;
    const text2 = format === "csv" ? toCsv(displayColumns, picked) : format === "tsv" ? toTsv(displayColumns, picked) : format === "json" ? toJson(displayColumns, picked) : format === "md" ? toMarkdown(displayColumns, picked) : insertStatements(connection?.dialect ?? "mysql", params.schema, params.table, displayColumns, picked);
    void copyText(text2).then(noteCopied(format === "md" ? "Markdown" : format.toUpperCase()));
  };
  const exportGroups = [
    {
      id: "page",
      label: "导出当前页",
      leaves: [
        { id: "page-csv", label: `当前页 CSV（${formatCount(rows.length)} 行）`, onSelect: () => void exportRows("csv", "page") },
        { id: "page-json", label: `当前页 JSON（${formatCount(rows.length)} 行）`, onSelect: () => void exportRows("json", "page") },
        { id: "page-sql", label: `当前页 SQL（${formatCount(rows.length)} 行）`, onSelect: () => void exportRows("sql", "page") },
        { id: "page-md", label: `当前页 Markdown（${formatCount(rows.length)} 行）`, onSelect: () => void exportRows("md", "page") }
      ]
    },
    ...selectedRows.size > 0 ? [
      {
        id: "selected",
        label: "导出已选",
        leaves: [
          { id: "selected-csv", label: `已选 CSV（${selectedRows.size} 行）`, onSelect: () => exportSelected("csv") },
          { id: "selected-json", label: `已选 JSON（${selectedRows.size} 行）`, onSelect: () => exportSelected("json") },
          { id: "selected-sql", label: `已选 SQL（${selectedRows.size} 行）`, onSelect: () => exportSelected("sql") },
          { id: "selected-md", label: `已选 Markdown（${selectedRows.size} 行）`, onSelect: () => exportSelected("md") }
        ]
      }
    ] : [],
    {
      id: "copy-page",
      label: "复制当前页",
      leaves: [
        { id: "copy-page-md", label: "复制当前页 Markdown", onSelect: () => void copyText(toMarkdown(displayColumns, rows)).then(noteCopied("Markdown")) },
        { id: "copy-page-csv", label: "复制当前页 CSV", onSelect: () => void copyText(toCsv(displayColumns, rows)).then(noteCopied("CSV")) },
        { id: "copy-page-tsv", label: "复制当前页 TSV", onSelect: () => void copyText(toTsv(displayColumns, rows)).then(noteCopied("TSV")) },
        { id: "copy-page-json", label: "复制当前页 JSON", onSelect: () => void copyText(toJson(displayColumns, rows)).then(noteCopied("JSON")) },
        {
          id: "copy-page-sql",
          label: "复制当前页 SQL",
          onSelect: () => void copyText(insertStatements(connection?.dialect ?? "mysql", params.schema, params.table, displayColumns, rows)).then(noteCopied("SQL"))
        }
      ]
    },
    ...selectedRows.size > 0 ? [
      {
        id: "copy-selected",
        label: "复制已选",
        leaves: [
          { id: "copy-selected-md", label: "复制已选 Markdown", onSelect: () => copySelected("md") },
          { id: "copy-selected-csv", label: "复制已选 CSV", onSelect: () => copySelected("csv") },
          { id: "copy-selected-tsv", label: "复制已选 TSV", onSelect: () => copySelected("tsv") },
          { id: "copy-selected-json", label: "复制已选 JSON", onSelect: () => copySelected("json") },
          { id: "copy-selected-sql", label: "复制已选 SQL", onSelect: () => copySelected("sql") }
        ]
      }
    ] : [],
    {
      id: "all",
      label: "导出全部",
      leaves: [
        { id: "all-csv", label: "全部 CSV", onSelect: () => void exportRows("csv", "all") },
        { id: "all-json", label: "全部 JSON", onSelect: () => void exportRows("json", "all") },
        { id: "all-sql", label: "全部 SQL", onSelect: () => void exportRows("sql", "all") },
        { id: "all-md", label: "全部 Markdown", onSelect: () => void exportRows("md", "all") }
      ]
    }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "dshdb-qtab", onKeyDown: handleShortcuts, children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "dshdb-qbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("span", { className: "dshdb-qtable", title: `${params.schema}.${params.table}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(TableIcon, { size: 13 }),
        params.table
      ] }),
      connection?.readOnly === true ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Tag, { tone: "warn", title: "这条连接是只读的，写语句会被拒绝", children: "只读" }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-qbar-spacer" }),
      loading ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Loading, { bare: true }) : null,
      elapsed !== void 0 && !loading ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-qmeta", children: formatMs(elapsed) }) : null,
      exportNote !== "" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Tag, { tone: "business", role: "status", children: exportNote }) : null,
      exporting ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "停止导出，已取到的行不会写入文件",
          onClick: () => {
            exportCancelled.current = true;
          },
          children: "取消"
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("span", { className: "dshdb-menu-wrap", ref: exportAnchor, children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
          "button",
          {
            type: "button",
            className: `dshdb-pager-btn${exportOpen ? " dshdb-pager-btn-active" : ""}`,
            title: "导出结果",
            "aria-label": "导出结果",
            "aria-expanded": exportOpen,
            onClick: () => setExportOpen((open) => !open),
            disabled: loading || exporting || rows.length === 0,
            children: exporting ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Spinner, {}) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(DownloadIcon, { size: 13 })
          }
        ),
        exportOpen ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
          MenuGroupList,
          {
            groups: exportGroups,
            extra: { id: "dump", label: "整表脚本", onSelect: () => void exportDump() },
            onClose: () => setExportOpen(false)
          }
        ) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
        "button",
        {
          type: "button",
          className: `dshdb-pager-btn${filtersOpen ? " dshdb-pager-btn-active" : ""}`,
          title: filtersOpen ? "关闭列筛选" : "按列筛选（也可点击单元格按值筛选）",
          "aria-label": "列筛选",
          "aria-pressed": filtersOpen,
          onClick: () => {
            setFiltersOpen((open) => {
              const next = !open;
              writeFlag(FILTERS_OPEN_KEY, next);
              return next;
            });
          },
          disabled: loading,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(FilterIcon, { size: 13 }),
            activeFilterCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-filter-count", children: activeFilterCount }) : null
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "在查询控制台打开这个表",
          "aria-label": "在查询控制台打开",
          onClick: () => {
            const target = connection;
            if (target === null) return;
            const where = composeWhere(target.dialect, whereText, columns, filters);
            const orderBy = stripOrderBy(orderText);
            openConsoleTab({
              connectionId: params.connectionId,
              sql: tableSelectSql(target.dialect, params.schema, params.table, where, orderBy, pageSize)
            });
          },
          disabled: loading,
          children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(TerminalIcon, { size: 13 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
        "select",
        {
          className: "dshdb-input dshdb-qfilter-input",
          "aria-label": "自动刷新",
          title: "定时重新查询当前页",
          value: autoMs,
          onChange: (event) => {
            const next = Number(event.target.value);
            setAutoMs(next);
            writeNumber(AUTO_REFRESH_KEY, next);
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("option", { value: 0, children: "不自动刷新" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("option", { value: 5e3, children: "每 5 秒刷新" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("option", { value: 1e4, children: "每 10 秒刷新" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("option", { value: 3e4, children: "每 30 秒刷新" })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "查看建表语句",
          "aria-label": "查看建表语句",
          onClick: () => void openDdl(),
          disabled: ddlBusy,
          children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(TableIcon, { size: 13 })
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "刷新",
          "aria-label": "刷新",
          onClick: () => apply2({ recount: true }),
          disabled: loading,
          children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(RefreshIcon, { size: 13 })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "dshdb-qfilter", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-qfilter-label", children: "WHERE" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "input",
        {
          ref: whereRef,
          className: "dshdb-input dshdb-qfilter-input",
          placeholder: "过滤条件，例如 ID > 10 AND BCH = '6084'",
          "aria-label": "过滤条件",
          list: columnsListId,
          title: `${shortcutLabel("table.where")} 聚焦这里`,
          value: whereText,
          spellCheck: false,
          onChange: (event) => setWhereText(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter") apply2({ where: whereText, page: 0 });
            if (event.key === "Escape") {
              setWhereText("");
              apply2({ where: "", page: 0 });
            }
          }
        }
      ),
      whereText === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-row-action",
          title: "清空过滤条件",
          "aria-label": "清空过滤条件",
          onClick: () => {
            setWhereText("");
            apply2({ where: "", page: 0 });
          },
          children: "×"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-qfilter-label", children: "ORDER BY" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "input",
        {
          className: "dshdb-input dshdb-qfilter-input dshdb-qfilter-order",
          placeholder: "排序列，例如 ID DESC",
          "aria-label": "排序列",
          list: columnsListId,
          value: orderText,
          spellCheck: false,
          onChange: (event) => setOrderText(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter") apply2({ orderBy: orderText, page: 0 });
            if (event.key === "Escape") {
              setOrderText("");
              apply2({ orderBy: "", page: 0 });
            }
          }
        }
      ),
      orderText === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-row-action",
          title: "清空排序",
          "aria-label": "清空排序",
          onClick: () => {
            setOrderText("");
            apply2({ orderBy: "", page: 0 });
          },
          children: "×"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("datalist", { id: columnsListId, children: columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("option", { value: column.name }, column.name)) }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "应用查询条件",
          "aria-label": "应用查询条件",
          onClick: () => apply2({ where: whereText, orderBy: orderText, page: 0 }),
          disabled: loading,
          children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(PlayIcon, { size: 13 })
        }
      )
    ] }),
    error !== null ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
      Banner,
      {
        tone: "error",
        onClose: () => setError(null),
        actions: /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              onClick: () => {
                const last = lastLoad.current;
                if (last === null) return;
                void load2(last.found, last.target);
              },
              children: "重试"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Button, { size: "sm", variant: "ghost", title: "复制错误信息", onClick: () => void copyText(failureMessage(error)), children: "复制" })
        ] }),
        children: [
          error.message,
          error.detail ? `
${error.detail}` : ""
        ]
      }
    ) : null,
    rows.length === 0 && !loading ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "dshdb-grid-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(TableIcon, { size: 22 }),
        title: conditioned ? "没有匹配的行" : "这张表还没有数据",
        description: conditioned ? sqlText : "表里一行数据都没有",
        actions: conditioned ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => {
              setWhereText("");
              setFilters({});
              setOrderText("");
              apply2({ where: "", orderBy: "", page: 0 });
            },
            title: "清掉过滤条件、列筛选与排序再查一次",
            children: "清空条件"
          }
        ) : void 0
      }
    ) }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      DataGrid,
      {
        label: "表数据",
        columns: shownColumns,
        rows: shownRows,
        offset,
        storageKey: widthStorageKey,
        widthColumnCount: displayColumns.length,
        resetKey: lastLoad.current === null ? "" : `${lastLoad.current.target.page}:${lastLoad.current.target.size}:${lastLoad.current.target.where}:${lastLoad.current.target.orderBy}`,
        sort: activeSort ?? null,
        headerMenu: columnMenu,
        onSort: sortTable,
        onReorderColumns: gridReorder,
        selectedRows,
        onToggleRow: selectRow,
        onToggleAllRows: toggleAllRows,
        headerExtra: filtersOpen ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(
          "tr",
          {
            className: "dshdb-filter-row",
            ref: filterRowRef,
            onKeyDown: (event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              setFiltersOpen(false);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("th", { className: "dshdb-select-cell" }),
              /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("th", { className: "dshdb-num", children: activeFilterCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { type: "button", className: "dshdb-row-action", title: "清除所有列筛选", "aria-label": "清除列筛选", onClick: clearColumnFilters, children: "×" }) : null }),
              shownColumns.map((column, index) => {
                const filter = columnFilter(filters, column.name);
                const cleared = filter === void 0 || filter.op !== "isnull" && filter.text.trim() === "";
                const binary = isBinaryType(column.typeName, connection?.dialect) || shownRows.some((row) => isBinaryCell(column, row[index] ?? null, connection?.dialect));
                return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("th", { children: /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("span", { className: `dshdb-filter-box${cleared ? "" : " dshdb-filter-box-active"}`, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                    "input",
                    {
                      className: "dshdb-filter-input",
                      placeholder: binary ? "二进制列" : filter?.op === "isnull" ? "NULL" : "包含…",
                      "aria-label": `筛选 ${column.name}`,
                      title: binary ? "二进制列不能按文本筛选" : filter?.op === "isnull" ? "等于 NULL" : `按 ${column.name} 筛选（包含匹配）`,
                      value: filter?.op === "isnull" ? "" : filter?.text ?? "",
                      disabled: binary,
                      spellCheck: false,
                      onChange: (event) => {
                        const text2 = event.target.value;
                        setColumnFilter(column, text2 === "" ? void 0 : { text: text2, op: "like" });
                      },
                      onKeyDown: (event) => {
                        if (event.key === "Enter") applyRef.current({ page: 0 });
                      }
                    }
                  ),
                  cleared ? null : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
                    "button",
                    {
                      type: "button",
                      className: "dshdb-filter-clear",
                      "aria-label": `清除 ${column.name} 的筛选`,
                      onClick: () => {
                        const next = withColumnFilter(filters, column.name, void 0);
                        setFilters(next);
                        applyRef.current({ page: 0 }, next);
                      },
                      children: "×"
                    }
                  )
                ] }) }, `filter-${column.name}-${index}`);
              })
            ]
          }
        ) : null,
        cellClass: gridCellClass,
        cellMenu: gridCellMenu,
        onCellOpen: gridCellOpen,
        onCellClick: filtersOpen ? (column, value) => {
          if (isBinaryCell(column, value, connection?.dialect)) return;
          setColumnFilter(column, value === null ? { text: "", op: "isnull" } : { text: formatCell(value), op: "eq" });
        } : void 0
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "dshdb-pager", children: [
      loading ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Tag, { tone: "business", children: "查询中" }) : null,
      sqlText !== "" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-pager-sql", title: sqlText, children: sqlText }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
          "button",
          {
            type: "button",
            className: "dshdb-pager-btn",
            title: "复制实际执行的 SQL",
            "aria-label": "复制 SQL",
            onClick: () => void copyText(sqlText),
            children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(CopyIcon, { size: 12 })
          }
        )
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-pager-spacer" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "第一页",
          "aria-label": "第一页",
          onClick: () => apply2({ page: 0 }),
          disabled: !hasPrevious || loading,
          children: "|◀"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "上一页",
          "aria-label": "上一页",
          onClick: () => apply2({ page: Math.max(page - 1, 0) }),
          disabled: !hasPrevious || loading,
          children: "◀"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("span", { className: "dshdb-pager-range", title: `${formatCount(rangeStart)}-${formatCount(rangeEnd)}`, children: [
        formatCount(rangeStart),
        "-",
        formatCount(rangeEnd)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-pager-jump", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "input",
        {
          className: "dshdb-input dshdb-pager-input",
          type: "number",
          min: 1,
          inputMode: "numeric",
          "aria-label": "页码",
          title: "输入页码后回车跳到该页",
          value: pageDraft,
          disabled: loading,
          onChange: (event) => setPageDraft(event.target.value),
          onKeyDown: (event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            jumpToPage();
          },
          onBlur: jumpToPage
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "select",
        {
          className: "dshdb-select dshdb-select-inline dshdb-pager-size",
          "aria-label": "每页行数",
          value: String(pageSize),
          disabled: loading,
          onChange: (event) => {
            const size = Number(event.target.value);
            setPageSize(size);
            writePageSize(TABLE_PAGE_KEY, size);
            apply2({ size, page: 0 });
          },
          children: PAGE_SIZES2.map((size) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("option", { value: size, children: formatCount(size) }, size))
        }
      ),
      countUnknown ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Tag, { tone: "warn", title: "行数统计失败（可能是权限或超时），页码只能按已取到的行数往后翻", children: "行数未知" }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { className: "dshdb-pager-total", children: totalText }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "下一页",
          "aria-label": "下一页",
          onClick: () => apply2({ page: page + 1 }),
          disabled: !hasNext || loading,
          children: "▶"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "最后一页",
          "aria-label": "最后一页",
          onClick: () => apply2({ page: lastPage ?? page }),
          disabled: lastPage === void 0 || loading || page >= lastPage,
          children: "▶|"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      DdlModal,
      {
        title: ddl?.title ?? "",
        text: ddl?.text ?? null,
        warnings: ddl?.warnings ?? [],
        onClose: () => setDdl(null)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(CellValueModal, { view: cellView, onClose: () => setCellView(null) })
  ] });
}
function TableTab(props) {
  const info = (props.useTabInfo ?? noTabInfo2)();
  const params = readTableTabParams(info?.tab?.navigation?.params);
  if (params === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(TableIcon, { size: 22 }),
        title: "数据表已关闭",
        description: "这个标签页没有记录数据表位置，请在数据树中双击数据表重新打开。"
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(TableGrid, { params });
}
function TableTabTitle(props) {
  const info = (props.useTabInfo ?? noTabInfo2)();
  const params = readTableTabParams(info?.tab?.navigation?.params);
  if (params === void 0) return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("span", { children: "数据表" });
  const label = params.table;
  const qualified = params.schema === "" ? params.table : `${params.schema}.${params.table}`;
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("span", { className: "dshdb-tabtitle", title: qualified, children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(TableIcon, { size: 12 }),
    label
  ] });
}

// src/client/styles.ts
var CSS = `
/* Announced to screen readers, invisible on screen. */
.dshdb-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.dshdb-root {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-family: var(--dsw-font-family, system-ui, -apple-system, "Segoe UI", sans-serif);
  font-size: 12px;
  line-height: 18px;
  overflow: hidden;
}

/* Glyphs are flex children all over this panel. A block-level svg drops the
   descender gap an inline one leaves, so an icon and the text beside it share
   one centre line instead of the glyph riding high. */
.dshdb-root svg { display: block; }

/* IDEA 风格工具窗口工具栏：按钮左对齐，右侧放视图切换 */
.dshdb-toolbar-top {
  padding: 5px 8px;
  gap: 2px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  /* 放不下的按钮由「⋯」接管，不再换行。 */
  flex-wrap: nowrap;
}
.dshdb-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1 1 auto;
  min-width: 0;
}
.dshdb-toolbar-slot {
  display: inline-flex;
  flex: none;
}
/* 隐藏的按钮留在原位测量宽度，但不参与布局；「⋯」菜单绝对定位在它下面，
   所以这一层不能设 overflow: hidden。 */
.dshdb-toolbar-slot-hidden {
  position: absolute;
  left: -99999px;
  top: 0;
  visibility: hidden;
  pointer-events: none;
}
.dshdb-toolbar-more {
  margin-left: auto;
}
.dshdb-toolbtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0 7px;
  flex: none;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: inherit;
  font-size: 12px;
  /* The UA font shorthand on <button> leaves line-height at normal, whose extra
     line gap pushes the glyph 1px below the icon. Pinning the line box to the
     font content height keeps label and icon on one optical centre. */
  line-height: 15px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.dshdb-toolbtn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dshdb-toolbtn:disabled { opacity: 0.45; cursor: default; }
.dshdb-toolbtn svg { flex: none; color: inherit; }
.dshdb-toolbtn:hover:not(:disabled) svg { color: var(--dsw-alias-label-primary); }

.dshdb-tab {
  height: 24px;
  padding: 0 9px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
}
.dshdb-tab:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshdb-tab[data-active="true"] {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
  font-weight: 500;
}

.dshdb-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.dshdb-scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px 10px 12px;
}
.dshdb-view {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  height: 100%;
}
.dshdb-view-hidden { display: none; }

.dshdb-panel {
  display: flex;
  flex-direction: column;
  flex: none;
  min-height: 0;
  min-width: 0;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  overflow: hidden;
}
.dshdb-panel-head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  flex: none;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.dshdb-panel-head-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-transform: none;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
}
.dshdb-panel-toggle {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  text-transform: none;
  color: var(--dsw-alias-label-secondary);
}
.dshdb-panel-toggle:hover { color: var(--dsw-alias-label-primary); }
.dshdb-panel-toggle span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-panel-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  flex: 1;
}
.dshdb-panel-body-pad { padding: 8px; }

.dshdb-tree {
  display: flex;
  flex-direction: column;
  padding: 2px 4px 6px;
  min-height: 0;
  overflow: auto;
  flex: 1;
  position: relative;
  overflow-anchor: none;
}
/* The virtual list: one tall spacer gives the scrollbar its real length, and
   absolutely positioned slots hold only the rows inside the viewport. */
.dshdb-tree-body {
  position: relative;
  flex: none;
  width: 100%;
}
.dshdb-tree-slot {
  position: absolute;
  left: 0;
  right: 0;
  height: 26px;
}
.dshdb-tree-slot > .dshdb-row {
  height: 26px;
  min-height: 26px;
}
.dshdb-tree:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: -2px;
}
.dshdb-row {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  box-sizing: border-box;
  min-height: 24px;
  padding: 0 6px 0 calc(4px + var(--dshdb-depth, 0) * 12px);
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
  position: relative;
}
.dshdb-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-row:focus-visible {
  outline: 2px solid var(--vscode-focusBorder);
  outline-offset: -2px;
  border-radius: 4px;
}

.dshdb-row[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary);
}
.dshdb-row[data-active="true"] .dshdb-row-meta { color: inherit; opacity: 0.8; }
.dshdb-row-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex: none;
  color: var(--dsw-alias-label-tertiary);
}
.dshdb-row-toggle-action {
  width: 16px;
  height: 16px;
  margin: 0 -1px;
  border-radius: var(--dsw-radius-xs);
  cursor: pointer;
}
.dshdb-row-toggle-action:hover {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}
.dshdb-row-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-row-meta {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dshdb-row-icon { display: inline-flex; align-items: center; flex: none; color: var(--dsw-alias-label-tertiary); }

/* Dragging a data source above or below another one reorders the saved list.
   The drop line is a pseudo-element so the row layout does not shift. */
.dshdb-row[draggable="true"] { cursor: grab; }
.dshdb-row[draggable="true"]:active { cursor: grabbing; }
.dshdb-row-dragging { opacity: 0.45; }
.dshdb-row-drop-before::after,
.dshdb-row-drop-after::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 4px;
  height: 2px;
  border-radius: 1px;
  background: var(--dsw-alias-state-business-primary);
  pointer-events: none;
}
.dshdb-row-drop-before::after { top: -1px; }
.dshdb-row-drop-after::after { bottom: -1px; }

/* Row-end affordances: connect text, copy/refresh icons and the clear (×) buttons.
   The host app only sets font-family on <button>, so every button has to reset the
   UA chrome itself; without this the filter-clear × renders as a bordered square
   instead of the ghost control the rest of the panel uses. */
.dshdb-row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  height: 18px;
  min-width: 18px;
  padding: 0 4px;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-family: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.75;
}
.dshdb-row:hover .dshdb-row-action,
.dshdb-row-action:focus-visible { opacity: 1; }
.dshdb-row-action:hover {
  background: var(--dsw-alias-interactive-bg-active);
  color: var(--dsw-alias-label-primary);
}
.dshdb-row-action:focus-visible {
  outline: 1px solid var(--dsw-alias-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dshdb-connect-action {
  color: var(--dsw-alias-state-business-primary);
  opacity: 1;
  font-weight: 500;
}
.dshdb-picker-anchor { position: relative; display: inline-flex; flex: none; }
.dshdb-picker {
  position: absolute;
  top: calc(100% + 2px);
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  max-height: 280px;
  padding: 4px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md);
  box-shadow: var(--dsw-alias-shadow-md);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  text-align: left;
}
.dshdb-picker-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: var(--dsw-radius-xs);
  cursor: pointer;
  white-space: nowrap;
}
.dshdb-picker-item:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-picker-item input {
  margin: 0;
  flex: none;
  accent-color: var(--dsw-alias-state-business-primary);
}
.dshdb-picker-all {
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-xs) var(--dsw-radius-xs) 0 0;
  padding-bottom: 6px;
  margin-bottom: 2px;
  font-weight: 500;
}
.dshdb-picker-all em {
  margin-left: auto;
  font-style: normal;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary);
}
.dshdb-picker-scroll { overflow: auto; min-height: 0; }
.dshdb-picker-search { flex: none; margin: 2px 2px 4px; height: 24px; }
.dshdb-search-select { position: relative; display: inline-flex; flex: none; }
.dshdb-search-trigger { display: inline-flex; align-items: center; gap: 6px; text-align: left; }
.dshdb-search-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshdb-search-pop {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: max-content;
  min-width: 100%;
  max-width: 360px;
  max-height: 300px;
  padding: 4px;
  background: var(--dsw-alias-bg-layer-1);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md);
  box-shadow: var(--dsw-alias-shadow-md);
  color: var(--dsw-alias-label-primary);
  font-size: 12px;
  text-align: left;
}
.dshdb-search-input { flex: none; height: 24px; }
.dshdb-search-list { display: flex; flex-direction: column; overflow: auto; min-height: 0; }
.dshdb-search-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border: 0;
  border-radius: var(--dsw-radius-xs);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
}
.dshdb-search-option.is-active { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-search-option[aria-selected='true'] { color: var(--dsw-alias-state-business-primary); }
.dshdb-search-option-label { overflow: hidden; text-overflow: ellipsis; }

.dshdb-picker-empty {
  padding: 6px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dshdb-picker-hint {
  margin-top: 2px;
  padding: 4px 6px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dshdb-mark {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent);
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}

.dshdb-row[data-kind="view"] .dshdb-row-icon { color: var(--dsw-alias-state-business-secondary, var(--dsw-alias-label-tertiary)); }
.dshdb-row[data-kind="datasource"] .dshdb-row-label { font-weight: 500; }

.dshdb-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.dshdb-detail-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-weight: 600;
}
.dshdb-detail-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-kv {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 3px 12px;
  padding: 8px;
  font-size: 12px;
}
.dshdb-kv-key { color: var(--dsw-alias-label-tertiary); }
.dshdb-kv-val { color: var(--dsw-alias-label-primary); overflow-wrap: anywhere; }
.dshdb-mono { font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace); font-size: 11.5px; }

.dshdb-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: none;
}
.dshdb-toolbar-spacer { flex: 1; }

/* Floats over the top-right corner of the tree instead of living in a toolbar
   row, so the filter and the detail spinner cost no layout height and never
   shove the tree up or down. */
.dshdb-tree-floats {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  pointer-events: none;
}
.dshdb-tree-floats > * { pointer-events: auto; }
.dshdb-tree-filter-float {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.dshdb-tree-filter-float .dshdb-input { width: 168px; }
.dshdb-loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}
.dshdb-loading-bare {
  padding: 0;
  border: 0;
  background: none;
  box-shadow: none;
}

.dshdb-editor-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: none;
}
.dshdb-editor {
  width: 100%;
  min-height: 132px;
  max-height: 46vh;
  resize: vertical;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 12px;
  line-height: 1.55;
  tab-size: 2;
  outline: none;
}
.dshdb-editor:focus { border-color: var(--dsw-alias-state-business-primary); }
.dshdb-editor::placeholder { color: var(--dsw-alias-label-dimmed); }

.dshdb-plan-text {
  min-height: 0;
  margin: 0;
  padding: 10px 12px;
  overflow: auto;
  overscroll-behavior: contain;
  white-space: pre;
  font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace);
  font-size: 12px;
  line-height: 1.55;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
}

.dshdb-cellvalue {
  margin: 0;
  padding: 10px 12px;
  max-height: 52vh;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace);
  font-size: 12px;
  line-height: 1.55;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
}

.dshdb-grid-wrap {
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  flex: 1;
}
.dshdb-grid {
  border-collapse: separate;
  border-spacing: 0;
  width: max-content;
  min-width: 100%;
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 11.5px;
}
.dshdb-grid th {
  position: sticky;
  top: 0;
  z-index: 1;
  height: 24px;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  padding: 0 8px;
  text-align: left;
  color: var(--dsw-alias-label-secondary);
  font-weight: 500;
  line-height: 23px;
  white-space: nowrap;
}
.dshdb-grid td {
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  height: 22px;
  box-sizing: border-box;
  padding: 0 8px;
  color: var(--dsw-alias-label-primary);
  line-height: 21px;
  white-space: nowrap;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dshdb-grid tbody tr { height: 22px; }
.dshdb-grid tbody tr:hover td { background: var(--dsw-alias-bg-layer-2); }
.dshdb-grid.dshdb-grid-sized { table-layout: fixed; width: max-content; min-width: 100%; }
.dshdb-th-sortable { cursor: pointer; user-select: none; }
.dshdb-th-sortable:hover { color: var(--dsw-alias-label-primary); }
.dshdb-th-draggable { cursor: grab; }
.dshdb-th-draggable:active { cursor: grabbing; }
.dshdb-th-dragging { opacity: 0.45; }
.dshdb-th-drop-target { box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary); }
.dshdb-grid th[data-sorted] { color: var(--dsw-alias-label-primary); }
.dshdb-sort-arrow {
  margin-left: 4px;
  font-size: 9px;
  vertical-align: 1px;
  color: var(--dsw-alias-brand-primary);
}
.dshdb-grid-sized td { overflow: hidden; text-overflow: ellipsis; }
.dshdb-grip {
  position: absolute;
  top: 0;
  right: -3px;
  bottom: 0;
  width: 7px;
  z-index: 3;
  cursor: col-resize;
}
.dshdb-grip::after {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 3px;
  width: 1px;
  background: transparent;
}
.dshdb-grip:hover::after {
  background: var(--dsw-alias-business-primary);
}
.dshdb-vpad td { padding: 0 !important; border: 0 !important; }
.dshdb-empty-row td {
  padding: 18px 12px;
  text-align: center;
  color: var(--dsw-alias-label-dimmed);
  font-size: 12px;
  border-bottom: 0 !important;
}
.dshdb-grid tr:hover td { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-grid .dshdb-cell-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.dshdb-grid .dshdb-num {
  color: var(--dsw-alias-label-dimmed);
  text-align: right;
  user-select: none;
  width: 1%;
}
.dshdb-grid .dshdb-select-cell {
  width: 1%;
  padding: 0 2px;
  text-align: center;
  user-select: none;
}
.dshdb-select-cell input {
  margin: 0;
  cursor: pointer;
  vertical-align: middle;
}
.dshdb-grid tr[data-selected="true"] td {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 10%, transparent);
}
.dshdb-null { color: var(--dsw-alias-label-dimmed); font-style: italic; }
.dshdb-cell-filterable { cursor: pointer; }
.dshdb-filter-row th {
  position: sticky;
  top: 24px;
  z-index: 1;
  height: 26px;
  padding: 2px 4px;
  line-height: normal;
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
}
.dshdb-filter-box {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
  height: 20px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.dshdb-filter-box-active { border-color: var(--dsw-alias-brand-primary); }
.dshdb-filter-input {
  flex: 1;
  min-width: 40px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace);
  font-size: 10.5px;
}
.dshdb-filter-input:focus { outline: none; }
.dshdb-filter-input::placeholder { color: var(--dsw-alias-label-dimmed); }
.dshdb-filter-clear {
  flex: none;
  border: 0;
  background: transparent;
  padding: 0 2px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.dshdb-filter-clear:hover { color: var(--dsw-alias-label-primary); }
.dshdb-filter-count {
  margin-left: 2px;
  padding: 0 3px;
  border-radius: 6px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-on-primary, #fff);
  font-size: 9px;
  line-height: 12px;
}
.dshdb-pager-btn-active {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dshdb-menu-wrap { position: relative; display: inline-flex; }
.dshdb-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  /* Size to the widest item instead of a fixed minimum. */
  width: max-content;
  padding: 4px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-alias-shadow-md, 0 6px 20px rgba(0, 0, 0, 0.14));
}
.dshdb-menu button {
  padding: 5px 8px;
  border: 0;
  background: transparent;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.dshdb-menu button:hover { background: var(--dsw-alias-interactive-bg-hover); }
/* Menu entries follow the disabled state of their toolbar buttons. */
.dshdb-menu button:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.dshdb-menu button:disabled:hover { background: transparent; }
.dshdb-menu button:disabled .dshdb-menu-icon { color: inherit; }
.dshdb-menu-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 6px;
  vertical-align: -2px;
  color: var(--dsw-alias-label-secondary);
}
/* Grouped menus: the group row opens a flyout so the main column stays short. */
.dshdb-menu-groups { width: max-content; }
.dshdb-submenu-anchor { position: relative; display: block; }
.dshdb-submenu-trigger { display: flex; align-items: center; gap: 8px; }
.dshdb-submenu-trigger::after {
  content: '▸';
  margin-left: auto;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
}
/* Flyouts open to the right by default; the component flips them left when the edge is in the way. */
.dshdb-menu .dshdb-submenu {
  display: none;
  top: -4px;
  left: calc(100% + 2px);
  right: auto;
}
.dshdb-menu .dshdb-submenu[data-open='true'] { display: flex; }
.dshdb-menu .dshdb-submenu[data-flip='true'] {
  left: auto;
  right: calc(100% + 2px);
}
.dshdb-hmenu {
  position: fixed;
  z-index: 40;
  display: flex;
  flex-direction: column;
  min-width: 190px;
  padding: 4px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-alias-shadow-md, 0 6px 20px rgba(0, 0, 0, 0.14));
}
.dshdb-hmenu button {
  padding: 5px 8px;
  border: 0;
  background: transparent;
  border-radius: var(--dsw-radius-sm);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.dshdb-hmenu button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-hmenu button:disabled { color: var(--dsw-alias-label-tertiary); cursor: default; }
.dshdb-grid-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 4px 2px 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}

.dshdb-statusbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  height: 24px;
  padding: 0 10px;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
  overflow: hidden;
}
.dshdb-statusbar > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-statusbar-spacer { flex: 1; }

/* Live counter for the host's background description walk. */
.dshdb-statusbar-prefetch {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: none;
  white-space: nowrap;
}

.dshdb-banner {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--dsw-radius-sm);
  border: 0.5px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.dshdb-banner[data-tone="error"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, var(--dsw-alias-border-l2));
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-state-error-primary);
}
.dshdb-banner[data-tone="warn"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 40%, var(--dsw-alias-border-l2));
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 8%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-state-warn-primary);
}
.dshdb-banner[data-tone="success"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 40%, var(--dsw-alias-border-l2));
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 8%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-state-success-primary);
}
.dshdb-banner[data-tone="info"] {
  border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 36%, var(--dsw-alias-border-l2));
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 7%, var(--dsw-alias-bg-layer-1));
  color: var(--dsw-alias-label-secondary);
}
.dshdb-banner-icon { flex: none; padding-top: 1px; }
.dshdb-banner-text { flex: 1; min-width: 0; white-space: pre-wrap; }
.dshdb-banner-actions { display: inline-flex; align-items: center; gap: 6px; flex: none; }

.dshdb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 28px 18px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
  flex: 1;
  min-height: 120px;
}
.dshdb-empty-icon { color: var(--dsw-alias-label-dimmed); margin-bottom: 2px; }
.dshdb-empty-title { color: var(--dsw-alias-label-primary); font-size: 12.5px; font-weight: 500; }
.dshdb-empty-text { font-size: 11.5px; line-height: 1.5; max-width: 280px; }
.dshdb-empty-actions { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; justify-content: center; }

.dshdb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.dshdb-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-btn:active { background: var(--dsw-alias-interactive-bg-active); }
.dshdb-btn[data-variant="primary"] {
  border-color: transparent;
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-button-primary-label, var(--dsw-alias-bg-base));
}
.dshdb-btn[data-variant="primary"]:hover { background: var(--dsw-alias-button-primary-hover); }
.dshdb-btn[data-variant="ghost"] { border-color: transparent; background: transparent; color: var(--dsw-alias-label-secondary); }
.dshdb-btn[data-variant="ghost"]:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshdb-btn[data-variant="danger"] { color: var(--dsw-alias-state-error-primary); }
.dshdb-btn[data-density="icon"] { width: 26px; padding: 0; }
.dshdb-btn[data-size="sm"] { height: 22px; padding: 0 7px; font-size: 11.5px; }
.dshdb-btn[data-density="icon"][data-size="sm"] { width: 22px; padding: 0; }
.dshdb-btn:disabled { opacity: 0.45; cursor: default; background: var(--dsw-alias-bg-layer-1); }
.dshdb-btn:focus-visible { outline: 2px solid var(--dsw-alias-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 1px; }

.dshdb-input,
.dshdb-select,
.dshdb-textarea {
  width: 100%;
  box-sizing: border-box;
  height: 26px;
  padding: 0 8px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 12px;
  outline: none;
}
.dshdb-input:focus,
.dshdb-select:focus,
.dshdb-textarea:focus { border-color: var(--dsw-alias-state-business-primary); }
.dshdb-input::placeholder,
.dshdb-textarea::placeholder { color: var(--dsw-alias-label-dimmed); }
.dshdb-select { appearance: none; padding-right: 22px; cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, var(--dsw-alias-label-tertiary) 50%),
    linear-gradient(135deg, var(--dsw-alias-label-tertiary) 50%, transparent 50%);
  background-position: calc(100% - 11px) 11px, calc(100% - 7px) 11px;
  background-size: 4px 4px, 4px 4px;
  background-repeat: no-repeat;
}
.dshdb-textarea { height: auto; min-height: 64px; padding: 6px 8px; resize: vertical; line-height: 1.5; }
.dshdb-select-inline { width: auto; min-width: 74px; }

.dshdb-field { display: flex; flex-direction: column; gap: 4px; }
.dshdb-field-label {
  display: flex;
  align-items: baseline;
  gap: 4px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
}
.dshdb-field-label em { color: var(--dsw-alias-state-error-primary); font-style: normal; }
.dshdb-field-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.45; }
.dshdb-field-error { color: var(--dsw-alias-state-error-primary); font-size: 11px; }

.dshdb-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}
.dshdb-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
}
.dshdb-form-grid > .dshdb-span-2 { grid-column: 1 / -1; }

.dshdb-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
.dshdb-switch {
  position: relative;
  width: 28px;
  height: 16px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--dsw-alias-border-l3);
  cursor: pointer;
  transition: background 140ms ease;
}
.dshdb-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  box-shadow: var(--dsw-elevation-soft, 0 1px 2px rgba(0, 0, 0, 0.2));
  transition: transform 140ms ease;
}
.dshdb-switch[aria-checked="true"] { background: var(--dsw-alias-state-business-primary); }
.dshdb-switch[aria-checked="true"]::after { transform: translateX(12px); }

.dshdb-tag {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--dsw-radius-xs);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary);
  font-size: 10.5px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.dshdb-tag[data-tone="business"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent); color: var(--dsw-alias-state-business-primary); }
.dshdb-tag[data-tone="success"] { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); color: var(--dsw-alias-state-success-primary); }
.dshdb-tag[data-tone="warn"] { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 16%, transparent); color: var(--dsw-alias-state-warn-primary); }
.dshdb-tag[data-tone="error"] { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); color: var(--dsw-alias-state-error-primary); }
.dshdb-tag[data-tone="key"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent); color: var(--dsw-alias-state-business-primary); font-weight: 500; }

.dshdb-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; background: var(--dsw-alias-state-idle-primary); }
.dshdb-dot[data-tone="success"] { background: var(--dsw-alias-state-success-primary); }
.dshdb-dot[data-tone="error"] { background: var(--dsw-alias-state-error-primary); }
.dshdb-dot[data-tone="warn"] { background: var(--dsw-alias-state-warn-primary); }
.dshdb-dot[data-tone="business"] { background: var(--dsw-alias-state-business-primary); }

.dshdb-spinner {
  width: 12px;
  height: 12px;
  flex: none;
  border: 1.5px solid color-mix(in srgb, var(--dsw-alias-label-tertiary) 30%, transparent);
  border-top-color: var(--dsw-alias-state-business-primary);
  border-radius: 50%;
  animation: dshdb-spin 720ms linear infinite;
}
@keyframes dshdb-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .dshdb-spinner { animation-duration: 2400ms; }
  .dshdb-btn, .dshdb-toolbtn, .dshdb-tab, .dshdb-switch, .dshdb-switch::after { transition: none; }
}

.dshdb-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--dsw-alias-bg-mask-1, color-mix(in srgb, var(--dsw-alias-label-primary) 26%, transparent));
}
.dshdb-modal {
  display: flex;
  flex-direction: column;
  width: min(560px, 100%);
  max-height: min(84vh, 720px);
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-base);
  box-shadow: var(--dsw-elevation-prominent, var(--dsw-elevation-panel));
  overflow: hidden;
}
.dshdb-modal-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 10px;
  flex: none;
}
.dshdb-modal-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; }
.dshdb-modal-body { padding: 0 14px 12px; overflow: auto; min-height: 0; flex: 1; }
.dshdb-modal-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  flex: none;
  border-top: 0.5px solid var(--dsw-alias-border-l1);
}
.dshdb-modal-foot-spacer { flex: 1; }
.dshdb-modal-message { color: var(--dsw-alias-label-secondary); white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.55; }
.dshdb-modal-message .dshdb-mono { display: block; margin-top: 6px; padding: 8px; border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); white-space: pre-wrap; max-height: 180px; overflow: auto; }

.dshdb-redis-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}
.dshdb-redis-bar .dshdb-input { width: auto; flex: 1; min-width: 80px; }
.dshdb-redis-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  min-height: 0;
  flex: 1;
}
.dshdb-keys {
  max-height: 220px;
  overflow: auto;
}
.dshdb-key-row {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  height: 24px;
  padding: 0 6px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, monospace);
  font-size: 11.5px;
  text-align: left;
  cursor: pointer;
}
.dshdb-key-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-key-row[data-active="true"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent); }
.dshdb-key-row .dshdb-row-label { font-family: inherit; }
.dshdb-json {
  margin: 0;
  padding: 8px;
  max-height: 280px;
  overflow: auto;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, monospace);
  font-size: 11.5px;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dshdb-command-row { display: flex; align-items: center; gap: 6px; flex: none; }
.dshdb-command-row .dshdb-input { flex: 1; font-family: var(--ds-font-family-code, ui-monospace, monospace); }
.dshdb-muted { color: var(--dsw-alias-label-tertiary); }
.dshdb-link {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  font: inherit;
  font-size: inherit;
  color: var(--dsw-alias-brand-primary);
}
.dshdb-link:hover { text-decoration: underline; }
.dshdb-danger { color: var(--dsw-alias-state-error-primary); }
.dshdb-inline { display: inline-flex; align-items: center; gap: 4px; }
.dshdb-grow { flex: 1; min-width: 0; }
.dshdb-nowrap { white-space: nowrap; }
.dshdb-scroll-thin { scrollbar-width: thin; }
.dshdb-list { display: flex; flex-direction: column; gap: 6px; }
.dshdb-driver-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.dshdb-driver-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
/* Reorderable console toolbar actions in Settings. */
.dshdb-action-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.dshdb-action-icon {
  display: inline-flex;
  align-items: center;
  flex: none;
  color: var(--dsw-alias-label-secondary);
}
.dshdb-action-row .dshdb-driver-main { flex: 1; min-width: 0; }
.dshdb-driver-name { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.dshdb-driver-sub { color: var(--dsw-alias-label-tertiary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshdb-file-row { display: flex; align-items: center; gap: 8px; padding: 3px 0; font-size: 11.5px; }
.dshdb-file-row .dshdb-mono { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshdb-progress {
  height: 3px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  overflow: hidden;
  flex: none;
}
.dshdb-progress-inner { height: 100%; background: var(--dsw-alias-state-business-primary); animation: dshdb-indeterminate 1.2s ease-in-out infinite; width: 40%; }
@keyframes dshdb-indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }

/* One table's rows in their own Sidebar tab (IDEA-style data page). */
.dshdb-qtab { display: flex; flex-direction: column; gap: 6px; height: 100%; min-height: 0; padding: 8px 10px 10px; box-sizing: border-box; }
.dshdb-qbar { display: flex; align-items: center; gap: 6px; flex: none; min-height: 22px; }
.dshdb-qtable {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-qbar-spacer { flex: 1; }
/* Console toolbar actions; whatever does not fit moves into the trailing "…" menu.
   No overflow clipping here: the "…" and export popovers are absolutely
   positioned children that drop below the bar. */
.dshdb-qbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  position: relative;
}
.dshdb-qbar-slot { display: inline-flex; flex: none; }
.dshdb-qbar-slot-hidden {
  position: absolute;
  left: -99999px;
  top: 0;
  visibility: hidden;
  pointer-events: none;
}
/* Executed-statement history, dropped in below the editor while open. */
.dshdb-history {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: none;
  max-height: 168px;
  padding: 6px 6px 4px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.dshdb-history-head { display: flex; align-items: center; justify-content: space-between; padding: 0 2px 2px; }
.dshdb-history-title { color: var(--dsw-alias-label-tertiary); font-size: 10px; letter-spacing: 0.4px; }
.dshdb-history-list { display: flex; flex-direction: column; overflow: auto; min-height: 0; }
.dshdb-history-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 4px 6px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace);
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.dshdb-history-search { padding: 0 0 4px; }
.dshdb-history-group { display: flex; flex-direction: column; gap: 2px; }
.dshdb-history-line { display: flex; align-items: center; gap: 2px; }
.dshdb-history-line .dshdb-history-row { flex: 1; min-width: 0; }
.dshdb-history-star {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  cursor: pointer;
}
.dshdb-history-copy { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border: 0; border-radius: var(--ds-radius-sm, 4px); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.dshdb-history-copy:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dshdb-history-star:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); }
.dshdb-history-star[data-pinned="true"] { color: var(--dsw-alias-state-business-primary); }
.dshdb-history-empty { padding: 6px 4px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dshdb-filter-empty { display: block; padding: 10px 12px; color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.dshdb-history-row:hover { background: var(--dsw-alias-bg-layer-2); }
.dshdb-history-sql { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshdb-history-time { flex: none; color: var(--dsw-alias-label-tertiary); font-family: inherit; font-size: 10px; }
.dshdb-history-meta { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 10px; font-variant-numeric: tabular-nums; }
.dshdb-qmeta { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.dshdb-qfilter {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 3px 4px 3px 0;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
}
.dshdb-qfilter-label {
  flex: none;
  padding-left: 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 10px;
  letter-spacing: 0.4px;
  white-space: nowrap;
}
.dshdb-qfilter-input { flex: 1; min-width: 90px; height: 22px; border: 0; background: transparent; font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace); font-size: 11.5px; }
.dshdb-qfilter-input:focus { border: 0; outline: none; }
.dshdb-qfilter-order { flex: 0 1 190px; border-left: 0.5px solid var(--dsw-alias-border-l1); padding-left: 8px; }
.dshdb-pager {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 2px 0 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 11px;
}
.dshdb-pager-spacer { flex: 1; }
.dshdb-pager-sql { min-width: 0; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--ds-font-family-code, ui-monospace, Menlo, Consolas, monospace); font-size: 10.5px; }
.dshdb-pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 4px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 1;
  cursor: pointer;
}
.dshdb-pager-btn:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshdb-pager-btn:disabled { opacity: 0.35; cursor: default; }
.dshdb-pager-range { padding: 0 2px; color: var(--dsw-alias-label-secondary); font-variant-numeric: tabular-nums; }
.dshdb-pager-total { color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshdb-pager-jump { display: inline-flex; align-items: center; }
.dshdb-pager-filter { display: inline-flex; align-items: center; min-width: 110px; max-width: 220px; border: 0.5px solid var(--dsw-alias-border-l1); border-radius: var(--ds-radius-sm, 4px); padding: 0 4px; }
.dshdb-pager-filter .dshdb-qfilter-input { height: 20px; }
.dshdb-pager-input { width: 58px; padding: 0 6px; text-align: center; font-variant-numeric: tabular-nums; }
.dshdb-pager-size { width: auto; height: 20px; padding: 0 18px 0 4px; font-size: 10.5px; }
.dshdb-tabtitle { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Console tab: an SQL editor on pager chrome, or a Redis key grid plus command box. */
.dshdb-console-input {
  flex: none;
  height: 96px;
  padding: 8px 10px;
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 11.5px;
  line-height: 1.5;
  resize: vertical;
  box-sizing: border-box;
}
.dshdb-console-select { max-width: 220px; }
.dshdb-complete-anchor { position: relative; display: block; flex: none; width: 100%; }
.dshdb-complete {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  min-width: 220px;
  max-height: 200px;
  overflow: auto;
  padding: 4px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-alias-shadow-md, 0 6px 20px rgba(0, 0, 0, 0.14));
}
.dshdb-complete-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 8px;
  border: 0;
  border-radius: var(--dsw-radius-sm);
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-family: inherit;
  font-size: 11.5px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}
.dshdb-complete-active { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-complete-kind { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.dshdb-complete-meta { display: inline-flex; align-items: center; gap: 6px; flex: none; }
.dshdb-complete-detail { color: var(--dsw-alias-label-tertiary); font-size: 10.5px; }
.dshdb-complete-empty { padding: 6px 8px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dshdb-console-value {
  flex: none;
  max-height: 150px;
  margin: 0;
  padding: 8px 10px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 11px;
  line-height: 1.5;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.dshdb-grid tbody tr[data-active="true"] {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 14%, transparent);
  box-shadow: inset 2px 0 0 var(--dsw-alias-state-business-primary);
}
.dshdb-ddl {
  margin: 0;
  max-height: 380px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code, ui-monospace, "SF Mono", Menlo, Consolas, monospace);
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre;
  tab-size: 2;
}
.dshdb-redis-value {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 120px;
  overflow: hidden;
  border-top: 1px solid var(--dshdb-border);
  padding-top: 4px;
}

.dshdb-redis-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 12px;
  min-width: 0;
}

.dshdb-redis-key {
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dshdb-muted);
  font-family: var(--dshdb-mono);
}

.dshdb-redis-keys {
  flex: 0 1 auto;
  max-height: 38%;
}

.dshdb-redis-table {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
}

/* 树下方的键值面板：固定占下部空间并内部滚动，避免把表格撑出窗口或被状态栏遮住。 */
.dshdb-redis-detail {
  flex: 0 0 40%;
  min-height: 168px;
  max-height: 46%;
}
.dshdb-redis-detail .dshdb-panel-body { overflow: auto; }
.dshdb-redis-detail .dshdb-redis-value { min-width: 0; }

`;
var STYLE_ID = "dsh-ide-database/styles";
function injectStyles() {
  if (typeof document === "undefined") return () => {
  };
  let element = document.getElementById(STYLE_ID);
  if (!element) {
    element = document.createElement("style");
    element.id = STYLE_ID;
    element.dataset.plugin = "dsh-ide-database";
    document.head.appendChild(element);
  }
  element.textContent = CSS;
  return () => {
    element?.remove();
  };
}

// src/client/index.tsx
var import_jsx_runtime24 = require("react/jsx-runtime");
var PLUGIN_ID = "dsh-ide-database";
var TAB_ID = "dsh-ide-database/database";
var TAB_KIND = "database";
var TAB_TITLE = "数据库";
var TABLE_TAB_ID = "dsh-ide-database/table";
var TABLE_TAB_KIND = "database-table";
var TABLE_TAB_TITLE = "数据表";
var CONSOLE_TAB_ID = "dsh-ide-database/console";
var CONSOLE_TAB_KIND = "database-console";
var CONSOLE_TAB_TITLE = "查询控制台";
function GuideIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(DatabaseIcon, { size: props.size ?? 18 });
}
function DatabaseTabBody(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(App, { ...props });
}
function DatabaseTabChip() {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsxs)(import_jsx_runtime24.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(DatabaseIcon, { size: 13 }),
    /* @__PURE__ */ (0, import_jsx_runtime24.jsx)("span", { children: TAB_TITLE })
  ] });
}
function TableTabBody(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(TableTab, { ...props });
}
function TableTabChip(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(TableTabTitle, { ...props });
}
function ConsoleTabBody(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(ConsoleTab, { ...props });
}
function ConsoleTabChip() {
  return /* @__PURE__ */ (0, import_jsx_runtime24.jsx)(ConsoleTabTitle, {});
}
var name = PLUGIN_ID;
var inject = ["slots"];
function apply(ctx) {
  ctx.effect(() => {
    return injectStyles();
  }, "dsh-ide-database: styles");
  ctx.inject(["sidebarRightTabs", "sidebarRight"], (host) => {
    host.effect(() => {
      host.sidebarRightTabs.register({
        id: TAB_ID,
        kind: TAB_KIND,
        title: () => TAB_TITLE,
        keepMounted: true,
        guide: [
          {
            id: TAB_KIND,
            order: 38,
            title: () => TAB_TITLE,
            description: () => "浏览和查询 MySQL、Oracle、达梦、OceanBase 与 Redis 数据源",
            icon: GuideIcon
          }
        ]
      });
      host.sidebarRightTabs.register({
        id: TABLE_TAB_ID,
        kind: TABLE_TAB_KIND,
        title: () => TABLE_TAB_TITLE,
        multiple: true
      });
      host.sidebarRightTabs.register({
        id: CONSOLE_TAB_ID,
        kind: CONSOLE_TAB_KIND,
        title: () => CONSOLE_TAB_TITLE,
        multiple: true
      });
      host.slots.inject("sidebar.right.pane.tab", () => {
        host.slots.register({ name: "sidebar.right.pane.tab", key: TAB_ID }, DatabaseTabBody);
        host.slots.register({ name: "sidebar.right.pane.tab", key: TABLE_TAB_ID }, TableTabBody);
        host.slots.register({ name: "sidebar.right.pane.tab", key: CONSOLE_TAB_ID }, ConsoleTabBody);
      });
      host.slots.inject("sidebar.right.pane.tab.title", () => {
        host.slots.register({ name: "sidebar.right.pane.tab.title", key: TAB_ID }, DatabaseTabChip);
        host.slots.register({ name: "sidebar.right.pane.tab.title", key: TABLE_TAB_ID }, TableTabChip);
        host.slots.register({ name: "sidebar.right.pane.tab.title", key: CONSOLE_TAB_ID }, ConsoleTabChip);
      });
      setTableTabOpener((params) => {
        host.sidebarRight.openTab(TABLE_TAB_KIND, { params });
      });
      setConsoleTabOpener((params) => {
        host.sidebarRight.openTab(CONSOLE_TAB_KIND, { params });
      });
      return () => {
        setTableTabOpener(void 0);
        setConsoleTabOpener(void 0);
      };
    }, "dsh-ide-database: native right sidebar tab");
  });
}

    return module.exports;
  },
});


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
var import_react6 = require("react");

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
  "oceanbase-mysql",
  "oceanbase-oracle",
  "oracle",
  "dameng",
  "redis"
];
var SQL_DIALECT_LABEL = {
  mysql: "MySQL",
  oracle: "Oracle",
  dameng: "达梦 DM",
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
  testConnection: (draft) => post("/connections/test", { draft }),
  connect: (id) => post("/connections/connect", { id }),
  disconnect: (id) => post("/connections/disconnect", { id }),
  structure: () => post("/structure"),
  schemas: (id, filter = "") => post("/schema/list", { id, filter }),
  objects: (id, schema) => post("/schema/objects", { id, schema }),
  describe: (id, schema, table, kind) => post("/schema/describe", { id, schema, table, kind }),
  ddl: (id, schema, table, kind) => post("/schema/ddl", { id, schema, table, kind }),
  explain: (id, sql, schema) => post("/explain", { id, sql, schema }),
  query: (options) => post("/query", options),
  cancel: (stmtKey) => post("/query/cancel", { stmtKey }),
  redisScan: (options) => post("/redis/scan", options),
  redisKey: (id, key) => post("/redis/key", { id, key }),
  redisCommand: (id, command, allowWrite) => post("/redis/command", { id, command, allowWrite }),
  downloadDriver: (driverId) => post("/drivers/download", { driverId }),
  saveCustomDriver: (driver) => post("/drivers/custom/save", { driver }),
  deleteCustomDriver: (id) => post("/drivers/custom/delete", { id }),
  updateSettings: (settings) => post("/settings/update", { settings })
};

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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "12", cy: "12", r: "3.2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" })
  ] });
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

// src/client/modals/ConnectionModal.tsx
var import_react2 = require("react");

// src/client/format.ts
function dialectLabel(dialect) {
  return dialect ? DIALECT_LABEL[dialect] : "未选择";
}
function formatMs(ms) {
  if (ms === void 0 || Number.isNaN(ms)) return "—";
  if (ms < 1e3) return `${Math.max(1, Math.round(ms))} ms`;
  return `${(ms / 1e3).toFixed(2)} s`;
}
function formatBytes(bytes) {
  if (bytes === void 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatCell(value) {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}
var WRITE_STATEMENT = /^\s*(insert|update|delete|merge|replace|create|alter|drop|truncate|grant|revoke|call|exec|execute|rename|comment|lock|unlock|analyze|optimize|vacuum|set\s+global)\b/i;
function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n\r]*/g, " ").replace(/^\s*#.*$/gm, " ");
}
function looksLikeWrite(sql) {
  const cleaned = stripComments(sql);
  return cleaned.split(";").map((part) => part.trim()).filter(Boolean).some((statement) => WRITE_STATEMENT.test(statement));
}
var REDIS_READ = /* @__PURE__ */ new Set([
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
  "srandmember",
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
  "xinfo",
  "object",
  "memory",
  "getrange",
  "bitcount",
  "geopos",
  "geodist",
  "georadius_ro"
]);
function redisCommandName(command) {
  const match = /^\s*([a-zA-Z]+)/.exec(command);
  return match?.[1]?.toLowerCase() ?? "";
}
function looksLikeRedisWrite(command) {
  const name2 = redisCommandName(command);
  return name2 !== "" && !REDIS_READ.has(name2);
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

// src/client/ui.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime2 = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
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
        loading ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Spinner, {}) : icon,
        iconOnly ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children })
      ]
    }
  );
}
function IconButton({ label, icon, ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { ...rest, icon, "aria-label": label, title: rest.title ?? label });
}
function TextInput({ className = "", ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { ...rest, className: `dshdb-input ${className}`.trim() });
}
function TextArea({ className = "", ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("textarea", { ...rest, className: `dshdb-textarea ${className}`.trim() });
}
function Select({ options, onValueChange, inline = false, className = "", ...rest }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "select",
    {
      ...rest,
      className: `dshdb-select ${inline ? "dshdb-select-inline" : ""} ${className}`.trim(),
      onChange: (event) => onValueChange?.(event.target.value),
      children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: option.value, children: option.label }, option.value))
    }
  );
}
function Field({ label, required, hint, error, children, span }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: `dshdb-field ${span ? "dshdb-span-2" : ""}`.trim(), children: [
    label ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "dshdb-field-label", children: [
      label,
      required ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("em", { children: "*" }) : null
    ] }) : null,
    children,
    error ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-field-error", children: error }) : hint ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-field-hint", children: hint }) : null
  ] });
}
function Switch({ checked, onChange, label, disabled }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "dshdb-inline", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
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
    label ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-muted", children: label }) : null
  ] });
}
function Panel({
  title,
  actions,
  children,
  className = "",
  bodyClassName = "",
  scroll = false
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: `dshdb-panel ${className}`.trim(), children: [
    title ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "dshdb-panel-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-panel-head-title", children: title }),
      actions
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        className: `dshdb-panel-body ${bodyClassName}`.trim(),
        style: scroll ? { overflow: "auto" } : void 0,
        children
      }
    )
  ] });
}
function Tag({ tone, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-tag", "data-tone": tone, children });
}
function StateDot({ tone }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-dot", "data-tone": tone ?? "idle" });
}
function Spinner({ size }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-spinner", style: size ? { width: size, height: size } : void 0, "aria-hidden": "true" });
}
function Banner({
  tone = "info",
  children,
  onClose
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dshdb-banner", "data-tone": tone, role: tone === "error" ? "alert" : "status", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-banner-icon", children: tone === "error" || tone === "warn" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(WarningIcon, { size: 13 }) : tone === "success" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CheckIcon, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(InfoIcon, { size: 13 }) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-banner-text", children }),
    onClose ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(IconButton, { label: "关闭", size: "sm", variant: "ghost", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CloseIcon, { size: 12 }), onClick: onClose }) : null
  ] });
}
function EmptyState({
  icon,
  title,
  description,
  actions
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dshdb-empty", children: [
    icon ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-empty-icon", children: icon }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-empty-title", children: title }),
    description ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-empty-text", children: description }) : null,
    actions ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-empty-actions", children: actions }) : null
  ] });
}
function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width
}) {
  const boxRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    const first = boxRef.current?.querySelector(
      'input, textarea, select, button:not([aria-label="关闭"])'
    );
    if (first) first.focus();
    else boxRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);
  if (!open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      className: "dshdb-modal-overlay",
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) onClose();
      },
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
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
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "dshdb-modal-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-modal-title", children: title }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                IconButton,
                {
                  label: "关闭",
                  size: "sm",
                  variant: "ghost",
                  icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CloseIcon, { size: 13 }),
                  onClick: onClose
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-modal-body", children }),
            footer ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("footer", { className: "dshdb-modal-foot", children: footer }) : null
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
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    Modal,
    {
      open: request !== null,
      title: request?.title ?? "",
      onClose: onCancel,
      footer: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-modal-foot-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Button, { onClick: onCancel, disabled: busy, children: "取消" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          Button,
          {
            variant: request?.danger ? "danger" : "primary",
            onClick: onConfirm,
            loading: busy,
            children: request?.confirmLabel ?? "确定"
          }
        )
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dshdb-modal-message", children: [
        request?.message,
        request?.detail ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dshdb-mono", children: request.detail }) : null
      ] })
    }
  );
}
function Toast({ toast, onDismiss }) {
  if (toast === null) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    import_dsh_client_ui_primitives.Toast,
    {
      text: toast.text,
      tone: toast.tone === "success" ? "success" : void 0,
      icon: toast.tone === "error" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives.IconWarningOutlineRegular, {}) : void 0,
      onDone: onDismiss
    },
    toast.seq
  );
}

// src/client/modals/ConnectionModal.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var PRESET_LABEL = {
  mysql: "MySQL",
  "oceanbase-mysql": "OceanBase（MySQL 模式）",
  "oceanbase-oracle": "OceanBase（Oracle 模式）",
  oracle: "Oracle",
  dameng: "达梦 DM",
  redis: "Redis"
};
function toParamsText(params) {
  return Object.entries(params).map(([key, value]) => `${key}=${value}`).join("\n");
}
function parseParamsText(text) {
  const params = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    params[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return params;
}
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
function ConnectionModal(props) {
  const [choice, setChoice] = (0, import_react2.useState)("mysql");
  const [name2, setName] = (0, import_react2.useState)("");
  const [host, setHost] = (0, import_react2.useState)("127.0.0.1");
  const [port, setPort] = (0, import_react2.useState)("3306");
  const [user, setUser] = (0, import_react2.useState)("");
  const [password, setPassword] = (0, import_react2.useState)("");
  const [clearPassword, setClearPassword] = (0, import_react2.useState)(false);
  const [database, setDatabase] = (0, import_react2.useState)("");
  const [redisDb, setRedisDb] = (0, import_react2.useState)("0");
  const [paramsText, setParamsText] = (0, import_react2.useState)("");
  const [readOnly, setReadOnly] = (0, import_react2.useState)(false);
  const [saving, setSaving] = (0, import_react2.useState)(false);
  const [testing, setTesting] = (0, import_react2.useState)(false);
  const [testResult, setTestResult] = (0, import_react2.useState)(null);
  const [error, setError] = (0, import_react2.useState)("");
  const customDrivers = (0, import_react2.useMemo)(() => props.drivers.filter((driver) => driver.preset === null), [props.drivers]);
  const editing = props.editing;
  (0, import_react2.useEffect)(() => {
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
    host: host.trim(),
    port: Number.parseInt(port, 10) || 0,
    user: user.trim(),
    ...password !== "" ? { password } : {},
    ...clearPassword ? { clearPassword: true } : {},
    database: isRedis ? "" : database.trim(),
    redisDb: Number.parseInt(redisDb, 10) || 0,
    params: isRedis ? {} : parseParamsText(paramsText),
    readOnly
  });
  const validate = (draft) => {
    if (draft.name === "") return "请填写连接名称";
    if (draft.host === "") return "请填写主机地址";
    if (!Number.isInteger(draft.port) || draft.port < 1 || draft.port > 65535) return "端口需在 1-65535 之间";
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
      setError(errorText(cause));
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
      setError(errorText(cause));
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    Modal,
    {
      open: props.open,
      title: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dshdb-inline", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(DatabaseIcon, { size: 14 }),
        editing ? `编辑连接 · ${editing.name}` : "新建数据源连接"
      ] }),
      onClose: props.onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
        editing ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button, { variant: "danger", size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TrashIcon, { size: 12 }), onClick: () => props.onDelete(editing), children: "删除" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshdb-modal-foot-spacer" }),
        !isRedis ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button, { onClick: () => void test(), loading: testing, children: "测试连接" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Button, { variant: "primary", onClick: () => void save(), loading: saving, children: "保存" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dshdb-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dshdb-form-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "名称", required: true, span: true, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            TextInput,
            {
              value: name2,
              autoFocus: true,
              placeholder: "例如 本地 MySQL",
              onChange: (event) => setName(event.target.value)
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "驱动", required: true, span: true, hint: dialect ? `方言：${dialectLabel(dialect)}` : void 0, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Select, { options: driverOptions, value: choice, onValueChange: changeChoice }) }),
          isCustom && !customDriver ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshdb-span-2", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Banner, { tone: "warn", children: "还没有自定义驱动，请先在「设置」标签页新增。" }) }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "主机", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TextInput, { value: host, onChange: (event) => setHost(event.target.value), placeholder: "127.0.0.1" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "端口", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            TextInput,
            {
              value: port,
              inputMode: "numeric",
              onChange: (event) => setPort(event.target.value.replace(/[^0-9]/g, ""))
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "用户名", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TextInput, { value: user, onChange: (event) => setUser(event.target.value), placeholder: isRedis ? "default" : "用户名" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "密码", hint: editing?.hasPassword ? "已保存密码，留空则保持不变" : void 0, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            TextInput,
            {
              type: "password",
              value: password,
              onChange: (event) => setPassword(event.target.value),
              placeholder: editing?.hasPassword ? "••••••••" : "密码"
            }
          ) }),
          editing?.hasPassword ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshdb-span-2", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Switch, { checked: clearPassword, onChange: setClearPassword, label: "清除已保存的密码" }) }) : null,
          isRedis ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "逻辑库序号", hint: "Redis 数据库编号，默认 0", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            TextInput,
            {
              value: redisDb,
              inputMode: "numeric",
              onChange: (event) => setRedisDb(event.target.value.replace(/[^0-9]/g, ""))
            }
          ) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "数据库 / 服务名", hint: preset?.databaseHint ?? "可留空，连接后再选择 schema", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(TextInput, { value: database, onChange: (event) => setDatabase(event.target.value), placeholder: "可留空" }) }),
          !isRedis ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Field, { label: "额外 JDBC 参数", span: true, hint: "每行一个 key=value，例如 useSSL=false", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            TextArea,
            {
              value: paramsText,
              onChange: (event) => setParamsText(event.target.value),
              placeholder: "useSSL=false\nconnectTimeout=10000"
            }
          ) }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dshdb-span-2 dshdb-list", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Switch, { checked: readOnly, onChange: setReadOnly, label: "只读连接（面板与 Agent 均拒绝写操作）" }) })
        ] }),
        testResult ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Banner, { tone: testResult.ok ? "success" : "error", children: testResult.ok ? `连接成功 · ${testResult.server?.product ?? ""} ${testResult.server?.version ?? ""} · ${formatMs(testResult.latencyMs)}` : `连接失败：${testResult.message ?? "未知错误"}` }) : null,
        error ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Banner, { tone: "error", children: error }) : null,
        testing ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dshdb-muted dshdb-inline", style: { fontSize: 11 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Spinner, {}),
          " 正在测试连接…"
        ] }) : null,
        isCustom ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Tag, { tone: "business", children: "自定义驱动" }) : null,
        !isRedis && dialect ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: [
          "驱动类：",
          customDriver?.driverClass ?? preset?.driverClass ?? "—"
        ] }) : null,
        !editing ? null : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: [
          "连接 ID：",
          editing.id
        ] })
      ] })
    }
  );
}

// src/client/modals/DriverModal.tsx
var import_react3 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var DIALECT_OPTIONS = Object.keys(SQL_DIALECT_LABEL).map((dialect) => ({
  value: dialect,
  label: SQL_DIALECT_LABEL[dialect]
}));
function parseJars(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "" && !line.startsWith("#")).map((line) => {
    const parts = line.split(":").map((part) => part.trim());
    if (parts.length < 3) return null;
    const version = parts[parts.length - 1] ?? "";
    const artifact = parts[parts.length - 2] ?? "";
    const group = parts.slice(0, -2).join(":");
    if (group === "" || artifact === "" || version === "") return null;
    return { group, artifact, version };
  }).filter((jar) => jar !== null);
}
function errorText2(error) {
  return error instanceof Error ? error.message : String(error);
}
function DriverModal(props) {
  const [name2, setName] = (0, import_react3.useState)("");
  const [dialect, setDialect] = (0, import_react3.useState)("generic");
  const [driverClass, setDriverClass] = (0, import_react3.useState)("");
  const [urlTemplate, setUrlTemplate] = (0, import_react3.useState)("jdbc:custom://{{host}}:{{port}}/{{database}}");
  const [jarsText, setJarsText] = (0, import_react3.useState)("");
  const [saving, setSaving] = (0, import_react3.useState)(false);
  const [error, setError] = (0, import_react3.useState)("");
  (0, import_react3.useEffect)(() => {
    setError("");
    setSaving(false);
    if (!props.open) return;
    const editing = props.editing;
    if (editing) {
      setName(editing.name);
      setDialect(editing.dialect === "redis" ? "generic" : editing.dialect);
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
      setError(errorText2(cause));
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    Modal,
    {
      open: props.open,
      title: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "dshdb-inline", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DatabaseIcon, { size: 14 }),
        props.editing ? `编辑驱动 · ${props.editing.name}` : "新增自定义驱动"
      ] }),
      onClose: props.onClose,
      footer: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(import_jsx_runtime4.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "dshdb-modal-foot-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { onClick: props.onClose, children: "取消" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Button, { variant: "primary", loading: saving, onClick: () => void save(), children: "保存" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshdb-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "dshdb-form-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "名称", required: true, span: true, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TextInput, { value: name2, autoFocus: true, placeholder: "例如 ClickHouse", onChange: (event) => setName(event.target.value) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "方言", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            Select,
            {
              options: DIALECT_OPTIONS,
              value: dialect,
              onValueChange: (value) => setDialect(value)
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Field, { label: "驱动类", required: true, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            TextInput,
            {
              value: driverClass,
              placeholder: "com.example.jdbc.Driver",
              onChange: (event) => setDriverClass(event.target.value)
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            Field,
            {
              label: "JDBC URL 模板",
              required: true,
              span: true,
              hint: "占位符：{{host}} {{port}} {{database}}，例如 jdbc:mysql://{{host}}:{{port}}/{{database}}",
              children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(TextInput, { value: urlTemplate, onChange: (event) => setUrlTemplate(event.target.value) })
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            Field,
            {
              label: "Maven 依赖",
              required: true,
              span: true,
              hint: "每行一个 group:artifact:version；加载顺序即书写顺序",
              children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
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
        error ? /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(Banner, { tone: "error", children: error }) : null
      ] })
    }
  );
}

// src/client/views/SettingsView.tsx
var import_react4 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
function JavaBadge({ env }) {
  const java = env.java;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-kv", style: { padding: 0 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-key", children: "Java" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-kv-val dshdb-inline", children: [
      java.available ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { tone: "success", children: "可用" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { tone: "error", children: "未找到" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-mono", children: java.version ?? java.message ?? "未检测到 Java" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-key", children: "来源" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-val dshdb-mono", children: java.source }),
    java.path ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-key", children: "路径" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-val dshdb-mono", title: java.path, children: java.path })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-key", children: "数据目录" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-val dshdb-mono", title: env.configPath, children: env.configPath }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-key", children: "JDBC 桥" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-kv-val dshdb-inline", children: [
      env.bridgeBuilt ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { tone: "success", children: "已构建" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { tone: "warn", children: "缺失" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-mono", title: env.bridgeJar, children: env.bridgeJar })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-key", children: "版本" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-kv-val dshdb-mono", children: [
      "v",
      env.pluginVersion,
      " · ",
      env.platform
    ] })
  ] });
}
function SettingsView(props) {
  const [draft, setDraft] = (0, import_react4.useState)(props.settings);
  (0, import_react4.useEffect)(() => {
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
  const presets = props.drivers.filter((driver) => driver.preset !== null);
  const customs = props.drivers.filter((driver) => driver.preset === null);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-scroll dshdb-scroll-thin", style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(Panel, { title: "运行环境", bodyClassName: "dshdb-panel-body-pad", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(JavaBadge, { env: props.env }),
      !props.env.bridgeBuilt ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Banner, { tone: "warn", children: "JDBC 桥接器缺失，SQL 连接将不可用。运行 `npm run build:bridge` 后重试。" }) }) : null,
      !props.env.java.available && presets.some((driver) => driver.needsJava) ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Banner, { tone: "warn", children: "未检测到 Java，关系型数据库驱动需要 Java 8 及以上运行环境。" }) }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      Panel,
      {
        title: "查询与安全",
        actions: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
        children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-form", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-form-grid", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "返回行数上限", hint: "面板与工具共用的硬上限", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              TextInput,
              {
                type: "number",
                min: 1,
                max: 1e4,
                value: String(draft.maxRows),
                onChange: (event) => updateNumber("maxRows", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "查询超时（秒）", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              TextInput,
              {
                type: "number",
                min: 1,
                max: 600,
                value: String(draft.queryTimeoutSec),
                onChange: (event) => updateNumber("queryTimeoutSec", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "连接超时（秒）", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              TextInput,
              {
                type: "number",
                min: 1,
                max: 120,
                value: String(draft.connectTimeoutSec),
                onChange: (event) => updateNumber("connectTimeoutSec", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "Redis 单次扫描数量", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              TextInput,
              {
                type: "number",
                min: 10,
                max: 2e3,
                value: String(draft.redisScanCount),
                onChange: (event) => updateNumber("redisScanCount", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "Java 可执行文件", hint: "留空时自动查找 JAVA_HOME、PATH 与常见 JDK 目录", span: true, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              TextInput,
              {
                value: draft.javaPath,
                placeholder: "例如 C:\\\\Program Files\\\\Java\\\\jdk-21\\\\bin\\\\java.exe",
                onChange: (event) => update("javaPath", event.target.value)
              }
            ) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Field, { label: "Maven 镜像", hint: "驱动 jar 下载源", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-list", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              Switch,
              {
                checked: draft.allowAgentWrites,
                onChange: (checked) => update("allowAgentWrites", checked),
                label: "允许 Agent 工具执行写语句（仅非只读连接）"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      Panel,
      {
        title: "预置驱动",
        actions: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { size: "sm", variant: "ghost", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(RefreshIcon, { size: 12 }), onClick: props.onRefresh, children: "重新检测" }),
        bodyClassName: "dshdb-panel-body-pad",
        children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-list", children: presets.map((driver) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-driver-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DatabaseIcon, { size: 15 }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-driver-main", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-driver-name", children: [
              driver.name,
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { children: driver.dialect }),
              driver.allJarsPresent ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { tone: "success", children: "已就绪" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { tone: "warn", children: "缺少驱动" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-driver-sub", title: driver.jars.map((jar) => jar.coordinates).join(", "), children: [
              driver.driverClass ?? "—",
              driver.jars.length > 0 ? ` · ${driver.jars.map((jar) => jar.file).join(", ")}` : ""
            ] }),
            driver.jars.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { marginTop: 3 }, children: driver.jars.map((jar) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-file-row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: `dshdb-dot`, "data-tone": jar.downloaded ? "success" : "warn" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-mono", title: jar.coordinates, children: jar.file }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-muted", children: jar.downloaded ? formatBytes(jar.sizeBytes) : "未下载" })
            ] }, jar.coordinates)) }) : null
          ] }),
          driver.jars.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            Button,
            {
              size: "sm",
              icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DownloadIcon, { size: 12 }),
              loading: props.downloading === driver.id,
              disabled: driver.allJarsPresent,
              onClick: () => props.onDownload(driver.id),
              children: driver.allJarsPresent ? "已安装" : "下载"
            }
          ) : null
        ] }, driver.id)) })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      Panel,
      {
        title: "自定义驱动",
        actions: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(PlusIcon, { size: 12 }), onClick: props.onAddCustomDriver, children: "新增" }),
        bodyClassName: "dshdb-panel-body-pad",
        children: customs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-muted", style: { fontSize: 11.5, lineHeight: 1.6 }, children: "没有自定义驱动。若数据库不在预置列表中，可填写 Maven 坐标、驱动类与 JDBC URL 模板自行扩展。" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-list", children: customs.map((driver) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-driver-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DatabaseIcon, { size: 15 }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-driver-main", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-driver-name", children: [
              driver.name,
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { children: driver.dialect })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-driver-sub", title: driver.urlTemplate, children: [
              driver.driverClass,
              " · ",
              driver.urlTemplate
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-driver-sub", children: driver.jars.map((jar) => jar.coordinates).join(" · ") || "未配置 jar" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(EditIcon, { size: 12 }),
              "aria-label": `编辑 ${driver.name}`,
              onClick: () => props.onEditCustomDriver(driver)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TrashIcon, { size: 12 }),
              "aria-label": `删除 ${driver.name}`,
              onClick: () => props.onDeleteCustomDriver(driver)
            }
          )
        ] }, driver.id)) })
      }
    ),
    props.downloading !== "" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-muted dshdb-inline", style: { fontSize: 11 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Spinner, {}),
      " 正在下载驱动依赖…"
    ] }) : null
  ] });
}

// src/client/modals/SettingsModal.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function SettingsModal(props) {
  if (!props.open) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Modal, { open: true, title: "数据库设置", width: 720, onClose: props.onClose, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    SettingsView,
    {
      settings: props.settings,
      env: props.env,
      drivers: props.drivers,
      saving: props.saving,
      downloading: props.downloading,
      onSave: props.onSave,
      onRefresh: props.onRefresh,
      onDownload: props.onDownload,
      onAddCustomDriver: props.onAddCustomDriver,
      onEditCustomDriver: props.onEditCustomDriver,
      onDeleteCustomDriver: props.onDeleteCustomDriver
    }
  ) });
}

// src/client/views/DataView.tsx
var import_react5 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
var FOLDERS = [
  { id: "table", label: "表", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TableIcon, { size: 13 }) },
  { id: "view", label: "视图", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ViewIcon, { size: 13 }) },
  { id: "routine", label: "例程", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(FunctionIcon, { size: 13 }) },
  { id: "sequence", label: "序列", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SequenceIcon, { size: 13 }) },
  { id: "trigger", label: "触发器", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TriggerIcon, { size: 13 }) },
  { id: "other", label: "其他", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(FolderIcon, { size: 13 }) }
];
function folderOf(kind) {
  if (kind === "procedure" || kind === "function") return "routine";
  if (kind === "sequence" || kind === "trigger" || kind === "view" || kind === "table") return kind;
  return "other";
}
function objectIcon(kind) {
  if (kind === "table") return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TableIcon, { size: 13 });
  if (kind === "view") return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ViewIcon, { size: 13 });
  if (kind === "procedure" || kind === "function") return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(FunctionIcon, { size: 13 });
  if (kind === "sequence") return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SequenceIcon, { size: 13 });
  if (kind === "trigger") return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TriggerIcon, { size: 13 });
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(FolderIcon, { size: 13 });
}
function relativeTime(iso) {
  const stamp = Date.parse(iso);
  if (Number.isNaN(stamp)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - stamp) / 1e3));
  if (seconds < 60) return "刚刚";
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟前`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} 小时前`;
  return `${Math.round(seconds / 86400)} 天前`;
}
var DEPTH_ONE = { "--dshdb-depth": 1 };
var DEPTH_TWO = { "--dshdb-depth": 2 };
var DEPTH_THREE = { "--dshdb-depth": 3 };
var DEPTH_FOUR = { "--dshdb-depth": 4 };
var DEPTH_FIVE = { "--dshdb-depth": 5 };
function DetailFolder({
  label,
  icon,
  count,
  depth,
  open,
  onToggle,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      "button",
      {
        type: "button",
        className: "dshdb-row",
        role: "treeitem",
        "aria-expanded": open,
        "data-kind": "folder",
        style: depth,
        onClick: onToggle,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle", children: open ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronRightIcon, { size: 12 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: icon }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label", children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-meta", children: count })
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { role: "group", children }) : null
  ] });
}
function ObjectRow({
  connectionId,
  schema,
  object,
  selected,
  expanded,
  description,
  loading,
  onSelect,
  onOpen,
  onToggleKey
}) {
  const isRelation = object.kind === "table" || object.kind === "view";
  const key = `${connectionId}|${schema}.${object.name}`;
  const open = isRelation && expanded[key] === true;
  const keys = description?.indexes.filter((index) => index.primary === true || index.unique === true) ?? [];
  const indexes = description?.indexes ?? [];
  const columnFolderKey = `${key}#columns`;
  const keyFolderKey = `${key}#keys`;
  const indexFolderKey = `${key}#indexes`;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      "button",
      {
        type: "button",
        className: "dshdb-row",
        role: "treeitem",
        "aria-expanded": isRelation ? open : void 0,
        "data-active": selected,
        "data-kind": object.kind,
        style: DEPTH_THREE,
        title: object.comment ? `${object.name} — ${object.comment}` : `${object.name}（${objectKindLabel(object.kind)}）`,
        onClick: (event) => {
          if (event.detail > 1) return;
          onSelect();
          if (isRelation) onToggleKey(key);
        },
        onDoubleClick: () => {
          if (!isRelation) return;
          onSelect();
          onOpen();
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle", children: isRelation ? open ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronRightIcon, { size: 12 }) : null }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: objectIcon(object.kind) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label", children: object.name }),
          loading ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Spinner, {}) : null
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { role: "group", children: [
      loading && description === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 52px" }, children: "正在读取结构…" }) : null,
      !loading && description === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 52px" }, children: "未连接数据源，连接后可查看结构" }) : null,
      description !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          DetailFolder,
          {
            label: "列",
            icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ColumnIcon, { size: 13 }),
            count: description.columns.length,
            depth: DEPTH_FOUR,
            open: expanded[columnFolderKey] === true,
            onToggle: () => onToggleKey(columnFolderKey),
            children: description.columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-row", style: DEPTH_FIVE, "data-kind": "column", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ColumnIcon, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label", children: column.name }),
              column.primaryKey ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-tag", "data-tone": "key", children: "PK" }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-meta", children: column.typeName })
            ] }, column.name))
          }
        ),
        keys.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          DetailFolder,
          {
            label: "键",
            icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(KeyIcon, { size: 13 }),
            count: keys.length,
            depth: DEPTH_FOUR,
            open: expanded[keyFolderKey] === true,
            onToggle: () => onToggleKey(keyFolderKey),
            children: keys.map((index) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-row", style: DEPTH_FIVE, "data-kind": "key", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(KeyIcon, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label", children: index.primary ? "主键" : index.name }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-meta", children: index.columns.join(", ") })
            ] }, index.name))
          }
        ) : null,
        indexes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          DetailFolder,
          {
            label: "索引",
            icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(IndexIcon, { size: 13 }),
            count: indexes.length,
            depth: DEPTH_FOUR,
            open: expanded[indexFolderKey] === true,
            onToggle: () => onToggleKey(indexFolderKey),
            children: indexes.map((index) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-row", style: DEPTH_FIVE, "data-kind": "index", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(IndexIcon, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label", children: index.name }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-meta", children: index.columns.join(", ") })
            ] }, index.name))
          }
        ) : null
      ] }) : null
    ] }) : null
  ] });
}
function DataView(props) {
  const [filter, setFilter] = (0, import_react5.useState)("");
  const { connections, selectedId, servers, expanded, schemas, objects, cachedAt, detail, detailLoading } = props;
  const normalizedFilter = filter.trim().toLowerCase();
  const matches = (text) => normalizedFilter === "" || text.toLowerCase().includes(normalizedFilter);
  const grouped = (0, import_react5.useMemo)(() => {
    const cache = {};
    for (const [key, list] of Object.entries(objects)) {
      const buckets = {};
      for (const folder of FOLDERS) buckets[folder.id] = [];
      for (const object of list) {
        if (!matches(object.name)) continue;
        buckets[folderOf(object.kind)].push(object);
      }
      cache[key] = buckets;
    }
    return cache;
  }, [objects, normalizedFilter]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-view", style: { gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        TextInput,
        {
          value: filter,
          onChange: (event) => setFilter(event.target.value),
          placeholder: "筛选库表…",
          "aria-label": "筛选库表",
          style: { width: 132 }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-toolbar-spacer" }),
      props.detailLoading ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-muted dshdb-inline", children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Spinner, {}),
        " 读取结构"
      ] }) : null
    ] }),
    connections.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DatabaseIcon, { size: 28 }),
        title: "还没有数据源",
        description: "用工具栏的「新增」按钮添加 MySQL、Oracle、达梦、OceanBase 或 Redis 连接。连接一次之后，即使离线也能浏览缓存的库表结构。",
        actions: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Button, { variant: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PlusIcon, { size: 13 }), onClick: props.onAddConnection, children: "新建连接" })
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Panel, { className: "dshdb-grow", bodyClassName: "dshdb-panel-body-pad", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-tree dshdb-scroll-thin", role: "tree", "aria-label": "数据源", children: connections.map((connection) => {
      const isSelected = connection.id === selectedId;
      const isExpanded = expanded[connection.id] === true;
      const server = servers[connection.id];
      const connecting = props.connectingId === connection.id;
      const loading = props.loadingSchemas[connection.id] === true;
      const cachedStamp = cachedAt[connection.id];
      const list = (schemas[connection.id] ?? []).filter((schema) => matches(schema.name));
      const hasCachedStructure = (schemas[connection.id]?.length ?? 0) > 0;
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
          "button",
          {
            type: "button",
            className: "dshdb-row",
            role: "treeitem",
            "aria-expanded": isExpanded,
            "data-active": isSelected,
            "data-kind": "datasource",
            title: `${connection.name} · ${connection.host}:${connection.port}${cachedStamp ? `
离线可用 · 结构更新于 ${relativeTime(cachedStamp)}` : ""}`,
            onClick: () => {
              props.onSelectConnection(connection.id);
              props.onToggleConnection(connection.id);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle", children: isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronRightIcon, { size: 12 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DatabaseIcon, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label", children: connection.name }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { children: DIALECT_LABEL[connection.dialect] }),
              connection.readOnly ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "warn", children: "只读" }) : null,
              !server && cachedStamp && hasCachedStructure ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-row-meta", children: [
                "缓存 ",
                relativeTime(cachedStamp)
              ] }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                StateDot,
                {
                  tone: server ? "success" : connecting ? "warn" : connection.dialect === "redis" ? "business" : "idle"
                }
              )
            ]
          }
        ),
        isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { role: "group", children: !server && !hasCachedStructure ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
          "button",
          {
            type: "button",
            className: "dshdb-row",
            style: DEPTH_ONE,
            "data-kind": "schema",
            disabled: connecting,
            onClick: () => props.onConnect(connection.id),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: connecting ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Spinner, {}) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DatabaseIcon, { size: 13 }) }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label dshdb-muted", children: connecting ? "正在连接…" : `连接到 ${connection.host}:${connection.port}` })
            ]
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
          loading ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-muted dshdb-inline", style: { padding: "4px 6px 4px 26px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Spinner, {}),
            " 正在加载 schema…"
          ] }) : null,
          !loading && !server && hasCachedStructure ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-muted", style: { padding: "2px 6px 4px 26px", fontSize: 11 }, children: [
            "离线缓存 · ",
            relativeTime(cachedStamp ?? ""),
            "，连接后自动更新"
          ] }) : null,
          !loading && list.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 26px" }, children: normalizedFilter ? "没有匹配的 schema" : "没有 schema" }) : null,
          list.map((schema) => {
            const key = `${connection.id}:${schema.name}`;
            const schemaExpanded = expanded[key] === true;
            const objectList = objects[key];
            const objectLoading = props.loadingObjects[key] === true;
            const buckets = grouped[key];
            const total = objectList === void 0 ? void 0 : FOLDERS.reduce(
              (sum, folder) => sum + (buckets?.[folder.id].length ?? 0),
              0
            );
            return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
                "button",
                {
                  type: "button",
                  className: "dshdb-row",
                  role: "treeitem",
                  "aria-expanded": schemaExpanded,
                  "data-kind": "schema",
                  style: DEPTH_ONE,
                  onClick: () => props.onToggleSchema(connection.id, schema.name),
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle", children: schemaExpanded ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronRightIcon, { size: 12 }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DatabaseIcon, { size: 13 }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label", children: schema.name }),
                    schema.system ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { children: "系统" }) : null,
                    objectLoading ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Spinner, {}) : null,
                    !objectLoading && total !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-meta", children: total }) : null
                  ]
                }
              ),
              schemaExpanded ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { role: "group", children: [
                objectLoading && objectList === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 40px" }, children: "正在加载对象…" }) : null,
                !objectLoading && objectList !== void 0 && FOLDERS.every((folder) => (buckets?.[folder.id].length ?? 0) === 0) ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 40px" }, children: normalizedFilter ? "没有匹配的对象" : "没有表或视图" }) : null,
                objectList !== void 0 ? FOLDERS.filter((folder) => (buckets?.[folder.id].length ?? 0) > 0).map((folder) => {
                  const folderKey = `${connection.id}:${schema.name}#${folder.id}`;
                  const folderExpanded = expanded[folderKey] === true;
                  const items = buckets?.[folder.id] ?? [];
                  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
                      "button",
                      {
                        type: "button",
                        className: "dshdb-row",
                        role: "treeitem",
                        "aria-expanded": folderExpanded,
                        "data-kind": "folder",
                        style: DEPTH_TWO,
                        onClick: () => props.onToggleFolder(connection.id, schema.name, folder.id),
                        children: [
                          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-toggle", children: folderExpanded ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ChevronRightIcon, { size: 12 }) }),
                          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-icon", children: folder.icon }),
                          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-label", children: folder.label }),
                          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-row-meta", children: items.length })
                        ]
                      }
                    ),
                    folderExpanded ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { role: "group", children: items.map((object) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
                      ObjectRow,
                      {
                        connectionId: connection.id,
                        schema: schema.name,
                        object,
                        selected: props.selectedKey === `${connection.id}|${schema.name}.${object.name}`,
                        expanded,
                        description: props.descriptions[`${connection.id}|${schema.name}.${object.name}`],
                        loading: props.loadingDescriptions[`${connection.id}|${schema.name}.${object.name}`] === true,
                        onSelect: () => void props.onSelectObject(connection.id, schema.name, object),
                        onOpen: () => props.onOpenTable(connection.id, schema.name, object),
                        onToggleKey: props.onToggleKey
                      },
                      object.name
                    )) }) : null
                  ] }, folder.id);
                }) : null
              ] }) : null
            ] }, schema.name);
          })
        ] }) }) : null
      ] }, connection.id);
    }) }) }),
    detail ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
      Panel,
      {
        title: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-inline", children: [
          objectIcon(detail.kind),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-mono", children: [
            detail.schema,
            ".",
            detail.table
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { children: objectKindLabel(detail.kind) })
        ] }),
        actions: detail.kind === "table" || detail.kind === "view" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          Button,
          {
            size: "sm",
            onClick: () => props.onShowDdl(selectedId, detail.schema, detail.table, detail.kind),
            children: "DDL"
          }
        ) : null,
        bodyClassName: "dshdb-panel-body-pad",
        scroll: true,
        children: [
          detail.columns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 0" }, children: detail.kind === "table" || detail.kind === "view" ? "没有读取到列结构。" : `${objectKindLabel(detail.kind)}没有列结构，可在 SQL 控制台查看定义。` }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-grid-wrap", style: { maxHeight: 220 }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("table", { className: "dshdb-grid", children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("th", { children: "列" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("th", { children: "类型" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("th", { children: "可空" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("th", { children: "默认值" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("th", { children: "注释" })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("tbody", { children: detail.columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("td", { title: column.name, children: [
                column.name,
                column.primaryKey ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-tag", style: { marginLeft: 6 }, children: "PK" }) : null
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("td", { title: column.typeName, children: column.typeName }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("td", { children: column.nullable === false ? "否" : "是" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("td", { title: column.defaultValue ?? "", children: column.defaultValue ?? "—" }),
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("td", { title: column.comment ?? "", children: column.comment ?? "" })
            ] }, column.name)) })
          ] }) }),
          detail.indexes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-kv", style: { padding: "8px 0 0" }, children: detail.indexes.map((index) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { style: { display: "contents" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-kv-key", children: [
              index.primary ? "主键" : index.unique ? "唯一索引" : "索引",
              " ",
              index.name
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-val dshdb-mono", children: index.columns.join(", ") })
          ] }, index.name)) }) : null
        ]
      }
    ) : null,
    !detail && !detailLoading && connections.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "dshdb-muted", style: { padding: "0 2px" }, children: "展开数据源，选择表或视图可查看列、索引等结构信息。" }) : null
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
  return { connectionId, schema, table };
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
  const { connectionId } = value;
  if (typeof connectionId !== "string" || connectionId === "") return {};
  return { connectionId };
}

// src/client/App.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
var noopTabInfo = () => void 0;
function errorText3(error) {
  return error instanceof Error ? error.message : String(error);
}
function ToolButton({
  icon,
  children,
  title,
  onClick,
  disabled
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { type: "button", className: "dshdb-toolbtn", title, "aria-label": title, onClick, disabled, children: [
    icon,
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children })
  ] });
}
function App(props) {
  const info = (props.useTabInfo ?? noopTabInfo)();
  const hidden = info?.tab?.visible === false;
  const [snapshot, setSnapshot] = (0, import_react6.useState)(null);
  const [loadError, setLoadError] = (0, import_react6.useState)("");
  const [selectedId, setSelectedId] = (0, import_react6.useState)("");
  const [servers, setServers] = (0, import_react6.useState)({});
  const [connectingId, setConnectingId] = (0, import_react6.useState)("");
  const [schemas, setSchemas] = (0, import_react6.useState)({});
  const [objects, setObjects] = (0, import_react6.useState)({});
  const [expanded, setExpanded] = (0, import_react6.useState)({});
  const [loadingSchemas, setLoadingSchemas] = (0, import_react6.useState)({});
  const [loadingObjects, setLoadingObjects] = (0, import_react6.useState)({});
  const [cachedAt, setCachedAt] = (0, import_react6.useState)({});
  const [descriptions, setDescriptions] = (0, import_react6.useState)({});
  const [loadingDescriptions, setLoadingDescriptions] = (0, import_react6.useState)({});
  const [detail, setDetail] = (0, import_react6.useState)(null);
  const [detailLoading, setDetailLoading] = (0, import_react6.useState)(false);
  const [selectedKey, setSelectedKey] = (0, import_react6.useState)("");
  const [ddlModal, setDdlModal] = (0, import_react6.useState)({
    open: false,
    title: "",
    text: "",
    loading: false,
    source: ""
  });
  const [toast, setToast] = (0, import_react6.useState)(null);
  const [savingSettings, setSavingSettings] = (0, import_react6.useState)(false);
  const [downloading, setDownloading] = (0, import_react6.useState)("");
  const [deleting, setDeleting] = (0, import_react6.useState)(false);
  const [confirm, setConfirm] = (0, import_react6.useState)(null);
  const [settingsOpen, setSettingsOpen] = (0, import_react6.useState)(false);
  const [connModal, setConnModal] = (0, import_react6.useState)({
    open: false,
    editing: null
  });
  const [driverModal, setDriverModal] = (0, import_react6.useState)({
    open: false,
    editing: null
  });
  const notify = (0, import_react6.useCallback)((text, tone = "info") => {
    setToast({ text, tone, seq: Date.now() });
  }, []);
  const askConfirm = (0, import_react6.useCallback)((message, detail2) => {
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
  const refresh = (0, import_react6.useCallback)(async () => {
    try {
      const data = await api.status();
      setSnapshot({ connections: data.config.connections, drivers: data.drivers, settings: data.config.settings, env: data.env });
      setLoadError("");
    } catch (error) {
      setLoadError(errorText3(error));
    }
  }, []);
  (0, import_react6.useEffect)(() => {
    void refresh();
  }, [refresh]);
  (0, import_react6.useEffect)(() => {
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
  }, []);
  function applyStructures(structures) {
    const nextSchemas = {};
    const nextObjects = {};
    const nextCached = {};
    const nextDescriptions = {};
    for (const [connectionId, entry] of Object.entries(structures)) {
      if (entry.schemas.length > 0) nextSchemas[connectionId] = entry.schemas;
      for (const [schema, list] of Object.entries(entry.objects)) {
        nextObjects[`${connectionId}:${schema}`] = list;
      }
      for (const [key, description] of Object.entries(entry.descriptions ?? {})) {
        nextDescriptions[`${connectionId}|${key}`] = description;
      }
      nextCached[connectionId] = entry.fetchedAt;
    }
    setSchemas((previous) => ({ ...nextSchemas, ...previous }));
    setObjects((previous) => ({ ...nextObjects, ...previous }));
    setDescriptions((previous) => ({ ...nextDescriptions, ...previous }));
    setCachedAt((previous) => ({ ...nextCached, ...previous }));
  }
  (0, import_react6.useEffect)(() => {
    if (!snapshot) return;
    const exists = snapshot.connections.some((connection) => connection.id === selectedId);
    if (!exists) {
      setSelectedId(snapshot.connections[0]?.id ?? "");
      setServers({});
      setDetail(null);
      setSelectedKey("");
    }
  }, [snapshot, selectedId]);
  (0, import_react6.useEffect)(() => {
    setDetail(null);
    setSelectedKey("");
  }, [selectedId]);
  const connections = snapshot?.connections ?? [];
  const selected = connections.find((connection) => connection.id === selectedId);
  const server = selected ? servers[selected.id] : void 0;
  async function loadSchemas(connectionId) {
    setLoadingSchemas((previous) => ({ ...previous, [connectionId]: true }));
    try {
      const result = await api.schemas(connectionId);
      setSchemas((previous) => ({ ...previous, [connectionId]: result.schemas }));
      if (result.fetchedAt !== void 0) {
        const stamp = result.fetchedAt;
        setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }));
      }
      setObjects((previous) => {
        const next = { ...previous };
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${connectionId}:`)) delete next[key];
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
      setExpanded((previous) => {
        const next = { ...previous };
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${connectionId}:`)) delete next[key];
        }
        return next;
      });
    } catch (error) {
      notify(`加载 schema 失败：${errorText3(error)}`, "error");
    } finally {
      setLoadingSchemas((previous) => ({ ...previous, [connectionId]: false }));
    }
  }
  async function connect(connectionId) {
    const connection = connections.find((item) => item.id === connectionId);
    if (!connection) return;
    setConnectingId(connectionId);
    try {
      const connected = await api.connect(connectionId);
      setServers((previous) => ({ ...previous, [connectionId]: connected }));
      notify("连接成功", "success");
      if (connection.dialect !== "redis") await loadSchemas(connectionId);
    } catch (error) {
      notify(`连接失败：${errorText3(error)}`, "error");
    } finally {
      setConnectingId("");
    }
  }
  async function disconnect(connectionId) {
    try {
      await api.disconnect(connectionId);
      setServers((previous) => {
        const next = { ...previous };
        delete next[connectionId];
        return next;
      });
      setDetail(null);
      setSelectedKey("");
      notify("已断开", "info");
    } catch (error) {
      notify(`断开失败：${errorText3(error)}`, "error");
    }
  }
  function selectConnection(id) {
    setSelectedId(id);
  }
  function toggleConnection(id) {
    const isExpanded = expanded[id] === true;
    setExpanded((previous) => ({ ...previous, [id]: !isExpanded }));
  }
  function toggleFolder(connectionId, schema, folder) {
    const key = `${connectionId}:${schema}#${folder}`;
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }));
  }
  async function toggleSchema(connectionId, schema) {
    const key = `${connectionId}:${schema}`;
    const isExpanded = expanded[key] === true;
    setExpanded((previous) => ({ ...previous, [key]: !isExpanded }));
    if (isExpanded || objects[key] !== void 0) return;
    setLoadingObjects((previous) => ({ ...previous, [key]: true }));
    try {
      const result = await api.objects(connectionId, schema);
      setObjects((previous) => ({ ...previous, [key]: result.objects }));
      if (result.fetchedAt !== void 0) {
        const stamp = result.fetchedAt;
        setCachedAt((previous) => ({ ...previous, [connectionId]: stamp }));
      }
    } catch (error) {
      notify(`加载对象失败：${errorText3(error)}`, "error");
    } finally {
      setLoadingObjects((previous) => ({ ...previous, [key]: false }));
    }
  }
  async function selectObject(connectionId, schema, object) {
    const key = `${connectionId}|${schema}.${object.name}`;
    setSelectedId(connectionId);
    setSelectedKey(key);
    if (object.kind !== "table" && object.kind !== "view") {
      setDetailLoading(false);
      setDetail({ schema, table: object.name, kind: object.kind, columns: [], indexes: [] });
      return;
    }
    const known = descriptions[key];
    if (known !== void 0) {
      setDetailLoading(false);
      setDetail(known);
      return;
    }
    if (!servers[connectionId]) {
      setDetailLoading(false);
      setDetail(null);
      notify("数据源未连接，连接后可查看表结构", "info");
      return;
    }
    setDetailLoading(true);
    setLoadingDescriptions((previous) => ({ ...previous, [key]: true }));
    try {
      const description = await api.describe(connectionId, schema, object.name, object.kind);
      setDescriptions((previous) => ({ ...previous, [key]: description }));
      setDetail(description);
    } catch (error) {
      setDetail(null);
      notify(`读取表结构失败：${errorText3(error)}`, "error");
    } finally {
      setDetailLoading(false);
      setLoadingDescriptions((previous) => ({ ...previous, [key]: false }));
    }
  }
  function toggleKey(key) {
    setExpanded((previous) => ({ ...previous, [key]: previous[key] !== true }));
  }
  async function showDdl(connectionId, schema, table, kind) {
    const title = `${schema}.${table} · DDL`;
    setDdlModal({ open: true, title, text: "", loading: true, source: "" });
    try {
      const result = await api.ddl(connectionId, schema, table, kind);
      setDdlModal({ open: true, title, text: result.ddl, loading: false, source: result.source });
    } catch (error) {
      setDdlModal({ open: false, title: "", text: "", loading: false, source: "" });
      notify(`读取 DDL 失败：${errorText3(error)}`, "error");
    }
  }
  async function copyDdl() {
    try {
      await navigator.clipboard.writeText(ddlModal.text);
      notify("DDL 已复制", "success");
    } catch (error) {
      notify(`复制失败：${errorText3(error)}`, "error");
    }
  }
  async function refreshSelected() {
    setDetail(null);
    setSelectedKey("");
    if (!selected) {
      await refresh();
      return;
    }
    if (!servers[selected.id] || selected.dialect === "redis") {
      await connect(selected.id);
      await refresh();
      return;
    }
    await loadSchemas(selected.id);
    await refresh();
    notify("已刷新数据源", "success");
  }
  async function saveSettings(next) {
    setSavingSettings(true);
    try {
      const result = await api.updateSettings(next);
      setSnapshot(
        (previous) => previous ? { ...previous, settings: result.settings, env: result.env } : previous
      );
      notify("设置已保存", "success");
      void refresh();
    } catch (error) {
      notify(`保存设置失败：${errorText3(error)}`, "error");
    } finally {
      setSavingSettings(false);
    }
  }
  async function downloadDriver(driverId) {
    setDownloading(driverId);
    try {
      const status = await api.downloadDriver(driverId);
      setSnapshot(
        (previous) => previous ? { ...previous, drivers: previous.drivers.map((driver) => driver.id === status.id ? status : driver) } : previous
      );
      notify("驱动依赖已就绪", "success");
    } catch (error) {
      notify(`下载失败：${errorText3(error)}`, "error");
    } finally {
      setDownloading("");
    }
  }
  async function deleteCustomDriver(driver) {
    const ok = await askConfirm(`删除自定义驱动「${driver.name}」？使用它的连接将无法连接。`);
    if (!ok) return;
    try {
      const result = await api.deleteCustomDriver(driver.id);
      setSnapshot((previous) => previous ? { ...previous, drivers: result.drivers } : previous);
      notify("自定义驱动已删除", "success");
    } catch (error) {
      notify(`删除失败：${errorText3(error)}`, "error");
    }
  }
  async function deleteConnection(connection) {
    const ok = await askConfirm(`删除连接「${connection.name}」？保存的密码也会一并删除。`);
    if (!ok) return;
    setDeleting(true);
    try {
      await api.deleteConnection(connection.id);
      setConnModal({ open: false, editing: null });
      notify("连接已删除", "success");
      await refresh();
    } catch (error) {
      notify(`删除失败：${errorText3(error)}`, "error");
    } finally {
      setDeleting(false);
    }
  }
  const rootStyle = {
    display: hidden ? "none" : "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-root", style: rootStyle, "data-plugin-route": ROUTE_PREFIX, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-toolbar dshdb-toolbar-top", role: "toolbar", "aria-label": "数据库工具栏", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        ToolButton,
        {
          title: "新增数据源",
          icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PlusIcon, { size: 14 }),
          onClick: () => setConnModal({ open: true, editing: null }),
          children: "新增"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        ToolButton,
        {
          title: "刷新选中的数据源",
          icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(RefreshIcon, { size: 14 }),
          onClick: () => void refreshSelected(),
          disabled: connectingId !== "",
          children: "刷新"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        ToolButton,
        {
          title: "删除选中的数据源",
          icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(TrashIcon, { size: 14 }),
          onClick: () => {
            if (selected) void deleteConnection(selected);
          },
          disabled: !selected || deleting,
          children: "删除"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        ToolButton,
        {
          title: "查询控制台",
          icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(TerminalIcon, { size: 14 }),
          onClick: () => openConsoleTab({ connectionId: selected?.id }),
          children: "控制台"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ToolButton, { title: "设置", icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(SettingsIcon, { size: 14 }), onClick: () => setSettingsOpen(true), children: "设置" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-toolbar-spacer" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("main", { className: "dshdb-main", children: [
      loadError ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "dshdb-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(Banner, { tone: "error", children: [
        "加载插件状态失败：",
        loadError
      ] }) }) : null,
      !snapshot && !loadError ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Spinner, { size: 18 }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-muted", children: "正在加载数据源…" })
      ] }) : null,
      snapshot ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "dshdb-view", style: { padding: "8px 10px 12px", minHeight: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
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
          onAddConnection: () => setConnModal({ open: true, editing: null }),
          onSelectConnection: selectConnection,
          onToggleConnection: toggleConnection,
          onConnect: (id) => void connect(id),
          onToggleSchema: (connectionId, schema) => void toggleSchema(connectionId, schema),
          onToggleFolder: toggleFolder,
          onToggleKey: toggleKey,
          onSelectObject: (connectionId, schema, object) => void selectObject(connectionId, schema, object),
          onShowDdl: (connectionId, schema, table, kind) => void showDdl(connectionId, schema, table, kind),
          onOpenTable: (connectionId, schema, object) => {
            setSelectedId(connectionId);
            openTableTab({ connectionId, schema, table: object.name });
          }
        }
      ) }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("footer", { className: "dshdb-statusbar", children: [
      selected ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StateDot, { tone: server ? "success" : connectingId === selectedId ? "warn" : "idle" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { title: selected.name, children: selected.name }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "·" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "dshdb-mono", children: [
          selected.host,
          ":",
          selected.port
        ] }),
        selected.database ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "dshdb-mono", children: [
          "/",
          selected.database
        ] }) : null,
        server ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Button, { size: "sm", variant: "ghost", onClick: () => void disconnect(selected.id), children: "断开" }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            loading: connectingId === selected.id,
            onClick: () => void connect(selected.id),
            children: "连接"
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { children: "尚未选择数据源" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-statusbar-spacer" }),
      snapshot ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { title: snapshot.env.configPath, children: [
        "Java ",
        snapshot.env.java.available ? snapshot.env.java.version ?? "可用" : "未找到",
        " · v",
        snapshot.env.pluginVersion
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      DriverModal,
      {
        open: driverModal.open,
        editing: driverModal.editing,
        onClose: () => setDriverModal({ open: false, editing: null }),
        onSaved: (drivers) => setSnapshot((previous) => previous ? { ...previous, drivers } : previous),
        notify
      }
    ),
    snapshot ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      SettingsModal,
      {
        open: settingsOpen,
        settings: snapshot.settings,
        env: snapshot.env,
        drivers: snapshot.drivers,
        saving: savingSettings,
        downloading,
        onClose: () => setSettingsOpen(false),
        onSave: (next) => void saveSettings(next),
        onRefresh: () => void refresh(),
        onDownload: (driverId) => void downloadDriver(driverId),
        onAddCustomDriver: () => setDriverModal({ open: true, editing: null }),
        onEditCustomDriver: (driver) => setDriverModal({ open: true, editing: driver }),
        onDeleteCustomDriver: (driver) => void deleteCustomDriver(driver)
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      Modal,
      {
        open: ddlModal.open,
        title: ddlModal.title,
        width: 760,
        onClose: () => setDdlModal({ open: false, title: "", text: "", loading: false, source: "" }),
        footer: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-muted", children: ddlModal.source === "generated" ? "按结构重建的 DDL" : ddlModal.source === "server" ? "服务器返回的 DDL" : "" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-toolbar-spacer" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Button, { size: "sm", onClick: () => void copyDdl(), disabled: ddlModal.text === "", children: "复制" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
            Button,
            {
              size: "sm",
              variant: "primary",
              onClick: () => setDdlModal({ open: false, title: "", text: "", loading: false, source: "" }),
              children: "关闭"
            }
          )
        ] }),
        children: ddlModal.loading ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-empty", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Spinner, { size: 16 }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-muted", children: "正在读取 DDL…" })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("pre", { className: "dshdb-ddl", children: ddlModal.text })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ConfirmDialog, { request: confirm?.request ?? null, onConfirm: () => resolveConfirm(true), onCancel: () => resolveConfirm(false) }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Toast, { toast, onDismiss: () => setToast(null) })
  ] });
}

// src/client/ConsoleTab.tsx
var import_react8 = require("react");

// src/client/DataGrid.tsx
var import_react7 = require("react");

// src/client/columnWidths.ts
var STORAGE_KEY = "dsh-ide-database.colwidths.v1";
var MIN_WIDTH = 40;
var MAX_WIDTH = 1200;
var MAX_COLUMNS = 64;
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
  if (!Array.isArray(widths) || widths.length !== count || count > MAX_COLUMNS) return null;
  const valid = widths.every(
    (width) => typeof width === "number" && Number.isFinite(width) && width >= MIN_WIDTH && width <= MAX_WIDTH
  );
  return valid ? widths.map(clamp) : null;
}
function writeWidths(key, widths) {
  const all = readAll();
  all[key] = widths.slice(0, MAX_COLUMNS).map(clamp);
  writeAll(all);
}
function clearWidths(key) {
  const all = readAll();
  if (!(key in all)) return;
  delete all[key];
  writeAll(all);
}

// src/client/DataGrid.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var GRID_ROW_HEIGHT = 22;
var VIRTUAL_THRESHOLD = 200;
var OVERSCAN = 8;
var MIN_COLUMN_WIDTH = 48;
var MAX_COLUMN_WIDTH = 1200;
function useVirtualRange(rowCount, containerRef) {
  const enabled = rowCount > VIRTUAL_THRESHOLD;
  const [scrollTop, setScrollTop] = (0, import_react7.useState)(0);
  const [viewport, setViewport] = (0, import_react7.useState)(480);
  const [headerHeight, setHeaderHeight] = (0, import_react7.useState)(26);
  const frame = (0, import_react7.useRef)(0);
  const measure = (0, import_react7.useCallback)(() => {
    const element = containerRef.current;
    if (element === null) return;
    setViewport(element.clientHeight);
    const head = element.querySelector("thead");
    if (head !== null) setHeaderHeight(head.getBoundingClientRect().height);
  }, [containerRef]);
  (0, import_react7.useEffect)(() => {
    measure();
    const element = containerRef.current;
    if (element === null) return;
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);
  (0, import_react7.useEffect)(() => {
    const element = containerRef.current;
    if (element !== null) element.scrollTop = 0;
    setScrollTop(0);
  }, [rowCount, containerRef]);
  const onScroll = (0, import_react7.useCallback)(() => {
    if (frame.current !== 0) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const element = containerRef.current;
      if (element !== null) setScrollTop(element.scrollTop);
    });
  }, [containerRef]);
  const range = (0, import_react7.useMemo)(() => {
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
function DataGrid(props) {
  const { columns, rows, offset, headerExtra, cellClass, onCellClick, storageKey, sort, onSort, headerMenu } = props;
  const [menu, setMenu] = (0, import_react7.useState)(null);
  const containerRef = (0, import_react7.useRef)(null);
  const tableRef = (0, import_react7.useRef)(null);
  const { range, onScroll } = useVirtualRange(rows.length, containerRef);
  const visible = rows.slice(range.start, range.end);
  const [widths, setWidths] = (0, import_react7.useState)(
    () => storageKey === void 0 ? null : readWidths(storageKey, columns.length)
  );
  (0, import_react7.useEffect)(() => {
    setWidths(storageKey === void 0 ? null : readWidths(storageKey, columns.length));
  }, [storageKey, columns.length]);
  (0, import_react7.useEffect)(() => {
    if (widths !== null && widths.length !== columns.length) setWidths(null);
  }, [widths, columns.length]);
  const startResize = (0, import_react7.useCallback)(
    (event, index) => {
      event.preventDefault();
      event.stopPropagation();
      const table = tableRef.current;
      if (table === null) return;
      const headers = table.querySelectorAll("thead tr:first-child th");
      const measured = columns.map((_, columnIndex) => {
        const header = headers[columnIndex + 1];
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
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        if (storageKey !== void 0) writeWidths(storageKey, current);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columns, storageKey, widths]
  );
  const resetWidths = (0, import_react7.useCallback)(() => {
    setWidths(null);
    if (storageKey !== void 0) clearWidths(storageKey);
  }, [storageKey]);
  (0, import_react7.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-grid-wrap", ref: containerRef, onScroll, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("table", { className: `dshdb-grid${widths === null ? "" : " dshdb-grid-sized"}`, ref: tableRef, children: [
      widths === null ? null : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("colgroup", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("col", { style: { width: 34 } }),
        widths.map((width, index) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("col", { style: { width } }, `col-${index}`))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("thead", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("th", { className: "dshdb-num", children: "#" }),
          columns.map((column, index) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
            "th",
            {
              title: onSort === void 0 ? `${column.name} ${column.typeName}` : `按 ${column.name} 排序`,
              className: onSort === void 0 ? void 0 : "dshdb-th-sortable",
              "data-sorted": sort !== null && sort !== void 0 && sort.column === column.name ? sort.direction : void 0,
              onClick: onSort === void 0 ? void 0 : (event) => {
                if (event.target.classList.contains("dshdb-grip")) return;
                onSort(column);
              },
              onContextMenu: headerMenu === void 0 ? void 0 : (event) => {
                event.preventDefault();
                const width = 200;
                const height = 24 * headerMenu(column).length + 12;
                setMenu({
                  column,
                  x: Math.min(event.clientX, window.innerWidth - width - 8),
                  y: Math.min(event.clientY, window.innerHeight - height - 8)
                });
              },
              children: [
                column.name,
                sort !== null && sort !== void 0 && sort.column === column.name ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dshdb-sort-arrow", "aria-hidden": "true", children: sort.direction === "asc" ? "▲" : "▼" }) : null,
                /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("tbody", { children: [
        range.paddingTop > 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("tr", { className: "dshdb-vpad", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("td", { colSpan: columns.length + 1, style: { height: range.paddingTop } }) }) : null,
        visible.map((row, index) => {
          const rowIndex = range.start + index;
          return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("td", { className: "dshdb-num", children: offset + rowIndex + 1 }),
            columns.map((column, columnIndex) => {
              const value = row[columnIndex] ?? null;
              return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "td",
                {
                  title: formatCell(value),
                  className: cellClass?.(column, value),
                  onClick: onCellClick === void 0 ? void 0 : () => onCellClick(column, value),
                  children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: value === null ? "dshdb-null" : void 0, children: formatCell(value) })
                },
                `${column.name}-${columnIndex}`
              );
            })
          ] }, rowIndex);
        }),
        range.paddingBottom > 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("tr", { className: "dshdb-vpad", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("td", { colSpan: columns.length + 1, style: { height: range.paddingBottom } }) }) : null
      ] })
    ] }),
    menu !== null && headerMenu !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "div",
      {
        className: "dshdb-hmenu",
        role: "menu",
        style: { left: menu.x, top: menu.y },
        onPointerDown: (event) => event.stopPropagation(),
        children: headerMenu(menu.column).map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
}

// src/client/history.ts
var KEY = "dsh-ide-database.history.v1";
var LIMIT = 50;
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
  const text = statement.trim();
  if (text === "") return readHistory(kind);
  const entries = read();
  entries[kind] = [{ statement: text, at: Date.now() }, ...entries[kind].filter((entry) => entry.statement !== text)].slice(
    0,
    LIMIT
  );
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
  const seconds = Math.max(0, Math.round((now - at) / 1e3));
  if (seconds < 60) return "刚刚";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
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
  const push = (kind, text) => atoms.push({ kind, text });
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
  const append = (text, space) => {
    if (pendingNewline) {
      startLine();
    } else if (space && out !== "" && !/\s$/u.test(out)) {
      out += " ";
    }
    out += text;
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

// src/client/colmenu.ts
function columnValues(rows, index) {
  return rows.map((row) => {
    const value = row[index] ?? null;
    return value === null || value === void 0 ? "" : String(value);
  }).join("\n");
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  }
}

// src/client/rowsort.ts
function nextRowSort(current, column) {
  if (current === null || current.column !== column) return { column, direction: "asc" };
  return current.direction === "asc" ? { column, direction: "desc" } : null;
}
function order(left, right) {
  if (typeof left === "number" && typeof right === "number") return left - right;
  if (typeof left === "boolean" && typeof right === "boolean") return Number(left) - Number(right);
  return String(left).localeCompare(String(right), "zh-Hans-CN", { numeric: true, sensitivity: "base" });
}
function sortRows(columns, rows, sort) {
  if (sort === null) return rows;
  const index = columns.findIndex((column) => column.name === sort.column);
  if (index < 0) return rows;
  const factor = sort.direction === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    const a = left[index];
    const b = right[index];
    const aEmpty = a === null || a === void 0;
    const bEmpty = b === null || b === void 0;
    if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
    return factor * order(a, b);
  });
}

// src/client/sqlselection.ts
function pickStatement(value, start, end) {
  if (start !== end) {
    const slice = value.slice(Math.min(start, end), Math.max(start, end));
    if (slice.trim() !== "") return { statement: slice, selected: true };
  }
  return { statement: value, selected: false };
}

// src/client/export.ts
function csvCell(value) {
  const text = formatCell(value);
  if (/[",\r\n]/u.test(text)) return `"${text.replace(/"/gu, '""')}"`;
  return text;
}
function toCsv(columns, rows) {
  const head = columns.map((column) => csvCell(column.name)).join(",");
  const body = rows.map((row) => columns.map((_, index) => csvCell(row[index] ?? null)).join(","));
  return `${[head, ...body].join("\r\n")}\r
`;
}
function toJson(columns, rows) {
  const records = rows.map((row) => {
    const record = {};
    columns.forEach((column, index) => {
      record[column.name] = row[index] ?? null;
    });
    return record;
  });
  return JSON.stringify(records, null, 2);
}
function downloadText(filename, mime, text) {
  const bom = mime.startsWith("text/csv") ? "\uFEFF" : "";
  const blob = new Blob([bom, text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
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

// src/client/ConsoleTab.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
var PAGE_SIZES = [200, 500, 1e3, 2e3, 5e3];
var noTabInfo = () => void 0;
function oneLine(statement) {
  return statement.replace(/\s+/gu, " ").trim();
}
function HistoryPanel(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-history", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-history-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "dshdb-history-title", children: [
        "最近执行 · ",
        props.entries.length
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { size: "sm", variant: "ghost", icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ClearIcon, { size: 12 }), onClick: props.onClear, children: "清空" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "dshdb-history-list", children: props.entries.map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
      "button",
      {
        type: "button",
        className: "dshdb-history-row",
        title: entry.statement,
        onClick: () => props.onPick(entry),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-history-sql", children: oneLine(entry.statement) }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-history-time", children: historyAgo(entry.at) })
        ]
      },
      `${entry.at}-${index}`
    )) })
  ] });
}
function failureText(error) {
  if (error instanceof ApiError) return { message: error.message, ...error.detail ? { detail: error.detail } : {} };
  return { message: error instanceof Error ? error.message : String(error) };
}
function formatCount(value) {
  return value.toLocaleString("en-US");
}
function pageable(statement) {
  const text = statement.trim().replace(/;+\s*$/u, "");
  if (!/^select\b/iu.test(text)) return false;
  if (/;\s*select/iu.test(text)) return false;
  if (/\blimit\b/iu.test(text) || /\brownum\b/iu.test(text) || /\bfetch\s+(first|next)\b/iu.test(text)) return false;
  return true;
}
function wrapPage(dialect, statement, size, page) {
  const text = statement.trim().replace(/;+\s*$/u, "");
  const offset = page * size;
  if (dialect === "oracle" || dialect === "oceanbase-oracle" || dialect === "dameng") {
    return `SELECT * FROM (${text}) dshdb_page OFFSET ${offset} ROWS FETCH NEXT ${size} ROWS ONLY`;
  }
  return `SELECT * FROM (${text}) dshdb_page LIMIT ${size} OFFSET ${offset}`;
}
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
async function queryWithRetry(id, sql, maxRows, allowWrite, stmtKey) {
  return withConnection(id, () => api.query({ id, sql, maxRows, allowWrite, stmtKey }));
}
function KeyGrid({
  keys,
  selectedKey,
  onSelect
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("table", { className: "dshdb-grid", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("tr", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("th", { className: "dshdb-num", children: "#" }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("th", { children: "键" }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("th", { children: "类型" }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("th", { children: "TTL" }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("th", { children: "长度" })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("tbody", { children: keys.map((key, index) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
      "tr",
      {
        "data-active": key.key === selectedKey,
        onClick: () => onSelect(key),
        style: { cursor: "pointer" },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { className: "dshdb-num", children: index + 1 }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { title: key.key, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-mono", children: key.key }) }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tag, { children: key.type }) }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { className: "dshdb-num", children: key.ttl < 0 ? "永久" : `${key.ttl}s` }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("td", { className: "dshdb-num", children: key.size === void 0 ? "" : formatCount(key.size) })
        ]
      },
      key.key
    )) })
  ] });
}
function PagerButton({
  label,
  title,
  onClick,
  disabled
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { type: "button", className: "dshdb-pager-btn", title, "aria-label": title, onClick, disabled, children: label });
}
function ConsoleBody({ initialConnectionId }) {
  const [connections, setConnections] = (0, import_react8.useState)([]);
  const [settings, setSettings] = (0, import_react8.useState)(null);
  const [selectedId, setSelectedId] = (0, import_react8.useState)(initialConnectionId ?? "");
  const [loadError, setLoadError] = (0, import_react8.useState)("");
  const [statement, setStatement] = (0, import_react8.useState)("");
  const [result, setResult] = (0, import_react8.useState)(null);
  const [failure, setFailure] = (0, import_react8.useState)(null);
  const [running, setRunning] = (0, import_react8.useState)(false);
  const [page, setPage] = (0, import_react8.useState)(0);
  const [pageSize, setPageSize] = (0, import_react8.useState)(500);
  const [base, setBase] = (0, import_react8.useState)("");
  const [rowSort, setRowSort] = (0, import_react8.useState)(null);
  const [exportOpen, setExportOpen] = (0, import_react8.useState)(false);
  const [exportNote, setExportNote] = (0, import_react8.useState)("");
  const [pattern, setPattern] = (0, import_react8.useState)("*");
  const [scan, setScan] = (0, import_react8.useState)(null);
  const [scanning, setScanning] = (0, import_react8.useState)(false);
  const [selectedKey, setSelectedKey] = (0, import_react8.useState)("");
  const [value, setValue] = (0, import_react8.useState)(null);
  const [valueError, setValueError] = (0, import_react8.useState)(null);
  const [command, setCommand] = (0, import_react8.useState)("");
  const [commandRunning, setCommandRunning] = (0, import_react8.useState)(false);
  const [commandResult, setCommandResult] = (0, import_react8.useState)(null);
  const [confirm, setConfirm] = (0, import_react8.useState)(null);
  const [history, setHistory] = (0, import_react8.useState)([]);
  const [historyOpen, setHistoryOpen] = (0, import_react8.useState)(false);
  const stmtRef = (0, import_react8.useRef)("");
  const inputRef = (0, import_react8.useRef)(null);
  const [selectedRun, setSelectedRun] = (0, import_react8.useState)(false);
  const [planRunning, setPlanRunning] = (0, import_react8.useState)(false);
  const [plan, setPlan] = (0, import_react8.useState)(null);
  const scanCursorRef = (0, import_react8.useRef)("0");
  const recallRef = (0, import_react8.useRef)(-1);
  const connection = connections.find((item) => item.id === selectedId);
  const isRedis = connection?.dialect === "redis";
  const historyKind = isRedis ? "redis" : "sql";
  const askConfirm = (0, import_react8.useCallback)((message, detail) => {
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
  (0, import_react8.useEffect)(() => {
    let alive = true;
    void (async () => {
      try {
        const status = await api.status();
        if (!alive) return;
        setConnections(status.config.connections);
        setSettings(status.config.settings);
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
  (0, import_react8.useEffect)(() => {
    setHistory(readHistory(historyKind));
    setHistoryOpen(false);
    recallRef.current = -1;
  }, [historyKind]);
  const execute = (0, import_react8.useCallback)(
    async (target) => {
      setRowSort(null);
      const text = target.statement.trim();
      if (text === "" || selectedId === "") return;
      const stmtKey = `console-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      stmtRef.current = stmtKey;
      setRunning(true);
      setPlan(null);
      setFailure(null);
      try {
        const paged = pageable(text);
        const sqlText = paged ? wrapPage(connection?.dialect ?? "mysql", text, target.size, target.page) : text;
        const next = await queryWithRetry(selectedId, sqlText, target.size, target.allowWrite, stmtKey);
        setResult(next);
        setPage(paged ? target.page : 0);
        setBase(paged ? text : "");
      } catch (error) {
        setResult(null);
        setFailure(failureText(error));
      } finally {
        setRunning(false);
      }
    },
    [connection?.dialect, selectedId]
  );
  const run = async () => {
    setExportOpen(false);
    const area = inputRef.current;
    const picked = area === null ? { statement, selected: false } : pickStatement(statement, area.selectionStart, area.selectionEnd);
    const text = picked.statement.trim();
    if (text === "") return;
    setSelectedRun(picked.selected);
    const isWrite = looksLikeWrite(text);
    if (isWrite && settings?.confirmDestructive === true) {
      const ok = await askConfirm("即将执行写语句，可能修改或删除数据。", text);
      if (!ok) return;
    }
    setHistory(pushHistory("sql", text));
    await execute({ statement: text, page: 0, size: pageSize, allowWrite: isWrite });
  };
  const explainPlan = async () => {
    const area = inputRef.current;
    const picked = area === null ? { statement, selected: false } : pickStatement(statement, area.selectionStart, area.selectionEnd);
    const text = picked.statement.trim();
    if (text === "" || selectedId === "" || running) return;
    setPlanRunning(true);
    setFailure(null);
    try {
      const next = await api.explain(selectedId, text);
      setPlan(next);
      setResult(next.plan ?? null);
      setPage(0);
      setBase("");
      if (next.plan === void 0) {
        setFailure({ message: next.warnings.join("；") || "没有返回执行计划", detail: next.statements.join("\n") });
      }
    } catch (error) {
      setPlan(null);
      setResult(null);
      setFailure(failureText(error));
    } finally {
      setPlanRunning(false);
    }
  };
  const recallHistory = (delta) => {
    if (history.length === 0) return;
    const next = Math.min(history.length - 1, Math.max(0, recallRef.current + delta));
    recallRef.current = next;
    setStatement(history[next].statement);
  };
  const pickHistory = (entry) => {
    setStatement(entry.statement);
    setHistoryOpen(false);
  };
  const cancel = async () => {
    if (stmtRef.current === "") return;
    try {
      await api.cancel(stmtRef.current);
    } catch {
    }
  };
  const goPage = (next) => {
    if (base === "") return;
    void execute({ statement: base, page: next, size: pageSize, allowWrite: false });
  };
  const loadKeys = (0, import_react8.useCallback)(
    async (append) => {
      if (selectedId === "") return;
      setScanning(true);
      setValueError(null);
      try {
        const cursor = append ? scanCursorRef.current : "0";
        const next = await withConnection(
          selectedId,
          () => api.redisScan({ id: selectedId, cursor, pattern: pattern.trim() === "" ? "*" : pattern.trim() })
        );
        scanCursorRef.current = next.cursor;
        setScan(
          (previous) => append && previous !== null && next.cursor !== "0" ? { ...next, keys: [...previous.keys, ...next.keys] } : next
        );
      } catch (error) {
        setValueError(failureText(error));
      } finally {
        setScanning(false);
      }
    },
    [pattern, selectedId]
  );
  const runCommand = async () => {
    const text = command.trim();
    if (text === "" || selectedId === "") return;
    const isWrite = looksLikeRedisWrite(text);
    if (isWrite && settings?.confirmDestructive === true) {
      const ok = await askConfirm("即将执行会修改 Redis 数据的命令。", text);
      if (!ok) return;
    }
    setHistory(pushHistory("redis", text));
    setCommandRunning(true);
    setValueError(null);
    try {
      const next = await withConnection(selectedId, () => api.redisCommand(selectedId, text, isWrite && connection?.readOnly !== true));
      setCommandResult(next);
      if (isWrite) await loadKeys(false);
    } catch (error) {
      setValueError(failureText(error));
    } finally {
      setCommandRunning(false);
    }
  };
  const recallCommand = (delta) => {
    if (history.length === 0) return;
    const next = Math.min(history.length - 1, Math.max(0, recallRef.current + delta));
    recallRef.current = next;
    setCommand(history[next].statement);
  };
  const selectKey = async (key) => {
    setSelectedKey(key.key);
    setValue(null);
    setValueError(null);
    if (selectedId === "") return;
    try {
      const next = await withConnection(selectedId, () => api.redisKey(selectedId, key.key));
      setValue(next);
    } catch (error) {
      setValueError(failureText(error));
    }
  };
  (0, import_react8.useEffect)(() => {
    setResult(null);
    setFailure(null);
    setStatement("");
    setBase("");
    setPage(0);
    setScan(null);
    setSelectedKey("");
    setValue(null);
    setValueError(null);
    setCommandResult(null);
    scanCursorRef.current = "0";
  }, [selectedId]);
  (0, import_react8.useEffect)(() => {
    if (selectedId === "" || !isRedis) return;
    void loadKeys(false);
  }, [selectedId, isRedis]);
  if (loadError !== "") {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "dshdb-qtab", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Banner, { tone: "error", children: loadError }) });
  }
  if (connections.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "dshdb-qtab", children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(DatabaseIcon, { size: 22 }),
        title: "还没有数据源",
        description: "先在「数据库」标签页中新增数据源，再回来执行查询。"
      }
    ) });
  }
  const offset = page * pageSize;
  const columns = result?.columns ?? [];
  const rows = result?.rows ?? [];
  const visibleRows = sortRows(columns, rows, rowSort);
  const columnMenu = (column) => {
    const active = rowSort?.column === column.name ? rowSort.direction : null;
    const index = columns.findIndex((item) => item.name === column.name);
    return [
      { label: "按此列升序", disabled: active === "asc", run: () => setRowSort({ column: column.name, direction: "asc" }) },
      { label: "按此列降序", disabled: active === "desc", run: () => setRowSort({ column: column.name, direction: "desc" }) },
      { label: "清除排序", disabled: rowSort === null, run: () => setRowSort(null) },
      { label: `复制列名「${column.name}」`, run: () => void copyText(column.name) },
      {
        label: `复制本列值（${visibleRows.length} 行）`,
        disabled: visibleRows.length === 0 || index < 0,
        run: () => void copyText(columnValues(visibleRows, index))
      }
    ];
  };
  const exportPage = (format) => {
    setExportOpen(false);
    if (visibleRows.length === 0) return;
    const text = format === "csv" ? toCsv(columns, visibleRows) : toJson(columns, visibleRows);
    downloadText(exportFilename("", "console", format), format === "csv" ? "text/csv" : "application/json", text);
    setExportNote(`${format.toUpperCase()} 已导出 ${visibleRows.length} 行`);
    setTimeout(() => setExportNote(""), 5e3);
  };
  const hasPrevious = page > 0;
  const hasNext = result !== null && rows.length >= pageSize;
  const rangeStart = rows.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + rows.length;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-qtab", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-qbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "select",
        {
          className: "dshdb-select dshdb-select-inline dshdb-console-select",
          "aria-label": "数据源",
          value: selectedId,
          onChange: (event) => setSelectedId(event.target.value),
          children: connections.map((item) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("option", { value: item.id, children: [
            item.name,
            " · ",
            item.dialect
          ] }, item.id))
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-qbar-spacer" }),
      running || scanning || commandRunning ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Spinner, {}) : null,
      result !== null && !running ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-qmeta", children: formatMs(result.elapsedMs) }) : null
    ] }),
    isRedis ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
      historyOpen ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        HistoryPanel,
        {
          entries: history,
          onPick: (entry) => {
            setCommand(entry.statement);
            setHistoryOpen(false);
          },
          onClear: () => {
            setHistory(clearHistory("redis"));
            recallRef.current = -1;
          }
        }
      ) : null,
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-qfilter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-qfilter-label", children: "MATCH" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          "input",
          {
            className: "dshdb-input dshdb-qfilter-input dshdb-pattern-input",
            placeholder: "键模式，例如 shop:*",
            value: pattern,
            spellCheck: false,
            onChange: (event) => setPattern(event.target.value),
            onKeyDown: (event) => {
              if (event.key === "Enter") void loadKeys(false);
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { size: "sm", onClick: () => void loadKeys(false), loading: scanning, children: "扫描" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => void loadKeys(true),
            disabled: scan === null || scan.cursor === "0" || scanning,
            children: "继续"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-qmeta", children: scan === null ? "" : `${formatCount(scan.keys.length)} 个键` })
      ] }),
      valueError !== null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(Banner, { tone: "error", onClose: () => setValueError(null), children: [
        valueError.message,
        valueError.detail ? `
${valueError.detail}` : ""
      ] }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "dshdb-grid-wrap", children: scan === null || scan.keys.length === 0 ? scanning ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Spinner, { size: 16 }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-muted", children: "正在扫描键…" })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(EmptyState, { icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(DatabaseIcon, { size: 22 }), title: "没有匹配的键", description: pattern }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(KeyGrid, { keys: scan.keys, selectedKey, onSelect: (key) => void selectKey(key) }) }),
      value !== null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("pre", { className: "dshdb-console-value", title: value.key, children: stringifyJson(value.value) }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-qfilter", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-qfilter-label", children: "命令" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          "input",
          {
            className: "dshdb-input dshdb-qfilter-input dshdb-command-input",
            placeholder: "例如 GET shop:customer:42",
            value: command,
            spellCheck: false,
            onChange: (event) => setCommand(event.target.value),
            onKeyDown: (event) => {
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
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { size: "sm", variant: "ghost", icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ClockIcon, { size: 12 }), onClick: () => setHistoryOpen((open) => !open), disabled: history.length === 0, children: "历史" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { size: "sm", variant: "primary", onClick: () => void runCommand(), loading: commandRunning, children: "执行" })
      ] }),
      commandResult !== null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("pre", { className: "dshdb-console-value", title: commandResult.command, children: stringifyJson(commandResult.value) }) : null
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "textarea",
        {
          className: "dshdb-input dshdb-console-input",
          placeholder: "输入 SQL，Ctrl/⌘ + Enter 执行（有选中内容时只执行选中部分），Ctrl/⌘ + Shift + F 格式化，Ctrl/⌘ + ↑↓ 切换历史",
          ref: inputRef,
          value: statement,
          spellCheck: false,
          onChange: (event) => {
            setSelectedRun(false);
            setStatement(event.target.value);
          },
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void run();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && (event.key === "F" || event.key === "f")) {
              event.preventDefault();
              setStatement((prev) => formatSql(prev));
              return;
            }
            if ((event.ctrlKey || event.metaKey) && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
              event.preventDefault();
              recallHistory(event.key === "ArrowUp" ? 1 : -1);
            }
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-qbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { size: "sm", variant: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PlayIcon, { size: 12 }), onClick: () => void run(), loading: running, title: "有选中内容时只执行选中部分", children: "执行" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { size: "sm", variant: "ghost", icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(StopIcon, { size: 12 }), onClick: () => void cancel(), disabled: !running, children: "取消" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Button, { size: "sm", variant: "ghost", icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ClockIcon, { size: 12 }), onClick: () => setHistoryOpen((open) => !open), disabled: history.length === 0, children: "历史" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => setStatement((prev) => formatSql(prev)),
            disabled: statement.trim() === "",
            title: "整理关键字大小写与换行（Ctrl/⌘ + Shift + F）",
            children: "格式化"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => void explainPlan(),
            loading: planRunning,
            disabled: statement.trim() === "" || running,
            title: "查看当前语句的执行计划（不会真正执行语句）",
            children: "执行计划"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "dshdb-menu-wrap", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
            "button",
            {
              type: "button",
              className: `dshdb-pager-btn${exportOpen ? " dshdb-pager-btn-active" : ""}`,
              title: "导出当前页结果",
              "aria-label": "导出结果",
              "aria-expanded": exportOpen,
              onClick: () => setExportOpen((open) => !open),
              disabled: running || rows.length === 0,
              children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(DownloadIcon, { size: 13 })
            }
          ),
          exportOpen ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "dshdb-menu", role: "menu", children: [
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("button", { type: "button", role: "menuitem", onClick: () => exportPage("csv"), children: [
              "当前页 CSV（",
              visibleRows.length,
              " 行）"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("button", { type: "button", role: "menuitem", onClick: () => exportPage("json"), children: [
              "当前页 JSON（",
              visibleRows.length,
              " 行）"
            ] })
          ] }) : null
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-qbar-spacer" }),
        exportNote !== "" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tag, { tone: "business", children: exportNote }) : null,
        selectedRun ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-qmeta", children: "已执行选中内容" }) : null,
        base !== "" ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-qmeta", children: "可分页查询" }) : null
      ] }),
      historyOpen ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        HistoryPanel,
        {
          entries: history,
          onPick: pickHistory,
          onClear: () => {
            setHistory(clearHistory("sql"));
            recallRef.current = -1;
          }
        }
      ) : null,
      failure !== null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(Banner, { tone: "error", onClose: () => setFailure(null), children: [
        failure.message,
        failure.detail ? `
${failure.detail}` : ""
      ] }) : null,
      result !== null && rows.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        DataGrid,
        {
          columns,
          rows: visibleRows,
          offset,
          storageKey: "console:sql",
          sort: rowSort,
          onSort: (column) => setRowSort((current) => nextRowSort(current, column.name)),
          headerMenu: columnMenu
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className: "dshdb-grid-wrap", children: result === null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        EmptyState,
        {
          icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(TerminalIcon, { size: 22 }),
          title: "等待执行",
          description: "上面的语句会在当前数据源上运行，结果按页展示。"
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        EmptyState,
        {
          icon: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(TerminalIcon, { size: 22 }),
          title: typeof result.updateCount === "number" ? "影响行数" : "没有返回行",
          description: typeof result.updateCount === "number" ? `${formatCount(result.updateCount)} 行受影响` : result.sql
        }
      ) }),
      result !== null && rows.length > 0 ? plan === null ? /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-pager", children: [
        running ? /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tag, { tone: "business", children: "查询中" }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-pager-sql", title: result.sql, children: result.sql }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-pager-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          PagerButton,
          {
            label: "|◀",
            title: "第一页",
            onClick: () => goPage(0),
            disabled: !hasPrevious || running
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          PagerButton,
          {
            label: "◀",
            title: "上一页",
            onClick: () => goPage(Math.max(page - 1, 0)),
            disabled: !hasPrevious || running
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "dshdb-pager-range", children: [
          formatCount(rangeStart),
          "-",
          formatCount(rangeEnd)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          "select",
          {
            className: "dshdb-select dshdb-select-inline dshdb-pager-size",
            "aria-label": "每页行数",
            value: String(pageSize),
            disabled: running,
            onChange: (event) => {
              const size = Number(event.target.value);
              setPageSize(size);
              if (base !== "") void execute({ statement: base, page: 0, size, allowWrite: false });
            },
            children: PAGE_SIZES.map((size) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("option", { value: size, children: formatCount(size) }, size))
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PagerButton, { label: "▶", title: "下一页", onClick: () => goPage(page + 1), disabled: !hasNext || running })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "dshdb-pager", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(Tag, { tone: "business", children: "执行计划" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-pager-sql", title: plan.statements.join("\n"), children: plan.statements[plan.statements.length - 1] ?? result.sql }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { className: "dshdb-pager-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            onClick: () => {
              setPlan(null);
              setResult(null);
            },
            children: "关闭计划"
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ConfirmDialog, { request: confirm?.request ?? null, onConfirm: () => resolveConfirm(true), onCancel: () => resolveConfirm(false) })
  ] });
}
function ConsoleTab(props) {
  const info = (props.useTabInfo ?? noTabInfo)();
  const params = readConsoleTabParams(info?.tab?.navigation?.params) ?? {};
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(ConsoleBody, { initialConnectionId: params.connectionId });
}
function ConsoleTabTitle() {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { className: "dshdb-tabtitle", title: "查询控制台", children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(TerminalIcon, { size: 12 }),
    "控制台"
  ] });
}

// src/client/TableTab.tsx
var import_react9 = require("react");

// src/client/sorting.ts
var SIMPLE_ORDER = /^\s*[`"']?([A-Za-z0-9_$#]+)[`"']?\s*(asc|desc)?\s*$/i;
function parseOrderBy(text) {
  const match = SIMPLE_ORDER.exec(text);
  if (match === null) return void 0;
  const column = match[1] ?? "";
  if (column === "") return void 0;
  return { column, direction: (match[2] ?? "asc").toLowerCase() === "desc" ? "desc" : "asc" };
}
function nextOrderBy(text, column, quoted = column) {
  const current = parseOrderBy(text);
  if (current === void 0 || current.column !== column) return `${quoted} ASC`;
  return current.direction === "asc" ? `${quoted} DESC` : "";
}
function quoteSortColumn(dialect, column) {
  if (dialect === "mysql") return `\`${column.replaceAll("`", "``")}\``;
  return `"${column.replaceAll('"', '""')}"`;
}

// src/client/TableTab.tsx
var import_jsx_runtime11 = require("react/jsx-runtime");
var PAGE_SIZES2 = [100, 200, 500, 1e3, 2e3, 5e3];
var noTabInfo2 = () => void 0;
function failureText2(error) {
  if (error instanceof ApiError) return { message: error.message, ...error.detail ? { detail: error.detail } : {} };
  return { message: error instanceof Error ? error.message : String(error) };
}
function quoteIdent(dialect, name2) {
  return dialect === "mysql" ? `\`${name2}\`` : `"${name2}"`;
}
function qualifiedName(dialect, schema, table) {
  const tableName = quoteIdent(dialect, table);
  return schema === "" ? tableName : `${quoteIdent(dialect, schema)}.${tableName}`;
}
function pageClause(dialect, limit, offset) {
  if (dialect === "oracle" || dialect === "oceanbase-oracle") return `OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
  return `LIMIT ${limit} OFFSET ${offset}`;
}
function stripKeyword(text, keyword) {
  const trimmed = text.trim().replace(/[\s;]+$/u, "");
  if (trimmed === "") return "";
  const pattern = new RegExp(`^${keyword}\\b`, "i");
  return trimmed.replace(pattern, "").trim();
}
function formatCount2(value) {
  return value.toLocaleString("en-US");
}
function isNumericType(typeName) {
  return /^(tiny|small|medium|big)?int|^decimal|^numeric|^float|^double|^number|^real/iu.test(typeName.replace(/[\s(].*$/u, ""));
}
function quoteLiteral(text) {
  return `'${text.replace(/'/gu, "''")}'`;
}
function filterExpression(dialect, column, filter) {
  const name2 = quoteIdent(dialect, column.name);
  if (filter.op === "isnull") return `${name2} IS NULL`;
  const text = filter.text.trim();
  if (text === "") return void 0;
  if (filter.op === "eq") {
    if (isNumericType(column.typeName) && /^-?\d+(?:\.\d+)?$/u.test(text)) return `${name2} = ${text}`;
    return `${name2} = ${quoteLiteral(text)}`;
  }
  return `${name2} LIKE ${quoteLiteral(`%${text}%`)}`;
}
function composeWhere(dialect, base, columns, filters) {
  const parts = [];
  const manual = stripKeyword(base, "WHERE");
  if (manual !== "") parts.push(`(${manual})`);
  for (const column of columns) {
    const filter = filters[column.name];
    if (filter === void 0) continue;
    const expression = filterExpression(dialect, column, filter);
    if (expression !== void 0) parts.push(expression);
  }
  return parts.join(" AND ");
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
  const [connection, setConnection] = (0, import_react9.useState)(null);
  const [columns, setColumns] = (0, import_react9.useState)([]);
  const [rows, setRows] = (0, import_react9.useState)([]);
  const [total, setTotal] = (0, import_react9.useState)(void 0);
  const [elapsed, setElapsed] = (0, import_react9.useState)(void 0);
  const [sqlText, setSqlText] = (0, import_react9.useState)("");
  const [loading, setLoading] = (0, import_react9.useState)(false);
  const [error, setError] = (0, import_react9.useState)(null);
  const [page, setPage] = (0, import_react9.useState)(0);
  const [pageSize, setPageSize] = (0, import_react9.useState)(500);
  const [whereText, setWhereText] = (0, import_react9.useState)("");
  const [orderText, setOrderText] = (0, import_react9.useState)("");
  const [filters, setFilters] = (0, import_react9.useState)({});
  const [filtersOpen, setFiltersOpen] = (0, import_react9.useState)(false);
  const [exportOpen, setExportOpen] = (0, import_react9.useState)(false);
  const [exporting, setExporting] = (0, import_react9.useState)(false);
  const [exportNote, setExportNote] = (0, import_react9.useState)("");
  const applyRef = (0, import_react9.useRef)(() => void 0);
  const load = (0, import_react9.useCallback)(
    async (found, target) => {
      setLoading(true);
      setError(null);
      try {
        const dialect = found.dialect;
        const from = qualifiedName(dialect, params.schema, params.table);
        const where = stripKeyword(target.where, "WHERE");
        const orderBy = stripKeyword(target.orderBy, "ORDER\\s+BY");
        const whereSql = where === "" ? "" : ` WHERE ${where}`;
        const orderSql = orderBy === "" ? "" : ` ORDER BY ${orderBy}`;
        const offset2 = target.page * target.size;
        const pageSql = `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, target.size, offset2)}`;
        const result = await runSql(params.connectionId, pageSql, target.size);
        setColumns(result.columns);
        setRows(result.rows);
        setElapsed(result.elapsedMs);
        setSqlText(result.sql === "" ? pageSql : result.sql);
        setPage(target.page);
        if (target.recount) {
          try {
            const counted = await runSql(params.connectionId, `SELECT COUNT(*) FROM ${from}${whereSql}`, 1);
            const first = counted.rows[0]?.[0];
            const value = typeof first === "number" ? first : Number(first);
            setTotal(Number.isFinite(value) ? value : void 0);
          } catch {
            setTotal(void 0);
          }
        }
      } catch (caught) {
        setError(failureText2(caught));
      } finally {
        setLoading(false);
      }
    },
    [params.connectionId, params.schema, params.table]
  );
  (0, import_react9.useEffect)(() => {
    let cancelled = false;
    setConnection(null);
    setRows([]);
    setColumns([]);
    setTotal(void 0);
    setPage(0);
    setWhereText("");
    setOrderText("");
    setError(null);
    void (async () => {
      try {
        const status = await api.status();
        const found = status.config.connections.find((item) => item.id === params.connectionId);
        if (found === void 0) throw new ApiError("not-found", "该数据源已不存在，请重新连接后再打开数据表");
        if (found.dialect === "redis") throw new ApiError("unsupported", "数据表只能在关系型数据源中打开");
        if (cancelled) return;
        setConnection(found);
        await load(found, { page: 0, size: 500, where: "", orderBy: "", recount: true });
      } catch (caught) {
        if (!cancelled) setError(failureText2(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, params.connectionId]);
  const offset = page * pageSize;
  const activeSort = parseOrderBy(stripKeyword(orderText, "ORDER\\s+BY"));
  const sortTable = (column) => {
    const dialect = connection?.dialect ?? "mysql";
    const next = nextOrderBy(stripKeyword(orderText, "ORDER\\s+BY"), column.name, quoteSortColumn(dialect, column.name));
    setOrderText(next);
    apply2({ orderBy: next, page: 0 });
  };
  const sortBy = (column, direction) => {
    const dialect = connection?.dialect ?? "mysql";
    const next = `${quoteSortColumn(dialect, column.name)} ${direction.toUpperCase()}`;
    setOrderText(next);
    apply2({ orderBy: next, page: 0 });
  };
  const clearSort = () => {
    setOrderText("");
    apply2({ orderBy: "", page: 0 });
  };
  const columnMenu = (column) => {
    const active = activeSort?.column === column.name ? activeSort.direction : null;
    const index = columns.findIndex((item) => item.name === column.name);
    return [
      { label: "按此列升序", disabled: active === "asc", run: () => sortBy(column, "asc") },
      { label: "按此列降序", disabled: active === "desc", run: () => sortBy(column, "desc") },
      { label: "清除排序", disabled: activeSort === void 0, run: clearSort },
      { label: `复制列名「${column.name}」`, run: () => void copyText(column.name) },
      {
        label: `复制本列值（${rows.length} 行）`,
        disabled: rows.length === 0 || index < 0,
        run: () => void copyText(columnValues(rows, index))
      }
    ];
  };
  const hasPrevious = page > 0;
  const lastPage = total === void 0 ? void 0 : Math.max(Math.ceil(total / pageSize) - 1, 0);
  const hasNext = lastPage === void 0 ? rows.length >= pageSize : page < lastPage;
  const rangeStart = rows.length === 0 ? 0 : offset + 1;
  const rangeEnd = offset + rows.length;
  const totalText = total !== void 0 ? `/${formatCount2(total)}` : hasNext ? `/${formatCount2(offset + pageSize)}+` : "";
  const apply2 = (next, override) => {
    if (connection === null) return;
    const manualWhere = next.where ?? whereText;
    void load(connection, {
      page: next.page ?? page,
      size: next.size ?? pageSize,
      where: composeWhere(connection.dialect, manualWhere, columns, override ?? filters),
      orderBy: next.orderBy ?? orderText,
      recount: next.where !== void 0 || next.size !== void 0 || next.page === 0
    });
  };
  applyRef.current = apply2;
  const previousActive = (0, import_react9.useRef)(0);
  (0, import_react9.useEffect)(() => {
    if (!filtersOpen || connection === null) return;
    const active = columns.filter((column) => filters[column.name] !== void 0).length;
    const hadFilters = previousActive.current > 0;
    previousActive.current = active;
    if (active === 0) {
      if (hadFilters) applyRef.current({ page: 0 }, {});
      return;
    }
    const timer = setTimeout(() => applyRef.current({ page: 0 }), 400);
    return () => clearTimeout(timer);
  }, [filters, filtersOpen, connection, columns]);
  const activeFilterCount = columns.filter((column) => filters[column.name] !== void 0).length;
  const setColumnFilter = (column, filter) => {
    setFilters((previous) => {
      const next = { ...previous };
      if (filter === void 0) delete next[column.name];
      else next[column.name] = filter;
      return next;
    });
  };
  const clearFilters = () => {
    setFilters({});
    previousActive.current = 0;
    applyRef.current({ page: 0, where: whereText }, {});
  };
  const EXPORT_LIMIT = 5e4;
  const exportRows = async (format, scope) => {
    if (connection === null) return;
    setExporting(true);
    setExportOpen(false);
    try {
      const dialect = connection.dialect;
      let exportColumns = columns;
      let exportData = rows;
      if (scope === "all") {
        const from = qualifiedName(dialect, params.schema, params.table);
        const where = composeWhere(dialect, whereText, columns, filters);
        const orderBy = stripKeyword(orderText, "ORDERs+BY");
        const whereSql = where === "" ? "" : ` WHERE ${where}`;
        const orderSql = orderBy === "" ? "" : ` ORDER BY ${orderBy}`;
        const batch = 2e3;
        const collected = [];
        let offset2 = 0;
        for (; ; ) {
          const sql = `SELECT * FROM ${from}${whereSql}${orderSql} ${pageClause(dialect, batch, offset2)}`;
          const result = await runSql(params.connectionId, sql, batch);
          if (collected.length === 0) exportColumns = result.columns;
          collected.push(...result.rows);
          if (result.rows.length < batch || collected.length >= EXPORT_LIMIT) break;
          offset2 += batch;
        }
        exportData = collected.slice(0, EXPORT_LIMIT);
      }
      const text = format === "csv" ? toCsv(exportColumns, exportData) : toJson(exportColumns, exportData);
      downloadText(exportFilename(params.schema, params.table, format), format === "csv" ? "text/csv" : "application/json", text);
      setExportNote(`${format.toUpperCase()} 已导出 ${formatCount2(exportData.length)} 行`);
      setTimeout(() => setExportNote(""), 5e3);
    } catch (caught) {
      setError(failureText2(caught));
    } finally {
      setExporting(false);
    }
  };
  if (error !== null && rows.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "dshdb-qtab", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(Banner, { tone: "error", onClose: () => setError(null), children: [
      error.message,
      error.detail ? `
${error.detail}` : ""
    ] }) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "dshdb-qtab", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "dshdb-qbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "dshdb-qtable", title: `${params.schema}.${params.table}`, children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TableIcon, { size: 13 }),
        params.table
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dshdb-qbar-spacer" }),
      loading ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Spinner, {}) : null,
      elapsed !== void 0 && !loading ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dshdb-qmeta", children: formatMs(elapsed) }) : null,
      exportNote !== "" ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Tag, { tone: "business", children: exportNote }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "dshdb-menu-wrap", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
          "button",
          {
            type: "button",
            className: `dshdb-pager-btn${exportOpen ? " dshdb-pager-btn-active" : ""}`,
            title: "导出结果",
            "aria-label": "导出结果",
            "aria-expanded": exportOpen,
            onClick: () => setExportOpen((open) => !open),
            disabled: loading || exporting || rows.length === 0,
            children: exporting ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Spinner, {}) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(DownloadIcon, { size: 13 })
          }
        ),
        exportOpen ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "dshdb-menu", role: "menu", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("button", { type: "button", role: "menuitem", onClick: () => void exportRows("csv", "page"), children: [
            "当前页 CSV（",
            formatCount2(rows.length),
            " 行）"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", role: "menuitem", onClick: () => void exportRows("csv", "all"), children: "全部 CSV" }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", role: "menuitem", onClick: () => void exportRows("json", "all"), children: "全部 JSON" })
        ] }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
        "button",
        {
          type: "button",
          className: `dshdb-pager-btn${filtersOpen ? " dshdb-pager-btn-active" : ""}`,
          title: filtersOpen ? "关闭列筛选" : "按列筛选（也可点击单元格按值筛选）",
          "aria-label": "列筛选",
          "aria-pressed": filtersOpen,
          onClick: () => {
            setFiltersOpen((open) => !open);
          },
          disabled: loading,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(FilterIcon, { size: 13 }),
            activeFilterCount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dshdb-filter-count", children: activeFilterCount }) : null
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "刷新",
          "aria-label": "刷新",
          onClick: () => apply2({}),
          disabled: loading,
          children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(RefreshIcon, { size: 13 })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "dshdb-qfilter", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dshdb-qfilter-label", children: "WHERE" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "input",
        {
          className: "dshdb-input dshdb-qfilter-input",
          placeholder: "过滤条件，例如 ID > 10 AND BCH = '6084'",
          value: whereText,
          spellCheck: false,
          onChange: (event) => setWhereText(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter") apply2({ where: whereText, page: 0 });
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dshdb-qfilter-label", children: "ORDER BY" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "input",
        {
          className: "dshdb-input dshdb-qfilter-input dshdb-qfilter-order",
          placeholder: "排序列，例如 ID DESC",
          value: orderText,
          spellCheck: false,
          onChange: (event) => setOrderText(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter") apply2({ orderBy: orderText, page: 0 });
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-pager-btn",
          title: "应用查询条件",
          "aria-label": "应用查询条件",
          onClick: () => apply2({ where: whereText, orderBy: orderText, page: 0 }),
          disabled: loading,
          children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(PlayIcon, { size: 13 })
        }
      )
    ] }),
    error !== null ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(Banner, { tone: "error", onClose: () => setError(null), children: [
      error.message,
      error.detail ? `
${error.detail}` : ""
    ] }) : null,
    rows.length === 0 && !loading ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "dshdb-grid-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(EmptyState, { icon: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TableIcon, { size: 22 }), title: "没有匹配的行", description: sqlText }) }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      DataGrid,
      {
        columns,
        rows,
        offset,
        storageKey: `table:${params.schema}.${params.table}`,
        sort: activeSort ?? null,
        headerMenu: columnMenu,
        onSort: sortTable,
        headerExtra: filtersOpen ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("tr", { className: "dshdb-filter-row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("th", { className: "dshdb-num" }),
          columns.map((column, index) => {
            const filter = filters[column.name];
            const cleared = filter === void 0 || filter.op !== "isnull" && filter.text.trim() === "";
            return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("th", { children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: `dshdb-filter-box${cleared ? "" : " dshdb-filter-box-active"}`, children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                "input",
                {
                  className: "dshdb-filter-input",
                  placeholder: filter?.op === "isnull" ? "NULL" : "包含…",
                  "aria-label": `筛选 ${column.name}`,
                  title: filter?.op === "isnull" ? "等于 NULL" : `按 ${column.name} 筛选（包含匹配）`,
                  value: filter?.op === "isnull" ? "" : filter?.text ?? "",
                  spellCheck: false,
                  onChange: (event) => {
                    const text = event.target.value;
                    setColumnFilter(column, text === "" ? void 0 : { text, op: "like" });
                  },
                  onKeyDown: (event) => {
                    if (event.key === "Enter") applyRef.current({ page: 0 });
                  }
                }
              ),
              cleared ? null : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                "button",
                {
                  type: "button",
                  className: "dshdb-filter-clear",
                  "aria-label": `清除 ${column.name} 的筛选`,
                  onClick: () => {
                    setColumnFilter(column, void 0);
                    const next = { ...filters };
                    delete next[column.name];
                    applyRef.current({ page: 0 }, next);
                  },
                  children: "×"
                }
              )
            ] }) }, `filter-${column.name}-${index}`);
          })
        ] }) : null,
        cellClass: () => filtersOpen ? "dshdb-cell-filterable" : void 0,
        onCellClick: filtersOpen ? (column, value) => {
          setColumnFilter(column, value === null ? { text: "", op: "isnull" } : { text: formatCell(value), op: "eq" });
        } : void 0
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "dshdb-pager", children: [
      loading ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Tag, { tone: "business", children: "查询中" }) : null,
      sqlText !== "" ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dshdb-pager-sql", title: sqlText, children: sqlText }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dshdb-pager-spacer" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "dshdb-pager-range", title: `${formatCount2(rangeStart)}-${formatCount2(rangeEnd)}`, children: [
        formatCount2(rangeStart),
        "-",
        formatCount2(rangeEnd)
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
        "select",
        {
          className: "dshdb-select dshdb-select-inline dshdb-pager-size",
          "aria-label": "每页行数",
          value: String(pageSize),
          disabled: loading,
          onChange: (event) => {
            const size = Number(event.target.value);
            setPageSize(size);
            apply2({ size, page: 0 });
          },
          children: PAGE_SIZES2.map((size) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { value: size, children: formatCount2(size) }, size))
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { className: "dshdb-pager-total", children: totalText }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
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
    ] })
  ] });
}
function TableTab(props) {
  const info = (props.useTabInfo ?? noTabInfo2)();
  const params = readTableTabParams(info?.tab?.navigation?.params);
  if (params === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TableIcon, { size: 22 }),
        title: "数据表已关闭",
        description: "这个标签页没有记录数据表位置，请在数据树中双击数据表重新打开。"
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TableGrid, { params });
}
function TableTabTitle(props) {
  const info = (props.useTabInfo ?? noTabInfo2)();
  const params = readTableTabParams(info?.tab?.navigation?.params);
  if (params === void 0) return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { children: "数据表" });
  const label = params.table;
  const qualified = params.schema === "" ? params.table : `${params.schema}.${params.table}`;
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "dshdb-tabtitle", title: qualified, children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TableIcon, { size: 12 }),
    label
  ] });
}

// src/client/styles.ts
var CSS = `
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
.dshdb-toolbtn svg { flex: none; color: var(--dsw-alias-label-tertiary); }
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
.dshdb-panel-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
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
}
.dshdb-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
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

.dshdb-grid-wrap {
  min-height: 0;
  overflow: auto;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  flex: 1;
}
.dshdb-grid {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
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
.dshdb-grid.dshdb-grid-sized { table-layout: fixed; width: 100%; }
.dshdb-th-sortable { cursor: pointer; user-select: none; }
.dshdb-th-sortable:hover { color: var(--dsw-alias-label-primary); }
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
.dshdb-grid tr:hover td { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-grid .dshdb-num {
  color: var(--dsw-alias-label-dimmed);
  text-align: right;
  user-select: none;
  width: 1%;
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
  min-width: 190px;
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
.dshdb-history-row:hover { background: var(--dsw-alias-bg-layer-2); }
.dshdb-history-sql { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dshdb-history-time { flex: none; color: var(--dsw-alias-label-tertiary); font-family: inherit; font-size: 10px; }
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
var import_jsx_runtime12 = require("react/jsx-runtime");
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
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(DatabaseIcon, { size: props.size ?? 18 });
}
function DatabaseTabBody(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(App, { ...props });
}
function DatabaseTabChip() {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(DatabaseIcon, { size: 13 }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: TAB_TITLE })
  ] });
}
function TableTabBody(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(TableTab, { ...props });
}
function TableTabChip(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(TableTabTitle, { ...props });
}
function ConsoleTabBody(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ConsoleTab, { ...props });
}
function ConsoleTabChip() {
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(ConsoleTabTitle, {});
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


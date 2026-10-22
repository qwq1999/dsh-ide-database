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
var import_react8 = require("react");

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
  schemas: (id, filter = "") => post("/schema/list", { id, filter }),
  objects: (id, schema) => post("/schema/objects", { id, schema }),
  describe: (id, schema, table, kind) => post("/schema/describe", { id, schema, table, kind }),
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
  return "对象";
}
function stringifyJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
function redisValuePreview(value) {
  if (value === null || value === void 0) return "nil";
  if (typeof value === "string") return value.length > 400 ? `${value.slice(0, 400)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.length} 项]`;
  return stringifyJson(value);
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
function RedisIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3.5", y: "4", width: "17", height: "6", rx: "2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3.5", y: "14", width: "17", height: "6", rx: "2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M7 7h.01M7 17h.01M10 7h6M10 17h6" })
  ] });
}
function PlusIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Svg, { ...props, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 5v14M5 12h14" }) });
}
function RefreshIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Svg, { ...props, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 11a8 8 0 1 0-2.6 5.9" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M20 4v7h-7" })
  ] });
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

// src/client/modals/ConnectionModal.tsx
var import_react2 = require("react");

// src/client/ui.tsx
var import_react = require("react");
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
  (0, import_react.useEffect)(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dshdb-toast", "data-tone": toast.tone, role: "status", children: toast.text });
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

// src/client/views/DataView.tsx
var import_react4 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var CHILD_DEPTH = { "--dshdb-depth": 1 };
function ObjectRow({
  object,
  selected,
  onSelect
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
    "button",
    {
      type: "button",
      className: "dshdb-row",
      "data-active": selected,
      "data-kind": object.kind,
      style: CHILD_DEPTH,
      title: object.comment ? `${object.name} — ${object.comment}` : object.name,
      onClick: onSelect,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-row-toggle" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-row-icon", children: object.kind === "view" ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ViewIcon, { size: 13 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TableIcon, { size: 13 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-row-label", children: object.name }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-row-meta", children: objectKindLabel(object.kind) })
      ]
    }
  );
}
function DataView(props) {
  const [filter, setFilter] = (0, import_react4.useState)("");
  const { connection, server, connecting, schemas, objects, expanded, loadingObjects, detail, detailLoading } = props;
  const normalizedFilter = filter.trim().toLowerCase();
  const visibleSchemas = (0, import_react4.useMemo)(
    () => schemas.filter((schema) => !normalizedFilter || schema.name.toLowerCase().includes(normalizedFilter)),
    [schemas, normalizedFilter]
  );
  if (!connection) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DatabaseIcon, { size: 28 }),
        title: "还没有数据源",
        description: "添加 MySQL、Oracle、达梦、OceanBase 或 Redis 连接，然后在右侧面板里浏览库表、执行 SQL 与命令。",
        actions: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { variant: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(PlusIcon, { size: 13 }), onClick: props.onAddConnection, children: "新建连接" })
      }
    );
  }
  if (connection.dialect === "redis") {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DatabaseIcon, { size: 28 }),
        title: `${connection.name} 是 Redis 连接`,
        description: "Redis 的键浏览与命令控制台在「Redis」标签页中提供。",
        actions: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { variant: "primary", onClick: props.onOpenRedis, children: "打开 Redis 控制台" })
      }
    );
  }
  if (!server) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DatabaseIcon, { size: 28 }),
        title: connecting ? "正在连接…" : "尚未连接",
        description: connecting ? `${connection.host}:${connection.port}` : `连接到 ${connection.host}:${connection.port} 后即可浏览 schema、表和视图。`,
        actions: connecting ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Spinner, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { variant: "primary", onClick: props.onConnect, children: "连接" })
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-view", style: { gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          flex: "none"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-inline", style: { gap: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(StateDot, { tone: "success" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-mono", title: server.url, children: [
              server.product,
              " ",
              server.version
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-grow" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            TextInput,
            {
              value: filter,
              onChange: (event) => setFilter(event.target.value),
              placeholder: "筛选 schema…",
              "aria-label": "筛选 schema",
              style: { width: 120 }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            Button,
            {
              size: "sm",
              variant: "ghost",
              icon: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(RefreshIcon, { size: 13 }),
              onClick: props.onRefreshSchemas,
              "aria-label": "刷新 schema",
              title: "刷新 schema"
            }
          )
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      Panel,
      {
        title: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-inline", children: [
          "Schema",
          props.loadingSchemas ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Spinner, {}) : null
        ] }),
        className: "dshdb-grow",
        bodyClassName: "dshdb-panel-body-pad",
        children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-tree dshdb-scroll-thin", role: "tree", "aria-label": "数据库对象", children: visibleSchemas.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-muted", style: { padding: "8px 6px" }, children: props.loadingSchemas ? "正在加载 schema…" : "没有匹配的 schema" }) : visibleSchemas.map((schema) => {
          const key = `${connection.id}:${schema.name}`;
          const isExpanded = expanded[key] === true;
          const list = objects[key];
          const loading = loadingObjects[key] === true;
          return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
              "button",
              {
                type: "button",
                className: "dshdb-row",
                role: "treeitem",
                "aria-expanded": isExpanded,
                "data-kind": "schema",
                onClick: () => props.onToggleSchema(schema.name),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-row-toggle", children: isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronDownIcon, { size: 12 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronRightIcon, { size: 12 }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-row-icon", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DatabaseIcon, { size: 13 }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-row-label", children: schema.name }),
                  schema.system ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { children: "系统" }) : null,
                  loading ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Spinner, {}) : null
                ]
              }
            ),
            isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { role: "group", children: [
              loading && !list ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 28px" }, children: "正在加载对象…" }) : null,
              (list ?? []).filter(
                (object) => !normalizedFilter || object.name.toLowerCase().includes(normalizedFilter)
              ).length === 0 && !loading ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-muted", style: { padding: "4px 6px 4px 28px" }, children: "没有表或视图" }) : null,
              (list ?? []).filter((object) => !normalizedFilter || object.name.toLowerCase().includes(normalizedFilter)).map((object) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
                ObjectRow,
                {
                  object,
                  selected: props.selectedKey === `${schema.name}.${object.name}`,
                  onSelect: () => props.onSelectObject(schema.name, object)
                },
                object.name
              ))
            ] }) : null
          ] }, schema.name);
        }) })
      }
    ),
    detailLoading ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "dshdb-muted dshdb-inline", style: { padding: 6 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Spinner, {}),
      " 正在读取表结构…"
    ] }) : null,
    !detailLoading && detail ? /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      Panel,
      {
        title: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(TableIcon, { size: 13 }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-mono", children: [
            detail.schema,
            ".",
            detail.table
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Tag, { children: objectKindLabel(detail.kind) })
        ] }),
        actions: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_jsx_runtime5.Fragment, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Button, { size: "sm", onClick: () => props.onQueryObject(detail.schema, { name: detail.table, kind: detail.kind }), children: "查询数据" }) }),
        bodyClassName: "dshdb-panel-body-pad",
        scroll: true,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-grid-wrap", style: { maxHeight: 220 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("table", { className: "dshdb-grid", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { children: "列" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { children: "类型" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { children: "可空" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { children: "默认值" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { children: "注释" })
            ] }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tbody", { children: detail.columns.map((column) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { title: column.name, children: [
                column.name,
                column.primaryKey ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-tag", style: { marginLeft: 6 }, children: "PK" }) : null
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { title: column.typeName, children: column.typeName }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { children: column.nullable === false ? "否" : "是" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { title: column.defaultValue ?? "", children: column.defaultValue ?? "—" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { title: column.comment ?? "", children: column.comment ?? "" })
            ] }, column.name)) })
          ] }) }),
          detail.indexes.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-kv", style: { padding: "8px 0 0" }, children: detail.indexes.map((index) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { style: { display: "contents" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "dshdb-kv-key", children: [
              index.primary ? "主键" : index.unique ? "唯一索引" : "索引",
              " ",
              index.name
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "dshdb-kv-val dshdb-mono", children: index.columns.join(", ") })
          ] }, index.name)) }) : null
        ]
      }
    ) : null,
    !detailLoading && !detail ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "dshdb-muted", style: { padding: "0 2px" }, children: "在上方选择表或视图可查看列、索引等结构信息。" }) : null
  ] });
}

// src/client/views/RedisView.tsx
var import_react5 = require("react");
var import_jsx_runtime6 = require("react/jsx-runtime");
var TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "string", label: "string" },
  { value: "hash", label: "hash" },
  { value: "list", label: "list" },
  { value: "set", label: "set" },
  { value: "zset", label: "zset" },
  { value: "stream", label: "stream" }
];
function errorText3(error) {
  return error instanceof Error ? error.message : String(error);
}
function RedisView(props) {
  const { connection, server, connecting } = props;
  const [pattern, setPattern] = (0, import_react5.useState)("*");
  const [type, setType] = (0, import_react5.useState)("");
  const [keys, setKeys] = (0, import_react5.useState)([]);
  const [cursor, setCursor] = (0, import_react5.useState)("0");
  const [done, setDone] = (0, import_react5.useState)(true);
  const [scanned, setScanned] = (0, import_react5.useState)(0);
  const [scanning, setScanning] = (0, import_react5.useState)(false);
  const [scanError, setScanError] = (0, import_react5.useState)(null);
  const [activeKey, setActiveKey] = (0, import_react5.useState)("");
  const [value, setValue] = (0, import_react5.useState)(null);
  const [valueLoading, setValueLoading] = (0, import_react5.useState)(false);
  const [command, setCommand] = (0, import_react5.useState)("PING");
  const [commandResult, setCommandResult] = (0, import_react5.useState)(null);
  const [commandError, setCommandError] = (0, import_react5.useState)(null);
  const [commandRunning, setCommandRunning] = (0, import_react5.useState)(false);
  async function runScan(reset) {
    if (!connection || connection.dialect !== "redis") return;
    setScanning(true);
    setScanError(null);
    try {
      const result = await api.redisScan({
        id: connection.id,
        cursor: reset ? "0" : cursor,
        pattern: pattern || "*",
        type: type || void 0,
        count: 200
      });
      setKeys((previous) => reset ? result.keys : [...previous, ...result.keys]);
      setCursor(result.cursor);
      setDone(result.done);
      setScanned((previous) => reset ? result.scanned : previous + result.scanned);
    } catch (error) {
      setScanError(errorText3(error));
    } finally {
      setScanning(false);
    }
  }
  async function loadKey(key) {
    if (!connection) return;
    setActiveKey(key);
    setValueLoading(true);
    try {
      setValue(await api.redisKey(connection.id, key));
    } catch (error) {
      props.notify(`读取键失败：${errorText3(error)}`, "error");
      setValue(null);
    } finally {
      setValueLoading(false);
    }
  }
  async function runCommand() {
    if (!connection || command.trim() === "") return;
    const isWrite = looksLikeRedisWrite(command);
    if (isWrite) {
      const ok = await props.askConfirm(
        `即将执行 Redis 命令 ${redisCommandName(command).toUpperCase()}，该命令可能修改数据。`,
        command.trim()
      );
      if (!ok) return;
    }
    setCommandRunning(true);
    setCommandError(null);
    try {
      setCommandResult(await api.redisCommand(connection.id, command.trim(), isWrite));
    } catch (error) {
      setCommandResult(null);
      setCommandError(errorText3(error));
    } finally {
      setCommandRunning(false);
    }
  }
  (0, import_react5.useEffect)(() => {
    setKeys([]);
    setValue(null);
    setActiveKey("");
    setCommandResult(null);
    setCommandError(null);
    setScanError(null);
    setCursor("0");
    setDone(true);
    setScanned(0);
    if (connection && server && connection.dialect === "redis") void runScan(true);
  }, [connection?.id, server]);
  if (!connection) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(RedisIcon, { size: 28 }),
        title: "没有可用的 Redis 连接",
        description: "在数据源管理中新建一个 Redis 连接（默认端口 6379），保存后即可扫描键与执行命令。"
      }
    );
  }
  if (connection.dialect !== "redis") {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(EmptyState, { icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(RedisIcon, { size: 28 }), title: "当前选择的是关系型数据源", description: "Redis 控制台仅适用于 Redis 连接。" });
  }
  if (!server) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(RedisIcon, { size: 28 }),
        title: connecting ? "正在连接…" : "尚未连接",
        description: `连接到 ${connection.host}:${connection.port} 后即可浏览键空间。`,
        actions: connecting ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Spinner, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Button, { variant: "primary", onClick: props.onConnect, children: "连接" })
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dshdb-view", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dshdb-redis-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        TextInput,
        {
          value: pattern,
          onChange: (event) => setPattern(event.target.value),
          placeholder: "键模式，如 user:*",
          "aria-label": "键模式",
          onKeyDown: (event) => {
            if (event.key === "Enter") void runScan(true);
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        Select,
        {
          inline: true,
          "aria-label": "键类型",
          options: TYPE_OPTIONS,
          value: type,
          onValueChange: setType
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        Button,
        {
          size: "sm",
          icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(RefreshIcon, { size: 12 }),
          loading: scanning,
          onClick: () => void runScan(true),
          children: "扫描"
        }
      )
    ] }),
    scanError ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Banner, { tone: "error", children: scanError }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      Panel,
      {
        title: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(KeyIcon, { size: 13 }),
          " 键",
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Tag, { children: keys.length }),
          scanning ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Spinner, {}) : null
        ] }),
        bodyClassName: "dshdb-panel-body-pad",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dshdb-keys dshdb-scroll-thin", children: keys.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dshdb-muted", style: { padding: "6px 4px" }, children: scanning ? "正在扫描…" : scanned > 0 ? "没有匹配的键" : "点击扫描以加载键" }) : keys.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              className: "dshdb-key-row",
              "data-active": activeKey === entry.key,
              title: entry.key,
              onClick: () => void loadKey(entry.key),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dshdb-row-label", children: entry.key }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Tag, { children: entry.type }),
                entry.ttl >= 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dshdb-row-meta", children: [
                  "TTL ",
                  entry.ttl,
                  "s"
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dshdb-row-meta", children: "持久" })
              ]
            },
            entry.key
          )) }),
          !done ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { paddingTop: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Button, { size: "sm", variant: "ghost", onClick: () => void runScan(false), disabled: scanning, children: "加载更多" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dshdb-muted", style: { fontSize: 11, marginLeft: 6 }, children: [
              "cursor ",
              cursor
            ] })
          ] }) : null
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      Panel,
      {
        title: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(RedisIcon, { size: 13 }),
          " 值",
          value ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Tag, { tone: "business", children: value.type }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dshdb-muted dshdb-mono", children: activeKey })
          ] }) : null
        ] }),
        actions: value ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: value.truncated ? "已截断" : `${value.size ?? "?"} 字节` }) : null,
        bodyClassName: "dshdb-panel-body-pad",
        children: valueLoading ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dshdb-muted dshdb-inline", style: { padding: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Spinner, {}),
          " 读取中…"
        ] }) : value ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dshdb-toolbar", style: { marginBottom: 6 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Tag, { children: value.type }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: [
              "TTL ",
              value.ttl >= 0 ? `${value.ttl}s` : "持久"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("pre", { className: "dshdb-json", children: typeof value.value === "string" ? value.value : stringifyJson(value.value) }),
          value.preview && typeof value.value !== "string" && value.preview !== redisValuePreview(value.value) ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dshdb-muted", style: { fontSize: 11, marginTop: 4 }, children: value.preview }) : null
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dshdb-muted", style: { padding: 6 }, children: "选择一个键查看内容。" })
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      Panel,
      {
        title: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dshdb-inline", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TerminalIcon, { size: 13 }),
          " 命令"
        ] }),
        actions: commandResult ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: [
          formatMs(commandResult.elapsedMs),
          commandResult.readOnly ? " · 只读" : " · 写命令"
        ] }) : null,
        bodyClassName: "dshdb-panel-body-pad",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "dshdb-command-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              TextInput,
              {
                value: command,
                spellCheck: false,
                "aria-label": "Redis 命令",
                placeholder: "例如 GET user:1 或 KEYS user:*",
                onChange: (event) => setCommand(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === "Enter") void runCommand();
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Button, { variant: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PlayIcon, { size: 12 }), loading: commandRunning, onClick: () => void runCommand(), children: "执行" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "dshdb-muted", style: { fontSize: 11, marginTop: 4 }, children: "只读命令直接执行；写命令需要二次确认，且只读连接会拒绝。" }),
          commandError ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(Banner, { tone: "error", children: commandError }) }) : null,
          commandResult ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("pre", { className: "dshdb-json", style: { marginTop: 6 }, children: typeof commandResult.value === "string" ? commandResult.value : stringifyJson(commandResult.value) }) : null
        ]
      }
    )
  ] });
}

// src/client/views/SettingsView.tsx
var import_react6 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
function JavaBadge({ env }) {
  const java = env.java;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-kv", style: { padding: 0 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-key", children: "Java" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "dshdb-kv-val dshdb-inline", children: [
      java.available ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "success", children: "可用" }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Tag, { tone: "error", children: "未找到" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-mono", children: java.version ?? java.message ?? "未检测到 Java" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-key", children: "来源" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "dshdb-kv-val dshdb-mono", children: java.source }),
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
  const [draft, setDraft] = (0, import_react6.useState)(props.settings);
  (0, import_react6.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-scroll dshdb-scroll-thin", style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(Panel, { title: "运行环境", bodyClassName: "dshdb-panel-body-pad", children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(JavaBadge, { env: props.env }),
      !props.env.bridgeBuilt ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Banner, { tone: "warn", children: "JDBC 桥接器缺失，SQL 连接将不可用。运行 `npm run build:bridge` 后重试。" }) }) : null,
      !props.env.java.available && presets.some((driver) => driver.needsJava) ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { marginTop: 6 }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Banner, { tone: "warn", children: "未检测到 Java，关系型数据库驱动需要 Java 8 及以上运行环境。" }) }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      Panel,
      {
        title: "查询与安全",
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
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Field, { label: "Java 可执行文件", hint: "留空时自动查找 JAVA_HOME、PATH 与常见 JDK 目录", span: true, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
              TextInput,
              {
                value: draft.javaPath,
                placeholder: "例如 C:\\\\Program Files\\\\Java\\\\jdk-21\\\\bin\\\\java.exe",
                onChange: (event) => update("javaPath", event.target.value)
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
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      Panel,
      {
        title: "预置驱动",
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
    props.downloading !== "" ? /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "dshdb-muted dshdb-inline", style: { fontSize: 11 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Spinner, {}),
      " 正在下载驱动依赖…"
    ] }) : null
  ] });
}

// src/client/views/SqlView.tsx
var import_react7 = require("react");
var import_jsx_runtime8 = require("react/jsx-runtime");
var ROW_OPTIONS = [50, 100, 200, 500, 1e3].map((value) => ({ value: String(value), label: `${value} 行` }));
function SqlView(props) {
  const { connection, server, sql, running, result, error } = props;
  if (!connection) {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      EmptyState,
      {
        icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(DatabaseIcon, { size: 28 }),
        title: "没有可用的 SQL 连接",
        description: "先添加一个 MySQL、Oracle、达梦或 OceanBase 数据源。"
      }
    );
  }
  if (connection.dialect === "redis") {
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(EmptyState, { icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(DatabaseIcon, { size: 28 }), title: "当前选择的是 Redis 连接", description: "SQL 控制台仅支持关系型数据源。" });
  }
  const connected = server !== void 0;
  const showGrid = result !== null && result.columns.length > 0 && result.rows.length > 0;
  const showEmptyResult = result !== null && result.columns.length > 0 && result.rows.length === 0;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-view", children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-toolbar", children: [
      connected ? running ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Button, { variant: "danger", icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(StopIcon, { size: 12 }), onClick: props.onCancel, children: "取消" }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Button, { variant: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PlayIcon, { size: 12 }), onClick: props.onRun, children: "执行" }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Button, { variant: "primary", onClick: props.onConnect, children: "连接" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Button, { variant: "ghost", size: "sm", onClick: props.onClear, children: "清空" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-toolbar-spacer" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-muted dshdb-nowrap", style: { fontSize: 11 }, children: "行数上限" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        Select,
        {
          inline: true,
          "aria-label": "返回行数上限",
          options: ROW_OPTIONS,
          value: String(props.rows),
          disabled: running,
          onValueChange: (value) => props.onRowsChange(Number(value))
        }
      ),
      connection.readOnly ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Tag, { tone: "warn", children: "只读" }) : null
    ] }),
    !connected ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(Banner, { tone: "info", children: [
      "尚未连接 ",
      connection.host,
      ":",
      connection.port,
      "，连接后可执行 SQL（面板与 Agent 工具共用同一连接）。"
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-editor-wrap", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        TextArea,
        {
          className: "dshdb-editor",
          value: sql,
          spellCheck: false,
          placeholder: "输入 SQL，Ctrl+Enter 执行",
          onChange: (event) => props.onSqlChange(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              props.onRun();
            }
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: "Ctrl+Enter 执行 · 写语句执行前会二次确认" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-toolbar-spacer" }),
        running ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "dshdb-muted dshdb-inline", style: { fontSize: 11 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Spinner, {}),
          " 执行中…"
        ] }) : null
      ] })
    ] }),
    error ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(Banner, { tone: "error", children: [
      error.message,
      error.detail ? `
${error.detail}` : ""
    ] }) : null,
    result ? /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-view", style: { minHeight: 0, gap: 4 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "dshdb-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: [
          result.updateCount !== void 0 ? `影响 ${result.updateCount} 行` : `${result.rowCount} 行`,
          " · ",
          formatMs(result.elapsedMs ?? props.elapsedMs)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-toolbar-spacer" }),
        result.truncated ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Tag, { tone: "warn", children: "已截断" }) : null
      ] }),
      result.warnings.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Banner, { tone: "warn", children: result.warnings.join("\n") }) : null,
      showGrid ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "dshdb-grid-wrap", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("table", { className: "dshdb-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("th", { className: "dshdb-num", children: "#" }),
          result.columns.map((column, index) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("th", { title: `${column.name} ${column.typeName}`, children: column.name }, `${column.name}-${index}`))
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("tbody", { children: result.rows.map((row, rowIndex) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("tr", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("td", { className: "dshdb-num", children: rowIndex + 1 }),
          result.columns.map((column, columnIndex) => {
            const value = row[columnIndex] ?? null;
            return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("td", { title: formatCell(value), children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: value === null ? "dshdb-null" : void 0, children: formatCell(value) }) }, `${column.name}-${columnIndex}`);
          })
        ] }, rowIndex)) })
      ] }) }) : null,
      showEmptyResult ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Panel, { title: "结果集为空", bodyClassName: "dshdb-panel-body-pad", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-muted", style: { fontSize: 11 }, children: "查询成功，没有返回任何行。" }) }) : null,
      result.columns.length === 0 && result.updateCount === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(Panel, { title: "执行结果", bodyClassName: "dshdb-panel-body-pad", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-mono", style: { fontSize: 11 }, children: "语句执行成功。" }) }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { className: "dshdb-muted dshdb-mono", style: { fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, title: result.sql, children: result.sql })
    ] }) : null
  ] });
}

// src/client/App.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
var noopTabInfo = () => void 0;
function errorText4(error) {
  return error instanceof Error ? error.message : String(error);
}
function qualifiedName(dialect, schema, table) {
  if (dialect === "mysql") return `\`${schema}\`.\`${table}\``;
  return `"${schema}"."${table}"`;
}
function App(props) {
  const info = (props.useTabInfo ?? noopTabInfo)();
  const hidden = info?.tab?.visible === false;
  const [snapshot, setSnapshot] = (0, import_react8.useState)(null);
  const [loadError, setLoadError] = (0, import_react8.useState)("");
  const [selectedId, setSelectedId] = (0, import_react8.useState)("");
  const [servers, setServers] = (0, import_react8.useState)({});
  const [connectingId, setConnectingId] = (0, import_react8.useState)("");
  const [view, setView] = (0, import_react8.useState)("data");
  const [schemas, setSchemas] = (0, import_react8.useState)({});
  const [objects, setObjects] = (0, import_react8.useState)({});
  const [expanded, setExpanded] = (0, import_react8.useState)({});
  const [loadingSchemas, setLoadingSchemas] = (0, import_react8.useState)(false);
  const [loadingObjects, setLoadingObjects] = (0, import_react8.useState)({});
  const [detail, setDetail] = (0, import_react8.useState)(null);
  const [detailLoading, setDetailLoading] = (0, import_react8.useState)(false);
  const [selectedKey, setSelectedKey] = (0, import_react8.useState)("");
  const [sql, setSql] = (0, import_react8.useState)("SELECT 1");
  const [rows, setRows] = (0, import_react8.useState)(200);
  const [query, setQuery] = (0, import_react8.useState)({ running: false, result: null, error: null });
  const stmtRef = (0, import_react8.useRef)("");
  const [toast, setToast] = (0, import_react8.useState)(null);
  const [savingSettings, setSavingSettings] = (0, import_react8.useState)(false);
  const [downloading, setDownloading] = (0, import_react8.useState)("");
  const [confirm, setConfirm] = (0, import_react8.useState)(null);
  const [connModal, setConnModal] = (0, import_react8.useState)({
    open: false,
    editing: null
  });
  const [driverModal, setDriverModal] = (0, import_react8.useState)({
    open: false,
    editing: null
  });
  const notify = (0, import_react8.useCallback)((text, tone = "info") => {
    setToast({ text, tone, seq: Date.now() });
  }, []);
  const askConfirm = (0, import_react8.useCallback)((message, detail2) => {
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
  const refresh = (0, import_react8.useCallback)(async () => {
    try {
      const data = await api.status();
      setSnapshot({ connections: data.config.connections, drivers: data.drivers, settings: data.config.settings, env: data.env });
      setLoadError("");
    } catch (error) {
      setLoadError(errorText4(error));
    }
  }, []);
  (0, import_react8.useEffect)(() => {
    void refresh();
  }, [refresh]);
  (0, import_react8.useEffect)(() => {
    if (!snapshot) return;
    const exists = snapshot.connections.some((connection) => connection.id === selectedId);
    if (!exists) {
      setSelectedId(snapshot.connections[0]?.id ?? "");
      setServers({});
      setSchemas({});
      setObjects({});
      setDetail(null);
      setSelectedKey("");
    }
  }, [snapshot, selectedId]);
  (0, import_react8.useEffect)(() => {
    setDetail(null);
    setSelectedKey("");
  }, [selectedId]);
  const connections = snapshot?.connections ?? [];
  const selected = connections.find((connection) => connection.id === selectedId);
  const server = selected ? servers[selected.id] : void 0;
  async function loadSchemas(connectionId) {
    setLoadingSchemas(true);
    try {
      const result = await api.schemas(connectionId);
      setSchemas((previous) => ({ ...previous, [connectionId]: result.schemas }));
      setObjects((previous) => {
        const next = { ...previous };
        for (const key of Object.keys(next)) {
          if (key.startsWith(`${connectionId}:`)) delete next[key];
        }
        return next;
      });
    } catch (error) {
      notify(`加载 schema 失败：${errorText4(error)}`, "error");
    } finally {
      setLoadingSchemas(false);
    }
  }
  async function connect(connectionId) {
    const connection = connections.find((item) => item.id === connectionId);
    if (!connection) return;
    setConnectingId(connectionId);
    setQuery({ running: false, result: null, error: null });
    try {
      const connected = await api.connect(connectionId);
      setServers((previous) => ({ ...previous, [connectionId]: connected }));
      notify("连接成功", "success");
      if (connection.dialect === "redis") {
        setView("redis");
      } else {
        await loadSchemas(connectionId);
      }
    } catch (error) {
      notify(`连接失败：${errorText4(error)}`, "error");
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
      notify(`断开失败：${errorText4(error)}`, "error");
    }
  }
  function selectConnection(id) {
    setSelectedId(id);
    const connection = connections.find((item) => item.id === id);
    if (connection?.dialect === "redis") setView("redis");
    else if (view === "redis") setView("data");
  }
  async function toggleSchema(schema) {
    if (!selected) return;
    const key = `${selected.id}:${schema}`;
    const isExpanded = expanded[key] === true;
    setExpanded((previous) => ({ ...previous, [key]: !isExpanded }));
    if (isExpanded || objects[key] !== void 0) return;
    setLoadingObjects((previous) => ({ ...previous, [key]: true }));
    try {
      const result = await api.objects(selected.id, schema);
      setObjects((previous) => ({ ...previous, [key]: result.objects }));
    } catch (error) {
      notify(`加载对象失败：${errorText4(error)}`, "error");
    } finally {
      setLoadingObjects((previous) => ({ ...previous, [key]: false }));
    }
  }
  async function selectObject(schema, object) {
    if (!selected) return;
    setSelectedKey(`${schema}.${object.name}`);
    setDetailLoading(true);
    try {
      const description = await api.describe(selected.id, schema, object.name, object.kind);
      setDetail(description);
    } catch (error) {
      setDetail(null);
      notify(`读取表结构失败：${errorText4(error)}`, "error");
    } finally {
      setDetailLoading(false);
    }
  }
  function queryObject(schema, object) {
    if (!selected) return;
    setSql(`SELECT * FROM ${qualifiedName(selected.dialect, schema, object.name)}`);
    setView("sql");
  }
  async function runSql() {
    if (!selected || !server) {
      notify("请先连接数据源", "error");
      return;
    }
    const text = sql.trim();
    if (text === "") return;
    const isWrite = looksLikeWrite(text);
    if (isWrite && snapshot?.settings.confirmDestructive) {
      const ok = await askConfirm("即将执行写语句，可能修改或删除数据。", text);
      if (!ok) return;
    }
    const stmtKey = `panel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    stmtRef.current = stmtKey;
    setQuery({ running: true, result: null, error: null });
    try {
      const result = await api.query({
        id: selected.id,
        sql: text,
        maxRows: rows,
        stmtKey,
        allowWrite: isWrite
      });
      setQuery({ running: false, result, error: null });
    } catch (error) {
      setQuery({ running: false, result: null, error: { message: errorText4(error) } });
    }
  }
  async function cancelQuery() {
    if (stmtRef.current === "") return;
    try {
      await api.cancel(stmtRef.current);
      notify("已请求取消", "info");
    } catch (error) {
      notify(`取消失败：${errorText4(error)}`, "error");
    }
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
      notify(`保存设置失败：${errorText4(error)}`, "error");
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
      notify(`下载失败：${errorText4(error)}`, "error");
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
      notify(`删除失败：${errorText4(error)}`, "error");
    }
  }
  async function deleteConnection(connection) {
    const ok = await askConfirm(`删除连接「${connection.name}」？保存的密码也会一并删除。`);
    if (!ok) return;
    try {
      await api.deleteConnection(connection.id);
      setConnModal({ open: false, editing: null });
      notify("连接已删除", "success");
      await refresh();
    } catch (error) {
      notify(`删除失败：${errorText4(error)}`, "error");
    }
  }
  const statusStyle = {
    display: hidden ? "none" : "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0
  };
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-root", style: statusStyle, "data-plugin-route": ROUTE_PREFIX, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("header", { className: "dshdb-topbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-topbar-title", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(DatabaseIcon, { size: 16 }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: "数据库" }),
        selected ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Tag, { tone: server ? "success" : void 0, children: DIALECT_LABEL[selected.dialect] }),
          selected.readOnly ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Tag, { tone: "warn", children: "只读" }) : null
        ] }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-topbar-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          IconButton,
          {
            label: "新建连接",
            icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PlusIcon, { size: 14 }),
            onClick: () => setConnModal({ open: true, editing: null })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          IconButton,
          {
            label: "刷新",
            icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(RefreshIcon, { size: 14 }),
            onClick: () => void refresh()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          IconButton,
          {
            label: "设置",
            icon: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(SettingsIcon, { size: 14 }),
            onClick: () => setView("settings")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-connbar", role: "tablist", "aria-label": "数据源", children: [
      connections.map((connection) => /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": selectedId === connection.id,
          className: "dshdb-chip",
          "data-active": selectedId === connection.id,
          title: `${connection.name} · ${connection.host}:${connection.port}`,
          onClick: () => selectConnection(connection.id),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StateDot, { tone: servers[connection.id] ? "success" : connection.dialect === "redis" ? "business" : "idle" }),
            /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dshdb-chip-name", children: connection.name })
          ]
        },
        connection.id
      )),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          type: "button",
          className: "dshdb-chip",
          onClick: () => setConnModal({ open: true, editing: null }),
          "aria-label": "新建连接",
          title: "新建连接",
          style: { width: 26, justifyContent: "center", padding: 0 },
          children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PlusIcon, { size: 13 })
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dshdb-tabs", role: "tablist", "aria-label": "视图", children: [
      ["data", "数据"],
      ["sql", "SQL"],
      ["redis", "Redis"],
      ["settings", "设置"]
    ].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "button",
      {
        type: "button",
        role: "tab",
        "aria-selected": view === key,
        className: "dshdb-tab",
        "data-active": view === key,
        onClick: () => setView(key),
        children: label
      },
      key
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("main", { className: "dshdb-main", children: [
      loadError ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: "dshdb-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(Banner, { tone: "error", children: [
        "加载插件状态失败：",
        loadError
      ] }) }) : null,
      !snapshot && !loadError ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "dshdb-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Spinner, { size: 18 }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dshdb-muted", children: "正在加载数据源…" })
      ] }) : null,
      snapshot ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "div",
          {
            className: "dshdb-view",
            style: { display: view === "data" ? "flex" : "none", padding: "8px 10px 12px", minHeight: 0 },
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              DataView,
              {
                connection: selected,
                server,
                connecting: connectingId === selectedId,
                schemas: selected ? schemas[selected.id] ?? [] : [],
                objects,
                expanded,
                loadingSchemas,
                loadingObjects,
                detail,
                detailLoading,
                selectedKey,
                onAddConnection: () => setConnModal({ open: true, editing: null }),
                onConnect: () => {
                  if (selected) void connect(selected.id);
                },
                onRefreshSchemas: () => {
                  if (selected) void loadSchemas(selected.id);
                },
                onToggleSchema: (schema) => void toggleSchema(schema),
                onSelectObject: (schema, object) => void selectObject(schema, object),
                onQueryObject: (schema, object) => queryObject(schema, object),
                onOpenRedis: () => setView("redis")
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "div",
          {
            className: "dshdb-view",
            style: { display: view === "sql" ? "flex" : "none", padding: "8px 10px 12px", minHeight: 0 },
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              SqlView,
              {
                connection: selected,
                server,
                sql,
                onSqlChange: setSql,
                running: query.running,
                result: query.result,
                error: query.error,
                elapsedMs: query.result?.elapsedMs,
                rows,
                onRowsChange: setRows,
                onRun: () => void runSql(),
                onCancel: () => void cancelQuery(),
                onConnect: () => {
                  if (selected) void connect(selected.id);
                },
                onClear: () => setSql("")
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "div",
          {
            className: "dshdb-view",
            style: { display: view === "redis" ? "flex" : "none", padding: "8px 10px 12px", minHeight: 0 },
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              RedisView,
              {
                connection: selected,
                server,
                connecting: connectingId === selectedId,
                onConnect: () => {
                  if (selected) void connect(selected.id);
                },
                askConfirm,
                notify
              }
            )
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "div",
          {
            className: "dshdb-view",
            style: { display: view === "settings" ? "flex" : "none", padding: "8px 10px 12px", minHeight: 0 },
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              SettingsView,
              {
                settings: snapshot.settings,
                env: snapshot.env,
                drivers: snapshot.drivers,
                saving: savingSettings,
                downloading,
                onSave: (next) => void saveSettings(next),
                onRefresh: () => void refresh(),
                onDownload: (driverId) => void downloadDriver(driverId),
                onAddCustomDriver: () => setDriverModal({ open: true, editing: null }),
                onEditCustomDriver: (driver) => setDriverModal({ open: true, editing: driver }),
                onDeleteCustomDriver: (driver) => void deleteCustomDriver(driver)
              }
            )
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("footer", { className: "dshdb-statusbar", children: [
      selected ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StateDot, { tone: server ? "success" : connectingId === selectedId ? "warn" : "idle" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { title: selected.name, children: selected.name }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: "·" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "dshdb-mono", children: [
          selected.host,
          ":",
          selected.port
        ] }),
        selected.database ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: "dshdb-mono", children: [
          "/",
          selected.database
        ] }) : null,
        server ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Button, { size: "sm", variant: "ghost", onClick: () => void disconnect(selected.id), children: "断开" }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          Button,
          {
            size: "sm",
            variant: "ghost",
            loading: connectingId === selected.id,
            onClick: () => void connect(selected.id),
            children: "连接"
          }
        )
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { children: "尚未选择数据源" }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: "dshdb-statusbar-spacer" }),
      snapshot ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { title: snapshot.env.configPath, children: [
        "Java ",
        snapshot.env.java.available ? snapshot.env.java.version ?? "可用" : "未找到",
        " · v",
        snapshot.env.pluginVersion
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      DriverModal,
      {
        open: driverModal.open,
        editing: driverModal.editing,
        onClose: () => setDriverModal({ open: false, editing: null }),
        onSaved: (drivers) => setSnapshot((previous) => previous ? { ...previous, drivers } : previous),
        notify
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(ConfirmDialog, { request: confirm?.request ?? null, onConfirm: () => resolveConfirm(true), onCancel: () => resolveConfirm(false) }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(Toast, { toast, onDismiss: () => setToast(null) })
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

.dshdb-topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 6px;
  flex: none;
}
.dshdb-topbar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.dshdb-topbar-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshdb-topbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: none;
}

.dshdb-connbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 0 10px 8px;
  flex: none;
}
.dshdb-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px;
  flex: none;
  max-width: 180px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.dshdb-chip:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}
.dshdb-chip[data-active="true"] {
  border-color: var(--dsw-alias-state-business-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);
  color: var(--dsw-alias-label-primary);
}
.dshdb-chip[data-active="true"] .dshdb-chip-name { font-weight: 500; }
.dshdb-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.dshdb-tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 10px 8px;
  flex: none;
}
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
.dshdb-row[data-active="true"] { background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-button-primary-label, var(--dsw-alias-label-primary)); }
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
.dshdb-row-icon { flex: none; color: var(--dsw-alias-label-tertiary); }
.dshdb-row[data-kind="view"] .dshdb-row-icon { color: var(--dsw-alias-state-business-secondary, var(--dsw-alias-label-tertiary)); }

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
  background: var(--dsw-alias-bg-layer-2);
  border-bottom: 0.5px solid var(--dsw-alias-border-l2);
  padding: 4px 8px;
  text-align: left;
  color: var(--dsw-alias-label-secondary);
  font-weight: 500;
  white-space: nowrap;
}
.dshdb-grid td {
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  padding: 3px 8px;
  color: var(--dsw-alias-label-primary);
  white-space: nowrap;
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dshdb-grid tr:hover td { background: var(--dsw-alias-interactive-bg-hover); }
.dshdb-grid .dshdb-num {
  color: var(--dsw-alias-label-dimmed);
  text-align: right;
  user-select: none;
  width: 1%;
}
.dshdb-null { color: var(--dsw-alias-label-dimmed); font-style: italic; }
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
  .dshdb-btn, .dshdb-chip, .dshdb-tab, .dshdb-switch, .dshdb-switch::after { transition: none; }
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

.dshdb-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 1300;
  max-width: min(480px, 86vw);
  padding: 7px 12px;
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-2));
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-elevation-panel);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.dshdb-toast[data-tone="error"] { color: var(--dsw-alias-state-error-primary); }

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
var import_jsx_runtime10 = require("react/jsx-runtime");
var PLUGIN_ID = "dsh-ide-database";
var TAB_ID = "dsh-ide-database/database";
var TAB_KIND = "database";
var TAB_TITLE = "数据库";
function GuideIcon(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(DatabaseIcon, { size: props.size ?? 18 });
}
function DatabaseTabBody(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(App, { ...props });
}
var name = PLUGIN_ID;
var inject = ["slots"];
function apply(ctx) {
  ctx.effect(() => {
    return injectStyles();
  }, "dsh-ide-database: styles");
  ctx.inject(["sidebarRightTabs"], (host) => {
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
      host.slots.inject("sidebar.right.pane.tab", () => {
        host.slots.register({ name: "sidebar.right.pane.tab", key: TAB_ID }, DatabaseTabBody);
      });
    }, "dsh-ide-database: native right sidebar tab");
  });
}

    return module.exports;
  },
});


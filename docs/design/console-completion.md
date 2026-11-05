# 控制台 SQL 补全重构方案

> 状态：P0 基础版已实现并接入（新引擎 `src/client/completion/`，旧 `sqlcontext.ts` 已移除）；P1/P2 持续优化见第 8 节。
> 范围：控制台 SQL 编辑器的补全候选（Redis 命令补全不在本方案内，仍由 `rediscommands.ts` 负责）

## 1. 背景

现在的补全由三块拼成：

- `src/client/complete.ts`：关键字/函数名单、`matchScore` 排序、`wordAtCaret`、`qualifierBefore`、`applyCompletion`。
- `src/client/sqlcontext.ts`：一个轻量扫描器，回答「语句提到哪些表/别名」和「光标处更像表还是列」。
- `src/client/ConsoleTab.tsx` 的 `openSuggestions`：自己拼候选（`schema.objects` 的表 + 当前 Schema 列表 + 已引用表的列 + 关键字 + 函数），用 `completionCandidates` 前缀过滤。

问题很集中：

1. **候选不分语境**：`FROM` 后面跟关键字、函数、列；`SELECT` 后面关键字和函数常常排在列前面。用户要按很多次方向键才能找到表名/列名。
2. **语句理解浅**：只认光标前的 `FROM/JOIN/UPDATE/INTO`，不认 INSERT 的列清单、子查询别名、CTE；多表列不区分归属，`alias.` 之外的限定符处理靠猜。
3. **没有方言概念**：所有连接共用一套关键字和函数；Oracle 的 `NVL/TO_DATE` 与 MySQL 的 `IFNULL/LIMIT` 混在一起。
4. **排序策略单一**：只有「前缀 / 词界 / 子序列」，没有「当前语境下的类型优先级」，也不记录最近使用。
5. **异步没有取消**：快速输入时多次 `openSuggestions` 竞争，旧请求可能覆盖新结果。
6. **不可测试的耦合**：候选组装写在 2801 行的 `ConsoleTab.tsx` 里，只能靠渲染测试覆盖。

## 2. 目标与非目标

**目标（P0 基础版）**

- 按光标位置推断「期望的 token」：关系名、列名、Schema、别名、关键字、函数；只给该位置有意义的候选。
- 支持真实的常用写法：多表 `FROM a, b` / `JOIN`、`AS`/裸别名、`schema.table`、`alias.`、`INSERT INTO t (col…)`、`UPDATE t SET …`、`SELECT` 列表。
- 排序按「匹配质量 → 语境类型优先级 → 最近使用 → 原顺序」，关键字/函数不再淹没表名和列名。
- 词法与上下文分析是纯函数、可单测；元数据通过注入的 `CompletionCatalog` 获取，异步可取消。
- 保留现有 UX：Ctrl+Space、输入后自动弹出、上下键/Enter/Tab/Esc、aria、空状态；Redis 控制台完全不受影响。

**非目标（P0 明确不做）**

- 完整 SQL 语法解析/校验，失败语句也要能补全（容错优先）。
- 值级补全、日期函数参数提示、跨连接元数据聚合。
- 学习型排序（P2 再考虑本地频次统计）。
- 修改宿主接口；P0 复用现有 `/objects`、`/describe`，后续再加批量元数据接口。

## 3. 架构

新的客户端模块目录 `src/client/completion/`（破坏性重构，旧 `sqlcontext.ts` 删除）：

```
src/client/completion/
├── types.ts        公共类型 + CompletionCatalog 接口
├── tokenizer.ts    容错词法分析（引号标识符、字符串、数字、注释、参数、位置）
├── context.ts      语句级上下文：语句切分、关系与别名、子句、期望、限定符解析
├── keywords.ts     关键字集合（按子句分组）与方言函数集
├── providers.ts    候选生成：列 / 表 / Schema / 别名 / 关键字 / 函数
├── rank.ts         匹配评分、类型优先级、去重、截断
├── engine.ts       编排：analyze → providers → rank；异步取消与降级
└── edit.ts         文本替换（wordAtCaret / qualifierBefore / applyCompletion）
```

`src/client/complete.ts` 降级为兼容门面：重导出 `Completion`、`applyCompletion`、`wordAtCaret` 等既有导出，内部实现挪进 `completion/`；`completionCandidates`、`matchScore`、`SQL_KEYWORDS`、`SQL_FUNCTIONS` 的旧实现删除（被 `rank.ts` / `keywords.ts` 取代）。

### 3.1 类型契约（`completion/types.ts`）

```ts
import type { ClientConnection } from '../../shared/types'

export type CompletionKind = 'table' | 'schema' | 'column' | 'keyword' | 'function' | 'alias'

export interface Completion {
  name: string
  kind: CompletionKind
  /** 右侧提示，例如列类型、函数签名摘要 */
  detail?: string
  /** 实际插入文本（默认用 name），例如 `COUNT(` */
  insert?: string
}

export interface CompletionRelation {
  schema?: string
  table: string
  alias?: string
}

export type CompletionExpectation = 'relation' | 'column' | 'schema' | 'alias' | 'keyword' | 'any'

export interface Analysis {
  /** 当前语句（最后一条以 ; 分隔的语句），已把注释/字符串遮掉 */
  masked: string
  /** 光标所在的语句文本（未遮罩，用于替换词） */
  statement: string
  relations: CompletionRelation[]
  expectation: CompletionExpectation
  /** 已输入限定符链，如 `['shop','orders']`；空数组表示没有 `.` */
  qualifier: string[]
  /** 光标处标识符信息（前缀、起始位置、引号） */
  word: WordAtCaret
}

export interface CompletionCatalog {
  /** 当前连接可见的 Schema 名 */
  schemas(): Promise<readonly string[]>
  /** 某个 Schema 下的表/视图 */
  tables(schema: string): Promise<readonly { name: string; kind: 'table' | 'view' }[]>
  /** 某张表的列 */
  columns(schema: string, table: string): Promise<readonly { name: string; typeName?: string }[]>
}

export interface CompletionRequest {
  statement: string
  caret: number
  dialect: ClientConnection['dialect']
  /** 控制台当前选中的 Schema（默认 Schema） */
  schema: string
  catalog: CompletionCatalog
  /** 取消信号：快速输入时旧请求作废 */
  signal?: AbortSignal
}

export interface CompletionResult {
  items: Completion[]
  /** 光标处的语境，便于 UI/测试断言 */
  analysis: Analysis
}
```

`CompletionCatalog` 由 `ConsoleTab` 的适配器实现（内部封装 `api.objects` / `api.describe` + 缓存 + in-flight 去重），引擎不直接碰网络。

### 3.2 词法（`tokenizer.ts`）

```ts
export type TokenKind = 'ident' | 'keyword' | 'string' | 'number' | 'punct' | 'param'

export interface Token {
  kind: TokenKind
  /** 原始文本（ident 去掉引号；keyword 保留原始大小写） */
  text: string
  /** 小写化文本，便于比较 */
  lower: string
  start: number
  end: number
  /** 被引号包起来的标识符（"x"、`x`、[x]） */
  quoted?: boolean
}

export function tokenize(text: string): Token[]
```

容忍未闭合字符串/注释/引号；注释直接跳过；`--`、`/* */`；单引号字符串（含 `''` 转义）；标识符字符集 `[\\p{L}\\p{N}_$]`；`::`、`:=` 等双字符运算符按 punct 逐字符输出即可（P0 不依赖）。

### 3.3 上下文（`context.ts`）

```ts
export function analyze(statement: string, caret: number): Analysis
```

规则：

- 按 `;` 切语句，只看光标所在语句；光标前的注释/字符串用空格遮罩，长度不变。
- 关系收集：`FROM` 后逗号列表、每个 `JOIN`、`UPDATE`、`INSERT INTO`、`DELETE FROM`；`schema.table`；`AS alias` 或裸别名（遇到保留字停止）；子查询 `(SELECT …) x` 记 alias、无 table（P0 不展开列）。
- 期望判定（从光标向前扫描最近关键字）：
  - `FROM/JOIN/INTO`（INSERT/UPDATE 的 INTO）/`TABLE` → `relation`
  - `SELECT/WHERE/ON/HAVING/GROUP BY/ORDER BY/SET/VALUES/RETURNING/USING` 或这些子句里 `,`/`(` 之后 → `column`
  - `INSERT INTO t (` → 期望 `column`，并把 `t` 作为限定关系
  - `USE`/`CREATE/DROP` 等 DDL 之后 → `schema`（P0 仅 `USE` 与 `CREATE/DROP` 对象名相关语境）
  - 其余 → `any`
- 限定符：光标前若为 `a.` 或 `a.b.`，解析 `['a']` / `['a','b']`；在 `context.ts` 中同时给出「限定符解析结果」：
  - `a.`：先按别名/表名匹配 `relations`；否则当作 Schema（`schema` 期望的表列表）。
  - `a.b.`：`a` 当 Schema、`b` 当表 → 列。
- 与现有 `ConsoleTab` 行为保持：`orders.`、`shop.orders.`、`u.` 都要正确。

### 3.4 关键字与函数（`keywords.ts`）

```ts
export function keywordCompletions(context: CompletionExpectation, dialect: ClientConnection['dialect']): Completion[]
export function functionCompletions(dialect: ClientConnection['dialect']): Completion[]
```

- 关键字按语境分组：语句开头（SELECT/INSERT/UPDATE/DELETE/WITH/EXPLAIN…）、关系后（WHERE/JOIN/ON/GROUP/ORDER/HAVING/LIMIT…）、表达式内（AND/OR/NOT/CASE/WHEN…）等；`relation` 语境只给少量可接关键字（如 `WHERE` 不出现在 FROM 后）。
- 方言函数：mysql / oracle / oceanbase-oracle / dameng / postgres / sqlserver / sqlite 各自补充（P0 先覆盖 mysql、oracle、dameng、postgres，其余回退通用集）。函数名大写、`insert` 带左括号。

### 3.5 候选与排序（`providers.ts` / `rank.ts`）

优先级（数字越小越靠前）：

| 期望 | 候选类型顺序 |
| --- | --- |
| relation | 别名 < 当前 Schema 表/视图 < 其他 Schema 名 < 关键字 |
| column | 已引用关系的列 < `*` < 函数 < 关键字 |
| schema | Schema 名 < 关键字 |
| alias | 当前语句别名 < 表/视图 |
| any | 列 < 表 < Schema < 关键字 < 函数 |

`rank.ts`：

```ts
export interface RankedCandidate extends Completion { score: number }
export function rank(candidates: readonly Completion[], prefix: string, limit = 60): Completion[]
```

`matchScore`（与原实现一致，保留 0/1/2 三档）+ 类型优先级权重（100 的倍数）+ 最近使用（P1 接本地频次，P0 预留参数）。

### 3.6 引擎（`engine.ts`）

```ts
export async function complete(request: CompletionRequest): Promise<CompletionResult>
```

流程：`analyze` → 按期望和限定符取候选：
- `relation`：`catalog.tables(currentSchema)` + `catalog.schemas()` + 别名 + 关键字。
- `column` + 无限定符：`relations` 的列（并行、最多 6 个关系）→ 列；再 `*`、函数、关键字。
- `column` + `a.`：`relations` 里别名/表名匹配则取该表列；否则当 Schema，给该 Schema 的表。
- `column` + `a.b.`：`a` 当 Schema，`b` 当表，取列。
- `schema`：`catalog.schemas()`。
- `any`：当前 Schema 表 + Schema + 关键字 + 函数。
所有 catalog 异常静默降级（返回已拿到的候选），不让补全弹错误。
`signal` 取消时抛 `AbortError`（`DOMException`），ConsoleTab 忽略过期结果。

### 3.7 文本替换（`edit.ts`）

保留现有 `wordAtCaret`、`qualifierBefore`、`applyCompletion` 逻辑与测试语义，仅移动文件；`complete.ts` 重导出以兼容现有测试 import。

## 4. 破坏性变更清单

- 删除 `src/client/sqlcontext.ts` 与 `tests/unit/sqlcontext.test.mjs`（等价能力由 `completion/context.ts` + `tests/unit/completion-context.test.mjs` 覆盖）。
- `src/client/complete.ts`：只保留重导出（`Completion` 类型、`keywordCompletions`、`functionCompletions`、`wordAtCaret`、`qualifierBefore`、`applyCompletion`）；删除 `completionCandidates`/`matchScore`/`SQL_KEYWORDS`/`SQL_FUNCTIONS` 旧实现（新位置在 `completion/`）。现有 `complete.test.mjs` 中针对被删函数的用例迁移到 `tests/unit/completion-rank.test.mjs`。
- `ConsoleTab.tsx`：删除 `loadSchemaCompletions` / `loadColumnCompletions` / `openSuggestions` 的内联组装与 `completionCandidates` 前缀过滤；改为 `runCompletion()`（生成请求 id + AbortController），弹出层渲染 `suggestionItems`（引擎结果）。`suggestionPrefix` 仅用于显示/空状态，不再本地过滤。
- 弹层 UI：`suggestionItems` 直接来自引擎（已 ranked/capped），不再在渲染期做 `completionCandidates`；露出 `alias` 类型文案「别名」。
- 现有集成测试 `console-complete-context.test.tsx` 按新行为调整（断言在 WHERE 后能拿到列、`o.` 别名列、`crat` 子序列、`COUNT(` 插入）；其余按名称查找的测试保持不动。

## 5. 测试计划（P0）

- `tests/unit/completion-tokenizer.test.mjs`：引号标识符、注释、字符串转义、未闭合容错、中文标识符、参数。
- `tests/unit/completion-context.test.mjs`：FROM/JOIN/逗号列表、别名、UPDATE/INSERT/DELETE、`INSERT INTO t (`、子查询别名、注释/字符串遮罩、语句切分、期望、限定符。
- `tests/unit/completion-rank.test.mjs`：前缀/词界/子序列、类型优先级、去重、截断、空前缀。
- `tests/unit/completion-engine.test.mjs`：各期望的候选集合、`a.`/`a.b.`、无元数据降级、`signal` 取消。
- `tests/unit/console-completion-integration.test.tsx`（jsdom，P0 末补）：WHERE 列、`alias.` 列、FROM 表、Schema 限定、INSERT 列清单、过期请求不覆盖。
- 回归：现有 `complete.test.mjs`（迁移后）、`console-complete.test.tsx`、`console-complete-columns/keyword/context`、`console-autocomplete`、`redis` 补全测试全绿。

## 6. 持续优化路线（P1/P2）

- **P1 语境增强**：CTE（`WITH x AS (…)`）列、子查询列展开、`INSERT INTO t (…)` 只给列、`ON` 条件给两端列、JOIN 关系推荐、`SELECT *` 展开、方言关键字/函数全集、snippet（`SELECT … FROM … WHERE …`）。
- **P2 体验与性能**：最近使用/频次本地排序、值级补全（日期/枚举）、批量元数据接口（`/completion/metadata`）+ 客户端 LRU、大小写策略、补全启动耗时与候选数量指标（仅本地 console.debug，不上报）。
- **P3 工程质量**：性能基准（首屏候选 < 16 ms、缓存命中 < 2 ms）、端到端用例、CI 中的 completion 专项测试。

### 实现进度

- 已完成：P0 全部；P1 的 CTE 与派生表列推断（`WITH x AS (…)`、`WITH RECURSIVE`、显式列清单 `x(a, b)`、`(SELECT …) alias`，`x.` / `d.` 直接给推断列且不查元数据）、`INSERT INTO t (…)` 列清单、`ON` 条件两端列；P2 的补全元数据负缓存（读失败的库 / 表在会话内记住，不再每次弹窗重试）。
- 待办：P1 的 `SELECT *` 展开、JOIN 关系推荐、方言关键字 / 函数全集、snippet；P2 的最近使用排序、值级补全、批量元数据接口、大小写策略、指标；P3 全部。
- 每轮完成一项后在此处勾掉，并在提交信息里注明对应用户可见变化。

## 7. 验收标准（P0）

1. `npm run verify` 全绿（含新增 completion 测试）；`npm run build:client` 成功。
2. `FROM ` 后只优先出现表/视图；`WHERE ` 后优先出现已引用表的列（JS 与类型提示可见）；`o.` 只出现该别名对应表的列；`shop.` 出现该 Schema 的表。
3. 连续快速输入不出现旧请求覆盖新结果（AbortController + 请求 id）。
4. Redis 控制台补全与结果表格等无关功能无回归。
5. 本文件更新为「已实现」并附实现说明；README「补全」条目同步。

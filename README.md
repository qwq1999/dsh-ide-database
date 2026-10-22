# dsh-ide-database

DeepSeek Harness（DSH）的 JetBrains Database 风格数据源插件：右侧边栏的数据库工具窗，以及一组供 Agent 查询/操作数据库的工具。

支持 MySQL、Oracle、Redis、达梦 DM、OceanBase（MySQL / Oracle 两种模式），也可以配置任意自定义 JDBC 驱动。

![数据源树](docs/screenshots/database-tree.png)

![SQL 查询控制台](docs/screenshots/database-console.png)

## 功能

- **右侧边栏入口**：在右侧边栏的「+」新标签页菜单里选择「数据库」，或在 Guide 页点击「数据库」胶囊；标签页会保持挂载，切换会话不丢状态。
- **预设数据源**：MySQL、OceanBase（MySQL / Oracle 模式）、Oracle、达梦 DM、Redis，新建连接时自动带出默认端口、驱动类和 URL 模板。
- **自定义驱动**：填写驱动名、方言、驱动类、URL 模板和 Maven 坐标（可多个 jar），点击下载即可从 Maven Central / 阿里云镜像拉取并缓存，无需手动放置 jar。
- **数据浏览**：仿 JetBrains Database 工具窗口——工具栏「新增 / 刷新 / 删除 / 控制台 / 设置」左对齐，下方是所有数据源 → Schema → 表 / 视图 / 例程 / 序列 / 触发器 的树，每类按文件夹分组并显示数量；选中表在下方显示列、默认值、主键、索引与注释，右上角的「DDL」按钮弹出该表的建表语句。
- **结构缓存**：连接过一次后，Schema、对象清单与表结构（列 / 键 / 索引）会写入插件数据目录的 `structure.json`；之后即使不连接（数据库下线、断网、只想离线看结构）也能展开浏览缓存的树，再次连接时自动用最新结构覆盖，离线状态在树上有明确标注。
- **表下钻**：树里展开表即可看到「列 / 键 / 索引」三个分组——列带类型与主键标记，键与索引带所属列，不用点开详情面板就能看清结构。
- **双击打开数据表**：树里双击表或视图，会在右侧栏新开一个数据表标签页分页浏览数据（标签页标题是表名，正文顶部显示 `schema.table`）；顶部 `WHERE` / `ORDER BY` 输入框回车即生效，底栏显示实际执行的 SQL、当前区间、总行数与翻页按钮，每页 50 / 100 / 200 / 500 / 1000 行可切，同一张表可重复打开互不影响。
- **列筛选**：数据表标签页的漏斗按钮打开列筛选行，每列一个输入框，输入即按 `LIKE` 过滤（回车立即生效，400ms 自动刷新）；开着筛选行时点任意单元格可按该值精确筛选，点 NULL 单元格筛 `IS NULL`，筛选条件与顶部手写 `WHERE` 用 `AND` 组合，生效的筛选项数显示在漏斗徽标上，逐列 × 或再次收起即可恢复。
- **结果导出**：数据表标签页的下载按钮导出 CSV（当前页 / 全部）与 JSON（全部）。CSV 带 UTF-8 BOM、遇逗号引号换行自动加引号，Excel 直接打开不乱码；JSON 保留数字与 `null` 类型。导出内容与当前 `WHERE`、列筛选条件一致，分页抓取，单次上限 5 万行。
- **大结果集虚拟滚动**：数据表与 SQL 控制台的网格只渲染可视区域加少量缓冲行（超过 200 行自动启用），500 / 2000 行一页也只保留几十个 `<tr>`，滚动条长度与行号仍是真实数据；表头 sticky、行高固定 22px，翻页或换页后自动回到顶部。
- **列宽可调**：拖动表头分隔线调整列宽，双击分隔线恢复自动列宽；宽度按「数据表 / SQL 控制台」分别记在浏览器本地，重开标签页或刷新后仍然生效。所有列加起来超过面板宽度时，网格可以横向滚动。
- **查询控制台**：工具栏的「控制台」按钮会在右侧栏新开一个查询标签页（可同时开多个）。SQL 模式支持多行编辑、`Ctrl+Enter` 执行、取消、行数上限、耗时与分页（把单条 `SELECT` 包成 `LIMIT/OFFSET` 或 `OFFSET … FETCH`）；写语句执行前二次确认，只读连接永远拒绝写。切到 Redis 数据源时变成键表格（键 / 类型 / TTL / 长度）+ 选中键的值面板 + 命令框，写命令二次确认、危险命令（`FLUSHALL` 等）始终拒绝。
- **执行历史**：控制台会记住最近执行过的 50 条 SQL / Redis 命令（存在浏览器本地，刷新和重开控制台都还在）。「历史」按钮展开列表，点一条即回填到编辑器；SQL 编辑器里 `Ctrl/⌘ + ↑ / ↓` 直接翻历史，Redis 命令框用 `↑ / ↓`，重复的语句会提到最前而不是堆叠。
- **SQL 格式化**：查询控制台的「格式化」按钮（或 `Ctrl/⌘ + Shift + F`）会把关键字统一大写，按 `SELECT / FROM / WHERE / GROUP BY / ORDER BY / LIMIT` 等子句换行并缩进子查询；字符串、反引号标识符、`--` 与 `/* */` 注释里的内容一概不动。
- **DDL**：详情面板右上角「DDL」按钮展示建表/建视图语句；MySQL 走 `SHOW CREATE`，Oracle/达梦走 `DBMS_METADATA.GET_DDL`，服务器取不到时按缓存的列与索引重建，并在弹窗底部注明来源。
- **Agent 工具**：15 个 `db_*` 工具，Agent 可新增 / 编辑 / 删除 / 刷新数据源，列出连接、测试连通性、浏览 Schema、查看表结构、执行 SQL/EXPLAIN、读取 Redis 键与执行命令、下载缺失驱动。写操作默认关闭，需显式开启 `allowAgentWrites`；删除数据源必须显式 `confirm: true`。
- **密码不进配置文件**：密码单独存放在插件数据目录的 `secrets.json`（base64 + 0600 权限，Windows 下继承 profile ACL），API 与日志只返回 `hasPassword` 和秘密名。
- **遵循 DSH 官方视觉规范**：只消费 `--dsw-alias-*` / `--dsw-radius-*` 等语义 token，自动适配深色主题；布局使用标准面板、标签、开关与模态组件。

![展开表查看列、键与索引](docs/screenshots/database-columns.png)

![双击表打开分页查询标签页](docs/screenshots/database-table-tab.png)

![按城市列筛选 customers](docs/screenshots/database-filters.png)

![导出筛选结果](docs/screenshots/database-export.png)

![600 行结果滚动到中段](docs/screenshots/database-virtual.png)

![拖动调整列宽](docs/screenshots/database-column-widths.png)

![查询控制台历史](docs/screenshots/database-history.png)

![SQL 格式化](docs/screenshots/database-format.png)

![表结构 DDL](docs/screenshots/database-ddl.png)

![结构缓存：断开后仍可浏览](docs/screenshots/database-cache.png)

![Redis 控制台](docs/screenshots/redis.png)

![设置：运行环境、驱动与安全开关](docs/screenshots/database-settings.png)

## 运行要求

- DeepSeek Harness `>= 0.1.6-alpha.2`（当前在 0.2.1 上开发验证）。
- 关系型数据库需要本机可用的 Java（`JAVA_HOME`、`PATH` 或「设置 → Java 路径」显式指定），**Java 8+** 即可；驱动与桥接 jar 都按 Java 8 字节码编译。
- 首次使用某个预设驱动时需要联网下载 jar（可在设置中切换 Maven 中央仓库 / 阿里云镜像）。
- Redis 走纯 JS 客户端，不需要 Java。

## 安装

### 安装到 DSH 桌面版（profile `desktop`）

```bash
dsh plugin --profile desktop add link:E:\ai-code-space\dsh-ide-database
```

或安装发布版包：

```bash
dsh plugin --profile desktop add dsh-ide-database
```

也可以在 DSH 的「设置 → 插件」页面选择从本地目录/包名安装。安装完成后 **重启 DSH**（宿主半插件在进程启动时加载），在任意会话打开右侧边栏 → 「+」→「数据库」。

> `dsh plugin` 只是把包写进 profile 的依赖与 `dsh.profile.bundles`，不会热加载宿主代码；客户端部分会随 Web 资源热更新，但为了避免半加载状态，建议整体重启。

### 开发模式（本仓库）

```bash
npm install
npm run build          # 编译 Java 桥接、宿主 TS、浏览器 bundle
npm test               # 单元测试
```

本地调试可以用一个独立的 Web profile 启动第二个 DSH 实例：

```bash
export DSH_HOME=~/.dsh-dev
export DSH_PROFILE=dbweb
dsh --profile dbweb --from-default-profile web --dump-config   # 首次创建 profile
dsh plugin --profile dbweb add link:E:\ai-code-space\dsh-ide-database
dsh --profile dbweb --port 16402 --no-open
```

## 快速开始

1. 打开右侧边栏，点「+」→「数据库」，或从 Guide 页进入。
2. 点右上角「+」新建连接，选择驱动（如 MySQL），填写主机、端口、用户名、密码和数据库。
3. 首次连接会提示下载驱动：确认后从 Maven 仓库下载并缓存到插件数据目录。
4. 连接成功后，左侧出现 Schema 列表；点表查看列/索引，双击表生成预览 SQL。
5. 在 `SQL` 标签里写语句，`Ctrl+Enter` 执行；`Redis` 标签用于 Redis 连接。

### 预置驱动

| 驱动 | 方言 | 默认端口 | 驱动类 | jar 坐标 |
| --- | --- | --- | --- | --- |
| MySQL | MySQL | 3306 | `com.mysql.cj.jdbc.Driver` | `com.mysql:mysql-connector-j:8.4.0` |
| OceanBase（MySQL 模式） | MySQL | 2881 | `com.mysql.cj.jdbc.Driver` | `com.mysql:mysql-connector-j:8.4.0` |
| OceanBase（Oracle 模式） | OceanBase Oracle | 2881 | `com.oceanbase.jdbc.Driver` | `com.oceanbase:oceanbase-client:2.4.19` |
| Oracle | Oracle | 1521 | `oracle.jdbc.OracleDriver` | `com.oracle.database.jdbc:ojdbc8:23.26.3.0.0` |
| 达梦 DM | 达梦 | 5236 | `dm.jdbc.driver.DmDriver` | `com.dameng:DmJdbcDriver18:8.1.3.140` |
| Redis | Redis | 6379 | — | 不需要驱动 |

URL 模板支持 `{{host}}`、`{{port}}`、`{{database}}`、`{{user}}` 占位符；连接表单里的「额外 JDBC 参数」会作为 Properties 传给驱动（每行一个 `key=value`）。

### 自定义驱动

「设置 → 自定义驱动 → 新建」填写：

- 名称、方言（MySQL / Oracle / 达梦 / OceanBase-Oracle / 通用 JDBC）
- 驱动类，例如 `org.postgresql.Driver`
- URL 模板，例如 `jdbc:postgresql://{{host}}:{{port}}/{{database}}`
- jar 的 Maven 坐标（`group:artifact:version`，可多个），保存后点「下载」。

下载使用 Maven 仓库的 `.sha1` 校验（存在时），文件写入 `drivers/` 目录。

## Agent 工具

| 工具 | 用途 |
| --- | --- |
| `db_list_connections` | 列出已配置连接、设置与驱动状态；Agent 可用连接 id 或名称引用 |
| `db_create_connection` | 新增数据源（密码写入 secret store）；默认值来自预设，可不带 host/port |
| `db_update_connection` | 编辑已保存的数据源；只改传入的字段，`clearPassword` 清空密码 |
| `db_delete_connection` | 删除数据源并断开连接、清理结构缓存；必须显式 `confirm: true` |
| `db_refresh_connection` | 重连并重新拉取 Schema 到结构缓存（Redis 为重连） |
| `db_test_connection` | 测试保存的连接或临时草稿（不落盘） |
| `db_list_databases` | 列出 Schema/数据库（MySQL 列库，Oracle/达梦列 Schema） |
| `db_list_objects` | 列出指定 Schema 下的表、视图、例程、序列与触发器 |
| `db_describe_table` | 列、类型、可空、主键、索引、注释 |
| `db_query` | 执行单条 SQL；默认只读，`allowAgentWrites` 开启后才允许写 |
| `db_explain` | MySQL `EXPLAIN`、Oracle/达梦执行计划 |
| `db_redis_scan` | 游标 SCAN，返回键名/类型/TTL |
| `db_redis_get` | 读取键详情（自动识别类型，限制大小） |
| `db_redis_command` | 执行 Redis 命令；写命令受 `allowAgentWrites` 与只读连接限制 |
| `db_download_driver` | 下载缺失的预置驱动 jar |

写保护规则：

1. 只读连接永远拒绝写语句/写命令。
2. 非只读连接默认也只允许读；必须在「设置」中打开 `allowAgentWrites`。
3. Redis 危险命令（`FLUSHALL`/`FLUSHDB`/`SHUTDOWN` 等）始终拒绝。
4. 面板里的写操作需要二次确认（`confirmDestructive` 默认开启）。

## 数据与配置

数据目录优先级：

1. `DSH_IDE_DATABASE_DATA` 环境变量（显式覆盖，便于测试/多实例）
2. `<DSH_HOME>/profiles/<DSH_PROFILE>/data/dsh-ide-database/`
3. `<DSH_PROFILE_DIR>/data/dsh-ide-database/`
4. `~/.dsh/data/dsh-ide-database/`

目录内容：

| 文件 | 说明 |
| --- | --- |
| `connections.json` | 连接与自定义驱动配置、插件设置（不含密码） |
| `secrets.json` | 密码（base64 编码，`0600` 权限） |
| `drivers/*.jar` | 缓存的 JDBC 驱动 |
| `logs/` | 预留日志目录 |

环境变量 `DSH_IDE_DATABASE_DATA` 也可用于在隔离目录中做 UI 验收。

## 安全说明

- 密码只存储在插件私有文件中，HTTP API 永不回传；同名环境变量优先于存储值（变量名见 `secrets.json` 的键，形如 `DSH_IDE_DB_<连接ID>`）。
- 本地 HTTP 接口只接受 POST，并校验 DSH 的会话 cookie / Origin / `sec-fetch-site`，跨站请求会被拒绝。
- 所有 SQL 经 JDBC 桥接进程执行，驱动以独立的 `URLClassLoader` 加载；桥接进程与 Node 宿主通过 JSON-lines 通信，取消查询使用 `Statement.cancel()`。
- Agent 写操作默认关闭；建议生产库使用只读账号或开启「只读连接」。

## 限制

- SQL Server / PostgreSQL 等未内置预设，可通过「自定义驱动」接入。
- 不提供 SSH 隧道、数据库导出/导入、执行计划可视化（仅表格）。
- 单次只执行一条语句（`;` 分隔的多语句会被驱动拒绝或只执行首条，按驱动行为）。
- Oracle 仅 thin 模式，不支持 thick（OCI）模式。
- Redis 命令白名单以只读命令 + 常用写命令为主，未覆盖的命令请通过 `db_redis_command` 的完整命令参数使用（仍受只读/危险命令限制）。

## 开发

```bash
npm run build:bridge   # javac --release 8（JDK 8 用 -source/-target 8）→ bridge/dsh-db-bridge.jar
npm run build:host     # tsc → lib/
npm run build:client   # esbuild → lib/client.js（window.__ModuleLoader__ 格式）
npm run typecheck
npm test               # vitest：host 单元测试 + 客户端工具函数
```

### 真实数据库集成测试

```bash
docker run -d --name dshdb-mysql -e MYSQL_ROOT_PASSWORD=testpass -e MYSQL_DATABASE=app -p 13306:3306 mysql:8.0
docker run -d --name dshdb-redis -p 16379:6379 redis:7-alpine

DSH_TEST_MYSQL_PORT=13306 DSH_TEST_REDIS_PORT=16379 npx vitest run tests/integration/mysql.test.mjs
```

集成测试会真实下载 MySQL 驱动、连接数据库、执行查询并验证 Agent 工具。

### 浏览器验收

在一个独立的 DSH Web 实例上运行：

```bash
DSH_TEST_TOKEN=<token> PLAYWRIGHT_CHROMIUM_PATH=<chromium> node scripts/qa-live.mjs
```

## License

MIT

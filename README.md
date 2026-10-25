# dsh-ide-database

DeepSeek Harness（DSH）的 JetBrains Database 风格数据源插件：右侧边栏的数据库工具窗，以及一组供 Agent 查询/操作数据库的工具。

支持 MySQL、Oracle、Redis、达梦 DM、OceanBase（MySQL / Oracle 两种模式），也可以配置任意自定义 JDBC 驱动。

![数据源树](docs/screenshots/database-tree.png)

![SQL 查询控制台](docs/screenshots/database-console.png)

## 功能

- **右侧边栏入口**：在右侧边栏的「+」新标签页菜单里选择「数据库」，或在 Guide 页点击「数据库」胶囊；标签页会保持挂载，切换会话不丢状态。
- **预设数据源**：MySQL、OceanBase（MySQL / Oracle 模式）、Oracle、达梦 DM、Redis，新建连接时自动带出默认端口、驱动类和 URL 模板。
- **自定义驱动**：填写驱动名、方言、驱动类、URL 模板和 Maven 坐标（可多个 jar），点击下载即可从 Maven Central / 阿里云镜像拉取并缓存，无需手动放置 jar。
- **数据浏览**：仿 JetBrains Database 工具窗口——工具栏「新增 / 刷新 / 删除 / 控制台 / 设置」左对齐，下方是所有数据源 → Schema → 表 / 视图 / 例程 / 序列 / 触发器 的树，每类按文件夹分组并显示数量（表里还能继续展开「列 / 键 / 索引」），单个分组对象很多时先列前 200 个、点「显示剩余 N 个」继续展开；选中表在下方显示列、默认值、主键、索引与注释，右上角的「DDL」按钮弹出该表的建表语句；对象上右键还有「打开数据 / 查看 DDL / 复制名称 / 复制限定名」菜单；选中函数、存储过程、触发器或序列时，下方直接展示服务器返回的定义。
- **Redis 键空间**：Redis 连接按「数据源 → `db{库号}`（可展开/收起）→ 键」浏览，每个逻辑库独立分页扫描、各自「加载更多键」，筛选框会自动扫描匹配的键，旁边的类型下拉可以只看 string / list / set / hash / zset / stream（Redis 6 起由 SCAN TYPE 在服务端过滤），点键在下方直接看值（表格化返回 hash / list / set / zset，string 原样展示；string 里存的是 JSON 对象/数组时自动缩进成块，方便直接读配置），值面板上方可一键复制键名或完整值，也能点刷新重新读一次这个键）。行尾可以勾选要展示的逻辑库（默认只展示连接配置里的库，范围为 Redis 的 `databases` 数量）；未连接或未打开过时行尾显示「连接」按钮，连上自动加载 Schema / 键空间，断线后仍可用缓存浏览。
- **结构缓存**：连接过一次后，Schema、对象清单、表结构（列 / 键 / 索引）以及 Redis 的逻辑库数量和各库键清单会写入插件数据目录的 `structure.json`；之后即使不连接（数据库下线、断网、只想离线看结构）也能展开浏览缓存的树，再次连接时自动用最新结构覆盖，离线状态在树上有明确标注。
- **表下钻**：树里展开表即可看到「列 / 键 / 索引」三个分组——列带类型与主键标记，键与索引带所属列，不用点开详情面板就能看清结构。
- **双击打开数据表**：树里双击表或视图，会在右侧栏新开一个数据表标签页分页浏览数据（标签页标题是表名，正文顶部显示 `schema.table`）；顶部 `WHERE` / `ORDER BY` 输入框回车即生效，底栏显示实际执行的 SQL、当前区间、总行数与翻页按钮（页码输入框回车可直接跳到某一页，超出范围会落到最后一页；刷新会重算总行数，当前页已经不存在时自动退到最后一页），每页 50 / 100 / 200 / 500 / 1000 行可切，同一张表可重复打开互不影响；工具栏的表格按钮可以直接弹出这张表的建表语句（可一键复制），不用回到树里找；右上角的「自动刷新」可选每 5 / 10 / 30 秒重查当前页（上一次还没返回时会跳过这一拍）；没有数据时按有没有查询条件分别提示「这张表还没有数据」或「没有匹配的行」。
- **列筛选**：数据表标签页的漏斗按钮打开列筛选行，每列一个输入框，输入即按 `LIKE` 过滤（回车立即生效，400ms 自动刷新）；开着筛选行时点任意单元格可按该值精确筛选，点 NULL 单元格筛 `IS NULL`，筛选条件与顶部手写 `WHERE` 用 `AND` 组合，生效的筛选项数显示在漏斗徽标上，逐列 × 或再次收起即可恢复。
- **结果导出**：数据表标签页的下载按钮导出 CSV、JSON、SQL 或 Markdown，都可以选「当前页」或「全部」。CSV 带 UTF-8 BOM、遇逗号引号换行自动加引号，Excel 直接打开不乱码；也可以「复制当前页 Markdown」直接贴进文档或 PR；JSON 保留数字与 `null` 类型；SQL 按方言加引号并转义字面量；Markdown 直接贴进文档或 issue（单元格里的竖线与换行会自动转义）。导出内容与当前 `WHERE`、列筛选条件一致，分页抓取，单次上限 5 万行；抓取过程中底栏出现「取消」，点了就不再继续取、也不会生成文件。菜单最后的「整表脚本（建表 + 数据）」会把建表语句和全部数据合成一个可直接执行的 `.sql` 文件，换环境时不用再分开导出。
- **转到控制台**：数据表标签页工具栏的终端按钮会用当前表名、`WHERE`、`ORDER BY` 和每页行数拼好一条 `SELECT`，在新开的查询控制台标签页里打开（只填进编辑器，不会自动执行）；想改写成 JOIN、加聚合或看执行计划时不用再手抄表名。在单元格上右键选「在控制台按该值查询」，会带上 `列 = 值`（数字不加引号、文本按方言转义、NULL 用 `IS NULL`）在新控制台里打开，用来在大表里追一条记录很方便。
- **查看完整值**：网格里的单元格只占一行，双击任意单元格（或右键菜单「查看完整值」）会在弹层里展开全部内容——存的是 JSON 对象/数组时自动缩进成多行，长文本按原样保留换行，弹层底部可一键复制，`Esc` 关闭。
- **右键复制**：结果网格的单元格右键可以复制单元格值、整行（制表符分隔，粘进表格软件就是一行），控制台与数据表标签页都能「复制 INSERT 语句」（控制台按当前语句里的表名推断，`SELECT 1` 这类没有目标表的语句菜单项不可用）——按当前方言给表名、列名加引号，`NULL` 原样、数字与布尔按类型输出、字符串转义单引号，拿来就能执行或改一改再执行。
- **大结果集虚拟滚动**：数据表与 SQL 控制台的网格只渲染可视区域加少量缓冲行（超过 200 行自动启用），500 / 2000 行一页也只保留几十个 `<tr>`，滚动条长度与行号仍是真实数据；表头 sticky、行高固定 22px，翻页或换页后自动回到顶部。
- **筛选自动展开与高亮**：树顶部输入筛选词时，命中项所在的路径会自动展开——数据源、schema、表/视图/例程等分组逐级打开，必要时按需拉取未展开 schema 的对象列表（输入停顿 200ms 才开始匹配，连续打字不会反复整树重绘）；命中的文字片段以浅色底标记，未加载过结构的数据源保持可见，方便直接连接。
- **列宽与列序**：拖动表头分隔线按像素调整列宽，双击分隔线恢复自动列宽；直接左右拖动表头可以调整列的显示顺序，列多了用触摸板双指滑动或 Shift+滚轮横向滚动。列宽按「数据表 / SQL 控制台」分别记在浏览器本地；排序后导出、复制整行都按当前列序。不想看的列可以右键表头「隐藏列」，同一菜单里的「显示全部列」能一次恢复，「只看这一列」则把其余列一次收起（被隐藏的列不会因为结果变化而丢失，重开标签页仍是这个视图）；隐藏只是视图，导出和复制整行仍包含它们。
- **点表头排序**：点数据表标签页的列头会在「升序 → 降序 → 不排序」之间循环，排序直接写进 `ORDER BY` 输入框交给数据库执行，翻页时顺序保持一致；当前排序列的列头显示箭头，输入框里自己写的其它排序不受影响，清空 `ORDER BY` 即回到默认顺序。
- **查询控制台**：工具栏的「控制台」按钮会在右侧栏新开一个查询标签页（可同时开多个）。数据源下拉旁还可以切换「数据库 / Schema」（Redis 则是逻辑库 `dbN`）：选定后 SQL 不用再写库名前缀，Redis 的键扫描、取值和命令都落在该逻辑库。SQL 模式支持多行编辑、`Ctrl+Enter` 执行（有选中内容时只跑选中部分，否则按脚本顺序执行）、`Ctrl/⌘ + Shift + Enter` 只执行光标所在的那条语句、`Ctrl/⌘ + ↑↓` 回看历史语句（↓ 到底回到正在输入的内容）、取消、行数上限、耗时与分页（把单条 `SELECT` 包成 `LIMIT/OFFSET` 或 `OFFSET … FETCH`，`SELECT … INTO` 与 `FOR UPDATE` 这类会赋值或加锁的查询不会被包，只在第一页按原样执行，每页 200–5000 行可选，页码输入框回车可直接跳到某一页，也可以选「全部」一次取回，单次上限 5000 行）；结果被行数上限截断时工具栏会提示「结果已截断」；写语句执行前二次确认（`WITH ... DELETE` 这类 CTE 前缀的写语句也一样），只读连接永远拒绝写。切到 Redis 数据源时变成键表格（键 / 类型 / TTL / 长度；点表头「键」可按名称升序/倒序/恢复扫描顺序，TTL 按秒/分/小时/天缩写，悬停可看精确秒数）+ 选中键的值面板（键名旁的按钮可直接复制完整键名）+ 命令框（↑/↓ 回看已执行过的命令，↓ 到底回到正在输入的内容），写命令二次确认、危险命令（`FLUSHALL` 等）始终拒绝。
- **历史收藏**：历史列表里每条语句右侧的星标可以把语句收藏起来，收藏项固定显示在列表顶部的「收藏」分组，最多 20 条；「清空」只清最近执行，不会删掉收藏。收藏按 SQL / Redis 分别保存在浏览器本地，重开控制台仍在。
- **执行历史**：控制台会记住最近执行过的 50 条 SQL / Redis 命令（存在浏览器本地，刷新和重开控制台都还在）。「历史」按钮展开列表，点一条即回填到编辑器；列表超过 5 条时顶部出现搜索框，按关键字过滤（收藏和最近执行一起过滤）；SQL 编辑器里 `Ctrl/⌘ + ↑ / ↓` 直接翻历史，Redis 命令框用 `↑ / ↓`，重复的语句会提到最前而不是堆叠。
- **只执行选中内容**：在 SQL 编辑器里选中一段语句再执行，就只跑选中部分（多语句脚本里挑一句跑很顺手），没选中时仍然执行全文；控制台会提示「已执行选中内容」。
- **多语句执行**：一次粘贴整段脚本也没问题——控制台按分号拆成独立语句逐条执行（字符串、引号标识符与注释里的分号不会误拆），网格先展示最后一条的结果，状态栏提示「已顺序执行 N 条语句」，旁边的「语句结果」下拉可以翻看任意一条的结果；中途失败会指出是第几条并停止。
- **执行计划**：查询控制台的「执行计划」按钮会对当前语句（或选中部分）取执行计划而不是真的执行它——MySQL 走 `EXPLAIN`，Oracle / OceanBase-Oracle 走 `EXPLAIN PLAN FOR` + `DBMS_XPLAN`，达梦走驱动自带的 `getExplainInfo`（`EXPLAIN` 语句在达梦上只返回空结果），结果标出「执行计划」后展示，看完点「关闭计划」回到编辑器；`EXPLAIN FORMAT=TREE` 这类单列文本计划会按缩进原样排版，不会被网格压成一行；底栏的「复制计划」可以把文本计划整段复制出去，看完关闭计划会回到原来的结果行。
- **SQL 格式化**：查询控制台的「格式化」按钮（或 `Ctrl/⌘ + Shift + F`）会把关键字统一大写，按 `SELECT / FROM / WHERE / GROUP BY / ORDER BY / LIMIT` 等子句换行并缩进子查询；字符串、反引号标识符、`--` 与 `/* */` 注释里的内容一概不动。
- **导入 SQL 文件**：工具栏「导入」按钮可以直接选一个 `.sql` / `.txt` 文件，脚本按光标位置插入编辑器并停在脚本末尾（不会覆盖已经写好的语句，可以叠加多个文件）；CRLF 统一成 LF，超过 2 MB 的文件会被拒绝并提示上限。
- **注释切换**：在 SQL 编辑器里按 `Ctrl/⌘ + /` 给光标所在行（有选中时是选中的每一行）加上 `-- ` 前缀，再按一次就取消；缩进保留，空行不动。
- **保存 SQL 文件**：工具栏「保存」按钮（或编辑器里按 `Ctrl/⌘ + S`）把内容存成 `.sql` 文件（文件名带时间戳，如 `console-20250101-120000.sql`），换行统一成 LF、末尾只留一个换行，方便直接交给 `mysql < file.sql` 或提交进仓库。
- **补全**：在 SQL 编辑器里按 `Ctrl/⌘ + Space`，会按当前库列出表和视图（也包含其他库名）做补全，后面还跟着 `SELECT`、`WHERE`、`GROUP` 等常用 SQL 关键字；写了 `表.`（或 `库.表.`）之后再补全，列出的是这张表的列——输入了前缀就只留下匹配项，方向键选择、`Enter` / `Tab` 插入、`Esc` 关闭；名字需要引号时自动按方言加反引号或双引号，已打开的反引号/双引号会一起补上。同一库的表列表和同一张表的列都会被缓存，反复补全不再重复查询。
- **结果导出**：查询控制台工具栏的下载按钮可以把结果存成 CSV、JSON、SQL 或 Markdown（SQL 每行一条 INSERT，表名自动从当前语句的 `FROM` / `INTO` 识别，识别不到时提示而不是编造表名）——CSV 带 BOM，Excel 打开中文不乱码。可分页的查询除了「当前页」，还能选「全部」：按每批 2000 行自动翻页抓取（单次上限 5 万行），导出的就是整条 SQL 的完整结果；抓取过程中可以点「取消」中止，已取到的行不会写成文件。
- **结果排序**：点控制台结果网格的表头，就能按这一列对当前页排序——第一次升序、再一次降序、第三次取消；拼音按 `zh` 排序，空值沉底，导出 CSV/JSON 也会跟着网格的顺序走。
- **结果筛选**：结果底栏的「筛选结果」输入框按任意列在网格里显示的文字过滤当前页（大小写不敏感，`null` 也能搜），旁边实时显示「命中数 / 本页行数」，行号仍标原始位置（不会重新编号），按 `Esc` 清空，换一条语句执行也会清空；「当前页」的导出与复制跟着筛选后的行走，「全部」仍然导出整条语句的结果。
- **空结果提示**：语句没有返回任何行时，结果网格里直接写明「这条语句没有返回任何行」，不再只留一行表头；数据表标签页同理（「这里没有符合条件的行」）。
- **列头菜单**：在结果网格的列头上点右键，可以「按此列升序 / 降序 / 清除排序」，或者「复制列名」「复制本列值」（一行一个值）；「复制查询语句」会按当前列生成一条带全部列名的 `SELECT`，省得手写——数据表标签页和查询控制台都支持。
- **DDL**：详情面板右上角「DDL」按钮展示建表/建视图语句；MySQL 走 `SHOW CREATE`，Oracle/达梦走 `DBMS_METADATA.GET_DDL`，服务器取不到时按缓存的列与索引重建，并在弹窗底部注明来源。函数、存储过程、触发器、序列没有列结构，选中后直接在详情面板展示服务器返回的定义（MySQL `SHOW CREATE FUNCTION/PROCEDURE/TRIGGER/SEQUENCE`，Oracle/达梦 `DBMS_METADATA.GET_DDL`）；取不到时提示去 SQL 控制台查看，不会拼假 DDL。
- **Agent 工具**：15 个 `db_*` 工具，Agent 可新增 / 编辑 / 删除 / 刷新数据源，列出连接、测试连通性、浏览 Schema、查看表结构、执行 SQL/EXPLAIN、读取 Redis 键与执行命令、下载缺失驱动。写操作默认关闭，需显式开启 `allowAgentWrites`；删除数据源必须显式 `confirm: true`。
- **密码不进配置文件**：密码单独存放在插件数据目录的 `secrets.json`（base64 + 0600 权限，Windows 下继承 profile ACL），API 与日志只返回 `hasPassword` 和秘密名。
- **遵循 DSH 官方视觉规范**：只消费 `--dsw-alias-*` / `--dsw-radius-*` 等语义 token，自动适配深色主题；布局使用标准面板、标签、开关与模态组件。

![展开表查看列、键与索引](docs/screenshots/database-columns.png)

![双击表打开分页查询标签页](docs/screenshots/database-table-tab.png)

![按城市列筛选 customers](docs/screenshots/database-filters.png)

![导出筛选结果](docs/screenshots/database-export.png)

![600 行结果滚动到中段](docs/screenshots/database-virtual.png)

![拖动调整列宽](docs/screenshots/database-column-widths.png)

![筛选 orders：自动展开并高亮命中](docs/screenshots/database-filter.png)

![点表头按城市降序](docs/screenshots/database-sort.png)

### 键盘操作

数据源树可以用键盘操作：`↑`/`↓` 在行之间移动，`Home`/`End` 跳到首尾，`→` 展开、`←` 收起当前行，`Enter` 或空格选中该行（连接、查看结构），在表或视图上按 `Enter` 会直接打开数据表标签页（等同双击）。展开/收起由行首箭头触发（或 `→`/`←`），双击数据源、Schema 或分组行也可以；点击行名不会折叠正在浏览的分支，双击表名仍是打开数据表标签页。焦点所在行有清晰的焦点框，方便只用键盘浏览库表。

![键盘操作数据源树](docs/screenshots/database-keyboard.png)

### 手动事务

SQL 控制台工具条的「事务」通过 JDBC 关闭连接的 auto-commit 来开启事务，不再依赖 `BEGIN` 语句（Oracle 没有 `BEGIN`，只有 PL/SQL 块开头，直接发送会报 `ORA-06550`）；「提交」「回滚」调用驱动的 `commit()` / `rollback()`，完成后恢复 auto-commit，MySQL、Oracle、达梦等都适用。开启后「提交」「回滚」才可用，工具条同时显示「事务进行中」与操作结果提示。切换数据源或关闭标签页时，未提交的事务会被自动回滚。JDBC 桥接按连接复用同一个数据库会话，因此多条语句共享事务。

![事务进行中](docs/screenshots/database-transaction.png)

### Redis 值表格化

选中键后按类型展示成表格：hash 拆成「字段 / 值」，list、set 带序号，zset 展示「成员 / 分数」，stream 展示「ID / 字段」；表头显示类型、TTL（`永久` 表示无过期）与条目数，未知类型回退为原始 JSON。截图为 `shop:customer:42` 的 hash。

![Redis 值以表格展示](docs/screenshots/database-redis-value.png)

![查询控制台历史](docs/screenshots/database-history.png)

![把常用语句收藏到历史顶部](docs/screenshots/database-history-pins.png)

![SQL 格式化](docs/screenshots/database-format.png)

![执行计划：索引命中情况](docs/screenshots/database-explain.png)

![多语句顺序执行：最后一条的查询结果](docs/screenshots/database-multi-statement.png)


![查询控制台导出当前页](docs/screenshots/database-console-export.png)

![导出整条查询的全部结果](docs/screenshots/database-export-all.png)

![控制台按 name 降序](docs/screenshots/database-console-sort.png)

![列头右键菜单](docs/screenshots/database-column-menu.png)

![表结构 DDL](docs/screenshots/database-ddl.png)

![结构缓存：断开后仍可浏览](docs/screenshots/database-cache.png)

![Redis 控制台](docs/screenshots/redis.png)

![设置：运行环境、驱动与安全开关](docs/screenshots/database-settings.png)

## 运行要求

- DeepSeek Harness `>= 0.1.6-alpha.2`（当前在 0.2.1 上开发验证）。
- 关系型数据库需要本机可用的 Java（`JAVA_HOME`、`PATH` 或「设置 → Java 路径」显式指定），**Java 8+** 即可；驱动与桥接 jar 都按 Java 8 字节码编译。
- 也可以随包内置运行时：把 jlink 生成的 JRE 放到插件根目录的 `jre/`（即 `jre/bin/java`），启动时会优先使用它，其次才回退到系统 Java。`jre/` 已加入 npm 发布文件列表。
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
| `db_table_ddl` | 表/视图的建表语句；服务端拿不到时按描述生成，并标注来源与告警 |
| `db_query` | 执行单条 SQL；默认只读，`allowAgentWrites` 开启后才允许写 |
| `db_explain` | MySQL `EXPLAIN`、Oracle/达梦执行计划 |
| `db_redis_scan` | 游标 SCAN，返回键名/类型/TTL；可传 `db` 指定逻辑库 |
| `db_redis_get` | 读取键详情（自动识别类型，限制大小）；可传 `db` 指定逻辑库 |
| `db_redis_command` | 执行 Redis 命令（可传 `db` 指定逻辑库）；写命令受 `allowAgentWrites` 与只读连接限制 |
| `db_download_driver` | 下载缺失的预置驱动 jar |

写保护规则：

1. 只读连接永远拒绝写语句/写命令；`SELECT … INTO OUTFILE/DUMPFILE` 这类会在服务器上落盘写文件的语句同样算写。
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
- 不提供 SSH 隧道、整库导出/导入（`.sql` 脚本可通过控制台的「导入」/「保存」与编辑器往返）、执行计划图形化（文本与表格计划都支持，但没有连线图）。
- 驱动层一次只接受一条语句：控制台会把分号分隔的脚本拆开逐条执行（`db_query` 等 Agent 工具仍按单条提交）。
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

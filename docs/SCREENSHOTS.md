# 界面截图

[README](../README.md) 只保留两张总览图，其余截图按主题收在这里。截图来自演示库（`shop` schema 与 Redis `db0`），仅用于展示界面。

## 数据源树

### 数据源与 Schema 树

数据源 → Schema → 表 / 视图 / 例程 / 序列 / 触发器的树，每类分组带数量。

![数据源树](screenshots/database-tree.png)

### 展开表查看列、键与索引

展开表即可查看列类型与主键标记、键与索引及其列，不用打开详情面板。

![展开表查看列、键与索引](screenshots/database-columns.png)

### 筛选 orders：自动展开并高亮命中

树顶部输入筛选词，命中路径逐级展开，命中的文字片段加浅色底。

![筛选 orders：自动展开并高亮命中](screenshots/database-filter.png)

### 键盘操作数据源树

方向键移动，`Home`/`End` 跳首尾，`→`/`←` 展开收起，`Enter` 打开数据表；焦点行有清晰的焦点框。

![键盘操作数据源树](screenshots/database-keyboard.png)

### 结构缓存：断开后仍可浏览

连接过一次后结构写入 `structure.json`，数据库下线或断网时仍能展开浏览缓存，离线状态在树上有标注。

![结构缓存：断开后仍可浏览](screenshots/database-cache.png)

## 数据表标签页

### 双击表打开分页查询标签页

标签页标题是表名，顶部显示 `schema.table`，`WHERE` / `ORDER BY` 生效后底栏给出实际执行的 SQL 与总行数。

![双击表打开分页查询标签页](screenshots/database-table-tab.png)

### 按城市列筛选 customers

漏斗按钮展开列筛选行，每列一个输入框，输入即按 `LIKE` 过滤，生效项数显示在漏斗徽标上。

![按城市列筛选 customers](screenshots/database-filters.png)

### 导出筛选结果

下载按钮导出 CSV / JSON / SQL / Markdown，可选「当前页」或「全部」，导出内容与当前筛选条件一致。

![导出筛选结果](screenshots/database-export.png)

### 600 行结果滚动到中段

超过 200 行自动启用虚拟滚动，只渲染可视区域，滚动条长度与行号仍是真实数据。

![600 行结果滚动到中段](screenshots/database-virtual.png)

### 拖动调整列宽

拖动表头分隔线按像素调宽，双击分隔线恢复自动列宽；列宽按「数据表 / 控制台」分别记住。

![拖动调整列宽](screenshots/database-column-widths.png)

### 点表头按城市降序

点列头在升序 → 降序 → 不排序之间循环，排序直接写进 `ORDER BY` 由数据库执行，翻页顺序保持一致。

![点表头按城市降序](screenshots/database-sort.png)

### 列头右键菜单

列头右键可按此列排序、复制列名 / 本列值、复制全部列名或完整 `SELECT`，也能生成分组计数语句。

![列头右键菜单](screenshots/database-column-menu.png)

### 表结构 DDL

详情面板的「DDL」按钮展示建表语句；服务器取不到时按缓存列与索引重建，并在弹层里注明来源。

![表结构 DDL](screenshots/database-ddl.png)

## 查询控制台

### SQL 查询控制台

多行编辑、`Ctrl/⌘ + Enter` 执行、多语句顺序执行、行数上限与分页，底栏显示实际执行的 SQL。

![SQL 查询控制台](screenshots/database-console.png)

### 查询控制台历史

最近执行的 50 条语句存在浏览器本地，点一条回填编辑器，执行过的语句标出行数与耗时。

![查询控制台历史](screenshots/database-history.png)

### 把常用语句收藏到历史顶部

每条语句右侧的星标可收藏，「收藏」分组固定在最前，最多 20 条，清空历史不会删掉收藏。

![把常用语句收藏到历史顶部](screenshots/database-history-pins.png)

### SQL 格式化

关键字统一大写，按 `SELECT / FROM / WHERE / GROUP BY / ORDER BY / LIMIT` 等子句换行缩进，字符串与注释不动。

![SQL 格式化](screenshots/database-format.png)

### 执行计划：索引命中情况

「执行计划」不真正执行语句：MySQL / PostgreSQL 走 `EXPLAIN`，SQL Server 临时打开 `SHOWPLAN_ALL`，Oracle / 达梦走 `EXPLAIN PLAN` / 驱动接口，SQLite 走 `EXPLAIN QUERY PLAN`。

![执行计划：索引命中情况](screenshots/database-explain.png)

### 多语句顺序执行

整段脚本按分号拆开逐条执行，「语句结果」下拉可以翻看任意一条的结果（带耗时与行数）。

![多语句顺序执行：最后一条的查询结果](screenshots/database-multi-statement.png)

### 查询控制台导出当前页

控制台工具栏的下载按钮把结果存成 CSV / JSON / SQL / Markdown，SQL 的表名从语句的 `FROM` / `INTO` 识别。

![查询控制台导出当前页](screenshots/database-console-export.png)

### 导出整条查询的全部结果

可分页的查询除了「当前页」还能选「全部」，按每批 2000 行自动翻页抓取，单次上限 5 万行，中途可取消。

![导出整条查询的全部结果](screenshots/database-export-all.png)

### 控制台按 name 降序

点控制台结果网格的表头按该列排序，第一次升序、再一次降序、第三次取消，导出也会跟着网格顺序。

![控制台按 name 降序](screenshots/database-console-sort.png)

## 事务与 Redis

### 事务进行中

「事务」通过关闭 JDBC auto-commit 开启，提交 / 回滚调用驱动的 `commit()` / `rollback()`；切换数据源或关闭标签页时未提交事务会自动回滚。

![事务进行中](screenshots/database-transaction.png)

### Redis 控制台

键表格显示键 / 类型 / TTL / 长度，支持排序与筛选；下方是值面板与命令框（Tab 补全命令名与键名）。

![Redis 控制台](screenshots/redis.png)

### Redis 值以表格展示

hash 拆成「字段 / 值」，list、set 带序号，zset 展示「成员 / 分数」，stream 展示「ID / 字段」；表头标出类型、TTL 与条目数。

![Redis 值以表格展示](screenshots/database-redis-value.png)

## 设置

### 运行环境、驱动与安全开关

设置页列出 Java 运行环境、预置与自定义驱动下载状态、Agent 写开关、快捷键重绑定等。

![设置：运行环境、驱动与安全开关](screenshots/database-settings.png)

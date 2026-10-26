package dshdb;

import java.io.Reader;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.URL;
import java.net.URLClassLoader;
import java.sql.Array;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.Driver;
import java.sql.NClob;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.sql.SQLException;
import java.sql.SQLWarning;
import java.sql.SQLXML;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.OffsetTime;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/** Owns JDBC connections and turns JDBC results into protocol JSON. */
final class SqlExecutor {
    private static final int MAX_TEXT = 16384;

    private final Map<String, Conn> connections = new ConcurrentHashMap<String, Conn>();
    private final Map<String, Statement> statements = new ConcurrentHashMap<String, Statement>();
    private final Set<String> cancelled =
            Collections.newSetFromMap(new ConcurrentHashMap<String, Boolean>());

    private static final Set<String> MYSQL_SYSTEM =
            new HashSet<String>(Arrays.asList("information_schema", "mysql", "performance_schema", "sys"));
    private static final Set<String> ORACLE_SYSTEM =
            new HashSet<String>(Arrays.asList(
                    "SYS", "SYSTEM", "SYSAUX", "OUTLN", "DBSNMP", "APPQOSSYS", "AUDSYS",
                    "CTXSYS", "DVSYS", "DVF", "GSMADMIN_INTERNAL", "LBACSYS", "MDSYS",
                    "OJVMSYS", "OLAPSYS", "ORDDATA", "ORDSYS", "ORDPLUGINS", "SI_INFORMTN_SCHEMA",
                    "WMSYS", "XDB", "XS$NULL", "ANONYMOUS", "PUBLIC", "ORACLE_OCM",
                    "SYSBACKUP", "SYSDG", "SYSKM", "SYSRAC", "SYS$UMF", "DBSFWUSER",
                    "REMOTE_SCHEDULER_AGENT", "SYS$IMPORT", "SYS$EXPORT"));
    private static final Set<String> POSTGRES_SYSTEM =
            new HashSet<String>(Arrays.asList("pg_catalog", "information_schema", "pg_toast"));
    private static final Set<String> DAMENG_SYSTEM =
            new HashSet<String>(Arrays.asList("SYS", "SYSDBA", "SYSAUDITOR", "SYSSSO", "SYSJOB", "CTISYS"));
    private static final Set<String> MSSQL_SYSTEM =
            new HashSet<String>(Arrays.asList("sys", "information_schema", "guest", "db_owner",
                    "db_accessadmin", "db_securityadmin", "db_ddladmin", "db_backupoperator",
                    "db_datareader", "db_datawriter", "db_denydatareader", "db_denydatawriter"));

    Map<String, Object> connect(Map<String, Object> params) throws Exception {
        String connId = Json.string(params.get("connId"), "");
        if (connId.isEmpty()) {
            throw new IllegalArgumentException("connId is required");
        }
        String url = Json.string(params.get("url"), "");
        String driverClass = Json.string(params.get("driverClass"), "");
        if (url.isEmpty() || driverClass.isEmpty()) {
            throw new IllegalArgumentException("url and driverClass are required");
        }
        String dialect = Json.string(params.get("dialect"), "generic");
        String user = Json.string(params.get("user"), "");
        String password = Json.string(params.get("password"), "");

        List<String> jarPaths = new ArrayList<String>();
        Object rawJars = params.get("jars");
        if (rawJars instanceof List) {
            for (Object item : (List<?>) rawJars) {
                if (item instanceof String && !((String) item).isEmpty()) {
                    jarPaths.add((String) item);
                }
            }
        }

        Properties properties = new Properties();
        properties.setProperty("user", user);
        if (!password.isEmpty()) {
            properties.setProperty("password", password);
        }
        Object rawProperties = params.get("properties");
        if (rawProperties instanceof Map) {
            for (Map.Entry<String, Object> entry : Json.asObject(rawProperties).entrySet()) {
                if (entry.getValue() != null && !entry.getKey().isEmpty()) {
                    properties.setProperty(entry.getKey(), String.valueOf(entry.getValue()));
                }
            }
        }

        disconnect(connId);

        URL[] urls = new URL[jarPaths.size()];
        for (int i = 0; i < jarPaths.size(); i++) {
            urls[i] = new java.io.File(jarPaths.get(i)).toURI().toURL();
        }
        URLClassLoader loader = new URLClassLoader(urls, SqlExecutor.class.getClassLoader());
        try {
            Class<?> loaded = Class.forName(driverClass, true, loader);
            Object instance = loaded.getDeclaredConstructor().newInstance();
            if (!(instance instanceof Driver)) {
                throw new IllegalArgumentException(driverClass + " is not a java.sql.Driver");
            }
            Driver driver = (Driver) instance;
            Connection connection = driver.connect(url, properties);
            if (connection == null) {
                throw new SQLException("driver " + driverClass + " rejected the URL " + url);
            }
            applyReadOnlyHint(connection, params);
            Conn entry = new Conn(connection, loader, dialect, connId);
            connections.put(connId, entry);
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("product", safeProduct(connection));
            data.put("version", safeVersion(connection));
            data.put("user", user);
            data.put("url", url);
            try {
                data.put("database", connection.getCatalog());
            } catch (Throwable ignored) {
                data.put("database", "");
            }
            return data;
        } catch (Throwable error) {
            try {
                loader.close();
            } catch (Throwable ignored) {
                // Best effort.
            }
            throw error;
        }
    }

    private static void applyReadOnlyHint(Connection connection, Map<String, Object> params) {
        if (Json.bool(params.get("readOnly"), false)) {
            try {
                connection.setReadOnly(true);
            } catch (Throwable ignored) {
                // Some drivers refuse this; the host still enforces read-only.
            }
        }
    }

    private static String safeProduct(Connection connection) {
        try {
            DatabaseMetaData metadata = connection.getMetaData();
            return metadata.getDatabaseProductName() + " " + metadata.getDatabaseProductVersion();
        } catch (Throwable error) {
            return "JDBC";
        }
    }

    private static String safeVersion(Connection connection) {
        try {
            return connection.getMetaData().getDatabaseProductVersion();
        } catch (Throwable error) {
            return "";
        }
    }

    void disconnect(String connId) {
        Conn entry = connections.remove(connId);
        if (entry == null) {
            return;
        }
        try {
            entry.connection.close();
        } catch (Throwable ignored) {
            // Best effort.
        }
        try {
            entry.loader.close();
        } catch (Throwable ignored) {
            // Best effort.
        }
    }

    void closeAll() {
        for (String id : new ArrayList<String>(connections.keySet())) {
            disconnect(id);
        }
        statements.clear();
        cancelled.clear();
    }

    void setSchema(String connId, String schema) throws SQLException {
        Conn entry = conn(connId);
        entry.lock.lock();
        try {
            applySchema(entry, schema);
        } finally {
            entry.lock.unlock();
        }
    }

    /**
     * Explicit transaction control through JDBC. Oracle has no {@code BEGIN}
     * statement (only a PL/SQL block opener), so the console must switch the
     * connection out of auto-commit instead of sending SQL text.
     */
    Map<String, Object> transaction(Map<String, Object> params) throws SQLException {
        String connId = Json.string(params.get("connId"), "");
        String action = Json.string(params.get("action"), "").trim().toLowerCase(Locale.ROOT);
        Conn entry = conn(connId);
        entry.lock.lock();
        try {
            Connection connection = entry.connection;
            if ("start".equals(action)) {
                connection.setAutoCommit(false);
            } else if ("commit".equals(action)) {
                if (!connection.getAutoCommit()) {
                    connection.commit();
                    connection.setAutoCommit(true);
                }
            } else if ("rollback".equals(action)) {
                if (!connection.getAutoCommit()) {
                    connection.rollback();
                    connection.setAutoCommit(true);
                }
            } else {
                throw new IllegalArgumentException("action must be start, commit or rollback");
            }
        } finally {
            entry.lock.unlock();
        }
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("ok", Boolean.TRUE);
        return data;
    }

    /**
     * Execution plan through the vendor API. DM's JDBC driver does not return a
     * ResultSet for EXPLAIN; DmdbConnection.getExplainInfo(sql) is the documented
     * way to read the plan text.
     */
    Map<String, Object> explain(Map<String, Object> params) throws Exception {
        String connId = Json.string(params.get("connId"), "");
        String sql = Json.string(params.get("sql"), "").trim();
        if (sql.isEmpty()) {
            throw new IllegalArgumentException("sql is required");
        }
        Conn entry = conn(connId);
        entry.lock.lock();
        long started = System.nanoTime();
        try {
            String plan = dmExplainText(entry.connection, sql);
            List<Object> columns = new ArrayList<Object>();
            Map<String, Object> column = new LinkedHashMap<String, Object>();
            column.put("name", "执行计划");
            column.put("typeName", "VARCHAR");
            column.put("jdbcType", Integer.valueOf(Types.VARCHAR));
            column.put("nullable", Boolean.TRUE);
            columns.add(column);
            List<Object> rows = new ArrayList<Object>();
            String[] lines = plan.replace("\r\n", "\n").replace('\r', '\n').split("\n");
            for (String line : lines) {
                if (line.trim().isEmpty()) {
                    continue;
                }
                List<Object> row = new ArrayList<Object>(1);
                row.add(line);
                rows.add(row);
            }
            Map<String, Object> data = new LinkedHashMap<String, Object>();
            data.put("columns", columns);
            data.put("rows", rows);
            data.put("rowCount", Integer.valueOf(rows.size()));
            data.put("truncated", Boolean.FALSE);
            data.put("elapsedMs", Long.valueOf(elapsedMs(started)));
            data.put("sql", "EXPLAIN " + sql);
            return data;
        } finally {
            entry.lock.unlock();
        }
    }

    private static String dmExplainText(Connection connection, String sql) throws Exception {
        Class<?> iface;
        try {
            iface = Class.forName(
                    "dm.jdbc.driver.DmdbConnection", true, connection.getClass().getClassLoader());
        } catch (ClassNotFoundException missing) {
            throw new SQLException("当前达梦 JDBC 驱动不支持执行计划接口");
        }
        Method method = iface.getMethod("getExplainInfo", String.class);
        try {
            Object value = method.invoke(connection, sql);
            if (value == null) {
                throw new SQLException("达梦驱动没有返回执行计划");
            }
            return value.toString();
        } catch (InvocationTargetException error) {
            Throwable cause = error.getCause();
            if (cause instanceof Exception) {
                throw (Exception) cause;
            }
            throw new SQLException("获取达梦执行计划失败", cause);
        }
    }

    private void applySchema(Conn entry, String schema) throws SQLException {
        if (schema == null || schema.trim().isEmpty()) {
            return;
        }
        String name = schema.trim();
        if ("mysql".equals(entry.dialect)) {
            try (Statement statement = entry.connection.createStatement()) {
                statement.execute("USE " + quoteMysql(name));
            }
            return;
        }
        if ("oracle".equals(entry.dialect)
                || "oceanbase-oracle".equals(entry.dialect)
                || "dameng".equals(entry.dialect)) {
            try (Statement statement = entry.connection.createStatement()) {
                statement.execute("ALTER SESSION SET CURRENT_SCHEMA = " + quoteOracle(name));
                return;
            } catch (SQLException ignored) {
                try (Statement statement = entry.connection.createStatement()) {
                    statement.execute("SET SCHEMA " + quoteOracle(name));
                    return;
                } catch (SQLException second) {
                    throw new SQLException("cannot switch schema to " + name + ": " + second.getMessage());
                }
            }
        }
        entry.connection.setSchema(name);
    }

    List<Object> schemas(String connId, String filter) throws SQLException {
        Conn entry = conn(connId);
        entry.lock.lock();
        try {
            List<Object> result = new ArrayList<Object>();
            String sql;
            boolean mysql = "mysql".equals(entry.dialect);
            if (mysql) {
                sql = "SELECT schema_name FROM information_schema.schemata ORDER BY schema_name";
            } else if ("oracle".equals(entry.dialect)
                    || "oceanbase-oracle".equals(entry.dialect)
                    || "dameng".equals(entry.dialect)) {
                sql = "SELECT username FROM all_users ORDER BY username";
            } else {
                return metadataSchemas(entry, filter);
            }
            try (Statement statement = entry.connection.createStatement();
                    ResultSet rs = statement.executeQuery(sql)) {
                while (rs.next()) {
                    String name = rs.getString(1);
                    if (name == null || (!filter.isEmpty()
                            && !name.toLowerCase().contains(filter.toLowerCase()))) {
                        continue;
                    }
                    Map<String, Object> row = new LinkedHashMap<String, Object>();
                    row.put("name", name);
                    row.put("system", Boolean.valueOf(isSystem(entry.dialect, name)));
                    result.add(row);
                }
                return result;
            } catch (SQLException error) {
                return metadataSchemas(entry, filter);
            }
        } finally {
            entry.lock.unlock();
        }
    }

    List<Object> objects(String connId, String schema) throws SQLException {
        Conn entry = conn(connId);
        entry.lock.lock();
        try {
            List<Object> result = new ArrayList<Object>();
            if ("mysql".equals(entry.dialect)) {
                String sql = "SELECT table_name, table_type, table_comment FROM information_schema.tables"
                        + " WHERE table_schema = ? ORDER BY table_name";
                try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
                    statement.setString(1, schema);
                    try (ResultSet rs = statement.executeQuery()) {
                        while (rs.next()) {
                            String type = rs.getString(2);
                            Map<String, Object> row = new LinkedHashMap<String, Object>();
                            row.put("name", rs.getString(1));
                            String kind = "VIEW".equalsIgnoreCase(type)
                                    || "SYSTEM VIEW".equalsIgnoreCase(type)
                                    ? "view"
                                    : "SEQUENCE".equalsIgnoreCase(type) ? "sequence" : "table";
                            row.put("kind", kind);
                            row.put("comment", rs.getString(3));
                            result.add(row);
                        }
                    }
                } catch (SQLException error) {
                    return metadataObjects(entry, schema);
                }
                readMysqlRoutines(entry, schema, result);
                readMysqlTriggers(entry, schema, result);
                return result;
            }
            if ("oracle".equals(entry.dialect)
                    || "oceanbase-oracle".equals(entry.dialect)
                    || "dameng".equals(entry.dialect)) {
                String sql = "SELECT object_name, object_type FROM all_objects"
                        + " WHERE owner = ? AND object_type IN ('TABLE','VIEW','MATERIALIZED VIEW',"
                        + "'PROCEDURE','FUNCTION','PACKAGE','SEQUENCE','TRIGGER')"
                        + " AND object_name NOT LIKE 'BIN$%' ORDER BY object_name";
                try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
                    statement.setString(1, schema);
                    try (ResultSet rs = statement.executeQuery()) {
                        while (rs.next()) {
                            Map<String, Object> row = new LinkedHashMap<String, Object>();
                            row.put("name", rs.getString(1));
                            row.put("kind", oracleObjectKind(rs.getString(2)));
                            result.add(row);
                        }
                    }
                    return result;
                } catch (SQLException error) {
                    return metadataObjects(entry, schema);
                }
            }
            if ("sqlite".equals(entry.dialect)) {
                List<Object> sqliteObjects = metadataObjects(entry, schema);
                readSqliteTriggers(entry, sqliteObjects);
                return sqliteObjects;
            }
            if ("postgres".equals(entry.dialect)) {
                // JDBC metadata stops at tables and views; sequences, routines and
                // triggers live in the catalog views instead.
                List<Object> pgObjects = metadataObjects(entry, schema);
                readPgObjects(entry, schema, pgObjects);
                return pgObjects;
            }
            if ("mssql".equals(entry.dialect)) {
                List<Object> mssqlObjects = metadataObjects(entry, schema);
                readMssqlObjects(entry, schema, mssqlObjects);
                return mssqlObjects;
            }
            return metadataObjects(entry, schema);
        } finally {
            entry.lock.unlock();
        }
    }

    /** Routines, triggers and sequences from sys.objects (tables/views come from metadata). */
    private void readMssqlObjects(Conn entry, String schema, List<Object> result) {
        String sql = "SELECT name, type FROM sys.objects WHERE schema_id = SCHEMA_ID(?)"
                + " AND type IN ('P','FN','IF','TF','TR','SO') ORDER BY name";
        try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    String name = rs.getString(1);
                    if (name == null) {
                        continue;
                    }
                    Map<String, Object> row = new LinkedHashMap<String, Object>();
                    row.put("name", name);
                    row.put("kind", mssqlObjectKind(rs.getString(2)));
                    result.add(row);
                }
            }
        } catch (SQLException ignored) {
            // Older servers or a restricted login must not hide the tables.
        }
    }

    private static String mssqlObjectKind(String type) {
        String value = type == null ? "" : type.trim().toUpperCase(Locale.ROOT);
        if (value.equals("P")) return "procedure";
        if (value.equals("FN") || value.equals("IF") || value.equals("TF")) return "function";
        if (value.equals("TR")) return "trigger";
        if (value.equals("SO")) return "sequence";
        return "other";
    }

    /** Values a PostgreSQL schema exposes beyond tables and views. */
    private void readPgObjects(Conn entry, String schema, List<Object> result) {
        appendCatalog(entry, result, "SELECT sequencename FROM pg_sequences WHERE schemaname = ? ORDER BY sequencename",
                schema, null, "sequence");
        appendCatalog(entry, result,
                "SELECT p.proname, CASE WHEN p.prokind = 'p' THEN 'procedure' ELSE 'function' END"
                        + " FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace"
                        + " WHERE n.nspname = ? ORDER BY p.proname",
                schema, Integer.valueOf(2), null);
        appendCatalog(entry, result,
                "SELECT t.tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid"
                        + " JOIN pg_namespace n ON n.oid = c.relnamespace"
                        + " WHERE n.nspname = ? AND NOT t.tgisinternal ORDER BY t.tgname",
                schema, null, "trigger");
    }

    /** Runs a two-column catalog query and appends its rows; failures stay silent. */
    private void appendCatalog(
            Conn entry,
            List<Object> result,
            String sql,
            String schema,
            Integer kindColumn,
            String fixedKind) {
        try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    String name = rs.getString(1);
                    if (name == null) {
                        continue;
                    }
                    Map<String, Object> row = new LinkedHashMap<String, Object>();
                    row.put("name", name);
                    row.put("kind", fixedKind != null ? fixedKind : rs.getString(kindColumn.intValue()));
                    result.add(row);
                }
            }
        } catch (SQLException ignored) {
            // Missing privileges or an older server must not hide the tables.
        }
    }

    /** SQLite exposes triggers only through sqlite_master (JDBC metadata has no such table type). */
    private void readSqliteTriggers(Conn entry, List<Object> result) {
        String sql = "SELECT name FROM sqlite_master WHERE type = 'trigger' ORDER BY name";
        try (PreparedStatement statement = entry.connection.prepareStatement(sql);
                ResultSet rs = statement.executeQuery()) {
            while (rs.next()) {
                String name = rs.getString(1);
                if (name == null) {
                    continue;
                }
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("name", name);
                row.put("kind", "trigger");
                result.add(row);
            }
        } catch (SQLException ignored) {
            // Triggers are a bonus; never hide the tables when this query fails.
        }
    }

    private static String oracleObjectKind(String type) {
        String value = type == null ? "" : type.toUpperCase(Locale.ROOT);
        if (value.contains("MATERIALIZED")) return "view";
        if (value.contains("VIEW")) return "view";
        if (value.equals("TABLE")) return "table";
        if (value.equals("PROCEDURE") || value.equals("PACKAGE")) return "procedure";
        if (value.equals("FUNCTION")) return "function";
        if (value.equals("SEQUENCE")) return "sequence";
        if (value.equals("TRIGGER")) return "trigger";
        return "other";
    }

    /** Routines whose schema matches; missing privileges must not hide the tables. */
    private void readMysqlRoutines(Conn entry, String schema, List<Object> result) {
        String sql = "SELECT routine_name, routine_type, routine_comment FROM information_schema.routines"
                + " WHERE routine_schema = ? ORDER BY routine_name";
        try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<String, Object>();
                    row.put("name", rs.getString(1));
                    row.put("kind", "FUNCTION".equalsIgnoreCase(rs.getString(2)) ? "function" : "procedure");
                    row.put("comment", rs.getString(3));
                    result.add(row);
                }
            }
        } catch (SQLException error) {
            // information_schema.routines is unavailable or not readable; keep tables.
        }
    }

    private void readMysqlTriggers(Conn entry, String schema, List<Object> result) {
        String sql = "SELECT trigger_name FROM information_schema.triggers"
                + " WHERE trigger_schema = ? ORDER BY trigger_name";
        try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<String, Object>();
                    row.put("name", rs.getString(1));
                    row.put("kind", "trigger");
                    result.add(row);
                }
            }
        } catch (SQLException error) {
            // triggers not readable; keep tables and routines.
        }
    }

    Map<String, Object> columns(String connId, String schema, String table) throws SQLException {
        Conn entry = conn(connId);
        entry.lock.lock();
        try {
            List<Object> columns = new ArrayList<Object>();
            List<Object> indexes = new ArrayList<Object>();
            if ("mysql".equals(entry.dialect)) {
                try {
                    readMysqlColumns(entry, schema, table, columns);
                    readMysqlIndexes(entry, schema, table, indexes);
                    return columnBundle(columns, indexes);
                } catch (SQLException error) {
                    columns.clear();
                    indexes.clear();
                }
            } else {
                try {
                    readOracleColumns(entry, schema, table, columns);
                    readOracleIndexes(entry, schema, table, indexes);
                    return columnBundle(columns, indexes);
                } catch (SQLException error) {
                    columns.clear();
                    indexes.clear();
                }
            }
            metadataColumns(entry, schema, table, columns, indexes);
            return columnBundle(columns, indexes);
        } finally {
            entry.lock.unlock();
        }
    }

    private Map<String, Object> columnBundle(List<Object> columns, List<Object> indexes) {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("columns", columns);
        data.put("indexes", indexes);
        return data;
    }

    private void readMysqlColumns(
            Conn entry, String schema, String table, List<Object> columns) throws SQLException {
        String sql = "SELECT column_name, column_type, is_nullable, column_default, column_comment,"
                + " ordinal_position, column_key, extra FROM information_schema.columns"
                + " WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position";
        try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<String, Object>();
                    row.put("name", rs.getString(1));
                    row.put("typeName", rs.getString(2));
                    row.put("nullable", Boolean.valueOf("YES".equalsIgnoreCase(rs.getString(3))));
                    row.put("defaultValue", rs.getString(4));
                    row.put("comment", rs.getString(5));
                    row.put("ordinal", Integer.valueOf(rs.getInt(6)));
                    row.put("primaryKey", Boolean.valueOf("PRI".equalsIgnoreCase(rs.getString(7))));
                    String extra = rs.getString(8);
                    if (extra != null && !extra.isEmpty()) {
                        row.put("extra", extra);
                    }
                    columns.add(row);
                }
            }
        }
    }

    private void readMysqlIndexes(
            Conn entry, String schema, String table, List<Object> indexes) throws SQLException {
        String sql = "SELECT index_name, column_name, non_unique FROM information_schema.statistics"
                + " WHERE table_schema = ? AND table_name = ? ORDER BY index_name, seq_in_index";
        try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rs = statement.executeQuery()) {
                Map<String, Map<String, Object>> grouped =
                        new LinkedHashMap<String, Map<String, Object>>();
                while (rs.next()) {
                    String name = rs.getString(1);
                    Map<String, Object> index = grouped.get(name);
                    if (index == null) {
                        index = new LinkedHashMap<String, Object>();
                        index.put("name", name);
                        index.put("columns", new ArrayList<Object>());
                        index.put("unique", Boolean.valueOf(rs.getInt(3) == 0));
                        index.put("primary", Boolean.valueOf("PRIMARY".equalsIgnoreCase(name)));
                        grouped.put(name, index);
                    }
                    @SuppressWarnings("unchecked")
                    List<Object> list = (List<Object>) index.get("columns");
                    list.add(rs.getString(2));
                }
                indexes.addAll(grouped.values());
            }
        }
    }

    private void readOracleColumns(
            Conn entry, String schema, String table, List<Object> columns) throws SQLException {
        Set<String> primaryKey = new HashSet<String>();
        try (PreparedStatement statement = entry.connection.prepareStatement(
                "SELECT cc.column_name FROM all_cons_columns cc JOIN all_constraints c"
                        + " ON c.owner = cc.owner AND c.constraint_name = cc.constraint_name"
                        + " WHERE c.owner = ? AND c.table_name = ? AND c.constraint_type = 'P'")) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    primaryKey.add(rs.getString(1));
                }
            }
        } catch (SQLException ignored) {
            // Primary keys are optional metadata.
        }
        String sql = "SELECT c.column_name, c.data_type, c.data_length, c.data_precision,"
                + " c.data_scale, c.nullable, c.data_default, c.column_id, cc.comments"
                + " FROM all_tab_columns c LEFT JOIN all_col_comments cc"
                + " ON cc.owner = c.owner AND cc.table_name = c.table_name"
                + " AND cc.column_name = c.column_name"
                + " WHERE c.owner = ? AND c.table_name = ? ORDER BY c.column_id";
        try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    Map<String, Object> row = new LinkedHashMap<String, Object>();
                    String name = rs.getString(1);
                    String type = rs.getString(2);
                    row.put("name", name);
                    row.put("typeName", oracleTypeName(type, rs));
                    row.put("nullable", Boolean.valueOf("Y".equalsIgnoreCase(rs.getString(6))));
                    row.put("defaultValue", rs.getString(7));
                    row.put("ordinal", Integer.valueOf(rs.getInt(8)));
                    row.put("comment", rs.getString(9));
                    row.put("primaryKey", Boolean.valueOf(primaryKey.contains(name)));
                    columns.add(row);
                }
            }
        }
    }

    private static String oracleTypeName(String type, ResultSet rs) throws SQLException {
        if (type == null) {
            return "";
        }
        String upper = type.toUpperCase();
        if (upper.contains("CHAR") || upper.contains("RAW")) {
            int length = rs.getInt("DATA_LENGTH");
            return type + "(" + length + ")";
        }
        if (upper.equals("NUMBER") || upper.equals("DECIMAL") || upper.equals("NUMERIC")) {
            int precision = rs.getInt("DATA_PRECISION");
            boolean precisionNull = rs.wasNull();
            int scale = rs.getInt("DATA_SCALE");
            boolean scaleNull = rs.wasNull();
            if (!precisionNull && precision > 0) {
                return type + "(" + precision + (scaleNull ? "" : "," + scale) + ")";
            }
        }
        return type;
    }

    private void readOracleIndexes(
            Conn entry, String schema, String table, List<Object> indexes) throws SQLException {
        Set<String> primaryIndexes = new HashSet<String>();
        try (PreparedStatement statement = entry.connection.prepareStatement(
                "SELECT index_name FROM all_constraints WHERE owner = ? AND table_name = ?"
                        + " AND constraint_type = 'P' AND index_name IS NOT NULL")) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    primaryIndexes.add(rs.getString(1));
                }
            }
        } catch (SQLException ignored) {
            // Optional.
        }
        String sql = "SELECT i.index_name, i.uniqueness, c.column_name FROM all_indexes i"
                + " JOIN all_ind_columns c ON c.index_owner = i.owner AND c.index_name = i.index_name"
                + " WHERE i.table_owner = ? AND i.table_name = ?"
                + " ORDER BY i.index_name, c.column_position";
        try (PreparedStatement statement = entry.connection.prepareStatement(sql)) {
            statement.setString(1, schema);
            statement.setString(2, table);
            try (ResultSet rs = statement.executeQuery()) {
                Map<String, Map<String, Object>> grouped =
                        new LinkedHashMap<String, Map<String, Object>>();
                while (rs.next()) {
                    String name = rs.getString(1);
                    Map<String, Object> index = grouped.get(name);
                    if (index == null) {
                        index = new LinkedHashMap<String, Object>();
                        index.put("name", name);
                        index.put("columns", new ArrayList<Object>());
                        index.put("unique", Boolean.valueOf(
                                "UNIQUE".equalsIgnoreCase(rs.getString(2))));
                        index.put("primary", Boolean.valueOf(primaryIndexes.contains(name)));
                        grouped.put(name, index);
                    }
                    @SuppressWarnings("unchecked")
                    List<Object> list = (List<Object>) index.get("columns");
                    list.add(rs.getString(3));
                }
                indexes.addAll(grouped.values());
            }
        }
    }

    private List<Object> metadataSchemas(Conn entry, String filter) throws SQLException {
        List<Object> result = new ArrayList<Object>();
        DatabaseMetaData metadata = entry.connection.getMetaData();
        if ("sqlite".equals(entry.dialect)) {
            // SQLite reports no schemas through JDBC; the attached database is always "main".
            if (filter.isEmpty() || "main".toLowerCase().contains(filter.toLowerCase())) {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("name", "main");
                row.put("system", Boolean.FALSE);
                result.add(row);
            }
            return result;
        }
        boolean mysql = "mysql".equals(entry.dialect);
        try (ResultSet rs = mysql ? metadata.getCatalogs() : metadata.getSchemas()) {
            while (rs.next()) {
                String name = mysql ? rs.getString("TABLE_CAT") : rs.getString("TABLE_SCHEM");
                if (name == null || (!filter.isEmpty()
                        && !name.toLowerCase().contains(filter.toLowerCase()))) {
                    continue;
                }
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("name", name);
                row.put("system", Boolean.valueOf(isSystem(entry.dialect, name)));
                result.add(row);
            }
        }
        return result;
    }

    private List<Object> metadataObjects(Conn entry, String schema) throws SQLException {
        List<Object> result = new ArrayList<Object>();
        DatabaseMetaData metadata = entry.connection.getMetaData();
        boolean mysql = "mysql".equals(entry.dialect);
        boolean sqlite = "sqlite".equals(entry.dialect);
        String catalog = mysql ? schema : null;
        String schemaPattern = mysql || sqlite ? null : schema;
        try (ResultSet rs = metadata.getTables(
                catalog, schemaPattern, "%", new String[] {"TABLE", "VIEW"})) {
            while (rs.next()) {
                String name = rs.getString("TABLE_NAME");
                if (name == null) {
                    continue;
                }
                String type = rs.getString("TABLE_TYPE");
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                row.put("name", name);
                row.put("kind", type != null && type.toUpperCase().contains("VIEW")
                        ? "view" : "table");
                row.put("comment", rs.getString("REMARKS"));
                result.add(row);
            }
        }
        return result;
    }

    private void metadataColumns(
            Conn entry,
            String schema,
            String table,
            List<Object> columns,
            List<Object> indexes)
            throws SQLException {
        DatabaseMetaData metadata = entry.connection.getMetaData();
        boolean mysql = "mysql".equals(entry.dialect);
        boolean sqlite = "sqlite".equals(entry.dialect);
        String catalog = mysql ? schema : null;
        String schemaPattern = mysql || sqlite ? null : schema;
        Set<String> primary = new HashSet<String>();
        try (ResultSet rs = metadata.getPrimaryKeys(catalog, schemaPattern, table)) {
            while (rs.next()) {
                primary.add(rs.getString("COLUMN_NAME"));
            }
        } catch (SQLException ignored) {
            // Optional.
        }
        try (ResultSet rs = metadata.getColumns(catalog, schemaPattern, table, "%")) {
            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<String, Object>();
                String name = rs.getString("COLUMN_NAME");
                row.put("name", name);
                row.put("typeName", rs.getString("TYPE_NAME"));
                row.put("nullable", Boolean.valueOf(
                        rs.getInt("NULLABLE") == DatabaseMetaData.columnNullable));
                row.put("defaultValue", rs.getString("COLUMN_DEF"));
                row.put("comment", rs.getString("REMARKS"));
                row.put("ordinal", Integer.valueOf(rs.getInt("ORDINAL_POSITION")));
                row.put("primaryKey", Boolean.valueOf(primary.contains(name)));
                columns.add(row);
            }
        }
        try (ResultSet rs = metadata.getIndexInfo(catalog, schemaPattern, table, false, true)) {
            Map<String, Map<String, Object>> grouped =
                    new LinkedHashMap<String, Map<String, Object>>();
            while (rs.next()) {
                String name = rs.getString("INDEX_NAME");
                if (name == null) {
                    continue;
                }
                Map<String, Object> index = grouped.get(name);
                if (index == null) {
                    index = new LinkedHashMap<String, Object>();
                    index.put("name", name);
                    index.put("columns", new ArrayList<Object>());
                    index.put("unique", Boolean.valueOf(!rs.getBoolean("NON_UNIQUE")));
                    index.put("primary", Boolean.valueOf(primary.contains(name)));
                    grouped.put(name, index);
                }
                String column = rs.getString("COLUMN_NAME");
                if (column != null) {
                    @SuppressWarnings("unchecked")
                    List<Object> list = (List<Object>) index.get("columns");
                    list.add(column);
                }
            }
            indexes.addAll(grouped.values());
        }
    }

    Map<String, Object> query(Map<String, Object> params) throws Exception {
        String connId = Json.string(params.get("connId"), "");
        String sql = Json.string(params.get("sql"), "").trim();
        if (sql.isEmpty()) {
            throw new IllegalArgumentException("sql is required");
        }
        int maxRows = (int) Json.integer(params.get("maxRows"), 200);
        if (maxRows < 1) {
            maxRows = 200;
        }
        int timeoutSec = (int) Json.integer(params.get("timeoutSec"), 30);
        String stmtKey = Json.string(params.get("stmtKey"), "");
        String schema = Json.string(params.get("schema"), "");

        Conn entry = conn(connId);
        entry.lock.lock();
        long started = System.nanoTime();
        Statement statement = null;
        try {
            if (!schema.isEmpty()) {
                applySchema(entry, schema);
            }
            statement = entry.connection.createStatement(
                    ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY);
            if (timeoutSec > 0) {
                statement.setQueryTimeout(timeoutSec);
            }
            statement.setMaxRows(maxRows + 1);
            if (!"mysql".equals(entry.dialect)) {
                try {
                    statement.setFetchSize(200);
                } catch (SQLException ignored) {
                    // Driver default is fine.
                }
            }
            if (!stmtKey.isEmpty()) {
                statements.put(stmtKey, statement);
                cancelled.remove(stmtKey);
            }
            boolean hasResult = statement.execute(sql);
            Map<String, Object> data;
            if (hasResult) {
                data = readResultSet(statement, maxRows, started, sql);
            } else {
                data = updateResult(statement, started, sql);
            }
            data.put("warnings", warnings(statement));
            return data;
        } catch (SQLException error) {
            if (!stmtKey.isEmpty() && cancelled.contains(stmtKey)) {
                throw new QueryCancelled("query cancelled");
            }
            throw error;
        } finally {
            if (!stmtKey.isEmpty()) {
                statements.remove(stmtKey);
                cancelled.remove(stmtKey);
            }
            if (statement != null) {
                try {
                    statement.close();
                } catch (Throwable ignored) {
                    // Best effort.
                }
            }
            entry.lock.unlock();
        }
    }

    private Map<String, Object> readResultSet(
            Statement statement, int maxRows, long started, String sql) throws SQLException {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        List<Object> columns = new ArrayList<Object>();
        List<Object> rows = new ArrayList<Object>();
        boolean truncated = false;
        try (ResultSet rs = statement.getResultSet()) {
            ResultSetMetaData meta = rs.getMetaData();
            int count = meta.getColumnCount();
            for (int i = 1; i <= count; i++) {
                Map<String, Object> column = new LinkedHashMap<String, Object>();
                String label = meta.getColumnLabel(i);
                if (label == null || label.isEmpty()) {
                    label = meta.getColumnName(i);
                }
                column.put("name", label);
                column.put("typeName", meta.getColumnTypeName(i));
                column.put("jdbcType", Integer.valueOf(meta.getColumnType(i)));
                column.put(
                        "nullable",
                        Boolean.valueOf(meta.isNullable(i) != ResultSetMetaData.columnNoNulls));
                columns.add(column);
            }
            while (rs.next()) {
                if (rows.size() >= maxRows) {
                    truncated = true;
                    break;
                }
                List<Object> row = new ArrayList<Object>(count);
                for (int i = 1; i <= count; i++) {
                    row.add(value(rs, i));
                }
                rows.add(row);
            }
        }
        data.put("columns", columns);
        data.put("rows", rows);
        data.put("rowCount", Integer.valueOf(rows.size()));
        data.put("truncated", Boolean.valueOf(truncated));
        data.put("elapsedMs", Long.valueOf(elapsedMs(started)));
        data.put("sql", sql);
        return data;
    }

    private Map<String, Object> updateResult(Statement statement, long started, String sql)
            throws SQLException {
        Map<String, Object> data = new LinkedHashMap<String, Object>();
        data.put("columns", new ArrayList<Object>());
        data.put("rows", new ArrayList<Object>());
        data.put("rowCount", Integer.valueOf(0));
        data.put("truncated", Boolean.FALSE);
        int updateCount = statement.getUpdateCount();
        data.put("updateCount", Integer.valueOf(Math.max(updateCount, 0)));
        data.put("elapsedMs", Long.valueOf(elapsedMs(started)));
        data.put("sql", sql);
        return data;
    }

    private static long elapsedMs(long started) {
        return Long.valueOf((System.nanoTime() - started) / 1_000_000L);
    }

    private static List<Object> warnings(Statement statement) {
        List<Object> result = new ArrayList<Object>();
        try {
            SQLWarning warning = statement.getWarnings();
            int guard = 0;
            while (warning != null && guard++ < 20) {
                result.add(warning.getMessage());
                warning = warning.getNextWarning();
            }
        } catch (Throwable ignored) {
            // Optional metadata.
        }
        return result;
    }

    boolean cancel(String stmtKey) {
        if (stmtKey.isEmpty()) {
            return false;
        }
        Statement statement = statements.get(stmtKey);
        if (statement == null) {
            return false;
        }
        cancelled.add(stmtKey);
        try {
            statement.cancel();
            return true;
        } catch (Throwable error) {
            return false;
        }
    }

    private static Object value(ResultSet rs, int index) throws SQLException {
        Object raw;
        try {
            raw = rs.getObject(index);
        } catch (SQLException error) {
            return "<unreadable: " + error.getMessage() + ">";
        }
        return normalize(raw, rs, index);
    }

    private static Object normalize(Object raw, ResultSet rs, int index) throws SQLException {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Boolean) {
            return raw;
        }
        if (raw instanceof String) {
            return cap((String) raw);
        }
        if (raw instanceof Byte || raw instanceof Short || raw instanceof Integer) {
            return Long.valueOf(((Number) raw).longValue());
        }
        if (raw instanceof Long) {
            return raw;
        }
        if (raw instanceof BigInteger) {
            BigInteger value = (BigInteger) raw;
            return value.bitLength() <= 52 ? (Object) Long.valueOf(value.longValue()) : (Object) value.toString();
        }
        if (raw instanceof BigDecimal) {
            BigDecimal value = (BigDecimal) raw;
            if (value.scale() <= 0 && value.precision() <= 15) {
                return Long.valueOf(value.longValue());
            }
            return value.toPlainString();
        }
        if (raw instanceof Double || raw instanceof Float) {
            double value = ((Number) raw).doubleValue();
            return Double.isNaN(value) || Double.isInfinite(value)
                    ? (Object) String.valueOf(value) : (Object) Double.valueOf(value);
        }
        if (raw instanceof Timestamp) {
            return ((Timestamp) raw).toLocalDateTime().toString().replace('T', ' ');
        }
        if (raw instanceof java.sql.Date) {
            return raw.toString();
        }
        if (raw instanceof java.sql.Time) {
            return raw.toString();
        }
        if (raw instanceof LocalDateTime) {
            return ((LocalDateTime) raw).toString().replace('T', ' ');
        }
        if (raw instanceof LocalDate || raw instanceof LocalTime) {
            return raw.toString();
        }
        if (raw instanceof OffsetDateTime || raw instanceof OffsetTime || raw instanceof ZonedDateTime) {
            return raw.toString();
        }
        if (raw instanceof byte[]) {
            return "<binary " + ((byte[]) raw).length + " bytes>";
        }
        if (raw instanceof Clob) {
            Clob clob = (Clob) raw;
            long length = clob.length();
            int read = (int) Math.min(length, 4096L);
            try (Reader reader = clob.getCharacterStream()) {
                char[] buffer = new char[read];
                int offset = 0;
                while (offset < read) {
                    int count = reader.read(buffer, offset, read - offset);
                    if (count < 0) {
                        break;
                    }
                    offset += count;
                }
                String text = new String(buffer, 0, offset);
                return length > read ? text + "…<truncated>" : text;
            } catch (Exception error) {
                return "<clob " + length + " chars>";
            }
        }
        if (raw instanceof NClob) {
            return "<nclob>";
        }
        if (raw instanceof Blob) {
            return "<blob " + ((Blob) raw).length() + " bytes>";
        }
        if (raw instanceof SQLXML) {
            try {
                return cap(((SQLXML) raw).getString());
            } catch (SQLException error) {
                return "<xml>";
            }
        }
        if (raw instanceof Array) {
            try {
                return cap(String.valueOf(((Array) raw).getArray()));
            } catch (SQLException error) {
                return "<array>";
            }
        }
        try {
            return cap(rs.getString(index));
        } catch (SQLException error) {
            return cap(String.valueOf(raw));
        }
    }

    private static String cap(String text) {
        if (text == null) {
            return null;
        }
        return text.length() <= MAX_TEXT ? text : text.substring(0, MAX_TEXT) + "…<truncated>";
    }

    private static boolean isSystem(String dialect, String name) {
        if (name == null) {
            return false;
        }
        if (MYSQL_SYSTEM.contains(name.toLowerCase())) {
            return true;
        }
        if ("mysql".equals(dialect)) {
            return false;
        }
        if ("dameng".equals(dialect)) {
            return DAMENG_SYSTEM.contains(name.toUpperCase());
        }
        if ("mssql".equals(dialect)) {
            return MSSQL_SYSTEM.contains(name.toLowerCase());
        }
        if ("postgres".equals(dialect)) {
            String lower = name.toLowerCase();
            return POSTGRES_SYSTEM.contains(lower) || lower.startsWith("pg_");
        }
        return ORACLE_SYSTEM.contains(name.toUpperCase());
    }

    private Conn conn(String connId) throws SQLException {
        Conn entry = connections.get(connId);
        if (entry == null) {
            throw new SQLException("connection is not open: " + connId);
        }
        return entry;
    }

    private static String quoteMysql(String name) {
        return "`" + name.replace("`", "``") + "`";
    }

    private static String quoteOracle(String name) {
        return "\"" + name.replace("\"", "\"\"") + "\"";
    }

    private static final class Conn {
        final Connection connection;
        final URLClassLoader loader;
        final String dialect;
        final String connId;
        final ReentrantLock lock = new ReentrantLock();

        Conn(Connection connection, URLClassLoader loader, String dialect, String connId) {
            this.connection = connection;
            this.loader = loader;
            this.dialect = dialect;
            this.connId = connId;
        }
    }
}

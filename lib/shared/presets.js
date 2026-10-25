export const PLUGIN_NAME = 'dsh-ide-database';
export const ROUTE_PREFIX = '/dsh-ide-database/api';
export const DATA_DIR_NAME = 'dsh-ide-database';
/** Driver artifacts are pinned; every jar is fetched from Maven Central (or a mirror) on first use. */
export const PRESETS = {
    mysql: {
        id: 'mysql',
        dialect: 'mysql',
        defaultPort: 3306,
        driverClass: 'com.mysql.cj.jdbc.Driver',
        urlTemplate: 'jdbc:mysql://{{host}}:{{port}}/{{database}}',
        jar: { group: 'com.mysql', artifact: 'mysql-connector-j', version: '8.4.0' },
        databaseHint: '数据库名（可留空）',
        needsJava: true,
    },
    'oceanbase-mysql': {
        id: 'oceanbase-mysql',
        dialect: 'mysql',
        defaultPort: 2881,
        driverClass: 'com.mysql.cj.jdbc.Driver',
        urlTemplate: 'jdbc:mysql://{{host}}:{{port}}/{{database}}',
        jar: { group: 'com.mysql', artifact: 'mysql-connector-j', version: '8.4.0' },
        databaseHint: 'OceanBase MySQL 模式的租户库名（可留空）',
        needsJava: true,
    },
    'oceanbase-oracle': {
        id: 'oceanbase-oracle',
        dialect: 'oceanbase-oracle',
        defaultPort: 2881,
        driverClass: 'com.oceanbase.jdbc.Driver',
        urlTemplate: 'jdbc:oceanbase://{{host}}:{{port}}/{{database}}',
        jar: { group: 'com.oceanbase', artifact: 'oceanbase-client', version: '2.4.19' },
        databaseHint: 'OceanBase Oracle 模式的 Schema/Service（可留空）',
        needsJava: true,
    },
    oracle: {
        id: 'oracle',
        dialect: 'oracle',
        defaultPort: 1521,
        driverClass: 'oracle.jdbc.OracleDriver',
        urlTemplate: 'jdbc:oracle:thin:@//{{host}}:{{port}}/{{database}}',
        jar: { group: 'com.oracle.database.jdbc', artifact: 'ojdbc8', version: '23.26.3.0.0' },
        databaseHint: '服务名（Service Name），例如 ORCLPDB1',
        needsJava: true,
    },
    dameng: {
        id: 'dameng',
        dialect: 'dameng',
        defaultPort: 5236,
        driverClass: 'dm.jdbc.driver.DmDriver',
        urlTemplate: 'jdbc:dm://{{host}}:{{port}}/{{database}}',
        jar: { group: 'com.dameng', artifact: 'DmJdbcDriver18', version: '8.1.3.140' },
        databaseHint: '模式名（Schema，可留空）',
        needsJava: true,
    },
    redis: {
        id: 'redis',
        dialect: 'redis',
        defaultPort: 6379,
        databaseHint: 'Redis 逻辑库序号（0-15）',
        needsJava: false,
    },
};
export const PRESET_ORDER = [
    'mysql',
    'oceanbase-mysql',
    'oceanbase-oracle',
    'oracle',
    'dameng',
    'redis',
];
export const SQL_DIALECT_LABEL = {
    mysql: 'MySQL',
    oracle: 'Oracle',
    dameng: '达梦 DM',
    'oceanbase-oracle': 'OceanBase (Oracle)',
    generic: '自定义 JDBC',
};
export const DIALECT_LABEL = {
    ...SQL_DIALECT_LABEL,
    redis: 'Redis',
};
function jarFileName(jar) {
    return `${jar.artifact}-${jar.version}.jar`;
}
export function jarCoordinates(jar) {
    return `${jar.group}:${jar.artifact}:${jar.version}`;
}
export function jarRelativePath(jar) {
    return `${jar.group.replaceAll('.', '/')}/${jar.artifact}/${jar.version}/${jarFileName(jar)}`;
}
export function jarCacheName(jar) {
    return `${jar.group.replaceAll('.', '_')}__${jar.artifact}__${jar.version}.jar`;
}
export function mavenBase(mirror) {
    return mirror === 'aliyun'
        ? 'https://maven.aliyun.com/repository/central'
        : 'https://repo1.maven.org/maven2';
}
export function presetOf(id) {
    return PRESETS[id];
}
export function isPresetId(value) {
    return value in PRESETS;
}
export function isSqlDialect(value) {
    return value !== 'redis' && value !== '';
}
//# sourceMappingURL=presets.js.map
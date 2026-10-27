import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { readFile, rename, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { jarCacheName, jarCoordinates, jarRelativePath, mavenBase, PRESET_LABEL, PRESET_ORDER, PRESETS, presetOf, } from '../shared/presets.js';
import { DbError } from './errors.js';
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
/**
 * Driver artifacts are fetched lazily from Maven Central (or the Aliyun
 * mirror) and cached under the profile data directory. Downloads verify the
 * published SHA-1 before the jar is moved into place.
 */
export class DriverManager {
    paths;
    config;
    log;
    inFlight = new Map();
    constructor(paths, config, log = () => { }) {
        this.paths = paths;
        this.config = config;
        this.log = log;
    }
    jarPath(jar) {
        return join(this.paths.driversDir, jarCacheName(jar));
    }
    jarStatus(jar) {
        const file = this.jarPath(jar);
        let sizeBytes;
        let downloaded = false;
        try {
            const stat = statSync(file);
            downloaded = stat.isFile() && stat.size > 0;
            if (downloaded)
                sizeBytes = stat.size;
        }
        catch {
            // missing
        }
        return {
            ...jar,
            coordinates: jarCoordinates(jar),
            downloaded,
            file,
            ...(sizeBytes === undefined ? {} : { sizeBytes }),
        };
    }
    statusOfPreset(id) {
        const preset = PRESETS[id];
        const jars = preset.jar === undefined ? [] : [this.jarStatus(preset.jar)];
        return {
            id,
            name: PRESET_LABEL[id],
            preset: id,
            dialect: preset.dialect,
            ...(preset.driverClass === undefined ? {} : { driverClass: preset.driverClass }),
            ...(preset.urlTemplate === undefined ? {} : { urlTemplate: preset.urlTemplate }),
            jars,
            needsJava: preset.needsJava,
            allJarsPresent: jars.every((jar) => jar.downloaded),
        };
    }
    statusOfCustom(driver) {
        const jars = driver.jars.map((jar) => this.jarStatus(jar));
        return {
            id: driver.id,
            name: driver.name,
            preset: null,
            dialect: driver.dialect,
            driverClass: driver.driverClass,
            urlTemplate: driver.urlTemplate,
            jars,
            needsJava: true,
            allJarsPresent: jars.every((jar) => jar.downloaded),
        };
    }
    statuses() {
        return [...PRESET_ORDER.map((id) => this.statusOfPreset(id)), ...this.config.get().drivers.map((driver) => this.statusOfCustom(driver))];
    }
    resolvePreset(id) {
        const preset = PRESETS[id];
        if (preset.dialect === 'redis')
            throw new DbError('unsupported', 'Redis 连接不使用 JDBC 驱动');
        const status = this.statusOfPreset(id);
        return {
            id,
            name: status.name,
            preset: id,
            dialect: preset.dialect,
            driverClass: preset.driverClass ?? '',
            urlTemplate: preset.urlTemplate ?? '',
            jars: status.jars,
            needsJava: true,
        };
    }
    resolveCustom(id) {
        const driver = this.config.driver(id);
        if (driver === undefined)
            throw new DbError('not-found', `自定义驱动不存在：${id}`);
        return {
            id: driver.id,
            name: driver.name,
            preset: null,
            dialect: driver.dialect,
            driverClass: driver.driverClass,
            urlTemplate: driver.urlTemplate,
            jars: driver.jars.map((jar) => this.jarStatus(jar)),
            needsJava: true,
        };
    }
    resolveDriver(choice, customDriverId) {
        if (choice === 'custom') {
            if (customDriverId === undefined || customDriverId === '')
                throw new DbError('invalid', '未指定自定义驱动');
            return this.resolveCustom(customDriverId);
        }
        const preset = presetOf(choice);
        if (preset === undefined)
            throw new DbError('invalid', `未知的驱动：${choice}`);
        return this.resolvePreset(preset.id);
    }
    assertJarsPresent(driver) {
        const missing = driver.jars.filter((jar) => !jar.downloaded);
        if (missing.length === 0)
            return;
        throw new DbError('jar-missing', `驱动 jar 尚未下载：${missing.map((jar) => jar.coordinates).join('、')}`, `请先调用工具 db_download_driver（driver: "${driver.id}"）下载。`);
    }
    async ensureJars(driver) {
        const result = [];
        for (const jar of driver.jars) {
            if (jar.downloaded) {
                result.push(jar);
                continue;
            }
            result.push(await this.download(jar));
        }
        return result;
    }
    async download(jar) {
        const coordinates = jarCoordinates(jar);
        const current = this.jarStatus(jar);
        if (current.downloaded)
            return current;
        const running = this.inFlight.get(coordinates);
        if (running !== undefined)
            return running;
        const task = this.performDownload(jar).finally(() => this.inFlight.delete(coordinates));
        this.inFlight.set(coordinates, task);
        return task;
    }
    async performDownload(jar) {
        const settings = this.config.settings();
        const base = mavenBase(settings.mavenMirror);
        const relative = jarRelativePath(jar);
        const url = `${base}/${relative}`;
        this.log(`downloading ${url}`);
        let payload;
        let sha1Expected;
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(120_000), redirect: 'follow' });
            if (!response.ok) {
                throw new DbError('download-failed', `下载驱动失败（HTTP ${response.status}）：${url}`, `请检查网络，或在设置中切换 Maven 镜像。`);
            }
            payload = Buffer.from(await response.arrayBuffer());
        }
        catch (error) {
            if (error instanceof DbError)
                throw error;
            throw new DbError('download-failed', `无法连接 Maven 仓库：${messageOf(error)}`, url);
        }
        if (payload.length < 1024 || payload[0] !== 0x50 || payload[1] !== 0x4b) {
            throw new DbError('download-failed', `下载内容不是有效的 jar：${jarCoordinates(jar)}`, `前几个字节：${payload.subarray(0, 8).toString('hex')}`);
        }
        try {
            const shaResponse = await fetch(`${url}.sha1`, { signal: AbortSignal.timeout(20_000), redirect: 'follow' });
            if (shaResponse.ok) {
                const text = (await shaResponse.text()).trim();
                const match = /[a-fA-F0-9]{40}/.exec(text);
                if (match !== null)
                    sha1Expected = match[0].toLowerCase();
            }
        }
        catch {
            // Older mirrors may not serve checksums; the download has already been
            // constrained to the exact pinned artifact coordinates.
        }
        if (sha1Expected !== undefined) {
            const actual = createHash('sha1').update(payload).digest('hex');
            if (actual !== sha1Expected) {
                throw new DbError('download-failed', `驱动校验失败：${jarCoordinates(jar)}`, `期望 SHA-1 ${sha1Expected}，实际 ${actual}`);
            }
        }
        else {
            this.log(`no published sha1 for ${jarCoordinates(jar)}; trusting pinned Maven coordinates`);
        }
        const file = this.jarPath(jar);
        const temp = `${file}.tmp-${process.pid}-${Date.now()}`;
        mkdirSync(this.paths.driversDir, { recursive: true, mode: 0o700 });
        try {
            await writeFile(temp, payload, { mode: 0o600 });
            await rename(temp, file);
        }
        catch (error) {
            await unlink(temp).catch(() => { });
            throw new DbError('download-failed', `写入驱动文件失败：${messageOf(error)}`, file);
        }
        return this.jarStatus(jar);
    }
    exists(file) {
        return existsSync(file);
    }
    /** Reads a jar only to prove it is accessible; used by the health endpoint. */
    async verifyReadable(file) {
        try {
            const data = await readFile(file);
            return data.length > 1024;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=drivers.js.map
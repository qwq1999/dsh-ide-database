import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { extractArchive } from './archive.js';
import { DbError } from './errors.js';
/**
 * Downloads a JRE from the Adoptium (Eclipse Temurin) binaries API and unpacks
 * it into `<data>/jre`, which `JavaLocator` probes as the `downloaded` source.
 *
 * Data directory rather than the plugin install directory: an installed
 * profile lives under `node_modules/` (or an asar archive) and must stay
 * read-only, while the data directory survives plugin upgrades.
 */
export const JAVA_FEATURE_VERSION = 21;
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
/** A real JRE archive is 40 MB+; anything smaller is an error page or truncation. */
const MIN_ARCHIVE_BYTES = 10 * 1024 * 1024;
const OS = {
    win32: 'windows',
    darwin: 'mac',
    linux: 'linux',
};
export function adoptiumUrl(platform = process.platform, arch = process.arch) {
    const os = OS[platform];
    if (os === undefined)
        throw new DbError('unsupported', `暂不支持为 ${platform} 自动下载 Java，请手动安装 JDK 8+`);
    const cpu = arch === 'arm64' ? 'aarch64' : arch === 'x64' ? 'x64' : undefined;
    if (cpu === undefined)
        throw new DbError('unsupported', `暂不支持为 ${arch} 自动下载 Java，请手动安装 JDK 8+`);
    return `https://api.adoptium.net/v3/binary/latest/${String(JAVA_FEATURE_VERSION)}/ga/${os}/${cpu}/jre/hotspot/normal/eclipse`;
}
export function javaExecutablePath(directory, platform = process.platform) {
    return join(directory, 'bin', platform === 'win32' ? 'java.exe' : 'java');
}
function isDirectory(path) {
    try {
        return statSync(path).isDirectory();
    }
    catch {
        return false;
    }
}
/** The archive root (`jdk-21.0.5+11-jre`, or `.../Contents/Home` on macOS) holding `bin/java`. */
export function findRuntimeRoot(directory, platform = process.platform) {
    if (existsSync(javaExecutablePath(directory, platform)))
        return directory;
    let entries = [];
    try {
        entries = readdirSync(directory);
    }
    catch {
        return undefined;
    }
    for (const entry of entries) {
        const child = join(directory, entry);
        if (!isDirectory(child))
            continue;
        if (existsSync(javaExecutablePath(child, platform)))
            return child;
        const bundle = join(child, 'Contents', 'Home');
        if (existsSync(javaExecutablePath(bundle, platform)))
            return bundle;
    }
    return undefined;
}
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
export class JreManager {
    paths;
    log;
    fetchImpl;
    inFlight;
    constructor(paths, log = () => { }, fetchImpl = fetch) {
        this.paths = paths;
        this.log = log;
        this.fetchImpl = fetchImpl;
    }
    /** True once a downloaded runtime sits at `<data>/jre/bin/java(.exe)`. */
    get installed() {
        return existsSync(javaExecutablePath(this.paths.jreDir));
    }
    async install() {
        if (this.installed)
            return;
        if (this.inFlight !== undefined)
            return this.inFlight;
        const task = this.performInstall().finally(() => {
            this.inFlight = undefined;
        });
        this.inFlight = task;
        return task;
    }
    async performInstall() {
        const url = adoptiumUrl();
        const tempDir = mkdtempSync(join(this.paths.dataDir, '.jre-'));
        try {
            this.log(`downloading Java ${String(JAVA_FEATURE_VERSION)} runtime: ${url}`);
            const archive = await this.download(url);
            const unpacked = join(tempDir, 'unpacked');
            mkdirSync(unpacked, { recursive: true });
            let root;
            try {
                extractArchive(archive, unpacked);
                root = findRuntimeRoot(unpacked);
            }
            catch (error) {
                throw new DbError('download-failed', '解压 Java 运行环境失败', messageOf(error));
            }
            if (root === undefined) {
                throw new DbError('download-failed', '下载的 Java 运行环境不完整', '解压后没有找到 bin/java');
            }
            rmSync(this.paths.jreDir, { recursive: true, force: true });
            renameSync(root, this.paths.jreDir);
            this.log(`Java runtime installed: ${javaExecutablePath(this.paths.jreDir)}`);
        }
        finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    }
    async download(url) {
        let response;
        try {
            response = await this.fetchImpl(url, {
                redirect: 'follow',
                signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
            });
        }
        catch (error) {
            throw new DbError('download-failed', '下载 Java 运行环境失败', `无法访问 ${url}：${messageOf(error)}。如果网络访问不了 GitHub，请手动安装 JDK 8+ 或在设置里填写 java 路径。`);
        }
        if (!response.ok) {
            throw new DbError('download-failed', `下载 Java 运行环境失败（HTTP ${String(response.status)}）`, url);
        }
        let buffer;
        try {
            buffer = Buffer.from(await response.arrayBuffer());
        }
        catch (error) {
            throw new DbError('download-failed', '读取 Java 运行环境安装包失败', messageOf(error));
        }
        if (buffer.length < MIN_ARCHIVE_BYTES) {
            throw new DbError('download-failed', '下载的 Java 运行环境不完整', `只收到 ${String(buffer.length)} 字节`);
        }
        return buffer;
    }
}
//# sourceMappingURL=jre.js.map
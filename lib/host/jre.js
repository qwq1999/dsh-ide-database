import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { extractArchive } from './archive.js';
import { DbError } from './errors.js';
/**
 * Downloads an Eclipse Temurin JRE and unpacks it into `<data>/jre`, which
 * `JavaLocator` probes as the `downloaded` source.
 *
 * Two sources: the TUNA mirror of the Adoptium binaries is tried first because
 * `api.adoptium.net` redirects to GitHub release assets, which are unreachable
 * on some networks (the download then fails with ECONNRESET); the official API
 * stays as the fallback. Both serve the same Temurin builds.
 *
 * Data directory rather than the plugin install directory: an installed
 * profile lives under `node_modules/` (or an asar archive) and must stay
 * read-only, while the data directory survives plugin upgrades.
 */
export const JAVA_FEATURE_VERSION = 21;
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000;
/** The mirror listing is a few KB; do not let a blocked mirror stall the install. */
const LISTING_TIMEOUT_MS = 20 * 1000;
/** A real JRE archive is 40 MB+; anything smaller is an error page or truncation. */
const MIN_ARCHIVE_BYTES = 10 * 1024 * 1024;
const TUNA_MIRROR = 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium';
const OS = {
    win32: 'windows',
    darwin: 'mac',
    linux: 'linux',
};
function platformTarget(platform, arch) {
    const os = OS[platform];
    if (os === undefined)
        throw new DbError('unsupported', `暂不支持为 ${platform} 自动下载 Java，请手动安装 JDK 8+`);
    const cpu = arch === 'arm64' ? 'aarch64' : arch === 'x64' ? 'x64' : undefined;
    if (cpu === undefined)
        throw new DbError('unsupported', `暂不支持为 ${arch} 自动下载 Java，请手动安装 JDK 8+`);
    return { os, cpu };
}
export function adoptiumUrl(platform = process.platform, arch = process.arch) {
    const { os, cpu } = platformTarget(platform, arch);
    return `https://api.adoptium.net/v3/binary/latest/${String(JAVA_FEATURE_VERSION)}/ga/${os}/${cpu}/jre/hotspot/normal/eclipse`;
}
/** Directory listing of `OpenJDK21U-jre_*` archives on the TUNA mirror. */
export function tunaMirrorUrl(platform = process.platform, arch = process.arch) {
    const { os, cpu } = platformTarget(platform, arch);
    return `${TUNA_MIRROR}/${String(JAVA_FEATURE_VERSION)}/jre/${cpu}/${os}/`;
}
const ARCHIVE_HREF = /href="([^"]+\.(?:zip|tar\.gz))"/g;
const ARCHIVE_VERSION = /hotspot_(\d+(?:\.\d+)*)_(\d+)\.(?:zip|tar\.gz)$/;
function versionScore(name) {
    const match = ARCHIVE_VERSION.exec(name);
    if (match === null)
        return [];
    return [...match[1].split('.').map(Number), Number(match[2])];
}
function compareScore(left, right) {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
        const difference = (left[index] ?? 0) - (right[index] ?? 0);
        if (difference !== 0)
            return difference;
    }
    return 0;
}
/** Newest archive of the wanted extension from a mirror directory listing. */
export function pickMirrorArchive(html, extension) {
    let best;
    for (const match of html.matchAll(ARCHIVE_HREF)) {
        const name = match[1];
        if (!/[-_]jre_/.test(name) || !name.endsWith(extension))
            continue;
        const score = versionScore(name);
        if (best === undefined || compareScore(score, best.score) > 0)
            best = { name, score };
    }
    return best?.name;
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
function describe(error) {
    if (error instanceof DbError)
        return error.detail === undefined ? error.message : `${error.message}（${error.detail}）`;
    return messageOf(error);
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
        const tempDir = mkdtempSync(join(this.paths.dataDir, '.jre-'));
        try {
            const archive = await this.download();
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
    /** Mirror first, official Adoptium API second; both failures are reported together. */
    async download() {
        const extension = process.platform === 'win32' ? '.zip' : '.tar.gz';
        const failures = [];
        for (const source of ['mirror', 'adoptium']) {
            try {
                const url = source === 'mirror' ? await this.mirrorArchiveUrl(extension) : adoptiumUrl();
                this.log(`downloading Java ${String(JAVA_FEATURE_VERSION)} runtime: ${url}`);
                return await this.fetchArchive(url);
            }
            catch (error) {
                if (error instanceof DbError && error.code === 'unsupported')
                    throw error;
                failures.push(describe(error));
            }
        }
        throw new DbError('download-failed', '下载 Java 运行环境失败', `${failures.join('；')}。如果网络访问不了 GitHub，请手动安装 JDK 8+ 或在设置里填写 java 路径。`);
    }
    async mirrorArchiveUrl(extension) {
        const listing = tunaMirrorUrl();
        let response;
        try {
            response = await this.fetchImpl(listing, { signal: AbortSignal.timeout(LISTING_TIMEOUT_MS) });
        }
        catch (error) {
            throw new DbError('download-failed', `无法访问 Java 镜像 ${listing}`, messageOf(error));
        }
        if (!response.ok) {
            throw new DbError('download-failed', `访问 Java 镜像失败（HTTP ${String(response.status)}）`, listing);
        }
        const html = await response.text();
        const name = pickMirrorArchive(html, extension);
        if (name === undefined) {
            throw new DbError('download-failed', 'Java 镜像里没有找到可下载的运行环境', listing);
        }
        return new URL(name, listing).toString();
    }
    async fetchArchive(url) {
        let response;
        try {
            response = await this.fetchImpl(url, {
                redirect: 'follow',
                signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
            });
        }
        catch (error) {
            throw new DbError('download-failed', `无法访问 ${url}`, messageOf(error));
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
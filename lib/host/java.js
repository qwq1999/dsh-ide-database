import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
function isFile(path) {
    try {
        return statSync(path).isFile();
    }
    catch {
        return false;
    }
}
function isDirectory(path) {
    try {
        return statSync(path).isDirectory();
    }
    catch {
        return false;
    }
}
/** Accepts either a java executable or a JAVA_HOME-style directory. */
function javaExecutable(candidate) {
    if (candidate === '')
        return undefined;
    if (isFile(candidate))
        return candidate;
    if (isDirectory(candidate)) {
        for (const name of ['java.exe', 'java']) {
            const bin = join(candidate, 'bin', name);
            if (isFile(bin))
                return bin;
        }
    }
    return undefined;
}
function probe(candidate, source) {
    const executable = candidate === 'java' ? 'java' : javaExecutable(candidate);
    if (executable === undefined)
        return undefined;
    try {
        const result = spawnSync(executable, ['-version'], { encoding: 'utf8', timeout: 15_000, windowsHide: true });
        if (result.error !== undefined || result.status !== 0)
            return undefined;
        const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
        const match = /version\s+"([^"]+)"/.exec(output);
        if (match === null)
            return undefined;
        const version = match[1];
        const major = version.startsWith('1.') ? Number(version.split('.')[1]) : Number(version.split('.')[0]);
        if (!Number.isInteger(major) || major < 8)
            return undefined;
        return { path: executable, version, major, source };
    }
    catch {
        return undefined;
    }
}
function jdkCandidates() {
    const roots = [join(homedir(), '.jdks')];
    if (process.platform === 'win32') {
        roots.push('C:\\Program Files\\Java', 'C:\\Program Files\\Eclipse Adoptium');
    }
    else {
        roots.push('/usr/lib/jvm', '/Library/Java/JavaVirtualMachines');
    }
    const found = [];
    for (const root of roots) {
        if (!isDirectory(root))
            continue;
        let entries = [];
        try {
            entries = readdirSync(root);
        }
        catch {
            continue;
        }
        for (const entry of entries)
            found.push(join(root, entry));
    }
    return found;
}
/**
 * A runtime shipped inside the package: `jre/bin/java` next to `lib/`.
 * Release tooling can drop a jlink image there, which keeps installs
 * independent of whatever Java the machine happens to have.
 */
function bundledJavaPath(pluginRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')) {
    const executable = process.platform === 'win32' ? 'java.exe' : 'java';
    const candidate = join(pluginRoot, 'jre', 'bin', executable);
    return isFile(candidate) ? candidate : undefined;
}
/**
 * Java discovery is deliberately driver-agnostic: the bridge targets Java 8,
 * so any runtime >= 8 works and the newest installed JDK is preferred when
 * JAVA_HOME is unset.
 */
export class JavaLocator {
    lastKey;
    lastStatus;
    locate(settingsPath) {
        const key = settingsPath;
        if (this.lastKey === key && this.lastStatus !== undefined)
            return this.lastStatus;
        const failures = [];
        const attempted = [];
        const addCandidate = (candidate, source) => {
            const trimmed = candidate.trim();
            if (trimmed === '')
                return;
            attempted.push({ candidate: trimmed, source });
        };
        addCandidate(settingsPath, 'setting');
        addCandidate(bundledJavaPath() ?? '', 'bundled');
        addCandidate(process.env.JAVA_HOME ?? '', 'JAVA_HOME');
        attempted.push({ candidate: 'java', source: 'PATH' });
        for (const candidate of jdkCandidates())
            attempted.push({ candidate, source: 'jdks' });
        const probes = [];
        for (const entry of attempted) {
            const result = probe(entry.candidate, entry.source);
            if (result === undefined) {
                if (entry.candidate !== 'java')
                    failures.push(`${entry.candidate} 不可用`);
                continue;
            }
            probes.push(result);
        }
        const seen = new Set();
        const unique = [];
        for (const entry of probes) {
            const dedupeKey = process.platform === 'win32' ? entry.path.toLowerCase() : entry.path;
            if (seen.has(dedupeKey))
                continue;
            seen.add(dedupeKey);
            unique.push(entry);
        }
        // `unique` keeps discovery priority (setting → JAVA_HOME → PATH → JDK roots),
        // while the picker lists every runtime newest major first.
        const preferred = unique[0];
        const candidates = [...unique]
            .sort((a, b) => b.major - a.major || a.path.localeCompare(b.path))
            .map((entry) => ({ path: entry.path, version: entry.version, major: entry.major, source: entry.source }));
        const status = preferred !== undefined
            ? {
                available: true,
                path: preferred.path,
                version: preferred.version,
                major: preferred.major,
                source: preferred.source,
                candidates,
            }
            : {
                available: false,
                source: 'missing',
                candidates,
                message: `未找到 Java（需要 8 及以上）。${failures.length > 0 ? failures.join('；') : '请安装 JDK 或在“设置”中填写 java 路径。'}`,
            };
        this.lastKey = key;
        this.lastStatus = status;
        return status;
    }
    invalidate() {
        this.lastKey = undefined;
        this.lastStatus = undefined;
    }
    /** True when the jar path exists and looks like a compiled jar. */
    bridgeReady(bridgeJar) {
        if (!existsSync(bridgeJar))
            return false;
        try {
            return statSync(bridgeJar).size > 256;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=java.js.map
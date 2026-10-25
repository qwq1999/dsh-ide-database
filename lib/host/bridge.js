import { spawn } from 'node:child_process';
import { DbError } from './errors.js';
import { LineSplitter } from './lines.js';
const CODE_MAP = {
    cancelled: 'cancelled',
    'java-version': 'java-missing',
    'driver-load': 'driver-missing',
    timeout: 'timeout',
    sql: 'query-failed',
    'bad-request': 'invalid',
    bridge: 'bridge',
};
function messageOf(error) {
    return error instanceof Error ? error.message : String(error);
}
/**
 * One long-lived JVM per plugin process. The bridge speaks JSON-lines over
 * stdio; every request gets an id and its own timeout, so a stuck query never
 * wedges the plugin host.
 */
export class BridgeClient {
    options;
    child;
    starting;
    lines = new LineSplitter();
    stderrTail = '';
    seq = 0;
    disposed = false;
    pending = new Map();
    constructor(options) {
        this.options = options;
    }
    log(message) {
        this.options.log(message);
    }
    start() {
        if (this.child !== undefined)
            return Promise.resolve();
        if (this.starting !== undefined)
            return this.starting;
        this.starting = this.spawnOnce().finally(() => {
            this.starting = undefined;
        });
        return this.starting;
    }
    async spawnOnce() {
        if (this.disposed)
            throw new DbError('bridge', '插件已卸载，无法启动数据库桥');
        this.log(`starting java bridge: ${this.options.javaPath} -cp ${this.options.bridgeJar} dshdb.Bridge`);
        const child = spawn(this.options.javaPath, ['-cp', this.options.bridgeJar, 'dshdb.Bridge'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true,
        });
        this.child = child;
        this.lines.reset();
        this.stderrTail = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', (chunk) => this.onStdout(chunk));
        child.stderr.on('data', (chunk) => {
            this.stderrTail = `${this.stderrTail}${chunk}`.slice(-8_192);
            this.log(`bridge stderr: ${chunk.trim()}`);
        });
        child.on('error', (error) => {
            this.failAll(new DbError('bridge', `无法启动 Java 进程：${messageOf(error)}`, this.stderrTail || undefined));
        });
        child.on('exit', (code, signal) => {
            this.child = undefined;
            this.failAll(new DbError('bridge', `Java 数据库桥已退出（code=${String(code)}, signal=${String(signal)}）`, this.stderrTail || undefined));
        });
        const ping = await this.request('ping', {}, 15_000);
        this.log(`java bridge ready (${String(ping.java ?? 'unknown')})`);
    }
    onStdout(chunk) {
        for (const line of this.lines.push(chunk)) {
            const text = line.trim();
            if (text !== '')
                this.onLine(text);
        }
    }
    onLine(line) {
        let envelope;
        try {
            envelope = JSON.parse(line);
        }
        catch {
            this.log(`bridge non-JSON output: ${line.slice(0, 300)}`);
            return;
        }
        if (envelope.id === undefined) {
            if (envelope.event !== undefined)
                this.log(`bridge event: ${envelope.event} ${String(envelope.message ?? '')}`);
            return;
        }
        const pending = this.pending.get(envelope.id);
        if (pending === undefined)
            return;
        this.pending.delete(envelope.id);
        clearTimeout(pending.timer);
        if (envelope.ok === true) {
            pending.resolve(envelope.data);
            return;
        }
        const code = envelope.error?.code ?? 'bridge';
        const mapped = CODE_MAP[code] ?? 'bridge';
        pending.reject(new DbError(mapped, envelope.error?.message ?? '数据库桥返回未知错误', envelope.error?.detail));
    }
    request(method, params, timeoutMs = 60_000) {
        if (this.disposed)
            return Promise.reject(new DbError('bridge', '插件已卸载'));
        const child = this.child;
        if (child === undefined || child.stdin.destroyed)
            return Promise.reject(new DbError('bridge', 'Java 数据库桥未启动'));
        const id = `${++this.seq}`;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new DbError('timeout', `数据库操作超时（${Math.round(timeoutMs / 1000)} 秒）`, method));
            }, timeoutMs);
            timer.unref();
            this.pending.set(id, { resolve: resolve, reject, timer });
            const payload = `${JSON.stringify({ id, method, params })}\n`;
            child.stdin.write(payload, (error) => {
                if (error === null || error === undefined)
                    return;
                this.pending.delete(id);
                clearTimeout(timer);
                reject(new DbError('bridge', `写入 Java 桥失败：${messageOf(error)}`));
            });
        });
    }
    failAll(error) {
        for (const [id, pending] of this.pending) {
            clearTimeout(pending.timer);
            pending.reject(error);
            this.pending.delete(id);
        }
    }
    dispose() {
        this.disposed = true;
        const child = this.child;
        this.child = undefined;
        this.failAll(new DbError('bridge', '插件已卸载'));
        if (child === undefined)
            return;
        try {
            child.stdin.write(`${JSON.stringify({ id: 'close', method: 'closeAll', params: {} })}\n`);
            child.stdin.end();
        }
        catch {
            // ignore
        }
        const timer = setTimeout(() => {
            try {
                child.kill();
            }
            catch {
                // ignore
            }
        }, 2_000);
        timer.unref();
    }
}
//# sourceMappingURL=bridge.js.map
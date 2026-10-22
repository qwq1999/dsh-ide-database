import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

import { DbError } from './errors.js'

export interface BridgeOptions {
  javaPath: string
  bridgeJar: string
  log: (message: string) => void
}

interface Pending {
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
  timer: NodeJS.Timeout
}

interface Envelope {
  id?: string
  ok?: boolean
  data?: unknown
  error?: { code?: string; message?: string; detail?: string }
  event?: string
  message?: string
}

const CODE_MAP: Record<string, 'cancelled' | 'java-missing' | 'driver-missing' | 'timeout' | 'query-failed' | 'invalid' | 'bridge'> = {
  cancelled: 'cancelled',
  'java-version': 'java-missing',
  'driver-load': 'driver-missing',
  timeout: 'timeout',
  sql: 'query-failed',
  'bad-request': 'invalid',
  bridge: 'bridge',
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * One long-lived JVM per plugin process. The bridge speaks JSON-lines over
 * stdio; every request gets an id and its own timeout, so a stuck query never
 * wedges the plugin host.
 */
export class BridgeClient {
  private child: ChildProcessWithoutNullStreams | undefined
  private starting: Promise<void> | undefined
  private buffer = ''
  private stderrTail = ''
  private seq = 0
  private disposed = false
  private readonly pending = new Map<string, Pending>()

  constructor(private readonly options: BridgeOptions) {}

  private log(message: string): void {
    this.options.log(message)
  }

  start(): Promise<void> {
    if (this.child !== undefined) return Promise.resolve()
    if (this.starting !== undefined) return this.starting
    this.starting = this.spawnOnce().finally(() => {
      this.starting = undefined
    })
    return this.starting
  }

  private async spawnOnce(): Promise<void> {
    if (this.disposed) throw new DbError('bridge', '插件已卸载，无法启动数据库桥')
    this.log(`starting java bridge: ${this.options.javaPath} -cp ${this.options.bridgeJar} dshdb.Bridge`)
    const child = spawn(this.options.javaPath, ['-cp', this.options.bridgeJar, 'dshdb.Bridge'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    }) as ChildProcessWithoutNullStreams
    this.child = child
    this.buffer = ''
    this.stderrTail = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => this.onStdout(chunk))
    child.stderr.on('data', (chunk: string) => {
      this.stderrTail = `${this.stderrTail}${chunk}`.slice(-8_192)
      this.log(`bridge stderr: ${chunk.trim()}`)
    })
    child.on('error', (error) => {
      this.failAll(new DbError('bridge', `无法启动 Java 进程：${messageOf(error)}`, this.stderrTail || undefined))
    })
    child.on('exit', (code, signal) => {
      this.child = undefined
      this.failAll(new DbError('bridge', `Java 数据库桥已退出（code=${String(code)}, signal=${String(signal)}）`, this.stderrTail || undefined))
    })
    const ping = await this.request<{ java?: string; vm?: string }>('ping', {}, 15_000)
    this.log(`java bridge ready (${String(ping.java ?? 'unknown')})`)
  }

  private onStdout(chunk: string): void {
    this.buffer += chunk
    let index = this.buffer.indexOf('\n')
    while (index >= 0) {
      const line = this.buffer.slice(0, index).trim()
      this.buffer = this.buffer.slice(index + 1)
      if (line !== '') this.onLine(line)
      index = this.buffer.indexOf('\n')
    }
  }

  private onLine(line: string): void {
    let envelope: Envelope
    try {
      envelope = JSON.parse(line) as Envelope
    } catch {
      this.log(`bridge non-JSON output: ${line.slice(0, 300)}`)
      return
    }
    if (envelope.id === undefined) {
      if (envelope.event !== undefined) this.log(`bridge event: ${envelope.event} ${String(envelope.message ?? '')}`)
      return
    }
    const pending = this.pending.get(envelope.id)
    if (pending === undefined) return
    this.pending.delete(envelope.id)
    clearTimeout(pending.timer)
    if (envelope.ok === true) {
      pending.resolve(envelope.data)
      return
    }
    const code = envelope.error?.code ?? 'bridge'
    const mapped = CODE_MAP[code] ?? 'bridge'
    pending.reject(
      new DbError(
        mapped,
        envelope.error?.message ?? '数据库桥返回未知错误',
        envelope.error?.detail,
      ),
    )
  }

  request<T>(method: string, params: Record<string, unknown>, timeoutMs = 60_000): Promise<T> {
    if (this.disposed) return Promise.reject(new DbError('bridge', '插件已卸载'))
    const child = this.child
    if (child === undefined || child.stdin.destroyed) return Promise.reject(new DbError('bridge', 'Java 数据库桥未启动'))
    const id = `${++this.seq}`
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new DbError('timeout', `数据库操作超时（${Math.round(timeoutMs / 1000)} 秒）`, method))
      }, timeoutMs)
      timer.unref()
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer })
      const payload = `${JSON.stringify({ id, method, params })}\n`
      child.stdin.write(payload, (error) => {
        if (error === null || error === undefined) return
        this.pending.delete(id)
        clearTimeout(timer)
        reject(new DbError('bridge', `写入 Java 桥失败：${messageOf(error)}`))
      })
    })
  }

  private failAll(error: DbError): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(error)
      this.pending.delete(id)
    }
  }

  dispose(): void {
    this.disposed = true
    const child = this.child
    this.child = undefined
    this.failAll(new DbError('bridge', '插件已卸载'))
    if (child === undefined) return
    try {
      child.stdin.write(`${JSON.stringify({ id: 'close', method: 'closeAll', params: {} })}\n`)
      child.stdin.end()
    } catch {
      // ignore
    }
    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        // ignore
      }
    }, 2_000)
    timer.unref()
  }
}

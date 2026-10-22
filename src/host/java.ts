import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import type { JavaStatus } from '../shared/types.js'

interface Probe {
  path: string
  version: string
  major: number
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** Accepts either a java executable or a JAVA_HOME-style directory. */
function javaExecutable(candidate: string): string | undefined {
  if (candidate === '') return undefined
  if (isFile(candidate)) return candidate
  if (isDirectory(candidate)) {
    for (const name of ['java.exe', 'java']) {
      const bin = join(candidate, 'bin', name)
      if (isFile(bin)) return bin
    }
  }
  return undefined
}

function probe(candidate: string, source: JavaStatus['source']): Probe | undefined {
  const executable = candidate === 'java' ? 'java' : javaExecutable(candidate)
  if (executable === undefined) return undefined
  try {
    const result = spawnSync(executable, ['-version'], { encoding: 'utf8', timeout: 15_000, windowsHide: true })
    if (result.error !== undefined || result.status !== 0) return undefined
    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
    const match = /version\s+"([^"]+)"/.exec(output)
    if (match === null) return undefined
    const version = match[1]
    const major = version.startsWith('1.') ? Number(version.split('.')[1]) : Number(version.split('.')[0])
    if (!Number.isInteger(major) || major < 8) return undefined
    return { path: executable, version, major }
  } catch {
    return undefined
  }
}

function jdkCandidates(): string[] {
  const roots = [join(homedir(), '.jdks')]
  if (process.platform === 'win32') {
    roots.push('C:\\Program Files\\Java', 'C:\\Program Files\\Eclipse Adoptium')
  } else {
    roots.push('/usr/lib/jvm', '/Library/Java/JavaVirtualMachines')
  }
  const found: string[] = []
  for (const root of roots) {
    if (!isDirectory(root)) continue
    let entries: string[] = []
    try {
      entries = readdirSync(root)
    } catch {
      continue
    }
    for (const entry of entries) found.push(join(root, entry))
  }
  return found
}

/**
 * Java discovery is deliberately driver-agnostic: the bridge targets Java 8,
 * so any runtime >= 8 works and the newest installed JDK is preferred when
 * JAVA_HOME is unset.
 */
export class JavaLocator {
  private lastKey: string | undefined
  private lastStatus: JavaStatus | undefined

  locate(settingsPath: string): JavaStatus {
    const key = settingsPath
    if (this.lastKey === key && this.lastStatus !== undefined) return this.lastStatus
    const failures: string[] = []
    const tryCandidate = (candidate: string, source: JavaStatus['source']): JavaStatus | undefined => {
      const result = probe(candidate, source)
      if (result === undefined) {
        if (candidate !== '' && candidate !== 'java') failures.push(`${candidate} 不可用`)
        return undefined
      }
      return { available: true, path: result.path, version: result.version, major: result.major, source }
    }

    let status: JavaStatus | undefined
    if (settingsPath.trim() !== '') status = tryCandidate(settingsPath.trim(), 'setting')
    const javaHome = process.env.JAVA_HOME?.trim()
    if (status === undefined && javaHome !== undefined && javaHome !== '') status = tryCandidate(javaHome, 'JAVA_HOME')
    if (status === undefined) status = tryCandidate('java', 'PATH')
    if (status === undefined) {
      const candidates = jdkCandidates()
        .map((candidate) => ({ candidate, probe: probe(candidate, 'jdks') }))
        .filter((entry): entry is { candidate: string; probe: Probe } => entry.probe !== undefined)
        .sort((a, b) => b.probe.major - a.probe.major)
      const best = candidates[0]
      if (best !== undefined) {
        status = { available: true, path: best.probe.path, version: best.probe.version, major: best.probe.major, source: 'jdks' }
      }
    }

    if (status === undefined) {
      status = {
        available: false,
        source: 'missing',
        message: `未找到 Java（需要 8 及以上）。${failures.length > 0 ? failures.join('；') : '请安装 JDK 或在“设置”中填写 java 路径。'}`,
      }
    }
    this.lastKey = key
    this.lastStatus = status
    return status
  }

  invalidate(): void {
    this.lastKey = undefined
    this.lastStatus = undefined
  }

  /** True when the jar path exists and looks like a compiled jar. */
  bridgeReady(bridgeJar: string): boolean {
    if (!existsSync(bridgeJar)) return false
    try {
      return statSync(bridgeJar).size > 256
    } catch {
      return false
    }
  }
}

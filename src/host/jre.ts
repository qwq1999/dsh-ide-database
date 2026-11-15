import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { extractArchive } from './archive.js'
import { DbError } from './errors.js'
import { readResponseLimited, readResponseTextLimited } from './httpbody.js'
import type { PluginPaths } from './paths.js'

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

export const JAVA_FEATURE_VERSION = 21
const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000
/** The mirror listing is a few KB; do not let a blocked mirror stall the install. */
const LISTING_TIMEOUT_MS = 20 * 1000
/** A real mirror listing is a few KB; cap a hostile response before decoding it. */
const MAX_LISTING_BYTES = 2 * 1024 * 1024
/** A real JRE archive is 40 MB+; anything smaller is an error page or truncation. */
const MIN_ARCHIVE_BYTES = 10 * 1024 * 1024
/** A real JRE archive is well below this; reject an oversized mirror response before buffering it. */
const MAX_DOWNLOAD_BYTES = 512 * 1024 * 1024
const TUNA_MIRROR = 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium'

const OS: Partial<Record<NodeJS.Platform, string>> = {
  win32: 'windows',
  darwin: 'mac',
  linux: 'linux',
}

function platformTarget(platform: NodeJS.Platform, arch: string): { os: string; cpu: string } {
  const os = OS[platform]
  if (os === undefined) throw new DbError('unsupported', `暂不支持为 ${platform} 自动下载 Java，请手动安装 JDK 8+`)
  const cpu = arch === 'arm64' ? 'aarch64' : arch === 'x64' ? 'x64' : undefined
  if (cpu === undefined) throw new DbError('unsupported', `暂不支持为 ${arch} 自动下载 Java，请手动安装 JDK 8+`)
  return { os, cpu }
}

export function adoptiumUrl(platform: NodeJS.Platform = process.platform, arch: string = process.arch): string {
  const { os, cpu } = platformTarget(platform, arch)
  return `https://api.adoptium.net/v3/binary/latest/${String(JAVA_FEATURE_VERSION)}/ga/${os}/${cpu}/jre/hotspot/normal/eclipse`
}

/** Directory listing of `OpenJDK21U-jre_*` archives on the TUNA mirror. */
export function tunaMirrorUrl(platform: NodeJS.Platform = process.platform, arch: string = process.arch): string {
  const { os, cpu } = platformTarget(platform, arch)
  return `${TUNA_MIRROR}/${String(JAVA_FEATURE_VERSION)}/jre/${cpu}/${os}/`
}

const ARCHIVE_HREF = /href="([^"]+\.(?:zip|tar\.gz))"/g
const ARCHIVE_VERSION = /hotspot_(\d+(?:\.\d+)*)_(\d+)\.(?:zip|tar\.gz)$/

function versionScore(name: string): number[] {
  const match = ARCHIVE_VERSION.exec(name)
  if (match === null) return []
  return [...match[1].split('.').map(Number), Number(match[2])]
}

function compareScore(left: number[], right: number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

/** Newest archive of the wanted extension from a mirror directory listing. */
export function pickMirrorArchive(html: string, extension: string): string | undefined {
  let best: { name: string; score: number[] } | undefined
  for (const match of html.matchAll(ARCHIVE_HREF)) {
    const name = match[1]
    if (!/[-_]jre_/.test(name) || !name.endsWith(extension)) continue
    const score = versionScore(name)
    if (best === undefined || compareScore(score, best.score) > 0) best = { name, score }
  }
  return best?.name
}

/** Resolve a listing link but never let a mirror redirect the download to another origin. */
export function resolveMirrorArchive(listing: string, name: string): string | undefined {
  const base = new URL(listing)
  const url = new URL(name, base)
  return url.origin === base.origin ? url.toString() : undefined
}

export function javaExecutablePath(directory: string, platform: NodeJS.Platform = process.platform): string {
  return join(directory, 'bin', platform === 'win32' ? 'java.exe' : 'java')
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** The archive root (`jdk-21.0.5+11-jre`, or `.../Contents/Home` on macOS) holding `bin/java`. */
export function findRuntimeRoot(directory: string, platform: NodeJS.Platform = process.platform): string | undefined {
  if (existsSync(javaExecutablePath(directory, platform))) return directory
  let entries: string[] = []
  try {
    entries = readdirSync(directory)
  } catch {
    return undefined
  }
  for (const entry of entries) {
    const child = join(directory, entry)
    if (!isDirectory(child)) continue
    if (existsSync(javaExecutablePath(child, platform))) return child
    const bundle = join(child, 'Contents', 'Home')
    if (existsSync(javaExecutablePath(bundle, platform))) return bundle
  }
  return undefined
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function describe(error: unknown): string {
  if (error instanceof DbError) return error.detail === undefined ? error.message : `${error.message}（${error.detail}）`
  return messageOf(error)
}

export class JreManager {
  private inFlight: Promise<void> | undefined

  constructor(
    private readonly paths: PluginPaths,
    private readonly log: (message: string) => void = () => {},
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** True once a downloaded runtime sits at `<data>/jre/bin/java(.exe)`. */
  get installed(): boolean {
    return existsSync(javaExecutablePath(this.paths.jreDir))
  }

  async install(): Promise<void> {
    if (this.installed) return
    if (this.inFlight !== undefined) return this.inFlight
    const task = this.performInstall().finally(() => {
      this.inFlight = undefined
    })
    this.inFlight = task
    return task
  }

  private async performInstall(): Promise<void> {
    const tempDir = mkdtempSync(join(this.paths.dataDir, '.jre-'))
    try {
      const archive = await this.download()
      const unpacked = join(tempDir, 'unpacked')
      mkdirSync(unpacked, { recursive: true })
      let root: string | undefined
      try {
        extractArchive(archive, unpacked)
        root = findRuntimeRoot(unpacked)
      } catch (error) {
        throw new DbError('download-failed', '解压 Java 运行环境失败', messageOf(error))
      }
      if (root === undefined) {
        throw new DbError('download-failed', '下载的 Java 运行环境不完整', '解压后没有找到 bin/java')
      }
      rmSync(this.paths.jreDir, { recursive: true, force: true })
      renameSync(root, this.paths.jreDir)
      this.log(`Java runtime installed: ${javaExecutablePath(this.paths.jreDir)}`)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  }

  /** Mirror first, official Adoptium API second; both failures are reported together. */
  private async download(): Promise<Buffer> {
    const extension = process.platform === 'win32' ? '.zip' : '.tar.gz'
    const failures: string[] = []
    for (const source of ['mirror', 'adoptium'] as const) {
      try {
        const url = source === 'mirror' ? await this.mirrorArchiveUrl(extension) : adoptiumUrl()
        this.log(`downloading Java ${String(JAVA_FEATURE_VERSION)} runtime: ${url}`)
        return await this.fetchArchive(url, source === 'mirror' ? new URL(url).origin : undefined)
      } catch (error) {
        if (error instanceof DbError && error.code === 'unsupported') throw error
        failures.push(describe(error))
      }
    }
    throw new DbError(
      'download-failed',
      '下载 Java 运行环境失败',
      `${failures.join('；')}。如果网络访问不了 GitHub，请手动安装 JDK 8+ 或在设置里填写 java 路径。`,
    )
  }

  private async mirrorArchiveUrl(extension: string): Promise<string> {
    const listing = tunaMirrorUrl()
    let response: Response
    try {
      response = await this.fetchImpl(listing, { signal: AbortSignal.timeout(LISTING_TIMEOUT_MS) })
    } catch (error) {
      throw new DbError('download-failed', `无法访问 Java 镜像 ${listing}`, messageOf(error))
    }
    if (!response.ok) {
      throw new DbError('download-failed', `访问 Java 镜像失败（HTTP ${String(response.status)}）`, listing)
    }
    const html = await readResponseTextLimited(
      response,
      MAX_LISTING_BYTES,
      (size) =>
        new DbError(
          'download-failed',
          'Java 镜像列表过大',
          `列表超过 ${String(MAX_LISTING_BYTES)} 字节（收到 ${String(size)} 字节）`,
        ),
    )
    const name = pickMirrorArchive(html, extension)
    if (name === undefined) {
      throw new DbError('download-failed', 'Java 镜像里没有找到可下载的运行环境', listing)
    }
    const archive = resolveMirrorArchive(listing, name)
    if (archive === undefined) {
      throw new DbError('download-failed', 'Java 镜像返回了外部下载地址', listing)
    }
    return archive
  }

  /** A mirror archive may redirect, but never to another origin. */
  private async fetchFollowingSameOrigin(url: string, origin: string, signal: AbortSignal): Promise<Response> {
    let current = url
    for (let hop = 0; hop < 5; hop += 1) {
      const response = await this.fetchImpl(current, { redirect: 'manual', signal })
      if (response.status < 300 || response.status >= 400) return response
      const location = response.headers.get('location')
      if (location === null) return response
      const next = new URL(location, current)
      await response.body?.cancel()
      if (next.origin !== origin) {
        throw new DbError('download-failed', 'Java 镜像重定向到外部地址', next.toString())
      }
      current = next.toString()
    }
    throw new DbError('download-failed', 'Java 镜像重定向次数过多', url)
  }

  private async fetchArchive(url: string, allowedOrigin?: string): Promise<Buffer> {
    let response: Response
    try {
      response =
        allowedOrigin === undefined
          ? await this.fetchImpl(url, {
              redirect: 'follow',
              signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
            })
          : await this.fetchFollowingSameOrigin(url, allowedOrigin, AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS))
    } catch (error) {
      if (error instanceof DbError) throw error
      throw new DbError('download-failed', `无法访问 ${url}`, messageOf(error))
    }
    if (!response.ok) {
      throw new DbError('download-failed', `下载 Java 运行环境失败（HTTP ${String(response.status)}）`, url)
    }
    const tooLarge = (size: number): DbError =>
      new DbError(
        'download-failed',
        '下载的 Java 运行环境过大',
        `安装包超过 ${String(MAX_DOWNLOAD_BYTES)} 字节（收到 ${String(size)} 字节）`,
      )
    let buffer: Buffer
    try {
      buffer = await readResponseLimited(response, MAX_DOWNLOAD_BYTES, tooLarge)
    } catch (error) {
      if (error instanceof DbError) throw error
      throw new DbError('download-failed', '读取 Java 运行环境安装包失败', messageOf(error))
    }
    if (buffer.length < MIN_ARCHIVE_BYTES) {
      throw new DbError('download-failed', '下载的 Java 运行环境不完整', `只收到 ${String(buffer.length)} 字节`)
    }
    return buffer
  }
}

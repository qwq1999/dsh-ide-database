import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { crc32, gzipSync } from 'node:zlib'
import { randomBytes } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'

import {
  archivePath,
  assertArchiveEntries,
  extractArchive,
  extractTarGz,
  extractZip,
  MAX_ARCHIVE_ENTRIES,
  MAX_ARCHIVE_ENTRY_BYTES,
  safeArchiveLink,
} from '../../lib/host/archive.js'
import { adoptiumUrl, findRuntimeRoot, JreManager, pickMirrorArchive, tunaMirrorUrl } from '../../lib/host/jre.js'

const JAVA_BIN = process.platform === 'win32' ? 'java.exe' : 'java'
const tempDirs = []

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'dshdb-jre-'))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

/** Minimal STORED (method 0) zip with one entry per `[name, data, mode]` triple. */
function buildZip(entries) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, data, mode = 0o755] of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const checksum = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt32LE(checksum, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(0x0314, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt32LE(checksum, 16)
    central.writeUInt32LE(data.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(((0o100000 | mode) << 16) >>> 0, 38)
    central.writeUInt32LE(offset, 42)
    locals.push(local, nameBuf, data)
    centrals.push(central, nameBuf)
    offset += local.length + nameBuf.length + data.length
  }
  const centralDir = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralDir.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralDir, eocd])
}

/** Minimal ustar tar with one regular-file entry per `[name, data, mode]` triple. */
function buildTar(entries) {
  const blocks = []
  for (const [name, data, mode = 0o755] of entries) {
    const header = Buffer.alloc(512)
    header.write(name, 0, 'utf8')
    header.write(`${mode.toString(8).padStart(7, '0')}\0`, 100, 'utf8')
    header.write('0000000\0', 108, 'utf8')
    header.write('0000000\0', 116, 'utf8')
    header.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124, 'utf8')
    header.write('00000000000\0', 136, 'utf8')
    header.write('        ', 148, 'utf8')
    header.write('0', 156, 'utf8')
    header.write('ustar\0', 257, 'utf8')
    header.write('00', 263, 'utf8')
    let sum = 0
    for (const byte of header) sum += byte
    header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 'utf8')
    const padding = Buffer.alloc((512 - (data.length % 512)) % 512)
    blocks.push(header, data, padding)
  }
  blocks.push(Buffer.alloc(1024))
  return Buffer.concat(blocks)
}

describe('archive extraction', () => {
  it('unpacks a stored zip and keeps the entry bytes', () => {
    const target = tempDir()
    extractZip(buildZip([[`jdk-21/bin/${JAVA_BIN}`, Buffer.from('java-bytes')]]), target)
    expect(readFileSync(join(target, 'jdk-21', 'bin', JAVA_BIN), 'utf8')).toBe('java-bytes')
  })

  it('skips zip entries that would escape the destination', () => {
    const target = tempDir()
    extractZip(buildZip([['../evil.txt', Buffer.from('nope')]]), target)
    expect(existsSync(join(target, '..', 'evil.txt'))).toBe(false)
    expect(existsSync(join(target, 'evil.txt'))).toBe(false)
  })

  it('rejects a zip entry whose declared size exceeds the extraction limit', () => {
    const target = tempDir()
    const zip = buildZip([['big.txt', Buffer.from('x')]])
    const central = zip.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
    expect(central).toBeGreaterThanOrEqual(0)
    zip.writeUInt32LE(MAX_ARCHIVE_ENTRY_BYTES + 1, central + 24)
    expect(() => extractZip(zip, target)).toThrow(/条目过大/)
    expect(existsSync(join(target, 'big.txt'))).toBe(false)
  })

  it('rejects a tar entry whose declared size exceeds the extraction limit', () => {
    const target = tempDir()
    const tar = buildTar([['big.txt', Buffer.from('x')]])
    tar.write(`${(MAX_ARCHIVE_ENTRY_BYTES + 1).toString(8).padStart(11, '0')}\0`, 124, 'utf8')
    expect(() => extractTarGz(gzipSync(tar), target)).toThrow(/tar 条目过大/)
    expect(existsSync(join(target, 'big.txt'))).toBe(false)
  })

  it('rejects Windows-normalized archive paths', () => {
    if (process.platform !== 'win32') return
    expect(archivePath('.. /evil')).toBeUndefined()
    expect(archivePath('CON')).toBeUndefined()
    expect(archivePath('foo. ')).toBeUndefined()
    expect(archivePath('foo:bar')).toBeUndefined()
    expect(archivePath('dir/file.txt')).toBe('dir/file.txt')
    expect(safeArchiveLink(tempDir(), 'jdk/bin/java', '.. /evil')).toBeUndefined()
  })

  it('keeps tar symlink targets inside the extraction directory', () => {
    const target = tempDir()
    expect(safeArchiveLink(target, 'jdk-21/bin/java', '../lib/java')).toBe(join(target, 'jdk-21', 'lib', 'java'))
    expect(safeArchiveLink(target, 'jdk-21/bin/java', '..foo')).toBe(join(target, 'jdk-21', 'bin', '..foo'))
    expect(safeArchiveLink(target, 'jdk-21/bin/java', '../../../evil')).toBeUndefined()
    expect(safeArchiveLink(target, 'jdk-21/bin/java', '/etc/passwd')).toBeUndefined()
    expect(safeArchiveLink(target, 'jdk-21/bin/java', '')).toBeUndefined()
  })

  it('rejects negative tar sizes instead of looping forever', () => {
    const target = tempDir()
    const header = Buffer.alloc(512)
    header.write('evil.txt', 0, 'utf8')
    header.write('-1001\0', 124, 'utf8')
    const archive = gzipSync(Buffer.concat([header, Buffer.alloc(1024)]))
    expect(() => extractTarGz(archive, target)).toThrow('tar 条目大小非法')
  })

  it('rejects a tar header whose checksum was corrupted', () => {
    const target = tempDir()
    const tar = buildTar([['evil.txt', Buffer.from('payload')]])
    tar[0] ^= 0x01
    expect(() => extractTarGz(gzipSync(tar), target)).toThrow('tar 头校验和非法')
  })

  it('caps the number of archive entries', () => {
    expect(() => assertArchiveEntries(MAX_ARCHIVE_ENTRIES)).not.toThrow()
    expect(() => assertArchiveEntries(MAX_ARCHIVE_ENTRIES + 1)).toThrow('归档条目过多')
  })

  it('unpacks tar.gz entries and keeps bin/java executable on Unix', () => {
    const target = tempDir()
    const archive = gzipSync(
      buildTar([
        [`jdk-21/bin/${JAVA_BIN}`, Buffer.from('java-bytes')],
        ['jdk-21/filler.bin', randomBytes(10.5 * 1024 * 1024)],
      ]),
    )
    extractTarGz(archive, target)
    const executable = join(target, 'jdk-21', 'bin', JAVA_BIN)
    expect(readFileSync(executable, 'utf8')).toBe('java-bytes')
    if (process.platform !== 'win32') expect(statSync(executable).mode & 0o111).not.toBe(0)
  })

  it('rejects a zip shorter than its end-of-central-directory record', () => {
    const target = tempDir()
    expect(() => extractZip(Buffer.from([0x50, 0x4b, 0x03, 0x04]), target)).toThrow('zip 文件缺少中央目录')
  })

  it('rejects data that is neither zip nor gzip', () => {
    expect(() => extractArchive(Buffer.from('not an archive'), tempDir())).toThrow(/无法识别/)
  })
})

describe('Adoptium URL', () => {
  it('maps supported platforms onto the binaries API', () => {
    expect(adoptiumUrl('win32', 'x64')).toBe(
      'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jre/hotspot/normal/eclipse',
    )
    expect(adoptiumUrl('darwin', 'arm64')).toContain('/mac/aarch64/jre/hotspot/normal/eclipse')
    expect(adoptiumUrl('linux', 'x64')).toContain('/linux/x64/jre/hotspot/normal/eclipse')
  })

  it('refuses platforms without a Temurin build', () => {
    expect(() => adoptiumUrl('freebsd', 'x64')).toThrow(/暂不支持/)
    expect(() => adoptiumUrl('linux', 's390x')).toThrow(/暂不支持/)
  })
})

describe('runtime root discovery', () => {
  const platform = process.platform

  it('returns the directory itself when bin/java sits at the top', () => {
    const dir = tempDir()
    mkdirSync(join(dir, 'bin'), { recursive: true })
    writeFileSync(join(dir, 'bin', JAVA_BIN), '')
    expect(findRuntimeRoot(dir, platform)).toBe(dir)
  })

  it('looks one level down, including the macOS bundle layout', () => {
    const dir = tempDir()
    mkdirSync(join(dir, 'jdk-21.0.2+13-jre', 'bin'), { recursive: true })
    writeFileSync(join(dir, 'jdk-21.0.2+13-jre', 'bin', JAVA_BIN), '')
    expect(findRuntimeRoot(dir, platform)).toBe(join(dir, 'jdk-21.0.2+13-jre'))

    const mac = tempDir()
    mkdirSync(join(mac, 'jdk-21.jdk', 'Contents', 'Home', 'bin'), { recursive: true })
    writeFileSync(join(mac, 'jdk-21.jdk', 'Contents', 'Home', 'bin', 'java'), '')
    expect(findRuntimeRoot(mac, 'darwin')).toBe(join(mac, 'jdk-21.jdk', 'Contents', 'Home'))
  })

  it('returns undefined when nothing looks like a runtime', () => {
    expect(findRuntimeRoot(tempDir(), platform)).toBeUndefined()
  })
})

describe('mirror listing', () => {
  const listing = `
    <a href="OpenJDK21U-jre_x64_windows_hotspot_21.0.12_1.zip">old</a>
    <a href="OpenJDK21U-jre_x64_windows_hotspot_21.0.13_9.zip">new</a>
    <a href="OpenJDK21U-jre_aarch64_linux_hotspot_21.0.13_9.tar.gz">arm</a>
    <a href="../">parent</a>
  `

  it('points at the TUNA mirror of the Adoptium builds', () => {
    expect(tunaMirrorUrl('win32', 'x64')).toBe('https://mirrors.tuna.tsinghua.edu.cn/Adoptium/21/jre/x64/windows/')
    expect(tunaMirrorUrl('darwin', 'arm64')).toContain('/Adoptium/21/jre/aarch64/mac/')
    expect(tunaMirrorUrl('linux', 'x64')).toContain('/Adoptium/21/jre/x64/linux/')
  })

  it('picks the newest archive of the requested extension', () => {
    expect(pickMirrorArchive(listing, '.zip')).toBe('OpenJDK21U-jre_x64_windows_hotspot_21.0.13_9.zip')
    expect(pickMirrorArchive(listing, '.tar.gz')).toBe('OpenJDK21U-jre_aarch64_linux_hotspot_21.0.13_9.tar.gz')
    expect(pickMirrorArchive('<html>no archives</html>', '.zip')).toBeUndefined()
  })
})

describe('JreManager', () => {
  const LISTING = '<a href="OpenJDK21U-jre_x64_windows_hotspot_21.0.13_9.zip">jre</a>'

  function manager(dataDir, fetchImpl) {
    const logs = []
    return {
      jre: new JreManager({ dataDir, jreDir: join(dataDir, 'jre') }, (line) => logs.push(line), fetchImpl),
      logs,
    }
  }

  /** Mirror listing is served locally; `respond` answers every archive URL. */
  function fakeFetch(respond, { listingOk = true } = {}) {
    const calls = []
    const impl = async (url) => {
      const href = String(url)
      calls.push(href)
      const isListing = !/\.(zip|tar\.gz)$/.test(href)
      if (href.startsWith('https://mirrors.tuna.tsinghua.edu.cn/') && isListing) {
        return listingOk ? new Response(LISTING) : new Response('nope', { status: 404 })
      }
      return respond(href)
    }
    return { impl, calls }
  }

  it('reports HTTP failures as download-failed', async () => {
    const { impl } = fakeFetch(() => new Response('nope', { status: 404 }))
    const { jre } = manager(tempDir(), impl)
    await expect(jre.install()).rejects.toMatchObject({ code: 'download-failed' })
  })

  it('rejects a truncated archive', async () => {
    const { impl } = fakeFetch(() => new Response(Buffer.from('tiny')))
    const { jre } = manager(tempDir(), impl)
    await expect(jre.install()).rejects.toMatchObject({ code: 'download-failed' })
  })

  it('rejects an oversized download before buffering it', async () => {
    const { impl } = fakeFetch(
      () => new Response(new Uint8Array(0), { headers: { 'content-length': String(512 * 1024 * 1024 + 1) } }),
    )
    const { jre } = manager(tempDir(), impl)
    await expect(jre.install()).rejects.toMatchObject({
      code: 'download-failed',
      detail: expect.stringContaining('过大'),
    })
  })

  it('falls back to the official API when the mirror listing is unavailable', async () => {
    const archive = gzipSync(
      buildTar([
        [`jdk-21/bin/${JAVA_BIN}`, Buffer.from('java-bytes')],
        ['jdk-21/filler.bin', randomBytes(10.5 * 1024 * 1024)],
      ]),
    )
    const { impl, calls } = fakeFetch(() => new Response(archive), { listingOk: false })
    const { jre } = manager(tempDir(), impl)
    await jre.install()
    expect(calls[1]).toContain('api.adoptium.net')
    expect(jre.installed).toBe(true)
  })

  it(
    'installs into <data>/jre once and stays idempotent',
    async () => {
      const dataDir = tempDir()
      const archive = gzipSync(
        buildTar([
          [`jdk-21/bin/${JAVA_BIN}`, Buffer.from('java-bytes')],
          ['jdk-21/filler.bin', randomBytes(10.5 * 1024 * 1024)],
        ]),
      )
      const { impl, calls } = fakeFetch(() => new Response(archive))
      const { jre } = manager(dataDir, impl)

      await Promise.all([jre.install(), jre.install()])

      expect(calls).toHaveLength(2)
      expect(jre.installed).toBe(true)
      expect(readFileSync(join(dataDir, 'jre', 'bin', JAVA_BIN), 'utf8')).toBe('java-bytes')
      await jre.install()
      expect(calls).toHaveLength(2)
    },
    30_000,
  )
})

import { chmodSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { gunzipSync, inflateRawSync } from 'node:zlib';
/**
 * Archive extraction for the Java runtime download. Temurin publishes `.zip`
 * on Windows and `.tar.gz` everywhere else; adding an unzip dependency for two
 * formats is not worth it, so both readers stay dependency-free.
 *
 * Every entry is written relative to `destination` and anything that would
 * escape it (absolute paths, `..`, drive letters) is skipped; symlink targets
 * must also resolve inside the destination.
 */
const BLOCK = 512;
const ZIP_LOCAL = 0x04034b50;
const ZIP_CENTRAL = 0x02014b50;
const ZIP_EOCD = 0x06054b50;
const ZIP_EOCD_SEARCH = 65_557;
function archivePath(raw) {
    const normalized = raw.replace(/\\/g, '/').replace(/^\.\/+/, '');
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized))
        return undefined;
    const parts = normalized.split('/').filter((part) => part !== '' && part !== '.');
    if (parts.length === 0 || parts.includes('..'))
        return undefined;
    return parts.join('/');
}
/**
 * `mode` matters on macOS/Linux: `bin/java` must stay executable or the
 * freshly unpacked runtime is unusable. Windows has no execute bit.
 */
function writeEntry(destination, name, data, mode) {
    const target = join(destination, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
    if (mode !== undefined && mode !== 0 && process.platform !== 'win32')
        chmodSync(target, mode & 0o777);
}
/**
 * Resolve a tar symlink target and keep it only when it stays inside the
 * extraction directory. A link like `../../outside` would otherwise let a
 * later archive entry write through it outside the destination.
 */
export function safeArchiveLink(destination, name, link) {
    if (link === '' || isAbsolute(link) || /^[A-Za-z]:/.test(link))
        return undefined;
    const resolved = resolve(dirname(join(destination, name)), link);
    const inside = relative(destination, resolved);
    if (isAbsolute(inside) || inside === '..' || inside.startsWith(`..${sep}`))
        return undefined;
    return resolved;
}
function createLink(destination, name, link) {
    const target = join(destination, name);
    if (safeArchiveLink(destination, name, link) === undefined)
        return;
    mkdirSync(dirname(target), { recursive: true });
    try {
        symlinkSync(link, target);
    }
    catch {
        // Windows needs extra privileges for symlinks; the runtime still works without them.
    }
}
function endOfCentralDirectory(zip) {
    const start = Math.max(0, zip.length - ZIP_EOCD_SEARCH);
    for (let offset = zip.length - 22; offset >= start; offset -= 1) {
        if (zip.readUInt32LE(offset) === ZIP_EOCD)
            return offset;
    }
    throw new Error('zip 文件缺少中央目录');
}
export function extractZip(zip, destination) {
    const eocd = endOfCentralDirectory(zip);
    const count = zip.readUInt16LE(eocd + 10);
    let offset = zip.readUInt32LE(eocd + 16);
    for (let index = 0; index < count; index += 1) {
        if (offset + 46 > zip.length || zip.readUInt32LE(offset) !== ZIP_CENTRAL) {
            throw new Error('zip 中央目录损坏');
        }
        const method = zip.readUInt16LE(offset + 10);
        const compressedSize = zip.readUInt32LE(offset + 20);
        const nameLength = zip.readUInt16LE(offset + 28);
        const extraLength = zip.readUInt16LE(offset + 30);
        const commentLength = zip.readUInt16LE(offset + 32);
        const localOffset = zip.readUInt32LE(offset + 42);
        // High 16 bits of the external attributes hold the Unix mode (0 on Windows-made archives).
        const unixMode = (zip.readUInt32LE(offset + 38) >>> 16) & 0o777;
        const rawName = zip.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
        offset += 46 + nameLength + extraLength + commentLength;
        if (compressedSize === 0xffffffff || localOffset === 0xffffffff)
            throw new Error('不支持 zip64 压缩包');
        const name = archivePath(rawName);
        if (name === undefined)
            continue;
        if (rawName.endsWith('/')) {
            mkdirSync(join(destination, name), { recursive: true });
            continue;
        }
        if (localOffset + 30 > zip.length || zip.readUInt32LE(localOffset) !== ZIP_LOCAL) {
            throw new Error(`zip 条目损坏：${rawName}`);
        }
        // Entry sizes are read from the central directory; data descriptors (bit 3)
        // and the local header sizes can be zero, so only the name/extra lengths
        // come from the local header.
        const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
        const raw = zip.subarray(dataStart, dataStart + compressedSize);
        if (raw.length !== compressedSize)
            throw new Error(`zip 条目数据不完整：${rawName}`);
        if (method === 0)
            writeEntry(destination, name, Buffer.from(raw), unixMode);
        else if (method === 8)
            writeEntry(destination, name, inflateRawSync(raw), unixMode);
        else
            throw new Error(`不支持 zip 压缩方式 ${String(method)}`);
    }
}
function cString(block, start, length) {
    const slice = block.subarray(start, start + length);
    const end = slice.indexOf(0);
    return (end === -1 ? slice : slice.subarray(0, end)).toString('utf8');
}
function octal(block) {
    const text = cString(block, 0, block.length).trim();
    if (text === '')
        return 0;
    const value = Number.parseInt(text, 8);
    return Number.isFinite(value) ? value : 0;
}
/** PAX extended headers are `"<length> key=value\n"` records. */
function parsePax(body) {
    const records = {};
    let offset = 0;
    while (offset < body.length) {
        const space = body.indexOf(0x20, offset);
        if (space === -1)
            break;
        const length = Number.parseInt(body.subarray(offset, space).toString('utf8'), 10);
        if (!Number.isFinite(length) || length <= 0 || offset + length > body.length)
            break;
        const record = body.subarray(space + 1, offset + length - 1).toString('utf8');
        const equals = record.indexOf('=');
        if (equals !== -1)
            records[record.slice(0, equals)] = record.slice(equals + 1);
        offset += length;
    }
    return records;
}
export function extractTarGz(archive, destination) {
    const tar = gunzipSync(archive);
    let offset = 0;
    let pax = {};
    while (offset + BLOCK <= tar.length) {
        const header = tar.subarray(offset, offset + BLOCK);
        if (header.every((byte) => byte === 0))
            break;
        const size = octal(header.subarray(124, 136));
        const mode = octal(header.subarray(100, 108));
        const type = String.fromCharCode(header[156] ?? 0);
        const prefix = cString(header, 345, 155);
        const entryName = prefix === '' ? cString(header, 0, 100) : `${prefix}/${cString(header, 0, 100)}`;
        const name = pax.path ?? entryName;
        const link = pax.linkpath ?? cString(header, 157, 100);
        offset += BLOCK;
        const body = tar.subarray(offset, offset + size);
        offset += Math.ceil(size / BLOCK) * BLOCK;
        if (type === 'x') {
            pax = { ...pax, ...parsePax(body) };
            continue;
        }
        if (type === 'g')
            continue;
        pax = {};
        const target = archivePath(name);
        if (target === undefined)
            continue;
        if (type === '5')
            mkdirSync(join(destination, target), { recursive: true });
        else if (type === '2')
            createLink(destination, target, link);
        else if (type === '0' || type === '\0' || type === '7')
            writeEntry(destination, target, Buffer.from(body), mode);
    }
}
export function extractArchive(archive, destination) {
    if (archive.length >= 4 && archive[0] === 0x50 && archive[1] === 0x4b)
        extractZip(archive, destination);
    else if (archive.length >= 2 && archive[0] === 0x1f && archive[1] === 0x8b)
        extractTarGz(archive, destination);
    else
        throw new Error('无法识别的压缩包格式，只支持 zip 与 tar.gz');
}
//# sourceMappingURL=archive.js.map
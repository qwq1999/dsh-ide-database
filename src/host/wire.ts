import { gzipSync } from 'node:zlib'

/** Below this size the gzip header overhead outweighs the saving. */
export const GZIP_MIN_BYTES = 8 * 1024

/** Whether a request accepts gzip (honouring `gzip;q=0`). */
export function acceptsGzip(header: string | string[] | undefined): boolean {
  if (header === undefined) return false
  const text = Array.isArray(header) ? header.join(',') : header
  for (const part of text.split(',')) {
    const tokens = part.split(';')
    const coding = (tokens[0] ?? '').trim().toLowerCase()
    if (coding !== 'gzip' && coding !== 'x-gzip') continue
    const rejected = tokens.slice(1).some((token) => {
      const [name, value] = token.split('=')
      const quality = (value ?? '').trim()
      return (name ?? '').trim().toLowerCase() === 'q' && /^0(?:\.0+)?$/u.test(quality)
    })
    if (!rejected) return true
  }
  return false
}

export interface JsonPayload {
  body: Buffer
  gzip: boolean
}

/**
 * Turn a JSON string into the bytes to write, compressing large payloads for
 * clients that accept it. Structure snapshots hold every cached key/table
 * name, so they routinely cross the threshold.
 */
export function encodeJsonPayload(payload: string, acceptEncoding: string | string[] | undefined): JsonPayload {
  const body = Buffer.from(payload, 'utf8')
  if (body.length < GZIP_MIN_BYTES || !acceptsGzip(acceptEncoding)) return { body, gzip: false }
  return { body: gzipSync(body), gzip: true }
}

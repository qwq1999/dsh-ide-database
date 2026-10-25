import { describe, expect, it } from 'vitest'
import { gunzipSync } from 'node:zlib'

import { GZIP_MIN_BYTES, acceptsGzip, encodeJsonPayload } from '../../lib/host/wire.js'

describe('acceptsGzip', () => {
  it('rejects a missing header', () => {
    expect(acceptsGzip(undefined)).toBe(false)
    expect(acceptsGzip('')).toBe(false)
  })

  it('accepts plain gzip and picks it out of a list', () => {
    expect(acceptsGzip('gzip')).toBe(true)
    expect(acceptsGzip('br, gzip;q=0.8')).toBe(true)
    expect(acceptsGzip('deflate, x-gzip')).toBe(true)
  })

  it('honours an explicit gzip rejection', () => {
    expect(acceptsGzip('gzip;q=0')).toBe(false)
    expect(acceptsGzip('gzip;q=0.0, br')).toBe(false)
  })

  it('ignores other codings', () => {
    expect(acceptsGzip('identity')).toBe(false)
    expect(acceptsGzip('br')).toBe(false)
  })

  it('joins repeated headers', () => {
    expect(acceptsGzip(['br', 'gzip'])).toBe(true)
  })
})

describe('encodeJsonPayload', () => {
  it('leaves small payloads alone', () => {
    const payload = '{"ok":true}'
    const result = encodeJsonPayload(payload, 'gzip')
    expect(result.gzip).toBe(false)
    expect(result.body.toString('utf8')).toBe(payload)
  })

  it('compresses a large payload when the client accepts gzip', () => {
    const payload = JSON.stringify(
      Array.from({ length: 400 }, (_, index) => ({ key: `shop:customer:${String(index)}`, type: 'string', ttl: -1, size: index })),
    )
    expect(payload.length).toBeGreaterThan(GZIP_MIN_BYTES)
    const result = encodeJsonPayload(payload, 'gzip, deflate, br')
    expect(result.gzip).toBe(true)
    expect(result.body.length).toBeLessThan(payload.length / 2)
    expect(gunzipSync(result.body).toString('utf8')).toBe(payload)
  })

  it('skips compression when the client does not accept it', () => {
    const payload = JSON.stringify(Array.from({ length: 400 }, () => 'row'))
    const result = encodeJsonPayload(payload, 'identity')
    expect(result.gzip).toBe(false)
    expect(result.body.toString('utf8')).toBe(payload)
  })

  it('honours gzip;q=0 for a large payload', () => {
    const payload = JSON.stringify(Array.from({ length: 400 }, () => 'row'))
    const result = encodeJsonPayload(payload, 'gzip;q=0')
    expect(result.gzip).toBe(false)
  })
})

/**
 * Read an HTTP response body with a hard byte cap. Callers use this for
 * downloads that must not be buffered without limit. `tooLarge` builds the
 * caller-specific error, keeping transport mechanics in one place.
 */
export async function readResponseLimited(
  response: Response,
  maxBytes: number,
  tooLarge: (received: number) => Error,
): Promise<Buffer> {
  const declared = response.headers.get('content-length')
  if (declared !== null) {
    const expected = Number(declared)
    if (Number.isFinite(expected) && expected > maxBytes) throw tooLarge(expected)
  }
  if (response.body === null) {
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > maxBytes) throw tooLarge(buffer.length)
    return buffer
  }

  const reader = response.body.getReader()
  const chunks: Buffer[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        void reader.cancel().catch(() => {})
        throw tooLarge(total)
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, total)
}

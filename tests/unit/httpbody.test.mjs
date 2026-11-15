import { describe, expect, it } from 'vitest'

import { readResponseLimited } from '../../lib/host/httpbody.js'

const tooLarge = (received) => new Error(`limit ${String(received)}`)

describe('readResponseLimited', () => {
  it('rejects a declared body over the cap before reading it', async () => {
    const response = new Response(new Uint8Array(0), { headers: { 'content-length': '9' } })
    await expect(readResponseLimited(response, 8, tooLarge)).rejects.toThrow('limit 9')
  })

  it('stops a streamed body at the cap', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3, 4, 5]))
        controller.close()
      },
    })
    await expect(readResponseLimited(new Response(body), 4, tooLarge)).rejects.toThrow('limit 5')
  })

  it('returns the body when it stays within the cap', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]))
        controller.enqueue(new Uint8Array([3]))
        controller.close()
      },
    })
    await expect(readResponseLimited(new Response(body), 3, tooLarge)).resolves.toEqual(Buffer.from([1, 2, 3]))
  })
})

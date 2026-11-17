import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'

import { BridgeClient } from '../../lib/host/bridge.js'

// spawn is mocked so we can emit 'error' without a guaranteed 'exit' — the
// exact failure mode where the bridge used to keep a dead child reference.
const spawnMock = vi.hoisted(() => vi.fn())
vi.mock('node:child_process', () => ({ spawn: spawnMock }))

function fakeChild() {
  const child = new EventEmitter()
  const stream = () => {
    const s = new EventEmitter()
    s.setEncoding = vi.fn()
    return s
  }
  child.stdout = stream()
  child.stderr = stream()
  child.stdin = { write: vi.fn((_payload, cb) => cb(null)), destroyed: false, end: vi.fn() }
  return child
}

function failingSpawn(message) {
  return () => {
    const child = fakeChild()
    queueMicrotask(() => child.emit('error', new Error(message)))
    return child
  }
}

describe('BridgeClient lifecycle', () => {
  it('clears a failed spawn so a later start() retries instead of resolving on a dead child', async () => {
    spawnMock.mockImplementation(failingSpawn('spawn ENOENT'))
    const bridge = new BridgeClient({ javaPath: 'missing-java', bridgeJar: 'x.jar', log: () => undefined })

    await expect(bridge.start()).rejects.toThrow()
    expect(spawnMock).toHaveBeenCalledTimes(1)

    // Regression: an 'error' event left `child` set, so this second call
    // returned Promise.resolve() for a JVM that never started.
    await expect(bridge.start()).rejects.toThrow()
    expect(spawnMock).toHaveBeenCalledTimes(2)
  })
})

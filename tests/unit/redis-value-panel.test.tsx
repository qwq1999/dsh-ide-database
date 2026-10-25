/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { JsonValue } from '../../src/shared/types'
import { RedisValuePanel } from '../../src/client/redisview'

const copy = vi.hoisted(() => vi.fn(async () => true))
vi.mock('../../src/client/colmenu', () => ({ copyText: copy }))

function stored(value: JsonValue): { key: string; type: string; ttl: number; value: JsonValue; truncated: boolean; preview: string } {
  return { key: 'user:1', type: 'string', ttl: -1, value, truncated: false, preview: '' }
}

afterEach(() => cleanup())

describe('redis value panel', () => {
  it('shows a JSON payload as an indented block', () => {
    const payload = { name: '张伟', tags: ['a', 'b'] }
    render(<RedisValuePanel value={stored(JSON.stringify(payload))} />)
    const block = document.querySelector('pre.dshdb-console-value')
    expect(block?.textContent).toBe(JSON.stringify(payload, null, 2))
  })

  it('keeps a plain string in the table', () => {
    render(<RedisValuePanel value={stored('hello')} />)
    expect(screen.getByText('hello')).toBeTruthy()
    expect(document.querySelector('pre.dshdb-console-value')).toBeNull()
  })

  it('copies the full value as displayed', async () => {
    const payload = { name: '张伟', tags: ['a', 'b'] }
    render(<RedisValuePanel value={stored(JSON.stringify(payload))} />)
    fireEvent.click(screen.getByLabelText('复制值'))
    await screen.findByLabelText('值已复制')
    expect(copy).toHaveBeenCalledWith(JSON.stringify(payload, null, 2))
  })

  it('copies the key name and confirms it', async () => {
    render(<RedisValuePanel value={stored('hello')} />)
    fireEvent.click(screen.getByLabelText('复制键名'))
    await screen.findByLabelText('键名已复制')
    expect(copy).toHaveBeenCalledWith('user:1')
  })
})

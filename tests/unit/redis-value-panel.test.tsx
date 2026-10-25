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

  it('says the copy only covers the fetched part when the list was truncated', () => {
    render(<RedisValuePanel value={{ ...stored('a,b,c'), truncated: true }} />)
    expect(screen.getByLabelText('复制值').getAttribute('title')).toContain('截断')
  })

  it('copies the key name and confirms it', async () => {
    render(<RedisValuePanel value={stored('hello')} />)
    fireEvent.click(screen.getByLabelText('复制键名'))
    await screen.findByLabelText('键名已复制')
    expect(copy).toHaveBeenCalledWith('user:1')
  })

  it('offers a refresh action that re-reads the key', () => {
    const refresh = vi.fn()
    render(<RedisValuePanel value={stored('hello')} onRefresh={refresh} />)
    fireEvent.click(screen.getByLabelText('刷新键值'))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('disables the refresh action while it is running', () => {
    render(<RedisValuePanel value={stored('hello')} onRefresh={() => undefined} refreshing />)
    const button = screen.getByLabelText('正在刷新键值')
    expect((button as HTMLButtonElement).disabled).toBe(true)
  })

  it('previews only the first 64 KB of a huge string but copies all of it', async () => {
    const big = 'a'.repeat(70_000)
    render(<RedisValuePanel value={stored(big)} />)
    const cell = document.querySelector('td .dshdb-mono')
    expect(cell?.textContent).toHaveLength(65_536)
    expect(screen.getByText(/值太大，只显示了前 64 KB/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('复制值'))
    await screen.findByLabelText('值已复制')
    expect(copy).toHaveBeenCalledWith(big)
  })
})

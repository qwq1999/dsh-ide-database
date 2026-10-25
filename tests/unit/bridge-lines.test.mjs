import { describe, expect, it } from 'vitest'

import { LineSplitter } from '../../lib/host/lines.js'

describe('LineSplitter', () => {
  it('returns every complete line of a single chunk', () => {
    const splitter = new LineSplitter()
    expect(splitter.push('one\ntwo\nthree\n')).toEqual(['one', 'two', 'three'])
    expect(splitter.push('')).toEqual([])
  })

  it('joins a line that spans several chunks', () => {
    const splitter = new LineSplitter()
    expect(splitter.push('{"id":')).toEqual([])
    expect(splitter.push('"1","ok":')).toEqual([])
    expect(splitter.push('true}\n')).toEqual(['{"id":"1","ok":true}'])
  })

  it('keeps the trailing partial line for the next chunk', () => {
    const splitter = new LineSplitter()
    expect(splitter.push('a\nb')).toEqual(['a'])
    expect(splitter.push('c\nd')).toEqual(['bc'])
    expect(splitter.push('\n')).toEqual(['d'])
  })

  it('ignores empty chunks', () => {
    const splitter = new LineSplitter()
    expect(splitter.push('')).toEqual([])
    expect(splitter.push('x\n')).toEqual(['x'])
  })

  it('assembles a large payload split into many small chunks', () => {
    const splitter = new LineSplitter()
    const payload = JSON.stringify({ rows: Array.from({ length: 200 }, (_, index) => `row-${String(index)}`) })
    const lines = []
    for (let offset = 0; offset < payload.length; offset += 7) {
      lines.push(...splitter.push(payload.slice(offset, offset + 7)))
    }
    lines.push(...splitter.push('\n'))
    expect(lines).toEqual([payload])
    expect(lines[0]).toHaveLength(payload.length)
  })

  it('drops a half received line on reset', () => {
    const splitter = new LineSplitter()
    expect(splitter.push('partial')).toEqual([])
    splitter.reset()
    expect(splitter.push('fresh\n')).toEqual(['fresh'])
  })
})

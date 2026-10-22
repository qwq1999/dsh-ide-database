import { beforeEach, describe, expect, it } from 'vitest'

import { clearWidths, readWidths, writeWidths } from '../../src/client/columnWidths.ts'

class MemoryStorage {
  constructor() {
    this.data = new Map()
  }

  getItem(key) {
    return this.data.has(key) ? this.data.get(key) : null
  }

  setItem(key, value) {
    this.data.set(key, String(value))
  }

  removeItem(key) {
    this.data.delete(key)
  }
}

beforeEach(() => {
  globalThis.localStorage = new MemoryStorage()
})

describe('列宽记忆', () => {
  it('没有记录时返回 null', () => {
    expect(readWidths('table:shop.customers', 3)).toBeNull()
  })

  it('写入后按列数读回', () => {
    writeWidths('table:shop.customers', [120, 80, 200])
    expect(readWidths('table:shop.customers', 3)).toEqual([120, 80, 200])
    expect(readWidths('table:shop.customers', 4)).toBeNull()
    expect(readWidths('table:shop.orders', 3)).toBeNull()
  })

  it('写入时把过窄过宽的列夹到范围内', () => {
    writeWidths('console:sql', [5, 5000])
    expect(readWidths('console:sql', 2)).toEqual([40, 1200])
  })

  it('损坏的 JSON 与非法值被忽略', () => {
    localStorage.setItem('dsh-ide-database.colwidths.v1', '{oops')
    expect(readWidths('console:sql', 1)).toBeNull()

    localStorage.setItem('dsh-ide-database.colwidths.v1', JSON.stringify({ 'console:sql': ['wide'] }))
    expect(readWidths('console:sql', 1)).toBeNull()
  })

  it('清除后不再返回', () => {
    writeWidths('table:shop.customers', [100])
    clearWidths('table:shop.customers')
    expect(readWidths('table:shop.customers', 1)).toBeNull()
  })
})

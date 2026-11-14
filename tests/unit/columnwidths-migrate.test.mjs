import { beforeEach, describe, expect, it } from 'vitest'

import { clearWidths, migrateWidths, moveWidthsForColumns, readWidths, writeWidths } from '../../src/client/columnWidths.ts'

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

describe('列宽迁移', () => {
  it('把旧键宽度复制到新键并删除旧键', () => {
    writeWidths('table:shop.orders', [120, 80])
    expect(migrateWidths('table:mysql-1:shop.orders', 'table:shop.orders', 2)).toBe('table:mysql-1:shop.orders')
    expect(readWidths('table:mysql-1:shop.orders', 2)).toEqual([120, 80])
    expect(readWidths('table:shop.orders', 2)).toBeNull()
  })

  it('新键已有宽度时不覆盖，清除后也不会被旧键复活', () => {
    writeWidths('table:shop.orders', [120, 80])
    writeWidths('table:mysql-1:shop.orders', [200, 100])
    migrateWidths('table:mysql-1:shop.orders', 'table:shop.orders', 2)
    expect(readWidths('table:mysql-1:shop.orders', 2)).toEqual([200, 100])

    clearWidths('table:mysql-1:shop.orders')
    migrateWidths('table:mysql-1:shop.orders', 'table:shop.orders', 2)
    expect(readWidths('table:mysql-1:shop.orders', 2)).toBeNull()
  })
})

describe('隐藏列时重排列宽', () => {
  it('把已保存的宽度跟着列身份移动到新位置', () => {
    const a = { name: 'a' }
    const b = { name: 'b' }
    const c = { name: 'c' }
    writeWidths('table:1', [100, 200, 300])
    moveWidthsForColumns([a, b, c], [c, a, b], 'table:1')
    expect(readWidths('table:1', 3)).toEqual([300, 100, 200])
  })

  it('列对象变化时不重排旧宽度', () => {
    writeWidths('table:1', [100, 200, 300])
    moveWidthsForColumns([{ name: 'a' }, { name: 'b' }, { name: 'c' }], [{ name: 'c' }, { name: 'a' }, { name: 'b' }], 'table:1')
    expect(readWidths('table:1', 3)).toEqual([100, 200, 300])
  })

  it('没有保存宽度或列数不一致时不做任何事', () => {
    moveWidthsForColumns([{ name: 'a' }, { name: 'b' }], [{ name: 'b' }, { name: 'a' }], 'table:none')
    expect(readWidths('table:none', 2)).toBeNull()
    writeWidths('table:2', [100, 200])
    moveWidthsForColumns([{ name: 'a' }, { name: 'b' }], [{ name: 'a' }], 'table:2')
    expect(readWidths('table:2', 2)).toEqual([100, 200])
  })
})

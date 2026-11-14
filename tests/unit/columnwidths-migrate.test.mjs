import { beforeEach, describe, expect, it } from 'vitest'

import { clearWidths, migrateWidths, readWidths, writeWidths } from '../../src/client/columnWidths.ts'

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

import { describe, expect, it } from 'vitest'
import {
  nextRowIndex,
  treeFolderKey,
  treeFolderSelectedKey,
  treeObjectKey,
  treeSchemaKey,
  treeSchemaSelectedKey,
} from '../../src/client/treekeys'

describe('nextRowIndex', () => {
  it('moves down and stops at the last row', () => {
    expect(nextRowIndex(0, 3, 'ArrowDown')).toBe(1)
    expect(nextRowIndex(2, 3, 'ArrowDown')).toBe(2)
  })

  it('moves up and stops at the first row', () => {
    expect(nextRowIndex(2, 3, 'ArrowUp')).toBe(1)
    expect(nextRowIndex(0, 3, 'ArrowUp')).toBe(0)
  })

  it('jumps home and end', () => {
    expect(nextRowIndex(1, 3, 'Home')).toBe(0)
    expect(nextRowIndex(1, 3, 'End')).toBe(2)
  })

  it('starts at a sensible end when nothing is focused', () => {
    expect(nextRowIndex(-1, 3, 'ArrowDown')).toBe(0)
    expect(nextRowIndex(-1, 3, 'ArrowUp')).toBe(2)
    expect(nextRowIndex(5, 3, 'ArrowDown')).toBe(2)
  })

  it('ignores unrelated keys and empty trees', () => {
    expect(nextRowIndex(0, 3, 'Enter')).toBeNull()
    expect(nextRowIndex(0, 0, 'ArrowDown')).toBeNull()
  })
})

describe('treeObjectKey', () => {
  it('keeps the readable key for ordinary names', () => {
    expect(treeObjectKey('c1', 'shop', 'orders')).toBe('c1|shop.orders')
  })

  it('keeps dotted schema and object names apart', () => {
    expect(treeObjectKey('c1', 'a', 'b.c')).not.toBe(treeObjectKey('c1', 'a.b', 'c'))
  })

  it('still tells an object apart from a differently split dotted name', () => {
    expect(treeObjectKey('c1', 'a.b', 'c.d')).toBe(
      `c1|a.b.c.d#${encodeURIComponent(JSON.stringify(['a.b', 'c.d']))}`,
    )
  })

  it('does not let a hash in an object name swallow a folder selection', () => {
    const objectKey = treeObjectKey('c1', 'a', 'b#columns')
    expect(objectKey).toBe(
      `c1|a.b#columns#${encodeURIComponent(JSON.stringify(['a', 'b#columns']))}`,
    )
    expect(objectKey).not.toBe(treeFolderSelectedKey('c1', 'a.b', 'columns'))
  })
})

describe('tree schema and folder keys', () => {
  it('keeps the readable keys for ordinary schemas', () => {
    expect(treeSchemaKey('c1', 'shop')).toBe('c1:shop')
    expect(treeFolderKey('c1', 'shop', 'table')).toBe('c1:shop#table')
    expect(treeSchemaSelectedKey('c1', 'shop')).toBe('c1|schema:shop')
    expect(treeFolderSelectedKey('c1', 'shop', 'table')).toBe('c1|shop#table')
  })

  it('does not let a schema key swallow another schema folder', () => {
    expect(treeSchemaKey('c1', 'a#columns')).not.toBe(treeFolderKey('c1', 'a', 'columns'))
    expect(treeSchemaKey('c1', 'a#columns')).toBe('c1:a%23columns')
  })

  it('encodes the # and colon in selected keys too', () => {
    expect(treeSchemaSelectedKey('c1', 'a#columns')).toBe('c1|schema:a%23columns')
    expect(treeFolderSelectedKey('c1', 'a#columns', 'table')).toBe('c1|a%23columns#table')
    expect(treeFolderSelectedKey('c1', 'a#columns', 'table')).not.toBe(
      treeSchemaSelectedKey('c1', 'a'),
    )
  })
})

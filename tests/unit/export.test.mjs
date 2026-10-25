import { describe, expect, it } from 'vitest'
import { exportFilename, jsonValue, renderExport, toJson, toMarkdown } from '../../src/client/export.js'

const columns = (...names) => names.map((name) => ({ name, typeName: 'varchar', kind: 'text' }))

describe('toJson', () => {
  it('keeps native types and nulls', () => {
    const text = toJson(columns('id', 'name', 'ok'), [[7, 'a', true], [null, 'b', null]])
    expect(JSON.parse(text)).toEqual([
      { id: 7, name: 'a', ok: true },
      { id: null, name: 'b', ok: null },
    ])
  })

  it('suffixes duplicate column names instead of dropping them', () => {
    const text = toJson(columns('id', 'id', 'name'), [[1, 2, 'x']])
    expect(JSON.parse(text)).toEqual([{ id: 1, id_2: 2, name: 'x' }])
  })

  it('serialises bigints without throwing', () => {
    expect(JSON.parse(toJson(columns('big'), [[BigInt('9007199254740993')]]))[0].big).toBe('9007199254740993')
    expect(JSON.parse(toJson(columns('small'), [[BigInt(42)]]))[0].small).toBe(42)
  })
})

describe('jsonValue', () => {
  it('stringifies dates as ISO text', () => {
    expect(jsonValue(new Date('2026-10-23T00:00:00Z'))).toBe('2026-10-23T00:00:00.000Z')
  })
})

describe('toMarkdown', () => {
  it('writes a header, a divider and one row per record', () => {
    const text = toMarkdown(columns('id', 'name'), [[1, 'a'], [2, 'b']])
    expect(text).toBe('| id | name |\n| --- | --- |\n| 1 | a |\n| 2 | b |\n')
  })

  it('escapes pipes and folds newlines so the table keeps its shape', () => {
    const text = toMarkdown(columns('note'), [['a|b'], ['line1\nline2']])
    expect(text).toContain('| a\\|b |')
    expect(text).toContain('| line1<br>line2 |')
  })

  it('shows nulls and booleans the way the grid does', () => {
    const text = toMarkdown(columns('ok', 'other'), [[true, null]])
    expect(text).toBe('| ok | other |\n| --- | --- |\n| true | NULL |\n')
  })
})

describe('renderExport', () => {
  const input = { dialect: 'mysql', schema: 'shop', table: 't', columns: columns('id'), rows: [[1]] }

  it('picks the mime type per format', () => {
    expect(renderExport('csv', input).mime).toBe('text/csv')
    expect(renderExport('json', input).mime).toBe('application/json')
    expect(renderExport('sql', input).mime).toBe('application/sql')
    expect(renderExport('md', input).mime).toBe('text/markdown')
  })

  it('builds INSERT statements for the sql format', () => {
    expect(renderExport('sql', input).text).toContain('INSERT INTO `shop`.`t`')
  })

  it('exports markdown tables', () => {
    expect(renderExport('md', input).text).toContain('| id |')
  })
})

describe('exportFilename', () => {
  it('stamps schema.table with the export time', () => {
    expect(exportFilename('shop', 'orders', 'md', new Date(2026, 9, 23, 1, 2, 3))).toBe('shop.orders-20261023-010203.md')
    expect(exportFilename('shop', 'orders', 'json', new Date(2026, 9, 23, 1, 2, 3))).toBe('shop.orders-20261023-010203.json')
    expect(exportFilename('shop', 'orders', 'sql', new Date(2026, 9, 23, 1, 2, 3))).toBe('shop.orders-20261023-010203.sql')
  })
})

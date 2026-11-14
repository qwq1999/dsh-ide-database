import { describe, expect, it } from 'vitest'
import { exportFilename, jsonValue, renderExport, safeFilename, toCsv, toJson, toMarkdown, toTsv } from '../../src/client/export.js'

const columns = (...names) => names.map((name) => ({ name, typeName: 'varchar', kind: 'text' }))

describe('toCsv', () => {
  it('marks formula-like text so spreadsheets do not execute it', () => {
    const text = toCsv(columns('note'), [['=1+1'], ['+SUM(A1)'], ['-2+3'], ['@cmd'], ['-42']])
    expect(text).toContain("'=1+1")
    expect(text).toContain("'+SUM(A1)")
    expect(text).toContain("'-2+3")
    expect(text).toContain("'@cmd")
    expect(text).toContain('\r\n-42\r\n')
  })
})

describe('toTsv', () => {
  it('separates cells with tabs and flattens inner breaks', () => {
    const text = toTsv(columns('id', 'note'), [[7, 'a\tb\nc'], [null, 'plain']])
    expect(text).toBe('id\tnote\n7\ta b c\nNULL\tplain\n')
  })

  it('marks formula-like text before pasting into a spreadsheet', () => {
    const text = toTsv(columns('note'), [['=1+1'], ['-42']])
    expect(text).toContain("'=1+1")
    expect(text).toContain('\n-42\n')
  })
})

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

  it('keeps every value when a real column already uses the generated suffix', () => {
    const text = toJson(columns('id', 'id', 'id_2'), [[1, 2, 3]])
    expect(JSON.parse(text)).toEqual([{ id: 1, id_2: 2, id_2_2: 3 }])
  })

  it('keeps a column named __proto__ as data', () => {
    const text = toJson(columns('__proto__'), [['x']])
    const records = JSON.parse(text)
    expect(Object.getOwnPropertyDescriptor(records[0], '__proto__')?.value).toBe('x')
    expect(text).toContain('"__proto__": "x"')
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

  it('replaces characters that browsers or Windows reject in a filename', () => {
    expect(safeFilename('shop/orders:2024*.csv')).toBe('shop_orders_2024_.csv')
    expect(safeFilename('..\\secret.sql')).toBe('__secret.sql')
    expect(safeFilename('.hidden.csv')).toBe('_hidden.csv')
    expect(safeFilename('CON.sql')).toBe('_CON.sql')
    expect(safeFilename('report. ')).toBe('report')
    expect(safeFilename('   ')).toBe('download')
  })
})

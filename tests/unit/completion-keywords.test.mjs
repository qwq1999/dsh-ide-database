import { describe, expect, it } from 'vitest'
import {
  SQL_KEYWORDS,
  functionCompletions,
  isKeyword,
  keywordCompletions,
} from '../../src/client/completion/keywords'

const names = (items) => items.map((item) => item.name)

describe('keywordCompletions', () => {
  it('keeps the shared list unchanged for the generic dialect', () => {
    expect(names(keywordCompletions('any', 'generic'))).toEqual([...SQL_KEYWORDS])
    expect(new Set(SQL_KEYWORDS).size).toBe(SQL_KEYWORDS.length)
  })

  it('leads the generic popup with the words every statement needs', () => {
    expect(SQL_KEYWORDS.slice(0, 2)).toEqual(['SELECT', 'FROM'])
  })

  it('offers FROM where a select list ends', () => {
    for (const dialect of ['generic', 'mysql']) {
      expect(names(keywordCompletions('column', dialect)), dialect).toContain('FROM')
    }
  })

  it('offers scalar values where a literal is expected', () => {
    expect(names(keywordCompletions('value', 'mysql'))).toEqual(['DEFAULT', 'NULL', 'TRUE', 'FALSE'])
  })

  it('offers column definition words inside CREATE TABLE', () => {
    const words = names(keywordCompletions('definition', 'mysql'))
    expect(words).toContain('PRIMARY')
    expect(words).toContain('AUTO_INCREMENT')
    expect(words).toContain('REFERENCES')
  })

  it('offers ALTER actions after the table name', () => {
    expect(names(keywordCompletions('alter', 'mysql'))).toEqual([
      'ADD',
      'DROP',
      'MODIFY',
      'CHANGE',
      'RENAME',
      'ALTER',
    ])
  })

  it('offers comparison and boolean words in conditions', () => {
    expect(names(keywordCompletions('comparison', 'mysql'))).toEqual([
      'LIKE',
      'IN',
      'IS',
      'NOT',
      'BETWEEN',
      'REGEXP',
    ])
    expect(names(keywordCompletions('boolean', 'mysql'))).toEqual(['AND', 'OR'])
  })

  it('offers sort directions and the ORDER BY tail', () => {
    expect(names(keywordCompletions('direction', 'mysql'))).toEqual(['ASC', 'DESC'])
    expect(names(keywordCompletions('orderTail', 'mysql'))).toEqual(['LIMIT', 'OFFSET'])
  })

  it('offers clauses after a complete select-list expression', () => {
    expect(names(keywordCompletions('expressionTail', 'mysql'))).toEqual([
      'AS',
      'FROM',
      'WHERE',
      'GROUP',
      'ORDER',
      'HAVING',
      'LIMIT',
      'UNION',
      'AND',
      'OR',
    ])
  })

  it('offers ALTER objects after an action', () => {
    expect(names(keywordCompletions('alterObject', 'mysql'))).toEqual([
      'COLUMN',
      'CONSTRAINT',
      'INDEX',
      'KEY',
      'PRIMARY',
      'FOREIGN',
      'UNIQUE',
      'CHECK',
      'DEFAULT',
      'TO',
    ])
  })

  it('offers table options after a CREATE TABLE body', () => {
    expect(names(keywordCompletions('tableOptions', 'mysql'))).toEqual([
      'AS',
      'ENGINE',
      'DEFAULT',
      'CHARSET',
      'CHARACTER',
      'COLLATE',
      'COMMENT',
      'AUTO_INCREMENT',
      'PARTITION',
      'ROW_FORMAT',
      'TABLESPACE',
    ])
  })

  it('adds the MySQL-only words on MySQL connections', () => {
    const words = names(keywordCompletions('any', 'mysql'))
    expect(words).toContain('STRAIGHT_JOIN')
    expect(words).toContain('SQL_CALC_FOUND_ROWS')
    expect(words).toContain('REGEXP')
  })

  it('adds the Oracle-only words on Oracle-family connections', () => {
    for (const dialect of ['oracle', 'oceanbase-oracle', 'dameng']) {
      const words = names(keywordCompletions('any', dialect))
      expect(words, dialect).toContain('CONNECT')
      expect(words, dialect).toContain('PIVOT')
      expect(words, dialect).toContain('ROWNUM')
    }
  })

  it('adds the PostgreSQL-only words on PostgreSQL connections', () => {
    const words = names(keywordCompletions('any', 'postgres'))
    expect(words).toContain('CONFLICT')
    expect(words).toContain('WITHIN')
  })

  it('does not leak dialect words into the generic popup', () => {
    const words = names(keywordCompletions('any', 'generic'))
    for (const word of ['STRAIGHT_JOIN', 'CONNECT', 'PIVOT', 'CONFLICT', 'WITHIN']) {
      expect(words, word).not.toContain(word)
    }
  })

  it('only offers dialect words in clauses that can use them', () => {
    const postgresRelation = names(keywordCompletions('relation', 'postgres'))
    expect(postgresRelation).not.toContain('CONFLICT')
    const postgresColumn = names(keywordCompletions('column', 'postgres'))
    expect(postgresColumn).toContain('CONFLICT')

    const oracleRelation = names(keywordCompletions('relation', 'oracle'))
    expect(oracleRelation).toContain('PIVOT')
    const oracleAlias = names(keywordCompletions('alias', 'oracle'))
    expect(oracleAlias).toEqual(['AS'])
  })

  it('never returns functions from the keyword provider', () => {
    for (const dialect of ['generic', 'mysql', 'oracle', 'postgres']) {
      for (const item of keywordCompletions('column', dialect)) {
        expect(item.kind).toBe('keyword')
      }
    }
  })

  it('keeps dialect words out of the tolerant lexer reserved set', () => {
    expect(isKeyword('SELECT')).toBe(true)
    expect(isKeyword('regexp')).toBe(false)
    expect(isKeyword('pivot')).toBe(false)
  })
})

describe('functionCompletions', () => {
  const dialectFunctions = {
    mysql: 'DATE_ADD',
    oracle: 'LISTAGG',
    dameng: 'LISTAGG',
    postgres: 'TO_JSONB',
    generic: 'COUNT',
  }

  it('offers the dialect-specific functions', () => {
    for (const [dialect, expected] of Object.entries(dialectFunctions)) {
      const items = functionCompletions(dialect)
      expect(names(items), dialect).toContain(expected)
    }
  })

  it('only offers MySQL-only functions on MySQL', () => {
    expect(names(functionCompletions('oracle'))).not.toContain('DATE_ADD')
    expect(names(functionCompletions('generic'))).not.toContain('DATE_ADD')
    expect(names(functionCompletions('mysql'))).not.toContain('LISTAGG')
  })

  it('returns unique upper-case names whose insert opens the call', () => {
    for (const dialect of ['generic', 'mysql', 'oracle', 'dameng', 'postgres']) {
      const items = functionCompletions(dialect)
      const seen = new Set()
      for (const item of items) {
        expect(item.name, item.name).toBe(item.name.toUpperCase())
        expect(item.insert, item.name).toBe(`${item.name}(`)
        expect(seen.has(item.name), item.name).toBe(false)
        seen.add(item.name)
      }
    }
  })
})

describe('keywordCompletions tails', () => {
  it('offers the GROUP BY tail', () => {
    expect(names(keywordCompletions('groupTail', 'mysql'))).toEqual([
      'HAVING',
      'ORDER',
      'LIMIT',
      'WITH',
    ])
  })

  it('offers the INSERT duplicate key clause', () => {
    expect(names(keywordCompletions('insertTail', 'mysql'))).toEqual([
      'ON DUPLICATE KEY UPDATE',
    ])
  })
})

describe('keywordCompletions sources and join tails', () => {
  it('offers the row source after an INSERT column list', () => {
    expect(names(keywordCompletions('insertSource', 'mysql'))).toEqual(['VALUES', 'SELECT', 'SET'])
  })

  it('offers clause tails after JOIN USING', () => {
    expect(names(keywordCompletions('joinTail', 'mysql'))).toEqual([
      'JOIN',
      'LEFT',
      'RIGHT',
      'INNER',
      'OUTER',
      'CROSS',
      'NATURAL',
      'WHERE',
      'GROUP',
      'ORDER',
      'HAVING',
      'LIMIT',
      'UNION',
    ])
  })
})

describe('privilege and window words', () => {
  it('offers the privilege list before GRANT ... ON', () => {
    expect(names(keywordCompletions('privilege', 'generic'))).toEqual([
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'CREATE',
      'DROP',
      'ALTER',
      'EXECUTE',
      'ALL',
      'USAGE',
      'REFERENCES',
      'TRIGGER',
      'INDEX',
      'PROCESS',
      'RELOAD',
      'SHOW',
    ])
  })

  it('offers the window keywords inside OVER', () => {
    expect(names(keywordCompletions('over', 'generic'))).toEqual([
      'PARTITION',
      'ORDER',
      'RANGE',
      'ROWS',
      'GROUPS',
    ])
  })
})


describe('grant option and lock words', () => {
  it('offers GRANT/ADMIN after WITH', () => {
    expect(names(keywordCompletions('grantOption', 'generic'))).toEqual(['GRANT', 'ADMIN'])
  })

  it('offers OPTION after WITH GRANT or WITH ADMIN', () => {
    expect(names(keywordCompletions('grantOptionWord', 'generic'))).toEqual(['OPTION'])
  })

  it('offers the lock clauses', () => {
    expect(names(keywordCompletions('lock', 'generic'))).toEqual(['UPDATE', 'SHARE'])
  })
})

describe('frame and interval words', () => {
  it('offers frame bounds', () => {
    expect(names(keywordCompletions('frame', 'generic'))).toEqual([
      'BETWEEN',
      'UNBOUNDED',
      'CURRENT',
      'ROW',
      'PRECEDING',
      'FOLLOWING',
    ])
  })

  it('offers interval units', () => {
    expect(names(keywordCompletions('interval', 'generic'))).toEqual([
      'MICROSECOND',
      'SECOND',
      'MINUTE',
      'HOUR',
      'DAY',
      'WEEK',
      'MONTH',
      'QUARTER',
      'YEAR',
    ])
  })
})

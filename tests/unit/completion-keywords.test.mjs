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

describe('index method words', () => {
  it('offers BTREE and HASH for CREATE INDEX ... USING', () => {
    expect(names(keywordCompletions('indexMethod', 'generic'))).toEqual(['BTREE', 'HASH'])
  })
})

describe('rollup tail words', () => {
  it('drops WITH after an explicit ROLLUP', () => {
    expect(names(keywordCompletions('rollupTail', 'generic'))).toEqual(['HAVING', 'ORDER', 'LIMIT'])
  })
})

describe('lock, row format and partition words', () => {
  it('offers the LOCK TABLES access modes', () => {
    expect(names(keywordCompletions('lockTable', 'generic'))).toEqual([
      'READ',
      'WRITE',
      'LOW_PRIORITY',
      'AS',
    ])
  })

  it('offers ROW_FORMAT values in order', () => {
    expect(names(keywordCompletions('rowFormat', 'generic'))).toEqual([
      'DEFAULT',
      'DYNAMIC',
      'FIXED',
      'COMPRESSED',
      'REDUNDANT',
      'COMPACT',
    ])
  })

  it('offers partitioning methods in order', () => {
    expect(names(keywordCompletions('partition', 'generic'))).toEqual([
      'HASH',
      'KEY',
      'RANGE',
      'LIST',
      'LINEAR',
    ])
  })
})

describe('transaction, isolation and NULLS words', () => {
  it('offers transaction access modes', () => {
    expect(names(keywordCompletions('transaction', 'generic'))).toEqual(['READ', 'WRITE', 'WITH'])
    expect(names(keywordCompletions('transactionRead', 'generic'))).toEqual(['ONLY', 'WRITE'])
    expect(names(keywordCompletions('transactionWith', 'generic'))).toEqual(['CONSISTENT'])
  })

  it('offers isolation levels and the savepoint keyword', () => {
    expect(names(keywordCompletions('isolation', 'generic'))).toEqual([
      'READ',
      'REPEATABLE',
      'SERIALIZABLE',
    ])
    expect(names(keywordCompletions('rollbackTo', 'generic'))).toEqual(['SAVEPOINT'])
  })

  it('offers NULLS and ALTER COLUMN SET values', () => {
    expect(names(keywordCompletions('nulls', 'generic'))).toEqual(['FIRST', 'LAST'])
    expect(names(keywordCompletions('alterColumnSet', 'generic'))).toEqual([
      'DEFAULT',
      'VISIBLE',
      'INVISIBLE',
    ])
  })
})

describe('SET TRANSACTION words', () => {
  it('offers the SET TRANSACTION tail words', () => {
    expect(names(keywordCompletions('setTransaction', 'generic'))).toEqual(['ISOLATION', 'READ'])
    expect(names(keywordCompletions('isolationLevel', 'generic'))).toEqual(['LEVEL'])
  })
})

describe('isolation level value words', () => {
  it('offers COMMITTED and UNCOMMITTED', () => {
    expect(names(keywordCompletions('isolationRead', 'generic'))).toEqual([
      'COMMITTED',
      'UNCOMMITTED',
    ])
  })
})

describe('column type words', () => {
  it('offers DDL column types', () => {
    const words = names(keywordCompletions('columnType', 'generic'))
    expect(words.slice(0, 6)).toEqual(['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT'])
    expect(words).toContain('VARCHAR')
    expect(words).toContain('JSON')
    expect(words).toContain('DATETIME')
  })
})

describe('trigger words', () => {
  it('offers trigger timing, event and FOR EACH ROW words', () => {
    expect(names(keywordCompletions('triggerTiming', 'generic'))).toEqual(['BEFORE', 'AFTER'])
    expect(names(keywordCompletions('triggerEvent', 'generic'))).toEqual([
      'INSERT',
      'UPDATE',
      'DELETE',
    ])
    expect(names(keywordCompletions('triggerOn', 'generic'))).toEqual(['ON'])
    expect(names(keywordCompletions('triggerFor', 'generic'))).toEqual(['FOR'])
    expect(names(keywordCompletions('triggerEach', 'generic'))).toEqual(['EACH'])
    expect(names(keywordCompletions('triggerRow', 'generic'))).toEqual(['ROW'])
  })
})

describe('routine and event words', () => {
  it('offers RETURNS and the view AS keyword', () => {
    expect(names(keywordCompletions('routineReturn', 'generic'))).toEqual(['RETURNS'])
    expect(names(keywordCompletions('viewTail', 'generic'))).toEqual(['AS'])
  })

  it('offers event schedule words', () => {
    expect(names(keywordCompletions('eventOn', 'generic'))).toEqual(['ON'])
    expect(names(keywordCompletions('eventSchedule', 'generic'))).toEqual(['SCHEDULE'])
    expect(names(keywordCompletions('eventTiming', 'generic'))).toEqual(['AT', 'EVERY'])
    expect(names(keywordCompletions('eventTail', 'generic'))).toEqual(['STARTS', 'ENDS', 'DO'])
  })
})

describe('INTO target words', () => {
  it('offers OUTFILE and DUMPFILE', () => {
    expect(names(keywordCompletions('intoTarget', 'generic'))).toEqual(['OUTFILE', 'DUMPFILE'])
  })
})

describe('constraint type words', () => {
  it('offers the constraint kinds', () => {
    expect(names(keywordCompletions('constraintType', 'generic'))).toEqual([
      'FOREIGN',
      'PRIMARY',
      'UNIQUE',
      'CHECK',
    ])
  })
})


describe('assignment words', () => {
  it('offers SET after an UPDATE table', () => {
    expect(names(keywordCompletions('assignment', 'generic'))).toEqual(['SET'])
  })
})


describe('flush and reset words', () => {
  it('offers FLUSH options', () => {
    expect(names(keywordCompletions('flush', 'generic'))).toEqual([
      'PRIVILEGES',
      'TABLES',
      'LOGS',
      'BINARY',
      'ENGINE',
      'ERROR',
      'GENERAL',
      'RELAY',
      'SLOW',
      'HOSTS',
      'STATUS',
      'USER_RESOURCES',
      'OPTIMIZER_COSTS',
    ])
  })

  it('offers RESET options', () => {
    expect(names(keywordCompletions('reset', 'generic'))).toEqual([
      'MASTER',
      'SLAVE',
      'REPLICA',
      'QUERY',
      'CACHE',
    ])
  })
})


describe('alter algorithm and lock words', () => {
  it('offers ALTER algorithm words', () => {
    expect(names(keywordCompletions('algorithm', 'generic'))).toEqual([
      'DEFAULT',
      'INPLACE',
      'COPY',
      'INSTANT',
    ])
  })

  it('offers ALTER lock words', () => {
    expect(names(keywordCompletions('lockOption', 'generic'))).toEqual([
      'DEFAULT',
      'NONE',
      'SHARED',
      'EXCLUSIVE',
    ])
  })
})

describe('WITH ROLLUP and ALTER DATABASE words', () => {
  it('offers ROLLUP after WITH', () => {
    expect(names(keywordCompletions('withRollup', 'generic'))).toEqual(['ROLLUP'])
  })

  it('offers ALTER DATABASE options', () => {
    expect(names(keywordCompletions('alterDatabase', 'generic'))).toEqual([
      'CHARACTER',
      'COLLATE',
      'ENCRYPTION',
      'READ',
    ])
  })
})

describe('utility words', () => {
  it('offers LOCK TABLE mode starters and modes', () => {
    expect(names(keywordCompletions('lockModeStart', 'generic'))).toEqual(['IN'])
    expect(names(keywordCompletions('lockMode', 'generic'))).toEqual([
      'ACCESS',
      'ROW',
      'SHARE',
      'EXCLUSIVE',
      'UPDATE',
      'KEY',
    ])
  })

  it('offers EXPLAIN planner options', () => {
    expect(names(keywordCompletions('explainOption', 'generic'))).toEqual([
      'ANALYZE',
      'VERBOSE',
      'BUFFERS',
      'COSTS',
      'SETTINGS',
      'TIMING',
      'FORMAT',
      'WAL',
    ])
  })

  it('offers ALTER TYPE actions and additions', () => {
    expect(names(keywordCompletions('typeAlter', 'generic'))).toEqual([
      'ADD',
      'RENAME',
      'ALTER',
      'SET',
      'OWNER',
    ])
    expect(names(keywordCompletions('typeAdd', 'generic'))).toEqual(['VALUE', 'ATTRIBUTE'])
  })
})

describe('alter column drop words', () => {
  it('offers the ALTER COLUMN DROP actions', () => {
    expect(names(keywordCompletions('alterColumnDrop', 'generic'))).toEqual([
      'DEFAULT',
      'NOT',
      'IDENTITY',
      'EXPRESSION',
    ])
  })
})

describe('insert on words', () => {
  it('offers DUPLICATE after ON', () => {
    expect(names(keywordCompletions('insertOn', 'mysql'))).toEqual(['DUPLICATE'])
  })
})

describe('conflict and sample words', () => {
  it('offers ON CONFLICT actions', () => {
    expect(names(keywordCompletions('conflictAction', 'generic'))).toEqual([
      'NOTHING',
      'UPDATE',
    ])
  })

  it('offers TABLESAMPLE methods', () => {
    expect(names(keywordCompletions('sampleMethod', 'generic'))).toEqual([
      'SYSTEM',
      'BERNOULLI',
      'RESERVOIR',
      'ROW',
      'PERCENT',
    ])
  })
})

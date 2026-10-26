import { describe, expect, it } from 'vitest'

import { fileDatabaseNote } from '../../lib/host/sql.js'

describe('sqlite file note', () => {
  it('warns when the file does not exist yet', () => {
    expect(fileDatabaseNote('sqlite', './data/app.db', false)).toBe('文件不存在，连接时会新建一个空数据库')
  })

  it('stays quiet for existing files, other dialects and empty paths', () => {
    expect(fileDatabaseNote('sqlite', './data/app.db', true)).toBeNull()
    expect(fileDatabaseNote('postgres', 'app', false)).toBeNull()
    expect(fileDatabaseNote('sqlite', '  ', false)).toBeNull()
  })
})

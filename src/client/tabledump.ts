/**
 * One table as a runnable .sql script: the CREATE statement followed by one
 * INSERT per row. Exported from the table tab so a single table can be moved to
 * another environment without hand-assembling DDL and data.
 */
import type { ClientConnection, ColumnInfo, Row } from '../shared/types'
import { insertStatement } from './tablesql'

export interface TableDump {
  dialect: ClientConnection['dialect']
  schema: string
  table: string
  /** undefined when the server could not produce a CREATE statement. */
  ddl: string | null
  columns: ColumnInfo[]
  rows: Row[]
}

/** Strip trailing blanks and make sure the DDL is closed by one semicolon. */
function ddlBlock(ddl: string): string {
  const text = ddl.trim()
  if (text === '') return ''
  return text.endsWith(';') ? text : `${text};`
}

export function tableDumpText(dump: TableDump): string {
  const name = dump.schema === '' ? dump.table : `${dump.schema}.${dump.table}`
  const lines: string[] = [`-- ${name}`, '-- 由 dsh-ide-database 导出']
  const ddl = dump.ddl === null ? '' : ddlBlock(dump.ddl)
  if (ddl === '') {
    lines.push('-- 未能取到建表语句，只导出数据')
  } else {
    lines.push('', ddl)
  }
  if (dump.rows.length > 0) lines.push('')
  for (const row of dump.rows) {
    lines.push(insertStatement(dump.dialect, dump.schema, dump.table, dump.columns, row))
  }
  return `${lines.join('\n')}\n`
}

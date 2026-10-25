/**
 * One stored Redis value: the metadata line (type / TTL / length) plus the
 * tabulated payload. Shared by the console and the data tree so both present a
 * key the same way.
 */
import type { ReactElement } from 'react'
import type { RedisValue } from '../shared/types'
import { formatCount, stringifyJson } from './format'
import { redisTtlLabel, redisValueTable } from './redisvalue'
import { Tag } from './ui'

export function RedisValuePanel({ value, showKey = true }: { value: RedisValue; showKey?: boolean }): ReactElement {
  const table = redisValueTable(value)
  return (
    <div className="dshdb-redis-value">
      <div className="dshdb-redis-meta">
        <Tag>{value.type}</Tag>
        <span className="dshdb-muted">{redisTtlLabel(value.ttl)}</span>
        {value.size === undefined ? null : <span className="dshdb-muted">{formatCount(value.size)} 条</span>}
        {value.truncated ? <Tag tone="warn">已截断</Tag> : null}
        {showKey ? (
          <span className="dshdb-redis-key" title={value.key}>
            {value.key}
          </span>
        ) : null}
      </div>
      {table === null ? (
        <pre className="dshdb-console-value">{stringifyJson(value.value)}</pre>
      ) : (
        <div className="dshdb-grid-wrap dshdb-redis-table">
          <table className="dshdb-grid">
            <thead>
              <tr>
                <th className="dshdb-num">#</th>
                {table.headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, index) => (
                <tr key={index}>
                  <td className="dshdb-num">{index + 1}</td>
                  {row.map((cell, column) => (
                    <td key={column} title={cell}>
                      <span className="dshdb-mono">{cell}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

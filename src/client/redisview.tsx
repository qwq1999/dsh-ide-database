/**
 * One stored Redis value: the metadata line (type / TTL / length) plus the
 * tabulated payload. Shared by the console and the data tree so both present a
 * key the same way.
 */
import { memo, useEffect, useState, type ReactElement } from 'react'
import type { RedisValue } from '../shared/types'
import { copyText } from './colmenu'
import { formatCount } from './format'
import { CheckIcon, CopyIcon } from './icons'
import { redisTtlLabel, redisValueTable, redisValueText } from './redisvalue'
import { Tag } from './ui'

export const RedisValuePanel = memo(function RedisValuePanel({
  value,
  showKey = true,
}: {
  value: RedisValue
  showKey?: boolean
}): ReactElement {
  const table = redisValueTable(value)
  const [copied, setCopied] = useState(false)
  const [copiedValue, setCopiedValue] = useState(false)
  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timer)
  }, [copied])
  useEffect(() => {
    if (!copiedValue) return undefined
    const timer = setTimeout(() => setCopiedValue(false), 1500)
    return () => clearTimeout(timer)
  }, [copiedValue])
  return (
    <div className="dshdb-redis-value">
      <div className="dshdb-redis-meta">
        <Tag>{value.type}</Tag>
        <span className="dshdb-muted">{redisTtlLabel(value.ttl)}</span>
        {value.size === undefined ? null : <span className="dshdb-muted">{formatCount(value.size)} 条</span>}
        {value.truncated ? <Tag tone="warn">已截断</Tag> : null}
        <button
          type="button"
          className="dshdb-row-action"
          title={copiedValue ? '已复制值' : '复制值'}
          aria-label={copiedValue ? '值已复制' : '复制值'}
          onClick={() => {
            void copyText(redisValueText(value.value)).then((ok) => setCopiedValue(ok))
          }}
        >
          {copiedValue ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
        </button>
        {showKey ? (
          <>
            <span className="dshdb-redis-key" title={value.key}>
              {value.key}
            </span>
            <button
              type="button"
              className="dshdb-row-action"
              title={copied ? '已复制键名' : '复制键名'}
              aria-label={copied ? '键名已复制' : '复制键名'}
              onClick={() => {
                void copyText(value.key).then((ok) => setCopied(ok))
              }}
            >
              {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </button>
          </>
        ) : null}
      </div>
      {table === null ? (
        <pre className="dshdb-console-value">{redisValueText(value.value)}</pre>
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
})

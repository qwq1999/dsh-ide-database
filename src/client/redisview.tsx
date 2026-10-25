/**
 * One stored Redis value: the metadata line (type / TTL / length) plus the
 * tabulated payload. Shared by the console and the data tree so both present a
 * key the same way.
 */
import { memo, type ReactElement } from 'react'
import type { RedisValue } from '../shared/types'
import { copyText } from './colmenu'
import { formatCount } from './format'
import { CheckIcon, CopyIcon, RefreshIcon } from './icons'
import { useCopyFlash } from './copyflash'
import { redisTtlLabel, redisValueTable, redisValueText } from './redisvalue'
import { Tag } from './ui'

const DISPLAY_TEXT_LIMIT = 64 * 1024

export const RedisValuePanel = memo(function RedisValuePanel({
  value,
  showKey = true,
  refreshing = false,
  onRefresh,
}: {
  value: RedisValue
  showKey?: boolean
  refreshing?: boolean
  onRefresh?: () => void
}): ReactElement {
  const table = redisValueTable(value)
  // A multi-megabyte string would otherwise land in one text node and stall the
  // panel; showing a prefix keeps the key browsable while copy still gets it all.
  const fullText = redisValueText(value.value)
  const text = fullText.slice(0, DISPLAY_TEXT_LIMIT)
  const clippedCells =
    table !== null && table.rows.some((row) => row.some((cell) => cell.length > DISPLAY_TEXT_LIMIT))
  const clipped = fullText.length > DISPLAY_TEXT_LIMIT || clippedCells
  const keyFlash = useCopyFlash()
  const valueFlash = useCopyFlash()
  const copied = keyFlash.copied
  const copiedValue = valueFlash.copied
  return (
    <div className="dshdb-redis-value">
      <div className="dshdb-redis-meta">
        <Tag>{value.type}</Tag>
        <span className="dshdb-muted">{redisTtlLabel(value.ttl)}</span>
        {value.size === undefined ? null : <span className="dshdb-muted">{formatCount(value.size)} 条</span>}
        {value.truncated ? <Tag tone="warn">已截断</Tag> : null}
        {onRefresh === undefined ? null : (
          <button
            type="button"
            className="dshdb-row-action"
            title={refreshing ? '正在重新读取' : '重新读取这个键'}
            aria-label={refreshing ? '正在刷新键值' : '刷新键值'}
            disabled={refreshing}
            onClick={onRefresh}
          >
            <RefreshIcon size={12} />
          </button>
        )}
        <button
          type="button"
          className="dshdb-row-action"
          title={
            value.truncated
              ? copiedValue
                ? '已复制取回的部分（列表已截断）'
                : '复制取回的部分（列表已截断）'
              : copiedValue
                ? '已复制值'
                : '复制值'
          }
          aria-label={copiedValue ? '值已复制' : '复制值'}
          onClick={() => {
            void copyText(redisValueText(value.value)).then((ok) => valueFlash.flash(ok))
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
                void copyText(value.key).then((ok) => keyFlash.flash(ok))
              }}
            >
              {copied ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
            </button>
          </>
        ) : null}
      </div>
      {table === null ? (
        <>
          <pre className="dshdb-console-value">{text}</pre>
          {clipped ? (
            <p className="dshdb-muted" style={{ margin: '6px 0 0' }}>
              值太大，只显示了前 {DISPLAY_TEXT_LIMIT / 1024} KB；复制按钮拿到的是完整值。
            </p>
          ) : null}
        </>
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
                    <td key={column} title={cell.slice(0, 512)}>
                      <span className="dshdb-mono">{cell.slice(0, DISPLAY_TEXT_LIMIT)}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {clipped ? (
        <p className="dshdb-muted" style={{ margin: '6px 0 0' }}>
          值太大，只显示了前 {DISPLAY_TEXT_LIMIT / 1024} KB；复制按钮拿到的是完整值。
        </p>
      ) : null}
    </div>
  )
})

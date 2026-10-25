/**
 * Presentational pieces of the query console: statement history, the Redis key
 * grid and pager buttons. They read nothing from the console state, so they
 * live here instead of growing ConsoleTab.tsx.
 */
import { memo, useMemo, useState, type ReactElement } from 'react'
import type { RedisKeyInfo } from '../shared/types'
import { historyAgo, type HistoryEntry } from './history'
import { ClearIcon, StarIcon } from './icons'
import { Button, Tag } from './ui'
import { formatCount, formatTtl } from './format'
import { nextKeySort, sortKeys, type KeySort } from './redissort'

export { formatCount }

/** Fold a statement onto one line for the history rows. */
export function oneLine(statement: string): string {
  return statement.replace(/\s+/gu, ' ').trim()
}

function HistoryRow(props: {
  entry: HistoryEntry
  pinned: boolean
  onPick: (entry: HistoryEntry) => void
  onTogglePin: (entry: HistoryEntry) => void
}): ReactElement {
  return (
    <div className="dshdb-history-line">
      <button
        type="button"
        className="dshdb-history-row"
        title={props.entry.statement}
        onClick={() => props.onPick(props.entry)}
      >
        <span className="dshdb-history-sql">{oneLine(props.entry.statement)}</span>
        <span className="dshdb-history-time">{historyAgo(props.entry.at)}</span>
      </button>
      <button
        type="button"
        className="dshdb-history-star"
        data-pinned={props.pinned}
        aria-label={props.pinned ? '取消收藏' : '收藏该语句'}
        title={props.pinned ? '取消收藏' : '收藏该语句'}
        onClick={() => props.onTogglePin(props.entry)}
      >
        <StarIcon size={11} filled={props.pinned} />
      </button>
    </div>
  )
}

/** Memoised: the console re-renders on each keystroke, the history list should not. */
export const HistoryPanel = memo(function HistoryPanel(props: {
  entries: HistoryEntry[]
  pins: HistoryEntry[]
  onPick: (entry: HistoryEntry) => void
  onTogglePin: (entry: HistoryEntry) => void
  onClear: () => void
}): ReactElement {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const matches = (entry: HistoryEntry): boolean => needle === '' || entry.statement.toLowerCase().includes(needle)
  const pins = props.pins.filter(matches)
  const entries = props.entries.filter(matches)
  const searchable = props.pins.length + props.entries.length >= 6
  return (
    <div className="dshdb-history">
      {searchable ? (
        <div className="dshdb-history-search">
          <input
            type="search"
            className="dshdb-input"
            aria-label="搜索历史语句"
            placeholder="搜索历史语句"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}
      {pins.length > 0 ? (
        <div className="dshdb-history-group">
          <div className="dshdb-history-head">
            <span className="dshdb-history-title">收藏 · {pins.length}</span>
          </div>
          <div className="dshdb-history-list">
            {pins.map((entry, index) => (
              <HistoryRow
                key={`pin-${entry.at}-${index}`}
                entry={entry}
                pinned
                onPick={props.onPick}
                onTogglePin={props.onTogglePin}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="dshdb-history-head">
        <span className="dshdb-history-title">最近执行 · {entries.length}</span>
        <Button size="sm" variant="ghost" icon={<ClearIcon size={12} />} onClick={props.onClear}>
          清空
        </Button>
      </div>
      <div className="dshdb-history-list">
        {entries.length === 0 ? (
          <span className="dshdb-history-empty">{needle === '' ? '还没有执行过语句' : '没有匹配的语句'}</span>
        ) : (
          entries.map((entry, index) => (
            <HistoryRow
              key={`${entry.at}-${index}`}
              entry={entry}
              pinned={props.pins.some((item) => item.statement === entry.statement)}
              onPick={props.onPick}
              onTogglePin={props.onTogglePin}
            />
          ))
        )}
      </div>
    </div>
  )
})

/** One key row; memoised so typing in the command box leaves the table alone. */
const KeyRow = memo(function KeyRow({
  info,
  index,
  active,
  onSelect,
}: {
  info: RedisKeyInfo
  index: number
  active: boolean
  onSelect: (key: RedisKeyInfo) => void
}): ReactElement {
  return (
    <tr data-active={active} onClick={() => onSelect(info)} style={{ cursor: 'pointer' }}>
      <td className="dshdb-num">{index + 1}</td>
      <td title={info.key}>
        <span className="dshdb-mono">{info.key}</span>
      </td>
      <td>
        <Tag>{info.type}</Tag>
      </td>
      <td className="dshdb-num" title={info.ttl < 0 ? '不过期' : `${String(info.ttl)} 秒`}>
        {formatTtl(info.ttl)}
      </td>
      <td className="dshdb-num">{info.size === undefined ? '' : formatCount(info.size)}</td>
    </tr>
  )
})

export const KeyGrid = memo(function KeyGrid({
  keys,
  selectedKey,
  onSelect,
}: {
  keys: RedisKeyInfo[]
  selectedKey: string
  onSelect: (key: RedisKeyInfo) => void
}): ReactElement {
  const [sort, setSort] = useState<KeySort>('none')
  const rows = useMemo(() => sortKeys(keys, sort), [keys, sort])
  return (
    <table className="dshdb-grid">
      <thead>
        <tr>
          <th className="dshdb-num">#</th>
          <th
            className="dshdb-th-sortable"
            title={sort === 'none' ? '按名称排序' : sort === 'asc' ? '按名称倒序' : '恢复扫描顺序'}
            data-sorted={sort === 'none' ? undefined : sort}
            onClick={() => setSort(nextKeySort(sort))}
          >
            键
            {sort === 'none' ? null : <span className="dshdb-sort-arrow">{sort === 'asc' ? '▲' : '▼'}</span>}
          </th>
          <th>类型</th>
          <th>TTL</th>
          <th>长度</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((key, index) => (
          <KeyRow key={key.key} info={key} index={index} active={key.key === selectedKey} onSelect={onSelect} />
        ))}
      </tbody>
    </table>
  )
})

export function PagerButton({
  label,
  title,
  onClick,
  disabled,
}: {
  label: string
  title: string
  onClick: () => void
  disabled: boolean
}): ReactElement {
  return (
    <button type="button" className="dshdb-pager-btn" title={title} aria-label={title} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

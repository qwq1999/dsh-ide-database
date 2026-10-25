/**
 * Presentational pieces of the query console: statement history, the Redis key
 * grid and pager buttons. They read nothing from the console state, so they
 * live here instead of growing ConsoleTab.tsx.
 */
import type { ReactElement } from 'react'
import type { RedisKeyInfo } from '../shared/types'
import { historyAgo, type HistoryEntry } from './history'
import { ClearIcon, StarIcon } from './icons'
import { Button, Tag } from './ui'

/** Fold a statement onto one line for the history rows. */
export function oneLine(statement: string): string {
  return statement.replace(/\s+/gu, ' ').trim()
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-US')
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

export function HistoryPanel(props: {
  entries: HistoryEntry[]
  pins: HistoryEntry[]
  onPick: (entry: HistoryEntry) => void
  onTogglePin: (entry: HistoryEntry) => void
  onClear: () => void
}): ReactElement {
  return (
    <div className="dshdb-history">
      {props.pins.length > 0 ? (
        <div className="dshdb-history-group">
          <div className="dshdb-history-head">
            <span className="dshdb-history-title">收藏 · {props.pins.length}</span>
          </div>
          <div className="dshdb-history-list">
            {props.pins.map((entry, index) => (
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
        <span className="dshdb-history-title">最近执行 · {props.entries.length}</span>
        <Button size="sm" variant="ghost" icon={<ClearIcon size={12} />} onClick={props.onClear}>
          清空
        </Button>
      </div>
      <div className="dshdb-history-list">
        {props.entries.length === 0 ? (
          <span className="dshdb-history-empty">还没有执行过语句</span>
        ) : (
          props.entries.map((entry, index) => (
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
}

export function KeyGrid({
  keys,
  selectedKey,
  onSelect,
}: {
  keys: RedisKeyInfo[]
  selectedKey: string
  onSelect: (key: RedisKeyInfo) => void
}): ReactElement {
  return (
    <table className="dshdb-grid">
      <thead>
        <tr>
          <th className="dshdb-num">#</th>
          <th>键</th>
          <th>类型</th>
          <th>TTL</th>
          <th>长度</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key, index) => (
          <tr
            key={key.key}
            data-active={key.key === selectedKey}
            onClick={() => onSelect(key)}
            style={{ cursor: 'pointer' }}
          >
            <td className="dshdb-num">{index + 1}</td>
            <td title={key.key}>
              <span className="dshdb-mono">{key.key}</span>
            </td>
            <td>
              <Tag>{key.type}</Tag>
            </td>
            <td className="dshdb-num">{key.ttl < 0 ? '永久' : `${key.ttl}s`}</td>
            <td className="dshdb-num">{key.size === undefined ? '' : formatCount(key.size)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

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

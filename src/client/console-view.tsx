/**
 * Presentational pieces of the query console: statement history, the Redis key
 * grid and pager buttons. They read nothing from the console state, so they
 * live here instead of growing ConsoleTab.tsx.
 */
import { memo, useCallback, useMemo, useState, type MouseEvent, type ReactElement } from 'react'
import type { RedisKeyInfo } from '../shared/types'
import { historyAgo, type HistoryEntry } from './history'
import { ClearIcon, CopyIcon, StarIcon } from './icons'
import { Button, Tag } from './ui'
import { formatCount, formatTtl } from './format'
import { copyText } from './colmenu'
import { nextKeySort, sortKeys, sortKeysBySize, sortKeysByTtl, type KeySort } from './redissort'
import { placeMenu, TreeMenu, type TreeMenuState } from './views/tree-menu'

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
        className="dshdb-history-copy"
        aria-label="复制语句"
        title="复制语句"
        onClick={() => void copyText(props.entry.statement)}
      >
        <CopyIcon size={11} />
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
  onMenu,
}: {
  info: RedisKeyInfo
  index: number
  active: boolean
  onSelect: (key: RedisKeyInfo) => void
  onMenu: (event: MouseEvent<HTMLTableRowElement>, key: RedisKeyInfo) => void
}): ReactElement {
  return (
    <tr
      data-active={active}
      onClick={() => onSelect(info)}
      onContextMenu={(event) => onMenu(event, info)}
      style={{ cursor: 'pointer' }}
    >
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
  emptyText,
  onSelect,
}: {
  keys: RedisKeyInfo[]
  selectedKey: string
  emptyText?: string
  onSelect: (key: RedisKeyInfo) => void
}): ReactElement {
  const [sort, setSort] = useState<KeySort>('none')
  const [sizeSort, setSizeSort] = useState<KeySort>('none')
  const [ttlSort, setTtlSort] = useState<KeySort>('none')
  const [menu, setMenu] = useState<TreeMenuState | null>(null)
  const rows = useMemo(
    () => sortKeysBySize(sortKeysByTtl(sortKeys(keys, sort), ttlSort), sizeSort),
    [keys, sort, sizeSort, ttlSort],
  )
  const openMenu = useCallback((event: MouseEvent<HTMLTableRowElement>, key: RedisKeyInfo): void => {
    event.preventDefault()
    const items = [{ label: '复制键名', run: () => void copyText(key.key) }]
    setMenu({ ...placeMenu(event.clientX, event.clientY, items), items })
  }, [])
  return (
    <>
    <table className="dshdb-grid">
      <thead>
        <tr>
          <th className="dshdb-num">#</th>
          <th
            className="dshdb-th-sortable"
            title={sort === 'none' ? '按名称排序' : sort === 'asc' ? '按名称倒序' : '恢复扫描顺序'}
            data-sorted={sort === 'none' ? undefined : sort}
            aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : 'none'}
            onClick={() => setSort(nextKeySort(sort))}
          >
            键
            {sort === 'none' ? null : <span className="dshdb-sort-arrow">{sort === 'asc' ? '▲' : '▼'}</span>}
          </th>
          <th>类型</th>
          <th
            className="dshdb-th-sortable"
            title={ttlSort === 'none' ? '按剩余时间升序' : ttlSort === 'asc' ? '按剩余时间降序' : '恢复扫描顺序'}
            data-sorted={ttlSort === 'none' ? undefined : ttlSort}
            aria-sort={ttlSort === 'asc' ? 'ascending' : ttlSort === 'desc' ? 'descending' : 'none'}
            onClick={() => setTtlSort(nextKeySort(ttlSort))}
          >
            TTL
            {ttlSort === 'none' ? null : <span className="dshdb-sort-arrow">{ttlSort === 'asc' ? '▲' : '▼'}</span>}
          </th>
          <th
            className="dshdb-th-sortable"
            title={sizeSort === 'none' ? '按长度升序' : sizeSort === 'asc' ? '按长度降序' : '恢复扫描顺序'}
            data-sorted={sizeSort === 'none' ? undefined : sizeSort}
            aria-sort={sizeSort === 'asc' ? 'ascending' : sizeSort === 'desc' ? 'descending' : 'none'}
            onClick={() => setSizeSort(nextKeySort(sizeSort))}
          >
            长度
            {sizeSort === 'none' ? null : <span className="dshdb-sort-arrow">{sizeSort === 'asc' ? '▲' : '▼'}</span>}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td className="dshdb-muted" colSpan={5} style={{ padding: '10px 12px' }}>
              {emptyText ?? '没有匹配的键'}
            </td>
          </tr>
        ) : (
          rows.map((key, index) => (
            <KeyRow
              key={key.key}
              info={key}
              index={index}
              active={key.key === selectedKey}
              onSelect={onSelect}
              onMenu={openMenu}
            />
          ))
        )}
      </tbody>
    </table>
    <TreeMenu menu={menu} onClose={() => setMenu(null)} />
    </>
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

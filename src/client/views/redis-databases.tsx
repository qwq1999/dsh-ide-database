import type { ReactElement } from 'react'

import type { ClientConnection, RedisKeyInfo } from '../../shared/types'
import { DatabaseIcon, KeyIcon } from '../icons'
import { redisTtlLabel } from '../redisvalue'
import { Spinner, Tag } from '../ui'
import { DEPTH_ONE, DEPTH_TWO, Highlight, RowToggle } from './tree-parts'

export function RedisDatabases({
  connection,
  keysByDb,
  cursors,
  loadingByDb,
  visibleDbs,
  expanded,
  selectedKey,
  query,
  onToggleDb,
  onLoadMore,
  onSelectDb,
  onSelectKey,
}: {
  connection: ClientConnection
  keysByDb: Record<string, RedisKeyInfo[]> | undefined
  cursors: Record<string, string> | undefined
  loadingByDb: Record<string, boolean> | undefined
  visibleDbs: number[]
  expanded: Record<string, boolean>
  selectedKey: string
  query: string
  onToggleDb: (db: number) => void
  onLoadMore: (db: number) => void
  onSelectDb: (db: number) => void
  onSelectKey: (db: number, key: string) => void
}): ReactElement {
  if (visibleDbs.length === 0) {
    return (
      <div className="dshdb-muted" style={{ padding: '4px 6px 4px 26px' }}>
        未选择数据库，使用行尾的数据库按钮选择
      </div>
    )
  }

  return (
    <div role="group">
      {visibleDbs.map((db) => {
        const nodeKey = `${connection.id}:redis:db${db}`
        const open = expanded[nodeKey] !== false
        const keys = keysByDb?.[String(db)]
        const loading = loadingByDb?.[String(db)] === true
        const cursor = cursors?.[String(db)]
        const list = (keys ?? []).filter((key) => query === '' || key.key.toLowerCase().includes(query))
        const hasMore = cursor !== undefined && cursor !== '0'
        const active = selectedKey === `${connection.id}|redisdb:${db}`

        return (
          <div key={db} role="group">
            <button
              type="button"
              className="dshdb-row"
              role="treeitem"
              aria-level={2}
              aria-expanded={open}
              aria-selected={active}
              data-active={active}
              data-kind="schema"
              style={DEPTH_ONE}
              title={`Redis 逻辑库 db${db}${db === connection.redisDb ? '（默认）' : ''}`}
              onClick={() => onSelectDb(db)}
              onDoubleClick={() => onToggleDb(db)}
            >
              <RowToggle open={open} title={open ? '收起数据库' : '展开数据库'} onToggle={() => onToggleDb(db)} />
              <span className="dshdb-row-icon">
                <DatabaseIcon size={13} />
              </span>
              <span className="dshdb-row-label dshdb-mono">db{db}</span>
              {db === connection.redisDb ? <span className="dshdb-row-meta">默认</span> : null}
              {loading ? <Spinner /> : null}
              {!loading && keys !== undefined ? <span className="dshdb-row-meta">{keys.length} 个键</span> : null}
            </button>

            {open ? (
              <>
                {keys === undefined && loading ? (
                  <div className="dshdb-muted dshdb-inline" style={{ padding: '4px 6px 4px 26px' }}>
                    <Spinner /> 正在扫描键…
                  </div>
                ) : null}
                {keys === undefined && !loading ? (
                  <button
                    type="button"
                    className="dshdb-row"
                    style={DEPTH_TWO}
                    data-kind="folder"
                    onClick={() => onLoadMore(db)}
                  >
                    <span className="dshdb-row-toggle" />
                    <span className="dshdb-row-label dshdb-muted">扫描键</span>
                  </button>
                ) : null}
                {keys !== undefined && list.length === 0 ? (
                  <div className="dshdb-muted" style={{ padding: '4px 6px 4px 26px' }}>
                    {query ? '没有匹配的键' : '没有键'}
                  </div>
                ) : null}
                {list.map((key) => (
                  <button
                    key={key.key}
                    type="button"
                    className="dshdb-row"
                    role="treeitem"
                    aria-level={4}
                    data-active={selectedKey === `${connection.id}|redis:${db}:${key.key}`}
                    data-kind="redis-key"
                    style={DEPTH_TWO}
                    title={`${key.key} · ${key.type} · TTL ${redisTtlLabel(key.ttl)}`}
                    onClick={() => onSelectKey(db, key.key)}
                  >
                    <span className="dshdb-row-toggle" />
                    <span className="dshdb-row-icon">
                      <KeyIcon size={13} />
                    </span>
                    <span className="dshdb-row-label">
                      <Highlight text={key.key} query={query} />
                    </span>
                    <Tag>{key.type}</Tag>
                    {key.size === undefined ? null : <span className="dshdb-row-meta">{key.size}</span>}
                  </button>
                ))}
                {hasMore ? (
                  <button
                    type="button"
                    className="dshdb-row"
                    style={DEPTH_TWO}
                    data-kind="folder"
                    disabled={loading}
                    onClick={() => onLoadMore(db)}
                  >
                    <span className="dshdb-row-toggle" />
                    <span className="dshdb-row-label dshdb-muted">{loading ? '正在加载…' : '加载更多键'}</span>
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

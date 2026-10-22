import { useMemo, useState, type CSSProperties, type ReactElement } from 'react'
import type { ClientConnection, SchemaInfo, SchemaObject, ServerInfo, TableDescription } from '../../shared/types'
import { objectKindLabel } from '../format'
import { ChevronDownIcon, ChevronRightIcon, DatabaseIcon, PlusIcon, RefreshIcon, TableIcon, ViewIcon } from '../icons'
import { Button, EmptyState, Panel, Spinner, StateDot, Tag, TextInput } from '../ui'

export interface DataViewProps {
  connection?: ClientConnection
  server?: ServerInfo
  connecting: boolean
  schemas: SchemaInfo[]
  objects: Record<string, SchemaObject[]>
  expanded: Record<string, boolean>
  loadingSchemas: boolean
  loadingObjects: Record<string, boolean>
  detail: TableDescription | null
  detailLoading: boolean
  selectedKey: string
  onAddConnection: () => void
  onConnect: () => void
  onRefreshSchemas: () => void
  onToggleSchema: (schema: string) => void
  onSelectObject: (schema: string, object: SchemaObject) => void
  onQueryObject: (schema: string, object: SchemaObject) => void
  onOpenRedis: () => void
}

const CHILD_DEPTH = { '--dshdb-depth': 1 } as CSSProperties

function ObjectRow({
  object,
  selected,
  onSelect,
}: {
  object: SchemaObject
  selected: boolean
  onSelect: () => void
}): ReactElement {
  return (
    <button
      type="button"
      className="dshdb-row"
      data-active={selected}
      data-kind={object.kind}
      style={CHILD_DEPTH}
      title={object.comment ? `${object.name} — ${object.comment}` : object.name}
      onClick={onSelect}
    >
      <span className="dshdb-row-toggle" />
      <span className="dshdb-row-icon">
        {object.kind === 'view' ? <ViewIcon size={13} /> : <TableIcon size={13} />}
      </span>
      <span className="dshdb-row-label">{object.name}</span>
      <span className="dshdb-row-meta">{objectKindLabel(object.kind)}</span>
    </button>
  )
}

export function DataView(props: DataViewProps): ReactElement {
  const [filter, setFilter] = useState('')
  const { connection, server, connecting, schemas, objects, expanded, loadingObjects, detail, detailLoading } = props

  const normalizedFilter = filter.trim().toLowerCase()
  const visibleSchemas = useMemo(
    () => schemas.filter((schema) => !normalizedFilter || schema.name.toLowerCase().includes(normalizedFilter)),
    [schemas, normalizedFilter],
  )

  if (!connection) {
    return (
      <EmptyState
        icon={<DatabaseIcon size={28} />}
        title="还没有数据源"
        description="添加 MySQL、Oracle、达梦、OceanBase 或 Redis 连接，然后在右侧面板里浏览库表、执行 SQL 与命令。"
        actions={
          <Button variant="primary" icon={<PlusIcon size={13} />} onClick={props.onAddConnection}>
            新建连接
          </Button>
        }
      />
    )
  }

  if (connection.dialect === 'redis') {
    return (
      <EmptyState
        icon={<DatabaseIcon size={28} />}
        title={`${connection.name} 是 Redis 连接`}
        description="Redis 的键浏览与命令控制台在「Redis」标签页中提供。"
        actions={
          <Button variant="primary" onClick={props.onOpenRedis}>
            打开 Redis 控制台
          </Button>
        }
      />
    )
  }

  if (!server) {
    return (
      <EmptyState
        icon={<DatabaseIcon size={28} />}
        title={connecting ? '正在连接…' : '尚未连接'}
        description={connecting ? `${connection.host}:${connection.port}` : `连接到 ${connection.host}:${connection.port} 后即可浏览 schema、表和视图。`}
        actions={
          connecting ? (
            <Spinner size={16} />
          ) : (
            <Button variant="primary" onClick={props.onConnect}>
              连接
            </Button>
          )
        }
      />
    )
  }

  return (
    <div className="dshdb-view" style={{ gap: 8 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flex: 'none',
        }}
      >
        <span className="dshdb-inline" style={{ gap: 6 }}>
          <StateDot tone="success" />
          <span className="dshdb-mono" title={server.url}>
            {server.product} {server.version}
          </span>
        </span>
        <span className="dshdb-grow" />
        <TextInput
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="筛选 schema…"
          aria-label="筛选 schema"
          style={{ width: 120 }}
        />
        <Button
          size="sm"
          variant="ghost"
          icon={<RefreshIcon size={13} />}
          onClick={props.onRefreshSchemas}
          aria-label="刷新 schema"
          title="刷新 schema"
        />
      </div>

      <Panel
        title={
          <span className="dshdb-inline">
            Schema
            {props.loadingSchemas ? <Spinner /> : null}
          </span>
        }
        className="dshdb-grow"
        bodyClassName="dshdb-panel-body-pad"
      >
        <div className="dshdb-tree dshdb-scroll-thin" role="tree" aria-label="数据库对象">
          {visibleSchemas.length === 0 ? (
            <div className="dshdb-muted" style={{ padding: '8px 6px' }}>
              {props.loadingSchemas ? '正在加载 schema…' : '没有匹配的 schema'}
            </div>
          ) : (
            visibleSchemas.map((schema) => {
              const key = `${connection.id}:${schema.name}`
              const isExpanded = expanded[key] === true
              const list = objects[key]
              const loading = loadingObjects[key] === true
              return (
                <div key={schema.name}>
                  <button
                    type="button"
                    className="dshdb-row"
                    role="treeitem"
                    aria-expanded={isExpanded}
                    data-kind="schema"
                    onClick={() => props.onToggleSchema(schema.name)}
                  >
                    <span className="dshdb-row-toggle">
                      {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                    </span>
                    <span className="dshdb-row-icon">
                      <DatabaseIcon size={13} />
                    </span>
                    <span className="dshdb-row-label">{schema.name}</span>
                    {schema.system ? <Tag>系统</Tag> : null}
                    {loading ? <Spinner /> : null}
                  </button>
                  {isExpanded ? (
                    <div role="group">
                      {loading && !list ? (
                        <div className="dshdb-muted" style={{ padding: '4px 6px 4px 28px' }}>
                          正在加载对象…
                        </div>
                      ) : null}
                      {(list ?? []).filter(
                        (object) => !normalizedFilter || object.name.toLowerCase().includes(normalizedFilter),
                      ).length === 0 && !loading ? (
                        <div className="dshdb-muted" style={{ padding: '4px 6px 4px 28px' }}>
                          没有表或视图
                        </div>
                      ) : null}
                      {(list ?? [])
                        .filter((object) => !normalizedFilter || object.name.toLowerCase().includes(normalizedFilter))
                        .map((object) => (
                          <ObjectRow
                            key={object.name}
                            object={object}
                            selected={props.selectedKey === `${schema.name}.${object.name}`}
                            onSelect={() => props.onSelectObject(schema.name, object)}
                          />
                        ))}
                    </div>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </Panel>

      {detailLoading ? (
        <div className="dshdb-muted dshdb-inline" style={{ padding: 6 }}>
          <Spinner /> 正在读取表结构…
        </div>
      ) : null}
      {!detailLoading && detail ? (
        <Panel
          title={
            <span className="dshdb-inline">
              <TableIcon size={13} />
              <span className="dshdb-mono">
                {detail.schema}.{detail.table}
              </span>
              <Tag>{objectKindLabel(detail.kind)}</Tag>
            </span>
          }
          actions={
            <>
              <Button size="sm" onClick={() => props.onQueryObject(detail.schema, { name: detail.table, kind: detail.kind })}>
                查询数据
              </Button>
            </>
          }
          bodyClassName="dshdb-panel-body-pad"
          scroll
        >
          <div className="dshdb-grid-wrap" style={{ maxHeight: 220 }}>
            <table className="dshdb-grid">
              <thead>
                <tr>
                  <th>列</th>
                  <th>类型</th>
                  <th>可空</th>
                  <th>默认值</th>
                  <th>注释</th>
                </tr>
              </thead>
              <tbody>
                {detail.columns.map((column) => (
                  <tr key={column.name}>
                    <td title={column.name}>
                      {column.name}
                      {column.primaryKey ? <span className="dshdb-tag" style={{ marginLeft: 6 }}>PK</span> : null}
                    </td>
                    <td title={column.typeName}>{column.typeName}</td>
                    <td>{column.nullable === false ? '否' : '是'}</td>
                    <td title={column.defaultValue ?? ''}>{column.defaultValue ?? '—'}</td>
                    <td title={column.comment ?? ''}>{column.comment ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail.indexes.length > 0 ? (
            <div className="dshdb-kv" style={{ padding: '8px 0 0' }}>
              {detail.indexes.map((index) => (
                <span key={index.name} style={{ display: 'contents' }}>
                  <span className="dshdb-kv-key">
                    {index.primary ? '主键' : index.unique ? '唯一索引' : '索引'} {index.name}
                  </span>
                  <span className="dshdb-kv-val dshdb-mono">{index.columns.join(', ')}</span>
                </span>
              ))}
            </div>
          ) : null}
        </Panel>
      ) : null}
      {!detailLoading && !detail ? (
        <div className="dshdb-muted" style={{ padding: '0 2px' }}>
          在上方选择表或视图可查看列、索引等结构信息。
        </div>
      ) : null}
    </div>
  )
}

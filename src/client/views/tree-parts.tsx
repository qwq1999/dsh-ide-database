import { memo, type CSSProperties, type MouseEvent, type ReactElement, type ReactNode } from 'react'
import type { ObjectKind, SchemaObject, TableDescription } from '../../shared/types'
import { objectKindLabel } from '../format'
import { highlightParts } from '../highlight'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ColumnIcon,
  FolderIcon,
  FunctionIcon,
  IndexIcon,
  KeyIcon,
  SequenceIcon,
  TableIcon,
  TriggerIcon,
  ViewIcon,
} from '../icons'
import { Spinner } from '../ui'

export function objectIcon(kind: ObjectKind): ReactNode {
  if (kind === 'table') return <TableIcon size={13} />
  if (kind === 'view') return <ViewIcon size={13} />
  if (kind === 'procedure' || kind === 'function') return <FunctionIcon size={13} />
  if (kind === 'sequence') return <SequenceIcon size={13} />
  if (kind === 'trigger') return <TriggerIcon size={13} />
  return <FolderIcon size={13} />
}

export const DEPTH_ONE = { '--dshdb-depth': 1 } as CSSProperties
export const DEPTH_TWO = { '--dshdb-depth': 2 } as CSSProperties
export const DEPTH_THREE = { '--dshdb-depth': 3 } as CSSProperties
export const DEPTH_FOUR = { '--dshdb-depth': 4 } as CSSProperties
export const DEPTH_FIVE = { '--dshdb-depth': 5 } as CSSProperties

/**
 * Expanding is reserved for the chevron: clicking a row's name only selects it,
 * so browsing never collapses the branch being read. Clicking the chevron also
 * selects the row, the way JetBrains trees behave.
 */
export function RowToggle({
  open,
  title,
  onToggle,
}: {
  open: boolean
  title: string
  onToggle: () => void
}): ReactElement {
  return (
    <span
      className="dshdb-row-toggle dshdb-row-toggle-action"
      role="presentation"
      title={title}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {open ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
    </span>
  )
}

export function DetailFolder({
  label,
  icon,
  count,
  depth,
  open,
  onToggle,
  onSelect,
  children,
}: {
  label: string
  icon: ReactNode
  count: number
  depth: CSSProperties
  open: boolean
  onToggle: () => void
  onSelect?: () => void
  children: ReactNode
}): ReactElement {
  return (
    <div>
      <button
        type="button"
        className="dshdb-row"
        role="treeitem"
        aria-expanded={open}
        data-kind="folder"
        style={depth}
        onClick={onSelect}
        onDoubleClick={onToggle}
      >
        <RowToggle open={open} title={open ? `收起${label}` : `展开${label}`} onToggle={onToggle} />
        <span className="dshdb-row-icon">{icon}</span>
        <span className="dshdb-row-label">{label}</span>
        <span className="dshdb-row-meta">{count}</span>
      </button>
      {open ? <div role="group">{children}</div> : null}
    </div>
  )
}

export function Highlight({ text, query }: { text: string; query: string }): ReactElement {
  return (
    <>
      {highlightParts(text, query).map((part, index) =>
        part.hit ? (
          <mark key={index} className="dshdb-mark">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}

export const ObjectRow = memo(function ObjectRow({
  connectionId,
  schema,
  object,
  selected,
  expanded,
  description,
  loading,
  onSelect,
  onOpen,
  onToggleKey,
  onMenu,
  query,
}: {
  connectionId: string
  schema: string
  object: SchemaObject
  selected: boolean
  expanded: Record<string, boolean>
  description: TableDescription | undefined
  loading: boolean
  onSelect: (connectionId: string, schema: string, object: SchemaObject) => void
  onOpen: (connectionId: string, schema: string, object: SchemaObject) => void
  onToggleKey: (key: string) => void
  onMenu?: (
    event: MouseEvent<HTMLButtonElement>,
    connectionId: string,
    schema: string,
    object: SchemaObject,
  ) => void
  query: string
}): ReactElement {
  const isRelation = object.kind === 'table' || object.kind === 'view'
  const key = `${connectionId}|${schema}.${object.name}`
  const open = isRelation && expanded[key] === true
  const keys = description?.indexes.filter((index) => index.primary === true || index.unique === true) ?? []
  const indexes = description?.indexes ?? []
  const columnFolderKey = `${key}#columns`
  const keyFolderKey = `${key}#keys`
  const indexFolderKey = `${key}#indexes`

  return (
    <div>
      <button
        type="button"
        className="dshdb-row"
        role="treeitem"
        aria-level={4}
        aria-expanded={isRelation ? open : undefined}
        data-active={selected}
        data-kind={object.kind}
        style={DEPTH_THREE}
        title={object.comment ? `${object.name} — ${object.comment}` : `${object.name}（${objectKindLabel(object.kind)}）`}
        onClick={(event) => {
          // A double-click opens the table tab, so ignore the second click.
          if (event.detail > 1) return
          onSelect(connectionId, schema, object)
        }}
        onDoubleClick={() => {
          if (!isRelation) return
          onSelect(connectionId, schema, object)
          onOpen(connectionId, schema, object)
        }}
        onKeyDown={(event) => {
          // Enter is the keyboard equivalent of double-clicking a table.
          if (event.key !== 'Enter' || !isRelation) return
          event.preventDefault()
          onSelect(connectionId, schema, object)
          onOpen(connectionId, schema, object)
        }}
        onContextMenu={
          onMenu === undefined
            ? undefined
            : (event) => onMenu(event, connectionId, schema, object)
        }
      >
        {isRelation ? (
          <RowToggle
            open={open}
            title={open ? '收起结构' : '展开结构'}
            onToggle={() => {
              onSelect(connectionId, schema, object)
              onToggleKey(key)
            }}
          />
        ) : (
          <span className="dshdb-row-toggle" />
        )}
        <span className="dshdb-row-icon">{objectIcon(object.kind)}</span>
        <span className="dshdb-row-label">
          <Highlight text={object.name} query={query} />
        </span>
        {loading ? <Spinner /> : null}
      </button>

      {open ? (
        <div role="group">
          {loading && description === undefined ? (
            <div className="dshdb-muted" style={{ padding: '4px 6px 4px 52px' }}>
              正在读取结构…
            </div>
          ) : null}
          {!loading && description === undefined ? (
            <div className="dshdb-muted" style={{ padding: '4px 6px 4px 52px' }}>
              未连接数据源，连接后可查看结构
            </div>
          ) : null}
          {description !== undefined ? (
            <>
              <DetailFolder
                label="列"
                icon={<ColumnIcon size={13} />}
                count={description.columns.length}
                depth={DEPTH_FOUR}
                open={expanded[columnFolderKey] === true}
                onToggle={() => onToggleKey(columnFolderKey)}
                onSelect={() => onSelect(connectionId, schema, object)}
              >
                {description.columns.map((column) => (
                  <div key={column.name} className="dshdb-row" style={DEPTH_FIVE} data-kind="column">
                    <span className="dshdb-row-toggle" />
                    <span className="dshdb-row-icon">
                      <ColumnIcon size={13} />
                    </span>
                    <span className="dshdb-row-label">{column.name}</span>
                    {column.primaryKey ? <span className="dshdb-tag" data-tone="key">PK</span> : null}
                    <span className="dshdb-row-meta">{column.typeName}</span>
                  </div>
                ))}
              </DetailFolder>

              {keys.length > 0 ? (
                <DetailFolder
                  label="键"
                  icon={<KeyIcon size={13} />}
                  count={keys.length}
                  depth={DEPTH_FOUR}
                  open={expanded[keyFolderKey] === true}
                  onToggle={() => onToggleKey(keyFolderKey)}
                  onSelect={() => onSelect(connectionId, schema, object)}
                >
                  {keys.map((index) => (
                    <div key={index.name} className="dshdb-row" style={DEPTH_FIVE} data-kind="key">
                      <span className="dshdb-row-toggle" />
                      <span className="dshdb-row-icon">
                        <KeyIcon size={13} />
                      </span>
                      <span className="dshdb-row-label">{index.primary ? '主键' : index.name}</span>
                      <span className="dshdb-row-meta">{index.columns.join(', ')}</span>
                    </div>
                  ))}
                </DetailFolder>
              ) : null}

              {indexes.length > 0 ? (
                <DetailFolder
                  label="索引"
                  icon={<IndexIcon size={13} />}
                  count={indexes.length}
                  depth={DEPTH_FOUR}
                  open={expanded[indexFolderKey] === true}
                  onToggle={() => onToggleKey(indexFolderKey)}
                  onSelect={() => onSelect(connectionId, schema, object)}
                >
                  {indexes.map((index) => (
                    <div key={index.name} className="dshdb-row" style={DEPTH_FIVE} data-kind="index">
                      <span className="dshdb-row-toggle" />
                      <span className="dshdb-row-icon">
                        <IndexIcon size={13} />
                      </span>
                      <span className="dshdb-row-label">{index.name}</span>
                      <span className="dshdb-row-meta">{index.columns.join(', ')}</span>
                    </div>
                  ))}
                </DetailFolder>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
})

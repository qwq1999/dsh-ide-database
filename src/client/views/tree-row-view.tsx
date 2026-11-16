import { memo, type CSSProperties, type DragEvent, type MouseEvent, type ReactElement, type ReactNode } from 'react'

import type { SchemaObject } from '../../shared/types'
import { objectKindLabel } from '../format'
import {
  ColumnIcon,
  DatabaseIcon,
  FolderIcon,
  FunctionIcon,
  IndexIcon,
  KeyIcon,
  SequenceIcon,
  TableIcon,
  TriggerIcon,
  ViewIcon,
} from '../icons'
import { Loading, StateDot, Tag } from '../ui'
import { RowPicker } from './row-picker'
import { Highlight, RowToggle } from './tree-parts'
import type { TreeRow, TreeRowKind } from './tree-rows'

/** Imperative handlers shared by every mounted row. Stable for the whole view. */
export interface TreeRowActions {
  activate: (row: TreeRow, event: MouseEvent<HTMLElement>) => void
  toggle: (row: TreeRow) => void
  open: (row: TreeRow) => void
  menu: (row: TreeRow, event: MouseEvent<HTMLElement>) => void
  connect: (connectionId: string) => void
  toggleSchemaVisible: (connectionId: string, schema: string) => void
  toggleAllSchemasVisible: (connectionId: string, all: boolean) => void
  toggleRedisDbVisible: (connectionId: string, db: number) => void
  toggleAllRedisDbsVisible: (connectionId: string, all: boolean) => void
  dragStart: (id: string, event: DragEvent<HTMLElement>) => void
  dragOver: (id: string, event: DragEvent<HTMLElement>) => void
  dragLeave: (event: DragEvent<HTMLElement>) => void
  drop: (id: string, event: DragEvent<HTMLElement>) => void
  dragEnd: () => void
}

export interface TreeRowViewProps {
  row: TreeRow
  index: number
  /** DOM id used by aria-activedescendant. */
  domId: string
  selected: boolean
  active: boolean
  dragging: boolean
  drop: '' | 'before' | 'after'
  /** True when data-source reordering is wired up; only connection rows drag. */
  dragEnabled: boolean
  /** 设置 > 数据源：append each table's comment to its row label. */
  showComments: boolean
  actions: TreeRowActions
}

const folderIcon = (folder: TreeRow['folder']): ReactNode => {
  if (folder === 'table') return <TableIcon size={13} />
  if (folder === 'view') return <ViewIcon size={13} />
  if (folder === 'routine') return <FunctionIcon size={13} />
  if (folder === 'sequence') return <SequenceIcon size={13} />
  if (folder === 'trigger') return <TriggerIcon size={13} />
  return <FolderIcon size={13} />
}

const detailIcon = (section: TreeRow['detailSection']): ReactNode => {
  if (section === 'columns') return <ColumnIcon size={13} />
  if (section === 'keys') return <KeyIcon size={13} />
  return <IndexIcon size={13} />
}

const rowIcon = (row: TreeRow): ReactNode => {
  switch (row.kind) {
    case 'connection':
    case 'schema':
    case 'redis-db':
      return <DatabaseIcon size={13} />
    case 'folder':
      return folderIcon(row.folder)
    case 'detail-folder':
      return detailIcon(row.detailSection)
    case 'object':
      return row.object === undefined ? <FolderIcon size={13} /> : objectIcon(row.object)
    case 'column':
      return <ColumnIcon size={13} />
    case 'key':
      return <KeyIcon size={13} />
    case 'index':
      return <IndexIcon size={13} />
    case 'redis-key':
      return <KeyIcon size={13} />
    default:
      return null
  }
}

function objectIcon(object: SchemaObject): ReactNode {
  if (object.kind === 'table') return <TableIcon size={13} />
  if (object.kind === 'view') return <ViewIcon size={13} />
  if (object.kind === 'procedure' || object.kind === 'function') return <FunctionIcon size={13} />
  if (object.kind === 'sequence') return <SequenceIcon size={13} />
  if (object.kind === 'trigger') return <TriggerIcon size={13} />
  return <FolderIcon size={13} />
}

const toggleTitle = (row: TreeRow): string => {
  if (row.kind === 'connection') return row.open ? '收起数据源' : '展开数据源'
  if (row.kind === 'schema') return row.open ? '收起 Schema' : '展开 Schema'
  if (row.kind === 'redis-db') return row.open ? '收起数据库' : '展开数据库'
  return row.open ? `收起${row.label ?? ''}` : `展开${row.label ?? ''}`
}

const rowTitle = (row: TreeRow): string | undefined => {
  if (row.kind !== 'object' || row.object === undefined) return row.title
  const object = row.object
  return object.comment === undefined || object.comment === ''
    ? `${object.name}（${objectKindLabel(object.kind)}）`
    : `${object.name} — ${object.comment}`
}

const pickerToggle = (row: TreeRow, actions: TreeRowActions, id: string): void => {
  if (row.connectionId === undefined || row.picker === undefined) return
  if (row.picker.mode === 'redis-dbs') actions.toggleRedisDbVisible(row.connectionId, Number(id))
  else actions.toggleSchemaVisible(row.connectionId, id)
}

const pickerToggleAll = (row: TreeRow, actions: TreeRowActions, all: boolean): void => {
  if (row.connectionId === undefined || row.picker === undefined) return
  if (row.picker.mode === 'redis-dbs') actions.toggleAllRedisDbsVisible(row.connectionId, all)
  else actions.toggleAllSchemasVisible(row.connectionId, all)
}

/** Columns and keys are read-only leaves: no chevron, no expansion, no handler. */
const drawToggle = (row: TreeRow, actions: TreeRowActions): ReactNode => {
  if (row.expandable) {
    return <RowToggle open={row.open} title={toggleTitle(row)} onToggle={() => actions.toggle(row)} />
  }
  return <span className="dshdb-row-toggle" />
}

const drawLabel = (row: TreeRow, showComments = false): ReactNode => {
  const comment = showComments && row.kind === 'object' ? row.object?.comment ?? '' : ''
  return (
    <span className={`dshdb-row-label${row.mono === true ? ' dshdb-mono' : ''}`}>
      {row.query === undefined || row.query === '' ? (
        row.label
      ) : (
        <Highlight text={row.label ?? ''} query={row.query} />
      )}
      {comment === '' ? null : <span className="dshdb-row-comment">{comment}</span>}
    </span>
  )
}

const drawMeta = (row: TreeRow): ReactNode =>
  row.meta === undefined ? null : <span className="dshdb-row-meta">{row.meta}</span>

function drawContent(row: TreeRow, actions: TreeRowActions, showComments: boolean): ReactNode {
  switch (row.kind) {
    case 'connection':
      return (
        <>
          {drawToggle(row, actions)}
          <span className="dshdb-row-icon">
            <DatabaseIcon size={13} />
          </span>
          {drawLabel(row)}
          {row.tag === undefined ? null : <Tag>{row.tag}</Tag>}
          {row.readOnly === true ? <Tag tone="warn">只读</Tag> : null}
          {row.cacheLabel === undefined ? null : <span className="dshdb-row-meta">{row.cacheLabel}</span>}
          {row.picker === undefined || row.connectionId === undefined ? null : (
            <RowPicker
              title={row.picker.title}
              allLabel={row.picker.allLabel}
              items={row.picker.items}
              visible={row.picker.visible}
              onToggle={(id) => pickerToggle(row, actions, id)}
              onToggleAll={(all) => pickerToggleAll(row, actions, all)}
            />
          )}
          {row.online === true || row.connecting === true ? null : (
            <span
              className="dshdb-row-action dshdb-connect-action"
              role="button"
              tabIndex={0}
              title={`连接 ${row.title?.split(' · ')[1] ?? ''}`}
              onClick={(event) => {
                event.stopPropagation()
                if (row.connectionId !== undefined) actions.connect(row.connectionId)
              }}
              onDoubleClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  event.stopPropagation()
                  if (row.connectionId !== undefined) actions.connect(row.connectionId)
                }
              }}
            >
              连接
            </span>
          )}
          <StateDot
            tone={
              row.online === true ? 'success' : row.connecting === true ? 'warn' : row.redis === true ? 'business' : 'idle'
            }
          />
        </>
      )
    case 'connect':
      return (
        <>
          <span className="dshdb-row-toggle" />
          <span className="dshdb-row-icon">{row.loading === true ? <Loading bare /> : <DatabaseIcon size={13} />}</span>
          <span className="dshdb-row-label dshdb-muted">{row.label}</span>
        </>
      )
    case 'schema':
      return (
        <>
          {drawToggle(row, actions)}
          <span className="dshdb-row-icon">
            <DatabaseIcon size={13} />
          </span>
          {drawLabel(row)}
          {row.system === true ? <Tag>系统</Tag> : null}
          {row.loading === true ? <Loading bare /> : null}
          {drawMeta(row)}
        </>
      )
    case 'folder':
      return (
        <>
          {drawToggle(row, actions)}
          <span className="dshdb-row-icon">{rowIcon(row)}</span>
          {drawLabel(row)}
          {drawMeta(row)}
        </>
      )
    case 'object':
      return (
        <>
          {row.expandable ? (
            <RowToggle
              open={row.open}
              title={row.open ? '收起对象' : '展开对象'}
              onToggle={() => actions.toggle(row)}
            />
          ) : (
            <span className="dshdb-row-toggle" />
          )}
          <span className="dshdb-row-icon">{rowIcon(row)}</span>
          {drawLabel(row, showComments)}
          {row.loading === true ? <Loading bare /> : null}
        </>
      )
    case 'detail-folder':
      return (
        <>
          {drawToggle(row, actions)}
          <span className="dshdb-row-icon">{rowIcon(row)}</span>
          {drawLabel(row)}
          {drawMeta(row)}
        </>
      )
    case 'column':
      return (
        <>
          <span className="dshdb-row-toggle" />
          <span className="dshdb-row-icon">
            <ColumnIcon size={13} />
          </span>
          {drawLabel(row)}
          {row.primaryKey === true ? <Tag tone="business">PK</Tag> : null}
          {drawMeta(row)}
        </>
      )
    case 'key':
    case 'index':
      return (
        <>
          <span className="dshdb-row-toggle" />
          <span className="dshdb-row-icon">{rowIcon(row)}</span>
          {drawLabel(row)}
          {drawMeta(row)}
        </>
      )
    case 'more':
      return <span className="dshdb-row-label dshdb-muted">{row.label}</span>
    case 'redis-db':
      return (
        <>
          {drawToggle(row, actions)}
          <span className="dshdb-row-icon">
            <DatabaseIcon size={13} />
          </span>
          {drawLabel(row)}
          {row.defaultDb === true ? <span className="dshdb-row-meta">默认</span> : null}
          {row.loading === true ? <Loading bare /> : null}
          {drawMeta(row)}
        </>
      )
    case 'redis-key':
      return (
        <>
          <span className="dshdb-row-toggle" />
          <span className="dshdb-row-icon">
            <KeyIcon size={13} />
          </span>
          {drawLabel(row)}
          {row.tag === undefined ? null : <Tag>{row.tag}</Tag>}
          {drawMeta(row)}
        </>
      )
    case 'redis-action':
      return (
        <>
          <span className="dshdb-row-toggle" />
          {row.loading === true ? <Loading bare /> : null}
          <span className="dshdb-row-label dshdb-muted">{row.label}</span>
        </>
      )
    default:
      return null
  }
}

/** Rails that keep a recycled row from painting a stale drop indicator. */
const dropClass = (drop: TreeRowViewProps['drop']): string => {
  if (drop === 'before') return ' dshdb-row-drop-before'
  if (drop === 'after') return ' dshdb-row-drop-after'
  return ''
}

function selectedKind(kind: TreeRowKind): boolean {
  return kind === 'object' || kind === 'redis-db'
}

/**
 * One mounted tree row. Every prop is a scalar or a stable reference: the row
 * object only changes when the tree data changes, and `actions` is memoized by
 * the view, so selecting a table repaints just the two rows whose `selected`
 * flag flipped.
 */
export const TreeRowView = memo(function TreeRowView({
  row,
  index,
  domId,
  selected,
  active,
  dragging,
  drop,
  dragEnabled,
  showComments,
  actions,
}: TreeRowViewProps): ReactElement {
  const style = { '--dshdb-depth': row.depth } as CSSProperties
  if (row.kind === 'note') {
    return (
      <div className="dshdb-row dshdb-muted" role="none" style={style} data-index={index}>
        {row.loading === true ? <Loading bare /> : null}
        <span className="dshdb-row-label">{row.label}</span>
      </div>
    )
  }

  const className = `dshdb-row${dragging ? ' dshdb-row-dragging' : ''}${dropClass(drop)}`
  const objectRelation = row.kind === 'object' && row.expandable
  return (
    <button
      type="button"
      id={domId}
      className={className}
      role="treeitem"
      aria-level={row.ariaLevel}
      aria-expanded={row.expandable ? row.open : undefined}
      aria-selected={selectedKind(row.kind) ? selected : undefined}
      aria-current={active ? 'true' : undefined}
      data-active={selected}
      data-kind={row.dataKind}
      data-row-key={row.key}
      data-index={index}
      tabIndex={-1}
      style={style}
      title={rowTitle(row)}
      disabled={row.kind === 'connect' && row.loading === true}
      onClick={(event) => actions.activate(row, event)}
      onDoubleClick={() => {
        if (objectRelation || row.expandable || row.kind === 'redis-db') actions.open(row)
      }}
      onKeyDown={(event) => {
        // Enter on an object row is the old ObjectRow shortcut; the container
        // handler also sees the bubbled event, so stop it here.
        if (event.key === 'Enter' && row.kind === 'object' && row.expandable) {
          event.preventDefault()
          event.stopPropagation()
          actions.open(row)
        }
      }}
      onContextMenu={(event) => {
        if (row.kind === 'connection' || row.kind === 'schema' || row.kind === 'object') {
          actions.menu(row, event)
        }
      }}
      draggable={row.kind === 'connection' && dragEnabled}
      onDragStart={
        row.kind === 'connection'
          ? (event) => {
              if (row.connectionId !== undefined) actions.dragStart(row.connectionId, event)
            }
          : undefined
      }
      onDragOver={
        row.kind === 'connection'
          ? (event) => {
              if (row.connectionId !== undefined) actions.dragOver(row.connectionId, event)
            }
          : undefined
      }
      onDragLeave={row.kind === 'connection' ? actions.dragLeave : undefined}
      onDrop={
        row.kind === 'connection'
          ? (event) => {
              if (row.connectionId !== undefined) actions.drop(row.connectionId, event)
            }
          : undefined
      }
      onDragEnd={row.kind === 'connection' ? actions.dragEnd : undefined}
    >
      {drawContent(row, actions, showComments)}
    </button>
  )
})

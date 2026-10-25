/**
 * A results grid that only keeps the visible rows in the DOM.
 *
 * Big pages (thousands of rows) freeze the sidebar when every row is rendered;
 * here the scroll container measures itself and renders the window of rows in
 * view plus a small overscan, with spacer rows standing in for the rest so the
 * scrollbar keeps the real length and stickiness of the header is untouched.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react'
import type { CellValue, ColumnInfo, Row } from '../shared/types'
import type { ColumnMenuItem } from './colmenu'
import { clearWidths, readWidths, writeWidths } from './columnWidths'
import { formatCell } from './format'

/** Rows are rendered with a fixed height so offsets need no measurement. */
export const GRID_ROW_HEIGHT = 22
const VIRTUAL_THRESHOLD = 200
const OVERSCAN = 8

export interface CellMenuTarget {
  column: ColumnInfo
  value: CellValue
  row: Row
  rowIndex: number
}

interface VirtualRange {
  start: number
  end: number
  paddingTop: number
  paddingBottom: number
}

export interface DataGridProps {
  columns: ColumnInfo[]
  rows: Row[]
  offset: number
  /** 1-based numbers to show instead of `offset + index + 1` when some rows are hidden. */
  rowNumbers?: readonly number[]
  /** Extra header row (column filters in the table tab). */
  headerExtra?: ReactNode
  cellClass?: (column: ColumnInfo, value: CellValue) => string | undefined
  onCellClick?: (column: ColumnInfo, value: CellValue) => void
  /** Double-clicking a cell opens it; pages show the whole value themselves. */
  onCellOpen?: (column: ColumnInfo, value: CellValue) => void
  /** Remember user-dragged column widths under this key. */
  storageKey?: string
  /** Active sort; the matching header shows an arrow. */
  sort?: { column: string; direction: 'asc' | 'desc' } | null
  /** Clicking a header asks the page to sort by that column. */
  onSort?: (column: ColumnInfo) => void
  /** Right-click menu entries per column; headers open a context menu when set. */
  headerMenu?: (column: ColumnInfo) => ColumnMenuItem[]
  /** Right-click menu entries for a result cell. */
  cellMenu?: (cell: CellMenuTarget) => ColumnMenuItem[]
  /** Drag a header onto another to change the display order. */
  onReorderColumns?: (from: number, to: number) => void
  /** Shown in place of the body when there are no rows at all. */
  emptyText?: string
}

const MIN_COLUMN_WIDTH = 48
const MAX_COLUMN_WIDTH = 1200

function useVirtualRange(rowCount: number, containerRef: RefObject<HTMLDivElement | null>): {
  range: VirtualRange
  onScroll: () => void
} {
  const enabled = rowCount > VIRTUAL_THRESHOLD
  const [scrollTop, setScrollTop] = useState(0)
  const [viewport, setViewport] = useState(480)
  const [headerHeight, setHeaderHeight] = useState(26)
  const frame = useRef(0)

  const measure = useCallback(() => {
    const element = containerRef.current
    if (element === null) return
    setViewport(element.clientHeight)
    const head = element.querySelector('thead')
    if (head !== null) setHeaderHeight(head.getBoundingClientRect().height)
  }, [containerRef])

  useEffect(() => {
    measure()
    const element = containerRef.current
    if (element === null) return
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [measure])

  // A different page or result set starts back at the top.
  useEffect(() => {
    const element = containerRef.current
    if (element !== null) element.scrollTop = 0
    setScrollTop(0)
  }, [rowCount, containerRef])

  const onScroll = useCallback(() => {
    if (frame.current !== 0) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      const element = containerRef.current
      if (element !== null) setScrollTop(element.scrollTop)
    })
  }, [containerRef])

  const range = useMemo<VirtualRange>(() => {
    if (!enabled || rowCount === 0) return { start: 0, end: rowCount, paddingTop: 0, paddingBottom: 0 }
    const bodyTop = Math.max(scrollTop - headerHeight, 0)
    const first = Math.floor(bodyTop / GRID_ROW_HEIGHT)
    const visible = Math.ceil(Math.max(viewport - headerHeight, 0) / GRID_ROW_HEIGHT) + 1
    const start = Math.max(first - OVERSCAN, 0)
    const end = Math.min(first + visible + OVERSCAN, rowCount)
    return { start, end, paddingTop: start * GRID_ROW_HEIGHT, paddingBottom: Math.max((rowCount - end) * GRID_ROW_HEIGHT, 0) }
  }, [enabled, rowCount, scrollTop, viewport, headerHeight])

  return { range, onScroll }
}

/** Header tooltip: keep the column type visible even when the header is a sort button. */
function headerTitle(column: ColumnInfo, sortable: boolean): string {
  const details = [column.name]
  if (column.typeName !== undefined && column.typeName !== '') details.push(column.typeName)
  if (column.nullable === false) details.push('NOT NULL')
  return sortable ? `按 ${details.join(' · ')} 排序` : details.join(' · ')
}

export const DataGrid = memo(function DataGrid(props: DataGridProps): ReactElement {
  const {
    columns,
    rows,
    offset,
    rowNumbers,
    headerExtra,
    cellClass,
    onCellClick,
    onCellOpen,
    storageKey,
    sort,
    onSort,
    headerMenu,
    cellMenu,
    onReorderColumns,
    emptyText,
  } = props
  const [menu, setMenu] = useState<{ items: ColumnMenuItem[]; x: number; y: number } | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const dragIndex = useRef<number | null>(null)
  const dragged = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const { range, onScroll } = useVirtualRange(rows.length, containerRef)
  const visible = rows.slice(range.start, range.end)

  const openMenu = useCallback((items: ColumnMenuItem[], clientX: number, clientY: number): void => {
    const width = 200
    const height = 24 * items.length + 12
    setMenu({
      items,
      x: Math.min(clientX, window.innerWidth - width - 8),
      y: Math.min(clientY, window.innerHeight - height - 8),
    })
  }, [])

  const [widths, setWidths] = useState<number[] | null>(() =>
    storageKey === undefined ? null : readWidths(storageKey, columns.length),
  )

  // A different result set (or a tab reused for another table) drops the widths.
  useEffect(() => {
    setWidths(storageKey === undefined ? null : readWidths(storageKey, columns.length))
  }, [storageKey, columns.length])

  useEffect(() => {
    if (widths !== null && widths.length !== columns.length) setWidths(null)
  }, [widths, columns.length])

  const startResize = useCallback(
    (event: React.MouseEvent<HTMLSpanElement>, index: number) => {
      event.preventDefault()
      event.stopPropagation()
      const table = tableRef.current
      if (table === null) return
      const headers = table.querySelectorAll('thead tr:first-child th')
      const measured = columns.map((_, columnIndex) => {
        const header = headers[columnIndex + 1]
        return header instanceof HTMLElement ? Math.round(header.getBoundingClientRect().width) : 120
      })
      const base = widths ?? measured
      setWidths(base.slice())
      const startX = event.clientX
      const startWidth = base[index] ?? 120
      const current = base.slice()
      const move = (moveEvent: MouseEvent) => {
        const width = Math.min(
          MAX_COLUMN_WIDTH,
          Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + (moveEvent.clientX - startX))),
        )
        if (current[index] === width) return
        current[index] = width
        setWidths(current.slice())
      }
      const up = () => {
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        if (storageKey !== undefined) writeWidths(storageKey, current)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [columns, storageKey, widths],
  )

  const resetWidths = useCallback(() => {
    setWidths(null)
    if (storageKey !== undefined) clearWidths(storageKey)
  }, [storageKey])

  useEffect(() => {
    if (menu === null) return undefined
    const close = (): void => setMenu(null)
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
    }
  }, [menu])

  return (
    <div className="dshdb-grid-wrap" ref={containerRef} onScroll={onScroll}>
      <table className={`dshdb-grid${widths === null ? '' : ' dshdb-grid-sized'}`} ref={tableRef}>
        {widths === null ? null : (
          <colgroup>
            <col style={{ width: 34 }} />
            {widths.map((width, index) => (
              <col key={`col-${index}`} style={{ width }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            <th className="dshdb-num">#</th>
            {columns.map((column, index) => (
              <th
                key={`${column.name}-${index}`}
                title={headerTitle(column, onSort !== undefined)}
                className={[
                  onSort === undefined ? '' : 'dshdb-th-sortable',
                  onReorderColumns === undefined ? '' : 'dshdb-th-draggable',
                  dropIndex === index ? 'dshdb-th-drop-target' : '',
                  dragIndex.current === index ? 'dshdb-th-dragging' : '',
                ]
                  .filter((value) => value !== '')
                  .join(' ') || undefined}
                data-sorted={sort !== null && sort !== undefined && sort.column === column.name ? sort.direction : undefined}
                aria-sort={
                  onSort === undefined
                    ? undefined
                    : sort !== null && sort !== undefined && sort.column === column.name
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                }
                draggable={onReorderColumns !== undefined}
                onDragStart={(event) => {
                  if (onReorderColumns === undefined) return
                  dragIndex.current = index
                  dragged.current = true
                  event.dataTransfer?.setData('text/plain', String(index))
                  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={(event) => {
                  if (onReorderColumns === undefined) return
                  event.preventDefault()
                  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
                  setDropIndex(index)
                }}
                onDragLeave={() => setDropIndex((current) => (current === index ? null : current))}
                onDrop={(event) => {
                  if (onReorderColumns === undefined) return
                  event.preventDefault()
                  const from = dragIndex.current
                  dragIndex.current = null
                  setDropIndex(null)
                  if (from !== null && from !== index) onReorderColumns(from, index)
                }}
                onDragEnd={() => {
                  dragIndex.current = null
                  setDropIndex(null)
                }}
                onClick={
                  onSort === undefined
                    ? undefined
                    : (event) => {
                        if (dragged.current) {
                          dragged.current = false
                          return
                        }
                        if ((event.target as HTMLElement).classList.contains('dshdb-grip')) return
                        onSort(column)
                      }
                }
                onContextMenu={
                  headerMenu === undefined
                    ? undefined
                    : (event) => {
                        event.preventDefault()
                        openMenu(headerMenu(column), event.clientX, event.clientY)
                      }
                }
              >
                {column.name}
                {sort !== null && sort !== undefined && sort.column === column.name ? (
                  <span className="dshdb-sort-arrow" aria-hidden="true">
                    {sort.direction === 'asc' ? '▲' : '▼'}
                  </span>
                ) : null}
                <span
                  className="dshdb-grip"
                  role="separator"
                  aria-label={`调整 ${column.name} 列宽`}
                  title="拖动调整列宽，双击恢复自动列宽"
                  onMouseDown={(event) => startResize(event, index)}
                  onDoubleClick={resetWidths}
                />
              </th>
            ))}
          </tr>
          {headerExtra}
        </thead>
        <tbody>
          {rows.length === 0 && emptyText !== undefined ? (
            <tr className="dshdb-empty-row">
              <td colSpan={columns.length + 1}>{emptyText}</td>
            </tr>
          ) : null}
          {range.paddingTop > 0 ? (
            <tr className="dshdb-vpad" aria-hidden="true">
              <td colSpan={columns.length + 1} style={{ height: range.paddingTop }} />
            </tr>
          ) : null}
          {visible.map((row, index) => {
            const rowIndex = range.start + index
            return (
              <tr key={rowIndex}>
                <td className="dshdb-num">{rowNumbers?.[rowIndex] ?? offset + rowIndex + 1}</td>
                {columns.map((column, columnIndex) => {
                  const value: CellValue = row[columnIndex] ?? null
                  // One format per cell: the same text feeds the tooltip and the body.
                  const text = formatCell(value)
                  return (
                    <td
                      key={`${column.name}-${columnIndex}`}
                      title={text}
                      className={cellClass?.(column, value)}
                      onClick={onCellClick === undefined ? undefined : () => onCellClick(column, value)}
                      onDoubleClick={onCellOpen === undefined ? undefined : () => onCellOpen(column, value)}
                      onContextMenu={
                        cellMenu === undefined
                          ? undefined
                          : (event) => {
                              event.preventDefault()
                              openMenu(cellMenu({ column, value, row, rowIndex }), event.clientX, event.clientY)
                            }
                      }
                    >
                      <span className={value === null ? 'dshdb-null' : undefined}>{text}</span>
                    </td>
                  )
                })}
              </tr>
            )
          })}
          {range.paddingBottom > 0 ? (
            <tr className="dshdb-vpad" aria-hidden="true">
              <td colSpan={columns.length + 1} style={{ height: range.paddingBottom }} />
            </tr>
          ) : null}
        </tbody>
      </table>
      {menu !== null ? (
        <div
          className="dshdb-hmenu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {menu.items.map((item, index) => (
            <button
              key={`${item.label}-${index}`}
              type="button"
              role="menuitem"
              disabled={item.disabled === true}
              onClick={() => {
                setMenu(null)
                item.run()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
})

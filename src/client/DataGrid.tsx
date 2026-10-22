/**
 * A results grid that only keeps the visible rows in the DOM.
 *
 * Big pages (thousands of rows) freeze the sidebar when every row is rendered;
 * here the scroll container measures itself and renders the window of rows in
 * view plus a small overscan, with spacer rows standing in for the rest so the
 * scrollbar keeps the real length and stickiness of the header is untouched.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode, type RefObject } from 'react'
import type { CellValue, ColumnInfo, Row } from '../shared/types'
import { clearWidths, readWidths, writeWidths } from './columnWidths'
import { formatCell } from './format'

/** Rows are rendered with a fixed height so offsets need no measurement. */
export const GRID_ROW_HEIGHT = 22
const VIRTUAL_THRESHOLD = 200
const OVERSCAN = 8

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
  /** Extra header row (column filters in the table tab). */
  headerExtra?: ReactNode
  cellClass?: (column: ColumnInfo, value: CellValue) => string | undefined
  onCellClick?: (column: ColumnInfo, value: CellValue) => void
  /** Remember user-dragged column widths under this key. */
  storageKey?: string
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

export function DataGrid(props: DataGridProps): ReactElement {
  const { columns, rows, offset, headerExtra, cellClass, onCellClick, storageKey } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const { range, onScroll } = useVirtualRange(rows.length, containerRef)
  const visible = rows.slice(range.start, range.end)

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
              <th key={`${column.name}-${index}`} title={`${column.name} ${column.typeName}`}>
                {column.name}
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
          {range.paddingTop > 0 ? (
            <tr className="dshdb-vpad" aria-hidden="true">
              <td colSpan={columns.length + 1} style={{ height: range.paddingTop }} />
            </tr>
          ) : null}
          {visible.map((row, index) => {
            const rowIndex = range.start + index
            return (
              <tr key={rowIndex}>
                <td className="dshdb-num">{offset + rowIndex + 1}</td>
                {columns.map((column, columnIndex) => {
                  const value: CellValue = row[columnIndex] ?? null
                  return (
                    <td
                      key={`${column.name}-${columnIndex}`}
                      title={formatCell(value)}
                      className={cellClass?.(column, value)}
                      onClick={onCellClick === undefined ? undefined : () => onCellClick(column, value)}
                    >
                      <span className={value === null ? 'dshdb-null' : undefined}>{formatCell(value)}</span>
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
    </div>
  )
}

import { useCallback, useRef, useState, type ReactElement } from 'react'

import { ColumnsIcon } from '../icons'
import { usePopoverDismiss } from '../popover'

/**
 * Row-end visibility picker, modelled on DataGrip's database selector: an
 * "all" toggle on top, then one checkbox per database/schema. The choice is
 * persisted by the hook, so it survives restarts.
 */
export function RowPicker({
  title,
  allLabel,
  items,
  visible,
  onToggle,
  onToggleAll,
}: {
  title: string
  allLabel: string
  items: { id: string; label: string }[]
  visible: string[] | null
  onToggle: (id: string) => void
  onToggleAll: (all: boolean) => void
}): ReactElement {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const anchor = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    // The search box (autoFocused for long lists) unmounts on close; without
    // restoring focus the keyboard position falls to <body>.
    if (triggerRef.current?.isConnected) triggerRef.current.focus()
  }, [])
  const toggle = useCallback(() => {
    setOpen((value) => !value)
    setQuery('')
  }, [])
  usePopoverDismiss(open, close, anchor)
  const allVisible = visible === null || (items.length > 0 && items.every((item) => visible.includes(item.id)))
  const noun = allLabel.replace(/^所有/, '')
  const needle = query.trim().toLowerCase()
  const shown =
    needle === ''
      ? items
      : items.filter(
          (item) =>
            item.label.toLowerCase().includes(needle) || item.id.toLowerCase().includes(needle),
        )
  return (
    <span className="dshdb-picker-anchor" ref={anchor}>
      <span
        ref={triggerRef}
        className="dshdb-row-action"
        role="button"
        tabIndex={0}
        title={title}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          toggle()
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            toggle()
          }
          if (event.key === 'Escape') close()
        }}
      >
        <ColumnsIcon size={12} />
      </span>
      {open ? (
        <div className="dshdb-picker" onClick={(event) => event.stopPropagation()}>
          <label className="dshdb-picker-item dshdb-picker-all">
            <input type="checkbox" checked={allVisible} onChange={() => onToggleAll(!allVisible)} />
            <span>{allLabel}</span>
            <em>添加模式</em>
          </label>
          {items.length > 5 ? (
            <input
              className="dshdb-input dshdb-picker-search"
              type="search"
              value={query}
              placeholder={`查找${noun}…`}
              aria-label={`查找${noun}`}
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation()
                if (event.key === 'Escape') close()
              }}
            />
          ) : null}
          <div className="dshdb-picker-scroll">
            {shown.length === 0 ? (
              <div className="dshdb-picker-empty">没有匹配的{noun}</div>
            ) : (
              shown.map((item) => (
                <label key={item.id} className="dshdb-picker-item">
                  <input
                    type="checkbox"
                    checked={visible === null || visible.includes(item.id)}
                    onChange={() => onToggle(item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              ))
            )}
          </div>
          <div className="dshdb-picker-hint">勾选即生效，点击空白处关闭</div>
        </div>
      ) : null}
    </span>
  )
}

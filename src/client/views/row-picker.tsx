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
  const anchor = useRef<HTMLSpanElement>(null)
  const close = useCallback(() => setOpen(false), [])
  usePopoverDismiss(open, close, anchor)
  const allVisible = visible === null || (items.length > 0 && items.every((item) => visible.includes(item.id)))
  return (
    <span className="dshdb-picker-anchor" ref={anchor}>
      <span
        className="dshdb-row-action"
        role="button"
        tabIndex={0}
        title={title}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        onDoubleClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setOpen((value) => !value)
          }
          if (event.key === 'Escape') setOpen(false)
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
          <div className="dshdb-picker-scroll">
            {items.map((item) => (
              <label key={item.id} className="dshdb-picker-item">
                <input
                  type="checkbox"
                  checked={visible === null || visible.includes(item.id)}
                  onChange={() => onToggle(item.id)}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          <div className="dshdb-picker-hint">勾选即生效，点击空白处关闭</div>
        </div>
      ) : null}
    </span>
  )
}

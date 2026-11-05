/**
 * Grouped menus: the export menus outgrew a single column, so related entries
 * live in flyout groups.
 *
 * A group row opens its flyout on hover, focus or click; leaves keep the labels
 * they always had, so the actions read the same as before. Flyouts stay mounted
 * and are hidden with CSS (`.dshdb-submenu[data-open='true']`), which keeps the
 * React tree stable while only one flyout is ever visible.
 *
 * Flyouts open to the right by default, like a normal submenu. When the window
 * edge is in the way (the trigger sits near the right side of a narrow panel)
 * the flyout flips to the left instead of being clipped.
 */
import { useLayoutEffect, useRef, useState, type ReactElement } from 'react'

export interface MenuLeaf {
  /** Stable id, also the React key. */
  id: string
  label: string
  disabled?: boolean
  onSelect: () => void
}

export interface MenuGroupSpec {
  id: string
  label: string
  leaves: MenuLeaf[]
}

export interface MenuGroupListProps {
  groups: MenuGroupSpec[]
  /** Extra top-level entry that needs no flyout (the whole-table script). */
  extra?: MenuLeaf
  onClose: () => void
}

interface OpenFlyout {
  id: string
  flip: boolean
}

/** Gap kept between a flyout and the window edge before flipping. */
const VIEWPORT_MARGIN = 8

export function MenuGroupList({ groups, extra, onClose }: MenuGroupListProps): ReactElement {
  const [open, setOpen] = useState<OpenFlyout | null>(null)
  const flyouts = useRef(new Map<string, HTMLSpanElement>())
  const anchors = useRef(new Map<string, HTMLButtonElement>())

  const openGroup = (id: string, anchor: HTMLButtonElement): void => {
    anchors.current.set(id, anchor)
    setOpen((current) => (current !== null && current.id === id ? current : { id, flip: false }))
  }

  // A closed flyout is display:none and has no width, so the space check can
  // only run after it is visible. Layout effects fire before paint, so flipping
  // here never shows a clipped frame first. Left stays the default; the flyout
  // only flips when the right side lacks room and the left side has it.
  useLayoutEffect(() => {
    if (open === null || open.flip) return
    const flyout = flyouts.current.get(open.id)
    const anchor = anchors.current.get(open.id)
    if (flyout === undefined || anchor === undefined) return
    const width = flyout.getBoundingClientRect().width
    if (width <= 0) return
    const rect = anchor.getBoundingClientRect()
    if (rect.right + width + VIEWPORT_MARGIN <= window.innerWidth) return
    if (rect.left - width - VIEWPORT_MARGIN < 0) return
    setOpen((current) => (current === null || current.id !== open.id ? current : { id: open.id, flip: true }))
  }, [open])

  return (
    <span className="dshdb-menu dshdb-menu-groups" role="menu" onClick={onClose}>
      {groups.map((group) => (
        <span key={group.id} className="dshdb-submenu-anchor">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open?.id === group.id}
            className="dshdb-submenu-trigger"
            onPointerEnter={(event) => openGroup(group.id, event.currentTarget)}
            onFocus={(event) => openGroup(group.id, event.currentTarget)}
            onClick={(event) => {
              // A click on a group must not close the whole menu.
              event.stopPropagation()
              if (open?.id === group.id) setOpen(null)
              else openGroup(group.id, event.currentTarget)
            }}
          >
            {group.label}
          </button>
          <span
            ref={(element) => {
              if (element === null) flyouts.current.delete(group.id)
              else flyouts.current.set(group.id, element)
            }}
            className="dshdb-menu dshdb-submenu"
            role="group"
            aria-label={group.label}
            data-open={open?.id === group.id ? 'true' : undefined}
            data-flip={open?.id === group.id && open.flip ? 'true' : undefined}
          >
            {group.leaves.map((leaf) => (
              <button
                key={leaf.id}
                type="button"
                role="menuitem"
                disabled={leaf.disabled === true}
                onClick={leaf.onSelect}
              >
                {leaf.label}
              </button>
            ))}
          </span>
        </span>
      ))}
      {extra === undefined ? null : (
        <button type="button" role="menuitem" onClick={extra.onSelect}>
          {extra.label}
        </button>
      )}
    </span>
  )
}

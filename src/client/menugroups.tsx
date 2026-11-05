/**
 * Grouped menus: the export menus outgrew a single column, so related entries
 * live in flyout groups.
 *
 * A group row opens its flyout on hover, focus or click; leaves keep the labels
 * they always had, so the actions read the same as before. Flyouts stay mounted
 * and are hidden with CSS (`.dshdb-submenu[data-open='true']`), which keeps the
 * React tree stable while only one flyout is ever visible.
 */
import { useState, type ReactElement } from 'react'

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

export function MenuGroupList({ groups, extra, onClose }: MenuGroupListProps): ReactElement {
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  return (
    <span className="dshdb-menu dshdb-menu-groups" role="menu" onClick={onClose}>
      {groups.map((group) => (
        <span key={group.id} className="dshdb-submenu-anchor">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openGroup === group.id}
            className="dshdb-submenu-trigger"
            onPointerEnter={() => setOpenGroup(group.id)}
            onFocus={() => setOpenGroup(group.id)}
            onClick={(event) => {
              // A click on a group must not close the whole menu.
              event.stopPropagation()
              setOpenGroup((current) => (current === group.id ? null : group.id))
            }}
          >
            {group.label}
          </button>
          <span
            className="dshdb-menu dshdb-submenu"
            role="group"
            aria-label={group.label}
            data-open={openGroup === group.id ? 'true' : undefined}
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

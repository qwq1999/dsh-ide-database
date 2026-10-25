/**
 * Context menu for tree rows.
 *
 * The tree has no shared menu provider: like the grid menu it is a fixed list
 * placed at the pointer, closed by the next click, Escape, or a resize.
 */
import { useEffect, type ReactElement } from 'react'

export interface TreeMenuItem {
  label: string
  disabled?: boolean
  run: () => void
}

export interface TreeMenuState {
  x: number
  y: number
  items: TreeMenuItem[]
}

/** Keep the menu inside the viewport for menus opened near an edge. */
export function placeMenu(clientX: number, clientY: number, items: TreeMenuItem[]): { x: number; y: number } {
  const width = 200
  const height = 24 * items.length + 12
  return {
    x: Math.min(clientX, Math.max(0, window.innerWidth - width - 8)),
    y: Math.min(clientY, Math.max(0, window.innerHeight - height - 8)),
  }
}

export function TreeMenu({ menu, onClose }: { menu: TreeMenuState | null; onClose: () => void }): ReactElement | null {
  useEffect(() => {
    if (menu === null) return undefined
    const close = (): void => onClose()
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
  }, [menu, onClose])

  if (menu === null) return null
  return (
    <div
      className="dshdb-hmenu"
      role="menu"
      aria-label="对象操作"
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
            onClose()
            item.run()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

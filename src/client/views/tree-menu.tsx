/**
 * Context menu for tree rows.
 *
 * The tree has no shared menu provider: like the grid menu it is a fixed list
 * placed at the pointer, closed by the next click, Escape, or a resize.
 */
import { useEffect, useRef, type ReactElement } from 'react'

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
  const listRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (menu === null) return undefined
    const close = (): void => onClose()
    // Keyboard users land on the first actionable row straight away.
    const enabled = (): HTMLButtonElement[] =>
      Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]:not([disabled])') ?? [])
    enabled()[0]?.focus()
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close()
        return
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Home' && event.key !== 'End') return
      const items = enabled()
      if (items.length === 0) return
      event.preventDefault()
      const index = items.indexOf(document.activeElement as HTMLButtonElement)
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? items.length - 1
            : event.key === 'ArrowDown'
              ? (index + 1) % items.length
              : index <= 0
                ? items.length - 1
                : index - 1
      items[next]?.focus()
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
      ref={listRef}
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

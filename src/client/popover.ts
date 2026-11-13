import { useEffect, type RefObject } from 'react'

/**
 * Dismiss a popover on an outside pointer press or Escape.
 *
 * Menus in this panel (export menus, grid context menus, database pickers) are
 * plain absolutely-positioned spans; without this they stay open until their
 * trigger is clicked again, which feels broken next to IDEA.
 */
export function usePopoverDismiss(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null> | ReadonlyArray<RefObject<HTMLElement | null>>,
): void {
  useEffect(() => {
    if (!open) return undefined
    // A floating filter often pairs with the panel it filters: pressing a row
    // inside that panel must not count as "outside" and dismiss the box.
    const anchors = Array.isArray(ref) ? ref : [ref]
    const onPointerDown = (event: PointerEvent): void => {
      if (!anchors.some((anchor) => anchor.current?.contains(event.target as Node))) onClose()
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, ref])
}

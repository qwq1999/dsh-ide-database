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
  ref: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event: PointerEvent): void => {
      const element = ref.current
      if (element !== null && !element.contains(event.target as Node)) onClose()
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

/**
 * Copy buttons across the plugin flash "已复制" for a moment. The timer bookkeeping
 * is identical everywhere, so it lives here instead of in each component.
 */
import { useCallback, useEffect, useState } from 'react'

export interface CopyFlash {
  copied: boolean
  /** Start the flash when the clipboard write succeeded. */
  flash: (ok: boolean) => void
  /** Clear it early, e.g. when the content behind the button changes. */
  reset: () => void
}

export function useCopyFlash(duration = 1500): CopyFlash {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const timer = setTimeout(() => setCopied(false), duration)
    return () => clearTimeout(timer)
  }, [copied, duration])

  const flash = useCallback((ok: boolean): void => {
    if (ok) setCopied(true)
  }, [])
  const reset = useCallback((): void => {
    setCopied(false)
  }, [])

  return { copied, flash, reset }
}

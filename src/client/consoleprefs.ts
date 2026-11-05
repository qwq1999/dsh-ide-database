/**
 * Client-side view of console behaviour settings.
 *
 * The console tab is its own Sidebar tab, so App pushes the saved settings into
 * this module whenever the settings snapshot changes — the same trick keymap.ts
 * uses for shortcuts.
 */
import { useEffect, useState } from 'react'

let autoComplete = true
const listeners = new Set<() => void>()

export function setConsoleAutoComplete(enabled: boolean): void {
  if (enabled === autoComplete) return
  autoComplete = enabled
  for (const listener of listeners) listener()
}

export function currentConsoleAutoComplete(): boolean {
  return autoComplete
}

export function useConsoleAutoComplete(): boolean {
  const [enabled, setEnabled] = useState(currentConsoleAutoComplete)
  useEffect(() => {
    const listener = () => setEnabled(currentConsoleAutoComplete())
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])
  return enabled
}

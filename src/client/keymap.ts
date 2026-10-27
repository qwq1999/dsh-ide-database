/**
 * Client-side view of the shortcut bindings.
 *
 * The bindings live in DbSettings and are stored on the host, but the handlers
 * that need them sit deep in five components; threading a prop through every
 * one of them would touch a lot of tests for nothing. So App pushes the saved
 * record into this module whenever settings load or change, and each handler
 * asks for the binding it cares about.
 */

import {
  bindingOf,
  formatBinding,
  matchesBinding,
  type KeyLike,
  type ShortcutId,
} from '../shared/keymap'

let overrides: Readonly<Record<string, string>> = {}

/** Ctrl on Windows/Linux, ⌘ on macOS — the same split the handlers used before. */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent)

export function setKeybindings(next: Readonly<Record<string, string>> | undefined): void {
  overrides = next ?? {}
}

export function currentBinding(id: ShortcutId): string {
  return bindingOf(id, overrides)
}

/** True when the keypress is this action's binding; callers still preventDefault. */
export function shortcutHit(event: KeyLike, id: ShortcutId): boolean {
  return matchesBinding(event, currentBinding(id))
}

/** Binding text for a tooltip / placeholder, e.g. `Ctrl + Enter`. */
export function shortcutLabel(id: ShortcutId): string {
  return formatBinding(currentBinding(id), IS_MAC)
}

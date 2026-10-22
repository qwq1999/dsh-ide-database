/**
 * The Harness serves its design-system package to plugin client bundles at
 * runtime (`PLATFORM_MODULES` in the web client), but the package is not on
 * this repository's disk, so the slice this plugin imports is declared here.
 */
declare module '@deepseek-ai/dsh-client-ui-primitives' {
  /** A transient top-center banner, exactly the one the product chrome shows. */
  export function Toast(props: {
    text: string
    icon?: import('react').ReactNode
    tone?: 'success'
    anchor?: HTMLElement | null
    holdMs?: number
    actions?: readonly { label: string; prefix?: string; onClick: () => void }[]
    onDone: () => void
  }): import('react').ReactElement

  /** Outlined warning glyph, the icon the product pairs with failure copy. */
  export function IconWarningOutlineRegular(props?: { className?: string }): import('react').ReactElement
}

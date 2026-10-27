declare module '@deepseek-ai/dsh-tools' {
  export interface ToolContext {
    signal?: AbortSignal
    agent?: unknown
    token?: unknown
  }

  export interface ToolDefinition {
    name: string
    description: string
    parameters: Record<string, unknown>
    output?: Record<string, unknown>
    timeoutMs?: number
    execute: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown> | unknown
  }

  export function defineTool<T extends ToolDefinition>(definition: T): T
}

declare module '@deepseek-ai/dsh-client-ui-primitives' {
  export const Button: any
  export const Checkbox: any
  export const CodeBlock: any
  export const CodeCard: any
  export const ConnectionIndicator: any
  export const DisclosureRow: any
  export const HoverCard: any
  export const IconChevronDownOutline14: any
  export const IconChevronRightOutline14: any
  export const IconCloseOutline14: any
  export const IconCopyOutline14: any
  export const IconEllipsisOutline14: any
  export const IconPlusOutline14: any
  export const IconRefreshOutline14: any
  export const IconSearchOutline14: any
  export const IconSettingsOutline14: any
  export const InlineEditor: any
  export const Input: any
  export const JsonTree: any
  export const Menu: any
  export const MenuGroup: any
  export const MenuItemButton: any
  export const MenuSurface: any
  export const Modal: any
  export const PathLabel: any
  export const Pill: any
  export const RiskConfirmation: any
  export const SegmentedControl: any
  export const SegmentedTabs: any
  export const SettingsForm: any
  export const StateDot: any
  export const Switch: any
  export const Tag: any
  export const Toast: any
  export const Tooltip: any
}

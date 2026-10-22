/**
 * Test stub for the harness tool framework: the plugin only needs the runtime
 * `defineTool` to be an identity wrapper so its definitions can be inspected.
 */
export function defineTool<T>(definition: T): T {
  return definition
}

export type ToolDefinition = {
  name: string
  description: string
  parameters?: unknown
  output?: unknown
  readOnly?: boolean
  timeoutMs?: number
  execute: (args: Record<string, unknown>, exec?: unknown) => unknown
}

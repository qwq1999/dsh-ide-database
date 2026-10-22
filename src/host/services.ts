import type { IncomingMessage, ServerResponse } from 'node:http'

import { PLUGIN_NAME } from '../shared/presets.js'

export interface WebRoute {
  kind: 'prefix' | 'exact'
  path: string
  handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>
}

export interface WebServerLike {
  register(route: WebRoute): () => void
}

export interface ToolRegistryLike {
  register(definition: unknown): () => void
}

export interface LoggerLike {
  debug?(message: string, ...args: unknown[]): void
  info?(message: string, ...args: unknown[]): void
  warn?(message: string, ...args: unknown[]): void
  error?(message: string, ...args: unknown[]): void
}

/**
 * Structural subset of the Cordis context the plugin uses. Kept local so the
 * host build never depends on a particular `@deepseek-ai/cordis` version.
 */
export interface HostContext {
  effect(callback: () => void | (() => void)): unknown
  get(name: string, strict?: boolean): unknown
  webServer: WebServerLike
  tools: ToolRegistryLike
  logger?: LoggerLike
}

/** Optional services must never be declared in `inject`, so read them defensively. */
export function optionalService<T>(ctx: HostContext, name: string): T | undefined {
  try {
    return (ctx.get(name, false) as T | undefined) ?? undefined
  } catch {
    return undefined
  }
}

export function makeLogger(ctx: HostContext): (message: string) => void {
  const logger = optionalService<LoggerLike>(ctx, 'logger')
  return (message: string) => {
    if (logger?.info !== undefined) {
      try {
        logger.info(`[${PLUGIN_NAME}] ${message}`)
        return
      } catch {
        // fall back to console
      }
    }
    console.log(`[${PLUGIN_NAME}] ${message}`)
  }
}

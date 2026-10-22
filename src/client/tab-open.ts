/**
 * Opening a table tab from inside the database tab.
 *
 * The database tab body has no access to the sidebar service (it only receives
 * slot props), so the plugin entry stores a small opener here while its sidebar
 * injection is active. The data tree calls {@link openTableTab}; a host without
 * the native right sidebar leaves the opener unset and the call is a no-op.
 */

/** What one table tab shows. */
export interface TableTabParams {
  connectionId: string
  schema: string
  table: string
}

type TableTabOpener = (params: TableTabParams) => void

let opener: TableTabOpener | undefined

/** Install (or clear) the opener owned by the plugin entry. */
export function setTableTabOpener(next: TableTabOpener | undefined): void {
  opener = next
}

/** Open one table tab; does nothing without the native right sidebar. */
export function openTableTab(params: TableTabParams): void {
  opener?.(params)
}

/** Narrow unknown navigation parameters to {@link TableTabParams}. */
export function readTableTabParams(params: unknown): TableTabParams | undefined {
  if (typeof params !== 'object' || params === null) return undefined
  const value = params as Record<string, unknown>
  const { connectionId, schema, table } = value
  if (typeof connectionId !== 'string' || typeof schema !== 'string' || typeof table !== 'string') return undefined
  if (connectionId === '' || table === '') return undefined
  return { connectionId, schema, table }
}

/** What one query console tab starts with (connection is optional). */
export interface ConsoleTabParams {
  connectionId?: string
}

type ConsoleTabOpener = (params: ConsoleTabParams) => void

let consoleOpener: ConsoleTabOpener | undefined

/** Install (or clear) the console opener owned by the plugin entry. */
export function setConsoleTabOpener(next: ConsoleTabOpener | undefined): void {
  consoleOpener = next
}

/** Open one console tab; does nothing without the native right sidebar. */
export function openConsoleTab(params: ConsoleTabParams = {}): void {
  consoleOpener?.(params)
}

/** Narrow unknown navigation parameters to {@link ConsoleTabParams}. */
export function readConsoleTabParams(params: unknown): ConsoleTabParams | undefined {
  if (typeof params !== 'object' || params === null) return undefined
  const value = params as Record<string, unknown>
  const { connectionId } = value
  if (typeof connectionId !== 'string' || connectionId === '') return {}
  return { connectionId }
}

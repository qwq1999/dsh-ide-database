/**
 * Client-side view of the data-source toolbar: labels, icons, and the saved order.
 *
 * The order lives in DbSettings (stored by the host); App pushes it into this
 * module whenever the settings snapshot changes, the same trick keymap.ts uses
 * for shortcuts.
 */
import { useEffect, useState, type ReactElement } from 'react'
import { orderToolbarActions, type ToolbarActionId } from '../shared/toolbaractions'
import { EditIcon, FilterIcon, PlusIcon, RecycleIcon, RefreshIcon, SettingsIcon, TerminalIcon, TrashIcon } from './icons'

export const TOOLBAR_ACTION_LABEL: Record<ToolbarActionId, string> = {
  add: '新增',
  edit: '编辑',
  refresh: '刷新',
  delete: '删除',
  filter: '筛选',
  console: '控制台',
  trash: '回收站',
  settings: '设置',
}

/** Tooltip / accessible name of each toolbar button. */
export const TOOLBAR_ACTION_TITLE: Record<ToolbarActionId, string> = {
  add: '新增数据源',
  edit: '编辑选中的数据源',
  refresh: '刷新选中的数据源',
  delete: '删除选中的数据源',
  filter: '筛选库表',
  console: '查询控制台',
  trash: '回收站',
  settings: '设置',
}

export function toolbarActionIcon(id: ToolbarActionId, size = 14): ReactElement {
  switch (id) {
    case 'add':
      return <PlusIcon size={size} />
    case 'edit':
      return <EditIcon size={size} />
    case 'refresh':
      return <RefreshIcon size={size} />
    case 'delete':
      return <TrashIcon size={size} />
    case 'filter':
      return <FilterIcon size={size} />
    case 'console':
      return <TerminalIcon size={size} />
    case 'trash':
      return <RecycleIcon size={size} />
    case 'settings':
      return <SettingsIcon size={size} />
  }
}

let savedOrder: ToolbarActionId[] = orderToolbarActions(undefined)
const listeners = new Set<() => void>()

/** Called by App when the settings snapshot loads or changes. */
export function setToolbarActionOrder(stored: readonly string[] | undefined): void {
  const next = orderToolbarActions(stored)
  const same = next.length === savedOrder.length && next.every((id, index) => id === savedOrder[index])
  if (same) return
  savedOrder = next
  for (const listener of listeners) listener()
}

export function currentToolbarActionOrder(): ToolbarActionId[] {
  return savedOrder
}

/** The order to render, re-rendering the caller when settings change. */
export function useToolbarActionOrder(): ToolbarActionId[] {
  const [order, setOrder] = useState<ToolbarActionId[]>(savedOrder)
  useEffect(() => {
    const sync = (): void => {
      setOrder(savedOrder)
    }
    listeners.add(sync)
    sync()
    return () => {
      listeners.delete(sync)
    }
  }, [])
  return order
}

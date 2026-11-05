/**
 * Client-side view of the console toolbar: labels, icons, and the saved order.
 *
 * The order lives in DbSettings (stored by the host) but the console tab is its
 * own Sidebar tab, so App pushes the saved order into this module whenever the
 * settings snapshot changes — the same trick keymap.ts uses for shortcuts.
 */
import { useEffect, useState, type ReactElement } from 'react'
import { orderConsoleActions, type ConsoleActionId } from '../shared/consoleactions'
import {
  CheckIcon,
  ClearIcon,
  ClockIcon,
  CopyIcon,
  DownloadIcon,
  FormatIcon,
  PlanIcon,
  PlayIcon,
  SaveIcon,
  StopIcon,
  TableIcon,
  TransactionIcon,
  UndoIcon,
  UploadIcon,
} from './icons'

export const CONSOLE_ACTION_LABEL: Record<ConsoleActionId, string> = {
  run: '执行',
  cancel: '取消',
  history: '历史',
  format: '格式化',
  import: '导入',
  save: '保存',
  clear: '清空',
  copy: '复制 SQL',
  explain: '执行计划',
  openTable: '打开数据表',
  txStart: '事务',
  txCommit: '提交',
  txRollback: '回滚',
  export: '导出',
}

export function consoleActionIcon(id: ConsoleActionId, size = 12): ReactElement {
  switch (id) {
    case 'run':
      return <PlayIcon size={size} />
    case 'cancel':
      return <StopIcon size={size} />
    case 'history':
      return <ClockIcon size={size} />
    case 'format':
      return <FormatIcon size={size} />
    case 'import':
      return <UploadIcon size={size} />
    case 'save':
      return <SaveIcon size={size} />
    case 'clear':
      return <ClearIcon size={size} />
    case 'copy':
      return <CopyIcon size={size} />
    case 'explain':
      return <PlanIcon size={size} />
    case 'openTable':
      return <TableIcon size={size} />
    case 'txStart':
      return <TransactionIcon size={size} />
    case 'txCommit':
      return <CheckIcon size={size} />
    case 'txRollback':
      return <UndoIcon size={size} />
    case 'export':
      return <DownloadIcon size={size} />
  }
}

let savedOrder: ConsoleActionId[] = orderConsoleActions(undefined)
const listeners = new Set<() => void>()

/** Called by App when the settings snapshot loads or changes. */
export function setConsoleActionOrder(stored: readonly string[] | undefined): void {
  const next = orderConsoleActions(stored)
  const same = next.length === savedOrder.length && next.every((id, index) => id === savedOrder[index])
  if (same) return
  savedOrder = next
  for (const listener of listeners) listener()
}

export function currentConsoleActionOrder(): ConsoleActionId[] {
  return savedOrder
}

/** The order to render, re-rendering the caller when settings change. */
export function useConsoleActionOrder(): ConsoleActionId[] {
  const [order, setOrder] = useState<ConsoleActionId[]>(savedOrder)
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

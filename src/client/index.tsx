import type { ReactElement } from 'react'
import { App, type AppProps } from './App'
import { TableTab, TableTabTitle, type TableTabProps } from './TableTab'
import { DatabaseIcon } from './icons'
import { setTableTabOpener, type TableTabParams } from './tab-open'
import { injectStyles } from './styles'

const PLUGIN_ID = 'dsh-ide-database'
const TAB_ID = 'dsh-ide-database/database'
const TAB_KIND = 'database'
const TAB_TITLE = '数据库'
const TABLE_TAB_ID = 'dsh-ide-database/table'
const TABLE_TAB_KIND = 'database-table'
const TABLE_TAB_TITLE = '数据表'

interface GuideIconProps {
  size?: number
}

interface GuideEntry {
  id: string
  order: number
  title: () => string
  description?: () => string
  icon?: (props: GuideIconProps) => ReactElement
}

interface SidebarTabDefinition {
  id: string
  kind: string
  title: () => string
  keepMounted?: boolean
  /** Each open gets its own record; a table tab must not replace the database tab. */
  multiple?: boolean
  guide?: GuideEntry[]
}

interface SlotDefinition {
  name: string
  key: string
}

type Disposer = (() => void) | void

interface ClientContext {
  sidebarRightTabs: {
    register(definition: SidebarTabDefinition): Disposer
  }
  sidebarRight: {
    openTab(kind: string, options?: { params?: unknown }): void
  }
  slots: {
    register(definition: SlotDefinition, component: (props: Record<string, unknown>) => ReactElement): Disposer
    inject(name: string, callback: () => void): Disposer
  }
  effect(callback: () => void | (() => void), label?: string): Disposer
  inject(names: string[], callback: (host: ClientContext) => void | (() => void), label?: string): Disposer
}

function GuideIcon(props: GuideIconProps): ReactElement {
  return <DatabaseIcon size={props.size ?? 18} />
}

function DatabaseTabBody(props: Record<string, unknown>): ReactElement {
  return <App {...(props as unknown as AppProps)} />
}

/** The database chip in the tab strip: the same database glyph the guide uses. */
function DatabaseTabChip(): ReactElement {
  return (
    <>
      <DatabaseIcon size={13} />
      <span>{TAB_TITLE}</span>
    </>
  )
}

function TableTabBody(props: Record<string, unknown>): ReactElement {
  return <TableTab {...(props as unknown as TableTabProps)} />
}

function TableTabChip(props: Record<string, unknown>): ReactElement {
  return <TableTabTitle {...(props as unknown as TableTabProps)} />
}

export const name = PLUGIN_ID
export const inject: string[] = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    return injectStyles()
  }, 'dsh-ide-database: styles')

  // The right Sidebar owns both the tab type list and the keyed body slot.
  // Inject lazily so hosts without the native sidebar do not fail activation.
  ctx.inject(['sidebarRightTabs', 'sidebarRight'], (host) => {
    host.effect(() => {
      host.sidebarRightTabs.register({
        id: TAB_ID,
        kind: TAB_KIND,
        title: () => TAB_TITLE,
        keepMounted: true,
        guide: [
          {
            id: TAB_KIND,
            order: 38,
            title: () => TAB_TITLE,
            description: () => '浏览和查询 MySQL、Oracle、达梦、OceanBase 与 Redis 数据源',
            icon: GuideIcon,
          },
        ],
      })
      // One page per table: `multiple` keeps each double-click's record apart.
      host.sidebarRightTabs.register({
        id: TABLE_TAB_ID,
        kind: TABLE_TAB_KIND,
        title: () => TABLE_TAB_TITLE,
        multiple: true,
      })
      host.slots.inject('sidebar.right.pane.tab', () => {
        host.slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID }, DatabaseTabBody)
        host.slots.register({ name: 'sidebar.right.pane.tab', key: TABLE_TAB_ID }, TableTabBody)
      })
      host.slots.inject('sidebar.right.pane.tab.title', () => {
        host.slots.register({ name: 'sidebar.right.pane.tab.title', key: TAB_ID }, DatabaseTabChip)
        host.slots.register({ name: 'sidebar.right.pane.tab.title', key: TABLE_TAB_ID }, TableTabChip)
      })
      setTableTabOpener((params: TableTabParams) => {
        host.sidebarRight.openTab(TABLE_TAB_KIND, { params })
      })
      return () => {
        setTableTabOpener(undefined)
      }
    }, 'dsh-ide-database: native right sidebar tab')
  })
}

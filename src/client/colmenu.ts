/**
 * Column-header context menu for result grids.
 *
 * A right click on a header offers the things people do with one column:
 * sort by it, drop the sort, copy its name, or copy every value in the page.
 */
import type { CellValue, Row } from '../shared/types'

export interface ColumnMenuItem {
  label: string
  disabled?: boolean
  run: () => void
}

/** Every value of one column as clipboard text, one line per row. */
export function columnValues(rows: Row[], index: number): string {
  return rows
    .map((row) => {
      const value: CellValue = row[index] ?? null
      return value === null || value === undefined ? '' : String(value)
    })
    .join('\n')
}

/** Copy through the clipboard API, falling back to a hidden textarea. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older WebViews (and jsdom) offer neither the async API nor execCommand:
    // report the failure instead of rejecting into a `void` call site.
    let area: HTMLTextAreaElement | undefined
    try {
      area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      area?.remove()
    }
  }
}

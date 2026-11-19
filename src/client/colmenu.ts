/**
 * Column-header context menu for result grids.
 *
 * A right click on a header offers the things people do with one column:
 * sort by it, drop the sort, copy its name, or copy every value in the page.
 */
import type { CellValue, Row } from '../shared/types'
import { spreadsheetSafe } from './export'
import { formatCell } from './format'

export interface ColumnMenuItem {
  label: string
  disabled?: boolean
  run: () => void
}

/**
 * One value as clipboard text. Embedded tabs or newlines are flattened so a
 * single cell cannot split one copied row into several lines or cells; this
 * mirrors rowToTsv and file export, and keeps formula-injection protection.
 */
function clipboardValue(value: CellValue): string {
  if (value === null || value === undefined) return ''
  return spreadsheetSafe(formatCell(value)).replace(/[\t\r\n]+/gu, ' ')
}

/** Every value of one column as clipboard text, one line per row. */
export function columnValues(rows: Row[], index: number): string {
  return rows.map((row) => clipboardValue(row[index] ?? null)).join('\n')
}

/** The same values on one line, for pasting into scripts or IN lists. */
export function commaValues(rows: Row[], index: number): string {
  return rows.map((row) => clipboardValue(row[index] ?? null)).join(', ')
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
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
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
      // Selecting the scratch textarea moved focus; put it back where it was.
      if (previous !== null && previous.isConnected) previous.focus()
    }
  }
}

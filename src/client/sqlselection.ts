import { splitStatements } from './multistatement'

/** Pick what "run" should execute: the selection when there is one, else everything. */
export function pickStatement(value: string, start: number, end: number): { statement: string; selected: boolean } {
  if (start !== end) {
    const slice = value.slice(Math.min(start, end), Math.max(start, end))
    if (slice.trim() !== '') return { statement: slice, selected: true }
  }
  return { statement: value, selected: false }
}

export interface CaretStatement {
  statement: string
  index: number
}

/**
 * The statement the caret sits in. A caret below the last statement (or in the
 * blanks after it) belongs to that statement; one above the first belongs to the
 * first. Returns an empty statement when the editor has nothing to run.
 */
export function statementAtCaret(value: string, caret: number): CaretStatement {
  const parts = splitStatements(value)
  if (parts.length === 0) return { statement: '', index: -1 }
  let cursor = 0
  let picked: CaretStatement = { statement: parts[0]!, index: 0 }
  for (let index = 0; index < parts.length; index += 1) {
    const text = parts[index]!
    const found = value.indexOf(text, cursor)
    const start = found < 0 ? cursor : found
    const end = start + text.length
    cursor = end
    picked = { statement: text, index }
    if (caret <= end) return picked
  }
  return picked
}

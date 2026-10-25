/**
 * Moving scripts between the console and `.sql` files. Importing has no
 * "replace" mode: the file is inserted at the caret so several scripts (or a
 * file plus the statement already being typed) compose instead of overwriting
 * each other. Saving goes the other way and writes the editor as a file.
 */

/** Files above this size are refused: the console sends the whole script at once. */
export const MAX_SQL_IMPORT_BYTES = 2 * 1024 * 1024

export interface SqlImport {
  text: string
  /** Caret position right after the inserted script. */
  caret: number
}

/**
 * Insert `imported` at `caret`, keeping it on its own lines: a script never
 * glues onto the statement before it, and text after the caret keeps its own
 * line. CRLF is normalised to LF because the editor only deals in LF.
 */
export function mergeSqlFile(current: string, imported: string, caret: number): SqlImport {
  const payload = imported.replace(/\r\n?/gu, '\n').replace(/^\s+|\s+$/gu, '')
  if (payload === '') return { text: current, caret }
  const position = Math.max(0, Math.min(Math.trunc(caret) || 0, current.length))
  const before = current.slice(0, position)
  const after = current.slice(position)
  const lead = before === '' || before.endsWith('\n') ? '' : '\n'
  const body = `${before}${lead}${payload}`
  const text = after === '' ? `${body}\n` : after.startsWith('\n') ? `${body}${after}` : `${body}\n${after}`
  return { text, caret: body.length }
}

/**
 * Script file text for the editor content: LF line breaks, no trailing blank
 * lines, and exactly one final newline — what editors and `mysql < file.sql`
 * both expect. An empty editor yields an empty string so callers can refuse to
 * write a file with nothing in it.
 */
export function scriptFileText(statement: string): string {
  const body = statement.replace(/\r\n?/gu, '\n').replace(/\s+$/u, '')
  return body === '' ? '' : `${body}\n`
}

const COMMENT = '--'

export interface SqlCommentEdit {
  text: string
  selectionStart: number
  selectionEnd: number
}

/**
 * Toggles SQL line comments over the lines touched by the selection.
 *
 * The block spans whole lines: from the start of the line holding `start` to
 * the end of the line holding `end` (a selection that ends exactly on a line
 * break does not drag the following line in). Lines that are already commented
 * lose their `--`; otherwise every non-blank line gets `-- ` after its indent.
 * The returned selection covers the rewritten block so a second press toggles
 * the same lines back.
 */
export function toggleSqlComment(statement: string, start: number, end: number): SqlCommentEdit {
  const length = statement.length
  const from = Math.min(Math.max(0, Math.min(start, end)), length)
  let to = Math.min(Math.max(0, Math.max(start, end)), length)

  const blockStart = statement.lastIndexOf('\n', from - 1) + 1
  // A selection that ends right after a line break stops at that line break.
  const probe = to > from ? to - 1 : to
  const breakAt = statement.indexOf('\n', probe)
  const blockEnd = breakAt < 0 ? length : breakAt
  to = Math.max(from, to)

  const lines = statement.slice(blockStart, blockEnd).split('\n')
  const commentable = lines.filter((line) => line.trim() !== '')
  if (commentable.length === 0) {
    return { text: statement, selectionStart: from, selectionEnd: to }
  }

  const commented = commentable.every((line) => line.trimStart().startsWith(COMMENT))
  const next = lines.map((line) => {
    const match = /^(\s*)(.*)$/u.exec(line)
    if (match === null) return line
    const indent = match[1] ?? ''
    const content = match[2] ?? ''
    if (content.trim() === '') return line
    if (commented) {
      const body = content.slice(COMMENT.length)
      return `${indent}${body.startsWith(' ') ? body.slice(1) : body}`
    }
    return `${indent}${COMMENT} ${content}`
  })

  const block = next.join('\n')
  return {
    text: `${statement.slice(0, blockStart)}${block}${statement.slice(blockEnd)}`,
    selectionStart: blockStart,
    selectionEnd: blockStart + block.length,
  }
}

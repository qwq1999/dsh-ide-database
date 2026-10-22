/**
 * Splits a label into the parts that match the tree filter and the parts that
 * do not, so the UI can mark the hit without re-implementing the matching rule
 * (case-insensitive substring, the same one the tree uses for filtering).
 */
export interface HighlightPart {
  text: string
  hit: boolean
}

export function highlightParts(text: string, query: string): HighlightPart[] {
  const needle = query.trim().toLowerCase()
  if (needle === '') return [{ text, hit: false }]
  const haystack = text.toLowerCase()
  const parts: HighlightPart[] = []
  let start = 0
  for (let index = haystack.indexOf(needle); index !== -1; index = haystack.indexOf(needle, index + needle.length)) {
    if (index > start) parts.push({ text: text.slice(start, index), hit: false })
    parts.push({ text: text.slice(index, index + needle.length), hit: true })
    start = index + needle.length
  }
  if (start < text.length) parts.push({ text: text.slice(start), hit: false })
  return parts
}
